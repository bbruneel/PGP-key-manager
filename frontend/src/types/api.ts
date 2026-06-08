import type { components } from "@/types/api.generated"

export type ProblemDetail = components["schemas"]["ProblemDetail"]
export type PgpKeySummary = components["schemas"]["PgpKeySummary"]
export type PgpKey = components["schemas"]["PgpKey"]
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

/** List item fields the API returns; OpenAPI PgpKeySummary is incomplete for label/keyId/algorithm. */
export type PgpKeyListItem = PgpKeySummary & {
  label?: string | null
  keyId?: string | null
  algorithm?: string | null
}
