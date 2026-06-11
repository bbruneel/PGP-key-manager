import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { EditKeyLabelForm } from "@/components/keys/edit-key-label-form"

describe("EditKeyLabelForm", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders label input and save button", () => {
    render(
      <EditKeyLabelForm
        values={{ label: "Work key" }}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={false}
        disabled={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/^label$/i)).toHaveValue("Work key")
    expect(screen.getByRole("button", { name: /^save label$/i })).toBeInTheDocument()
  })

  it("calls onSubmit when form is submitted", async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <EditKeyLabelForm
        values={{ label: "Work key" }}
        fieldErrors={{}}
        apiError={null}
        requestId={null}
        submitting={false}
        disabled={false}
        onChange={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    await user.click(within(screen.getByRole("region", { name: "Edit key label" })).getByRole("button", { name: /^save label$/i }))
    expect(onSubmit).toHaveBeenCalled()
  })

  it("shows field error", () => {
    render(
      <EditKeyLabelForm
        values={{ label: "" }}
        fieldErrors={{ label: "Label is required." }}
        apiError={null}
        requestId={null}
        submitting={false}
        disabled={false}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText("Label is required.")).toBeInTheDocument()
  })
})
