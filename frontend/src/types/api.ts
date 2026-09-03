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
  "label" | "keyType" | "armoredPublic" | "encryptedPrivateArmored" | "ownerGroupId"
> & {
  fingerprint?: CreatePgpKeyRequest["fingerprint"]
}
export type KeyRole = components["schemas"]["KeyRole"]
export type KeyStatus = components["schemas"]["KeyStatus"]
export type PgpCapability = components["schemas"]["PgpCapability"]
export type HelloResponse = components["schemas"]["HelloResponse"]
export type RevokeKeyRequest = components["schemas"]["RevokeKeyRequest"]
export type ExtendExpiryRequest = components["schemas"]["ExtendExpiryRequest"]
export type ExportSshPrivateRequest = components["schemas"]["ExportSshPrivateRequest"]
export type SshSetupPackResponse = components["schemas"]["SshSetupPackResponse"]
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
export type TransferOwnershipRequest = components["schemas"]["TransferOwnershipRequest"]

export type GroupMembershipRole = "owner" | "member"

export type Group = {
  id: string
  name: string
  description?: string | null
  ownerUserId: string
  createdAt: string
  updatedAt: string
}

export type CreateGroupRequest = {
  name: string
  description?: string
}

export type UpdateGroupRequest = {
  name?: string
  description?: string
}

export type GroupMember = {
  groupId: string
  userId: string
  role: GroupMembershipRole
  invitedByUserId?: string | null
  joinedAt: string
}

export type CreateGroupInviteRequest = {
  email?: string
  inviteeUserId?: string
  role?: GroupMembershipRole
  expiresAt?: string
}

export type GroupInvite = {
  id: string
  groupId: string
  token: string
  email?: string | null
  inviteeUserId?: string | null
  role: GroupMembershipRole
  invitedByUserId: string
  expiresAt?: string | null
  acceptedAt?: string | null
  createdAt: string
}

export type GroupSummary = {
  group: Group
  memberCount: number
  pendingInviteCount: number
  keyCount: number
}

export type AcceptInviteResponse = {
  inviteId: string
  groupId: string
  role: GroupMembershipRole
  acceptedAt?: string | null
}

export type AdminGroup = {
  id: string
  name: string
  description?: string | null
  ownerUserId: string
  memberCount: number
  keyCount: number
  createdAt: string
  updatedAt: string
}

export type AdminUser = {
  id: string
  auth0Sub: string
  email: string
  displayName?: string | null
  platformRole: string
  createdAt: string
}

export type StorageConnectionResponse = components["schemas"]["StorageConnectionResponse"]
export type CreateStorageConnectionRequest = components["schemas"]["CreateStorageConnectionRequest"]
export type UpdateStorageConnectionRequest = components["schemas"]["UpdateStorageConnectionRequest"]
