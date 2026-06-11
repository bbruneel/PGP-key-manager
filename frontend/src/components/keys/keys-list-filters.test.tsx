import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { KeysListFilters } from "@/components/keys/keys-list-filters"

describe("KeysListFilters", () => {
  it("renders filter controls", () => {
    render(
      <KeysListFilters
        params={{ view: "all", status: undefined, capability: undefined }}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/^view$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^status$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^capability$/i)).toBeInTheDocument()
  })

  it("shows current status value", () => {
    render(
      <KeysListFilters
        params={{ view: "all", status: "revoked", capability: undefined }}
        onChange={vi.fn()}
      />,
    )

    expect(screen.getByLabelText(/^status$/i)).toBeInTheDocument()
  })
})
