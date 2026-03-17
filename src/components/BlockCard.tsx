import { memo } from 'react'
import type { FormFieldBlock } from '../types/payload'
import { getBlockLabel } from '../lib/fieldBlocks'
import { FORM_FIELD_TYPES } from '../types/payload'
import './BlockCard.css'

interface BlockCardProps {
  block: FormFieldBlock
  fieldId: string
  index: number
  totalBlocks: number
  isSelected: boolean
  onSelect: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}

function BlockCard({
  block,
  fieldId,
  index,
  totalBlocks,
  isSelected,
  onSelect,
  onMoveUp,
  onMoveDown,
}: BlockCardProps) {
  const typeLabel = FORM_FIELD_TYPES.find((t) => t.value === block.blockType)?.label ?? block.blockType
  const label = getBlockLabel(block)

  return (
    <div className={`block-card ${block.blockType === 'pageBreak' ? 'block-card--page-break' : ''} ${isSelected ? 'block-card--selected' : ''}`}>
      <div className="block-card__order">
        <button type="button" className="block-card__move" onClick={onMoveUp} aria-label="Move up" disabled={index === 0}>
          ↑
        </button>
        <button type="button" className="block-card__move" onClick={onMoveDown} aria-label="Move down" disabled={index >= totalBlocks - 1}>
          ↓
        </button>
      </div>

      <button
        id={`builder-field-${fieldId}`}
        type="button"
        className="block-card__main"
        onClick={onSelect}
        aria-pressed={isSelected}
      >
        <div className="block-card__content">
          {block.blockType === 'pageBreak' ? <span className="block-card__divider" /> : null}
          <span className="block-card__type">{typeLabel}</span>
          {block.blockType !== 'pageBreak' ? <span className="block-card__label">{label || 'Untitled field'}</span> : null}
          {'name' in block && block.name && <code className="block-card__name">{block.name}</code>}
        </div>
      </button>
    </div>
  )
}

export default memo(BlockCard)
