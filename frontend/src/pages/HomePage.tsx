import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { requestJson } from "@/lib/api-client"
import type { HelloResponse } from "@/types/api"

export type ApiHealth = "healthy" | "degraded" | "unknown"

type HomePageProps = {
  onHealthChange?: (health: ApiHealth) => void
}

export function HomePage({ onHealthChange }: HomePageProps) {
  const { theme } = useTheme()
  const [hello, setHello] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadHello = useCallback(async () => {
    setError(null)
    onHealthChange?.("unknown")
    try {
      const data = await requestJson<HelloResponse>("/api/hello", {
        operationId: "getHello",
        method: "GET",
      })
      setHello(data.message ?? JSON.stringify(data))
      onHealthChange?.("healthy")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed"
      setError(msg)
      setHello(null)
      onHealthChange?.("degraded")
    }
  }, [onHealthChange])

  useEffect(() => {
    queueMicrotask(() => {
      void loadHello()
    })
  }, [loadHello])

  return (
    <section className="rounded-lg border border-border bg-card p-6 text-card-foreground shadow-sm md:p-8">
      <header className="mb-6 border-b border-border pb-4">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Backend connectivity</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Verify the API is reachable before managing keys or authentication.
        </p>
      </header>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Health check</p>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">GET /api/hello</span>
        </p>
        <div className="rounded-md border border-input bg-background px-3 py-2.5 text-sm">
          {hello !== null && !error ? (
            <code className="text-foreground">{hello}</code>
          ) : error ? (
            <span className="text-destructive">{error}</span>
          ) : (
            <span className="text-muted-foreground">Loading…</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Response from the Spring Boot backend.</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          type="button"
          className="min-w-[8rem] transition-colors duration-200"
          onClick={() => void loadHello()}
        >
          Retry
        </Button>
        <Button
          type="button"
          variant="outline"
          className="transition-colors duration-200"
          onClick={() => toast.info("Theme", { description: `Stored theme: ${theme}` })}
        >
          Toast sample
        </Button>
      </div>
    </section>
  )
}
