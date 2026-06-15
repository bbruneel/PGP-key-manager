import { createContext, useContext } from "react"

import type { Group } from "@/types/api"

export type GroupContextValue = {
  groups: Group[]
  activeGroup: Group | null
  activeGroupId: string | null
  isLoading: boolean
  error: string | null
  requestId: string | null
  refreshGroups: () => Promise<void>
  setActiveGroupId: (groupId: string | null) => void
}

export const GroupContext = createContext<GroupContextValue | null>(null)

export function useGroupContext(): GroupContextValue {
  const context = useContext(GroupContext)
  if (!context) {
    throw new Error("useGroupContext must be used within a GroupProvider")
  }
  return context
}
