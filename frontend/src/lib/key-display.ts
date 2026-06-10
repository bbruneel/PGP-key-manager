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

export type KeyStatusValue = "active" | "expired" | "revoked"

export function formatKeyStatus(status: KeyStatusValue | string | null | undefined): string {
  switch (status) {
    case "active":
      return "Active"
    case "expired":
      return "Expired"
    case "revoked":
      return "Revoked"
    default:
      return "Unknown"
  }
}

export function formatRevokedAt(revokedAt: string | null | undefined): string | null {
  if (!revokedAt) {
    return null
  }

  const date = new Date(revokedAt)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

export function hasPrivateMaterial(key: {
  encryptedPrivateArmored?: string | null
  keyType?: string | null
}): boolean {
  if (key.encryptedPrivateArmored) {
    return true
  }
  return key.keyType === "private"
}

export function hasArmoredKeyring(key: {
  armoredPublic?: string | null
  encryptedPrivateArmored?: string | null
}): boolean {
  return Boolean(key.armoredPublic?.trim() || key.encryptedPrivateArmored?.trim())
}
