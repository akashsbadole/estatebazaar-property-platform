// Lightweight fetch wrapper for calling our API routes from the client.
// Handles JSON parsing, error normalisation, and 401 redirects.

export interface ApiError extends Error {
  status?: number
}

export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'include',
  })

  let data: any = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`) as ApiError
    err.status = res.status
    throw err
  }

  return data as T
}

export const apiGet = <T = any>(path: string) => api<T>(path, { method: 'GET' })
export const apiPost = <T = any>(path: string, body?: any) =>
  api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
export const apiPatch = <T = any>(path: string, body?: any) =>
  api<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined })
export const apiPut = <T = any>(path: string, body?: any) =>
  api<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined })
export const apiDelete = <T = any>(path: string, body?: any) =>
  api<T>(path, { method: 'DELETE', body: body ? JSON.stringify(body) : undefined })
