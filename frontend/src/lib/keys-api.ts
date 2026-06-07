import { requestJson } from "@/lib/api-client"
import type { KeyRole, KeyStatus, PgpCapability, PgpKeyListItem } from "@/types/api"

export type ListKeysOptions = {
  accessToken: string
  role?: KeyRole
  status?: KeyStatus
  capability?: PgpCapability
}

/**
 * Key API client. Phase 0 implements list only; create/import/lifecycle will be added in later phases.
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
}
