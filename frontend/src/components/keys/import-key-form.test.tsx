import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ImportKeyForm } from "@/components/keys/import-key-form"
import { defaultImportKeyFormValues } from "@/lib/import-key-validation"

function getSubmitButton() {
  return within(screen.getByRole("form", { name: /import key form/i })).getByRole("button", {
    name: /^import key$/i,
  })
}

describe("ImportKeyForm", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders public import fields and fingerprint helper", () => {
    render(
      <ImportKeyForm
        values={defaultImportKeyFormValues()}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/label/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/fingerprint/i)).toBeInTheDocument()
    expect(screen.getByText(/gpg --fingerprint/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/armored public key/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/armored private key/i)).not.toBeInTheDocument()
  })

  it("shows private armored field when private mode is selected", () => {
    render(
      <ImportKeyForm
        values={{ ...defaultImportKeyFormValues(), importMode: "private" }}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/armored private key/i)).toBeInTheDocument()
  })

  it("calls onChange when import mode changes", async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()

    render(
      <ImportKeyForm
        values={defaultImportKeyFormValues()}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={false}
        onChange={onChange}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("radio", { name: /private key/i }))
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ importMode: "private" }),
    )
  })

  it("shows field validation errors and API error with request id", () => {
    render(
      <ImportKeyForm
        values={defaultImportKeyFormValues()}
        fieldErrors={{ armoredPublic: "Armored public key block is required" }}
        apiError="A key with this fingerprint already exists for your account"
        requestId="req-import-fail"
        submitting={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByText("Armored public key block is required")).toBeInTheDocument()
    expect(
      screen.getByText("A key with this fingerprint already exists for your account"),
    ).toBeInTheDocument()
    expect(screen.getByText(/request id: req-import-fail/i)).toBeInTheDocument()
  })

  it("calls onSubmit when the form is submitted", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(
      <ImportKeyForm
        values={defaultImportKeyFormValues()}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={false}
        onChange={vi.fn()}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.click(getSubmitButton())
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})
