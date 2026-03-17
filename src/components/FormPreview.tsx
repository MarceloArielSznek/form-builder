import { memo, useEffect, useMemo, useState } from 'react'
import type { Form, FormFieldBlock } from '../types/payload'
import { hasOptions } from '../lib/fieldBlocks'
import './FormPreview.css'

interface FormPreviewProps {
  form: Form | null
  className?: string
  selectedFieldId?: string | null
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
    const text = block.messageText ?? 'Message or section text'
    const asHeading = block.asHeading
    return (
      <div className={`preview-field ${widthClass} preview-field--message`}>
        {asHeading ? (
          <h3 className="preview-message-heading">{text || 'Section heading'}</h3>
        ) : (
          <p className="preview-message-text">{text}</p>
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
            {options.map((o) => (
              <option key={o.value || o.label} value={o.value}>
                {o.label || o.value}
              </option>
            ))}
          </select>
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
    default:
      return null
  }
})

function FormPreview({ form, className = '', selectedFieldId }: FormPreviewProps) {
  const fields = Array.isArray(form?.fields) ? form.fields : []
  const pages = useMemo(() => splitByPageBreak(fields), [fields])
  const [pageIndex, setPageIndex] = useState(0)
  const totalPages = Math.max(1, pages.length)
  const currentPage = Math.min(pageIndex, totalPages - 1)
  const pageFields = pages[currentPage] ?? []

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
        <div className="form-preview__body">
          {pageFields.length === 0 ? (
            <p className="form-preview__empty">No fields on this page. Add fields or remove the page break.</p>
          ) : (
            <div className="form-preview__grid">
              {pageFields.map((block, i) => (
                <PreviewField key={block.id ?? i} block={block} />
              ))}
            </div>
          )}
        </div>
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
