import { hasPrivateMaterial } from "@/lib/key-display"
import type { ListKeysOptions } from "@/lib/keys-api"
import type { KeyStatus, PgpCapability, PgpKeySummary } from "@/types/api"

export type KeysListView = "all" | "public" | "private" | "subkeys"

export type KeysListParams = {
  view: KeysListView
  status?: KeyStatus
  capability?: PgpCapability
}

const VALID_VIEWS: KeysListView[] = ["all", "public", "private", "subkeys"]
const VALID_STATUSES: KeyStatus[] = ["active", "revoked", "expired"]
const VALID_CAPABILITIES: PgpCapability[] = ["certify", "sign", "encrypt", "authenticate"]

function parseView(value: string | null): KeysListView {
  if (value && VALID_VIEWS.includes(value as KeysListView)) {
    return value as KeysListView
  }
  return "all"
}

function parseStatus(value: string | null): KeyStatus | undefined {
  if (value && VALID_STATUSES.includes(value as KeyStatus)) {
    return value as KeyStatus
  }
  return undefined
}

function parseCapability(value: string | null): PgpCapability | undefined {
  if (value && VALID_CAPABILITIES.includes(value as PgpCapability)) {
    return value as PgpCapability
  }
  return undefined
}

export function parseKeysListParams(searchParams: URLSearchParams): KeysListParams {
  return {
    view: parseView(searchParams.get("view")),
    status: parseStatus(searchParams.get("status")),
    capability: parseCapability(searchParams.get("capability")),
  }
}

export function listOptionsFromParams(params: KeysListParams): Pick<ListKeysOptions, "role" | "status" | "capability"> {
  return {
    role: params.view === "subkeys" ? "subkey" : "primary",
    status: params.status,
    capability: params.capability,
  }
}

export function applyMaterialViewFilter(keys: PgpKeySummary[], view: KeysListView): PgpKeySummary[] {
  if (view === "public") {
    return keys.filter((key) => key.keyType === "public" && !hasPrivateMaterial(key))
  }
  if (view === "private") {
    return keys.filter((key) => hasPrivateMaterial(key))
  }
  return keys
}

export function buildKeysListSearch(params: KeysListParams): string {
  const search = new URLSearchParams()
  if (params.view !== "all") {
    search.set("view", params.view)
  }
  if (params.status) {
    search.set("status", params.status)
  }
  if (params.capability) {
    search.set("capability", params.capability)
  }
  const query = search.toString()
  return query ? `?${query}` : ""
}
