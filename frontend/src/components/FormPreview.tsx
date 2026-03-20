import { memo, useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import type { Form, FormFieldBlock, FormFieldBlockType } from '../types/payload'
import { hasOptions } from '../lib/fieldBlocks'
import { DRAG_TYPE } from './FieldPaletteStrip'
import './FormPreview.css'

const DRAG_FIELD_ID = 'application/x-form-field-id'

interface FormPreviewProps {
  form: Form | null
  className?: string
  selectedFieldId?: string | null
  onReorder?: (fieldId: string, toIndex: number) => void
  onAddFieldAt?: (type: FormFieldBlockType, index: number) => void
  onRemoveField?: (fieldId: string) => void
  onSelectField?: (fieldId: string) => void
}

function splitByPageBreak(fields: FormFieldBlock[]): FormFieldBlock[][] {
  const pages: FormFieldBlock[][] = [[]]
  let current = pages[0]
  for (const block of fields) {
    if (block.blockType === 'pageBreak') {
      current = []
      pages.push(current)
    } else {
      current.push(block)
    }
  }

  return pages.length ? pages : [[]]
}

const PreviewField = memo(function PreviewField({ block }: { block: FormFieldBlock }) {
  const required = 'required' in block && block.required
  const width = 'width' in block ? block.width ?? '100' : '100'
  const widthClass = `preview-field--w${width}`
  const inputId = `preview-${block.id ?? block.blockType}`

  if (block.blockType === 'message') {
    const raw = block.messageText ?? ''
    const asHeading = block.asHeading
    const text = raw || 'Message or section text'
    return (
      <div className={`preview-field ${widthClass} preview-field--message`}>
        {asHeading ? (
          <>
            <h3 className="preview-message-heading">{raw.split('\n')[0] || 'Section heading'}</h3>
            {raw.includes('\n') && (
              <div className="preview-message-markdown">
                <ReactMarkdown>{raw.slice(raw.indexOf('\n') + 1).trim()}</ReactMarkdown>
              </div>
            )}
          </>
        ) : (
          <div className="preview-message-markdown">
            <ReactMarkdown>{text}</ReactMarkdown>
          </div>
        )}
      </div>
    )
  }

  if (block.blockType === 'pageBreak') return null

  const label = 'label' in block ? block.label : ''
  const name = 'name' in block ? block.name : ''
  const defaultValue = 'defaultValue' in block ? block.defaultValue : undefined
  const placeholder = 'placeholder' in block ? block.placeholder : undefined
  const description = 'description' in block ? (block as { description?: string }).description : undefined

  const labelEl = (
    <label className="preview-label" htmlFor={inputId}>
      {label}
      {required && <span className="preview-required"> *</span>}
    </label>
  )

  const descEl = description ? <p className="preview-description">{description}</p> : null

  switch (block.blockType) {
    case 'text':
      return (
        <div className={`preview-field ${widthClass}`}>
          {labelEl}
          {descEl}
          <input
            id={inputId}
            type="text"
            className="preview-input"
            defaultValue={defaultValue as string}
            placeholder={placeholder}
            readOnly
          />
        </div>
      )
    case 'textarea':
      return (
        <div className={`preview-field ${widthClass}`}>
          {labelEl}
          {descEl}
          <textarea
            id={inputId}
            className="preview-textarea"
            defaultValue={defaultValue as string}
            placeholder={placeholder}
            rows={3}
            readOnly
          />
        </div>
      )
    case 'email':
      return (
        <div className={`preview-field ${widthClass}`}>
          {labelEl}
          {descEl}
          <input
            id={inputId}
            type="email"
            className="preview-input"
            defaultValue={defaultValue as string}
            readOnly
          />
        </div>
      )
    case 'number':
      return (
        <div className={`preview-field ${widthClass}`}>
          {labelEl}
          {descEl}
          <input
            id={inputId}
            type="number"
            className="preview-input"
            defaultValue={defaultValue as number}
            readOnly
          />
        </div>
      )
    case 'date':
      return (
        <div className={`preview-field ${widthClass}`}>
          {labelEl}
          {descEl}
          <input id={inputId} type="date" className="preview-input" defaultValue={defaultValue as string} readOnly />
        </div>
      )
    case 'checkbox':
      return (
        <div className={`preview-field ${widthClass} preview-field--checkbox`}>
          <label className="preview-checkbox-label">
            <input type="checkbox" defaultChecked={defaultValue as boolean} readOnly className="preview-checkbox" />
            <span>{label}</span>
            {required && <span className="preview-required"> *</span>}
          </label>
          {descEl}
        </div>
      )
    case 'select': {
      const options = hasOptions(block) ? block.options : []
      return (
        <div className={`preview-field ${widthClass}`}>
          {labelEl}
          {descEl}
          <select id={inputId} className="preview-select" defaultValue={defaultValue as string} disabled>
            {placeholder && (
              <option value="">{placeholder}</option>
            )}
            {options.map((o, idx) => (
              <option key={`${o.value ?? o.label ?? 'option'}-${idx}`} value={o.value}>
                {o.label || o.value}
              </option>
            ))}
          </select>
          <div className="preview-select-options">
            {options.length > 0 ? (
              <ul className="preview-select-options__list">
                {options.map((o, idx) => (
                  <li key={`${o.value || o.label}-${idx}`} className="preview-select-options__item">
                    <span className="preview-select-options__label">{o.label || '(no label)'}</span>
                    <span className="preview-select-options__value">{o.value || '(no value)'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="preview-select-options__empty">No options configured yet.</p>
            )}
          </div>
        </div>
      )
    }
    case 'radio': {
      const options = hasOptions(block) ? block.options : []
      return (
        <fieldset className={`preview-field ${widthClass} preview-fieldset`}>
          <legend className="preview-label">
            {label}
            {required && <span className="preview-required"> *</span>}
          </legend>
          {descEl}
          <div className="preview-radio-group">
            {options.map((o) => (
              <label key={o.value || o.label} className="preview-radio-label">
                <input type="radio" name={name} value={o.value} defaultChecked={o.value === defaultValue} readOnly className="preview-radio" />
                {o.label || o.value}
              </label>
            ))}
          </div>
        </fieldset>
      )
    }
    case 'state':
    case 'country':
      return (
        <div className={`preview-field ${widthClass}`}>
          {labelEl}
          {descEl}
          <select id={inputId} className="preview-select" defaultValue={defaultValue as string} disabled>
            <option value="">—</option>
          </select>
        </div>
      )
    case 'payment':
      return (
        <div className={`preview-field ${widthClass}`}>
          {labelEl}
          {descEl}
          <div className="preview-payment">Payment field (configured in form)</div>
        </div>
      )
    case 'projectMedia':
      return (
        <div className={`preview-field ${widthClass}`}>
          {labelEl}
          {descEl}
          <div className="preview-payment">Project media (upload in form)</div>
        </div>
      )
    default:
      return null
  }
})

function getPageStartGlobalIndex(fields: FormFieldBlock[], pageIndex: number): number {
  if (pageIndex <= 0) return 0
  let count = 0
  for (let i = 0; i < fields.length; i++) {
    if (fields[i].blockType === 'pageBreak') {
      count++
      if (count >= pageIndex) return i + 1
    }
  }
  return fields.length
}

function FormPreview({
  form,
  className = '',
  selectedFieldId,
  onReorder,
  onAddFieldAt,
  onRemoveField,
  onSelectField,
}: FormPreviewProps) {
  const fields = Array.isArray(form?.fields) ? form.fields : []
  const pages = useMemo(() => splitByPageBreak(fields), [fields])
  const [pageIndex, setPageIndex] = useState(0)
  const [previewDropIndex, setPreviewDropIndex] = useState<number | null>(null)
  const [isBinActive, setIsBinActive] = useState(false)
  const totalPages = Math.max(1, pages.length)
  const currentPage = Math.min(pageIndex, totalPages - 1)
  const pageFields = pages[currentPage] ?? []

  const pageGlobalIndices = useMemo(
    () => pageFields.map((b) => fields.findIndex((f) => f.id === b.id)).filter((i) => i >= 0),
    [fields, pageFields],
  )

  const canDrop = Boolean(onReorder || onAddFieldAt)
  const canRemove = Boolean(onRemoveField)

  const handlePreviewDragOver = (e: React.DragEvent, globalIndex: number) => {
    if (!canDrop) return
    const isNewField = e.dataTransfer.types.includes(DRAG_TYPE)
    const isReorder = e.dataTransfer.types.includes(DRAG_FIELD_ID)
    if (isNewField || isReorder) {
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = isReorder ? 'move' : 'copy'
      setPreviewDropIndex(globalIndex)
    }
  }

  const handlePreviewDragLeave = () => setPreviewDropIndex(null)

  const handlePreviewDrop = (e: React.DragEvent, globalIndex: number) => {
    e.preventDefault()
    e.stopPropagation()
    setPreviewDropIndex(null)
    const fieldId = e.dataTransfer.getData(DRAG_FIELD_ID)
    const type = e.dataTransfer.getData(DRAG_TYPE) as FormFieldBlockType | ''
    if (fieldId && onReorder) {
      onReorder(fieldId, globalIndex)
      return
    }
    if (type && onAddFieldAt) {
      onAddFieldAt(type, globalIndex)
    }
  }

  const handleBinDragOver = (e: React.DragEvent) => {
    if (!canRemove) return
    if (!e.dataTransfer.types.includes(DRAG_FIELD_ID)) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setIsBinActive(true)
  }

  const handleBinDragLeave = () => {
    setIsBinActive(false)
  }

  const handleBinDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsBinActive(false)
    setPreviewDropIndex(null)
    if (!canRemove) return
    const fieldId = e.dataTransfer.getData(DRAG_FIELD_ID)
    if (fieldId) {
      onRemoveField?.(fieldId)
    }
  }

  const title = form?.title || 'Form preview'
  const selectedPage = useMemo(() => {
    if (!selectedFieldId) {
      return null
    }

    return pages.findIndex((page) => page.some((field) => field.id === selectedFieldId))
  }, [pages, selectedFieldId])

  useEffect(() => {
    setPageIndex((current) => Math.min(current, totalPages - 1))
  }, [totalPages])

  useEffect(() => {
    if (selectedPage != null && selectedPage >= 0) {
      setPageIndex(selectedPage)
    }
  }, [selectedPage])

  useEffect(() => {
    if (!canDrop && !canRemove) return
    const clear = () => {
      setPreviewDropIndex(null)
      setIsBinActive(false)
    }
    document.addEventListener('dragend', clear)
    return () => document.removeEventListener('dragend', clear)
  }, [canDrop, canRemove])

  return (
    <div className={`form-preview ${className}`}>
      <div className="form-preview__modal">
        <div className="form-preview__header">
          <div>
            <span className="form-preview__eyebrow">Customer-facing preview</span>
            <h2 className="form-preview__title">{title}</h2>
          </div>
          <span className="app-pill">Preview mode</span>
        </div>
        <div
          className="form-preview__body"
          onDragOver={canDrop ? (e) => {
            if (e.dataTransfer.types.includes(DRAG_TYPE) || e.dataTransfer.types.includes(DRAG_FIELD_ID)) {
              e.preventDefault()
              e.stopPropagation()
              e.dataTransfer.dropEffect = 'copy'
            }
          } : undefined}
          onDrop={canDrop ? (e) => {
            e.preventDefault()
            e.stopPropagation()
            setPreviewDropIndex(null)
            const fallbackIndex = pageFields.length > 0
              ? (pageGlobalIndices[pageFields.length - 1] ?? 0) + 1
              : getPageStartGlobalIndex(fields, currentPage)
            const fieldId = e.dataTransfer.getData(DRAG_FIELD_ID)
            const type = e.dataTransfer.getData(DRAG_TYPE) as FormFieldBlockType | ''
            if (fieldId && onReorder) onReorder(fieldId, fallbackIndex)
            else if (type && onAddFieldAt) onAddFieldAt(type, fallbackIndex)
          } : undefined}
        >
          {pageFields.length === 0 ? (
            canDrop ? (
              <div
                className={`form-preview__drop-zone ${previewDropIndex === getPageStartGlobalIndex(fields, currentPage) ? 'form-preview__drop-zone--active' : ''}`}
                onDragOver={(e) => handlePreviewDragOver(e, getPageStartGlobalIndex(fields, currentPage))}
                onDragLeave={handlePreviewDragLeave}
                onDrop={(e) => handlePreviewDrop(e, getPageStartGlobalIndex(fields, currentPage))}
              >
                <p className="form-preview__empty">No fields on this page. Drag a field here or add from the builder.</p>
              </div>
            ) : (
              <p className="form-preview__empty">No fields on this page. Add fields or remove the page break.</p>
            )
          ) : (
            <div className="form-preview__grid">
              {pageFields.flatMap((block, i) => {
                const globalIndex = pageGlobalIndices[i] ?? 0
                const dropSlotBefore = canDrop ? (
                  <div
                    key={`drop-${globalIndex}`}
                    className={`form-preview__drop-slot ${previewDropIndex === globalIndex ? 'form-preview__drop-slot--active' : ''}`}
                    onDragOver={(e) => handlePreviewDragOver(e, globalIndex)}
                    onDragLeave={handlePreviewDragLeave}
                    onDrop={(e) => handlePreviewDrop(e, globalIndex)}
                  />
                ) : null
                const width = 'width' in block ? block.width ?? '100' : '100'
                const insertAfterIndex = (pageGlobalIndices[i] ?? 0) + 1
                const fieldEl = (
                  <div
                    key={block.id ?? i}
                    className={`form-preview__field-wrap form-preview__field-wrap--w${width} ${onReorder ? 'form-preview__field-wrap--draggable' : ''} ${onSelectField && block.id ? 'form-preview__field-wrap--selectable' : ''} ${selectedFieldId && block.id === selectedFieldId ? 'form-preview__field-wrap--selected' : ''}`}
                    draggable={Boolean(onReorder)}
                    onClick={
                      block.id && onSelectField
                        ? () => {
                            onSelectField(block.id as string)
                          }
                        : undefined
                    }
                    onDragStart={(() => {
                      const fieldId = block.id
                      if (!onReorder || !fieldId) return undefined
                      return (e: React.DragEvent) => {
                        e.dataTransfer.setData(DRAG_FIELD_ID, fieldId)
                        e.dataTransfer.effectAllowed = 'move'
                        e.currentTarget.setAttribute('data-dragging', 'true')
                      }
                    })()}
                    onDragEnd={
                      onReorder
                        ? (e) => {
                            e.currentTarget.removeAttribute('data-dragging')
                          }
                        : undefined
                    }
                    onDragOver={canDrop ? (e) => handlePreviewDragOver(e, insertAfterIndex) : undefined}
                    onDrop={canDrop ? (e) => handlePreviewDrop(e, insertAfterIndex) : undefined}
                  >
                    <PreviewField block={block} />
                  </div>
                )
                return dropSlotBefore ? [dropSlotBefore, fieldEl] : [fieldEl]
              })}
              {canDrop && pageFields.length > 0 ? (
                <div
                  key="drop-end"
                  className={`form-preview__drop-slot ${previewDropIndex === (pageGlobalIndices[pageFields.length - 1] ?? 0) + 1 ? 'form-preview__drop-slot--active' : ''}`}
                  onDragOver={(e) => handlePreviewDragOver(e, (pageGlobalIndices[pageFields.length - 1] ?? 0) + 1)}
                  onDragLeave={handlePreviewDragLeave}
                  onDrop={(e) => handlePreviewDrop(e, (pageGlobalIndices[pageFields.length - 1] ?? 0) + 1)}
                />
              ) : null}
            </div>
          )}
        </div>
        {canRemove && (
          <div className="form-preview__trash-row">
            <div
              className={`form-preview__trash ${isBinActive ? 'form-preview__trash--active' : ''}`}
              onDragOver={handleBinDragOver}
              onDragLeave={handleBinDragLeave}
              onDrop={handleBinDrop}
            >
              Drag field here to remove
            </div>
          </div>
        )}
        {totalPages > 1 && (
          <div className="form-preview__pagination">
            <button
              type="button"
              className="form-preview__page-btn"
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              Previous
            </button>
            <span className="form-preview__page-info">
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              type="button"
              className="form-preview__page-btn"
              onClick={() => setPageIndex((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default memo(FormPreview)
