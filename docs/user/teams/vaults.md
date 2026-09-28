# Team vaults

Team vaults share keys among group members. Navigation lives in the sidebar **Team vaults** accordion (`TeamVaultsNav`) — not a top-bar switcher.

![Team vaults sidebar](/assets/screenshots/team-vaults-sidebar.svg)

*Screenshot placeholder: sidebar accordion with a team expanded (Public / Private / Subkeys / Members).*

## Personal vs team

| Scope | Behavior |
|-------|----------|
| **Personal vault** | Clears active group; `/keys` lists personal keys (`scope=personal`) |
| **Team vault** | Expand a team in the sidebar; Public/Private/Subkeys/Members links scope to that group |

Last expanded team id is persisted in `localStorage` (`pgp.lastExpandedTeamVaultId`).

## Create a team

1. Open `/groups/new`.
2. Name the team and submit.
3. You redirect to `/groups/{groupId}/keys`.

## Assigning keys

On create or import, you can set **Store key in team vault** when a group is active (`ownerGroupId`). Key detail shows an ownership badge.

## See also

- [Members and invites](./members-and-invites)
- [Vault ownership](../concepts/vault-ownership)
- [Transfer ownership](../keys/transfer-ownership)
