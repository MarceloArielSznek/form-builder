import { useCallback, useEffect, useMemo, useState } from 'react'
import { listForms, type ListFormsResponse } from '../api/forms'
import type { Form } from '../types/payload'
import './FormList.css'

interface FormListProps {
  onSelectForm: (id: string) => void
  onCreateNew: () => void
}

export default function FormList({ onSelectForm, onCreateNew }: FormListProps) {
  const [data, setData] = useState<ListFormsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const loadForms = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await listForms({ limit: 50 })
      setData(response)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load forms')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadForms().catch(() => undefined)
  }, [loadForms])

  const forms = useMemo(() => {
    const allForms = (data?.docs ?? []) as Form[]
    const normalizedQuery = query.trim().toLowerCase()
    const filtered = normalizedQuery
      ? allForms.filter((form) => {
          const title = (form.title || '').toLowerCase()
          const id = form.id.toLowerCase()
          return title.includes(normalizedQuery) || id.includes(normalizedQuery)
        })
      : allForms

    return filtered.slice().sort((left, right) => {
      const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0
      const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0
      return rightTime - leftTime
    })
  }, [data, query])

  const totalForms = (data?.docs ?? []).length
  const totalFields = (data?.docs ?? []).reduce((sum, form) => {
    const fieldCount = Array.isArray(form.fields) ? form.fields.length : 0
    return sum + fieldCount
  }, 0)
  const latestUpdate = (data?.docs ?? [])
    .map((form) => form.updatedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1)

  return (
    <div className="form-list">
      <section className="form-list__hero">
        <div className="form-list__hero-copy">
          <span className="app-status__eyebrow">Workspace overview</span>
          <h1 className="form-list__title">Build, review, and maintain your Payload forms</h1>
          <p className="form-list__subtitle">
            Create new forms, refine existing ones, and jump back into editing with a clearer
            overview of your current workspace.
          </p>
        </div>

        <div className="form-list__hero-actions">
          <button type="button" className="app-button--ghost" onClick={() => void loadForms()}>
            Refresh
          </button>
          <button type="button" className="app-button" onClick={onCreateNew}>
            New form
          </button>
        </div>
      </section>

      <section className="form-list__stats" aria-label="Workspace statistics">
        <article className="form-list__stat app-card">
          <span className="form-list__stat-label">Forms</span>
          <strong className="form-list__stat-value">{totalForms}</strong>
        </article>
        <article className="form-list__stat app-card">
          <span className="form-list__stat-label">Total fields</span>
          <strong className="form-list__stat-value">{totalFields}</strong>
        </article>
        <article className="form-list__stat app-card">
          <span className="form-list__stat-label">Last updated</span>
          <strong className="form-list__stat-value">
            {latestUpdate ? new Date(latestUpdate).toLocaleDateString() : 'No activity yet'}
          </strong>
        </article>
      </section>

      <section className="form-list__panel app-card">
        <div className="form-list__panel-header">
          <div>
            <h2 className="form-list__panel-title">All forms</h2>
            <p className="form-list__panel-copy">
              Search by title or ID and jump directly into editing.
            </p>
          </div>

          <label className="form-list__search">
            <span className="sr-only">Search forms</span>
            <input
              type="search"
              className="app-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search forms"
            />
          </label>
        </div>

        {loading ? (
          <div className="form-list__state app-banner" aria-live="polite">
            Loading forms from Payload…
          </div>
        ) : error ? (
          <div className="form-list__state app-banner--danger" role="alert">
            <div>
              <strong>Could not load your forms.</strong>
              <p>{error}</p>
            </div>
            <button type="button" className="app-button--ghost" onClick={() => void loadForms()}>
              Retry
            </button>
          </div>
        ) : forms.length === 0 ? (
          <div className="form-list__empty-state">
            <h3>{query ? 'No matching forms' : 'No forms yet'}</h3>
            <p>
              {query
                ? 'Try a different search term, or create a new form.'
                : 'Create your first Payload form to start building fields and previewing the experience.'}
            </p>
            <button type="button" className="app-button" onClick={onCreateNew}>
              Create form
            </button>
          </div>
        ) : (
          <div className="form-list__table-wrap">
            <table className="form-list__table">
              <thead>
                <tr>
                  <th scope="col">Title</th>
                  <th scope="col">Fields</th>
                  <th scope="col">Updated</th>
                  <th scope="col" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {forms.map((form) => (
                  <tr key={form.id} className="form-list__row">
                    <td>
                      <button
                        type="button"
                        className="form-list__row-link"
                        onClick={() => onSelectForm(form.id)}
                      >
                        <span className="form-list__row-title">{form.title || `Form ${form.id}`}</span>
                        <span className="form-list__row-id">{form.id}</span>
                      </button>
                    </td>
                    <td>{Array.isArray(form.fields) ? form.fields.length : 0} fields</td>
                    <td>{form.updatedAt ? new Date(form.updatedAt).toLocaleDateString() : '—'}</td>
                    <td className="form-list__row-actions">
                      <button
                        type="button"
                        className="app-button--ghost form-list__btn-edit"
                        onClick={() => onSelectForm(form.id)}
                      >
                        Open builder
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
