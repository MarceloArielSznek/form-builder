/**
 * Payload API config from environment. Set in .env (see .env.example).
 * In dev we use the Vite proxy path so requests are same-origin (avoids CORS).
 */
function getOptionalEnv(key: string, fallback = ''): string {
  const value = import.meta.env[key]
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

const rawApiUrl = getOptionalEnv('VITE_PAYLOAD_API_URL', 'http://localhost:3000').replace(/\/$/, '')

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
  branchesSlug: getOptionalEnv('VITE_PAYLOAD_BRANCHES_SLUG', 'branches'),
  formCategoriesSlug: getOptionalEnv('VITE_PAYLOAD_FORM_CATEGORIES_SLUG', 'form-categories'),
  adminEmail: getOptionalEnv('VITE_PAYLOAD_ADMIN_EMAIL'),
  adminPassword: getOptionalEnv('VITE_PAYLOAD_ADMIN_PASSWORD'),
  hasAutoLoginCredentials: Boolean(
    getOptionalEnv('VITE_PAYLOAD_ADMIN_EMAIL') && getOptionalEnv('VITE_PAYLOAD_ADMIN_PASSWORD'),
  ),
  /** Optional: URL for AI convert-to-HTML endpoint (POST { message } => { html }). */
  aiConvertUrl: getOptionalEnv('VITE_AI_CONVERT_URL'),
}
