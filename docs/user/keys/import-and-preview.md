# Import and preview

Register an existing OpenPGP key from armored public and/or private blocks. The server parses fingerprint, algorithm, capabilities, expiry, and revocation from the armor.

![Import preview table](/assets/screenshots/import-preview-table.svg)

*Screenshot placeholder: import preview table with primary + subkey rows and status badges.*

## Steps

1. In the sidebar, open **Personal vault** or a team under **Team vaults**.
2. Open a list view — **Public**, **Private**, or **Subkeys** — so the keys list is visible.
3. Click **Import key** in the list header (navigates to `/keys/import`).
4. Choose public or private mode and paste armored material. Fingerprint is optional (derived from armor when omitted).
5. Click **Preview** to parse without writing to the database. Review warnings, revocation badges, and subkey rows.
6. Confirm team vault ownership if applicable, then **Import**.
7. On success you redirect to `/keys/:id`. If the keyring contained subkeys, a toast reports how many subkey rows were registered.

## Behavior details

- **Register-only payload** — never send a generate passphrase or `algorithmSpec` on import.
- When **both** public and private blocks are pasted, the **private-derived** keyring is preferred.
- Multi-key exports can auto-register metadata-only subkey rows (`registeredSubkeyCount`).
- Re-import of the same fingerprint can sync revocation from armor (upsert returns HTTP 200).
- There is no sidebar “Import” item; the button lives on the [keys list](./list-and-filters).

## See also

- [Create a primary key](./create)
- [List and filters](./list-and-filters)
- [Subkeys](./subkeys) (import from keyring on detail)
- [Revoke and certificates](./revoke-and-certs)
