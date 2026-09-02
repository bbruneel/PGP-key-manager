import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/clipboard", () => ({
  copyTextToClipboard: vi.fn().mockResolvedValue(undefined),
}))

import { ArchivePasswordDialog } from "@/components/keys/archive-password-dialog"
import { copyTextToClipboard } from "@/lib/clipboard"

describe("ArchivePasswordDialog", () => {
  afterEach(() => {
    cleanup()
    vi.mocked(copyTextToClipboard).mockClear()
  })

  it("shows password and copies on request", async () => {
    const user = userEvent.setup()
    const onCopy = vi.fn()
    const onDismiss = vi.fn()

    render(
      <ArchivePasswordDialog
        open
        password="Abcdefghjk23456789mn"
        onCopy={onCopy}
        onDismiss={onDismiss}
      />,
    )

    expect(screen.getByLabelText(/archive password/i)).toHaveValue("Abcdefghjk23456789mn")
    await user.click(screen.getByRole("button", { name: /copy password/i }))
    expect(copyTextToClipboard).toHaveBeenCalledWith("Abcdefghjk23456789mn")
    expect(onCopy).toHaveBeenCalled()
  })

  it("dismiss clears via callback", async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()

    render(
      <ArchivePasswordDialog
        open
        password="Abcdefghjk23456789mn"
        onCopy={vi.fn()}
        onDismiss={onDismiss}
      />,
    )

    await user.click(screen.getByRole("button", { name: /i saved this password/i }))
    expect(onDismiss).toHaveBeenCalled()
  })

  it("does not render password value when closed", () => {
    render(
      <ArchivePasswordDialog open={false} password={null} onCopy={vi.fn()} onDismiss={vi.fn()} />,
    )
    expect(screen.getByLabelText(/archive password/i)).toHaveValue("")
  })
})
