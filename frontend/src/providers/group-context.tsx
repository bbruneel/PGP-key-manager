import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"

import { useApiAccessToken } from "@/hooks/use-api-access-token"
import { GroupContext } from "@/hooks/use-group-context"
import { ApiError, getApiErrorMessage } from "@/lib/api-error"
import { groupsApi } from "@/lib/groups-api"
import type { Group } from "@/types/api"

type GroupProviderProps = {
  children: ReactNode
}

export function GroupProvider({ children }: GroupProviderProps) {
  const { getAccessToken, isAuthenticated, isConfigured } = useApiAccessToken()
  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)

  const refreshGroups = useCallback(async () => {
    if (!isConfigured || !isAuthenticated) {
      setGroups([])
      setActiveGroupId(null)
      setError(null)
      setRequestId(null)
      return
    }

    setIsLoading(true)
    setError(null)
    setRequestId(null)

    try {
      const accessToken = await getAccessToken()
      const listedGroups = await groupsApi.list({ accessToken })
      setGroups(listedGroups)
      setActiveGroupId((current) => {
        if (current && listedGroups.some((group) => group.id === current)) {
          return current
        }
        return listedGroups[0]?.id ?? null
      })
    } catch (apiError) {
      setGroups([])
      setError(getApiErrorMessage(apiError))
      if (apiError instanceof ApiError && apiError.requestId) {
        setRequestId(apiError.requestId)
      }
    } finally {
      setIsLoading(false)
    }
  }, [getAccessToken, isAuthenticated, isConfigured])

  useEffect(() => {
    queueMicrotask(() => {
      void refreshGroups()
    })
  }, [refreshGroups])

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) ?? null,
    [activeGroupId, groups],
  )

  const value = useMemo(
    () => ({
      groups,
      activeGroup,
      activeGroupId,
      isLoading,
      error,
      requestId,
      refreshGroups,
      setActiveGroupId,
    }),
    [activeGroup, activeGroupId, error, groups, isLoading, refreshGroups, requestId],
  )

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>
}
