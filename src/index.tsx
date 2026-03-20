import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { setCookie, deleteCookie, getCookie } from 'hono/cookie'
import bcrypt from 'bcryptjs'
import type { Bindings, User, Session, CSVData, ExportSettings, AdminLog } from './types'
import { authMiddleware, adminMiddleware } from './middleware'
import { base64Encode, base64Decode } from './utils'

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS
app.use('/api/*', cors({
  origin: '*',
  credentials: true,
}))

// Serve static files
app.use('/static/*', serveStatic())

// ==================== Authentication API ====================

// Login
app.post('/api/login', async (c) => {
  let { login_id, password } = await c.req.json()
  
  // Trim whitespace
  login_id = login_id?.trim()
  password = password?.trim()
  
  console.log('ログインリクエスト受信:', { 
    login_id, 
    password: password ? '***' : undefined,
    login_id_length: login_id?.length,
    password_length: password?.length 
  })

  if (!login_id || !password) {
    console.log('バリデーションエラー: login_idまたはpasswordが空')
    return c.json({ error: 'ログインIDとパスワードを入力してください' }, 400)
  }

  // Get user from database
  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE login_id = ?'
  ).bind(login_id).first<User>()

  console.log('データベース検索結果:', user ? `ユーザー発見: ${user.login_id}` : 'ユーザーが見つかりません')

  if (!user) {
    console.log('ログイン失敗: ユーザーが存在しない')
    return c.json({ error: 'ログインIDまたはパスワードが正しくありません' }, 401)
  }

  // Verify password
  console.log('パスワード検証開始...')
  const isValid = await bcrypt.compare(password, user.password_hash)
  console.log('パスワード検証結果:', isValid)
  
  if (!isValid) {
    console.log('ログイン失敗: パスワードが一致しない')
    return c.json({ error: 'ログインIDまたはパスワードが正しくありません' }, 401)
  }

  // Create session
  const session: Session = {
    user_id: user.id,
    login_id: user.login_id,
    name: user.name,
    role: user.role || 'user',
    expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
  }

  // Set cookie (in production, use encrypted/signed tokens)
  const sessionToken = base64Encode(JSON.stringify(session))
  const isProduction = c.req.url.includes('.pages.dev') || c.req.url.includes('cloudflare') || c.req.url.includes('exportapp-tw.tech')
  setCookie(c, 'session', sessionToken, {
    maxAge: 7 * 24 * 60 * 60, // 7 days
    httpOnly: true,
    secure: isProduction, // Only secure in production
    sameSite: 'Strict',
    path: '/',
  })

  return c.json({
    success: true,
    user: {
      id: user.id,
      login_id: user.login_id,
      name: user.name,
      role: user.role || 'user',
    }
  })
})

// Logout
app.post('/api/logout', (c) => {
  deleteCookie(c, 'session')
  return c.json({ success: true })
})

// Check session
app.get('/api/session', async (c) => {
  const sessionToken = getCookie(c, 'session')
  
  if (!sessionToken) {
    return c.json({ authenticated: false }, 401)
  }

  try {
    const session: Session = JSON.parse(base64Decode(sessionToken))
    
    if (session.expires_at < Date.now()) {
      return c.json({ authenticated: false }, 401)
    }

    return c.json({
      authenticated: true,
      user: {
        id: session.user_id,
        login_id: session.login_id,
        name: session.name,
        role: session.role || 'user',
      }
    })
  } catch (error) {
    return c.json({ authenticated: false }, 401)
  }
})

// ==================== CSV Data API ====================

// Upload CSV data
app.post('/api/csv/upload', authMiddleware, async (c) => {
  const session = c.get('session') as Session
  const { rows } = await c.req.json()

  if (!Array.isArray(rows) || rows.length === 0) {
    return c.json({ error: 'CSVデータが正しくありません' }, 400)
  }

  try {
    // Delete existing data for this user
    await c.env.DB.prepare('DELETE FROM csv_data WHERE user_id = ?')
      .bind(session.user_id)
      .run()

    // Insert new data
    const stmt = c.env.DB.prepare(
      'INSERT INTO csv_data (user_id, row_data, row_number) VALUES (?, ?, ?)'
    )

    for (let i = 0; i < rows.length; i++) {
      await stmt.bind(session.user_id, JSON.stringify(rows[i]), i).run()
    }

    return c.json({ success: true, count: rows.length })
  } catch (error) {
    console.error('CSV upload error:', error)
    return c.json({ error: 'データの保存に失敗しました' }, 500)
  }
})

// Get CSV data
app.get('/api/csv/data', authMiddleware, async (c) => {
  const session = c.get('session') as Session

  try {
    const { results } = await c.env.DB.prepare(
      'SELECT row_data, row_number FROM csv_data WHERE user_id = ? ORDER BY row_number'
    ).bind(session.user_id).all<CSVData>()

    const rows = results.map(r => JSON.parse(r.row_data))
    return c.json({ rows })
  } catch (error) {
    console.error('CSV fetch error:', error)
    return c.json({ error: 'データの取得に失敗しました' }, 500)
  }
})

// Delete CSV data
app.delete('/api/csv/data', authMiddleware, async (c) => {
  const session = c.get('session') as Session

  try {
    await c.env.DB.prepare('DELETE FROM csv_data WHERE user_id = ?')
      .bind(session.user_id)
      .run()

    return c.json({ success: true })
  } catch (error) {
    console.error('CSV delete error:', error)
    return c.json({ error: 'データの削除に失敗しました' }, 500)
  }
})

// ==================== Export Settings API ====================

// Get settings
app.get('/api/settings', authMiddleware, async (c) => {
  const session = c.get('session') as Session

  try {
    const { results } = await c.env.DB.prepare(
      'SELECT * FROM export_settings WHERE user_id = ? ORDER BY export_type'
    ).bind(session.user_id).all<ExportSettings>()

    // Ensure all three types exist
    const types = ['tax', 'invoice', 'ledger']
    const settings: Record<string, ExportSettings> = {}

    for (const type of types) {
      const existing = results.find(r => r.export_type === type)
      if (existing) {
        settings[type] = existing
      } else {
        // Create default settings
        const defaults = {
          tax: { button_name: '税金', file_prefix: '税金スプレッドシート' },
          invoice: { button_name: '請求書', file_prefix: '請求書スプレッドシート' },
          ledger: { button_name: '全体の台帳', file_prefix: '完全台帳' },
        }[type]!

        await c.env.DB.prepare(
          'INSERT INTO export_settings (user_id, export_type, button_name, file_prefix) VALUES (?, ?, ?, ?)'
        ).bind(session.user_id, type, defaults.button_name, defaults.file_prefix).run()

        settings[type] = {
          id: 0,
          user_id: session.user_id,
          export_type: type as any,
          button_name: defaults.button_name,
          file_prefix: defaults.file_prefix,
          columns: null,
          filter_column: null,
          filter_value: null,
          sort_column: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }
    }

    return c.json({ settings })
  } catch (error) {
    console.error('Settings fetch error:', error)
    return c.json({ error: '設定の取得に失敗しました' }, 500)
  }
})

// Update settings
app.put('/api/settings/:type', authMiddleware, async (c) => {
  const session = c.get('session') as Session
  const type = c.req.param('type')
  const settings = await c.req.json()

  if (!['tax', 'invoice', 'ledger'].includes(type)) {
    return c.json({ error: '無効な設定タイプです' }, 400)
  }

  try {
    // Check if settings exist
    const existing = await c.env.DB.prepare(
      'SELECT id FROM export_settings WHERE user_id = ? AND export_type = ?'
    ).bind(session.user_id, type).first()

    if (existing) {
      // Update
      await c.env.DB.prepare(`
        UPDATE export_settings 
        SET button_name = ?, file_prefix = ?, columns = ?, filter_column = ?, 
            filter_value = ?, sort_column = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND export_type = ?
      `).bind(
        settings.button_name,
        settings.file_prefix,
        settings.columns || null,
        settings.filter_column || null,
        settings.filter_value || null,
        settings.sort_column || null,
        session.user_id,
        type
      ).run()
    } else {
      // Insert
      await c.env.DB.prepare(`
        INSERT INTO export_settings 
        (user_id, export_type, button_name, file_prefix, columns, filter_column, filter_value, sort_column)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        session.user_id,
        type,
        settings.button_name,
        settings.file_prefix,
        settings.columns || null,
        settings.filter_column || null,
        settings.filter_value || null,
        settings.sort_column || null
      ).run()
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('Settings update error:', error)
    return c.json({ error: '設定の保存に失敗しました' }, 500)
  }
})

// ==================== Admin API ====================

// Get all users (admin only)
app.get('/api/admin/users', adminMiddleware, async (c) => {
  try {
    const { results: users } = await c.env.DB.prepare(`
      SELECT u.id, u.login_id, u.name, u.role, u.created_at, u.updated_at,
             COUNT(csv.id) as csv_count
      FROM users u
      LEFT JOIN csv_data csv ON u.id = csv.user_id
      GROUP BY u.id
      ORDER BY u.id
    `).all()

    return c.json({ users })
  } catch (error) {
    console.error('Admin users fetch error:', error)
    return c.json({ error: 'ユーザー一覧の取得に失敗しました' }, 500)
  }
})

// Get system stats (admin only)
app.get('/api/admin/stats', adminMiddleware, async (c) => {
  try {
    const userCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first<{ count: number }>()
    const csvCount = await c.env.DB.prepare('SELECT COUNT(*) as count FROM csv_data').first<{ count: number }>()
    
    // Simple approximation for DB size (not available in D1)
    const dbSize = (userCount?.count || 0) * 1000 + (csvCount?.count || 0) * 5000;

    return c.json({
      stats: {
        userCount: userCount?.count || 0,
        csvCount: csvCount?.count || 0,
        dbSize: dbSize,
      }
    })
  } catch (error) {
    console.error('Admin stats fetch error:', error)
    return c.json({ error: '統計情報の取得に失敗しました' }, 500)
  }
})

// Get user CSV data preview (admin only)
app.get('/api/admin/users/:id/csv', adminMiddleware, async (c) => {
  const userId = parseInt(c.req.param('id'))
  
  try {
    const { results } = await c.env.DB.prepare(
      'SELECT id, row_number, row_data, created_at FROM csv_data WHERE user_id = ? ORDER BY row_number LIMIT 10'
    ).bind(userId).all<CSVData>()

    return c.json({ data: results })
  } catch (error) {
    console.error('Admin CSV fetch error:', error)
    return c.json({ error: 'CSVデータの取得に失敗しました' }, 500)
  }
})

// Create new user (admin only)
app.post('/api/admin/users', adminMiddleware, async (c) => {
  const session = c.get('session') as Session
  let { login_id, password, name, role } = await c.req.json()

  // Trim whitespace
  login_id = login_id?.trim()
  password = password?.trim()
  name = name?.trim()
  role = role?.trim() || 'user'

  if (!login_id || !password || !name) {
    return c.json({ error: 'すべての項目を入力してください' }, 400)
  }

  if (!['user', 'admin'].includes(role)) {
    return c.json({ error: '無効なロールです' }, 400)
  }

  try {
    // Check if user already exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE login_id = ?'
    ).bind(login_id).first()

    if (existing) {
      return c.json({ error: 'このログインIDは既に使用されています' }, 400)
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10)

    // Insert user
    const result = await c.env.DB.prepare(
      'INSERT INTO users (login_id, password_hash, name, role) VALUES (?, ?, ?, ?)'
    ).bind(login_id, password_hash, name, role).run()

    // Get new user ID
    const newUser = await c.env.DB.prepare(
      'SELECT id, login_id, name, role, created_at FROM users WHERE login_id = ?'
    ).bind(login_id).first<User>()

    if (!newUser) {
      return c.json({ error: 'ユーザー作成に失敗しました' }, 500)
    }

    // Create default export settings
    const defaults = [
      { type: 'tax', button: '税金', prefix: '税金スプレッドシート' },
      { type: 'invoice', button: '請求書', prefix: '請求書スプレッドシート' },
      { type: 'ledger', button: '全体の台帳', prefix: '完全台帳' },
    ]

    for (const d of defaults) {
      await c.env.DB.prepare(
        'INSERT INTO export_settings (user_id, export_type, button_name, file_prefix) VALUES (?, ?, ?, ?)'
      ).bind(newUser.id, d.type, d.button, d.prefix).run()
    }

    // Log action
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
    await c.env.DB.prepare(
      'INSERT INTO admin_logs (admin_user_id, action, target_user_id, details, ip_address) VALUES (?, ?, ?, ?, ?)'
    ).bind(session.user_id, 'create_user', newUser.id, `ユーザー作成: ${login_id}`, ip).run()

    return c.json({ success: true, user: newUser })
  } catch (error) {
    console.error('Admin create user error:', error)
    return c.json({ error: 'ユーザーの作成に失敗しました' }, 500)
  }
})

// Delete user (admin only)
app.delete('/api/admin/users/:id', adminMiddleware, async (c) => {
  const session = c.get('session') as Session
  const userId = parseInt(c.req.param('id'))

  if (userId === session.user_id) {
    return c.json({ error: '自分自身を削除することはできません' }, 400)
  }

  try {
    // Get user info before deletion
    const user = await c.env.DB.prepare(
      'SELECT login_id, name FROM users WHERE id = ?'
    ).bind(userId).first<User>()

    if (!user) {
      return c.json({ error: 'ユーザーが見つかりません' }, 404)
    }

    // Delete user (CASCADE will delete related data)
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run()

    // Log action
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
    await c.env.DB.prepare(
      'INSERT INTO admin_logs (admin_user_id, action, target_user_id, details, ip_address) VALUES (?, ?, ?, ?, ?)'
    ).bind(session.user_id, 'delete_user', userId, `ユーザー削除: ${user.login_id} (${user.name})`, ip).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('Admin delete user error:', error)
    return c.json({ error: 'ユーザーの削除に失敗しました' }, 500)
  }
})

// Delete user CSV data (admin only)
app.delete('/api/admin/users/:id/csv', adminMiddleware, async (c) => {
  const session = c.get('session') as Session
  const userId = parseInt(c.req.param('id'))

  try {
    // Get CSV count before deletion
    const count = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM csv_data WHERE user_id = ?'
    ).bind(userId).first<{ count: number }>()

    // Delete CSV data
    await c.env.DB.prepare('DELETE FROM csv_data WHERE user_id = ?').bind(userId).run()

    // Log action
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
    await c.env.DB.prepare(
      'INSERT INTO admin_logs (admin_user_id, action, target_user_id, details, ip_address) VALUES (?, ?, ?, ?, ?)'
    ).bind(session.user_id, 'delete_csv', userId, `CSVデータ削除: ${count?.count || 0}件`, ip).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('Admin delete CSV error:', error)
    return c.json({ error: 'CSVデータの削除に失敗しました' }, 500)
  }
})

// Reset user password (admin only)
app.post('/api/admin/users/:id/reset-password', adminMiddleware, async (c) => {
  const session = c.get('session') as Session
  const userId = parseInt(c.req.param('id'))
  let { password } = await c.req.json()

  password = password?.trim()

  if (!password) {
    return c.json({ error: 'パスワードを入力してください' }, 400)
  }

  try {
    // Get user info
    const user = await c.env.DB.prepare(
      'SELECT login_id FROM users WHERE id = ?'
    ).bind(userId).first<User>()

    if (!user) {
      return c.json({ error: 'ユーザーが見つかりません' }, 404)
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10)

    // Update password
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(password_hash, userId).run()

    // Log action
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
    await c.env.DB.prepare(
      'INSERT INTO admin_logs (admin_user_id, action, target_user_id, details, ip_address) VALUES (?, ?, ?, ?, ?)'
    ).bind(session.user_id, 'reset_password', userId, `パスワードリセット: ${user.login_id}`, ip).run()

    return c.json({ success: true })
  } catch (error) {
    console.error('Admin reset password error:', error)
    return c.json({ error: 'パスワードリセットに失敗しました' }, 500)
  }
})

// Get admin logs (admin only)
app.get('/api/admin/logs', adminMiddleware, async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT l.*, u.login_id as admin_login_id, u.name as admin_name
      FROM admin_logs l
      JOIN users u ON l.admin_user_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 100
    `).all()

    return c.json({ logs: results })
  } catch (error) {
    console.error('Admin logs fetch error:', error)
    return c.json({ error: 'ログの取得に失敗しました' }, 500)
  }
})

// ==================== Default Route ====================

app.get('/', (c) => {
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>データ台帳管理システム</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Noto Sans JP', sans-serif;
        }
    <\/style>
</head>
<body class="bg-gray-50">
    <div id="app">読み込み中...</div>
    
    <script>
      console.log('HTML loaded');
      
      // Debug: Check if libraries are loaded
      window.addEventListener('load', function() {
        console.log('Page loaded');
        console.log('axios:', typeof axios);
        console.log('Papa:', typeof Papa);
        
        if (typeof axios === 'undefined') {
          document.getElementById('app').innerHTML = '<div class="p-8 text-red-600">エラー: axiosが読み込めませんでした</div>';
        } else if (typeof Papa === 'undefined') {
          document.getElementById('app').innerHTML = '<div class="p-8 text-red-600">エラー: PapaParse が読み込めませんでした</div>';
        }
      });
    <\/script>
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/encoding-japanese@2.0.0/encoding.min.js"><\/script>
    <script src="/static/app.js"><\/script>
</body>
</html>`;
  return c.html(html)
})

// Admin page
app.get('/admin', (c) => {
  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>管理画面 - データ台帳管理システム</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Noto Sans JP', sans-serif;
        }
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 1000;
        }
        .modal.show {
            display: flex;
            align-items: center;
            justify-content: center;
        }
    <\/style>
</head>
<body class="bg-gray-50">
    <div id="app">読み込み中...</div>
    
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"><\/script>
    <script src="/static/admin.js"><\/script>
</body>
</html>`;
  return c.html(html)
})

export default app
