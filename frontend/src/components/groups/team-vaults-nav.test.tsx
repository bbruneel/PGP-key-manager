import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import { TeamVaultsNav } from "@/components/groups/team-vaults-nav"
import { setLastExpandedTeamVaultId } from "@/lib/team-vault-nav"

const groupOne = {
  id: "group-1",
  name: "alpha",
  ownerUserId: "user-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
}

const groupTwo = {
  id: "group-2",
  name: "beta",
  ownerUserId: "user-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
}

const setActiveGroupId = vi.fn()

vi.mock("@/hooks/use-group-context", () => ({
  useGroupContext: () => ({
    groups: [groupOne, groupTwo],
    activeGroup: null,
    activeGroupId: null,
    isLoading: false,
    error: null,
    requestId: null,
    refreshGroups: vi.fn(),
    setActiveGroupId,
  }),
}))

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  setActiveGroupId.mockReset()
})

function renderNav(path = "/keys") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <TeamVaultsNav />
    </MemoryRouter>,
  )
}

describe("TeamVaultsNav", () => {
  it("expands the route team and keeps the other collapsed", () => {
    renderNav("/groups/group-1/keys")

    expect(screen.getByRole("link", { name: "Public" })).toHaveAttribute(
      "href",
      "/groups/group-1/keys?view=public",
    )
    expect(screen.queryByRole("link", { name: "Public", hidden: false })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "Expand beta" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Collapse alpha" })).toBeInTheDocument()
  })

  it("expands a collapsed team via the chevron without requiring a route change", async () => {
    const user = userEvent.setup()
    setLastExpandedTeamVaultId("group-1")
    renderNav("/keys")

    expect(screen.getByRole("button", { name: "Collapse alpha" })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Expand beta" }))

    expect(setActiveGroupId).toHaveBeenCalledWith("group-2")
    expect(screen.getByRole("link", { name: "Private" })).toHaveAttribute(
      "href",
      "/groups/group-2/keys?view=private",
    )
    expect(window.localStorage.getItem("pgp.lastExpandedTeamVaultId")).toBe("group-2")
  })
})
