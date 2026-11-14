# Members and invites

Manage who can access a team vault.

## How to open members

1. Sidebar → **Team vaults** → expand the team.
2. Click **Members** (under Public / Private / Subkeys).

That opens `/groups/{groupId}/members`. There is no top-level “Members” item outside a team.

## Members page

- Member list and role
- Summary metrics for the vault
- Optional members audit CSV export (API: `GET /api/groups/{groupId}/members/audit.csv`)

## Roles (high level)

| Role | Typical powers |
|------|----------------|
| **Owner** | Transfer ownership of vault keys, full group admin |
| **Member** | Use keys per ACL; private keyring export is owner-only |

Authorization is enforced from application `group_members` data (not Auth0 Organization claims).

## Invites

Owners can create invites from the members/invites UI. Invitees accept via `POST /api/invites/{token}/accept` (SPA flow when linked).

Members can leave (`DELETE .../members/me`) subject to group rules.

## See also

- [Team vaults](./vaults)
- [Vault ownership](../concepts/vault-ownership)
- [Transfer ownership](../keys/transfer-ownership)
