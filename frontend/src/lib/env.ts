/**
 * Payload API config from environment. Set in .env (see .env.example).
 * In dev we use the Vite proxy path so requests are same-origin (avoids CORS).
 */
function getOptionalEnv(key: string, fallback = ''): string {
  const value = import.meta.env[key]
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

const rawApiUrl = getOptionalEnv('VITE_PAYLOAD_API_URL', 'http://localhost:3000').replace(/\/$/, '')
const adminEmail = getOptionalEnv('VITE_PAYLOAD_ADMIN_EMAIL')
const adminPassword = getOptionalEnv('VITE_PAYLOAD_ADMIN_PASSWORD')

export const payloadConfig = {
  /** Base URL for Payload API. In dev uses proxy path to avoid CORS. */
  get apiUrl(): string {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      return `${window.location.origin}/payload-api`
    }
    return rawApiUrl
  },
  authSlug: getOptionalEnv('VITE_PAYLOAD_AUTH_SLUG', 'users'),
  formsSlug: getOptionalEnv('VITE_PAYLOAD_FORMS_SLUG', 'forms'),
  organizationsSlug: getOptionalEnv('VITE_PAYLOAD_ORGANIZATIONS_SLUG', 'organizations'),
  branchesSlug: getOptionalEnv('VITE_PAYLOAD_BRANCHES_SLUG', 'branches'),
  formCategoriesSlug: getOptionalEnv('VITE_PAYLOAD_FORM_CATEGORIES_SLUG', 'form-categories'),
  adminEmail,
  adminPassword,
  /** Dev-only silent login; production builds never use env credentials for auth. */
  hasAutoLoginCredentials: import.meta.env.DEV && Boolean(adminEmail && adminPassword),
  /** Optional: URL for AI convert-to-HTML endpoint (POST { message } => { html }). */
  aiConvertUrl: getOptionalEnv('VITE_AI_CONVERT_URL'),
}
