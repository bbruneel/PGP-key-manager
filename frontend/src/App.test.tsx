import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { mockUseAuth0, mockWithAuthenticationRequired } = vi.hoisted(() => ({
  mockUseAuth0: vi.fn(),
  mockWithAuthenticationRequired: vi.fn(),
}))

vi.mock("@auth0/auth0-react", () => ({
  useAuth0: () => mockUseAuth0(),
  withAuthenticationRequired: (Component: React.ComponentType, options?: { onRedirecting?: () => React.ReactNode }) => {
    mockWithAuthenticationRequired(Component, options)
    return function MockProtected(props: object) {
      const auth0 = mockUseAuth0()
      if (auth0.isLoading) {
        return options?.onRedirecting?.() ?? null
      }
      if (!auth0.isAuthenticated) {
        return options?.onRedirecting?.() ?? null
      }
      return <Component {...props} />
    }
  },
}))

vi.mock("@/lib/auth0-env", () => ({
  auth0Configured: vi.fn(),
}))

vi.mock("@/pages/OverviewPage", () => ({
  OverviewPage: () => <div>OverviewPage</div>,
}))

vi.mock("@/pages/KeysPage", () => ({
  KeysPage: () => <div>KeysPage</div>,
}))

vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { auth0Configured } from "@/lib/auth0-env"
import { App } from "@/App"

function renderApp(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  )
}

describe("App auth gate", () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    vi.mocked(auth0Configured).mockReset()
    mockUseAuth0.mockReset()
    mockWithAuthenticationRequired.mockReset()
  })

  it("renders without auth gate when Auth0 is not configured", () => {
    vi.mocked(auth0Configured).mockReturnValue(false)

    renderApp("/")

    expect(screen.getByText("OverviewPage")).toBeInTheDocument()
    expect(screen.queryByText("Redirecting to sign in…")).not.toBeInTheDocument()
  })

  it("redirects unauthenticated users when Auth0 is configured", () => {
    vi.mocked(auth0Configured).mockReturnValue(true)
    mockUseAuth0.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    })

    renderApp("/")

    expect(screen.getByText("Redirecting to sign in…")).toBeInTheDocument()
    expect(screen.queryByText("OverviewPage")).not.toBeInTheDocument()
  })

  it("renders app content when Auth0 is configured and user is authenticated", () => {
    vi.mocked(auth0Configured).mockReturnValue(true)
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    })

    renderApp("/")

    expect(screen.getByText("OverviewPage")).toBeInTheDocument()
  })
})
