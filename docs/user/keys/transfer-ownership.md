# Transfer ownership

Move a **primary** key (and all its subkeys) between personal and team vaults without rewriting cryptographic material.

![Transfer ownership confirm](/assets/screenshots/transfer-ownership-confirm.svg)

*Screenshot placeholder: Ownership card confirm summary on Actions & Lifecycle.*

## Where

Key detail → **Actions & Lifecycle** → **Ownership** card (not Danger Zone). Deep link: `/keys/:id?tab=actions`.

## Destinations

| From | To | Notes |
|------|----|-------|
| Personal | Team | Caller must be personal owner; must belong to the target team |
| Team | Team | Caller must be group **owner** on the source team |
| Team | Personal | Caller must be group **owner**; `targetUserId` required and must be a source-group member |

## Rules

- Primary only (subkey detail has no transfer card).
- Revoked keys are blocked.
- Fingerprint conflicts in the destination vault hard-fail (**409**).
- No bulk move; no S3/`storage_ref` path migration (bytes stay inline in Postgres).

## See also

- [Vault ownership](../concepts/vault-ownership)
- [Team vaults](../teams/vaults)
- [Key detail](./detail)
