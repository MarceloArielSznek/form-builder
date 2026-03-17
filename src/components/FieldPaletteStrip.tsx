import { useState, useMemo } from 'react'
import { FORM_FIELD_TYPES } from '../types/payload'
import type { FormFieldBlockType } from '../types/payload'
import './FieldPaletteStrip.css'

const DRAG_TYPE = 'application/x-form-field-type'

function FieldCard({
  type,
  label,
  onDragStart,
  onDragEnd,
}: {
  type: FormFieldBlockType
  label: string
  onDragStart: (e: React.DragEvent<HTMLButtonElement>, t: FormFieldBlockType) => void
  onDragEnd: (e: React.DragEvent<HTMLButtonElement>) => void
}) {
  return (
    <button
      type="button"
      className="field-palette-strip__card"
      draggable
      onDragStart={(e) => onDragStart(e, type)}
      onDragEnd={onDragEnd}
      aria-label={`Add ${label} field`}
    >
      <div className="field-palette-strip__card-visual" aria-hidden="true">
        <span className={`field-palette-strip__card-icon field-palette-strip__card-icon--${type}`}>
          {type === 'text' && 'Aa'}
          {type === 'textarea' && '¶'}
          {type === 'email' && '@'}
          {type === 'number' && '#'}
          {type === 'checkbox' && '☑'}
          {type === 'select' && '▾'}
          {type === 'radio' && '○'}
          {type === 'date' && '📅'}
          {type === 'country' && '🌐'}
          {type === 'state' && '◈'}
          {type === 'message' && '§'}
          {type === 'payment' && '$'}
          {type === 'projectMedia' && '🖼'}
          {type === 'pageBreak' && '—'}
        </span>
      </div>
      <span className="field-palette-strip__card-label">{label}</span>
    </button>
  )
}

export default function FieldPaletteStrip() {
  const [search, setSearch] = useState('')

  const filteredTypes = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return FORM_FIELD_TYPES
    return FORM_FIELD_TYPES.filter((t) => t.label.toLowerCase().includes(q))
  }, [search])

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, type: FormFieldBlockType) => {
    e.dataTransfer.setData(DRAG_TYPE, type)
    e.dataTransfer.effectAllowed = 'copy'
    e.currentTarget.setAttribute('data-dragging', 'true')
  }

  const handleDragEnd = (e: React.DragEvent<HTMLButtonElement>) => {
    e.currentTarget.removeAttribute('data-dragging')
  }

  return (
    <section className="field-palette-strip" aria-label="Add field">
      <div className="field-palette-strip__head">
        <h3 className="field-palette-strip__title">Add Field</h3>
        <label className="field-palette-strip__search">
          <span className="sr-only">Search for a block</span>
          <input
            type="search"
            className="field-palette-strip__search-input"
            placeholder="Search for a block"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search for a block"
          />
          <span className="field-palette-strip__search-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </span>
        </label>
      </div>
      <div className="field-palette-strip__grid">
        {filteredTypes.length === 0 ? (
          <p className="field-palette-strip__empty">No blocks match your search.</p>
        ) : (
          filteredTypes.map(({ value, label }) => (
            <FieldCard
              key={value}
              type={value}
              label={label}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))
        )}
      </div>
    </section>
  )
}

export { DRAG_TYPE }
