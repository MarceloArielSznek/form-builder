import type { FormFieldBlockType } from '../types/payload'

export interface EmailTemplateField {
  name: string
  label?: string
  blockType?: FormFieldBlockType
  required?: boolean
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function normalizedLabel(field: EmailTemplateField): string {
  const label = (field.label ?? '').trim()
  if (label) return label
  return field.name
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function placeholder(name: string): string {
  return `{{${name}}}`
}

function isLongTextField(type?: FormFieldBlockType): boolean {
  return type === 'textarea' || type === 'message'
}

function isMediaField(field: EmailTemplateField): boolean {
  const key = `${field.name} ${field.label ?? ''}`.toLowerCase()
  return (
    field.blockType === 'projectMedia' ||
    key.includes('file') ||
    key.includes('upload') ||
    key.includes('image') ||
    key.includes('photo') ||
    key.includes('gallery') ||
    key.includes('media') ||
    key.includes('attachment') ||
    key.includes('document')
  )
}

function pickIcon(field: EmailTemplateField): string {
  const key = `${field.name} ${field.label ?? ''}`.toLowerCase()
  if (
    key.includes('file') ||
    key.includes('upload') ||
    key.includes('image') ||
    key.includes('photo') ||
    key.includes('gallery') ||
    key.includes('media') ||
    key.includes('attachment') ||
    key.includes('document')
  ) return '🖼️'
  if (key.includes('name')) return '👤'
  if (key.includes('phone') || key.includes('mobile') || key.includes('tel')) return '📞'
  if (key.includes('email')) return '📧'
  if (key.includes('address') || key.includes('city') || key.includes('state') || key.includes('zip')) return '📍'
  if (key.includes('source')) return '📋'
  if (key.includes('date') || key.includes('time')) return '📅'
  if (key.includes('type') || key.includes('service')) return '🛠️'
  if (key.includes('payment') || key.includes('invoice') || key.includes('amount') || key.includes('price')) return '💳'
  if (key.includes('job') || key.includes('lead') || key.includes('opportunity')) return '🔧'
  return '•'
}

export function buildStandardEmailHtml(formTitle: string, fields: EmailTemplateField[]): string {
  const title = formTitle.trim() || 'Form submission'
  const unique = fields.filter((f, i, arr) => arr.findIndex((x) => x.name === f.name) === i)
  const shortFields = unique.filter((f) => !isLongTextField(f.blockType))
  const longFields = unique.filter((f) => isLongTextField(f.blockType))

  const rows = shortFields
    .map((field) => {
      const label = normalizedLabel(field)
      const req = field.required ? ' *' : ''
      const icon = pickIcon(field)
      const value = placeholder(field.name)
      const renderedValue = isMediaField(field)
        ? `
            <div style="background:#fff8e8;border:1px solid #f3d8a5;border-radius:8px;padding:10px 12px;color:#7a4b00;font-size:13px;line-height:1.45;">
              <strong>Images coming soon.</strong> In the meantime, you can access the media in the job gallery.
              <div style="margin-top:6px;color:#8a6b35;font-family:'Consolas','Menlo','Monaco',monospace;">Ref: ${value}</div>
            </div>`
        : value
      return `
      <tr>
        <td style="padding:0 0 10px 0;">
          <div style="background:#ffffff;border:1px solid #d6dde8;border-radius:8px;padding:10px 12px;">
            <div style="font-size:14px;font-weight:700;color:#1f2937;line-height:1.35;margin-bottom:6px;">
              <span style="margin-right:6px;">${icon}</span>${escapeHtml(label)}${req}
            </div>
            <div style="font-size:14px;line-height:1.5;color:#334155;">${renderedValue}</div>
          </div>
        </td>
      </tr>`
    })
    .join('')

  const longSections = longFields
    .map((field) => {
      const label = normalizedLabel(field)
      return `
      <tr>
        <td style="padding:4px 0 8px 0;font-size:16px;font-weight:700;color:#1f2937;">${escapeHtml(label)}</td>
      </tr>
      <tr>
        <td style="padding:0 0 16px 0;">
          <div style="background:#ffffff;border:1px solid #d6dde8;border-radius:8px;padding:12px 14px;line-height:1.6;color:#1f2937;white-space:pre-wrap;">${placeholder(field.name)}</div>
        </td>
      </tr>`
    })
    .join('')

  const detailsSection = rows
    ? `
      <tr>
        <td style="padding:0 0 10px 0;font-size:17px;font-weight:700;color:#1f2937;">Submission details</td>
      </tr>
      <tr>
        <td style="padding:0 0 16px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0;">
            ${rows}
          </table>
        </td>
      </tr>`
    : ''

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ebedf0;font-family:Arial,sans-serif;padding:18px 10px;">
  <tr>
    <td style="text-align:center;">
      <table width="760" cellpadding="0" cellspacing="0" border="0" style="width:760px;max-width:100%;display:inline-table;text-align:left;background-color:#f1f3f5;border-radius:10px;overflow:hidden;border:1px solid #cbd2da;">
        <tr>
          <td style="padding:26px 24px 14px 24px;font-size:42px;line-height:1.25;font-weight:800;color:#0b67e3;text-align:center;">
            ${escapeHtml(title)}
          </td>
        </tr>
        <tr>
          <td style="padding:0 24px 26px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:separate;border-spacing:0;background:#f8f9fb;border:1px solid #cfd7e2;border-radius:8px;">
              <tr>
                <td style="padding:20px 18px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                    <tr>
                      <td style="padding:0 0 10px 0;font-size:15px;line-height:1.55;color:#111827;">
                        A new form submission was received.
                      </td>
                    </tr>
                    ${detailsSection}
                    ${longSections}
                    <tr>
                      <td style="padding-top:8px;font-size:12px;color:#64748b;">
                        This email was generated by Form Builder.
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`.trim()
}
