# Vault ownership

Keys belong to either a **personal vault** (user) or a **team vault** (group).

## Models

| Owner type | Who can access | Who can transfer / private-export |
|------------|----------------|-----------------------------------|
| Personal | Owning user | Personal owner |
| Team (`ownerGroupId`) | Group members per ACL | Group **OWNER** for transfer and Mode A/B private export |

## UI cues

- Ownership badge on key detail: `Personal vault` or `Owned by {group}`.
- Sidebar **Team vaults** scopes lists; **Personal vault** clears `activeGroupId`.
- Create/import can assign `ownerGroupId` when a team is active.

## Transfer

Moving a primary between vaults uses [Transfer ownership](../keys/transfer-ownership) (subkeys cascade). Fingerprint uniqueness is enforced per destination vault.

## Auth0 note

Auth0 provides identity (JWT). Group membership and roles are stored in the app database (`group_members`), not Auth0 Organization claims.

## See also

- [Team vaults](../teams/vaults)
- [Members and invites](../teams/members-and-invites)
- [Export private](../keys/export-private)
