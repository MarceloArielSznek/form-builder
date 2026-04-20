import { useCallback, useEffect, useState } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { clearToken, ensureToken, isAuthenticated, login } from './api/auth'
import { UnsavedChangesProvider } from './hooks/useUnsavedChanges'
import { payloadConfig } from './lib/env'
import AppStatusScreen from './components/AppStatusScreen'
import ProductLayout from './layouts/ProductLayout'
import FormList from './pages/FormList'
import FormEditor from './pages/FormEditor'
import LoginPage from './pages/LoginPage'

type AuthStatus = 'booting' | 'authenticated' | 'unauthenticated'

function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('booting')
  const [authBusy, setAuthBusy] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  const bootstrapAuth = useCallback(async () => {
    setAuthBusy(true)
    setAuthError(null)
    try {
      const result = await ensureToken()
      if (result && !result.ok) {
        setAuthStatus('unauthenticated')
        setAuthError(result.error)
        return
      }
      setAuthStatus(isAuthenticated() ? 'authenticated' : 'unauthenticated')
    } catch (error) {
      setAuthStatus('unauthenticated')
      setAuthError(error instanceof Error ? error.message : 'Failed to initialize session.')
    } finally {
      setAuthBusy(false)
    }
  }, [])

  useEffect(() => {
    void bootstrapAuth()
  }, [bootstrapAuth])

  const handleLogin = useCallback(async (credentials: { email: string; password: string }) => {
    setAuthBusy(true)
    setAuthError(null)
    const result = await login(credentials.email, credentials.password)
    if (!result.ok) {
      setAuthStatus('unauthenticated')
      setAuthError(result.error)
      setAuthBusy(false)
      return
    }
    setAuthStatus('authenticated')
    setAuthBusy(false)
  }, [])

  const handleLogout = useCallback(() => {
    clearToken()
    setAuthStatus('unauthenticated')
    setAuthError(null)
  }, [])

  const hasEnvCredentials = payloadConfig.hasAutoLoginCredentials
  const defaultUnauthenticatedPath = hasEnvCredentials ? '/forms' : '/login'

  return (
    <BrowserRouter>
      <UnsavedChangesProvider>
        <div className="app app-shell">
          <Routes>
            <Route
              path="/login"
              element={
                authStatus === 'authenticated' ? (
                  <Navigate to="/forms" replace />
                ) : hasEnvCredentials ? (
                  <Navigate to={defaultUnauthenticatedPath} replace />
                ) : authStatus === 'booting' ? (
                  <AppStatusScreen
                    eyebrow="Initializing"
                    title="Connecting to Payload"
                    description="Checking your current session and preparing the form builder workspace."
                  />
                ) : (
                  <LoginPage
                    initialEmail={payloadConfig.adminEmail}
                    initialPassword={payloadConfig.adminPassword}
                    loading={authBusy}
                    error={authError}
                    onSubmit={handleLogin}
                  />
                )
              }
            />

            <Route
              element={
                <ProtectedLayout
                  authStatus={authStatus}
                  authBusy={authBusy}
                  authError={authError}
                  hasEnvCredentials={hasEnvCredentials}
                  onRetry={bootstrapAuth}
                  onLogout={handleLogout}
                />
              }
            >
              <Route path="/" element={<Navigate to="/forms" replace />} />
              <Route path="/forms" element={<FormListRoute />} />
              <Route path="/forms/new" element={<FormEditorRoute />} />
              <Route path="/forms/:formId" element={<FormEditorRoute />} />
            </Route>

            <Route
              path="*"
              element={
                <Navigate
                  to={authStatus === 'authenticated' ? '/forms' : defaultUnauthenticatedPath}
                  replace
                />
              }
            />
          </Routes>
        </div>
      </UnsavedChangesProvider>
    </BrowserRouter>
  )
}

interface ProtectedLayoutProps {
  authStatus: AuthStatus
  authBusy: boolean
  authError: string | null
  hasEnvCredentials: boolean
  onRetry: () => Promise<void>
  onLogout: () => void
}

function ProtectedLayout({
  authStatus,
  authBusy,
  authError,
  hasEnvCredentials,
  onRetry,
  onLogout,
}: ProtectedLayoutProps) {
  if (authStatus === 'booting' || authBusy) {
    return (
      <AppStatusScreen
        eyebrow="Loading workspace"
        title="Preparing your forms"
        description="Fetching your session and opening the builder. This should only take a moment."
      />
    )
  }

  if (authStatus !== 'authenticated') {
    if (hasEnvCredentials) {
      const isNetworkError =
        authError === 'Failed to fetch' ||
        authError?.toLowerCase().includes('network') ||
        authError?.toLowerCase().includes('fetch')
      const hint = isNetworkError
        ? 'In dev the app proxies to VITE_PAYLOAD_API_URL. Ensure Payload is running at that URL and that /api/users/login is reachable. Open the browser console to see the exact request URL.'
        : authError ?? 'Check VITE_PAYLOAD_API_URL and your credentials in .env.'
      return (
        <AppStatusScreen
          eyebrow="Connection failed"
          title="Could not connect to Payload"
          description={hint}
          tone="danger"
          actions={
            <button type="button" className="app-button" onClick={() => void onRetry()}>
              Retry
            </button>
          }
        />
      )
    }
    return <Navigate to="/login" replace />
  }

  if (authError) {
    return (
      <AppStatusScreen
        eyebrow="Session issue"
        title="We could not restore your workspace"
        description={authError}
        tone="danger"
        actions={
          <button type="button" className="app-button" onClick={() => void onRetry()}>
            Try again
          </button>
        }
      />
    )
  }

  return <ProductLayout onLogout={onLogout} />
}

function FormListRoute() {
  const navigate = useNavigate()

  return (
    <FormList
      onSelectForm={(id) => navigate(`/forms/${id}`)}
      onCreateNew={() => navigate('/forms/new')}
      onDuplicateForm={(id) => navigate(`/forms/new?duplicateFrom=${encodeURIComponent(id)}`)}
    />
  )
}

function FormEditorRoute() {
  const navigate = useNavigate()
  const { formId } = useParams<{ formId: string }>()
  const [searchParams] = useSearchParams()
  const duplicateFromId = formId ? null : searchParams.get('duplicateFrom')

  return (
    <FormEditor
      formId={formId ?? null}
      duplicateFromId={duplicateFromId}
      onBack={() => navigate('/forms')}
      onSaved={(id) => navigate(`/forms/${id}`, { replace: true })}
    />
  )
}

export default App
