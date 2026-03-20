import { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import type { Bindings, Session, User } from './types'
import { base64Decode } from './utils'

export async function authMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  const sessionToken = getCookie(c, 'session')
  
  if (!sessionToken) {
    return c.json({ error: '認証が必要です' }, 401)
  }

  try {
    // Parse session token (in production, use encrypted/signed tokens)
    const session: Session = JSON.parse(base64Decode(sessionToken))
    
    // Check if session is expired
    if (session.expires_at < Date.now()) {
      return c.json({ error: 'セッションが期限切れです' }, 401)
    }

    // Store session in context
    c.set('session', session)
    
    await next()
  } catch (error) {
    return c.json({ error: '無効なセッションです' }, 401)
  }
}

export async function adminMiddleware(c: Context<{ Bindings: Bindings }>, next: Next) {
  const sessionToken = getCookie(c, 'session')
  
  if (!sessionToken) {
    return c.json({ error: '認証が必要です' }, 401)
  }

  try {
    // Parse session token
    const session: Session = JSON.parse(base64Decode(sessionToken))
    
    // Check if session is expired
    if (session.expires_at < Date.now()) {
      return c.json({ error: 'セッションが期限切れです' }, 401)
    }

    // Get user from database to check role
    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(session.user_id).first<User>()

    if (!user || user.role !== 'admin') {
      return c.json({ error: '管理者権限が必要です' }, 403)
    }

    // Store session in context
    c.set('session', session)
    c.set('user', user)
    
    await next()
  } catch (error) {
    return c.json({ error: '無効なセッションです' }, 401)
  }
}
