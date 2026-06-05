import { API_ACCEPT_HEADER, apiFetch, newRequestId } from "@/lib/api"
import { parseApiError } from "@/lib/api-error"
import { logApiEvent } from "@/lib/logger"

const REQUEST_ID_HEADER = "X-Request-Id"

export type RequestJsonOptions = {
  operationId: string
  accessToken?: string | null
  method?: string
  body?: unknown
  requestId?: string
}

function responseRequestId(response: Response, fallback?: string): string | undefined {
  return response.headers.get(REQUEST_ID_HEADER) ?? fallback
}

export async function requestJson<T>(path: string, options: RequestJsonOptions): Promise<T> {
  const requestId = options.requestId ?? newRequestId()
  const method = options.method ?? (options.body !== undefined ? "POST" : "GET")
  const headers: Record<string, string> = {}

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json"
  }

  const response = await apiFetch(path, {
    method,
    accessToken: options.accessToken,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    requestId,
  })

  const correlatedRequestId = responseRequestId(response, requestId)

  if (!response.ok) {
    const apiError = await parseApiError(response, {
      operationId: options.operationId,
      requestId: correlatedRequestId,
    })
    logApiEvent("warn", {
      operationId: options.operationId,
      requestId: correlatedRequestId,
      path,
      status: response.status,
      message: apiError.detail,
    })
    throw apiError
  }

  const contentType = response.headers.get("content-type") ?? ""
  if (response.status === 204 || !contentType.includes("json")) {
    logApiEvent("info", {
      operationId: options.operationId,
      requestId: correlatedRequestId,
      path,
      status: response.status,
      message: "Request completed successfully",
    })
    return undefined as T
  }

  const data = (await response.json()) as T
  logApiEvent("info", {
    operationId: options.operationId,
    requestId: correlatedRequestId,
    path,
    status: response.status,
    message: "Request completed successfully",
  })
  return data
}

export { API_ACCEPT_HEADER }
