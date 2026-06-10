import type { AlgorithmSpec, PgpCapability } from "@/types/api"

export type AlgorithmId =
  | "rsa"
  | "ed25519"
  | "cv25519"
  | "ecdsa"
  | "ecdh"
  | "ed448"
  | "x448"

export type RsaKeySize = 2048 | 3072 | 4096
export type NistCurve = "P-256" | "P-384" | "P-521"
export type OpenpgpVersion = 4 | 6
export type AlgorithmContext = "subkey" | "primary"

export type AlgorithmFormValues = {
  algorithm: AlgorithmId
  keySize?: RsaKeySize
  curve?: NistCurve
}

export type AlgorithmOption = {
  id: AlgorithmId
  label: string
}

export type AlgorithmValidationResult = {
  valid: boolean
  error?: string
}

const ENCRYPT_ALGORITHMS: AlgorithmId[] = ["cv25519", "ecdh", "rsa", "x448"]
const SIGN_ALGORITHMS: AlgorithmId[] = ["ed25519", "ecdsa", "rsa", "ed448"]
const PRIMARY_ALGORITHMS: AlgorithmId[] = ["ed25519", "ecdsa", "rsa", "ed448"]
const V6_ONLY_ALGORITHMS: AlgorithmId[] = ["ed448", "x448"]

const ALGORITHM_LABELS: Record<AlgorithmId, string> = {
  ed25519: "Ed25519 (sign)",
  cv25519: "Cv25519 (encrypt)",
  rsa: "RSA",
  ecdsa: "ECDSA (sign)",
  ecdh: "ECDH (encrypt)",
  ed448: "Ed448 (sign, OpenPGP v6)",
  x448: "X448 (encrypt, OpenPGP v6)",
}

const PRIMARY_ALGORITHM_LABELS: Record<PrimaryAlgorithmId, string> = {
  ed25519: "Ed25519 (recommended)",
  rsa: "RSA 4096 (compatibility)",
  ecdsa: "ECDSA P-256 (compatibility)",
  ed448: "Ed448 (OpenPGP v6, high security)",
}

export type PrimaryAlgorithmId = "ed25519" | "rsa" | "ecdsa" | "ed448"
export type SubkeyAlgorithmId = AlgorithmId

export const DEFAULT_RSA_KEY_SIZE: RsaKeySize = 4096
export const UI_RSA_KEY_SIZES: RsaKeySize[] = [3072, 4096]
export const UI_NIST_CURVES: NistCurve[] = ["P-256", "P-384", "P-521"]
export const DEFAULT_NIST_CURVE: NistCurve = "P-256"

function requiresV6(algorithm: AlgorithmId): boolean {
  return V6_ONLY_ALGORITHMS.includes(algorithm)
}

function isAllowedForVersion(algorithm: AlgorithmId, openpgpVersion: OpenpgpVersion): boolean {
  if (requiresV6(algorithm)) {
    return openpgpVersion === 6
  }
  return true
}

function candidateAlgorithms(
  capabilities: PgpCapability[],
  context: AlgorithmContext,
): AlgorithmId[] {
  const needsEncrypt = capabilities.includes("encrypt")
  const needsSign =
    capabilities.includes("sign") ||
    capabilities.includes("authenticate") ||
    (context === "primary" && capabilities.includes("certify"))

  const candidates = new Set<AlgorithmId>()

  if (needsEncrypt) {
    for (const algorithm of ENCRYPT_ALGORITHMS) {
      candidates.add(algorithm)
    }
  }

  if (needsSign) {
    for (const algorithm of SIGN_ALGORITHMS) {
      candidates.add(algorithm)
    }
  }

  if (context === "primary") {
    return PRIMARY_ALGORITHMS.filter((algorithm) => candidates.has(algorithm))
  }

  return [...candidates]
}

export function filterAlgorithmsForCapabilities(
  capabilities: PgpCapability[],
  openpgpVersion: OpenpgpVersion = 4,
  context: AlgorithmContext = "subkey",
): AlgorithmOption[] {
  return candidateAlgorithms(capabilities, context)
    .filter((algorithm) => isAllowedForVersion(algorithm, openpgpVersion))
    .map((algorithm) => ({
      id: algorithm,
      label:
        context === "primary" && algorithm in PRIMARY_ALGORITHM_LABELS
          ? PRIMARY_ALGORITHM_LABELS[algorithm as PrimaryAlgorithmId]
          : ALGORITHM_LABELS[algorithm],
    }))
}

export function filterPrimaryAlgorithms(openpgpVersion: OpenpgpVersion): AlgorithmOption[] {
  return filterAlgorithmsForCapabilities(["certify", "sign"], openpgpVersion, "primary")
}

export function defaultAlgorithmForCapabilities(
  capabilities: PgpCapability[],
  openpgpVersion: OpenpgpVersion = 4,
  context: AlgorithmContext = "subkey",
): AlgorithmId {
  if (context === "primary") {
    return "ed25519"
  }

  if (capabilities.includes("encrypt") && !capabilities.includes("sign") && !capabilities.includes("authenticate")) {
    return openpgpVersion === 6 ? "cv25519" : "cv25519"
  }

  if (
    (capabilities.includes("sign") || capabilities.includes("authenticate")) &&
    !capabilities.includes("encrypt")
  ) {
    return "ed25519"
  }

  const allowed = filterAlgorithmsForCapabilities(capabilities, openpgpVersion, context)
  return allowed[0]?.id ?? "ed25519"
}

export function defaultPrimaryAlgorithmValues(
  algorithm: PrimaryAlgorithmId,
): { algorithm: PrimaryAlgorithmId; keySize?: RsaKeySize; curve?: NistCurve } {
  if (algorithm === "rsa") {
    return { algorithm, keySize: DEFAULT_RSA_KEY_SIZE }
  }
  if (algorithm === "ecdsa") {
    return { algorithm, curve: DEFAULT_NIST_CURVE }
  }
  return { algorithm }
}

export function isAlgorithmAllowedForCapabilities(
  algorithm: AlgorithmId,
  capabilities: PgpCapability[],
  openpgpVersion: OpenpgpVersion = 4,
  context: AlgorithmContext = "subkey",
): boolean {
  if (!isAllowedForVersion(algorithm, openpgpVersion)) {
    return false
  }

  return filterAlgorithmsForCapabilities(capabilities, openpgpVersion, context).some(
    (option) => option.id === algorithm,
  )
}

export function normalizeAlgorithmSelection(
  current: AlgorithmFormValues,
  capabilities: PgpCapability[],
  openpgpVersion: OpenpgpVersion = 4,
  context: AlgorithmContext = "subkey",
): AlgorithmFormValues {
  if (isAlgorithmAllowedForCapabilities(current.algorithm, capabilities, openpgpVersion, context)) {
    return current
  }

  const nextAlgorithm = defaultAlgorithmForCapabilities(capabilities, openpgpVersion, context)
  if (context === "primary" && isPrimaryAlgorithmId(nextAlgorithm)) {
    return defaultPrimaryAlgorithmValues(nextAlgorithm)
  }

  if (nextAlgorithm === "rsa") {
    return { algorithm: nextAlgorithm, keySize: current.keySize ?? DEFAULT_RSA_KEY_SIZE }
  }
  if (nextAlgorithm === "ecdsa" || nextAlgorithm === "ecdh") {
    return { algorithm: nextAlgorithm, curve: current.curve ?? DEFAULT_NIST_CURVE }
  }

  return { algorithm: nextAlgorithm }
}

function isPrimaryAlgorithmId(algorithm: AlgorithmId): algorithm is PrimaryAlgorithmId {
  return PRIMARY_ALGORITHMS.includes(algorithm)
}

export function validateAlgorithmSpec(
  capabilities: PgpCapability[],
  values: AlgorithmFormValues,
  context: AlgorithmContext,
  openpgpVersion: OpenpgpVersion = 4,
): AlgorithmValidationResult {
  if (!isAllowedForVersion(values.algorithm, openpgpVersion)) {
    return {
      valid: false,
      error: "Ed448 and X448 require OpenPGP v6",
    }
  }

  if (context === "primary" && (values.algorithm === "cv25519" || values.algorithm === "ecdh" || values.algorithm === "x448")) {
    return {
      valid: false,
      error: "Primary keys cannot use encryption-only algorithms",
    }
  }

  if (!isAlgorithmAllowedForCapabilities(values.algorithm, capabilities, openpgpVersion, context)) {
    if (capabilities.includes("encrypt") && !ENCRYPT_ALGORITHMS.includes(values.algorithm)) {
      return {
        valid: false,
        error: "Encryption requires Cv25519, ECDH, RSA, or X448",
      }
    }
    if (
      (capabilities.includes("sign") || capabilities.includes("authenticate")) &&
      !SIGN_ALGORITHMS.includes(values.algorithm)
    ) {
      return {
        valid: false,
        error: "Signing requires Ed25519, ECDSA, RSA, or Ed448",
      }
    }
    return {
      valid: false,
      error: "Selected algorithm is not compatible with the chosen capabilities",
    }
  }

  if (values.algorithm === "rsa" && values.keySize == null) {
    return {
      valid: false,
      error: "RSA requires a key size",
    }
  }

  if ((values.algorithm === "ecdsa" || values.algorithm === "ecdh") && !values.curve) {
    return {
      valid: false,
      error: "ECDSA and ECDH require a curve",
    }
  }

  return { valid: true }
}

export function applyCapabilityChangeToAlgorithmValues(
  current: AlgorithmFormValues,
  capabilities: PgpCapability[],
  openpgpVersion: OpenpgpVersion = 4,
  context: AlgorithmContext = "subkey",
): { next: AlgorithmFormValues; adjusted: boolean } {
  const next = normalizeAlgorithmSelection(current, capabilities, openpgpVersion, context)
  return {
    next,
    adjusted:
      next.algorithm !== current.algorithm ||
      next.keySize !== current.keySize ||
      next.curve !== current.curve,
  }
}

export function buildAlgorithmSpec(values: AlgorithmFormValues): AlgorithmSpec {
  const spec: AlgorithmSpec = {
    algorithm: values.algorithm,
  }

  if (values.algorithm === "rsa" && values.keySize != null) {
    spec.keySize = values.keySize
  }

  if ((values.algorithm === "ecdsa" || values.algorithm === "ecdh") && values.curve) {
    spec.curve = values.curve
  }

  return spec
}

export function algorithmFieldLabel(algorithm: string | null | undefined): string {
  if (!algorithm) {
    return "Unknown"
  }

  const normalized = algorithm.toLowerCase() as AlgorithmId
  if (normalized in ALGORITHM_LABELS) {
    return ALGORITHM_LABELS[normalized]
  }

  return algorithm
}
