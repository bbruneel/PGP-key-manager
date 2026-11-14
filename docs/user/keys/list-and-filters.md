# List and filters

Browse keys in your personal vault or a team vault. URL query params drive filters so views stay shareable and bookmarkable.

## Open a vault list

1. Sidebar → **Personal vault**, or expand a team under **Team vaults**.
2. Choose **Public**, **Private**, or **Subkeys** (or the vault parent link).

That lands you on `/keys` (personal) or `/groups/{groupId}/keys` (team), with optional `?view=…`.

## Create and import

The list header includes **Create key** and **Import key**. Those actions are not in the sidebar — open a vault list first, then use the header buttons. See [Create](./create) and [Import and preview](./import-and-preview).

## Views and filters

| Query | Purpose |
|-------|---------|
| `view=public\|private\|subkeys` | Focus the list on public-capable, private material, or subkey rows |
| `status=` | Active / revoked / expired-style filters (see UI) |
| `capability=` | Filter by OpenPGP capability |
| `groupId` + `scope` | Team vault scoping (`personal` / `group` / `all`) |

Sidebar **Team vaults** links prefill group scope. **Personal vault** clears the active group.

## Bulk public export

From the list you can export public armor for multiple selected keys. If some keys fail, the app still downloads successful exports and shows a partial-success toast with failed labels.

## See also

- [Key detail](./detail)
- [Team vaults](../teams/vaults)
- [Export public](./export-public)
