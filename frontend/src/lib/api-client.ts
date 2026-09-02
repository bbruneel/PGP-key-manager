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

export async function requestText(path: string, options: RequestOptions): Promise<string> {
  const requestId = options.requestId ?? newRequestId()
  const response = await executeRequest(path, { ...options, requestId })
  const correlatedRequestId = responseRequestId(response, requestId) ?? requestId
  const text = await response.text()
  logRequestSuccess(options, path, response, correlatedRequestId)
  return text
}

export type BlobDownloadResult = {
  blob: Blob
  filename: string | null
  archivePassword: string | null
  requestId: string
}

function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) {
    return null
  }
  const match = /filename="([^"]+)"/i.exec(header)
  return match?.[1] ?? null
}

export async function requestBlob(path: string, options: RequestOptions): Promise<BlobDownloadResult> {
  const requestId = options.requestId ?? newRequestId()
  const response = await executeRequest(path, { ...options, requestId })
  const correlatedRequestId = responseRequestId(response, requestId) ?? requestId
  const blob = await response.blob()
  // Intentionally omit archive password from API success logs.
  logRequestSuccess(options, path, response, correlatedRequestId)
  return {
    blob,
    filename: parseFilenameFromContentDisposition(response.headers.get("Content-Disposition")),
    archivePassword: response.headers.get("X-Archive-Password"),
    requestId: correlatedRequestId,
  }
}

export { API_ACCEPT_HEADER }
