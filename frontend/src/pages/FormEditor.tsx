import { useEffect, useMemo, useState } from 'react'
import { useFormEditor } from '../hooks/useFormEditor'
import { useUnsavedChanges } from '../hooks/useUnsavedChanges'
import FieldPalette from '../components/FieldPalette'
import FieldPaletteStrip, { DRAG_TYPE } from '../components/FieldPaletteStrip'
import BlockCard from '../components/BlockCard'
import FieldPropsPanel from '../components/FieldPropsPanel'
import FormPreview from '../components/FormPreview'
import PostSubmissionPanel from '../components/PostSubmissionPanel'
import type { FormFieldBlockType } from '../types/payload'
import './FormEditor.css'

type EditorStep = 'build' | 'postSubmission'

interface FormEditorProps {
  formId: string | null
  duplicateFromId?: string | null
  onBack: () => void
  onSaved: (id: string) => void
}

export default function FormEditor({ formId, duplicateFromId = null, onBack, onSaved }: FormEditorProps) {
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
    isDuplicateDraft,
    loadForm,
    updateTitle,
    addField,
    addFieldAt,
    updateBlock,
    removeBlock,
    moveBlock,
    moveBlockToIndex,
    save,
    setSelectedFieldId,
    updateFormMeta,
  } = useFormEditor(formId, duplicateFromId)
  const { confirmNavigation, setDirty } = useUnsavedChanges()
  const [editorStep, setEditorStep] = useState<EditorStep>('build')
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [showIssuesPopover, setShowIssuesPopover] = useState(false)

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!e.dataTransfer.types.includes(DRAG_TYPE)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDropTargetIndex(index)
  }

  const handleDragLeave = () => {
    setDropTargetIndex(null)
  }

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDropTargetIndex(null)
    const type = e.dataTransfer.getData(DRAG_TYPE) as FormFieldBlockType | ''
    if (!type) return
    addFieldAt(type, index)
  }

  useEffect(() => {
    setDirty(isDirty)
    return () => setDirty(false)
  }, [isDirty, setDirty])

  useEffect(() => {
    const clearDropTarget = () => setDropTargetIndex(null)
    document.addEventListener('dragend', clearDropTarget)
    return () => document.removeEventListener('dragend', clearDropTarget)
  }, [])

  useEffect(() => {
    if (!showReviewModal) return
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowReviewModal(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showReviewModal])

  const handleBack = () => {
    if (!confirmNavigation()) {
      return
    }

    setDirty(false)
    onBack()
  }

  const handleSave = async () => {
    if (blockingIssueCount > 0) {
      setShowReviewModal(true)
      return
    }
    const savedId = await save()
    if (savedId) {
      onSaved(savedId)
    }
  }

  const blockingIssues = useMemo(
    () => validationIssues.filter((i) => i.severity === 'error'),
    [validationIssues],
  )
  const warningIssues = useMemo(
    () => validationIssues.filter((i) => i.severity === 'warning'),
    [validationIssues],
  )

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
      <header className="form-editor__header" role="banner">
        <div className="form-editor__header-main">
          <button type="button" className="app-button--ghost form-editor__back" onClick={handleBack} aria-label="Back to forms list">
            Back to forms
          </button>
          <span className="form-editor__header-divider" aria-hidden="true" />
          <div className="form-editor__meta">
            <span className="app-pill">
              {form?.id ? 'Existing form' : isDuplicateDraft ? 'Duplicated draft' : 'Draft form'}
            </span>
            <span className={`app-pill ${isDirty ? 'form-editor__status-pill--warning' : 'form-editor__status-pill--success'}`}>
              {isDirty ? 'Unsaved changes' : 'Saved'}
            </span>
          </div>
          <div className="form-editor__title-row">
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
          <div
            className="form-editor__issue-summary-wrap"
            onMouseEnter={() => (blockingIssueCount > 0 || warningCount > 0) && setShowIssuesPopover(true)}
            onMouseLeave={() => setShowIssuesPopover(false)}
          >
            <div className="form-editor__issue-summary" aria-live="polite">
              <span className={`app-pill ${blockingIssueCount > 0 ? 'form-editor__status-pill--danger' : ''}`}>
                {blockingIssueCount} errors
              </span>
              <span className="app-pill">{warningCount} warnings</span>
            </div>
            {showIssuesPopover && (blockingIssueCount > 0 || warningCount > 0) && (
              <div className="form-editor__issues-popover" role="tooltip">
                {blockingIssues.length > 0 ? (
                  <div className="form-editor__issues-popover-section">
                    <strong className="form-editor__issues-popover-title form-editor__issues-popover-title--error">
                      Errors ({blockingIssues.length})
                    </strong>
                    <ul className="form-editor__issues-popover-list">
                      {blockingIssues.map((issue, i) => (
                        <li key={`e-${i}`}>
                          <strong>{issue.title}:</strong> {issue.detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {warningIssues.length > 0 ? (
                  <div className="form-editor__issues-popover-section">
                    <strong className="form-editor__issues-popover-title form-editor__issues-popover-title--warning">
                      Warnings ({warningIssues.length})
                    </strong>
                    <ul className="form-editor__issues-popover-list">
                      {warningIssues.map((issue, i) => (
                        <li key={`w-${i}`}>
                          <strong>{issue.title}:</strong> {issue.detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </div>
          <button
            type="button"
            className="app-button form-editor__save"
            onClick={handleSave}
            disabled={saving}
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

      <div className="form-editor__tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={editorStep === 'build'}
          className={`form-editor__tab ${editorStep === 'build' ? 'form-editor__tab--active' : ''}`}
          onClick={() => setEditorStep('build')}
        >
          Build form
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={editorStep === 'postSubmission'}
          className={`form-editor__tab ${editorStep === 'postSubmission' ? 'form-editor__tab--active' : ''}`}
          onClick={() => setEditorStep('postSubmission')}
        >
          Post-submission
        </button>
      </div>

      {showReviewModal ? (
        <div
          className="form-editor__modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          onClick={() => setShowReviewModal(false)}
        >
          <div
            className="form-editor__modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="review-modal-title" className="form-editor__modal-title">
              Review before saving
            </h2>
            <p className="form-editor__modal-copy">
              Fix the following to save your form:
            </p>
            {blockingIssues.length > 0 ? (
              <ul className="form-editor__modal-list form-editor__modal-list--error">
                {blockingIssues.map((issue, index) => (
                  <li key={`${issue.title}-${index}`}>
                    <strong>{issue.title}:</strong> {issue.detail}
                  </li>
                ))}
              </ul>
            ) : null}
            {warningIssues.length > 0 ? (
              <>
                <p className="form-editor__modal-sub">Warnings (optional):</p>
                <ul className="form-editor__modal-list form-editor__modal-list--warning">
                  {warningIssues.map((issue, index) => (
                    <li key={`w-${issue.title}-${index}`}>
                      <strong>{issue.title}:</strong> {issue.detail}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <div className="form-editor__modal-actions">
              <button
                type="button"
                className="app-button"
                onClick={() => setShowReviewModal(false)}
              >
                Back to form
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editorStep === 'postSubmission' ? (
        <div className="form-editor__body form-editor__body--full">
          {form ? (
            <PostSubmissionPanel form={form} onUpdate={updateFormMeta} />
          ) : null}
        </div>
      ) : (
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
              <div
                className={`form-editor__drop-zone ${dropTargetIndex === 0 ? 'form-editor__drop-zone--active' : ''}`}
                onDragOver={(e) => handleDragOver(e, 0)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, 0)}
              >
                <div className="form-editor__empty">
                  <h3>Start building your form</h3>
                  <p>Add inputs, messages, and page breaks — or drag a field from below.</p>
                  <button type="button" className="app-button" onClick={() => addField('text')}>
                    Add first field
                  </button>
                </div>
              </div>
            ) : (
              <>
                {fields.flatMap((block, i) => [
                  <div
                    key={`drop-${i}`}
                    className={`form-editor__drop-slot ${dropTargetIndex === i ? 'form-editor__drop-slot--active' : ''}`}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, i)}
                  />,
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
                  />,
                ])}
                <div
                  className={`form-editor__drop-slot ${dropTargetIndex === fields.length ? 'form-editor__drop-slot--active' : ''}`}
                  onDragOver={(e) => handleDragOver(e, fields.length)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, fields.length)}
                />
              </>
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
          <FormPreview
            form={form}
            className="form-editor__preview-inner"
            selectedFieldId={selectedFieldId}
            onReorder={moveBlockToIndex}
            onAddFieldAt={addFieldAt}
            onRemoveField={removeBlock}
            onSelectField={setSelectedFieldId}
          />
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
      )}

      {editorStep === 'build' && (
        <div className="form-editor__palette-wrap">
          <FieldPaletteStrip />
        </div>
      )}
    </div>
  )
}
