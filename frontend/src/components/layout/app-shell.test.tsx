import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AppShell } from "@/components/layout/app-shell"
import { ThemeProvider } from "@/components/theme-provider"
import { setLastExpandedTeamVaultId } from "@/lib/team-vault-nav"

const groupOne = {
  id: "group-1",
  name: "team vault",
  ownerUserId: "user-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
}

const groupTwo = {
  id: "group-2",
  name: "team2",
  ownerUserId: "user-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
}

const setActiveGroupId = vi.fn()

vi.mock("@/hooks/use-group-context", () => ({
  useGroupContext: () => ({
    groups: [groupOne, groupTwo],
    activeGroup: groupOne,
    activeGroupId: "group-1",
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

beforeEach(() => {
  window.localStorage.clear()
})

function renderShell(initialEntry = "/groups/group-1/keys") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ThemeProvider>
        <AppShell pageTitle="Team vault keys">
          <div>content</div>
        </AppShell>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

function linkByHref(nav: HTMLElement, href: string) {
  const match = within(nav)
    .getAllByRole("link")
    .find((link) => link.getAttribute("href") === href)
  expect(match).toBeDefined()
  return match!
}

describe("AppShell team vault nav", () => {
  it("lists all team vaults and expands the route team with Public, Private, Subkeys, and Members", () => {
    renderShell()

    const nav = screen.getByRole("navigation", { name: "Main" })
    expect(screen.getByText("Team vaults")).toBeInTheDocument()
    expect(linkByHref(nav, "/groups/group-1/keys")).toHaveTextContent("team vault")
    expect(linkByHref(nav, "/groups/group-2/keys")).toHaveTextContent("team2")
    expect(linkByHref(nav, "/groups/group-1/keys?view=public")).toHaveTextContent("Public")
    expect(linkByHref(nav, "/groups/group-1/keys?view=private")).toHaveTextContent("Private")
    expect(linkByHref(nav, "/groups/group-1/keys?view=subkeys")).toHaveTextContent("Subkeys")
    expect(linkByHref(nav, "/groups/group-1/members")).toHaveTextContent("Members")
    expect(screen.queryByLabelText("Vault")).not.toBeInTheDocument()
  })

  it("highlights only the team Subkeys filter when on the group keys subkeys view", () => {
    renderShell("/groups/group-1/keys?view=subkeys")

    const nav = screen.getByRole("navigation", { name: "Main" })
    const personal = linkByHref(nav, "/keys?view=subkeys")
    const team = linkByHref(nav, "/groups/group-1/keys?view=subkeys")

    expect(personal.className).not.toMatch(/text-sidebar-accent-foreground/)
    expect(team.className).toMatch(/text-sidebar-accent-foreground/)
  })

  it("restores the last expanded team when not on a group route", () => {
    setLastExpandedTeamVaultId("group-2")
    renderShell("/keys")

    const nav = screen.getByRole("navigation", { name: "Main" })
    expect(linkByHref(nav, "/groups/group-2/keys?view=public")).toHaveTextContent("Public")
    expect(screen.queryByRole("link", { name: "Members" })).toBeTruthy()
    expect(
      within(nav)
        .queryAllByRole("link")
        .some((link) => link.getAttribute("href") === "/groups/group-1/keys?view=public"),
    ).toBe(false)
  })

  it("clears active team vault when opening Personal vault", async () => {
    const user = userEvent.setup()
    renderShell()

    await user.click(screen.getByRole("link", { name: "Personal vault" }))
    expect(setActiveGroupId).toHaveBeenCalledWith(null)
  })

  it("selects a team vault from the sidebar and persists expansion", async () => {
    const user = userEvent.setup()
    renderShell("/keys")

    await user.click(screen.getByRole("link", { name: "team2" }))
    expect(setActiveGroupId).toHaveBeenCalledWith("group-2")
    expect(window.localStorage.getItem("pgp.lastExpandedTeamVaultId")).toBe("group-2")
  })
})
