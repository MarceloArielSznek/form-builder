import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createForm, getForm, updateForm } from '../api/forms'
import {
  createEmptyBlock,
  ensureBuilderFields,
  fieldsForPayload,
  mergeSavedFields,
  richTextToMarkdown,
  textToLexical,
} from '../lib/fieldBlocks'
import { validateForm } from '../lib/formValidation'
import type { Form, FormEmail, FormFieldBlock, FormFieldBlockType } from '../types/payload'

interface SaveFeedback {
  tone: 'success' | 'danger'
  message: string
}

function normalizeEmail(email: FormEmail): FormEmail {
  const msg = email.message
  const text =
    email.messageText ??
    (msg != null && typeof msg === 'string' ? msg : msg != null ? richTextToMarkdown(msg) : '')
  return { ...email, messageText: text }
}

function relationId(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10)
    return Number.isNaN(parsed) ? undefined : parsed
  }
  if (value && typeof value === 'object' && 'id' in value) {
    return relationId((value as { id?: unknown }).id)
  }
  return undefined
}

function relationIds(values: unknown): number[] {
  if (!Array.isArray(values)) return []
  const ids: number[] = []
  for (const value of values) {
    const id = relationId(value)
    if (id != null) ids.push(id)
  }
  return ids
}

function normalizeEmailForPayload(email: FormEmail): FormEmail {
  const rawMessage =
    email.messageText ??
    (email.message != null && typeof email.message === 'string' ? email.message : richTextToMarkdown(email.message))

  const next: FormEmail = {
    emailTo: email.emailTo.trim(),
    emailFrom: email.emailFrom.trim(),
    subject: email.subject.trim(),
    message: textToLexical(rawMessage ?? ''),
    messageFormat: email.messageFormat ?? 'markdown',
  }

  if (email.id) next.id = email.id
  if (email.cc?.trim()) next.cc = email.cc.trim()
  if (email.bcc?.trim()) next.bcc = email.bcc.trim()
  if (email.replyTo?.trim()) next.replyTo = email.replyTo.trim()

  return next
}

function serializeForm(form: Form | null): string {
  if (!form) return ''
  return JSON.stringify({
    title: form.title ?? '',
    fields: Array.isArray(form.fields) ? form.fields : [],
    submitButtonLabel: form.submitButtonLabel,
    confirmationType: form.confirmationType,
    confirmationMessageText: form.confirmationMessageText,
    redirect: form.redirect,
    emails: form.emails,
    formCategory: form.formCategory,
    organization: form.organization,
    branches: form.branches,
  })
}

/**
 * Strip ids from a fields tree (recursive) so Payload regenerates fresh ones
 * when the duplicated form is created. This prevents id collisions on nested
 * arrays such as select/radio `options` or payment `priceConditions`.
 */
function stripIdsDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripIdsDeep(item)) as unknown as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (key === 'id') continue
      out[key] = stripIdsDeep(val)
    }
    return out as T
  }
  return value
}

/** Clone fields for a duplication flow: remove ids at every level. */
export function cloneFieldsForDuplicate(fields: FormFieldBlock[]): FormFieldBlock[] {
  return stripIdsDeep(fields)
}

function normalizeForm(form: Form): Form {
  const fields = ensureBuilderFields(Array.isArray(form.fields) ? form.fields : [])
  const emails = Array.isArray(form.emails)
    ? form.emails.map(normalizeEmail)
    : []
  const confirmationMessage = form.confirmationMessage
  const confirmationMessageText =
    form.confirmationMessageText ??
    (confirmationMessage != null && typeof confirmationMessage === 'string'
      ? confirmationMessage
      : confirmationMessage != null
        ? richTextToMarkdown(confirmationMessage)
        : '')
  return {
    ...form,
    fields,
    emails,
    confirmationMessageText,
    organization: relationId(form.organization),
    branches: relationIds(form.branches),
    redirect: form.redirect ?? { url: null },
  }
}

export function useFormEditor(formId: string | null, duplicateFromId: string | null = null) {
  const [form, setForm] = useState<Form | null>(null)
  const [loading, setLoading] = useState(Boolean(formId) || Boolean(duplicateFromId))
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback | null>(null)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const [isDuplicateDraft, setIsDuplicateDraft] = useState(false)
  const snapshotRef = useRef('')
  const requestIdRef = useRef(0)
  const duplicateFetchedRef = useRef<string | null>(null)

  const commitForm = useCallback((nextForm: Form) => {
    const normalized = normalizeForm(nextForm)
    setForm(normalized)
    snapshotRef.current = serializeForm(normalized)
    setSelectedFieldId(normalized.fields?.[0]?.id ?? null)
  }, [])

  const loadForm = useCallback(
    async (id: string) => {
      const requestId = ++requestIdRef.current
      setLoading(true)
      setLoadError(null)
      setSaveFeedback(null)

      try {
        const data = await getForm(id, { depth: 2 })
        if (requestId !== requestIdRef.current) {
          return
        }

        commitForm(data)
      } catch (error) {
        if (requestId !== requestIdRef.current) {
          return
        }

        setLoadError(error instanceof Error ? error.message : 'Failed to load form')
        setForm(null)
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false)
        }
      }
    },
    [commitForm],
  )

  useEffect(() => {
    if (formId) {
      if (form?.id && form.id === formId) {
        setLoading(false)
        setLoadError(null)
        return
      }
      setIsDuplicateDraft(false)
      duplicateFetchedRef.current = null
      void loadForm(formId)
      return
    }

    if (duplicateFromId) {
      // Only fetch once per duplicateFromId value: prevents re-running the
      // duplicate fetch after a successful create (which sets form.id) while
      // the URL still carries ?duplicateFrom=…
      if (duplicateFetchedRef.current === duplicateFromId) {
        return
      }
      duplicateFetchedRef.current = duplicateFromId

      const requestId = ++requestIdRef.current
      setLoading(true)
      setLoadError(null)
      setSaveFeedback(null)

      ;(async () => {
        try {
          const source = await getForm(duplicateFromId, { depth: 2 })
          if (requestId !== requestIdRef.current) return
          const clonedFields = cloneFieldsForDuplicate(
            Array.isArray(source.fields) ? source.fields : [],
          )
          setIsDuplicateDraft(true)
          commitForm({
            id: '',
            title: '',
            fields: clonedFields,
            submitButtonLabel: undefined,
            confirmationType: 'message',
            confirmationMessageText: '',
            redirect: { url: null },
            emails: [],
            formCategory: undefined,
            organization: undefined,
            branches: [],
          })
        } catch (error) {
          if (requestId !== requestIdRef.current) return
          setLoadError(
            error instanceof Error
              ? `Could not load the source form to duplicate: ${error.message}`
              : 'Could not load the source form to duplicate.',
          )
          setIsDuplicateDraft(false)
          commitForm({ id: '', title: '', fields: [] })
        } finally {
          if (requestId === requestIdRef.current) {
            setLoading(false)
          }
        }
      })()
      return
    }

    requestIdRef.current += 1
    duplicateFetchedRef.current = null
    setLoading(false)
    setLoadError(null)
    setSaveFeedback(null)
    setIsDuplicateDraft(false)
    commitForm({ id: '', title: '', fields: [] })
  }, [commitForm, duplicateFromId, form?.id, formId, loadForm])

  const fields = useMemo(() => (Array.isArray(form?.fields) ? form.fields : []), [form?.fields])

  useEffect(() => {
    if (!selectedFieldId) {
      return
    }

    if (!fields.some((field) => field.id === selectedFieldId)) {
      setSelectedFieldId(fields[0]?.id ?? null)
    }
  }, [fields, selectedFieldId])

  const selectedIndex = useMemo(
    () => fields.findIndex((field) => field.id === selectedFieldId),
    [fields, selectedFieldId],
  )

  const selectedBlock = selectedIndex >= 0 ? fields[selectedIndex] : null

  const setFields = useCallback((nextFields: FormFieldBlock[]) => {
    setForm((current) => (current ? { ...current, fields: nextFields } : current))
    setSaveFeedback(null)
  }, [])

  const updateTitle = useCallback((title: string) => {
    setForm((current) => (current ? { ...current, title } : current))
    setSaveFeedback(null)
  }, [])

  const addField = useCallback(
    (type: FormFieldBlockType) => {
      const block = createEmptyBlock(type)
      const nextFields = [...fields, block]
      setFields(nextFields)
      setSelectedFieldId(block.id ?? null)
    },
    [fields, setFields],
  )

  const addFieldAt = useCallback(
    (type: FormFieldBlockType, index: number) => {
      const block = createEmptyBlock(type)
      const nextFields = [...fields]
      nextFields.splice(Math.max(0, index), 0, block)
      setFields(nextFields)
      setSelectedFieldId(block.id ?? null)
    },
    [fields, setFields],
  )

  const updateBlock = useCallback(
    (fieldId: string, nextBlock: FormFieldBlock) => {
      setFields(fields.map((field) => (field.id === fieldId ? nextBlock : field)))
    },
    [fields, setFields],
  )

  const removeBlock = useCallback(
    (fieldId: string) => {
      const index = fields.findIndex((field) => field.id === fieldId)
      if (index < 0) {
        return
      }

      const nextFields = fields.filter((field) => field.id !== fieldId)
      setFields(nextFields)

      if (selectedFieldId === fieldId) {
        setSelectedFieldId(nextFields[index]?.id ?? nextFields[index - 1]?.id ?? null)
      }
    },
    [fields, selectedFieldId, setFields],
  )

  const moveBlock = useCallback(
    (fieldId: string, direction: -1 | 1) => {
      const index = fields.findIndex((field) => field.id === fieldId)
      if (index < 0) {
        return
      }

      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= fields.length) {
        return
      }

      const nextFields = fields.slice()
      ;[nextFields[index], nextFields[nextIndex]] = [nextFields[nextIndex], nextFields[index]]
      setFields(nextFields)
      setSelectedFieldId(fieldId)
    },
    [fields, setFields],
  )

  const moveBlockToIndex = useCallback(
    (fieldId: string, toIndex: number) => {
      const fromIndex = fields.findIndex((f) => f.id === fieldId)
      if (fromIndex < 0) return
      const targetIndex = Math.max(0, Math.min(toIndex, fields.length - 1))
      if (fromIndex === targetIndex) return
      const nextFields = fields.slice()
      const [removed] = nextFields.splice(fromIndex, 1)
      nextFields.splice(targetIndex, 0, removed)
      setFields(nextFields)
      setSelectedFieldId(fieldId)
    },
    [fields, setFields],
  )

  const validationIssues = useMemo(() => validateForm(form), [form])
  const blockingIssueCount = validationIssues.filter((issue) => issue.severity === 'error').length
  const warningCount = validationIssues.filter((issue) => issue.severity === 'warning').length
  const isDirty = useMemo(() => serializeForm(form) !== snapshotRef.current, [form])

  useEffect(() => {
    if (!isDirty) {
      return
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const save = useCallback(async () => {
    if (!form || blockingIssueCount > 0) return null

    setSaving(true)
    setSaveFeedback(null)
    const payloadFields = fieldsForPayload(fields)
    const confirmationType = form.confirmationType ?? 'message'
    const confirmationMessageSource =
      form.confirmationMessageText ??
      (typeof form.confirmationMessage === 'string' ? form.confirmationMessage : richTextToMarkdown(form.confirmationMessage))

    const emailPayload = (form.emails ?? []).map(normalizeEmailForPayload)

    const payload = {
      title: form.title ?? '',
      fields: payloadFields,
      submitButtonLabel: form.submitButtonLabel,
      confirmationType,
      confirmationMessage:
        confirmationType === 'redirect'
          ? undefined
          : textToLexical(confirmationMessageSource ?? ''),
      redirect: form.redirect ?? { url: null },
      emails: emailPayload,
      formCategory: form.formCategory,
      organization: form.organization,
      branches: form.branches,
    }

    try {
      const savedForm = form.id
        ? await updateForm(form.id, payload)
        : await createForm(payload)

      const nextForm = normalizeForm({
        ...form,
        ...savedForm,
        fields: mergeSavedFields(savedForm.fields ?? [], fields),
        submitButtonLabel: savedForm.submitButtonLabel ?? form.submitButtonLabel,
        confirmationType: savedForm.confirmationType ?? form.confirmationType,
        confirmationMessage: savedForm.confirmationMessage ?? form.confirmationMessage,
        confirmationMessageText: savedForm.confirmationMessageText ?? form.confirmationMessageText,
        redirect: savedForm.redirect ?? form.redirect,
        emails: savedForm.emails ?? form.emails,
        formCategory: savedForm.formCategory ?? form.formCategory,
        organization: savedForm.organization ?? form.organization,
        branches: savedForm.branches ?? form.branches,
      })
      setForm(nextForm)
      snapshotRef.current = serializeForm(nextForm)
      setSaveFeedback({
        tone: 'success',
        message: form.id ? 'Changes saved to Menaia.' : 'Form created and ready to keep editing.',
      })
      return savedForm.id
    } catch (error) {
      console.error('[Form save] Failed to persist form in Menaia.', error)
      setSaveFeedback({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Failed to save form.',
      })
      return null
    } finally {
      setSaving(false)
    }
  }, [blockingIssueCount, fields, form])

  const updateFormMeta = useCallback((patch: Partial<Form>) => {
    setForm((prev) => (prev ? { ...prev, ...patch } : null))
  }, [])

  return {
    form,
    fields,
    loading,
    saving,
    loadError,
    saveFeedback,
    selectedBlock,
    selectedFieldId,
    selectedIndex,
    validationIssues,
    blockingIssueCount,
    warningCount,
    isDirty,
    isDuplicateDraft,
    loadForm,
    updateTitle,
    updateFormMeta,
    addField,
    addFieldAt,
    updateBlock,
    removeBlock,
    moveBlock,
    moveBlockToIndex,
    save,
    setSelectedFieldId,
  }
}
