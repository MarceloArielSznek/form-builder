import type { ReactNode } from 'react'

interface AppStatusScreenProps {
  eyebrow?: string
  title: string
  description: string
  tone?: 'default' | 'danger'
  actions?: ReactNode
}

export default function AppStatusScreen({
  eyebrow,
  title,
  description,
  tone = 'default',
  actions,
}: AppStatusScreenProps) {
  return (
    <div className="app-status">
      <section className="app-status__card" aria-live="polite">
        {eyebrow ? (
          <span className="app-status__eyebrow">{eyebrow}</span>
        ) : null}
        <h1 className="app-status__title">{title}</h1>
        <p className={tone === 'danger' ? 'app-banner--danger' : 'app-status__description'}>
          {description}
        </p>
        {actions ? <div className="app-status__actions">{actions}</div> : null}
      </section>
    </div>
  )
}
