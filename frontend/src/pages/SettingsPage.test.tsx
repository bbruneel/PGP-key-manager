import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SettingsPage } from "@/pages/SettingsPage"

vi.mock("@/hooks/use-api-access-token", () => ({
  useApiAccessToken: vi.fn(),
}))

vi.mock("@/lib/storage-connections-api", () => ({
  storageConnectionsApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

import { useApiAccessToken } from "@/hooks/use-api-access-token"
import { ApiError } from "@/lib/api-error"
import { storageConnectionsApi } from "@/lib/storage-connections-api"

const connection = {
  id: "conn-1",
  provider: "aws-s3" as const,
  displayName: "Personal vault",
  region: "eu-west-1",
  bucket: "acme-pgp-vault",
  prefix: "pgp-key-manager/",
  roleArn: "arn:aws:iam::123456789012:role/PgpKeyManager",
  externalId: "ext-123",
  status: "registered" as const,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.mocked(useApiAccessToken).mockReturnValue({
      getAccessToken: vi.fn().mockResolvedValue("token"),
      isAuthenticated: true,
      isConfigured: true,
      isLoading: false,
      authError: null,
    })
    vi.mocked(storageConnectionsApi.list).mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renders storage connections section when authenticated", async () => {
    render(<SettingsPage />)

    expect(await screen.findByRole("heading", { name: /^settings$/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /^cloud storage connections$/i, level: 3 })).toBeInTheDocument()
    expect(screen.getByText(/no storage connections yet/i)).toBeInTheDocument()
  })

  it("shows field errors when required inputs are missing", async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    await user.click(await screen.findByRole("button", { name: /add aws s3 connection/i }))
    await user.click(screen.getByRole("button", { name: /add connection/i }))

    expect(await screen.findByText("Connection name is required")).toBeInTheDocument()
    expect(screen.getByText("Region is required")).toBeInTheDocument()
    expect(screen.getByText("Bucket is required")).toBeInTheDocument()
    expect(screen.getByText("IAM role ARN is required")).toBeInTheDocument()
    expect(storageConnectionsApi.create).not.toHaveBeenCalled()
  })

  it("shows field error for invalid IAM role ARN before submit", async () => {
    const user = userEvent.setup()
    render(<SettingsPage />)

    await user.click(await screen.findByRole("button", { name: /add aws s3 connection/i }))
    await user.type(screen.getByLabelText(/connection name/i), "test")
    await user.type(screen.getByLabelText(/^region$/i), "eu-west-1")
    await user.type(screen.getByLabelText(/^bucket$/i), "my-bucket")
    await user.type(screen.getByLabelText(/iam role arn/i), "role")
    await user.click(screen.getByRole("button", { name: /add connection/i }))

    expect(await screen.findByText(/valid aws iam role arn/i)).toBeInTheDocument()
    expect(storageConnectionsApi.create).not.toHaveBeenCalled()
  })

  it("shows API field errors inline when create returns bad request", async () => {
    const user = userEvent.setup()
    vi.mocked(storageConnectionsApi.create).mockRejectedValue(
      new ApiError({
        operationId: "createStorageConnection",
        status: 400,
        title: "Bad Request",
        detail: "bucket must be at most 255 characters",
        fieldErrors: [{ field: "bucket", message: "bucket must be at most 255 characters" }],
      }),
    )

    render(<SettingsPage />)

    await user.click(await screen.findByRole("button", { name: /add aws s3 connection/i }))
    await user.type(screen.getByLabelText(/connection name/i), "test")
    await user.type(screen.getByLabelText(/^region$/i), "eu-west-1")
    await user.type(screen.getByLabelText(/^bucket$/i), "acme-pgp-vault")
    await user.type(screen.getByLabelText(/iam role arn/i), "arn:aws:iam::123456789012:role/PgpKeyManager")
    await user.click(screen.getByRole("button", { name: /add connection/i }))

    expect(await screen.findByText("bucket must be at most 255 characters")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("shows API field errors inline when create returns conflict", async () => {
    const user = userEvent.setup()
    vi.mocked(storageConnectionsApi.create).mockRejectedValue(
      new ApiError({
        operationId: "createStorageConnection",
        status: 409,
        title: "Conflict",
        detail: "A storage connection with this display name already exists",
        fieldErrors: [
          {
            field: "displayName",
            message: "A storage connection with this display name already exists",
          },
        ],
      }),
    )

    render(<SettingsPage />)

    await user.click(await screen.findByRole("button", { name: /add aws s3 connection/i }))
    await user.type(screen.getByLabelText(/connection name/i), "test")
    await user.type(screen.getByLabelText(/^region$/i), "eu-west-1")
    await user.type(screen.getByLabelText(/^bucket$/i), "acme-pgp-vault")
    await user.type(screen.getByLabelText(/iam role arn/i), "arn:aws:iam::123456789012:role/PgpKeyManager")
    await user.click(screen.getByRole("button", { name: /add connection/i }))

    expect(await screen.findByText("A storage connection with this display name already exists")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("creates a storage connection from the form", async () => {
    const user = userEvent.setup()
    vi.mocked(storageConnectionsApi.create).mockResolvedValue(connection)

    render(<SettingsPage />)

    await user.click(await screen.findByRole("button", { name: /add aws s3 connection/i }))
    await user.type(screen.getByLabelText(/connection name/i), "Personal vault")
    await user.type(screen.getByLabelText(/^region$/i), "eu-west-1")
    await user.type(screen.getByLabelText(/^bucket$/i), "acme-pgp-vault")
    await user.type(screen.getByLabelText(/iam role arn/i), "arn:aws:iam::123456789012:role/PgpKeyManager")
    await user.click(screen.getByRole("button", { name: /add connection/i }))

    await waitFor(() => {
      expect(storageConnectionsApi.create).toHaveBeenCalledWith({
        accessToken: "token",
        body: {
          displayName: "Personal vault",
          region: "eu-west-1",
          bucket: "acme-pgp-vault",
          roleArn: "arn:aws:iam::123456789012:role/PgpKeyManager",
        },
      })
    })
    expect(await screen.findByText("Personal vault")).toBeInTheDocument()
  })
})
