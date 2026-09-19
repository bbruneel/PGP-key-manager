import type { KeyRole, KeyStatus } from "@/types/api"

/** Primary secret keyring export visibility — keep in sync with backend exportPrivate gates. */
export function isPrivateKeyringExportableKey(options: {
  role?: KeyRole | string | null
  hasPrivateMaterial: boolean
  status?: KeyStatus | string | null
}): boolean {
  if (options.role !== "primary") {
    return false
  }
  if (!options.hasPrivateMaterial) {
    return false
  }
  if (options.status === "revoked") {
    return false
  }
  return true
}
