# Team vaults

Team vaults share keys among group members. Navigation lives in the sidebar **Team vaults** accordion (`TeamVaultsNav`) — not a top-bar switcher.

![Team vaults sidebar](/assets/screenshots/team-vaults-sidebar.svg)

*Screenshot placeholder: sidebar accordion with a team expanded (Public / Private / Subkeys / Members).*

## Personal vs team

| Scope | Behavior |
|-------|----------|
| **Personal vault** | Clears active group; `/keys` lists personal keys (`scope=personal`) |
| **Team vault** | Expand a team in the sidebar; Public / Private / Subkeys / Members links scope to that group |

Last expanded team id is persisted in `localStorage` (`pgp.lastExpandedTeamVaultId`).

## Create a team

1. Click **New group** in the top header, or the **+** next to **Team vaults** in the sidebar (empty state also shows **New group**).
2. That opens `/groups/new` — name the team and submit.
3. You redirect to `/groups/{groupId}/keys` (team keys list).

## Assigning keys

1. Expand the team in the sidebar and open **Public**, **Private**, or **Subkeys**.
2. Use **Create key** or **Import key** on the team keys list header (same buttons as personal vault — not in the sidebar).
3. On the form, confirm **Store key in team vault** when the group is active (`ownerGroupId`).

Key detail shows an ownership badge.

## See also

- [Members and invites](./members-and-invites)
- [List and filters](../keys/list-and-filters)
- [Vault ownership](../concepts/vault-ownership)
- [Transfer ownership](../keys/transfer-ownership)
