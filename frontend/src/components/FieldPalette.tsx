import { useState, useRef, useEffect, useId, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { FORM_FIELD_TYPES } from '../types/payload'
import type { FormFieldBlockType } from '../types/payload'
import './FieldPalette.css'

interface FieldPaletteProps {
  onSelect: (type: FormFieldBlockType) => void
  disabled?: boolean
}

export default function FieldPalette({ onSelect, disabled }: FieldPaletteProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('click', handle)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('click', handle)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    itemRefs.current[activeIndex]?.focus()
  }, [activeIndex, open])

  const openMenu = (index = 0) => {
    setActiveIndex(index)
    setOpen(true)
  }

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!open) {
      return
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setActiveIndex((current) => (current + 1) % FORM_FIELD_TYPES.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setActiveIndex((current) => (current - 1 + FORM_FIELD_TYPES.length) % FORM_FIELD_TYPES.length)
        break
      case 'Home':
        event.preventDefault()
        setActiveIndex(0)
        break
      case 'End':
        event.preventDefault()
        setActiveIndex(FORM_FIELD_TYPES.length - 1)
        break
      default:
        break
    }
  }

  return (
    <div className="field-palette" ref={ref} onKeyDown={handleMenuKeyDown}>
      <button
        type="button"
        className="field-palette__trigger"
        onClick={() => {
          if (open) {
            setOpen(false)
            return
          }

          openMenu(0)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openMenu(0)
          }

          if (event.key === 'ArrowUp') {
            event.preventDefault()
            openMenu(FORM_FIELD_TYPES.length - 1)
          }
        }}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
      >
        + Add field
      </button>
      {open && (
        <div id={menuId} className="field-palette__dropdown" role="menu" aria-label="Add field">
          {FORM_FIELD_TYPES.map((t, index) => (
            <button
              key={t.value}
              type="button"
              className="field-palette__item"
              ref={(element) => {
                itemRefs.current[index] = element
              }}
              role="menuitem"
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => {
                onSelect(t.value)
                setOpen(false)
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
