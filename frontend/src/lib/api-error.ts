import type { ProblemDetail } from "@/types/api"

export type ApiFieldError = {
  field?: string
  message?: string
}

export class ApiError extends Error {
  readonly operationId: string
  readonly requestId?: string
  readonly status: number
  readonly title: string
  readonly detail: string
  readonly fieldErrors: ApiFieldError[]

  constructor(options: {
    operationId: string
    requestId?: string
    status: number
    title: string
    detail: string
    fieldErrors?: ApiFieldError[]
  }) {
    super(options.detail)
    this.name = "ApiError"
    this.operationId = options.operationId
    this.requestId = options.requestId
    this.status = options.status
    this.title = options.title
    this.detail = options.detail
    this.fieldErrors = options.fieldErrors ?? []
  }
}

type ParseApiErrorOptions = {
  operationId: string
  requestId?: string
}

export async function parseApiError(
  response: Response,
  options: ParseApiErrorOptions,
): Promise<ApiError> {
  const contentType = response.headers.get("content-type") ?? ""
  let title = "Error"
  let detail = `Request failed with status ${response.status}`
  let fieldErrors: ApiFieldError[] = []

  if (contentType.includes("application/problem+json") || contentType.includes("application/json")) {
    try {
      const body = (await response.json()) as ProblemDetail
      if (body.title) {
        title = body.title
      }
      if (body.detail) {
        detail = body.detail
      }
      if (body.errors?.length) {
        fieldErrors = body.errors
      }
    } catch {
      // keep fallback detail
    }
  }

  return new ApiError({
    operationId: options.operationId,
    requestId: options.requestId,
    status: response.status,
    title,
    detail,
    fieldErrors,
  })
}

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.detail
  }
  if (error instanceof Error) {
    return error.message
  }
  return "An unexpected error occurred"
}
