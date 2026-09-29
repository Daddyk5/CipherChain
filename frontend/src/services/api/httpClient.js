const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

let idTokenProvider = null

// Registered by the auth layer so every API call carries the session token.
export function setIdTokenProvider(provider) {
  idTokenProvider = provider
}

export function getSessionToken() {
  return idTokenProvider ? idTokenProvider() : null
}

export async function apiRequest(path, options = {}) {
  const token = idTokenProvider ? await idTokenProvider() : null
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(response.status, body.code ?? 'HTTP_ERROR', body.message ?? `API request failed with status ${response.status}`)
  }

  return body
}
