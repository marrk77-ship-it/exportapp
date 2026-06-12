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
app.use('/static/*', serveStatic({ root: './' }))
app.use('/os/static/*', serveStatic({ root: './' }))

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
  const { rows, fileName } = await c.req.json()

  if (!Array.isArray(rows) || rows.length === 0) {
    return c.json({ error: 'CSVデータが正しくありません' }, 400)
  }

  try {
    console.log(`Starting CSV upload for user ${session.user_id}: ${rows.length} rows, file: ${fileName}`)
    const startTime = Date.now()
    
    // Create upload history record
    const uploadResult = await c.env.DB.prepare(
      'INSERT INTO csv_uploads (user_id, file_name, row_count) VALUES (?, ?, ?)'
    ).bind(session.user_id, fileName || 'unnamed.csv', rows.length).run()
    
    const uploadId = uploadResult.meta.last_row_id
    console.log(`Created upload record: ${uploadId}`)

    // Batch insert CSV data with upload_id
    const batchStartTime = Date.now()
    const statements = rows.map((row, i) => 
      c.env.DB.prepare(
        'INSERT INTO csv_data (user_id, row_data, row_number, upload_id) VALUES (?, ?, ?, ?)'
      ).bind(session.user_id, JSON.stringify(row), i, uploadId)
    )
    
    await c.env.DB.batch(statements)
    
    console.log(`Batch insert completed in ${Date.now() - batchStartTime}ms`)
    console.log(`Total upload time: ${Date.now() - startTime}ms`)

    return c.json({ success: true, count: rows.length, uploadId })
  } catch (error) {
    console.error('CSV upload error:', error)
    return c.json({ error: 'データの保存に失敗しました' }, 500)
  }
})

// Get CSV data (latest upload only)
app.get('/api/csv/data', authMiddleware, async (c) => {
  const session = c.get('session') as Session

  try {
    // Get the latest upload_id for this user
    const latestUpload = await c.env.DB.prepare(
      'SELECT id FROM csv_uploads WHERE user_id = ? ORDER BY uploaded_at DESC LIMIT 1'
    ).bind(session.user_id).first<{ id: number }>()

    if (!latestUpload) {
      return c.json({ rows: [] })
    }

    // Get CSV data for the latest upload
    const { results } = await c.env.DB.prepare(
      'SELECT row_data, row_number FROM csv_data WHERE user_id = ? AND upload_id = ? ORDER BY row_number'
    ).bind(session.user_id, latestUpload.id).all<CSVData>()

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

// ==================== Admin Authentication API ====================

// Admin login (separate from regular login)
app.post('/api/admin/login', async (c) => {
  let { login_id, password } = await c.req.json()
  
  // Trim whitespace
  login_id = login_id?.trim()
  password = password?.trim()
  
  console.log('管理画面ログインリクエスト受信:', { 
    login_id, 
    password: password ? '***' : undefined
  })

  if (!login_id || !password) {
    return c.json({ error: 'ログインIDとパスワードを入力してください' }, 400)
  }

  // Get user from database
  const user = await c.env.DB.prepare(
    'SELECT * FROM users WHERE login_id = ?'
  ).bind(login_id).first<User>()

  if (!user) {
    return c.json({ error: 'ログインIDまたはパスワードが正しくありません' }, 401)
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password_hash)
  
  if (!isValid) {
    return c.json({ error: 'ログインIDまたはパスワードが正しくありません' }, 401)
  }

  // Check if user is admin
  if (user.role !== 'admin') {
    return c.json({ error: '管理者権限が必要です' }, 403)
  }

  // Create admin session
  const session: Session = {
    user_id: user.id,
    login_id: user.login_id,
    name: user.name,
    role: user.role || 'user',
    expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
  }

  // Set admin cookie with different name
  const sessionToken = base64Encode(JSON.stringify(session))
  const isProduction = c.req.url.includes('.pages.dev') || c.req.url.includes('cloudflare') || c.req.url.includes('exportapp-tw.tech')
  setCookie(c, 'admin_session', sessionToken, {
    maxAge: 7 * 24 * 60 * 60, // 7 days
    httpOnly: true,
    secure: isProduction,
    sameSite: 'Strict',
    path: '/',
  })

  console.log('管理画面ログイン成功:', user.login_id)

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

// Admin logout
app.post('/api/admin/logout', (c) => {
  deleteCookie(c, 'admin_session')
  return c.json({ success: true })
})

// Check admin session
app.get('/api/admin/session', async (c) => {
  const sessionToken = getCookie(c, 'admin_session')
  
  if (!sessionToken) {
    return c.json({ authenticated: false }, 401)
  }

  try {
    const session: Session = JSON.parse(base64Decode(sessionToken))
    
    if (session.expires_at < Date.now()) {
      return c.json({ authenticated: false }, 401)
    }

    // Check if user is admin
    if (session.role !== 'admin') {
      return c.json({ authenticated: false }, 403)
    }

    return c.json({
      authenticated: true,
      user: {
        id: session.user_id,
        login_id: session.login_id,
        name: session.name,
        role: session.role,
      }
    })
  } catch (error) {
    return c.json({ authenticated: false }, 401)
  }
})

// ==================== Admin API ====================

// Get all users (admin only)
app.get('/api/admin/users', adminMiddleware, async (c) => {
  try {
    const { results: users } = await c.env.DB.prepare(`
      SELECT u.id, u.login_id, u.name, u.role, 
             datetime(u.created_at, '+9 hours') as created_at, 
             datetime(u.updated_at, '+9 hours') as updated_at,
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

// Get user upload history (admin only)
app.get('/api/admin/users/:id/uploads', adminMiddleware, async (c) => {
  const userId = parseInt(c.req.param('id'))
  
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT id, file_name, row_count, 
       datetime(uploaded_at, '+9 hours') as uploaded_at 
       FROM csv_uploads WHERE user_id = ? ORDER BY uploaded_at DESC`
    ).bind(userId).all()

    return c.json({ uploads: results })
  } catch (error) {
    console.error('Admin upload history fetch error:', error)
    return c.json({ error: 'アップロード履歴の取得に失敗しました' }, 500)
  }
})

// Download specific upload (admin only)
app.get('/api/admin/uploads/:uploadId/download', adminMiddleware, async (c) => {
  const uploadId = parseInt(c.req.param('uploadId'))
  
  try {
    // Get upload info
    const upload = await c.env.DB.prepare(
      'SELECT * FROM csv_uploads WHERE id = ?'
    ).bind(uploadId).first()

    if (!upload) {
      return c.json({ error: 'アップロードが見つかりません' }, 404)
    }

    // Get CSV data for this upload
    const { results } = await c.env.DB.prepare(
      'SELECT row_data FROM csv_data WHERE upload_id = ? ORDER BY row_number'
    ).bind(uploadId).all<CSVData>()

    const rows = results.map(r => JSON.parse(r.row_data))
    
    return c.json({ upload, rows })
  } catch (error) {
    console.error('Admin upload download error:', error)
    return c.json({ error: 'ダウンロードに失敗しました' }, 500)
  }
})

// Get user CSV data preview (admin only)
app.get('/api/admin/users/:id/csv', adminMiddleware, async (c) => {
  const userId = parseInt(c.req.param('id'))
  const limit = parseInt(c.req.query('limit') || '10')
  const maxLimit = Math.min(limit, 1000) // Max 1000 rows
  
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT id, row_number, row_data, datetime(created_at, '+9 hours') as created_at 
       FROM csv_data WHERE user_id = ? ORDER BY row_number LIMIT ${maxLimit}`
    ).bind(userId).all<CSVData>()

    const count = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM csv_data WHERE user_id = ?'
    ).bind(userId).first<{ total: number }>()

    return c.json({ data: results, total: count?.total || 0, showing: results.length })
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

    // Get upload count before deletion
    const uploadCount = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM csv_uploads WHERE user_id = ?'
    ).bind(userId).first<{ count: number }>()

    // Delete CSV data and upload history
    await c.env.DB.prepare('DELETE FROM csv_data WHERE user_id = ?').bind(userId).run()
    await c.env.DB.prepare('DELETE FROM csv_uploads WHERE user_id = ?').bind(userId).run()

    // Log action
    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
    await c.env.DB.prepare(
      'INSERT INTO admin_logs (admin_user_id, action, target_user_id, details, ip_address) VALUES (?, ?, ?, ?, ?)'
    ).bind(session.user_id, 'delete_csv', userId, `CSVデータ削除: ${count?.count || 0}件、アップロード履歴: ${uploadCount?.count || 0}件`, ip).run()

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
      SELECT l.id, l.admin_user_id, l.action, l.target_user_id, l.details, l.ip_address,
             datetime(l.created_at, '+9 hours') as created_at,
             u.login_id as admin_login_id, u.name as admin_name
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
    <script src="/static/app.js?v=${Date.now()}"><\/script>
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
    <script src="/static/admin.js?v=${Date.now()}"><\/script>
</body>
</html>`;
  return c.html(html)
})

// ==================== OS社専用システム ====================

// OS社専用ページ
app.get('/os', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OS社専用システム - 産業廃棄物管理票交付等状況報告書</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
</head>
<body class="bg-gray-50">
    <div id="app">読み込み中...</div>
    
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/encoding-japanese@2.0.0/encoding.min.js"></script>
    <script>
(function() {
  axios.defaults.withCredentials = true;
  let csvData = [];
  let currentUser = null;

  window.addEventListener('DOMContentLoaded', async function() {
    try {
      const response = await axios.get('/api/os/session');
      if (response.data.authenticated) {
        currentUser = response.data.user;
        showMainScreen();
      } else {
        showLoginScreen();
      }
    } catch (error) {
      showLoginScreen();
    }
  });

  function showLoginScreen() {
    const loginHTML = '<div class="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">' +
      '<div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">' +
        '<div class="text-center mb-8">' +
          '<h1 class="text-3xl font-bold text-gray-800 mb-2">OS社専用システム</h1>' +
          '<p class="text-gray-600">産業廃棄物管理票交付等状況報告書</p>' +
        '</div>' +
        '<div id="loginError" class="hidden mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"></div>' +
        '<form onsubmit="window.handleLogin(event); return false;" class="space-y-6">' +
          '<div>' +
            '<label class="block text-sm font-medium text-gray-700 mb-2">ログインID</label>' +
            '<input type="text" id="loginId" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="ログインIDを入力">' +
          '</div>' +
          '<div>' +
            '<label class="block text-sm font-medium text-gray-700 mb-2">パスワード</label>' +
            '<input type="password" id="password" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="パスワードを入力">' +
          '</div>' +
          '<button type="submit" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200">ログイン</button>' +
        '</form>' +
      '</div>' +
    '</div>';
    document.getElementById('app').innerHTML = loginHTML;
  }

  window.handleLogin = async function(e) {
    e.preventDefault();
    const errorDiv = document.getElementById('loginError');
    try {
      const loginId = document.getElementById('loginId').value.trim();
      const password = document.getElementById('password').value.trim();
      
      const response = await axios.post('/api/os/login', {
        login_id: loginId,
        password: password
      });
      
      if (response.data.user) {
        currentUser = response.data.user;
        showMainScreen();
      }
    } catch (error) {
      errorDiv.textContent = error.response?.data?.error || 'ログインに失敗しました';
      errorDiv.classList.remove('hidden');
    }
  };

  function showMainScreen() {
    const mainHTML = '<div class="min-h-screen bg-gray-50">' +
      '<header class="bg-white shadow-sm">' +
        '<div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">' +
          '<h1 class="text-2xl font-bold text-gray-800">OS社専用システム</h1>' +
          '<div class="flex items-center gap-4">' +
            '<span class="text-gray-600">ようこそ、' + currentUser.name + '様</span>' +
            '<button onclick="window.handleLogout()" class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition duration-200">ログアウト</button>' +
          '</div>' +
        '</div>' +
      '</header>' +
      '<div class="max-w-7xl mx-auto px-4 py-8">' +
        '<div class="bg-white rounded-lg shadow-lg p-8 mb-8">' +
          '<div class="flex items-center mb-6">' +
            '<div class="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl mr-4">1</div>' +
            '<h2 class="text-2xl font-bold text-gray-800">CSVファイルをアップロード</h2>' +
          '</div>' +
          '<div class="flex flex-col items-center justify-center p-8">' +
            '<input type="file" id="fileInput" accept=".csv" class="hidden" onchange="window.handleFileSelect(event)">' +
            '<button id="selectFileBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 px-16 rounded-lg text-2xl transition duration-200 shadow-lg">' +
              '<i class="fas fa-folder-open mr-3"></i>ファイルを選ぶ' +
            '</button>' +
            '<p class="text-sm text-gray-500 mt-4 text-center">CSVファイルを選択してください</p>' +
          '</div>' +
          '<div id="previewSection" class="mt-6 hidden">' +
            '<h3 class="text-lg font-bold text-gray-700 mb-3"><i class="fas fa-eye mr-2"></i>データプレビュー（最初の5件）</h3>' +
            '<div id="previewTable" class="overflow-x-auto"></div>' +
            '<p class="text-sm text-gray-600 mt-3">' +
              '<i class="fas fa-check-circle text-green-600 mr-2"></i>' +
              '<span id="rowCount">0</span>行のデータが読み込まれています' +
            '</p>' +
          '</div>' +
        '</div>' +
        '<div class="bg-white rounded-lg shadow-lg p-8">' +
          '<div class="flex items-center mb-6">' +
            '<div class="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl mr-4">2</div>' +
            '<h2 class="text-2xl font-bold text-gray-800">出力フォーマットを選択</h2>' +
          '</div>' +
          '<div class="grid grid-cols-1 md:grid-cols-3 gap-6">' +
            '<button id="kumamotoBtn" disabled class="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-8 px-6 rounded-lg text-2xl transition duration-200 shadow-lg hover:shadow-xl">' +
              '<i class="fas fa-file-excel text-4xl mb-3 block"></i>' +
              '委附表2（新産廃税）' +
            '</button>' +
            '<button id="format2Btn" disabled class="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-8 px-6 rounded-lg text-2xl transition duration-200 shadow-lg hover:shadow-xl">' +
              '<i class="fas fa-file-alt text-4xl mb-3 block"></i>' +
              'フォーマット2' +
            '</button>' +
            '<button id="format3Btn" disabled class="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-8 px-6 rounded-lg text-2xl transition duration-200 shadow-lg hover:shadow-xl">' +
              '<i class="fas fa-file-invoice text-4xl mb-3 block"></i>' +
              'フォーマット3' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
    document.getElementById('app').innerHTML = mainHTML;
    
    // ファイル選択ボタンのイベントリスナーを追加
    document.getElementById('selectFileBtn').addEventListener('click', function() {
      document.getElementById('fileInput').click();
    });
    
    // 出力ボタンのイベントリスナーを追加
    document.getElementById('kumamotoBtn').addEventListener('click', function() {
      generateIfu2Excel();
    });
    document.getElementById('format2Btn').addEventListener('click', function() {
      alert('フォーマット2は準備中です');
    });
    document.getElementById('format3Btn').addEventListener('click', function() {
      alert('フォーマット3は準備中です');
    });
  }

  window.handleFileSelect = function(e) {
    const file = e.target.files[0];
    if (!file || !file.name.endsWith('.csv')) {
      alert('CSVファイルを選択してください');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = function(event) {
      // バイト配列として読み込み
      const codes = new Uint8Array(event.target.result);
      
      // 文字エンコーディングを自動検出
      const detectedEncoding = Encoding.detect(codes);
      console.log('検出されたエンコーディング:', detectedEncoding);
      
      // UnicodeArrayに変換
      const unicodeArray = Encoding.convert(codes, {
        to: 'UNICODE',
        from: detectedEncoding
      });
      
      // 文字列に変換
      const csvText = Encoding.codeToString(unicodeArray);
      
      // CSVをパース
      const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true
      });
      
      if (parsed.errors.length > 0) {
        console.error('CSV parse errors:', parsed.errors);
        alert('CSVファイルの読み込みに失敗しました');
        return;
      }
      
      csvData = parsed.data;
      
      if (!csvData || csvData.length === 0) {
        alert('CSVファイルにデータがありません');
        return;
      }
      
      const headers = Object.keys(csvData[0]);
      const preview = csvData.slice(0, 5);
      
      let tableHTML = '<div class="mb-3 text-sm text-gray-600">' +
        '<i class="fas fa-file-csv mr-2"></i>ファイル名: ' + file.name +
        ' <span class="ml-2 text-xs text-gray-500">(' + detectedEncoding + ')</span>' +
      '</div>' +
      '<table class="min-w-full bg-white border border-gray-300">' +
        '<thead class="bg-gray-100"><tr>';
      
      headers.forEach(function(h) {
        tableHTML += '<th class="px-4 py-2 border text-left text-sm font-semibold">' + h + '</th>';
      });
      
      tableHTML += '</tr></thead><tbody>';
      
      preview.forEach(function(row) {
        tableHTML += '<tr class="hover:bg-gray-50">';
        headers.forEach(function(h) {
          tableHTML += '<td class="px-4 py-2 border text-sm">' + (row[h] || '') + '</td>';
        });
        tableHTML += '</tr>';
      });
      
      tableHTML += '</tbody></table>';
      
      document.getElementById('previewTable').innerHTML = tableHTML;
      document.getElementById('rowCount').textContent = csvData.length;
      document.getElementById('previewSection').classList.remove('hidden');
      document.getElementById('kumamotoBtn').disabled = false;
      document.getElementById('format2Btn').disabled = false;
      document.getElementById('format3Btn').disabled = false;
      
      axios.post('/api/os/csv/upload', {
        rows: csvData,
        fileName: file.name
      });
    };
    
    // ArrayBufferとして読み込む（エンコーディング検出のため）
    reader.readAsArrayBuffer(file);
  };

  window.handleLogout = async function() {
    try {
      await axios.post('/api/os/logout');
      currentUser = null;
      csvData = [];
      showLoginScreen();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // 委附表2Excel生成機能（サーバー側処理）
  async function generateIfu2Excel() {
    if (!csvData || csvData.length === 0) {
      alert('CSVデータがアップロードされていません');
      return;
    }

    const btn = document.getElementById('kumamotoBtn');
    const originalText = btn.innerHTML;

    try {
      // ローディング表示
      btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>生成中...';
      btn.disabled = true;
      
      // Python APIサーバーにデータを送信してExcel生成
      // 開発環境: ポート3001のPython APIサーバーを使用
      // 本番環境: 同じドメインの /api/os/generate-ifu2 を使用
      let apiUrl;
      if (window.location.hostname === 'localhost') {
        // ローカル開発環境
        apiUrl = 'http://localhost:3001/generate-ifu2';
      } else if (window.location.hostname.includes('sandbox.novita.ai')) {
        // Novita Sandbox環境: ポート番号をURLに含める
        apiUrl = window.location.protocol + '//' + window.location.hostname.replace('3000-', '3001-') + '/generate-ifu2';
      } else {
        // 本番環境
        apiUrl = '/api/os/generate-ifu2';
      }
      
      const response = await axios.post(apiUrl, {
        csvData: csvData
      }, {
        responseType: 'blob'
      });
      
      // Excelファイルをダウンロード
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '委附表2_' + new Date().toISOString().substring(0, 10) + '.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
      
      btn.innerHTML = originalText;
      btn.disabled = false;
      
      alert('委附表2を生成しました！');
      
    } catch (error) {
      console.error('Excel生成エラー:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Excel生成中にエラーが発生しました';
      alert('エラー: ' + errorMsg);
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  }

  // OSデータを処理（フィルタリング・集計）
  function processOSData(data) {
    const EXCLUDE_COMPANY = '（有）オー・エス収集センター';
    const filteredData = [];
    
    for (const row of data) {
      const company = row['排出事業者名'] || '';
      const wasteCategory = row['一般廃棄物or産業廃棄物'] || '';
      const method = row['処分方法a'] || '';
      
      // フィルタリング条件
      if (company !== EXCLUDE_COMPANY && 
          wasteCategory === '産業廃棄物' && 
          method === '最終処分') {
        
        const dateStr = row['計量年月日'] || '';
        let yearMonth = '不明';
        
        if (dateStr) {
          try {
            const date = new Date(dateStr);
            yearMonth = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
          } catch (e) {
            console.error('日付解析エラー:', dateStr);
          }
        }
        
        const wasteType = row['廃棄物種類名'] || '';
        const weight = parseFloat(row['重容量']) || 0;
        
        filteredData.push({
          yearMonth: yearMonth,
          wasteType: wasteType,
          weight: weight
        });
      }
    }
    
    if (filteredData.length === 0) {
      return {
        success: false,
        error: '条件に一致するデータがありません。\\n（産業廃棄物・最終処分・排出事業者が除外対象でないデータ）'
      };
    }
    
    // 月別・廃棄物種類別に集計
    const monthlySummary = {};
    for (const item of filteredData) {
      if (!monthlySummary[item.yearMonth]) {
        monthlySummary[item.yearMonth] = {};
      }
      if (!monthlySummary[item.yearMonth][item.wasteType]) {
        monthlySummary[item.yearMonth][item.wasteType] = 0;
      }
      monthlySummary[item.yearMonth][item.wasteType] += item.weight;
    }
    
    const months = Object.keys(monthlySummary).sort();
    
    return {
      success: true,
      totalRecords: filteredData.length,
      months: months,
      monthlySummary: monthlySummary
    };
  }

})();
    </script>
</body>
</html>`)
})

// OS社専用 - セッション確認
app.get('/api/os/session', async (c) => {
  const sessionCookie = getCookie(c, 'os_session')
  
  if (!sessionCookie) {
    return c.json({ authenticated: false })
  }

  try {
    const sessionData = base64Decode(sessionCookie)
    const session = JSON.parse(sessionData)
    
    const user = await c.env.DB.prepare(
      'SELECT id, login_id, name FROM os_users WHERE id = ?'
    ).bind(session.userId).first()

    if (user) {
      return c.json({
        authenticated: true,
        user: {
          id: user.id,
          login_id: user.login_id,
          name: user.name
        }
      })
    }
    
    return c.json({ authenticated: false })
  } catch (e) {
    console.error('Session check error:', e)
    return c.json({ authenticated: false })
  }
})

// OS社専用 - ログイン
app.post('/api/os/login', async (c) => {
  const { login_id, password } = await c.req.json()
  
  const trimmedLoginId = login_id?.trim()
  const trimmedPassword = password?.trim()
  
  console.log('OS Login attempt:', { login_id: trimmedLoginId, password: '***' })
  
  if (!trimmedLoginId || !trimmedPassword) {
    return c.json({ error: 'ログインIDとパスワードを入力してください' }, 400)
  }

  try {
    const user = await c.env.DB.prepare(
      'SELECT * FROM os_users WHERE login_id = ?'
    ).bind(trimmedLoginId).first()

    console.log('User found:', user ? 'yes' : 'no')

    if (!user) {
      return c.json({ error: 'ユーザーが見つかりません' }, 401)
    }

    const passwordMatch = await bcrypt.compare(trimmedPassword, user.password_hash)
    console.log('Password match:', passwordMatch)

    if (!passwordMatch) {
      return c.json({ error: 'パスワードが正しくありません' }, 401)
    }

    const sessionData = {
      userId: user.id,
      login_id: user.login_id,
      name: user.name
    }

    const sessionCookie = base64Encode(JSON.stringify(sessionData))

    setCookie(c, 'os_session', sessionCookie, {
      maxAge: 86400,
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
      path: '/'
    })

    return c.json({
      user: {
        id: user.id,
        login_id: user.login_id,
        name: user.name
      }
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return c.json({ error: 'ログイン処理中にエラーが発生しました' }, 500)
  }
})

// OS社専用 - ログアウト
app.post('/api/os/logout', (c) => {
  deleteCookie(c, 'os_session')
  return c.json({ success: true })
})

// OS社専用 - CSV アップロード
app.post('/api/os/csv/upload', async (c) => {
  const sessionCookie = getCookie(c, 'os_session')
  
  if (!sessionCookie) {
    return c.json({ error: '認証が必要です' }, 401)
  }

  try {
    const sessionData = base64Decode(sessionCookie)
    const session = JSON.parse(sessionData)
    const { rows, fileName } = await c.req.json()

    await c.env.DB.prepare('DELETE FROM os_csv_data WHERE user_id = ?')
      .bind(session.userId).run()

    const stmt = c.env.DB.prepare(
      'INSERT INTO os_csv_data (user_id, row_data, row_number) VALUES (?, ?, ?)'
    )
    const batch = rows.map((row: any, index: number) => 
      stmt.bind(session.userId, JSON.stringify(row), index + 1)
    )
    await c.env.DB.batch(batch)

    await c.env.DB.prepare(
      `INSERT INTO os_csv_uploads (user_id, file_name, row_count, uploaded_at)
       VALUES (?, ?, ?, datetime('now', '+9 hours'))`
    ).bind(session.userId, fileName, rows.length).run()

    return c.json({ 
      success: true,
      rowCount: rows.length
    })
  } catch (error: any) {
    console.error('CSV upload error:', error)
    return c.json({ error: 'アップロード処理中にエラーが発生しました' }, 500)
  }
})

// OS社専用 - 委附表2生成
app.post('/api/os/generate-ifu2', async (c) => {
  const sessionCookie = getCookie(c, 'os_session')
  if (!sessionCookie) {
    return c.json({ error: '認証が必要です' }, 401)
  }

  try {
    const { csvData } = await c.req.json()
    
    if (!csvData || csvData.length === 0) {
      return c.json({ error: 'CSVデータが見つかりません' }, 400)
    }

    // 開発環境でのみPython処理を実行
    // child_processとfsモジュールが実際に使えるかチェック
    let canUseNodeModules = false
    let fsModule: any = null
    let pathModule: any = null
    let spawnFn: any = null
    
    try {
      const childProcess = await import('child_process')
      fsModule = await import('fs')
      pathModule = await import('path')
      spawnFn = childProcess.spawn
      
      // 実際にfsが使えるかテスト
      const testDir = '/tmp/test-' + Date.now()
      fsModule.mkdirSync(testDir, { recursive: true })
      fsModule.rmSync(testDir, { recursive: true, force: true })
      canUseNodeModules = true
    } catch (e) {
      console.log('Node.js modules not available:', e)
      canUseNodeModules = false
    }
    
    if (canUseNodeModules && fsModule && pathModule && spawnFn) {
      // Node.js環境（開発環境）
      // 一時ファイルにCSVデータを保存
      const tmpDir = '/tmp/ifu2-' + Date.now()
      fsModule.mkdirSync(tmpDir, { recursive: true })
      const inputPath = pathModule.join(tmpDir, 'input.json')
      const outputPath = pathModule.join(tmpDir, 'output.xlsx')
      
      fsModule.writeFileSync(inputPath, JSON.stringify(csvData))
      
      // Pythonスクリプトを実行
      const scriptPath = '/home/user/webapp/scripts/generate_ifu2.py'
      const templatePath = '/home/user/webapp/templates/委附表2_テンプレート.xlsx'
      
      return new Promise((resolve, reject) => {
        const pythonProcess = spawnFn('python3', [
          scriptPath,
          inputPath,
          templatePath,
          outputPath
        ])
        
        let stdout = ''
        let stderr = ''
        
        pythonProcess.stdout.on('data', (data) => {
          stdout += data.toString()
        })
        
        pythonProcess.stderr.on('data', (data) => {
          stderr += data.toString()
        })
        
        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            console.error('Python script error:', stderr)
            fsModule.rmSync(tmpDir, { recursive: true, force: true })
            resolve(c.json({ 
              error: 'Excel生成中にエラーが発生しました: ' + stderr 
            }, 500))
            return
          }
          
          // 生成されたExcelファイルを読み込み
          if (!fsModule.existsSync(outputPath)) {
            fsModule.rmSync(tmpDir, { recursive: true, force: true })
            resolve(c.json({ 
              error: 'Excelファイルが生成されませんでした' 
            }, 500))
            return
          }
          
          const excelBuffer = fsModule.readFileSync(outputPath)
          
          // 一時ファイルを削除
          fsModule.rmSync(tmpDir, { recursive: true, force: true })
          
          // Excelファイルを返す
          resolve(new Response(excelBuffer, {
            headers: {
              'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'Content-Disposition': `attachment; filename="委附表2_${new Date().toISOString().substring(0, 10)}.xlsx"`
            }
          }))
        })
        
        pythonProcess.on('error', (error) => {
          console.error('Failed to start Python process:', error)
          fsModule.rmSync(tmpDir, { recursive: true, force: true })
          resolve(c.json({ 
            error: 'Python実行エラー: ' + error.message 
          }, 500))
        })
      })
    } else {
      // Cloudflare Workers環境（本番環境）または Wrangler Dev環境
      return c.json({ 
        error: 'この機能は現在の環境では利用できません。\n\n' +
               '【理由】\n' +
               'Cloudflare Workers/Wrangler環境では、Pythonスクリプトの実行やファイルシステムアクセスができません。\n\n' +
               '【対応方法】\n' +
               '1. 本番環境への対応が必要な場合は、外部API（AWS Lambda等）での実装をご検討ください\n' +
               '2. または、ブラウザ側処理（SheetJS）への切り替えをご検討ください（ただし、複雑な書式の保持は困難）'
      }, 501)
    }
  } catch (error: any) {
    console.error('Excel generation error:', error)
    return c.json({ error: 'Excel生成中にエラーが発生しました: ' + error.message }, 500)
  }
})

export default app
