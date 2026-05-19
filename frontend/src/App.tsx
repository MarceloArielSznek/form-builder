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
import { clearSession, ensureSession, isAuthenticated } from './api/auth'
import { UnsavedChangesProvider } from './hooks/useUnsavedChanges'
import AppStatusScreen from './components/AppStatusScreen'
import ProductLayout from './layouts/ProductLayout'
import FormList from './pages/FormList'
import FormEditor from './pages/FormEditor'

type AuthStatus = 'booting' | 'authenticated' | 'unauthenticated'

function App() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('booting')
  const [authBusy, setAuthBusy] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  const bootstrapAuth = useCallback(async () => {
    setAuthBusy(true)
    setAuthError(null)
    try {
      const result = await ensureSession()
      if (!result.ok) {
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

  const handleLogout = useCallback(() => {
    clearSession()
    void bootstrapAuth()
  }, [bootstrapAuth])

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
                ) : authStatus === 'booting' ? (
                  <AppStatusScreen
                    eyebrow="Initializing"
                    title="Connecting to Menaia"
                    description="Checking the backend Supabase session and preparing the form builder workspace."
                  />
                ) : (
                  <Navigate to="/forms" replace />
                )
              }
            />

            <Route
              element={
                <ProtectedLayout
                  authStatus={authStatus}
                  authBusy={authBusy}
                  authError={authError}
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
                  to="/forms"
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
  onRetry: () => Promise<void>
  onLogout: () => void
}

function ProtectedLayout({
  authStatus,
  authBusy,
  authError,
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
    const isNetworkError =
      authError === 'Failed to fetch' ||
      authError?.toLowerCase().includes('network') ||
      authError?.toLowerCase().includes('fetch')
    const hint = isNetworkError
      ? 'Ensure the backend is running and reachable through VITE_BACKEND_API_URL or the dev /backend-api proxy.'
      : authError ?? 'Check the Menaia and Supabase values in backend/.env.'
    return (
      <AppStatusScreen
        eyebrow="Connection failed"
        title="Could not connect to Menaia"
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
