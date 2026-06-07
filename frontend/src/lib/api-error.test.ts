import { describe, expect, it } from "vitest"

import { ApiError, getApiErrorMessage, parseApiError } from "@/lib/api-error"

function mockResponse(
  status: number,
  body: string | null,
  contentType = "application/problem+json",
): Response {
  const headers = new Headers()
  if (contentType) {
    headers.set("content-type", contentType)
  }
  return {
    ok: false,
    status,
    headers,
    json: async () => JSON.parse(body ?? "{}"),
    text: async () => body ?? "",
  } as Response
}

describe("parseApiError", () => {
  it("parses RFC 7807 ProblemDetail with validation errors", async () => {
    const response = mockResponse(
      400,
      JSON.stringify({
        title: "Bad Request",
        status: 400,
        detail: "Validation failed",
        errors: [{ field: "passphrase", message: "size must be between 8 and 256" }],
      }),
    )

    const error = await parseApiError(response, {
      operationId: "createKey",
      requestId: "req-abc",
    })

    expect(error).toBeInstanceOf(ApiError)
    expect(error.operationId).toBe("createKey")
    expect(error.requestId).toBe("req-abc")
    expect(error.status).toBe(400)
    expect(error.title).toBe("Bad Request")
    expect(error.detail).toBe("Validation failed")
    expect(error.fieldErrors).toEqual([
      { field: "passphrase", message: "size must be between 8 and 256" },
    ])
  })

  it("falls back when body is not JSON", async () => {
    const response = mockResponse(401, "Unauthorized", "text/plain")

    const error = await parseApiError(response, {
      operationId: "listKeys",
      requestId: "req-401",
    })

    expect(error.status).toBe(401)
    expect(error.detail).toBe("Request failed with status 401")
    expect(error.title).toBe("Error")
  })
})

describe("getApiErrorMessage", () => {
  it("returns detail from ApiError", () => {
    const error = new ApiError({
      operationId: "listKeys",
      requestId: "req-1",
      status: 404,
      title: "Not Found",
      detail: "Key not found",
    })
    expect(getApiErrorMessage(error)).toBe("Key not found")
  })

  it("returns message from generic Error", () => {
    expect(getApiErrorMessage(new Error("Network down"))).toBe("Network down")
  })
})
