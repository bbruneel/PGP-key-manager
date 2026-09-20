import { useEffect } from "react"

import { useGroupContext } from "@/hooks/use-group-context"
import { HomeKeysPanel } from "@/pages/HomeKeysPanel"

export function KeysPage() {
  const { setActiveGroupId } = useGroupContext()

  useEffect(() => {
    setActiveGroupId(null)
  }, [setActiveGroupId])

  return (
    <HomeKeysPanel
      scope="personal"
      title="Personal vault"
      description="Keys stored in your personal vault."
    />
  )
}
