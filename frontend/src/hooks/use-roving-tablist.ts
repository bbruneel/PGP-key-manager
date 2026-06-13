import { useCallback } from "react"

export type TabDirection = "left" | "right"

export type RovingTablistKeyboardNavEvent<T extends string> = {
  from: T
  to: T
  direction: TabDirection
}

export type UseRovingTablistOptions<T extends string> = {
  tabs: readonly T[]
  activeTab: T
  onActivate: (tab: T) => void
  getTabElementId: (tab: T) => string
  onKeyboardNav?: (event: RovingTablistKeyboardNavEvent<T>) => void
}

export function getNextTabIndex(
  currentIndex: number,
  tabCount: number,
  direction: TabDirection,
): number {
  if (tabCount <= 0) {
    return 0
  }

  if (direction === "right") {
    return (currentIndex + 1) % tabCount
  }

  return (currentIndex - 1 + tabCount) % tabCount
}

export function useRovingTablist<T extends string>({
  tabs,
  activeTab,
  onActivate,
  getTabElementId,
  onKeyboardNav,
}: UseRovingTablistOptions<T>) {
  const handleTabKeyDown = useCallback(
    (event: React.KeyboardEvent, tab: T) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
        return
      }

      const direction: TabDirection = event.key === "ArrowRight" ? "right" : "left"

      event.preventDefault()

      const currentIndex = tabs.indexOf(tab)
      if (currentIndex === -1) {
        return
      }

      const nextIndex = getNextTabIndex(currentIndex, tabs.length, direction)
      const nextTab = tabs[nextIndex]
      if (!nextTab) {
        return
      }

      onActivate(nextTab)
      onKeyboardNav?.({ from: tab, to: nextTab, direction })

      queueMicrotask(() => {
        document.getElementById(getTabElementId(nextTab))?.focus()
      })
    },
    [tabs, onActivate, getTabElementId, onKeyboardNav],
  )

  const getTabProps = useCallback(
    (tab: T) => ({
      tabIndex: activeTab === tab ? 0 : -1,
      onKeyDown: (event: React.KeyboardEvent) => handleTabKeyDown(event, tab),
    }),
    [activeTab, handleTabKeyDown],
  )

  return { getTabProps }
}
