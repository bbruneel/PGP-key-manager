import type { PgpCapability } from "@/types/api"

/** Keep in sync with backend `PgpKeyValidator.validateEncryptPrivateExportable`. */
export function isEncryptPrivateExportableKey(
  capabilities: PgpCapability[] | null | undefined,
): boolean {
  return Boolean(capabilities?.includes("encrypt"))
}
