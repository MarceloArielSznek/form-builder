import { appConfig } from '../lib/env'
import { jsonHeaders, requestJson } from './http'
import type { Form, FormFieldBlock } from '../types/payload'

function getAuthHeaders(): HeadersInit {
  return jsonHeaders()
}

function formsUrl(path = ''): string {
  const base = appConfig.apiUrl
  return `${base}/api/menaia/${appConfig.formsSlug}${path}`
}

export interface ListFormsResponse {
  docs: Form[]
  totalDocs: number
  limit: number
  totalPages: number
  page: number
  pagingCounter: number
  hasPrevPage: boolean
  hasNextPage: boolean
  prevPage: number | null
  nextPage: number | null
}

/**
 * List forms with pagination. Default depth=2 to include nested block data.
 */
export async function listForms(params?: {
  page?: number
  limit?: number
  depth?: number
  where?: Record<string, unknown>
}): Promise<ListFormsResponse> {
  const search = new URLSearchParams()
  if (params?.page != null) search.set('page', String(params.page))
  if (params?.limit != null) search.set('limit', String(params.limit))
  if (params?.depth != null) search.set('depth', String(params.depth))
  else search.set('depth', '2')
  if (params?.where) search.set('where', JSON.stringify(params.where))

  const url = `${formsUrl()}?${search.toString()}`
  return requestJson<ListFormsResponse>(url, { headers: getAuthHeaders() })
}

/**
 * Get a single form by ID. Use depth=2 for full field blocks.
 */
export async function getForm(
  id: string,
  opts?: { depth?: number; draft?: boolean; locale?: string }
): Promise<Form> {
  const search = new URLSearchParams()
  search.set('depth', String(opts?.depth ?? 2))
  if (opts?.draft !== undefined) search.set('draft', String(opts.draft))
  if (opts?.locale != null) search.set('locale', opts.locale)

  const url = `${formsUrl(`/${id}`)}?${search.toString()}`
  return requestJson<Form>(url, { headers: getAuthHeaders() })
}

/**
 * Create a new form. Pass partial Form; fields can be empty array.
 */
export async function createForm(data: Partial<Form> & { fields?: FormFieldBlock[] }): Promise<Form> {
  const url = formsUrl()
  return requestJson<Form>(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
}

/**
 * Update an existing form by ID.
 */
export async function updateForm(
  id: string,
  data: Partial<Form> & { fields?: FormFieldBlock[] }
): Promise<Form> {
  const url = formsUrl(`/${id}`)
  return requestJson<Form>(url, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })
}

/**
 * Delete a form by ID.
 */
export async function deleteForm(id: string): Promise<void> {
  const url = formsUrl(`/${id}`)
  await requestJson<unknown>(url, { method: 'DELETE', headers: getAuthHeaders() })
}
