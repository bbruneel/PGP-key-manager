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
      groupId: "2cfb1f20-10c9-4de0-b8dc-d89bbf3ab5d9",
      scope: "group",
      status: "active",
      capability: "sign",
    })

    expect(requestJson).toHaveBeenCalledWith(
      "/api/keys?role=primary&groupId=2cfb1f20-10c9-4de0-b8dc-d89bbf3ab5d9&scope=group&status=active&capability=sign",
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
      updated: [],
      updatedCount: 0,
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
      updated: [],
      updatedCount: 0,
    })
  })
})

describe("keysApi.previewKeyring", () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset()
  })

  it("calls POST /api/keys/preview with previewKeyring operationId", async () => {
    vi.mocked(requestJson).mockResolvedValue({
      primary: { fingerprint: "PRIMARY", role: "primary", status: "active" },
      subkeys: [],
      warnings: [],
      source: "public",
    })

    const result = await keysApi.previewKeyring({
      accessToken: "token-abc",
      body: { keyType: "public", armoredPublic: "-----BEGIN PGP PUBLIC KEY BLOCK-----" },
    })

    expect(requestJson).toHaveBeenCalledWith("/api/keys/preview", {
      operationId: "previewKeyring",
      accessToken: "token-abc",
      method: "POST",
      body: { keyType: "public", armoredPublic: "-----BEGIN PGP PUBLIC KEY BLOCK-----" },
    })
    expect(result.source).toBe("public")
  })
})

describe("keysApi.previewImportSubkeysFromKeyring", () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset()
  })

  it("calls POST preview endpoint with previewImportSubkeysFromKeyring operationId", async () => {
    vi.mocked(requestJson).mockResolvedValue({
      wouldRegister: [],
      wouldUpdate: [],
      wouldSkipCount: 2,
      warnings: [],
      source: "private",
    })

    const result = await keysApi.previewImportSubkeysFromKeyring({
      accessToken: "token-abc",
      primaryKeyId: "primary-1",
    })

    expect(requestJson).toHaveBeenCalledWith(
      "/api/keys/primary-1/subkeys/import-from-keyring/preview",
      {
        operationId: "previewImportSubkeysFromKeyring",
        accessToken: "token-abc",
        method: "POST",
      },
    )
    expect(result.wouldSkipCount).toBe(2)
  })
})

describe("keysApi.update", () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset()
  })

  it("calls PATCH /api/keys/{keyId} with updateKey operationId", async () => {
    const body = { label: "Renamed key" }
    vi.mocked(requestJson).mockResolvedValue({ id: "key-1", label: "Renamed key" })

    const result = await keysApi.update({ accessToken: "token-abc", keyId: "key-1", body })

    expect(requestJson).toHaveBeenCalledWith("/api/keys/key-1", {
      operationId: "updateKey",
      accessToken: "token-abc",
      method: "PATCH",
      body,
    })
    expect(result).toEqual({ id: "key-1", label: "Renamed key" })
  })
})

describe("keysApi.delete", () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset()
  })

  it("calls DELETE /api/keys/{keyId} with deleteKey operationId", async () => {
    vi.mocked(requestJson).mockResolvedValue(undefined)

    await keysApi.delete({ accessToken: "token-abc", keyId: "key-1" })

    expect(requestJson).toHaveBeenCalledWith("/api/keys/key-1", {
      operationId: "deleteKey",
      accessToken: "token-abc",
      method: "DELETE",
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

describe("keysApi.exportSshPublic", () => {
  beforeEach(() => {
    vi.mocked(requestText).mockReset()
  })

  it("calls GET /api/keys/{keyId}/export-ssh-public with exportSshPublicKey operationId", async () => {
    const sshLine = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIExample openpgp:0xabcdef01"
    vi.mocked(requestText).mockResolvedValue(sshLine)

    const result = await keysApi.exportSshPublic({ accessToken: "token-abc", keyId: "key-1" })

    expect(requestText).toHaveBeenCalledWith("/api/keys/key-1/export-ssh-public", {
      operationId: "exportSshPublicKey",
      accessToken: "token-abc",
      method: "GET",
      headers: { Accept: "text/plain" },
    })
    expect(result).toBe(sshLine)
  })
})

describe("keysApi.exportSshPrivate", () => {
  beforeEach(() => {
    vi.mocked(requestText).mockReset()
  })

  it("calls POST /api/keys/{keyId}/export-ssh-private with exportSshPrivateKey operationId", async () => {
    const pem = "-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----\n"
    vi.mocked(requestText).mockResolvedValue(pem)

    const result = await keysApi.exportSshPrivate({
      accessToken: "token-abc",
      keyId: "key-1",
      body: { passphrase: "vault-pass-123" },
    })

    expect(requestText).toHaveBeenCalledWith("/api/keys/key-1/export-ssh-private", {
      operationId: "exportSshPrivateKey",
      accessToken: "token-abc",
      method: "POST",
      body: { passphrase: "vault-pass-123" },
      headers: { Accept: "text/plain" },
    })
    expect(result).toBe(pem)
  })
})

describe("keysApi.exportSshSetupPack", () => {
  beforeEach(() => {
    vi.mocked(requestJson).mockReset()
  })

  it("calls POST export-ssh-setup-pack and decodes the JSON envelope", async () => {
    const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04])
    const content = btoa(String.fromCharCode(...zipBytes))
    vi.mocked(requestJson).mockResolvedValue({
      filename: "bc-tst-ssh-setup.zip",
      archivePassword: "Abcdefghjk23456789mn",
      content,
    })

    const result = await keysApi.exportSshSetupPack({
      accessToken: "token-abc",
      keyId: "key-1",
      body: { passphrase: "vault-pass-123" },
    })

    expect(requestJson).toHaveBeenCalledWith("/api/keys/key-1/export-ssh-setup-pack", {
      operationId: "exportSshSetupPack",
      accessToken: "token-abc",
      method: "POST",
      body: { passphrase: "vault-pass-123" },
    })
    expect(result.filename).toBe("bc-tst-ssh-setup.zip")
    expect(result.archivePassword).toBe("Abcdefghjk23456789mn")
    expect(result.blob.type).toBe("application/zip")
    expect(new Uint8Array(await result.blob.arrayBuffer())).toEqual(zipBytes)
  })

  it("rejects when archive password is missing", async () => {
    vi.mocked(requestJson).mockResolvedValue({
      filename: "bc-tst-ssh-setup.zip",
      archivePassword: "",
      content: btoa("zip"),
    })

    await expect(
      keysApi.exportSshSetupPack({
        accessToken: "token-abc",
        keyId: "key-1",
        body: { passphrase: "vault-pass-123" },
      }),
    ).rejects.toThrow(/missing archive password/i)
  })
})
