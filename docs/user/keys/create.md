# Create a primary key

Generate a new OpenPGP **primary** key in your personal vault or an active team vault.

![Create primary key form](/assets/screenshots/create-vs-import.svg)

*Screenshot placeholder: `/keys/new` form (identity, passphrase, advanced algorithm options).*

## Steps

1. In the sidebar, open **Personal vault** or a team under **Team vaults**.
2. Open a list view — **Public**, **Private**, or **Subkeys** — so the keys list is visible.
3. Click **Create key** in the list header (navigates to `/keys/new`).
4. Fill **name** / identity fields and a **passphrase** (server never stores the passphrase).
5. Optionally expand **Advanced options** for algorithm (Ed25519 default; RSA / ECDSA / Ed448) and OpenPGP version (`4` default, `6` for RFC 9580 features such as Ed448).
6. If a team vault is active, confirm **Store key in team vault** as needed.
7. Submit. On success you get a toast with the fingerprint and navigate to the key list or detail.

## Notes

- Create uses a dedicated page — not a modal — so the form stays deep-linkable.
- There is no sidebar “Create” item; the button lives on the [keys list](./list-and-filters).
- Subkeys are added later from key detail ([Subkeys](./subkeys)).
- Passphrase fields are cleared after submit.

## See also

- [Import and preview](./import-and-preview)
- [List and filters](./list-and-filters)
- [Primary vs subkey](../concepts/primary-vs-subkey)
- [Team vaults](../teams/vaults)
