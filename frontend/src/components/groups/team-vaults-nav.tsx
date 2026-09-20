import { useState } from "react"
import { Link, NavLink, useLocation, useSearchParams } from "react-router-dom"
import { ChevronDown, KeyRound, Plus, Users } from "lucide-react"

import { useGroupContext } from "@/hooks/use-group-context"
import {
  getLastExpandedTeamVaultId,
  resolveTeamVaultIdFromPath,
  setLastExpandedTeamVaultId,
} from "@/lib/team-vault-nav"
import { logUiEvent } from "@/lib/ui-logger"
import { cn } from "@/lib/utils"
import type { Group } from "@/types/api"

type TeamVaultsNavProps = {
  onNavigate?: () => void
}

export function TeamVaultsNav({ onNavigate }: TeamVaultsNavProps) {
  const { groups, setActiveGroupId, isLoading } = useGroupContext()
  const { pathname } = useLocation()
  const routeGroupId = resolveTeamVaultIdFromPath(pathname)

  const [expandedId, setExpandedId] = useState<string | null>(() => {
    return routeGroupId ?? getLastExpandedTeamVaultId()
  })
  const [prevRouteGroupId, setPrevRouteGroupId] = useState(routeGroupId)

  if (routeGroupId !== prevRouteGroupId) {
    setPrevRouteGroupId(routeGroupId)
    if (routeGroupId) {
      setExpandedId(routeGroupId)
      setLastExpandedTeamVaultId(routeGroupId)
    }
  }

  const rememberedExpandedId =
    expandedId && groups.some((group) => group.id === expandedId)
      ? expandedId
      : (() => {
          const remembered = getLastExpandedTeamVaultId()
          return remembered && groups.some((group) => group.id === remembered) ? remembered : null
        })()

  if (!isLoading && groups.length === 0) {
    return (
      <div className="mt-4 space-y-1 border-t border-sidebar-border pt-3" data-pgp-ui="teamVaultsNav.empty">
        <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Team vaults
        </p>
        <p className="px-3 text-xs text-muted-foreground">No team vaults yet.</p>
        <Link
          to="/groups/new"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
          data-pgp-ui="teamVaultsNav.create"
        >
          <Plus className="size-4 shrink-0 opacity-80" strokeWidth={1.75} />
          New group
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-1 border-t border-sidebar-border pt-3" data-pgp-ui="teamVaultsNav">
      <div className="flex items-center justify-between gap-2 px-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Team vaults
        </p>
        <Link
          to="/groups/new"
          onClick={onNavigate}
          className="rounded p-0.5 text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
          aria-label="New group"
          data-pgp-ui="teamVaultsNav.create"
        >
          <Plus className="size-3.5" strokeWidth={1.75} />
        </Link>
      </div>

      {isLoading && groups.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">Loading teams…</p>
      ) : null}

      <ul className="space-y-0.5">
        {groups.map((group) => {
          const pinnedOpen = routeGroupId === group.id
          const expanded = pinnedOpen || rememberedExpandedId === group.id

          return (
            <li key={group.id}>
              <TeamVaultRow
                group={group}
                expanded={expanded}
                collapseDisabled={pinnedOpen}
                onNavigate={onNavigate}
                onToggleExpand={() => {
                  if (pinnedOpen) {
                    return
                  }

                  const next = rememberedExpandedId === group.id ? null : group.id
                  setExpandedId(next)
                  if (next) {
                    setLastExpandedTeamVaultId(next)
                    logUiEvent("info", {
                      eventId: "teamVaultsNav.expanded",
                      message: "Expanded team vault in sidebar",
                      groupId: next,
                    })
                  } else {
                    setLastExpandedTeamVaultId(null)
                    logUiEvent("info", {
                      eventId: "teamVaultsNav.collapsed",
                      message: "Collapsed team vault in sidebar",
                      groupId: group.id,
                    })
                  }
                }}
                onSelect={() => {
                  setExpandedId(group.id)
                  setLastExpandedTeamVaultId(group.id)
                  setActiveGroupId(group.id)
                  onNavigate?.()
                  logUiEvent("info", {
                    eventId: "teamVaultsNav.selected",
                    message: "Selected team vault from sidebar",
                    groupId: group.id,
                  })
                }}
              />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

type TeamVaultRowProps = {
  group: Group
  expanded: boolean
  collapseDisabled?: boolean
  onNavigate?: () => void
  onToggleExpand: () => void
  onSelect: () => void
}

function TeamVaultRow({
  group,
  expanded,
  collapseDisabled = false,
  onNavigate,
  onToggleExpand,
  onSelect,
}: TeamVaultRowProps) {
  const [searchParams] = useSearchParams()
  const { pathname } = useLocation()
  const keysBase = `/groups/${group.id}/keys`
  const membersTo = `/groups/${group.id}/members`
  const children = [
    { label: "Public", to: `${keysBase}?view=public` },
    { label: "Private", to: `${keysBase}?view=private` },
    { label: "Subkeys", to: `${keysBase}?view=subkeys` },
  ]

  return (
    <div data-pgp-ui="teamVaultsNav.row" data-group-id={group.id}>
      <div className="flex items-center gap-0.5">
        <NavLink
          to={keysBase}
          onClick={onSelect}
          className={({ isActive }) =>
            cn(
              "flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200",
              isActive || pathname.startsWith(`/groups/${group.id}/`)
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )
          }
          data-pgp-ui="teamVaultsNav.team"
        >
          <KeyRound className="size-4 shrink-0 opacity-80" strokeWidth={1.75} />
          <span className="flex-1 truncate text-left">{group.name}</span>
        </NavLink>
        <button
          type="button"
          className="mr-2 rounded p-0.5 text-sidebar-foreground hover:bg-sidebar-accent/60 disabled:pointer-events-none disabled:opacity-40"
          aria-label={expanded ? `Collapse ${group.name}` : `Expand ${group.name}`}
          aria-expanded={expanded}
          aria-disabled={collapseDisabled || undefined}
          disabled={collapseDisabled}
          title={collapseDisabled ? "Current team stays expanded while you are viewing it" : undefined}
          onClick={onToggleExpand}
          data-pgp-ui="teamVaultsNav.toggle"
        >
          <ChevronDown
            className={cn(
              "size-4 shrink-0 opacity-50 transition-transform duration-200",
              expanded && "rotate-180",
            )}
          />
        </button>
      </div>

      {expanded ? (
        <ul className="mt-0.5 ml-5 space-y-0.5 border-l border-sidebar-border/80 pl-6">
          {children.map((child) => {
            const childUrl = new URL(child.to, "http://local")
            const childView = childUrl.searchParams.get("view")
            const activeView = searchParams.get("view") ?? "all"
            const isChildActive = pathname === childUrl.pathname && childView === activeView

            return (
              <li key={child.label}>
                <NavLink
                  to={child.to}
                  onClick={onNavigate}
                  className={() =>
                    cn(
                      "block w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors duration-200",
                      isChildActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                    )
                  }
                  data-pgp-ui={`teamVaultsNav.${child.label.toLowerCase()}`}
                >
                  {child.label}
                </NavLink>
              </li>
            )
          })}
          <li>
            <NavLink
              to={membersTo}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors duration-200",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                )
              }
              data-pgp-ui="teamVaultsNav.members"
            >
              <Users className="size-3 shrink-0 opacity-80" strokeWidth={1.75} />
              Members
            </NavLink>
          </li>
        </ul>
      ) : null}
    </div>
  )
}
