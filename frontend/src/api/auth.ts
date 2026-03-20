import { payloadConfig } from '../lib/env'
import { jsonHeaders, requestJson } from './http'

const TOKEN_KEY = 'payload_formbuilder_token'
const EXP_KEY = 'payload_formbuilder_exp'

export type LoginResult =
  | { ok: true; token: string; exp: number; user: { id: string; email: string } }
  | { ok: false; error: string }

/**
 * Login with Payload admin credentials. On success, token is stored in sessionStorage.
 * Credentials come from the login form (or optionally from env for local use).
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  const url = `${payloadConfig.apiUrl}/api/${payloadConfig.authSlug}/login`
  try {
    const data = await requestJson<{ token: string; exp: number; user: { id: string; email: string } }>(
      url,
      {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ email, password }),
      },
    )

    const token = data.token
    const exp = data.exp
    const user = data.user

    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token)
      sessionStorage.setItem(EXP_KEY, String(exp))
    }

    return { ok: true, token, exp, user }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network error'
    const cause = e instanceof Error && e.cause instanceof Error ? e.cause.message : ''
    const detail = cause ? `${message} (${cause})` : message
    if (typeof window !== 'undefined') {
      console.error('[Payload login] Request URL:', url, 'Error:', detail)
    }
    return { ok: false, error: message }
  }
}

export function getStoredToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function getStoredExp(): number | null {
  const exp = sessionStorage.getItem(EXP_KEY)
  return exp ? parseInt(exp, 10) : null
}

/** Clear stored token (e.g. logout). */
export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(EXP_KEY)
}

/** True if we have a token and it is not yet expired (with 60s buffer). */
export function isAuthenticated(): boolean {
  const token = getStoredToken()
  const exp = getStoredExp()
  if (!token || exp == null) return false
  return Date.now() / 1000 < exp - 60
}

/**
 * Ensure we have a token on startup: if already authenticated, do nothing;
 * in dev only, optionally log in using VITE_PAYLOAD_ADMIN_EMAIL / VITE_PAYLOAD_ADMIN_PASSWORD.
 * Production always uses the login page.
 */
export async function ensureToken(): Promise<LoginResult | null> {
  if (isAuthenticated()) return null
  const { adminEmail, adminPassword, hasAutoLoginCredentials } = payloadConfig
  if (!hasAutoLoginCredentials || !adminEmail || !adminPassword) {
    if (import.meta.env.DEV) {
      console.warn(
        'Payload: no credentials in .env (VITE_PAYLOAD_ADMIN_EMAIL, VITE_PAYLOAD_ADMIN_PASSWORD). Set them for dev auto-login.',
      )
    }
    return null
  }
  return login(adminEmail, adminPassword)
}
