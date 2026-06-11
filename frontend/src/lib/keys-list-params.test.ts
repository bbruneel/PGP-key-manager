import { describe, expect, it } from "vitest"

import {
  applyMaterialViewFilter,
  buildKeysListSearch,
  listOptionsFromParams,
  parseKeysListParams,
} from "@/lib/keys-list-params"
import type { PgpKeySummary } from "@/types/api"

describe("parseKeysListParams", () => {
  it("defaults to all primaries view", () => {
    expect(parseKeysListParams(new URLSearchParams())).toEqual({
      view: "all",
      status: undefined,
      capability: undefined,
    })
  })

  it("parses view, status, and capability", () => {
    const params = new URLSearchParams("view=subkeys&status=revoked&capability=sign")
    expect(parseKeysListParams(params)).toEqual({
      view: "subkeys",
      status: "revoked",
      capability: "sign",
    })
  })
})

describe("listOptionsFromParams", () => {
  it("maps subkeys view to role=subkey", () => {
    expect(listOptionsFromParams({ view: "subkeys", status: undefined, capability: undefined })).toEqual({
      role: "subkey",
      status: undefined,
      capability: undefined,
    })
  })

  it("maps all/public/private views to role=primary", () => {
    expect(listOptionsFromParams({ view: "public", status: "active", capability: undefined })).toEqual({
      role: "primary",
      status: "active",
      capability: undefined,
    })
  })
})

describe("applyMaterialViewFilter", () => {
  const keys: PgpKeySummary[] = [
    { id: "1", keyType: "public", fingerprint: "PUB" },
    { id: "2", keyType: "private", fingerprint: "PRIV" },
  ]

  it("filters public keys", () => {
    expect(applyMaterialViewFilter(keys, "public")).toEqual([keys[0]])
  })

  it("filters private keys", () => {
    expect(applyMaterialViewFilter(keys, "private")).toEqual([keys[1]])
  })

  it("returns all keys for non-material views", () => {
    expect(applyMaterialViewFilter(keys, "all")).toEqual(keys)
    expect(applyMaterialViewFilter(keys, "subkeys")).toEqual(keys)
  })
})

describe("buildKeysListSearch", () => {
  it("serializes non-default params", () => {
    expect(
      buildKeysListSearch({
        view: "private",
        status: "active",
        capability: "encrypt",
      }),
    ).toBe("?view=private&status=active&capability=encrypt")
  })

  it("omits default view", () => {
    expect(buildKeysListSearch({ view: "all", status: undefined, capability: undefined })).toBe("")
  })
})
