import type { components } from "@/types/api.generated"

export type ProblemDetail = components["schemas"]["ProblemDetail"]
export type PgpKeySummary = components["schemas"]["PgpKeySummary"]
export type PgpKey = components["schemas"]["PgpKey"] & {
  registeredSubkeyCount?: number
}
export type CreatePgpKeyRequest = components["schemas"]["CreatePgpKeyRequest"]

/** Register/import path for POST /api/keys — omit generate-only fields. */
export type RegisterPgpKeyRequest = Pick<
  CreatePgpKeyRequest,
  "label" | "keyType" | "armoredPublic" | "encryptedPrivateArmored"
> & {
  fingerprint?: CreatePgpKeyRequest["fingerprint"]
}
export type KeyRole = components["schemas"]["KeyRole"]
export type KeyStatus = components["schemas"]["KeyStatus"]
export type PgpCapability = components["schemas"]["PgpCapability"]
export type HelloResponse = components["schemas"]["HelloResponse"]
export type RevokeKeyRequest = components["schemas"]["RevokeKeyRequest"]
export type ExtendExpiryRequest = components["schemas"]["ExtendExpiryRequest"]
export type CreateSubkeyRequest = components["schemas"]["CreateSubkeyRequest"]
export type RotateKeyRequest = components["schemas"]["RotateKeyRequest"]
export type RotateKeyResponse = components["schemas"]["RotateKeyResponse"]
export type ImportSubkeysResponse = components["schemas"]["ImportSubkeysResponse"] & {
  updated?: PgpKeySummary[]
  updatedCount?: number
}
export type PreviewKeyEntry = {
  role: KeyRole
  fingerprint: string
  keyId: string
  algorithm: string
  capabilities: PgpCapability[]
  expiresAt?: string | null
  status: KeyStatus
  revokedAt?: string | null
  revocationReason?: string | null
  openpgpVersion: 4 | 6
}
export type PreviewKeyringResponse = {
  primary: PreviewKeyEntry
  subkeys: PreviewKeyEntry[]
  warnings: string[]
  source: "public" | "private" | "both"
}
export type PreviewImportSubkeysResponse = {
  wouldRegister: PreviewKeyEntry[]
  wouldUpdate: PreviewKeyEntry[]
  wouldSkipCount: number
  warnings: string[]
  source: "public" | "private" | "both"
}
export type AlgorithmSpec = components["schemas"]["AlgorithmSpec"]
export type UpdatePgpKeyRequest = components["schemas"]["UpdatePgpKeyRequest"]
