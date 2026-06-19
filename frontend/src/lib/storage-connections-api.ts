import { requestJson, requestJsonWithStatus } from "@/lib/api-client"
import type {
  CreateStorageConnectionRequest,
  StorageConnectionResponse,
  TestStorageConnectionResponse,
  UpdateStorageConnectionRequest,
} from "@/types/api"

export type StorageConnectionIdOptions = {
  accessToken: string
  connectionId: string
}

export type CreateStorageConnectionOptions = {
  accessToken: string
  body: CreateStorageConnectionRequest
}

export type UpdateStorageConnectionOptions = {
  accessToken: string
  connectionId: string
  body: UpdateStorageConnectionRequest
}

export const storageConnectionsApi = {
  list(options: { accessToken: string }): Promise<StorageConnectionResponse[]> {
    return requestJson<StorageConnectionResponse[]>("/api/storage-connections", {
      operationId: "listStorageConnections",
      accessToken: options.accessToken,
      method: "GET",
    })
  },

  create(options: CreateStorageConnectionOptions): Promise<StorageConnectionResponse> {
    return requestJson<StorageConnectionResponse>("/api/storage-connections", {
      operationId: "createStorageConnection",
      accessToken: options.accessToken,
      method: "POST",
      body: options.body,
    })
  },

  get(options: StorageConnectionIdOptions): Promise<StorageConnectionResponse> {
    return requestJson<StorageConnectionResponse>(`/api/storage-connections/${options.connectionId}`, {
      operationId: "getStorageConnection",
      accessToken: options.accessToken,
      method: "GET",
    })
  },

  update(options: UpdateStorageConnectionOptions): Promise<StorageConnectionResponse> {
    return requestJson<StorageConnectionResponse>(`/api/storage-connections/${options.connectionId}`, {
      operationId: "updateStorageConnection",
      accessToken: options.accessToken,
      method: "PATCH",
      body: options.body,
    })
  },

  delete(options: StorageConnectionIdOptions): Promise<void> {
    return requestJson<void>(`/api/storage-connections/${options.connectionId}`, {
      operationId: "deleteStorageConnection",
      accessToken: options.accessToken,
      method: "DELETE",
    })
  },

  async test(options: StorageConnectionIdOptions): Promise<TestStorageConnectionResponse> {
    const { data } = await requestJsonWithStatus<TestStorageConnectionResponse>(
      `/api/storage-connections/${options.connectionId}/test`,
      {
        operationId: "testStorageConnection",
        accessToken: options.accessToken,
        method: "POST",
      },
      [502],
    )
    return data
  },
}
