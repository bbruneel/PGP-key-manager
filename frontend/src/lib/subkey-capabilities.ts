import type { PgpCapability } from "@/types/api"

/** Subkey capabilities allowed by the API (certify is primary-only). */
export const SUBKEY_CAPABILITY_OPTIONS: PgpCapability[] = ["sign", "encrypt", "authenticate"]

/** OpenPGP best practice: use separate subkeys for encryption and SSH authentication. */
const MUTUALLY_EXCLUSIVE: Partial<Record<PgpCapability, PgpCapability[]>> = {
  encrypt: ["authenticate"],
  authenticate: ["encrypt"],
}

export function isValidSubkeyCapabilitySet(capabilities: PgpCapability[]): boolean {
  if (capabilities.length === 0) {
    return false
  }
  if (capabilities.includes("certify")) {
    return false
  }
  return !(capabilities.includes("encrypt") && capabilities.includes("authenticate"))
}

/**
 * Toggles a subkey capability, keeping at least one selected and enforcing
 * encrypt/authenticate exclusivity. Returns null when the last capability would be removed.
 */
export function toggleSubkeyCapability(
  current: PgpCapability[],
  toggled: PgpCapability,
): PgpCapability[] | null {
  if (current.includes(toggled)) {
    if (current.length === 1) {
      return null
    }
    return current.filter((capability) => capability !== toggled)
  }

  let next = [...current, toggled]
  for (const exclusive of MUTUALLY_EXCLUSIVE[toggled] ?? []) {
    next = next.filter((capability) => capability !== exclusive)
  }
  return next
}
