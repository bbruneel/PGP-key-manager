import { useEffect, useMemo } from "react"
import { useParams } from "react-router-dom"

import { useGroupContext } from "@/hooks/use-group-context"
import { HomeKeysPanel } from "@/pages/HomeKeysPanel"

export function GroupKeysPage() {
  const { groupId } = useParams<{ groupId: string }>()
  const { groups, setActiveGroupId } = useGroupContext()

  useEffect(() => {
    if (groupId) {
      setActiveGroupId(groupId)
    }
  }, [groupId, setActiveGroupId])

  const groupName = useMemo(
    () => groups.find((group) => group.id === groupId)?.name ?? "team",
    [groupId, groups],
  )

  if (!groupId) {
    return null
  }

  return (
    <HomeKeysPanel
      groupId={groupId}
      scope="group"
      title="Team vault keys"
      description={`Keys owned by ${groupName}.`}
    />
  )
}
