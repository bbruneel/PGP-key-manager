import { API_ACCEPT_HEADER, apiFetch, newRequestId } from "@/lib/api"
import { parseApiError } from "@/lib/api-error"
import { logApiEvent } from "@/lib/logger"

const REQUEST_ID_HEADER = "X-Request-Id"

export type RequestOptions = {
  operationId: string
  accessToken?: string | null
  method?: string
  body?: unknown
  requestId?: string
  headers?: Record<string, string>
}

export type RequestJsonOptions = RequestOptions

function responseRequestId(response: Response, fallback?: string): string | undefined {
  return response.headers.get(REQUEST_ID_HEADER) ?? fallback
}

async function executeRequest(path: string, options: RequestOptions): Promise<Response> {
  const requestId = options.requestId ?? newRequestId()
  const method = options.method ?? (options.body !== undefined ? "POST" : "GET")
  const headers: Record<string, string> = { ...options.headers }

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

  return response
}

function logRequestSuccess(
  options: RequestOptions,
  path: string,
  response: Response,
  requestId: string,
): void {
  logApiEvent("info", {
    operationId: options.operationId,
    requestId,
    path,
    status: response.status,
    message: "Request completed successfully",
  })
}

export async function requestJson<T>(path: string, options: RequestJsonOptions): Promise<T> {
  const requestId = options.requestId ?? newRequestId()
  const response = await executeRequest(path, { ...options, requestId })
  const correlatedRequestId = responseRequestId(response, requestId) ?? requestId

  const contentType = response.headers.get("content-type") ?? ""
  if (response.status === 204 || !contentType.includes("json")) {
    logRequestSuccess(options, path, response, correlatedRequestId)
    return undefined as T
  }

  const data = (await response.json()) as T
  logRequestSuccess(options, path, response, correlatedRequestId)
  return data
}

export type RequestJsonWithStatusResult<T> = {
  status: number
  data: T
}

/** Like requestJson but returns body for listed non-OK statuses instead of throwing. */
export async function requestJsonWithStatus<T>(
  path: string,
  options: RequestJsonOptions,
  allowedStatuses: number[],
): Promise<RequestJsonWithStatusResult<T>> {
  const requestId = options.requestId ?? newRequestId()
  const method = options.method ?? (options.body !== undefined ? "POST" : "GET")
  const headers: Record<string, string> = { ...options.headers }

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

  const correlatedRequestId = responseRequestId(response, requestId) ?? requestId
  const contentType = response.headers.get("content-type") ?? ""

  if (!response.ok && !allowedStatuses.includes(response.status)) {
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

  const data =
    response.status === 204 || !contentType.includes("json")
      ? (undefined as T)
      : ((await response.json()) as T)

  logApiEvent(response.ok ? "info" : "warn", {
    operationId: options.operationId,
    requestId: correlatedRequestId,
    path,
    status: response.status,
    message: response.ok ? "Request completed successfully" : "Request completed with allowed error status",
  })

  return { status: response.status, data }
}

export async function requestText(path: string, options: RequestOptions): Promise<string> {
  const requestId = options.requestId ?? newRequestId()
  const response = await executeRequest(path, { ...options, requestId })
  const correlatedRequestId = responseRequestId(response, requestId) ?? requestId
  const text = await response.text()
  logRequestSuccess(options, path, response, correlatedRequestId)
  return text
}

export { API_ACCEPT_HEADER }
