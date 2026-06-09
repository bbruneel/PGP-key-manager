import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { defaultExtendExpiryFormValues } from "@/lib/extend-key-validation"

import { ExtendExpiryForm } from "@/components/keys/extend-expiry-form"

describe("ExtendExpiryForm", () => {
  it("submits extend expiry form", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <ExtendExpiryForm
        values={{ ...defaultExtendExpiryFormValues(), passphrase: "valid-passphrase" }}
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

    await user.click(screen.getByRole("button", { name: /extend expiry/i }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })
})
