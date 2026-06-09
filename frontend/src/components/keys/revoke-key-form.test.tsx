import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import userEvent from "@testing-library/user-event"

import { defaultRevokeKeyFormValues } from "@/lib/revoke-key-validation"

import { RevokeKeyForm } from "@/components/keys/revoke-key-form"

describe("RevokeKeyForm", () => {
  afterEach(() => {
    cleanup()
  })

  it("submits revoke form", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <RevokeKeyForm
        values={{ ...defaultRevokeKeyFormValues(), passphrase: "valid-passphrase" }}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={false}
        disabled={false}
        requiresPassphrase
        onChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole("button", { name: /revoke key/i }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it("disables submit when already revoked", () => {
    render(
      <RevokeKeyForm
        values={defaultRevokeKeyFormValues()}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={false}
        disabled
        requiresPassphrase={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole("button", { name: /^revoke key$/i })).toBeDisabled()
  })
})
