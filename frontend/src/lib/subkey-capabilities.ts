import type { PgpCapability } from "@/types/api"

/** Subkey capabilities allowed by the API (certify is primary-only). */
export const SUBKEY_CAPABILITY_OPTIONS: PgpCapability[] = ["sign", "encrypt", "authenticate"]

export function isValidSubkeyCapabilitySet(capabilities: PgpCapability[]): boolean {
  if (capabilities.length === 0) {
    return false
  }
  return !capabilities.includes("certify")
}
