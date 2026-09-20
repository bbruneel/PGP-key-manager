import { afterEach, describe, expect, it } from "vitest"

import {
  getLastExpandedTeamVaultId,
  resolveTeamVaultIdFromPath,
  setLastExpandedTeamVaultId,
} from "@/lib/team-vault-nav"

describe("team-vault-nav", () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it("persists and reads the last expanded team vault id", () => {
    expect(getLastExpandedTeamVaultId()).toBeNull()
    setLastExpandedTeamVaultId("group-abc")
    expect(getLastExpandedTeamVaultId()).toBe("group-abc")
    setLastExpandedTeamVaultId(null)
    expect(getLastExpandedTeamVaultId()).toBeNull()
  })

  it("resolves a team vault id from group routes", () => {
    expect(resolveTeamVaultIdFromPath("/groups/group-1/keys")).toBe("group-1")
    expect(resolveTeamVaultIdFromPath("/groups/group-1/members")).toBe("group-1")
    expect(resolveTeamVaultIdFromPath("/keys")).toBeNull()
    expect(resolveTeamVaultIdFromPath("/groups/new")).toBeNull()
  })
})
