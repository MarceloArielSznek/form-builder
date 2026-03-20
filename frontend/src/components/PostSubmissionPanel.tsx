import { useEffect, useMemo, useRef, useState } from 'react'
import type { Form, FormEmail, FormFieldBlock } from '../types/payload'
import { getBlockLabel } from '../lib/fieldBlocks'
import { useFormOptions } from '../hooks/useFormOptions'
import { getForm, listForms } from '../api/forms'
import EmailBuilderCard from './EmailBuilderCard'
import './PostSubmissionPanel.css'

function newId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11)
}

function insertAtCursor(
  text: string,
  before: string,
  after: string,
  start: number,
  end: number
): { newValue: string; newStart: number; newEnd: number } {
  const head = text.slice(0, start)
  const tail = text.slice(end)
  const selected = text.slice(start, end)
  const newValue = head + before + selected + after + tail
  return { newValue, newStart: start + before.length, newEnd: start + before.length + selected.length }
}

interface PostSubmissionPanelProps {
  form: Form
  onUpdate: (patch: Partial<Form>) => void
}

/** Default form category options when Payload has an enum with a single option (e.g. "project"). */
const DEFAULT_FORM_CATEGORIES = [{ value: 'project', label: 'Project' }]
const FALLBACK_ORG_LABEL = 'Attic Projects'

function getFieldOptionsFromForm(form: Form): { name: string; label?: string }[] {
  const fields = Array.isArray(form.fields) ? form.fields : []
  return fields
    .filter((b): b is FormFieldBlock & { name: string } => 'name' in b && typeof (b as { name: unknown }).name === 'string')
    .map((b) => ({
      name: (b as { name: string }).name,
      label: getBlockLabel(b),
      blockType: b.blockType,
      required: 'required' in b ? Boolean((b as { required?: boolean }).required) : false,
    }))
}

interface FormTemplateSource {
  id: string
  title: string
}

export default function PostSubmissionPanel({ form, onUpdate }: PostSubmissionPanelProps) {
  const confirmRef = useRef<HTMLTextAreaElement>(null)
  const branchDropdownRef = useRef<HTMLDivElement>(null)
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false)
  const [templateSourceId, setTemplateSourceId] = useState<string>('')
  const [templateSourceForm, setTemplateSourceForm] = useState<Form | null>(null)
  const [templateSources, setTemplateSources] = useState<FormTemplateSource[]>([])
  const [templateSourcesLoading, setTemplateSourcesLoading] = useState(false)
  const { branches, categories, organizations, loading: optionsLoading } = useFormOptions()
  const categoryOptions = categories.length > 0 ? categories : DEFAULT_FORM_CATEGORIES
  const organizationId = typeof form.organization === 'number' ? form.organization : null
  const organizationOptions = organizations.length > 0
    ? organizations
    : organizationId != null
      ? [{ id: organizationId, name: FALLBACK_ORG_LABEL }]
      : []
  const emails = Array.isArray(form.emails) ? form.emails : []
  const currentFieldOptions = useMemo(() => getFieldOptionsFromForm(form), [form.fields])
  const sourceFieldOptions = useMemo(
    () => (templateSourceForm ? getFieldOptionsFromForm(templateSourceForm) : currentFieldOptions),
    [currentFieldOptions, templateSourceForm],
  )
  const sourceTitle = templateSourceForm?.title ?? form.title ?? 'Form submission'
  const confirmationMessageText = form.confirmationMessageText ?? ''
  const redirectUrl = typeof form.redirect === 'object' && form.redirect?.url != null ? form.redirect.url : ''
  const selectedBranchIds = Array.isArray(form.branches) ? form.branches : []

  useEffect(() => {
    if (!branchDropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
        setBranchDropdownOpen(false)
      }
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [branchDropdownOpen])

  useEffect(() => {
    let mounted = true
    const loadTemplateSources = async () => {
      setTemplateSourcesLoading(true)
      try {
        const response = await listForms({ limit: 200, depth: 0 })
        if (!mounted) return
        const docs = Array.isArray(response.docs) ? response.docs : []
        const sources = docs
          .filter((f): f is Form & { id: string } => typeof f.id === 'string' && f.id.length > 0)
          .map((f) => ({ id: f.id, title: f.title?.trim() || `Form ${f.id}` }))
        setTemplateSources(sources)
      } catch {
        if (!mounted) return
        setTemplateSources([])
      } finally {
        if (mounted) setTemplateSourcesLoading(false)
      }
    }
    void loadTemplateSources()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const currentId = form.id == null ? '' : String(form.id).trim()
    setTemplateSourceId(currentId || '__current__')
    setTemplateSourceForm(null)
  }, [form.id])

  useEffect(() => {
    let mounted = true
    const loadSourceForm = async () => {
      if (!templateSourceId || templateSourceId === '__current__') {
        setTemplateSourceForm(null)
        return
      }
      try {
        const source = await getForm(templateSourceId, { depth: 2 })
        if (mounted) setTemplateSourceForm(source)
      } catch {
        if (mounted) setTemplateSourceForm(null)
      }
    }
    void loadSourceForm()
    return () => {
      mounted = false
    }
  }, [templateSourceId])

  const toggleBranch = (id: number) => {
    const next = selectedBranchIds.includes(id)
      ? selectedBranchIds.filter((b) => b !== id)
      : [...selectedBranchIds, id].sort((a, b) => a - b)
    onUpdate({ branches: next })
  }

  const addEmail = () => {
    onUpdate({
      emails: [
        ...emails,
        {
          id: newId(),
          emailTo: '',
          emailFrom: '',
          subject: form.title ?? 'Form submission',
        },
      ],
    })
  }

  const updateEmail = (index: number, email: FormEmail) => {
    const next = [...emails]
    next[index] = email
    onUpdate({ emails: next })
  }

  const removeEmail = (index: number) => {
    onUpdate({ emails: emails.filter((_, i) => i !== index) })
  }

  const applyConfirmFormat = (before: string, after: string = before) => {
    const el = confirmRef.current
    const text = confirmationMessageText
    if (!el) {
      onUpdate({ confirmationMessageText: text + before + after })
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const { newValue } = insertAtCursor(text, before, after, start, end)
    onUpdate({ confirmationMessageText: newValue })
    el.focus()
  }

  return (
    <div className="post-submission">
      <div className="post-submission__grid">
        <section className="post-submission__settings">
          <h2 className="post-submission__section-title">Form settings</h2>
          <div className="post-submission__group">
            <label className="post-submission__label">Form category</label>
            <select
              className="app-input post-submission__input"
              value={form.formCategory ?? ''}
              onChange={(e) => onUpdate({ formCategory: e.target.value })}
              disabled={optionsLoading}
            >
              <option value="">Select category</option>
              {categoryOptions.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label ?? cat.value}
                </option>
              ))}
            </select>
          </div>
          <div className="post-submission__group">
            <label className="post-submission__label">Organization *</label>
            <select
              className="app-input post-submission__input"
              value={organizationId ?? ''}
              onChange={(e) => {
                const value = e.target.value
                onUpdate({ organization: value ? Number(value) : undefined })
              }}
              disabled={optionsLoading}
            >
              <option value="">Select organization</option>
              {organizationOptions.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name ?? org.title ?? `Organization ${org.id}`}
                </option>
              ))}
            </select>
          </div>
          <div className="post-submission__group" ref={branchDropdownRef}>
            <label className="post-submission__label">Branches</label>
            <button
              type="button"
              className="post-submission__multiselect-trigger"
              onClick={() => setBranchDropdownOpen((v) => !v)}
              aria-expanded={branchDropdownOpen}
              aria-haspopup="listbox"
              disabled={optionsLoading}
            >
              {selectedBranchIds.length === 0
                ? 'Select branches…'
                : `${selectedBranchIds.length} branch${selectedBranchIds.length === 1 ? '' : 'es'} selected`}
            </button>
            {branchDropdownOpen && (
              <div className="post-submission__multiselect-dropdown" role="listbox">
                {branches.length === 0 ? (
                  <div className="post-submission__multiselect-empty">No branches in Payload.</div>
                ) : (
                  branches.map((branch) => (
                    <label key={branch.id} className="post-submission__multiselect-option">
                      <input
                        type="checkbox"
                        checked={selectedBranchIds.includes(branch.id)}
                        onChange={() => toggleBranch(branch.id)}
                      />
                      <span>{branch.name ?? branch.title ?? `Branch ${branch.id}`}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
          <div className="post-submission__group">
            <label className="post-submission__label">Submit button label</label>
            <input
              type="text"
              className="app-input post-submission__input"
              value={form.submitButtonLabel ?? ''}
              onChange={(e) => onUpdate({ submitButtonLabel: e.target.value })}
              placeholder="Submit Form"
            />
          </div>
          <div className="post-submission__group">
            <label className="post-submission__label">Confirmation type</label>
            <select
              className="app-input post-submission__input"
              value={form.confirmationType ?? 'message'}
              onChange={(e) => onUpdate({ confirmationType: e.target.value as 'message' | 'redirect' })}
            >
              <option value="message">Show message</option>
              <option value="redirect">Redirect to URL</option>
            </select>
          </div>
          {form.confirmationType !== 'redirect' && (
            <div className="post-submission__group">
              <label className="post-submission__label">Confirmation message (Markdown)</label>
              <div className="post-submission__toolbar">
                <button type="button" className="post-submission__toolbar-btn" onClick={() => applyConfirmFormat('**', '**')}>B</button>
                <button type="button" className="post-submission__toolbar-btn" onClick={() => applyConfirmFormat('*', '*')}>I</button>
                <button type="button" className="post-submission__toolbar-btn" onClick={() => applyConfirmFormat('\n# ', '')}>H1</button>
              </div>
              <textarea
                ref={confirmRef}
                className="app-textarea post-submission__textarea"
                rows={3}
                value={confirmationMessageText}
                onChange={(e) => onUpdate({ confirmationMessageText: e.target.value })}
                placeholder="Thank you for submitting..."
              />
            </div>
          )}
          {form.confirmationType === 'redirect' && (
            <div className="post-submission__group">
              <label className="post-submission__label">Redirect URL</label>
              <input
                type="url"
                className="app-input post-submission__input"
                value={redirectUrl}
                onChange={(e) => onUpdate({ redirect: { url: e.target.value || null } })}
                placeholder="https://..."
              />
            </div>
          )}
        </section>

        <section className="post-submission__emails">
          <div className="post-submission__emails-head">
            <h2 className="post-submission__section-title">Emails after submission</h2>
            <p className="post-submission__section-copy">Configure emails sent when the form is submitted. Use the preview to see how each email will look.</p>
            <div className="post-submission__group">
              <label className="post-submission__label">Template source form</label>
              <select
                className="app-input post-submission__input"
                value={templateSourceId}
                onChange={(e) => setTemplateSourceId(e.target.value)}
                disabled={templateSourcesLoading}
              >
                <option value="__current__">Current form</option>
                {templateSources
                  .filter((source) => source.id !== String(form.id ?? ''))
                  .map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.title}
                    </option>
                  ))}
              </select>
            </div>
            <button type="button" className="app-button post-submission__add-email" onClick={addEmail}>
              + Add email
            </button>
          </div>
          <div className="post-submission__emails-list">
            {emails.length === 0 ? (
              <div className="post-submission__empty">
                <p>No emails configured. Add an email to send a notification when the form is submitted.</p>
                <button type="button" className="app-button" onClick={addEmail}>
                  Add first email
                </button>
              </div>
            ) : (
              emails.map((email, index) => (
                <EmailBuilderCard
                  key={email.id ?? index}
                  email={email}
                  index={index}
                  fieldOptions={sourceFieldOptions}
                  sourceFormTitle={sourceTitle}
                  onChange={(e) => updateEmail(index, e)}
                  onRemove={() => removeEmail(index)}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
