import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import { AppShell } from "@/components/layout/app-shell"
import { ThemeProvider } from "@/components/theme-provider"
import { HomePage } from "@/pages/HomePage"

vi.mock("@/lib/api-client", () => ({
  requestJson: vi.fn().mockResolvedValue({ message: "ok" }),
}))

describe("HomePage", () => {
  it("renders connectivity card and actions inside the shell", async () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AppShell>
            <HomePage />
          </AppShell>
        </ThemeProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole("heading", { name: /backend connectivity/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument()
    expect(screen.getByRole("group", { name: /theme/i })).toBeInTheDocument()
    expect(await screen.findByText("ok")).toBeInTheDocument()
  })
})
