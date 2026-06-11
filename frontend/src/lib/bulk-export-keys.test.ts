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
    expect(result).toBe("-----BEGIN PGP PUBLIC KEY BLOCK-----\nA\n\n-----BEGIN PGP PUBLIC KEY BLOCK-----\nB")
  })

  it("aborts on first export failure", async () => {
    vi.mocked(keysApi.exportPublic)
      .mockResolvedValueOnce("-----BEGIN PGP PUBLIC KEY BLOCK-----\nA")
      .mockRejectedValueOnce(new Error("export failed"))

    await expect(
      bulkExportPublicKeys({
        keyIds: ["key-1", "key-2"],
        getAccessToken,
      }),
    ).rejects.toThrow("export failed")

    expect(keysApi.exportPublic).toHaveBeenCalledTimes(2)
  })
})
