import { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import type { Bindings, Session } from './types'
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
