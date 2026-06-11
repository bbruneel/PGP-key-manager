import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DeleteKeyForm } from "@/components/keys/delete-key-form"

describe("DeleteKeyForm", () => {
  afterEach(() => {
    cleanup()
  })

  it("shows primary warning and requires confirmation", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <DeleteKeyForm
        role="primary"
        fingerprint="PRIMARYFINGERPRINT"
        apiError={null}
        requestId={null}
        submitting={false}
        disabled={false}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByText(/all subkeys will also be removed/i)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /^delete key$/i }))
    expect(screen.getByRole("button", { name: /^confirm delete$/i })).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /^confirm delete$/i }))
    expect(onSubmit).toHaveBeenCalled()
  })

  it("shows subkey warning", () => {
    render(
      <DeleteKeyForm
        role="subkey"
        fingerprint="SUBFINGERPRINT"
        apiError={null}
        requestId={null}
        submitting={false}
        disabled={false}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText(/removes this subkey record/i)).toBeInTheDocument()
    expect(screen.queryByText(/all subkeys will also be removed/i)).not.toBeInTheDocument()
  })
})
