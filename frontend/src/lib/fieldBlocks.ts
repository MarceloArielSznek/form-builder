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
      return { id, blockType: 'message', blockName, messageText: '' }
    case 'payment':
      return { id, blockType: 'payment', blockName, name: '', label: '', required: false, width: '100', basePrice: 0, priceConditions: [] }
    case 'projectMedia':
      return { id, blockType: 'projectMedia', blockName, name: '', label: '', required: false, width: '100' }
    case 'pageBreak':
      return { id, blockType: 'pageBreak', blockName }
    default:
      return { id, blockType: 'text', blockName, name: '', label: '' }
  }
}

/** Block types that Payload accepts. Others are builder-only or legacy. */
const PAYLOAD_BLOCK_TYPES = new Set([
  'text', 'textarea', 'email', 'number', 'checkbox', 'select', 'radio', 'date', 'message', 'projectMedia',
])

/** Fields to send to Payload (only block types that Payload supports). Message blocks send content in both messageText and message so Payload receives the format (e.g. markdown / H2). */
export function fieldsForPayload(fields: FormFieldBlock[]): FormFieldBlock[] {
  return fields
    .filter((b) => PAYLOAD_BLOCK_TYPES.has(b.blockType))
    .map((block) => {
      if (block.blockType !== 'message') return block
      const text = (block as { messageText?: string }).messageText ?? ''
      return { ...block, message: text } as FormFieldBlock
    })
}

export function ensureBlockId<T extends FormFieldBlock>(block: T): T {
  if (block.id) {
    return block
  }

  return { ...block, id: newId() }
}

/** Collect plain text from a node's children (recursive). */
function textFromChildren(children: unknown[]): string {
  let out = ''
  for (const node of children) {
    if (node && typeof node === 'object') {
      const n = node as Record<string, unknown>
      if (typeof n.text === 'string') out += n.text
      if (Array.isArray(n.children)) out += textFromChildren(n.children)
    }
  }
  return out
}

/** Extract plain text from Payload rich text (Lexical root.children or Slate-like array). */
function extractTextFromRichText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value !== 'object') return ''

  if (Array.isArray(value)) {
    return value.map(extractTextFromRichText).join('')
  }

  const obj = value as Record<string, unknown>
  if (typeof obj.text === 'string') return obj.text

  const root = obj.root as Record<string, unknown> | undefined
  const children = (root?.children ?? obj.children) as unknown[] | undefined
  if (!Array.isArray(children)) return ''

  const parts: string[] = []
  for (const node of children) {
    if (node && typeof node === 'object') {
      const n = node as Record<string, unknown>
      if (typeof n.text === 'string') parts.push(n.text)
      if (Array.isArray(n.children)) parts.push(extractTextFromRichText(n.children))
    }
  }
  return parts.join('').trim()
}

const LEXICAL_HEADING_TAG_TO_MD: Record<string, string> = {
  h1: '# ',
  h2: '## ',
  h3: '### ',
  h4: '#### ',
  h5: '##### ',
  h6: '###### ',
}

/** Convert Payload Lexical rich text to Markdown. Exported for form-level confirmation and email bodies. */
export function richTextToMarkdown(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value !== 'object') return ''

  const obj = value as Record<string, unknown>
  const root = obj.root as Record<string, unknown> | undefined
  const children = (root?.children ?? obj.children) as unknown[] | undefined
  if (!Array.isArray(children)) return extractTextFromRichText(value)

  const lines: string[] = []
  for (const node of children) {
    if (!node || typeof node !== 'object') continue
    const n = node as Record<string, unknown>
    const type = String(n.type ?? '').toLowerCase()
    const tag = String(n.tag ?? '').toLowerCase()
    const level = n.level as number | undefined
    let prefix = LEXICAL_HEADING_TAG_TO_MD[tag]
    if (!prefix && type === 'heading' && typeof level === 'number' && level >= 1 && level <= 6) {
      prefix = '#'.repeat(level) + ' '
    }
    const text = Array.isArray(n.children) ? textFromChildren(n.children).trim() : ''
    if (prefix) {
      lines.push((lines.length ? '\n\n' : '') + prefix + text)
    } else if (text) {
      lines.push((lines.length ? '\n\n' : '') + text)
    }
  }
  return lines.join('').trim()
}

/** Normalize message block so UI has messageText. Payload may send content as string or Lexical object in `message`. */
function normalizeMessageBlock(block: FormFieldBlock): FormFieldBlock {
  if (block.blockType !== 'message') return block
  const b = block as FormFieldBlock & { message?: unknown; messageText?: string }
  let text = b.messageText ?? ''
  if (b.message !== undefined && b.message !== null) {
    text = typeof b.message === 'string' ? b.message : (richTextToMarkdown(b.message) || text)
  }
  return { ...block, messageText: text } as FormFieldBlock
}

export function ensureBuilderFields(fields: FormFieldBlock[]): FormFieldBlock[] {
  return fields.map((field) => normalizeMessageBlock(ensureBlockId(field)))
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
  if (block.blockType === 'projectMedia') return (block as { label?: string }).label || 'Project Media'
  if (block.blockName?.trim()) return block.blockName
  if ('label' in block && block.label) return block.label
  if ('name' in block && block.name) return block.name
  return block.blockType
}

export function hasOptions(block: FormFieldBlock): block is FormFieldBlock & { options: SelectRadioOption[] } {
  return 'options' in block && Array.isArray(block.options)
}
