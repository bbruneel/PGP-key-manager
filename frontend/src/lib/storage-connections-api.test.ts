import { beforeEach, describe, expect, it, vi } from "vitest"

import { requestJson } from "@/lib/api-client"
import { storageConnectionsApi } from "@/lib/storage-connections-api"

vi.mock("@/lib/api-client", () => ({
  requestJson: vi.fn(),
}))

describe("storageConnectionsApi", () => {
  const connection = {
    id: "conn-1",
    provider: "aws-s3" as const,
    displayName: "Personal vault",
    region: "eu-west-1",
    bucket: "acme-pgp-vault",
    prefix: "pgp-key-manager/",
    roleArn: "arn:aws:iam::123456789012:role/PgpKeyManager",
    externalId: "ext-1",
    status: "registered" as const,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  }

  beforeEach(() => {
    vi.mocked(requestJson).mockReset()
  })

  it("lists storage connections", async () => {
    vi.mocked(requestJson).mockResolvedValue([connection])

    const result = await storageConnectionsApi.list({ accessToken: "token-abc" })

    expect(requestJson).toHaveBeenCalledWith("/api/storage-connections", {
      operationId: "listStorageConnections",
      accessToken: "token-abc",
      method: "GET",
    })
    expect(result).toEqual([connection])
  })

  it("creates a storage connection", async () => {
    vi.mocked(requestJson).mockResolvedValue(connection)

    const body = {
      displayName: "Personal vault",
      region: "eu-west-1",
      bucket: "acme-pgp-vault",
      roleArn: "arn:aws:iam::123456789012:role/PgpKeyManager",
    }
    const result = await storageConnectionsApi.create({ accessToken: "token-abc", body })

    expect(requestJson).toHaveBeenCalledWith("/api/storage-connections", {
      operationId: "createStorageConnection",
      accessToken: "token-abc",
      method: "POST",
      body,
    })
    expect(result).toEqual(connection)
  })

  it("gets a storage connection", async () => {
    vi.mocked(requestJson).mockResolvedValue(connection)

    const result = await storageConnectionsApi.get({ accessToken: "token-abc", connectionId: "conn-1" })

    expect(requestJson).toHaveBeenCalledWith("/api/storage-connections/conn-1", {
      operationId: "getStorageConnection",
      accessToken: "token-abc",
      method: "GET",
    })
    expect(result).toEqual(connection)
  })

  it("updates a storage connection", async () => {
    vi.mocked(requestJson).mockResolvedValue({ ...connection, displayName: "Updated vault" })

    const body = { displayName: "Updated vault" }
    await storageConnectionsApi.update({ accessToken: "token-abc", connectionId: "conn-1", body })

    expect(requestJson).toHaveBeenCalledWith("/api/storage-connections/conn-1", {
      operationId: "updateStorageConnection",
      accessToken: "token-abc",
      method: "PATCH",
      body,
    })
  })

  it("deletes a storage connection", async () => {
    vi.mocked(requestJson).mockResolvedValue(undefined)

    await storageConnectionsApi.delete({ accessToken: "token-abc", connectionId: "conn-1" })

    expect(requestJson).toHaveBeenCalledWith("/api/storage-connections/conn-1", {
      operationId: "deleteStorageConnection",
      accessToken: "token-abc",
      method: "DELETE",
    })
  })
})
