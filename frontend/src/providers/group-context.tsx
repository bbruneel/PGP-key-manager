import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { useApiAccessToken } from "@/hooks/use-api-access-token"
import { GroupContext } from "@/hooks/use-group-context"
import { ApiError, getApiErrorMessage } from "@/lib/api-error"
import { groupsApi } from "@/lib/groups-api"
import type { Group } from "@/types/api"

type GroupProviderProps = {
  children: ReactNode
}

export function GroupProvider({ children }: GroupProviderProps) {
  const { getAccessToken, isAuthenticated, isConfigured, isLoading: authIsLoading } = useApiAccessToken()
  const [groups, setGroups] = useState<Group[]>([])
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)
  const refreshGenerationRef = useRef(0)

  const refreshGroups = useCallback(async () => {
    if (!isConfigured) {
      refreshGenerationRef.current += 1
      setGroups([])
      setActiveGroupId(null)
      setError(null)
      setRequestId(null)
      setIsLoading(false)
      return
    }

    // Auth0 SDK still resolving session — do not clear or fetch yet.
    if (authIsLoading) {
      return
    }

    if (!isAuthenticated) {
      refreshGenerationRef.current += 1
      setGroups([])
      setActiveGroupId(null)
      setError(null)
      setRequestId(null)
      setIsLoading(false)
      return
    }

    const generation = ++refreshGenerationRef.current
    setIsLoading(true)
    setError(null)
    setRequestId(null)

    try {
      const accessToken = await getAccessToken()
      const listedGroups = await groupsApi.list({ accessToken })
      if (generation !== refreshGenerationRef.current) {
        return
      }
      setGroups(listedGroups)
      setActiveGroupId((current) => {
        if (current && listedGroups.some((group) => group.id === current)) {
          return current
        }
        return null
      })
    } catch (apiError) {
      if (generation !== refreshGenerationRef.current) {
        return
      }
      // Keep any already-loaded groups on transient failure so the sidebar
      // does not flash empty when a racing refresh loses the token race.
      setError(getApiErrorMessage(apiError))
      if (apiError instanceof ApiError && apiError.requestId) {
        setRequestId(apiError.requestId)
      }
    } finally {
      if (generation === refreshGenerationRef.current) {
        setIsLoading(false)
      }
    }
  }, [authIsLoading, getAccessToken, isAuthenticated, isConfigured])

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
      isLoading: isLoading || authIsLoading,
      error,
      requestId,
      refreshGroups,
      setActiveGroupId,
    }),
    [activeGroup, activeGroupId, authIsLoading, error, groups, isLoading, refreshGroups, requestId],
  )

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>
}
