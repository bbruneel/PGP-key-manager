export const AUTH0_SCOPE = "openid profile email offline_access"

export function isRecoverableAuthError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase()
  if (!message) {
    return false
  }

  return (
    message.includes("missing refresh token") ||
    message.includes("login_required") ||
    message.includes("login required") ||
    message.includes("consent_required") ||
    message.includes("consent required") ||
    message.includes("invalid_grant")
  )
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === "string") {
    return error
  }
  return ""
}

export function authLoginParams(prompt?: "login") {
  return {
    scope: AUTH0_SCOPE,
    ...(prompt ? { prompt } : {}),
  }
}
