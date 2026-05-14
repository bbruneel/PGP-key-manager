import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ThemeProvider } from "@/components/theme-provider"
import { HomePage } from "@/pages/HomePage"

describe("HomePage", () => {
  it("renders shell and theme toggle", () => {
    render(
      <ThemeProvider>
        <HomePage />
      </ThemeProvider>,
    )

    expect(screen.getByRole("heading", { name: /thank you board/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /toggle theme/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument()
  })
})
