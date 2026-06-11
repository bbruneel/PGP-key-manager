import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { requestJson, requestText } from "@/lib/api-client"
import { keysApi } from "@/lib/keys-api"
import type { RegisterPgpKeyRequest } from "@/types/api"

vi.mock("@/lib/api-client", () => ({
  requestJson: vi.fn(),
  requestText: vi.fn(),
}))

describe("keysApi.list", () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("calls GET /api/keys with listKeys operationId", async () => {
    vi.mocked(requestJson).mockResolvedValue([{ id: "key-1", fingerprint: "ABCD" }])

    const result = await keysApi.list({ accessToken: "token-abc" })

    expect(requestJson).toHaveBeenCalledWith("/api/keys", {
      operationId: "listKeys",
      accessToken: "token-abc",
      method: "GET",
    })
    expect(result).toEqual([{ id: "key-1", fingerprint: "ABCD" }])
  })

  it("appends query filters when provided", async () => {
    vi.mocked(requestJson).mockResolvedValue([])

    await keysApi.list({
      accessToken: "token-abc",
      role: "primary",
      status: "active",
      capability: "sign",
    })

    expect(requestJson).toHaveBeenCalledWith(
      "/api/keys?role=primary&status=active&capability=sign",
      expect.objectContaining({ operationId: "listKeys" }),
    )
  })
})

describe("keysApi.create", () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset()
  })

  it("calls POST /api/keys with createKey operationId", async () => {
    const body = {
      label: "Work key",
      algorithmSpec: { algorithm: "ed25519" as const },
      userIds: [{ name: "Jane Doe", email: "jane@example.com" }],
      validity: { expiresAt: "2030-06-01T00:00:00Z" },
      passphrase: "test-passphrase-1",
      openpgpVersion: 4 as const,
    }
    vi.mocked(requestJson).mockResolvedValue({ id: "key-new", fingerprint: "ABCD1234" })

    const result = await keysApi.create({ accessToken: "token-abc", body })

    expect(requestJson).toHaveBeenCalledWith("/api/keys", {
      operationId: "createKey",
      accessToken: "token-abc",
      method: "POST",
      body,
    })
    expect(result).toEqual({ id: "key-new", fingerprint: "ABCD1234" })
  })
})

describe("keysApi.register", () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset()
  })

  it("calls POST /api/keys with register payload and createKey operationId", async () => {
    const body: RegisterPgpKeyRequest = {
      fingerprint: "DEADBEEF0123456789ABCDEF0123456789ABCD",
      keyType: "public",
      armoredPublic: "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nmQENBGexample\n-----END PGP PUBLIC KEY BLOCK-----",
    }
    vi.mocked(requestJson).mockResolvedValue({ id: "key-imported", fingerprint: body.fingerprint })

    const result = await keysApi.register({ accessToken: "token-abc", body })

    expect(requestJson).toHaveBeenCalledWith("/api/keys", {
      operationId: "createKey",
      accessToken: "token-abc",
      method: "POST",
      body,
    })
    expect(result).toEqual({ id: "key-imported", fingerprint: body.fingerprint })
    expect(body).not.toHaveProperty("passphrase")
    expect(body).not.toHaveProperty("algorithmSpec")
  })
})

describe("keysApi.get", () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset()
  })

  it("calls GET /api/keys/{keyId} with getKey operationId", async () => {
    vi.mocked(requestJson).mockResolvedValue({ id: "key-1", fingerprint: "ABCD" })

    const result = await keysApi.get({ accessToken: "token-abc", keyId: "key-1" })

    expect(requestJson).toHaveBeenCalledWith("/api/keys/key-1", {
      operationId: "getKey",
      accessToken: "token-abc",
      method: "GET",
    })
    expect(result).toEqual({ id: "key-1", fingerprint: "ABCD" })
  })
})

describe("keysApi.listSubkeys", () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset()
  })

  it("calls GET /api/keys/{primaryKeyId}/subkeys with listSubkeys operationId", async () => {
    vi.mocked(requestJson).mockResolvedValue([{ id: "sub-1", role: "subkey" }])

    const result = await keysApi.listSubkeys({
      accessToken: "token-abc",
      primaryKeyId: "primary-1",
    })

    expect(requestJson).toHaveBeenCalledWith("/api/keys/primary-1/subkeys", {
      operationId: "listSubkeys",
      accessToken: "token-abc",
      method: "GET",
    })
    expect(result).toEqual([{ id: "sub-1", role: "subkey" }])
  })
})

describe("keysApi.revoke", () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset()
  })

  it("calls POST /api/keys/{keyId}/revoke with revokeKey operationId", async () => {
    const body = { reason: "key_retired" as const, passphrase: "secret-pass" }
    vi.mocked(requestJson).mockResolvedValue({ id: "key-1", status: "revoked" })

    const result = await keysApi.revoke({ accessToken: "token-abc", keyId: "key-1", body })

    expect(requestJson).toHaveBeenCalledWith("/api/keys/key-1/revoke", {
      operationId: "revokeKey",
      accessToken: "token-abc",
      method: "POST",
      body,
    })
    expect(result).toEqual({ id: "key-1", status: "revoked" })
  })
})

describe("keysApi.extendExpiry", () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset()
  })

  it("calls POST /api/keys/{keyId}/extend-expiry with extendKeyExpiry operationId", async () => {
    const body = { expiresAt: "2031-06-01T00:00:00Z", passphrase: "secret-pass" }
    vi.mocked(requestJson).mockResolvedValue({ id: "key-1", expiresAt: body.expiresAt })

    const result = await keysApi.extendExpiry({ accessToken: "token-abc", keyId: "key-1", body })

    expect(requestJson).toHaveBeenCalledWith("/api/keys/key-1/extend-expiry", {
      operationId: "extendKeyExpiry",
      accessToken: "token-abc",
      method: "POST",
      body,
    })
    expect(result).toEqual({ id: "key-1", expiresAt: body.expiresAt })
  })
})

describe("keysApi.rotate", () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset()
  })

  it("calls POST /api/keys/{keyId}/rotate with rotateKey operationId", async () => {
    const body = {
      capabilities: ["encrypt" as const],
      algorithm: { algorithm: "cv25519" as const },
      passphrase: "secret-pass",
      revokePrevious: true,
    }
    vi.mocked(requestJson).mockResolvedValue({
      newKey: { id: "sub-new" },
      previousKey: { id: "sub-old", status: "revoked" },
    })

    const result = await keysApi.rotate({ accessToken: "token-abc", keyId: "sub-old", body })

    expect(requestJson).toHaveBeenCalledWith("/api/keys/sub-old/rotate", {
      operationId: "rotateKey",
      accessToken: "token-abc",
      method: "POST",
      body,
    })
    expect(result).toEqual({
      newKey: { id: "sub-new" },
      previousKey: { id: "sub-old", status: "revoked" },
    })
  })
})

describe("keysApi.createSubkey", () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset()
  })

  it("calls POST /api/keys/{primaryKeyId}/subkeys with createSubkey operationId", async () => {
    const body = {
      capabilities: ["encrypt" as const],
      algorithm: { algorithm: "cv25519" as const },
      validity: { expiresAt: "2031-06-01T00:00:00.000Z" },
      passphrase: "valid-passphrase",
    }
    vi.mocked(requestJson).mockResolvedValue({ id: "sub-new", fingerprint: "NEWFP" })

    const result = await keysApi.createSubkey({
      accessToken: "token-abc",
      primaryKeyId: "primary-1",
      body,
    })

    expect(requestJson).toHaveBeenCalledWith("/api/keys/primary-1/subkeys", {
      operationId: "createSubkey",
      accessToken: "token-abc",
      method: "POST",
      body,
    })
    expect(result).toEqual({ id: "sub-new", fingerprint: "NEWFP" })
  })
})

describe("keysApi.importSubkeysFromKeyring", () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset()
  })

  it("calls POST /api/keys/{primaryKeyId}/subkeys/import-from-keyring with importSubkeysFromKeyring operationId", async () => {
    vi.mocked(requestJson).mockResolvedValue({
      registered: [{ id: "sub-1", fingerprint: "SUBFP" }],
      skippedCount: 1,
    })

    const result = await keysApi.importSubkeysFromKeyring({
      accessToken: "token-abc",
      primaryKeyId: "primary-1",
    })

    expect(requestJson).toHaveBeenCalledWith("/api/keys/primary-1/subkeys/import-from-keyring", {
      operationId: "importSubkeysFromKeyring",
      accessToken: "token-abc",
      method: "POST",
    })
    expect(result).toEqual({
      registered: [{ id: "sub-1", fingerprint: "SUBFP" }],
      skippedCount: 1,
    })
  })
})

describe("keysApi.exportPublic", () => {
  beforeEach(() => {
    vi.mocked(requestText).mockReset()
  })

  it("calls GET /api/keys/{keyId}/export-public with exportPublicKey operationId", async () => {
    const armored = "-----BEGIN PGP PUBLIC KEY BLOCK-----\n\nmQENBGexample\n-----END PGP PUBLIC KEY BLOCK-----"
    vi.mocked(requestText).mockResolvedValue(armored)

    const result = await keysApi.exportPublic({ accessToken: "token-abc", keyId: "key-1" })

    expect(requestText).toHaveBeenCalledWith("/api/keys/key-1/export-public", {
      operationId: "exportPublicKey",
      accessToken: "token-abc",
      method: "GET",
      headers: { Accept: "application/pgp-keys" },
    })
    expect(result).toBe(armored)
  })
})
