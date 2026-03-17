/**
 * Payload Form Builder plugin: form document and field block types.
 * Matches the structure returned by /api/forms and used for create/update.
 */

export type FormFieldBlockType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'email'
  | 'state'
  | 'country'
  | 'checkbox'
  | 'number'
  | 'date'
  | 'message'
  | 'payment'
  | 'projectMedia'
  | 'pageBreak'  // builder-only: splits preview into pages; not sent to Payload

export type WidthOption = '25' | '50' | '75' | '100'

export interface SelectRadioOption {
  label: string
  value: string
}

/** Base shape shared by all form field blocks in the API */
export interface FormFieldBlockBase {
  id?: string
  blockType: FormFieldBlockType
  blockName?: string
}

export interface TextBlock extends FormFieldBlockBase {
  blockType: 'text'
  name: string
  label: string
  defaultValue?: string
  width?: WidthOption
  required?: boolean
  description?: string
}

export interface TextareaBlock extends FormFieldBlockBase {
  blockType: 'textarea'
  name: string
  label: string
  defaultValue?: string
  width?: WidthOption
  required?: boolean
  description?: string
}

export interface SelectBlock extends FormFieldBlockBase {
  blockType: 'select'
  name: string
  label: string
  defaultValue?: string
  placeholder?: string
  width?: WidthOption
  required?: boolean
  options?: SelectRadioOption[]
  description?: string
}

export interface RadioBlock extends FormFieldBlockBase {
  blockType: 'radio'
  name: string
  label: string
  defaultValue?: string
  width?: WidthOption
  required?: boolean
  options?: SelectRadioOption[]
}

export interface EmailBlock extends FormFieldBlockBase {
  blockType: 'email'
  name: string
  label: string
  defaultValue?: string
  width?: WidthOption
  required?: boolean
  description?: string
}

export interface StateBlock extends FormFieldBlockBase {
  blockType: 'state'
  name: string
  label: string
  defaultValue?: string
  width?: WidthOption
  required?: boolean
}

export interface CountryBlock extends FormFieldBlockBase {
  blockType: 'country'
  name: string
  label: string
  defaultValue?: string
  width?: WidthOption
  required?: boolean
}

export interface CheckboxBlock extends FormFieldBlockBase {
  blockType: 'checkbox'
  name: string
  label: string
  defaultValue?: boolean
  width?: WidthOption
  required?: boolean
}

export interface NumberBlock extends FormFieldBlockBase {
  blockType: 'number'
  name: string
  label: string
  defaultValue?: number
  width?: WidthOption
  required?: boolean
}

export interface DateBlock extends FormFieldBlockBase {
  blockType: 'date'
  name: string
  label: string
  defaultValue?: string
  width?: WidthOption
  required?: boolean
}

export interface MessageBlock extends FormFieldBlockBase {
  blockType: 'message'
  message?: unknown // RichText / Lexical structure; optional for simplicity
  /** Plain text for builder/preview when message richText is not set */
  messageText?: string
  /** If true, render as section heading in preview */
  asHeading?: boolean
}

/** Builder-only: splits preview into pages. Filter out before sending to Payload. */
export interface PageBreakBlock extends FormFieldBlockBase {
  blockType: 'pageBreak'
}

export interface PriceCondition {
  fieldToUse?: string
  condition?: string
  valueForOperator?: string
  operator?: string
  valueType?: string
  value?: string
}

export interface PaymentBlock extends FormFieldBlockBase {
  blockType: 'payment'
  name: string
  label: string
  defaultValue?: number
  width?: WidthOption
  required?: boolean
  basePrice?: number
  priceConditions?: PriceCondition[]
}

export interface ProjectMediaBlock extends FormFieldBlockBase {
  blockType: 'projectMedia'
  name: string
  label: string
  width?: WidthOption
  required?: boolean
}

export type FormFieldBlock =
  | TextBlock
  | TextareaBlock
  | SelectBlock
  | RadioBlock
  | EmailBlock
  | StateBlock
  | CountryBlock
  | CheckboxBlock
  | NumberBlock
  | DateBlock
  | MessageBlock
  | PaymentBlock
  | ProjectMediaBlock
  | PageBreakBlock

/** Single email sent after form submission (Payload form emails array). */
export interface FormEmail {
  id?: string
  emailTo: string
  emailFrom: string
  subject: string
  message?: unknown
  messageText?: string
  /** 'html' = body is HTML with {{fieldName}} placeholders; 'markdown' = Markdown (default). */
  messageFormat?: 'markdown' | 'html'
  cc?: string
  bcc?: string
  replyTo?: string
}

/** Redirect config after submission. */
export interface FormRedirect {
  url?: string | null
}

export interface Form {
  id: string
  title?: string
  fields?: FormFieldBlock[]
  submitButtonLabel?: string
  confirmationType?: 'message' | 'redirect'
  confirmationMessage?: unknown
  confirmationMessageText?: string
  redirect?: FormRedirect | null
  emails?: FormEmail[]
  formCategory?: string
  organization?: number
  branches?: number[]
  createdAt?: string
  updatedAt?: string
}

/** Field types offered in the UI — only those supported by Payload. */
export const FORM_FIELD_TYPES: { value: FormFieldBlockType; label: string }[] = [
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'email', label: 'Email' },
  { value: 'message', label: 'Message' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select' },
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'radio', label: 'Radio' },
  { value: 'date', label: 'Date' },
  { value: 'projectMedia', label: 'Project Media' },
]

export const WIDTH_OPTIONS: { value: WidthOption; label: string }[] = [
  { value: '25', label: '25%' },
  { value: '50', label: '50%' },
  { value: '75', label: '75%' },
  { value: '100', label: '100%' },
]
