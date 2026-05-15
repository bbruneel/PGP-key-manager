import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

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
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-full transition-colors duration-200",
          !isDark ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
        aria-label="Light mode"
        aria-pressed={!isDark}
      >
        <Sun className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-full transition-colors duration-200",
          isDark ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
        )}
        aria-label="Dark mode"
        aria-pressed={isDark}
      >
        <Moon className="size-4" />
      </button>
    </div>
  )
}
