# Export private

Back up or migrate the **primary** full secret keyring (OpenPGP armor). This is distinct from the [SSH setup pack](./ssh-setup).

![Private export Mode B](/assets/screenshots/export-private-mode-b.svg)

*Screenshot placeholder: Overview Export private card with “Export with a new passphrase” checked.*

## Who can download

- **Personal vault:** personal key owner only.
- **Team vault:** group **OWNER** role only. Members see owner-only copy; the API uses hide-with-404 for others.

## Modes

| Mode | Request | Effect |
|------|---------|--------|
| **A — Ciphertext download** | Omit passphrase fields | Downloads stored passphrase-protected secret armor as-is |
| **B — Rewrap** | `passphrase` + `newPassphrase` | Unlocks with vault passphrase and rewraps for download only; vault passphrase unchanged |

Check **Export with a new passphrase** to enable Mode B fields (disabled until checked).

## Limits

- Primary keys only (full keyring).
- Requires stored private material; revoked keys are blocked for this export.
- Response is `Cache-Control: no-store`.

## See also

- [Vault ownership](../concepts/vault-ownership)
- [SSH setup](./ssh-setup)
- [Key detail](./detail)
