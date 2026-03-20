import { hasOptions } from './fieldBlocks'
import type { Form, FormFieldBlock } from '../types/payload'

export interface ValidationIssue {
  fieldId?: string
  severity: 'error' | 'warning'
  title: string
  detail: string
}

function isNamedField(block: FormFieldBlock): block is FormFieldBlock & { name: string } {
  return 'name' in block
}

function isLabeledField(block: FormFieldBlock): block is FormFieldBlock & { label: string } {
  return 'label' in block
}

function parseEmails(value: string): string[] {
  return value
    .split(/[,\s;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function isEmailLike(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function validateForm(form: Form | null): ValidationIssue[] {
  if (!form) {
    return []
  }

  const issues: ValidationIssue[] = []
  const nameCounts = new Map<string, number>()
  const fields = Array.isArray(form.fields) ? form.fields : []

  if (!form.title?.trim()) {
    issues.push({
      severity: 'warning',
      title: 'Add a form title',
      detail: 'A clear title makes the workspace easier to scan and manage.',
    })
  }

  if (typeof form.organization !== 'number' || Number.isNaN(form.organization)) {
    issues.push({
      severity: 'error',
      title: 'Organization is required',
      detail: 'Select an organization in Post-submission settings before saving.',
    })
  }

  for (const field of fields) {
    if (field.blockType === 'pageBreak') {
      continue
    }

    if (isNamedField(field)) {
      const name = field.name.trim()
      if (!name) {
        issues.push({
          fieldId: field.id,
          severity: 'error',
          title: 'Field name is required',
          detail: `Add a key for the ${field.blockType} field before saving.`,
        })
      } else {
        nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1)
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
          issues.push({
            fieldId: field.id,
            severity: 'warning',
            title: 'Use a predictable field key',
            detail: `"${name}" should start with a letter and use only letters, numbers, or underscores.`,
          })
        }
      }
    }

    if (isLabeledField(field) && !field.label.trim()) {
      issues.push({
        fieldId: field.id,
        severity: 'error',
        title: 'Field label is required',
        detail: `Add a visible label for the ${field.blockType} field.`,
      })
    }

    if (hasOptions(field)) {
      if (field.options.length === 0) {
        issues.push({
          fieldId: field.id,
          severity: 'error',
          title: 'Options are required',
          detail: `Add at least one option to the ${field.blockType} field.`,
        })
      }

      if (field.options.some((option) => !option.label.trim() || !option.value.trim())) {
        issues.push({
          fieldId: field.id,
          severity: 'error',
          title: 'Complete each option',
          detail: `Every ${field.blockType} option needs both a label and a value.`,
        })
      }
    }

    if (field.blockType === 'message' && !field.messageText?.trim()) {
      issues.push({
        fieldId: field.id,
        severity: 'warning',
        title: 'Message block has no text',
        detail: 'Add copy so the section communicates something meaningful in the preview.',
      })
    }
  }

  for (const [name, count] of nameCounts.entries()) {
    if (count > 1) {
      issues.push({
        severity: 'error',
        title: 'Duplicate field names',
        detail: `The key "${name}" is used more than once. Field names should be unique.`,
      })
    }
  }

  const confirmationType = form.confirmationType ?? 'message'
  const confirmationMessage = (form.confirmationMessageText ?? '').trim()
  const redirectUrl = form.redirect?.url?.trim() ?? ''

  if (confirmationType === 'redirect' && !redirectUrl) {
    issues.push({
      severity: 'error',
      title: 'Redirect URL is required',
      detail: 'Set a URL for redirect confirmation before saving.',
    })
  }

  if (confirmationType !== 'redirect' && !confirmationMessage) {
    issues.push({
      severity: 'warning',
      title: 'Confirmation message is empty',
      detail: 'Add a message users will see after submitting.',
    })
  }

  const emails = Array.isArray(form.emails) ? form.emails : []
  emails.forEach((email, index) => {
    const label = `Email ${index + 1}`
    const to = (email.emailTo ?? '').trim()
    const from = (email.emailFrom ?? '').trim()
    const subject = (email.subject ?? '').trim()
    const message = (email.messageText ?? (typeof email.message === 'string' ? email.message : '') ?? '').trim()

    if (!to) {
      issues.push({
        severity: 'error',
        title: `${label}: recipient is required`,
        detail: 'Fill "To" with at least one destination address.',
      })
    } else {
      const invalidTo = parseEmails(to).filter((addr) => !isEmailLike(addr))
      if (invalidTo.length > 0) {
        issues.push({
          severity: 'warning',
          title: `${label}: check recipient format`,
          detail: `Some "To" entries do not look like valid emails: ${invalidTo.join(', ')}.`,
        })
      }
    }

    if (from && !isEmailLike(from)) {
      issues.push({
        severity: 'warning',
        title: `${label}: check sender format`,
        detail: `"From" does not look like a valid email: ${from}.`,
      })
    }

    if (!subject) {
      issues.push({
        severity: 'error',
        title: `${label}: subject is required`,
        detail: 'Add an email subject before saving.',
      })
    }

    if (!message) {
      issues.push({
        severity: 'warning',
        title: `${label}: message body is empty`,
        detail: 'Add email content to avoid sending blank notifications.',
      })
    }
  })

  return issues
}
