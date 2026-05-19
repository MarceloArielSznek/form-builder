import { appConfig } from '../lib/env'
import { jsonHeaders, requestJson } from './http'

function getAuthHeaders(): HeadersInit {
  return jsonHeaders()
}

export interface Branch {
  id: number
  name?: string
  title?: string
}

export interface Organization {
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
  const base = appConfig.apiUrl
  return `${base}/api/menaia/${slug}${path}`
}

function parseNumericId(id: unknown): number | null {
  const parsed = typeof id === 'string' ? parseInt(id, 10) : Number(id)
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Fetch branches from Menaia (e.g. /api/branches). Used for form branch multi-select.
 * Returns empty array on error (e.g. 404 if collection missing).
 */
export async function getBranches(): Promise<Branch[]> {
  try {
    const url = `${listUrl(appConfig.branchesSlug)}?limit=500`
    const data = await requestJson<ListResponse<Branch>>(url, { headers: getAuthHeaders() })
    const docs = Array.isArray(data.docs) ? data.docs : []
    const mapped: Branch[] = []
    for (const b of docs) {
      const id = parseNumericId(b.id)
      if (id == null) continue
      mapped.push({ id, name: b.name ?? b.title, title: b.title ?? b.name })
    }
    return mapped
  } catch {
    return []
  }
}

/**
 * Fetch organizations from Menaia (e.g. /api/organizations). Used for form organization selector.
 * Returns empty array on error (e.g. 404 if collection missing).
 */
export async function getOrganizations(): Promise<Organization[]> {
  try {
    const url = `${listUrl(appConfig.organizationsSlug)}?limit=500`
    const data = await requestJson<ListResponse<Organization>>(url, { headers: getAuthHeaders() })
    const docs = Array.isArray(data.docs) ? data.docs : []
    const mapped: Organization[] = []
    for (const org of docs) {
      const id = parseNumericId(org.id)
      if (id == null) continue
      mapped.push({ id, name: org.name ?? org.title, title: org.title ?? org.name })
    }
    return mapped
  } catch {
    return []
  }
}

/**
 * Fetch form category options from Menaia (e.g. /api/form-categories). Used for form category dropdown.
 * Returns empty array on error (e.g. 404 if collection missing).
 */
export async function getFormCategories(): Promise<FormCategoryOption[]> {
  try {
    const url = `${listUrl(appConfig.formCategoriesSlug)}?limit=100`
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
