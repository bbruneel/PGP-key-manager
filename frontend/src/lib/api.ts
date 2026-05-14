/**
 * ThankYouBoard-style JSON negotiation (see API docs).
 */
export const API_ACCEPT_HEADER = "application/json; version=1" as const

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/$/, "")
  const p = path.startsWith("/") ? path : `/${path}`
  return `${b}${p}`
}

export function newRequestId(): string {
  return crypto.randomUUID()
}

export type ApiFetchOptions = RequestInit & {
  accessToken?: string | null
}

/**
 * Browser fetch to the Spring API with default headers.
 * Pass `accessToken` from Auth0 `getAccessTokenSilently()` when calling protected routes.
 */
export async function apiFetch(path: string, init: ApiFetchOptions = {}): Promise<Response> {
  const base = import.meta.env.VITE_API_BASE_URL
  if (!base) {
    throw new Error("VITE_API_BASE_URL is not set")
  }
  const { accessToken, headers, ...rest } = init
  const h = new Headers(headers)
  if (!h.has("Accept")) {
    h.set("Accept", API_ACCEPT_HEADER)
  }
  if (accessToken) {
    h.set("Authorization", `Bearer ${accessToken}`)
  }
  if (!h.has("X-Request-Id")) {
    h.set("X-Request-Id", newRequestId())
  }
  const url = path.startsWith("http") ? path : joinUrl(base, path)
  return fetch(url, { ...rest, headers: h })
}
