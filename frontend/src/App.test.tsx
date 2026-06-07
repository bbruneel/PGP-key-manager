import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockUseAuth0 = vi.fn()
const mockWithAuthenticationRequired = vi.fn()

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

vi.mock("@/pages/HomePage", () => ({
  HomePage: () => <div>HomePage</div>,
}))

vi.mock("@/pages/HomeAuthPanel", () => ({
  HomeAuthPanel: () => <div>HomeAuthPanel</div>,
  HomeAuthPlaceholder: () => <div>HomeAuthPlaceholder</div>,
}))

vi.mock("@/pages/HomeKeysPanel", () => ({
  HomeKeysPanel: () => <div>HomeKeysPanel</div>,
}))

vi.mock("@/components/layout/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { auth0Configured } from "@/lib/auth0-env"
import { App } from "@/App"

describe("App auth gate", () => {
  beforeEach(() => {
    vi.mocked(auth0Configured).mockReset()
    mockUseAuth0.mockReset()
    mockWithAuthenticationRequired.mockReset()
  })

  it("renders without auth gate when Auth0 is not configured", () => {
    vi.mocked(auth0Configured).mockReturnValue(false)

    render(<App />)

    expect(screen.getByText("HomeAuthPlaceholder")).toBeInTheDocument()
    expect(mockWithAuthenticationRequired).not.toHaveBeenCalled()
  })

  it("redirects unauthenticated users when Auth0 is configured", () => {
    vi.mocked(auth0Configured).mockReturnValue(true)
    mockUseAuth0.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
    })

    render(<App />)

    expect(mockWithAuthenticationRequired).toHaveBeenCalled()
    expect(screen.getByText("Redirecting to sign in…")).toBeInTheDocument()
    expect(screen.queryByText("HomePage")).not.toBeInTheDocument()
  })

  it("renders app content when Auth0 is configured and user is authenticated", () => {
    vi.mocked(auth0Configured).mockReturnValue(true)
    mockUseAuth0.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
    })

    render(<App />)

    expect(screen.getByText("HomePage")).toBeInTheDocument()
    expect(screen.getByText("HomeAuthPanel")).toBeInTheDocument()
    expect(screen.getByText("HomeKeysPanel")).toBeInTheDocument()
  })
})
