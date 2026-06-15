import { useMemo } from "react"
import { useNavigate } from "react-router-dom"

import { useGroupContext } from "@/hooks/use-group-context"
import { logUiEvent } from "@/lib/ui-logger"

const PERSONAL_VAULT_VALUE = "__personal_vault__"

export function GroupSwitcher() {
  const navigate = useNavigate()
  const { groups, activeGroup, setActiveGroupId, isLoading } = useGroupContext()

  const selectedValue = activeGroup?.id ?? PERSONAL_VAULT_VALUE
  const groupOptions = useMemo(
    () =>
      groups.map((group) => ({
        value: group.id,
        label: group.name,
      })),
    [groups],
  )

  return (
    <div className="flex min-w-52 items-center gap-2">
      <label htmlFor="group-switcher" className="text-xs font-medium text-muted-foreground">
        Vault
      </label>
      <select
        id="group-switcher"
        className="h-8 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs"
        value={selectedValue}
        disabled={isLoading}
        onChange={(event) => {
          const nextValue = event.target.value
          if (nextValue === PERSONAL_VAULT_VALUE) {
            setActiveGroupId(null)
            navigate("/keys")
            logUiEvent("info", {
              eventId: "groupSwitcher.changed",
              message: "Switched vault context to personal",
            })
            return
          }

          setActiveGroupId(nextValue)
          navigate(`/groups/${nextValue}/keys`)
          logUiEvent("info", {
            eventId: "groupSwitcher.changed",
            message: "Switched vault context to group",
            groupId: nextValue,
          })
        }}
      >
        <option value={PERSONAL_VAULT_VALUE}>Personal vault</option>
        {groupOptions.map((group) => (
          <option key={group.value} value={group.value}>
            {group.label}
          </option>
        ))}
      </select>
    </div>
  )
}
