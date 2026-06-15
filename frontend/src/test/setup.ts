import "@testing-library/jest-dom/vitest"
import { vi } from "vitest"

const mockRefreshGroups = vi.fn(async () => {})
const mockSetActiveGroupId = vi.fn()
const mockedGroupContext = {
  groups: [],
  activeGroup: null,
  activeGroupId: null,
  isLoading: false,
  error: null,
  requestId: null,
  refreshGroups: mockRefreshGroups,
  setActiveGroupId: mockSetActiveGroupId,
}

vi.mock("@/hooks/use-group-context", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/use-group-context")>(
    "@/hooks/use-group-context",
  )
  return {
    ...actual,
    useGroupContext: vi.fn(() => mockedGroupContext),
  }
})

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

globalThis.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  headers: new Headers({ "content-type": "application/json" }),
  json: async () => ({ message: "ok" }),
} as Response)
