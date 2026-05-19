import { Outlet, NavLink } from 'react-router-dom'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import './ProductLayout.css'

interface ProductLayoutProps {
  onLogout: () => void
}

export default function ProductLayout({ onLogout }: ProductLayoutProps) {
  const { confirmNavigation, setDirty } = useUnsavedChanges()

  const handleProtectedAction = (action: () => void) => {
    if (!confirmNavigation()) {
      return
    }

    setDirty(false)
    action()
  }

  return (
    <div className="product-layout">
      <header className="product-layout__topbar">
        <div className="product-layout__brand">
          <div className="product-layout__brand-mark" aria-hidden="true">
            FB
          </div>
          <div>
            <div className="product-layout__brand-title">Form Builder</div>
            <div className="product-layout__brand-subtitle">Menaia workspace</div>
          </div>
        </div>

        <nav className="product-layout__nav" aria-label="Primary">
          <NavLink
            to="/forms"
            end
            onClick={(event) => {
              if (!confirmNavigation()) {
                event.preventDefault()
                return
              }

              setDirty(false)
            }}
            className={({ isActive }) =>
              `product-layout__nav-link ${isActive ? 'product-layout__nav-link--active' : ''}`
            }
          >
            Forms
          </NavLink>
          <NavLink
            to="/forms/new"
            onClick={(event) => {
              if (!confirmNavigation()) {
                event.preventDefault()
                return
              }

              setDirty(false)
            }}
            className={({ isActive }) =>
              `product-layout__nav-link ${isActive ? 'product-layout__nav-link--active' : ''}`
            }
          >
            New form
          </NavLink>
        </nav>

        <button
          type="button"
          className="app-button--ghost product-layout__logout"
          onClick={() => handleProtectedAction(onLogout)}
        >
          Reconnect
        </button>
      </header>

      <main className="product-layout__content">
        <Outlet />
      </main>
    </div>
  )
}
