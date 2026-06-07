export type ApiLogLevel = "debug" | "info" | "warn" | "error"

export type ApiLogContext = {
  operationId: string
  requestId?: string
  path?: string
  status?: number
  message: string
}

const LOG_PREFIX = "[pgp-api]"

export function isApiDebugEnabled(): boolean {
  return import.meta.env.DEV === true
}

function formatPrefix(context: ApiLogContext): string {
  const parts = [LOG_PREFIX, context.operationId]
  if (context.requestId) {
    parts.push(`requestId=${context.requestId}`)
  }
  if (context.status !== undefined) {
    parts.push(`status=${context.status}`)
  }
  return `${parts.join(" ")}: ${context.message}`
}

type LogApiEventOptions = {
  /** Test hook to force debug logging on or off without mocking import.meta.env. */
  debugEnabled?: boolean
}

export function logApiEvent(
  level: ApiLogLevel,
  context: ApiLogContext,
  options?: LogApiEventOptions,
): void {
  const debugEnabled = options?.debugEnabled ?? isApiDebugEnabled()
  if (level === "debug" && !debugEnabled) {
    return
  }

  const prefix = formatPrefix(context)
  const payload = {
    operationId: context.operationId,
    requestId: context.requestId,
    path: context.path,
    status: context.status,
  }

  switch (level) {
    case "debug":
      console.debug(prefix, payload)
      break
    case "info":
      console.info(prefix, payload)
      break
    case "warn":
      console.warn(prefix, payload)
      break
    case "error":
      console.error(prefix, payload)
      break
  }
}
