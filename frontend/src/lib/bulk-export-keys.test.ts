import { beforeEach, describe, expect, it, vi } from "vitest"

import { keysApi } from "@/lib/keys-api"
import { bulkExportPublicKeys, joinArmoredBlocks } from "@/lib/bulk-export-keys"

vi.mock("@/lib/keys-api", () => ({
  keysApi: {
    exportPublic: vi.fn(),
  },
}))

describe("joinArmoredBlocks", () => {
  it("joins blocks with blank lines", () => {
    expect(joinArmoredBlocks(["block-a", "block-b"])).toBe("block-a\n\nblock-b")
  })
})

describe("bulkExportPublicKeys", () => {
  const getAccessToken = vi.fn()

  beforeEach(() => {
    getAccessToken.mockReset()
    vi.mocked(keysApi.exportPublic).mockReset()
    getAccessToken.mockResolvedValue("access-token")
  })

  it("exports all keys and joins armored blocks", async () => {
    vi.mocked(keysApi.exportPublic)
      .mockResolvedValueOnce("-----BEGIN PGP PUBLIC KEY BLOCK-----\nA")
      .mockResolvedValueOnce("-----BEGIN PGP PUBLIC KEY BLOCK-----\nB")

    const result = await bulkExportPublicKeys({
      keyIds: ["key-1", "key-2"],
      getAccessToken,
    })

    expect(keysApi.exportPublic).toHaveBeenCalledTimes(2)
    expect(result.succeeded).toEqual(["key-1", "key-2"])
    expect(result.failed).toEqual([])
    expect(result.armored).toBe(
      "-----BEGIN PGP PUBLIC KEY BLOCK-----\nA\n\n-----BEGIN PGP PUBLIC KEY BLOCK-----\nB",
    )
  })

  it("returns partial success when one export fails", async () => {
    vi.mocked(keysApi.exportPublic)
      .mockResolvedValueOnce("-----BEGIN PGP PUBLIC KEY BLOCK-----\nA")
      .mockRejectedValueOnce(new Error("export failed"))

    const result = await bulkExportPublicKeys({
      keyIds: ["key-1", "key-2"],
      getAccessToken,
    })

    expect(keysApi.exportPublic).toHaveBeenCalledTimes(2)
    expect(result.succeeded).toEqual(["key-1"])
    expect(result.failed).toEqual([{ keyId: "key-2", message: "export failed" }])
    expect(result.armored).toBe("-----BEGIN PGP PUBLIC KEY BLOCK-----\nA")
  })

  it("returns empty armored when first export fails", async () => {
    vi.mocked(keysApi.exportPublic)
      .mockRejectedValueOnce(new Error("first failed"))
      .mockResolvedValueOnce("-----BEGIN PGP PUBLIC KEY BLOCK-----\nB")

    const result = await bulkExportPublicKeys({
      keyIds: ["key-1", "key-2"],
      getAccessToken,
    })

    expect(keysApi.exportPublic).toHaveBeenCalledTimes(2)
    expect(result.succeeded).toEqual(["key-2"])
    expect(result.failed).toEqual([{ keyId: "key-1", message: "first failed" }])
    expect(result.armored).toBe("-----BEGIN PGP PUBLIC KEY BLOCK-----\nB")
  })

  it("returns all failures when every export fails", async () => {
    vi.mocked(keysApi.exportPublic)
      .mockRejectedValueOnce(new Error("first failed"))
      .mockRejectedValueOnce(new Error("second failed"))

    const result = await bulkExportPublicKeys({
      keyIds: ["key-1", "key-2"],
      getAccessToken,
    })

    expect(result.succeeded).toEqual([])
    expect(result.failed).toEqual([
      { keyId: "key-1", message: "first failed" },
      { keyId: "key-2", message: "second failed" },
    ])
    expect(result.armored).toBe("")
  })

  it("throws when access token fetch fails", async () => {
    getAccessToken.mockRejectedValue(new Error("auth failed"))

    await expect(
      bulkExportPublicKeys({
        keyIds: ["key-1"],
        getAccessToken,
      }),
    ).rejects.toThrow("auth failed")

    expect(keysApi.exportPublic).not.toHaveBeenCalled()
  })
})
