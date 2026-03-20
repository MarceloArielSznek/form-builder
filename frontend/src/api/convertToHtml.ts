import { payloadConfig } from '../lib/env'
import { getStoredToken } from './auth'
import { jsonHeaders, requestJson } from './http'

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken()
  return jsonHeaders(token ? { Authorization: `JWT ${token}` } : undefined)
}

export interface ConvertToHtmlResponse {
  html: string
}

interface ConvertToHtmlOptions {
  timeoutMs?: number
}

/**
 * Convert plain text (with {{placeholders}}) to styled HTML via AI.
 * Requires VITE_AI_CONVERT_URL to be set. Endpoint should accept POST { message: string } and return { html: string }.
 * All {{...}} placeholders must be preserved in the returned HTML.
 */
export async function convertMessageToHtml(message: string, options?: ConvertToHtmlOptions): Promise<string> {
  const url = payloadConfig.aiConvertUrl
  if (!url || !message.trim()) {
    throw new Error('Convert URL not configured or message is empty.')
  }

  const data = await requestJson<ConvertToHtmlResponse>(url, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ message: message.trim() }),
    timeoutMs: options?.timeoutMs ?? 60000,
  })

  if (typeof data.html !== 'string') {
    throw new Error('Invalid response: missing html.')
  }
  return data.html
}

export function isConvertToHtmlAvailable(): boolean {
  return Boolean(payloadConfig.aiConvertUrl?.trim())
}
