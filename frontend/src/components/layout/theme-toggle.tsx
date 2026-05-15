import { useSyncExternalStore } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()
  const isDark = mounted && resolvedTheme === "dark"

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-card p-0.5 shadow-sm",
        className,
      )}
      role="group"
      aria-label="Theme"
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        disabled={!mounted}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-full transition-colors duration-200",
          !isDark ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          !mounted && "opacity-70",
        )}
        aria-label="Light mode"
        aria-pressed={mounted ? !isDark : undefined}
      >
        <Sun className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        disabled={!mounted}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-full transition-colors duration-200",
          isDark ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          !mounted && "opacity-70",
        )}
        aria-label="Dark mode"
        aria-pressed={mounted ? isDark : undefined}
      >
        <Moon className="size-4" />
      </button>
    </div>
  )
}
