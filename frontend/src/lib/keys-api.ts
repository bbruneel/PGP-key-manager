import { requestJson, requestText } from "@/lib/api-client"
import type {
  CreatePgpKeyRequest,
  CreateSubkeyRequest,
  ExtendExpiryRequest,
  KeyRole,
  KeyStatus,
  PgpCapability,
  PgpKey,
  ImportSubkeysResponse,
  PgpKeySummary,
  RegisterPgpKeyRequest,
  RevokeKeyRequest,
  RotateKeyRequest,
  RotateKeyResponse,
} from "@/types/api"

export type ListKeysOptions = {
  accessToken: string
  role?: KeyRole
  status?: KeyStatus
  capability?: PgpCapability
}

export type CreateKeyOptions = {
  accessToken: string
  body: CreatePgpKeyRequest
}

export type RegisterKeyOptions = {
  accessToken: string
  body: RegisterPgpKeyRequest
}

export type GetKeyOptions = {
  accessToken: string
  keyId: string
}

export type ListSubkeysOptions = {
  accessToken: string
  primaryKeyId: string
}

export type CreateSubkeyOptions = {
  accessToken: string
  primaryKeyId: string
  body: CreateSubkeyRequest
}

export type ImportSubkeysFromKeyringOptions = {
  accessToken: string
  primaryKeyId: string
}

export type RevokeKeyOptions = {
  accessToken: string
  keyId: string
  body: RevokeKeyRequest
}

export type ExtendExpiryOptions = {
  accessToken: string
  keyId: string
  body: ExtendExpiryRequest
}

export type RotateKeyOptions = {
  accessToken: string
  keyId: string
  body: RotateKeyRequest
}

export type ExportPublicKeyOptions = {
  accessToken: string
  keyId: string
}

/**
 * Key API client. Phase 1 adds create; Phase 2 adds register (import);
 * Phase 3 adds detail, subkeys, and lifecycle actions; Phase 4 adds createSubkey;
 * Phase 5 adds importSubkeysFromKeyring.
 */
export const keysApi = {
  list(options: ListKeysOptions): Promise<PgpKeySummary[]> {
    const params = new URLSearchParams()
    if (options.role) {
      params.set("role", options.role)
    }
    if (options.status) {
      params.set("status", options.status)
    }
    if (options.capability) {
      params.set("capability", options.capability)
    }
    const query = params.toString()
    const path = query ? `/api/keys?${query}` : "/api/keys"

    return requestJson<PgpKeySummary[]>(path, {
      operationId: "listKeys",
      accessToken: options.accessToken,
      method: "GET",
    })
  },

  create(options: CreateKeyOptions): Promise<PgpKey> {
    return requestJson<PgpKey>("/api/keys", {
      operationId: "createKey",
      accessToken: options.accessToken,
      method: "POST",
      body: options.body,
    })
  },

  /**
   * Register/import an existing key via POST /api/keys (register path).
   * Callers must use buildImportKeyRequest — do not send passphrase or algorithmSpec.
   */
  register(options: RegisterKeyOptions): Promise<PgpKey> {
    return requestJson<PgpKey>("/api/keys", {
      operationId: "createKey",
      accessToken: options.accessToken,
      method: "POST",
      body: options.body,
    })
  },

  get(options: GetKeyOptions): Promise<PgpKey> {
    return requestJson<PgpKey>(`/api/keys/${options.keyId}`, {
      operationId: "getKey",
      accessToken: options.accessToken,
      method: "GET",
    })
  },

  listSubkeys(options: ListSubkeysOptions): Promise<PgpKeySummary[]> {
    return requestJson<PgpKeySummary[]>(`/api/keys/${options.primaryKeyId}/subkeys`, {
      operationId: "listSubkeys",
      accessToken: options.accessToken,
      method: "GET",
    })
  },

  createSubkey(options: CreateSubkeyOptions): Promise<PgpKey> {
    return requestJson<PgpKey>(`/api/keys/${options.primaryKeyId}/subkeys`, {
      operationId: "createSubkey",
      accessToken: options.accessToken,
      method: "POST",
      body: options.body,
    })
  },

  importSubkeysFromKeyring(
    options: ImportSubkeysFromKeyringOptions,
  ): Promise<ImportSubkeysResponse> {
    return requestJson<ImportSubkeysResponse>(
      `/api/keys/${options.primaryKeyId}/subkeys/import-from-keyring`,
      {
        operationId: "importSubkeysFromKeyring",
        accessToken: options.accessToken,
        method: "POST",
      },
    )
  },

  revoke(options: RevokeKeyOptions): Promise<PgpKey> {
    return requestJson<PgpKey>(`/api/keys/${options.keyId}/revoke`, {
      operationId: "revokeKey",
      accessToken: options.accessToken,
      method: "POST",
      body: options.body,
    })
  },

  extendExpiry(options: ExtendExpiryOptions): Promise<PgpKey> {
    return requestJson<PgpKey>(`/api/keys/${options.keyId}/extend-expiry`, {
      operationId: "extendKeyExpiry",
      accessToken: options.accessToken,
      method: "POST",
      body: options.body,
    })
  },

  rotate(options: RotateKeyOptions): Promise<RotateKeyResponse> {
    return requestJson<RotateKeyResponse>(`/api/keys/${options.keyId}/rotate`, {
      operationId: "rotateKey",
      accessToken: options.accessToken,
      method: "POST",
      body: options.body,
    })
  },

  exportPublic(options: ExportPublicKeyOptions): Promise<string> {
    return requestText(`/api/keys/${options.keyId}/export-public`, {
      operationId: "exportPublicKey",
      accessToken: options.accessToken,
      method: "GET",
    })
  },
}
