import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createForm, getForm, updateForm } from '../api/forms'
import {
  createEmptyBlock,
  ensureBuilderFields,
  fieldsForPayload,
  mergeSavedFields,
} from '../lib/fieldBlocks'
import { validateForm } from '../lib/formValidation'
import type { Form, FormFieldBlock, FormFieldBlockType } from '../types/payload'

interface SaveFeedback {
  tone: 'success' | 'danger'
  message: string
}

function serializeForm(form: Form | null): string {
  if (!form) {
    return ''
  }

  return JSON.stringify({
    title: form.title ?? '',
    fields: Array.isArray(form.fields) ? form.fields : [],
  })
}

function normalizeForm(form: Form): Form {
  return {
    ...form,
    fields: ensureBuilderFields(Array.isArray(form.fields) ? form.fields : []),
  }
}

export function useFormEditor(formId: string | null) {
  const [form, setForm] = useState<Form | null>(null)
  const [loading, setLoading] = useState(Boolean(formId))
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback | null>(null)
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null)
  const snapshotRef = useRef('')
  const requestIdRef = useRef(0)

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
      void loadForm(formId)
      return
    }

    requestIdRef.current += 1
    setLoading(false)
    setLoadError(null)
    setSaveFeedback(null)
    commitForm({ id: '', title: '', fields: [] })
  }, [commitForm, formId, loadForm])

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
    if (!form || blockingIssueCount > 0) {
      return null
    }

    setSaving(true)
    setSaveFeedback(null)

    const payloadFields = fieldsForPayload(fields)

    try {
      const savedForm = form.id
        ? await updateForm(form.id, { title: form.title, fields: payloadFields })
        : await createForm({ title: form.title || 'Untitled form', fields: payloadFields })

      const nextForm = normalizeForm({
        ...savedForm,
        fields: mergeSavedFields(savedForm.fields ?? [], fields),
      })

      setForm(nextForm)
      snapshotRef.current = serializeForm(nextForm)
      setSaveFeedback({
        tone: 'success',
        message: form.id ? 'Changes saved to Payload.' : 'Form created and ready to keep editing.',
      })

      return savedForm.id
    } catch (error) {
      setSaveFeedback({
        tone: 'danger',
        message: error instanceof Error ? error.message : 'Failed to save form.',
      })
      return null
    } finally {
      setSaving(false)
    }
  }, [blockingIssueCount, fields, form])

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
    loadForm,
    updateTitle,
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
