import { requestJson } from "@/lib/api-client"
import type {
  CreatePgpKeyRequest,
  KeyRole,
  KeyStatus,
  PgpCapability,
  PgpKey,
  PgpKeyListItem,
  RegisterPgpKeyRequest,
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

/**
 * Key API client. Phase 1 adds create; Phase 2 adds register (import).
 */
export const keysApi = {
  list(options: ListKeysOptions): Promise<PgpKeyListItem[]> {
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

    return requestJson<PgpKeyListItem[]>(path, {
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
}
