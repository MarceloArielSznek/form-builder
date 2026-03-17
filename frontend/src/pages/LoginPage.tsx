import { useEffect, useState, type FormEvent } from 'react'
import './LoginPage.css'

interface LoginPageProps {
  initialEmail?: string
  initialPassword?: string
  loading: boolean
  error: string | null
  onSubmit: (credentials: { email: string; password: string }) => Promise<void>
}

export default function LoginPage({
  initialEmail = '',
  initialPassword = '',
  loading,
  error,
  onSubmit,
}: LoginPageProps) {
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState(initialPassword)

  useEffect(() => {
    setEmail(initialEmail)
  }, [initialEmail])

  useEffect(() => {
    setPassword(initialPassword)
  }, [initialPassword])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await onSubmit({ email, password })
  }

  return (
    <div className="login-page">
      <section className="login-page__panel app-card">
        <div className="login-page__intro">
          <span className="app-status__eyebrow">Payload workspace</span>
          <h1 className="login-page__title">Sign in to manage your forms</h1>
          <p className="login-page__description">
            Build and refine Payload forms with a polished live preview, field configuration, and
            safer editing flow.
          </p>
        </div>

        <form className="login-page__form" onSubmit={handleSubmit}>
          <div className="login-page__field">
            <label className="app-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="app-input"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              required
            />
          </div>

          <div className="login-page__field">
            <label className="app-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="app-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your Payload password"
              required
            />
            <p className="app-helper">Your session token is stored only for this browser session.</p>
          </div>

          {error ? (
            <div className="app-banner--danger" role="alert">
              {error}
            </div>
          ) : null}

          <div className="login-page__actions">
            <button type="submit" className="app-button" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
