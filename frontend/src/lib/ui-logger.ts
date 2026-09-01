export type UiLogLevel = "debug" | "info" | "warn" | "error"

export type TabDirection = "left" | "right" | "first" | "last"

export type UiLogContext = {
  eventId: string
  message: string
  operationId?: string
  requestId?: string
  status?: number
  keyId?: string
  groupId?: string
  connectionId?: string
  errorCategory?: string
  fingerprint?: string
  count?: number
  succeededCount?: number
  failedCount?: number
  failedKeyIds?: string[]
  algorithm?: string
  previousAlgorithm?: string
  capabilities?: string[]
  openpgpVersion?: number
  view?: string
  keyStatus?: string
  filterCapability?: string
  tab?: string
  direction?: TabDirection
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
    groupId: context.groupId,
    connectionId: context.connectionId,
    errorCategory: context.errorCategory,
    fingerprint: context.fingerprint,
    count: context.count,
    succeededCount: context.succeededCount,
    failedCount: context.failedCount,
    failedKeyIds: context.failedKeyIds,
    algorithm: context.algorithm,
    previousAlgorithm: context.previousAlgorithm,
    capabilities: context.capabilities,
    openpgpVersion: context.openpgpVersion,
    view: context.view,
    keyStatus: context.keyStatus,
    filterCapability: context.filterCapability,
    tab: context.tab,
    direction: context.direction,
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
