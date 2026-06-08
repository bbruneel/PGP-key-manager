export type UiLogLevel = "debug" | "info" | "warn" | "error"

export type UiLogContext = {
  eventId: string
  message: string
  operationId?: string
  requestId?: string
  status?: number
  keyId?: string
  fingerprint?: string
}

const LOG_PREFIX = "[pgp-ui]"

export function isUiDebugEnabled(): boolean {
  return import.meta.env.DEV === true
}

function formatPrefix(context: UiLogContext): string {
  const parts = [LOG_PREFIX, context.eventId]
  if (context.requestId) {
    parts.push(`requestId=${context.requestId}`)
  }
  if (context.status !== undefined) {
    parts.push(`status=${context.status}`)
  }
  return `${parts.join(" ")}: ${context.message}`
}

type LogUiEventOptions = {
  /** Test hook to force debug logging on or off without mocking import.meta.env. */
  debugEnabled?: boolean
}

export function logUiEvent(
  level: UiLogLevel,
  context: UiLogContext,
  options?: LogUiEventOptions,
): void {
  const debugEnabled = options?.debugEnabled ?? isUiDebugEnabled()
  if (level === "debug" && !debugEnabled) {
    return
  }

  const prefix = formatPrefix(context)
  const payload = {
    eventId: context.eventId,
    operationId: context.operationId,
    requestId: context.requestId,
    status: context.status,
    keyId: context.keyId,
    fingerprint: context.fingerprint,
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
