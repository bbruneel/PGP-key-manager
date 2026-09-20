const LAST_EXPANDED_TEAM_VAULT_KEY = "pgp.lastExpandedTeamVaultId"

export function getLastExpandedTeamVaultId(): string | null {
  try {
    const value = window.localStorage.getItem(LAST_EXPANDED_TEAM_VAULT_KEY)
    return value && value.trim() ? value : null
  } catch {
    return null
  }
}

export function setLastExpandedTeamVaultId(groupId: string | null): void {
  try {
    if (!groupId) {
      window.localStorage.removeItem(LAST_EXPANDED_TEAM_VAULT_KEY)
      return
    }
    window.localStorage.setItem(LAST_EXPANDED_TEAM_VAULT_KEY, groupId)
  } catch {
    // Ignore quota / private-mode failures; nav still works without persistence.
  }
}

export function resolveTeamVaultIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/groups\/([^/]+)(?:\/|$)/)
  const groupId = match?.[1] ?? null
  if (!groupId || groupId === "new") {
    return null
  }
  return groupId
}
