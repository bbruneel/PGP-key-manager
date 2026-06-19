import { describe, expect, it } from "vitest"

import { ApiError } from "@/lib/api-error"
import { mapStorageConnectionApiError } from "@/lib/map-storage-connection-api-error"
import { validateStorageConnectionForm } from "@/lib/storage-connection-validation"

describe("validateStorageConnectionForm", () => {
  it("rejects invalid IAM role ARN format", () => {
    const errors = validateStorageConnectionForm({
      displayName: "test",
      region: "eu-west-1",
      bucket: "my-bucket",
      prefix: "",
      roleArn: "role",
    })

    expect(errors.roleArn).toMatch(/valid aws iam role arn/i)
  })

  it("accepts a valid IAM role ARN", () => {
    const errors = validateStorageConnectionForm({
      displayName: "test",
      region: "eu-west-1",
      bucket: "my-bucket",
      prefix: "",
      roleArn: "arn:aws:iam::123456789012:role/PgpKeyManager",
    })

    expect(errors).toEqual({})
  })
})

describe("mapStorageConnectionApiError", () => {
  it("maps roleArn bad request detail to a field error", () => {
    const error = new ApiError({
      operationId: "createStorageConnection",
      status: 400,
      title: "Bad Request",
      detail: "roleArn must be a valid AWS IAM role ARN",
    })

    const mapped = mapStorageConnectionApiError(error)

    expect(mapped.fieldErrors.roleArn).toBe("roleArn must be a valid AWS IAM role ARN")
    expect(mapped.bannerMessage).toBeNull()
  })

  it("maps duplicate display name conflict to a field error", () => {
    const error = new ApiError({
      operationId: "createStorageConnection",
      status: 409,
      title: "Conflict",
      detail: "A storage connection with this display name already exists",
    })

    const mapped = mapStorageConnectionApiError(error)

    expect(mapped.fieldErrors.displayName).toContain("display name")
    expect(mapped.bannerMessage).toBeNull()
  })

  it("keeps unmapped errors as a banner message", () => {
    const error = new ApiError({
      operationId: "createStorageConnection",
      status: 500,
      title: "Internal Server Error",
      detail: "Unexpected failure",
    })

    const mapped = mapStorageConnectionApiError(error)

    expect(mapped.fieldErrors).toEqual({})
    expect(mapped.bannerMessage).toBe("Unexpected failure")
  })
})
