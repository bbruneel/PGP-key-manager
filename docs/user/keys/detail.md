# Key detail

Each key has a dedicated page at `/keys/:id` with a tabbed layout.

![Key detail tabs](/assets/screenshots/key-detail-tabs.svg)

*Screenshot placeholder: Overview / Subkeys / Actions & Lifecycle tab bar on primary key detail.*

## Tabs

| Tab | Who | Contents |
|-----|-----|----------|
| **Overview** | All keys | Metadata, ownership badge, public export, SSH setup (auth subkeys), private keyring export (primary owner) |
| **Subkeys** | Primaries only | Subkey list, add subkey, import from keyring |
| **Actions & Lifecycle** | All keys | Revoke, revocation certificates, extend expiry, rotate (subkeys), transfer ownership, edit label, delete |

Use `?tab=actions` (and similar) to deep-link into a tab. Arrow keys move across the tab bar when a tab button is focused (roving tabindex).

## Ownership badge

Shows **Personal vault** or **Owned by {group}**. See [Vault ownership](../concepts/vault-ownership).

## Safety

Navigating from one key to another remounts the detail page so passphrase fields cannot leak across keys.

## See also

- [Subkeys](./subkeys)
- [Export private](./export-private)
- [SSH setup](./ssh-setup)
- [Revoke and certificates](./revoke-and-certs)
- [Transfer ownership](./transfer-ownership)
