import { appConfig } from '../lib/env'
import { requestJson } from './http'

const SESSION_KEY = 'menaia_formbuilder_session'

export type SessionResult =
  | { ok: true; expiresAt: number | null; cookieChunks: number }
  | { ok: false; error: string }

export async function ensureSession(): Promise<SessionResult> {
  const url = `${appConfig.apiUrl}/api/menaia/session`
  try {
    const data = await requestJson<{ ok: true; expiresAt: number | null; cookieChunks: number }>(url)

    sessionStorage.setItem(SESSION_KEY, 'ready')
    return data
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network error'
    const cause = e instanceof Error && e.cause instanceof Error ? e.cause.message : ''
    const detail = cause ? `${message} (${cause})` : message
    if (typeof window !== 'undefined') {
      console.error('[Menaia session] Request URL:', url, 'Error:', detail)
    }
    sessionStorage.removeItem(SESSION_KEY)
    return { ok: false, error: message }
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY)
}

export function isAuthenticated(): boolean {
  return sessionStorage.getItem(SESSION_KEY) === 'ready'
}
