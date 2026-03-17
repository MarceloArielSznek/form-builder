import { payloadConfig } from '../lib/env'
import { getStoredToken } from './auth'
import { jsonHeaders, requestJson } from './http'

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken()
  return jsonHeaders(token ? { Authorization: `JWT ${token}` } : undefined)
}

export interface Branch {
  id: number
  name?: string
  title?: string
}

export interface FormCategoryOption {
  id?: string
  value: string
  label?: string
  name?: string
}

interface ListResponse<T> {
  docs: T[]
  totalDocs?: number
}

function listUrl(slug: string, path = ''): string {
  const base = payloadConfig.apiUrl
  return `${base}/api/${slug}${path}`
}

/**
 * Fetch branches from Payload (e.g. /api/branches). Used for form branch multi-select.
 * Returns empty array on error (e.g. 404 if collection missing).
 */
export async function getBranches(): Promise<Branch[]> {
  try {
    const url = `${listUrl(payloadConfig.branchesSlug)}?limit=500`
    const data = await requestJson<ListResponse<Branch>>(url, { headers: getAuthHeaders() })
    const docs = Array.isArray(data.docs) ? data.docs : []
    return docs
      .map((b) => {
        const id = typeof b.id === 'string' ? parseInt(b.id, 10) : Number(b.id)
        return Number.isNaN(id) ? null : { id, name: b.name ?? b.title, title: b.title ?? b.name }
      })
      .filter((b): b is Branch => b != null)
  } catch {
    return []
  }
}

/**
 * Fetch form category options from Payload (e.g. /api/form-categories). Used for form category dropdown.
 * Returns empty array on error (e.g. 404 if collection missing).
 */
export async function getFormCategories(): Promise<FormCategoryOption[]> {
  try {
    const url = `${listUrl(payloadConfig.formCategoriesSlug)}?limit=100`
    const data = await requestJson<ListResponse<FormCategoryOption & { id?: string }>>(url, {
      headers: getAuthHeaders(),
    })
    const docs = Array.isArray(data.docs) ? data.docs : []
    return docs.map((d) => ({
      value: d.value ?? d.id ?? d.name ?? String(d.id ?? ''),
      label: d.label ?? d.name ?? d.value ?? String(d.id ?? ''),
    }))
  } catch {
    return []
  }
}
