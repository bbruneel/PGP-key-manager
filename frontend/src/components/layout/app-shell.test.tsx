import { cleanup, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AppShell } from "@/components/layout/app-shell"
import { ThemeProvider } from "@/components/theme-provider"

const activeGroup = {
  id: "group-1",
  name: "team vault",
  ownerUserId: "user-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
}

vi.mock("@/hooks/use-group-context", () => ({
  useGroupContext: () => ({
    groups: [activeGroup],
    activeGroup,
    activeGroupId: "group-1",
    isLoading: false,
    error: null,
    requestId: null,
    refreshGroups: vi.fn(),
    setActiveGroupId: vi.fn(),
  }),
}))

afterEach(() => {
  cleanup()
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
  it("shows Public, Private, and Subkeys under Group keys", () => {
    renderShell()

    const nav = screen.getByRole("navigation", { name: "Main" })
    expect(linkByHref(nav, "/groups/group-1/keys")).toBeInTheDocument()
    expect(linkByHref(nav, "/groups/group-1/keys?view=public")).toHaveTextContent("Public")
    expect(linkByHref(nav, "/groups/group-1/keys?view=private")).toHaveTextContent("Private")
    expect(linkByHref(nav, "/groups/group-1/keys?view=subkeys")).toHaveTextContent("Subkeys")
  })

  it("highlights only the team Subkeys filter when on the group keys subkeys view", () => {
    renderShell("/groups/group-1/keys?view=subkeys")

    const nav = screen.getByRole("navigation", { name: "Main" })
    const personal = linkByHref(nav, "/keys?view=subkeys")
    const team = linkByHref(nav, "/groups/group-1/keys?view=subkeys")

    expect(personal.className).not.toMatch(/text-sidebar-accent-foreground/)
    expect(team.className).toMatch(/text-sidebar-accent-foreground/)
  })
})
