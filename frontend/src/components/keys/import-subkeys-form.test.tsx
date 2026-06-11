import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ImportSubkeysForm } from "@/components/keys/import-subkeys-form"

describe("ImportSubkeysForm", () => {
  afterEach(() => {
    cleanup()
  })

  it("submits when the import button is clicked", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <ImportSubkeysForm
        apiError={null}
        requestId={null}
        submitting={false}
        disabled={false}
        preview={null}
        onSubmit={onSubmit}
      />,
    )

    await user.click(screen.getByRole("button", { name: /^import subkeys from keyring$/i }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it("shows API error and request id", () => {
    render(
      <ImportSubkeysForm
        apiError="Primary key has no armored keyring material"
        requestId="req-import-subkeys"
        submitting={false}
        disabled={false}
        preview={null}
        onSubmit={() => {}}
      />,
    )

    expect(screen.getByText("Primary key has no armored keyring material")).toBeInTheDocument()
    expect(screen.getByText(/request id: req-import-subkeys/i)).toBeInTheDocument()
  })
})
