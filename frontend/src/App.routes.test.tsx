import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AppProviders } from "@/providers"

vi.mock("@/lib/auth0-env", () => ({
  auth0Configured: vi.fn(() => false),
}))

vi.mock("@/lib/api-client", () => ({
  requestJson: vi.fn().mockResolvedValue({ message: "ok" }),
}))

vi.mock("@/hooks/use-api-access-token", () => ({
  useApiAccessToken: () => ({
    getAccessToken: vi.fn().mockResolvedValue("token"),
    isAuthenticated: false,
    isConfigured: false,
    isLoading: false,
    authError: null,
  }),
}))

import { App } from "@/App"

function renderApp(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AppProviders>
        <App />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe("App routes", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders overview content at /", async () => {
    renderApp("/")
    expect(await screen.findByRole("heading", { name: /backend connectivity/i })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /^overview$/i, level: 1 })).toBeInTheDocument()
  })

  it("renders keys page at /keys", async () => {
    renderApp("/keys")
    expect(await screen.findByRole("heading", { name: /^keys$/i, level: 1 })).toBeInTheDocument()
    expect(screen.getByText(/configure auth0 to list and manage keys/i)).toBeInTheDocument()
  })

  it("renders create key page at /keys/new", async () => {
    renderApp("/keys/new")
    expect(await screen.findByRole("heading", { name: /create key/i, level: 1 })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: /create primary key/i, level: 2 })).toBeInTheDocument()
  })

  it("navigates between overview and keys via sidebar links", async () => {
    const user = userEvent.setup()
    renderApp("/")

    const nav = screen.getAllByRole("navigation", { name: /main/i })[0]!
    await user.click(within(nav).getByRole("link", { name: /^keys$/i }))
    expect(screen.getAllByRole("heading", { name: /^keys$/i, level: 1 }).length).toBeGreaterThanOrEqual(1)

    await user.click(within(nav).getByRole("link", { name: /^overview$/i }))
    expect(screen.getAllByRole("heading", { name: /^overview$/i, level: 1 }).length).toBeGreaterThanOrEqual(1)
  })
})
