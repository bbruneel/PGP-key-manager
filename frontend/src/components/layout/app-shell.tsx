import { useState, type ReactNode } from "react"
import { NavLink } from "react-router-dom"
import {
  ChevronDown,
  Download,
  KeyRound,
  LayoutDashboard,
  Menu,
  Settings,
  Shield,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

import packageJson from "../../../package.json"

type NavItem = {
  label: string
  to?: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  children?: string[]
}

const navItems: NavItem[] = [
  { label: "Overview", to: "/", icon: LayoutDashboard },
  { label: "Keys", to: "/keys", icon: KeyRound, children: ["Public", "Private", "Subkeys"] },
  { label: "Policies", icon: Shield },
  { label: "Settings", icon: Settings },
]

type AppShellProps = {
  children: ReactNode
  footerStatus?: "healthy" | "degraded" | "unknown"
  pageTitle?: string
}

export function AppShell({ children, footerStatus = "unknown", pageTitle = "Overview" }: AppShellProps) {
  const isMobile = useIsMobile()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const statusLabel =
    footerStatus === "healthy" ? "Connected" : footerStatus === "degraded" ? "Degraded" : "Checking…"
  const statusColor =
    footerStatus === "healthy"
      ? "bg-emerald-500"
      : footerStatus === "degraded"
        ? "bg-amber-500"
        : "bg-muted-foreground/50"

  const closeMobileNav = () => setMobileNavOpen(false)

  return (
    <div className="flex min-h-svh bg-background">
      {isMobile && mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[1px]"
          aria-label="Close navigation"
          onClick={closeMobileNav}
        />
      ) : null}

      <aside
        className={cn(
          "flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200",
          isMobile
            ? "fixed inset-y-0 left-0 z-50 shadow-lg"
            : "relative",
          isMobile && !mobileNavOpen && "-translate-x-full",
        )}
        aria-hidden={isMobile && !mobileNavOpen}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <KeyRound className="size-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">PGP Key Manager</p>
            <p className="truncate text-xs text-muted-foreground">OpenPGP workspace</p>
          </div>
          {isMobile ? (
            <Button type="button" variant="ghost" size="icon-sm" onClick={closeMobileNav} aria-label="Close menu">
              <X className="size-4" />
            </Button>
          ) : null}
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Main">
          {navItems.map((item) => (
            <NavRow key={item.label} item={item} onNavigate={isMobile ? closeMobileNav : undefined} />
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-4 shadow-sm sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {isMobile ? (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation"
                aria-expanded={mobileNavOpen}
              >
                <Menu className="size-4" />
              </Button>
            ) : null}
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{pageTitle}</h1>
            <span className="hidden rounded-md border border-border bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground sm:inline">
              Development
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Button
              type="button"
              size="sm"
              className="hidden gap-1.5 shadow-sm transition-colors duration-200 sm:inline-flex"
              disabled
              title="Coming soon"
            >
              <Download className="size-4" />
              Export keys
            </Button>
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">{children}</div>
        </main>

        <footer className="flex h-10 shrink-0 items-center justify-between border-t border-border bg-card px-4 text-xs text-muted-foreground sm:px-6">
          <span>v{packageJson.version}</span>
          <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
            <span className={cn("size-2 rounded-full", statusColor)} aria-hidden />
            API {statusLabel}
          </span>
        </footer>
      </div>
    </div>
  )
}

function NavRow({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon
  const hasChildren = Boolean(item.children?.length)
  const [expanded, setExpanded] = useState(false)

  if (item.to) {
    return (
      <div>
        <div className="flex items-center gap-0.5">
          <NavLink
            to={item.to}
            end={item.to === "/"}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
              )
            }
          >
            <Icon className="size-4 shrink-0 opacity-80" strokeWidth={1.75} />
            <span className="flex-1 text-left">{item.label}</span>
          </NavLink>
          {hasChildren ? (
            <button
              type="button"
              className="mr-2 rounded p-0.5 text-sidebar-foreground hover:bg-sidebar-accent/60"
              aria-label={expanded ? "Collapse sub-navigation" : "Expand sub-navigation"}
              onClick={() => setExpanded((open) => !open)}
            >
              <ChevronDown
                className={cn("size-4 shrink-0 opacity-50 transition-transform duration-200", expanded && "rotate-180")}
              />
            </button>
          ) : null}
        </div>
        {hasChildren && expanded ? (
          <ul className="mt-0.5 ml-5 space-y-0.5 border-l border-sidebar-border/80 pl-6">
            {item.children!.map((child) => (
              <li key={child}>
                <button
                  type="button"
                  disabled
                  title="Coming soon"
                  className="w-full rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors duration-200 hover:bg-sidebar-accent/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {child}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    )
  }

  return (
    <button
      type="button"
      disabled
      title="Coming soon"
      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors duration-200 hover:bg-sidebar-accent/60 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Icon className="size-4 shrink-0 opacity-80" strokeWidth={1.75} />
      <span className="flex-1 text-left">{item.label}</span>
    </button>
  )
}
