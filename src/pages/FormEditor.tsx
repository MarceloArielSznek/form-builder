import { useEffect, useMemo } from 'react'
import { useFormEditor } from '../hooks/useFormEditor'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import FieldPalette from '../components/FieldPalette'
import BlockCard from '../components/BlockCard'
import FieldPropsPanel from '../components/FieldPropsPanel'
import FormPreview from '../components/FormPreview'
import './FormEditor.css'

interface FormEditorProps {
  formId: string | null
  onBack: () => void
  onSaved: (id: string) => void
}

export default function FormEditor({ formId, onBack, onSaved }: FormEditorProps) {
  const {
    form,
    fields,
    loading,
    saving,
    loadError,
    saveFeedback,
    selectedBlock,
    selectedFieldId,
    selectedIndex,
    validationIssues,
    blockingIssueCount,
    warningCount,
    isDirty,
    loadForm,
    updateTitle,
    addField,
    updateBlock,
    removeBlock,
    moveBlock,
    save,
    setSelectedFieldId,
  } = useFormEditor(formId)
  const { confirmNavigation, setDirty } = useUnsavedChanges()

  const issuePreview = useMemo(() => validationIssues.slice(0, 3), [validationIssues])

  useEffect(() => {
    setDirty(isDirty)
    return () => setDirty(false)
  }, [isDirty, setDirty])

  const handleBack = () => {
    if (!confirmNavigation()) {
      return
    }

    setDirty(false)
    onBack()
  }

  const handleSave = async () => {
    const savedId = await save()
    if (savedId) {
      onSaved(savedId)
    }
  }

  if (loading) {
    return (
      <div className="form-editor form-editor--state">
        <div className="form-editor__state app-card">
          <span className="app-status__eyebrow">Loading form</span>
          <h2>Opening the builder</h2>
          <p>Fetching the latest form configuration from Payload.</p>
        </div>
      </div>
    )
  }

  if (loadError && !form) {
    return (
      <div className="form-editor form-editor--state">
        <div className="form-editor__state app-card">
          <span className="app-status__eyebrow">Load error</span>
          <h2>We could not open this form</h2>
          <p>{loadError}</p>
          <div className="app-status__actions">
            {formId ? (
              <button type="button" className="app-button" onClick={() => void loadForm(formId)}>
                Retry
              </button>
            ) : null}
            <button type="button" className="app-button--ghost" onClick={onBack}>
              Back to forms
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="form-editor">
      <header className="form-editor__header">
        <div className="form-editor__header-main">
          <button type="button" className="app-button--ghost form-editor__back" onClick={handleBack}>
            Back to forms
          </button>

          <div className="form-editor__title-wrap">
            <div className="form-editor__meta">
              <span className="app-pill">{form?.id ? 'Existing form' : 'Draft form'}</span>
              <span className={`app-pill ${isDirty ? 'form-editor__status-pill--warning' : 'form-editor__status-pill--success'}`}>
                {isDirty ? 'Unsaved changes' : 'Saved'}
              </span>
            </div>
            <input
              type="text"
              className="app-input form-editor__title"
              value={form?.title ?? ''}
              onChange={(event) => updateTitle(event.target.value)}
              placeholder="Form title"
              aria-label="Form title"
            />
            <span className="form-editor__id">{form?.id ? `ID: ${form.id}` : 'New form'}</span>
          </div>
        </div>

        <div className="form-editor__header-actions">
          <div className="form-editor__issue-summary" aria-live="polite">
            <span className={`app-pill ${blockingIssueCount > 0 ? 'form-editor__status-pill--danger' : ''}`}>
              {blockingIssueCount} errors
            </span>
            <span className="app-pill">{warningCount} warnings</span>
          </div>
          <button
            type="button"
            className="app-button form-editor__save"
            onClick={handleSave}
            disabled={saving || blockingIssueCount > 0}
          >
            {saving ? 'Saving…' : form?.id ? 'Save changes' : 'Create form'}
          </button>
        </div>
      </header>

      {saveFeedback ? (
        <div className={saveFeedback.tone === 'success' ? 'app-banner--success form-editor__banner' : 'app-banner--danger form-editor__banner'} role={saveFeedback.tone === 'danger' ? 'alert' : 'status'}>
          {saveFeedback.message}
        </div>
      ) : null}

      {issuePreview.length > 0 ? (
        <div className="app-banner--warning form-editor__banner">
          <div>
            <strong>Review before saving</strong>
            <ul className="form-editor__issue-list">
              {issuePreview.map((issue, index) => (
                <li key={`${issue.title}-${index}`}>
                  <span>{issue.title}:</span> {issue.detail}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="form-editor__body">
        <section className="form-editor__fields">
          <div className="form-editor__section-head">
            <div>
              <h2 className="form-editor__section-title">Builder</h2>
              <p className="form-editor__section-copy">Add fields, reorder blocks, and select an item to configure it.</p>
            </div>
            <div className="form-editor__toolbar">
              <FieldPalette onSelect={addField} />
            </div>
          </div>

          <div className="form-editor__list">
            {fields.length === 0 ? (
              <div className="form-editor__empty">
                <h3>Start building your form</h3>
                <p>Add inputs, messages, and page breaks to shape the full experience.</p>
                <button type="button" className="app-button" onClick={() => addField('text')}>
                  Add first field
                </button>
              </div>
            ) : (
              fields.map((block, i) => (
                <BlockCard
                  key={block.id ?? i}
                  block={block}
                  fieldId={block.id ?? String(i)}
                  index={i}
                  totalBlocks={fields.length}
                  isSelected={selectedFieldId === block.id}
                  onSelect={() => setSelectedFieldId(block.id ?? null)}
                  onMoveUp={() => moveBlock(block.id ?? '', -1)}
                  onMoveDown={() => moveBlock(block.id ?? '', 1)}
                />
              ))
            )}
          </div>
        </section>

        <section className="form-editor__preview">
          <div className="form-editor__section-head">
            <div>
              <h2 className="form-editor__section-title">Live preview</h2>
              <p className="form-editor__section-copy">See how the current form structure reads for the end user.</p>
            </div>
          </div>
          <FormPreview form={form} className="form-editor__preview-inner" selectedFieldId={selectedFieldId} />
        </section>

        <aside className="form-editor__sidebar">
          <div className="form-editor__section-head">
            <div>
              <h2 className="form-editor__section-title">Field properties</h2>
              <p className="form-editor__section-copy">Tune labels, defaults, validation, and presentation details.</p>
            </div>
          </div>
          {selectedBlock ? (
            <FieldPropsPanel
              block={selectedBlock}
              fieldId={selectedBlock.id ?? ''}
              index={selectedIndex}
              issues={validationIssues.filter((issue) => issue.fieldId === selectedBlock.id)}
              onChange={updateBlock}
              onRemove={removeBlock}
            />
          ) : (
            <div className="form-editor__sidebar-placeholder">
              <h3>Nothing selected</h3>
              <p>Select a block from the builder to edit its name, label, options, width, and other settings.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
