import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AppShell } from "@/components/layout/app-shell"
import { ThemeProvider } from "@/components/theme-provider"
import { HomePage } from "@/pages/HomePage"

describe("HomePage", () => {
  it("renders connectivity card and actions inside the shell", () => {
    render(
      <ThemeProvider>
        <AppShell>
          <HomePage />
        </AppShell>
      </ThemeProvider>,
    )

    expect(screen.getByRole("heading", { name: /backend connectivity/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument()
    expect(screen.getByRole("group", { name: /theme/i })).toBeInTheDocument()
  })
})
