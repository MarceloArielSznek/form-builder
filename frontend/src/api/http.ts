interface ApiErrorShape {
  message?: string
  errors?: Array<{ message?: string }>
}

function getErrorMessage(status: number, data: ApiErrorShape | null): string {
  return data?.errors?.[0]?.message ?? data?.message ?? `HTTP ${status}`
}

const DEFAULT_TIMEOUT_MS = 20000

type RequestJsonInit = RequestInit & {
  timeoutMs?: number
}

export async function requestJson<T>(url: string, init?: RequestJsonInit): Promise<T> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const timeoutController = new AbortController()
  const externalSignal = init?.signal

  let detachExternalAbort: (() => void) | undefined
  if (externalSignal) {
    if (externalSignal.aborted) {
      timeoutController.abort()
    } else {
      const handleExternalAbort = () => timeoutController.abort()
      externalSignal.addEventListener('abort', handleExternalAbort, { once: true })
      detachExternalAbort = () => externalSignal.removeEventListener('abort', handleExternalAbort)
    }
  }

  const timeoutId = setTimeout(() => {
    timeoutController.abort()
  }, timeoutMs)

  let response: Response
  try {
    response = await fetch(url, { ...init, signal: timeoutController.signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s. Please check Payload URL and network connectivity.`)
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
    detachExternalAbort?.()
  }

  const data = (await response.json().catch(() => null)) as T | ApiErrorShape | null

  if (!response.ok) {
    throw new Error(getErrorMessage(response.status, data as ApiErrorShape | null))
  }

  return data as T
}

export function jsonHeaders(headers?: HeadersInit): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...headers,
  }
}
