# Import and preview

Register an existing OpenPGP key from armored public and/or private blocks. The server parses fingerprint, algorithm, capabilities, expiry, and revocation from the armor.

![Import preview table](/assets/screenshots/import-preview-table.svg)

*Screenshot placeholder: import preview table with primary + subkey rows and status badges.*

## Steps

1. Open **Keys → Import** (`/keys/import`).
2. Choose public or private mode and paste armored material. Fingerprint is optional (derived from armor when omitted).
3. Click **Preview** to parse without writing to the database. Review warnings, revocation badges, and subkey rows.
4. Confirm team vault ownership if applicable, then **Import**.
5. On success you redirect to `/keys/:id`. If the keyring contained subkeys, a toast reports how many subkey rows were registered.

## Behavior details

- **Register-only payload** — never send a generate passphrase or `algorithmSpec` on import.
- When **both** public and private blocks are pasted, the **private-derived** keyring is preferred.
- Multi-key exports can auto-register metadata-only subkey rows (`registeredSubkeyCount`).
- Re-import of the same fingerprint can sync revocation from armor (upsert returns HTTP 200).

## See also

- [Create a primary key](./create)
- [Subkeys](./subkeys) (import from keyring on detail)
- [Revoke and certificates](./revoke-and-certs)
