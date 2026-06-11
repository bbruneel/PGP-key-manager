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
  PreviewImportSubkeysResponse,
  PreviewKeyringResponse,
  RegisterPgpKeyRequest,
  RevokeKeyRequest,
  RotateKeyRequest,
  RotateKeyResponse,
  UpdatePgpKeyRequest,
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

export type PreviewKeyringOptions = {
  accessToken: string
  body: RegisterPgpKeyRequest
}

export type PreviewImportSubkeysFromKeyringOptions = {
  accessToken: string
  primaryKeyId: string
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

export type ExportSshPublicKeyOptions = {
  accessToken: string
  keyId: string
}

export type UpdateKeyOptions = {
  accessToken: string
  keyId: string
  body: UpdatePgpKeyRequest
}

export type DeleteKeyOptions = {
  accessToken: string
  keyId: string
}

/**
 * Key API client. Phase 1 adds create; Phase 2 adds register (import);
 * Phase 3 adds detail, subkeys, and lifecycle actions; Phase 4 adds createSubkey;
 * Phase 5 adds importSubkeysFromKeyring; Phase 6 extends algorithm UI (see algorithm-spec.ts);
 * Phase 7 adds update and delete; Phase 8 adds previewKeyring and previewImportSubkeysFromKeyring.
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

  previewKeyring(options: PreviewKeyringOptions): Promise<PreviewKeyringResponse> {
    return requestJson<PreviewKeyringResponse>("/api/keys/preview", {
      operationId: "previewKeyring",
      accessToken: options.accessToken,
      method: "POST",
      body: options.body,
    })
  },

  previewImportSubkeysFromKeyring(
    options: PreviewImportSubkeysFromKeyringOptions,
  ): Promise<PreviewImportSubkeysResponse> {
    return requestJson<PreviewImportSubkeysResponse>(
      `/api/keys/${options.primaryKeyId}/subkeys/import-from-keyring/preview`,
      {
        operationId: "previewImportSubkeysFromKeyring",
        accessToken: options.accessToken,
        method: "POST",
      },
    )
  },

  get(options: GetKeyOptions): Promise<PgpKey> {
    return requestJson<PgpKey>(`/api/keys/${options.keyId}`, {
      operationId: "getKey",
      accessToken: options.accessToken,
      method: "GET",
    })
  },

  update(options: UpdateKeyOptions): Promise<PgpKey> {
    return requestJson<PgpKey>(`/api/keys/${options.keyId}`, {
      operationId: "updateKey",
      accessToken: options.accessToken,
      method: "PATCH",
      body: options.body,
    })
  },

  delete(options: DeleteKeyOptions): Promise<void> {
    return requestJson<void>(`/api/keys/${options.keyId}`, {
      operationId: "deleteKey",
      accessToken: options.accessToken,
      method: "DELETE",
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
      headers: { Accept: "application/pgp-keys" },
    })
  },

  exportSshPublic(options: ExportSshPublicKeyOptions): Promise<string> {
    return requestText(`/api/keys/${options.keyId}/export-ssh-public`, {
      operationId: "exportSshPublicKey",
      accessToken: options.accessToken,
      method: "GET",
      headers: { Accept: "text/plain" },
    })
  },
}
