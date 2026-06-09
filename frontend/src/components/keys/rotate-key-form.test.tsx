import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { defaultRotateKeyFormValues } from "@/lib/rotate-key-validation"

import { RotateKeyForm } from "@/components/keys/rotate-key-form"

describe("RotateKeyForm", () => {
  afterEach(() => {
    cleanup()
  })

  it("submits rotate form", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <RotateKeyForm
        values={{ ...defaultRotateKeyFormValues(), passphrase: "valid-passphrase" }}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={false}
        disabled={false}
        onChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole("button", { name: /rotate subkey/i }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it("shows passphrase when revoke previous is unchecked", () => {
    render(
      <RotateKeyForm
        values={{ ...defaultRotateKeyFormValues(), revokePrevious: false }}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={false}
        disabled={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/^passphrase$/i)).toBeInTheDocument()
  })

  it("does not offer certify capability", () => {
    render(
      <RotateKeyForm
        values={defaultRotateKeyFormValues()}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={false}
        disabled={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText("certify")).not.toBeInTheDocument()
    expect(screen.getByLabelText("sign")).toBeInTheDocument()
  })

  it("disables submit when not available", () => {
    render(
      <RotateKeyForm
        values={defaultRotateKeyFormValues()}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={false}
        disabled
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole("button", { name: /^rotate subkey$/i })).toBeDisabled()
  })
})
