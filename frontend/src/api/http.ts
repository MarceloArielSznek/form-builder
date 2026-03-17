interface ApiErrorShape {
  message?: string
  errors?: Array<{ message?: string }>
}

function getErrorMessage(status: number, data: ApiErrorShape | null): string {
  return data?.errors?.[0]?.message ?? data?.message ?? `HTTP ${status}`
}

export async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
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
