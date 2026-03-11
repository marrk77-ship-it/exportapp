import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'
import { setCookie, deleteCookie, getCookie } from 'hono/cookie'
import bcrypt from 'bcryptjs'
import type { Bindings, User, Session, CSVData, ExportSettings } from './types'
import { authMiddleware } from './middleware'
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
  const { login_id, password } = await c.req.json()

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

  // Create session
  const session: Session = {
    user_id: user.id,
    login_id: user.login_id,
    name: user.name,
    expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
  }

  // Set cookie (in production, use encrypted/signed tokens)
  const sessionToken = base64Encode(JSON.stringify(session))
  setCookie(c, 'session', sessionToken, {
    maxAge: 7 * 24 * 60 * 60, // 7 days
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/',
  })

  return c.json({
    success: true,
    user: {
      id: user.id,
      login_id: user.login_id,
      name: user.name,
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
    <div id="app"><\/div>
    
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"><\/script>
    <script src="https://cdn.jsdelivr.net/npm/papaparse@5.4.1/papaparse.min.js"><\/script>
    <script src="/static/app.js"><\/script>
</body>
</html>`;
  return c.html(html)
})

export default app
