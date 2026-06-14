import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export type KeyDetailTabPanelProps = {
  panelId: string
  labelledBy: string
  isActive: boolean
  instrumentationId: string
  children: ReactNode
}

export function KeyDetailTabPanel({
  panelId,
  labelledBy,
  isActive,
  instrumentationId,
  children,
}: KeyDetailTabPanelProps) {
  return (
    <div
      id={panelId}
      role="tabpanel"
      aria-labelledby={labelledBy}
      data-pgp-ui={instrumentationId}
      className={cn("space-y-6", !isActive && "hidden")}
    >
      {children}
    </div>
  )
}
