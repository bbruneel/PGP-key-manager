import type { PgpCapability } from "@/types/api"

/** Keep in sync with backend `PgpKeyValidator.SSH_EXPORT_ALGORITHMS`. */
const SSH_EXPORT_ALGORITHMS = new Set(["ed25519", "rsa", "ecdsa"])

export function isSshExportableKey(
  capabilities: PgpCapability[] | null | undefined,
  algorithm: string | null | undefined,
): boolean {
  if (!capabilities?.includes("authenticate")) {
    return false
  }
  if (!algorithm) {
    return false
  }
  return SSH_EXPORT_ALGORITHMS.has(algorithm.toLowerCase())
}
