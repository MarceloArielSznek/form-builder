/**
 * App API config from environment. Menaia credentials stay in the backend .env.
 */
function getOptionalEnv(key: string, fallback = ''): string {
  const value = import.meta.env[key]
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

const rawBackendApiUrl = getOptionalEnv('VITE_BACKEND_API_URL', 'http://localhost:3001').replace(/\/$/, '')

function getBackendApiUrl(): string {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return `${window.location.origin}/backend-api`
  }
  return rawBackendApiUrl
}

export const appConfig = {
  /** Base URL for this app's backend. In dev uses a Vite proxy to avoid CORS. */
  get apiUrl(): string {
    return getBackendApiUrl()
  },
  formsSlug: getOptionalEnv('VITE_MENAIA_FORMS_SLUG', 'forms'),
  organizationsSlug: getOptionalEnv('VITE_MENAIA_ORGANIZATIONS_SLUG', 'organizations'),
  branchesSlug: getOptionalEnv('VITE_MENAIA_BRANCHES_SLUG', 'branches'),
  formCategoriesSlug: getOptionalEnv('VITE_MENAIA_FORM_CATEGORIES_SLUG', 'form-categories'),
  /** Optional: URL for AI convert-to-HTML endpoint (POST { message } => { html }). */
  get aiConvertUrl(): string {
    return getOptionalEnv('VITE_AI_CONVERT_URL', `${getBackendApiUrl()}/api/convert-email-to-html`)
  },
}
