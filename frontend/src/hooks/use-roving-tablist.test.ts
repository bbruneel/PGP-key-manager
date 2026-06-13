import { renderHook } from "@testing-library/react"
import type { KeyboardEvent } from "react"
import { describe, expect, it, vi } from "vitest"

import {
  getNextTabIndex,
  useRovingTablist,
  type TabDirection,
} from "@/hooks/use-roving-tablist"

describe("getNextTabIndex", () => {
  it("moves right from middle tab", () => {
    expect(getNextTabIndex(1, 3, "right")).toBe(2)
  })

  it("wraps right on last tab to first", () => {
    expect(getNextTabIndex(2, 3, "right")).toBe(0)
  })

  it("wraps left on first tab to last", () => {
    expect(getNextTabIndex(0, 3, "left")).toBe(2)
  })

  it("moves left from middle tab", () => {
    expect(getNextTabIndex(1, 3, "left")).toBe(0)
  })
})

describe("useRovingTablist", () => {
  function setup(
    overrides: Partial<Parameters<typeof useRovingTablist>[0]> = {},
  ) {
    const onActivate = vi.fn()
    const onKeyboardNav = vi.fn()
    const tabs = ["overview", "subkeys", "actions"] as const

    const { result, rerender } = renderHook(
      (props: { activeTab: (typeof tabs)[number] }) =>
        useRovingTablist({
          tabs,
          activeTab: props.activeTab,
          onActivate,
          getTabElementId: (tab) => `key-detail-${tab}-tab`,
          onKeyboardNav,
          ...overrides,
        }),
      { initialProps: { activeTab: "overview" as const } },
    )

    return { result, rerender, onActivate, onKeyboardNav, tabs }
  }

  function keyDown(
    element: HTMLElement,
    key: string,
    props: ReturnType<ReturnType<typeof useRovingTablist>["getTabProps"]>,
  ) {
    props.onKeyDown({
      key,
      preventDefault: vi.fn(),
      currentTarget: element,
    } as unknown as KeyboardEvent<HTMLElement>)
  }

  it("sets tabindex 0 only on active tab", () => {
    const { result } = setup()

    expect(result.current.getTabProps("overview").tabIndex).toBe(0)
    expect(result.current.getTabProps("subkeys").tabIndex).toBe(-1)
    expect(result.current.getTabProps("actions").tabIndex).toBe(-1)
  })

  it("activates next tab on ArrowRight with automatic activation", () => {
    const { result, onActivate, onKeyboardNav } = setup()
    const overviewTab = document.createElement("button")
    overviewTab.id = "key-detail-overview-tab"
    document.body.appendChild(overviewTab)

    const subkeysTab = document.createElement("button")
    subkeysTab.id = "key-detail-subkeys-tab"
    document.body.appendChild(subkeysTab)

    keyDown(overviewTab, "ArrowRight", result.current.getTabProps("overview"))

    expect(onActivate).toHaveBeenCalledWith("subkeys")
    expect(onKeyboardNav).toHaveBeenCalledWith({
      from: "overview",
      to: "subkeys",
      direction: "right" satisfies TabDirection,
    })

    document.body.removeChild(overviewTab)
    document.body.removeChild(subkeysTab)
  })

  it("ignores unrelated keys", () => {
    const { result, onActivate, onKeyboardNav } = setup()
    const overviewTab = document.createElement("button")

    keyDown(overviewTab, "Tab", result.current.getTabProps("overview"))
    keyDown(overviewTab, "Enter", result.current.getTabProps("overview"))

    expect(onActivate).not.toHaveBeenCalled()
    expect(onKeyboardNav).not.toHaveBeenCalled()
  })

  it("calls preventDefault for arrow keys", () => {
    const { result } = setup()
    const overviewTab = document.createElement("button")
    const preventDefault = vi.fn()

    result.current.getTabProps("overview").onKeyDown({
      key: "ArrowLeft",
      preventDefault,
      currentTarget: overviewTab,
    } as unknown as KeyboardEvent<HTMLElement>)

    expect(preventDefault).toHaveBeenCalled()
  })

  it("focuses target tab element after keyboard navigation", async () => {
    const { result, onActivate } = setup()
    const overviewTab = document.createElement("button")
    overviewTab.id = "key-detail-overview-tab"
    document.body.appendChild(overviewTab)

    const actionsTab = document.createElement("button")
    actionsTab.id = "key-detail-actions-tab"
    document.body.appendChild(actionsTab)

    keyDown(overviewTab, "ArrowLeft", result.current.getTabProps("overview"))

    expect(onActivate).toHaveBeenCalledWith("actions")

    await vi.waitFor(() => {
      expect(document.activeElement).toBe(actionsTab)
    })

    document.body.removeChild(overviewTab)
    document.body.removeChild(actionsTab)
  })

  it("activates first tab with Home key", () => {
    const { result, onActivate, onKeyboardNav } = setup({ activeTab: "actions" })
    const actionsTab = document.createElement("button")
    actionsTab.id = "key-detail-actions-tab"
    document.body.appendChild(actionsTab)

    const overviewTab = document.createElement("button")
    overviewTab.id = "key-detail-overview-tab"
    document.body.appendChild(overviewTab)

    keyDown(actionsTab, "Home", result.current.getTabProps("actions"))

    expect(onActivate).toHaveBeenCalledWith("overview")
    expect(onKeyboardNav).toHaveBeenCalledWith({
      from: "actions",
      to: "overview",
      direction: "first",
    })

    document.body.removeChild(actionsTab)
    document.body.removeChild(overviewTab)
  })

  it("activates last tab with End key", () => {
    const { result, onActivate, onKeyboardNav } = setup({ activeTab: "overview" })
    const overviewTab = document.createElement("button")
    overviewTab.id = "key-detail-overview-tab"
    document.body.appendChild(overviewTab)

    const actionsTab = document.createElement("button")
    actionsTab.id = "key-detail-actions-tab"
    document.body.appendChild(actionsTab)

    keyDown(overviewTab, "End", result.current.getTabProps("overview"))

    expect(onActivate).toHaveBeenCalledWith("actions")
    expect(onKeyboardNav).toHaveBeenCalledWith({
      from: "overview",
      to: "actions",
      direction: "last",
    })

    document.body.removeChild(overviewTab)
    document.body.removeChild(actionsTab)
  })
})

