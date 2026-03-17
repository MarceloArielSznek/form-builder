import type { FormFieldBlock, FormFieldBlockType, SelectRadioOption } from '../types/payload'

function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return Math.random().toString(36).slice(2, 11)
}

export function createEmptyBlock(type: FormFieldBlockType): FormFieldBlock {
  const id = newId()
  const blockName = ''
  switch (type) {
    case 'text':
      return { id, blockType: 'text', blockName, name: '', label: '', required: false, width: '100' }
    case 'textarea':
      return { id, blockType: 'textarea', blockName, name: '', label: '', required: false, width: '100' }
    case 'select':
      return { id, blockType: 'select', blockName, name: '', label: '', required: false, width: '100', options: [] }
    case 'radio':
      return { id, blockType: 'radio', blockName, name: '', label: '', required: false, width: '100', options: [] }
    case 'email':
      return { id, blockType: 'email', blockName, name: '', label: '', required: false, width: '100' }
    case 'state':
      return { id, blockType: 'state', blockName, name: '', label: '', required: false, width: '100' }
    case 'country':
      return { id, blockType: 'country', blockName, name: '', label: '', required: false, width: '100' }
    case 'checkbox':
      return { id, blockType: 'checkbox', blockName, name: '', label: '', required: false, width: '100', defaultValue: false }
    case 'number':
      return { id, blockType: 'number', blockName, name: '', label: '', required: false, width: '100' }
    case 'date':
      return { id, blockType: 'date', blockName, name: '', label: '', required: false, width: '100' }
    case 'message':
      return { id, blockType: 'message', blockName, message: undefined }
    case 'payment':
      return { id, blockType: 'payment', blockName, name: '', label: '', required: false, width: '100', basePrice: 0, priceConditions: [] }
    case 'pageBreak':
      return { id, blockType: 'pageBreak', blockName }
    default:
      return { id, blockType: 'text', blockName, name: '', label: '' }
  }
}

/** Fields to send to Payload (excludes builder-only blocks like pageBreak). */
export function fieldsForPayload(fields: FormFieldBlock[]): FormFieldBlock[] {
  return fields.filter((b) => b.blockType !== 'pageBreak')
}

export function ensureBlockId<T extends FormFieldBlock>(block: T): T {
  if (block.id) {
    return block
  }

  return { ...block, id: newId() }
}

export function ensureBuilderFields(fields: FormFieldBlock[]): FormFieldBlock[] {
  return fields.map((field) => ensureBlockId(field))
}

export function mergeSavedFields(savedFields: FormFieldBlock[], currentFields: FormFieldBlock[]): FormFieldBlock[] {
  const nextSavedFields = savedFields.map((field) => ensureBlockId(field))
  let savedIndex = 0

  return currentFields.map((field) => {
    if (field.blockType === 'pageBreak') {
      return ensureBlockId(field)
    }

    const savedField = nextSavedFields[savedIndex]
    savedIndex += 1

    if (!savedField) {
      return ensureBlockId(field)
    }

    if (field.blockType === 'message' && savedField.blockType === 'message') {
      return {
        ...savedField,
        id: field.id ?? savedField.id,
        messageText: field.messageText,
        asHeading: field.asHeading,
      }
    }

    return {
      ...savedField,
      id: field.id ?? savedField.id,
    }
  })
}

export function getBlockLabel(block: FormFieldBlock): string {
  if (block.blockType === 'pageBreak') return 'Page break'
  if (block.blockName?.trim()) return block.blockName
  if ('label' in block && block.label) return block.label
  if ('name' in block && block.name) return block.name
  return block.blockType
}

export function hasOptions(block: FormFieldBlock): block is FormFieldBlock & { options: SelectRadioOption[] } {
  return 'options' in block && Array.isArray(block.options)
}
