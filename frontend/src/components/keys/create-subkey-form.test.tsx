import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { defaultCreateSubkeyFormValues } from "@/lib/create-subkey-validation"

import { CreateSubkeyForm } from "@/components/keys/create-subkey-form"

describe("CreateSubkeyForm", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders capability options without certify", () => {
    render(
      <CreateSubkeyForm
        values={defaultCreateSubkeyFormValues()}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={false}
        disabled={false}
        primaryOpenpgpVersion={4}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByLabelText("certify")).not.toBeInTheDocument()
    expect(screen.getByLabelText("encrypt")).toBeInTheDocument()
    expect(screen.getByLabelText("Algorithm")).toBeInTheDocument()
    expect(screen.getByLabelText("Expiry date")).toBeInTheDocument()
    expect(screen.getByLabelText(/^passphrase$/i)).toBeInTheDocument()
  })

  it("submits create subkey form", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <CreateSubkeyForm
        values={{ ...defaultCreateSubkeyFormValues(), passphrase: "valid-passphrase" }}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={false}
        disabled={false}
        primaryOpenpgpVersion={4}
        onChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole("button", { name: /add subkey/i }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })

  it("shows field errors", () => {
    render(
      <CreateSubkeyForm
        values={defaultCreateSubkeyFormValues()}
        fieldErrors={{ passphrase: "Passphrase must be at least 8 characters" }}
        apiError={null}
        requestId={null}
        submitting={false}
        disabled={false}
        primaryOpenpgpVersion={4}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument()
  })

  it("disables submit when disabled", () => {
    render(
      <CreateSubkeyForm
        values={defaultCreateSubkeyFormValues()}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={false}
        disabled
        primaryOpenpgpVersion={4}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole("button", { name: /^add subkey$/i })).toBeDisabled()
  })
})
