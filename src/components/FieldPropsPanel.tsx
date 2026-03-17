import type { ValidationIssue } from '../lib/formValidation'
import type { FormFieldBlock, WidthOption, SelectRadioOption } from '../types/payload'
import { WIDTH_OPTIONS, FORM_FIELD_TYPES } from '../types/payload'
import { hasOptions } from '../lib/fieldBlocks'
import './FieldPropsPanel.css'

interface FieldPropsPanelProps {
  block: FormFieldBlock
  fieldId: string
  index: number
  issues: ValidationIssue[]
  onChange: (fieldId: string, next: FormFieldBlock) => void
  onRemove: (fieldId: string) => void
}

export default function FieldPropsPanel({
  block,
  fieldId,
  index,
  issues,
  onChange,
  onRemove,
}: FieldPropsPanelProps) {
  const update = (patch: Partial<FormFieldBlock>) => {
    onChange(fieldId, { ...block, ...patch } as FormFieldBlock)
  }

  const isOptionField = hasOptions(block)
  const options = (isOptionField ? (block as FormFieldBlock & { options: SelectRadioOption[] }).options : []) ?? []

  const setOptions = (next: SelectRadioOption[]) => {
    if (isOptionField) update({ options: next })
  }

  const addOption = () => setOptions([...options, { label: '', value: '' }])
  const changeOption = (i: number, field: 'label' | 'value', val: string) => {
    const next = options.slice()
    next[i] = { ...next[i], [field]: val }
    if (field === 'label' && !next[i].value) next[i].value = val.toLowerCase().replace(/\s+/g, '_')
    setOptions(next)
  }
  const removeOption = (i: number) => setOptions(options.filter((_, j) => j !== i))

  const typeLabel = FORM_FIELD_TYPES.find((t) => t.value === block.blockType)?.label ?? block.blockType
  const fieldPrefix = `field-props-${fieldId || index}`

  const getInputId = (suffix: string) => `${fieldPrefix}-${suffix}`

  if (block.blockType === 'pageBreak') {
    return (
      <div className="field-props">
        <div className="field-props__header">
        <div className="field-props__header-copy">
            <span className="field-props__type">{typeLabel}</span>
            <p className="field-props__subtle">Block {index + 1}</p>
          </div>
        <button type="button" className="app-button--ghost field-props__remove" onClick={() => onRemove(fieldId)}>
            Remove
          </button>
        </div>

        <div className="app-banner field-props__callout">
          Splits the live preview into pages. This block stays in the builder only and is not sent to Payload.
        </div>
      </div>
    )
  }

  return (
    <div className="field-props">
      <div className="field-props__header">
        <div className="field-props__header-copy">
          <span className="field-props__type">{typeLabel}</span>
          <p className="field-props__subtle">Block {index + 1}</p>
        </div>
        <button type="button" className="app-button--ghost field-props__remove" onClick={() => onRemove(fieldId)}>
          Remove field
        </button>
      </div>

      {issues.length > 0 ? (
        <div className="app-banner--warning field-props__callout">
          <div>
            <strong>Needs attention</strong>
            <ul className="field-props__issues">
              {issues.map((issue, issueIndex) => (
                <li key={`${issue.title}-${issueIndex}`}>{issue.detail}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {block.blockType === 'message' && (
        <>
          <div className="field-props__group">
            <label className="field-props__label" htmlFor={getInputId('message')}>
              Message / section text
            </label>
            <textarea
              id={getInputId('message')}
              className="app-textarea field-props__input"
              rows={3}
              value={(block as { messageText?: string }).messageText ?? ''}
              onChange={(e) => update({ messageText: e.target.value } as Partial<FormFieldBlock>)}
              placeholder="Instructions or section heading text"
            />
          </div>
          <div className="field-props__group field-props__group--row">
            <label className="field-props__checkbox-label">
              <input
                id={getInputId('heading')}
                type="checkbox"
                checked={!!(block as { asHeading?: boolean }).asHeading}
                onChange={(e) => update({ asHeading: e.target.checked } as Partial<FormFieldBlock>)}
              />
              Render as section heading
            </label>
          </div>
        </>
      )}

      {'description' in block && (
        <div className="field-props__group">
          <label className="field-props__label" htmlFor={getInputId('description')}>
            Help text / description
          </label>
          <input
            id={getInputId('description')}
            type="text"
            className="app-input field-props__input"
            value={(block as { description?: string }).description ?? ''}
            onChange={(e) => update({ description: e.target.value } as Partial<FormFieldBlock>)}
            placeholder="Shown below the label"
          />
        </div>
      )}

      {'name' in block && (
        <div className="field-props__group">
          <label className="field-props__label" htmlFor={getInputId('name')}>
            Name (key)
          </label>
          <input
            id={getInputId('name')}
            type="text"
            className="app-input field-props__input"
            value={block.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="e.g. fullName"
            aria-describedby={getInputId('name-hint')}
          />
          <p id={getInputId('name-hint')} className="field-props__hint">
            Used in submission data and email templates. Prefer lowercase keys with underscores.
          </p>
        </div>
      )}

      {'label' in block && (
        <div className="field-props__group">
          <label className="field-props__label" htmlFor={getInputId('label')}>
            Label
          </label>
          <input
            id={getInputId('label')}
            type="text"
            className="app-input field-props__input"
            value={block.label}
            onChange={(e) => update({ label: e.target.value })}
            placeholder="Display label"
          />
        </div>
      )}

      {'required' in block && (
        <div className="field-props__group field-props__group--row">
          <label className="field-props__checkbox-label">
            <input
              type="checkbox"
              checked={!!block.required}
              onChange={(e) => update({ required: e.target.checked })}
            />
            Required
          </label>
        </div>
      )}

      {'width' in block && (
        <div className="field-props__group">
          <label className="field-props__label" htmlFor={getInputId('width')}>
            Width
          </label>
          <select
            id={getInputId('width')}
            className="app-select field-props__select"
            value={block.width ?? '100'}
            onChange={(e) => update({ width: e.target.value as WidthOption })}
          >
            {WIDTH_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {'defaultValue' in block && block.blockType !== 'checkbox' && block.blockType !== 'payment' && (
        <div className="field-props__group">
          <label className="field-props__label" htmlFor={getInputId('default')}>
            Default value
          </label>
          <input
            id={getInputId('default')}
            type={block.blockType === 'number' ? 'number' : 'text'}
            className="app-input field-props__input"
            value={String(block.defaultValue ?? '')}
            onChange={(e) =>
              update({
                defaultValue: block.blockType === 'number' ? Number(e.target.value) || undefined : e.target.value,
              })
            }
            placeholder="Optional"
          />
        </div>
      )}

      {'placeholder' in block && (
        <div className="field-props__group">
          <label className="field-props__label" htmlFor={getInputId('placeholder')}>
            Placeholder
          </label>
          <input
            id={getInputId('placeholder')}
            type="text"
            className="app-input field-props__input"
            value={block.placeholder ?? ''}
            onChange={(e) => update({ placeholder: e.target.value })}
            placeholder="Select…"
          />
        </div>
      )}

      {block.blockType === 'checkbox' && 'defaultValue' in block && (
        <div className="field-props__group field-props__group--row">
          <label className="field-props__checkbox-label">
            <input
              type="checkbox"
              checked={!!block.defaultValue}
              onChange={(e) => update({ defaultValue: e.target.checked })}
            />
            Checked by default
          </label>
        </div>
      )}

      {isOptionField && (
        <div className="field-props__group">
          <div className="field-props__options-header">
            <label className="field-props__label" htmlFor={getInputId('option-0-label')}>
              Options
            </label>
            <button type="button" className="app-button--ghost field-props__btn-sm" onClick={addOption}>
              Add option
            </button>
          </div>
          <div className="field-props__options-list">
            {options.map((opt, i) => (
              <div key={i} className="field-props__option-row">
                <input
                  id={getInputId(`option-${i}-label`)}
                  type="text"
                  className="app-input field-props__input field-props__option-label"
                  value={opt.label}
                  onChange={(e) => changeOption(i, 'label', e.target.value)}
                  placeholder="Label"
                />
                <input
                  id={getInputId(`option-${i}-value`)}
                  type="text"
                  className="app-input field-props__input field-props__option-value"
                  value={opt.value}
                  onChange={(e) => changeOption(i, 'value', e.target.value)}
                  placeholder="Value"
                />
                <button type="button" className="field-props__btn-remove-opt" onClick={() => removeOption(i)} aria-label={`Remove option ${i + 1}`}>
                  ×
                </button>
              </div>
            ))}
            {options.length === 0 && (
              <p className="field-props__hint">No options yet. Add options for select/radio.</p>
            )}
          </div>
        </div>
      )}

      {'blockName' in block && (
        <div className="field-props__group">
          <label className="field-props__label" htmlFor={getInputId('block-name')}>
            Block name (optional)
          </label>
          <input
            id={getInputId('block-name')}
            type="text"
            className="app-input field-props__input"
            value={block.blockName ?? ''}
            onChange={(e) => update({ blockName: e.target.value })}
            placeholder="For admin display"
          />
        </div>
      )}
    </div>
  )
}
