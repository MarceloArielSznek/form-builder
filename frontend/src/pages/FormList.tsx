import { useCallback, useEffect, useMemo, useState } from 'react'
import { listForms, type ListFormsResponse } from '../api/forms'
import type { Form } from '../types/payload'
import './FormList.css'

interface FormListProps {
  onSelectForm: (id: string) => void
  onCreateNew: () => void
  onDuplicateForm: (id: string) => void
}

type FormGroupKey = 'shared' | 'perBranch' | 'unassigned'

interface FormGroupConfig {
  key: FormGroupKey
  title: string
  description: string
  emptyLabel: string
}

const GROUP_CONFIG: Record<FormGroupKey, FormGroupConfig> = {
  shared: {
    key: 'shared',
    title: 'Shared forms (multi-branch)',
    description: 'Forms that apply to more than one branch.',
    emptyLabel: 'No shared forms yet.',
  },
  perBranch: {
    key: 'perBranch',
    title: 'Per-branch forms',
    description: 'Forms tied to a single branch.',
    emptyLabel: 'No per-branch forms yet.',
  },
  unassigned: {
    key: 'unassigned',
    title: 'Unassigned (no branch)',
    description: 'Forms without any branch assigned.',
    emptyLabel: 'No unassigned forms.',
  },
}

function getBranchCount(form: Form): number {
  return Array.isArray(form.branches) ? form.branches.length : 0
}

function groupOf(form: Form): FormGroupKey {
  const count = getBranchCount(form)
  if (count === 0) return 'unassigned'
  if (count === 1) return 'perBranch'
  return 'shared'
}

export default function FormList({ onSelectForm, onCreateNew, onDuplicateForm }: FormListProps) {
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

  const groupedForms = useMemo(() => {
    const allForms = (data?.docs ?? []) as Form[]
    const normalizedQuery = query.trim().toLowerCase()
    const filtered = normalizedQuery
      ? allForms.filter((form) => {
          const title = (form.title || '').toLowerCase()
          const id = String(form.id ?? '').toLowerCase()
          return title.includes(normalizedQuery) || id.includes(normalizedQuery)
        })
      : allForms

    const sorted = filtered.slice().sort((left, right) => {
      const leftTime = left.updatedAt ? new Date(left.updatedAt).getTime() : 0
      const rightTime = right.updatedAt ? new Date(right.updatedAt).getTime() : 0
      return rightTime - leftTime
    })

    const groups: Record<FormGroupKey, Form[]> = {
      shared: [],
      perBranch: [],
      unassigned: [],
    }
    for (const form of sorted) {
      groups[groupOf(form)].push(form)
    }
    return groups
  }, [data, query])

  const totalMatchingForms =
    groupedForms.shared.length + groupedForms.perBranch.length + groupedForms.unassigned.length
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

  const isSearching = query.trim().length > 0

  return (
    <div className="form-list">
      <section className="form-list__hero">
        <div className="form-list__hero-copy">
          <span className="app-status__eyebrow">Workspace overview</span>
          <h1 className="form-list__title">Build, review, and maintain your Menaia forms</h1>
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
              Search by title or ID, or duplicate a form to reuse its fields.
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
            Loading forms from Menaia...
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
        ) : totalMatchingForms === 0 ? (
          <div className="form-list__empty-state">
            <h3>{isSearching ? 'No matching forms' : 'No forms yet'}</h3>
            <p>
              {isSearching
                ? 'Try a different search term, or create a new form.'
                : 'Create your first Menaia form to start building fields and previewing the experience.'}
            </p>
            <button type="button" className="app-button" onClick={onCreateNew}>
              Create form
            </button>
          </div>
        ) : (
          <div className="form-list__groups">
            {(Object.values(GROUP_CONFIG) as FormGroupConfig[]).map((group) => {
              const forms = groupedForms[group.key]
              if (forms.length === 0 && isSearching) {
                return null
              }
              return (
                <FormGroup
                  key={group.key}
                  config={group}
                  forms={forms}
                  onSelectForm={onSelectForm}
                  onDuplicateForm={onDuplicateForm}
                />
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

interface FormGroupProps {
  config: FormGroupConfig
  forms: Form[]
  onSelectForm: (id: string) => void
  onDuplicateForm: (id: string) => void
}

function FormGroup({ config, forms, onSelectForm, onDuplicateForm }: FormGroupProps) {
  return (
    <section className="form-list__group" aria-labelledby={`form-list-group-${config.key}`}>
      <header className="form-list__group-header">
        <div>
          <h3 id={`form-list-group-${config.key}`} className="form-list__group-title">
            {config.title}
          </h3>
          <p className="form-list__group-copy">{config.description}</p>
        </div>
        <span className="form-list__group-count">{forms.length}</span>
      </header>

      {forms.length === 0 ? (
        <div className="form-list__group-empty">{config.emptyLabel}</div>
      ) : (
        <div className="form-list__table-wrap">
          <table className="form-list__table">
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Fields</th>
                <th scope="col">Branches</th>
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
                      <span className="form-list__row-title">
                        {form.title || `Form ${form.id}`}
                      </span>
                      <span className="form-list__row-id">{form.id}</span>
                    </button>
                  </td>
                  <td>{Array.isArray(form.fields) ? form.fields.length : 0}</td>
                  <td>{getBranchCount(form)}</td>
                  <td>{form.updatedAt ? new Date(form.updatedAt).toLocaleDateString() : '—'}</td>
                  <td className="form-list__row-actions">
                    <div className="form-list__row-actions-group">
                      <button
                        type="button"
                        className="app-button--ghost form-list__btn-action"
                        onClick={() => onDuplicateForm(form.id)}
                        title="Duplicate fields into a new form"
                      >
                        Duplicate
                      </button>
                      <button
                        type="button"
                        className="app-button--ghost form-list__btn-action"
                        onClick={() => onSelectForm(form.id)}
                      >
                        Open builder
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
