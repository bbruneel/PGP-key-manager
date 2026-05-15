import { useCallback, useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { toast } from "sonner"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { apiFetch } from "@/lib/api"

export function HomePage() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [hello, setHello] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadHello = useCallback(async () => {
    setError(null)
    try {
      const res = await apiFetch("/api/hello", { method: "GET" })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      const data = (await res.json()) as { message?: string }
      setHello(data.message ?? JSON.stringify(data))
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed"
      setError(msg)
      setHello(null)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void loadHello()
    })
  }, [loadHello])

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">PGP Key Manager</h1>
        <Button type="button" variant="outline" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
          {resolvedTheme === "dark" ? <Sun /> : <Moon />}
        </Button>
      </header>

      <section className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm">
        <h2 className="mb-2 text-sm font-medium text-muted-foreground">API</h2>
        <p className="text-sm">
          <span className="font-medium">GET /api/hello:</span>{" "}
          {hello !== null && !error ? (
            <code className="rounded bg-muted px-1 py-0.5 text-foreground">{hello}</code>
          ) : error ? (
            <span className="text-destructive">{error}</span>
          ) : (
            <span className="text-muted-foreground">Loading…</span>
          )}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => void loadHello()}>
            Retry
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => toast.info("Theme", { description: `Stored theme: ${theme}` })}
          >
            Toast sample
          </Button>
        </div>
      </section>
    </main>
  )
}
