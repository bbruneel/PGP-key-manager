import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CreateKeyForm } from "@/components/keys/create-key-form"
import { defaultCreateKeyFormValues } from "@/lib/create-key-validation"

function getSubmitButton() {
  return within(screen.getByRole("form", { name: /create primary key form/i })).getByRole("button", {
    name: /^create key$/i,
  })
}

describe("CreateKeyForm", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders identity, security, and validity fields", () => {
    render(
      <CreateKeyForm
        values={defaultCreateKeyFormValues()}
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
    expect(screen.getByLabelText(/^name$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^passphrase$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm passphrase/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/expiry date/i)).toBeInTheDocument()
  })

  it("shows field validation errors", () => {
    render(
      <CreateKeyForm
        values={defaultCreateKeyFormValues()}
        fieldErrors={{ userName: "Name is required" }}
        apiError={null}
        requestId={null}
        submitting={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByText("Name is required")).toBeInTheDocument()
  })

  it("does not call onSubmit when submit button is disabled", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(
      <CreateKeyForm
        values={defaultCreateKeyFormValues()}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={true}
        onChange={vi.fn()}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("button", { name: /creating key/i }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("calls onSubmit when the form is submitted", async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(
      <CreateKeyForm
        values={defaultCreateKeyFormValues()}
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

  it("shows algorithm select in advanced options", async () => {
    const user = userEvent.setup()

    render(
      <CreateKeyForm
        values={defaultCreateKeyFormValues()}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("button", { name: /advanced options/i }))
    expect(screen.getByLabelText(/^algorithm$/i)).toBeInTheDocument()
    expect(screen.getByText(/Ed25519 is recommended/i)).toBeInTheDocument()
  })

  it("shows rsa key size picker when rsa is selected", async () => {
    const user = userEvent.setup()

    render(
      <CreateKeyForm
        values={{ ...defaultCreateKeyFormValues(), algorithm: "rsa", keySize: 4096 }}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    )

    await user.click(screen.getByRole("button", { name: /advanced options/i }))
    expect(screen.getByLabelText(/rsa key size/i)).toBeInTheDocument()
  })
})
