export function formatKeyExpiry(expiresAt: string | null | undefined): string {
  if (!expiresAt) {
    return "Does not expire"
  }

  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) {
    return "Does not expire"
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

export function formatCapabilities(capabilities: readonly string[] | null | undefined): string {
  if (!capabilities || capabilities.length === 0) {
    return "certify"
  }

  return capabilities.join(", ")
}
