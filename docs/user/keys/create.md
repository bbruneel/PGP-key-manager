# Create a primary key

Generate a new OpenPGP **primary** key in your personal vault or an active team vault.

![Create primary key form](/assets/screenshots/create-vs-import.svg)

*Screenshot placeholder: `/keys/new` form (identity, passphrase, advanced algorithm options).*

## Steps

1. Open **Keys → Create** (`/keys/new`), or use the create action from the keys list.
2. Fill **name** / identity fields and a **passphrase** (server never stores the passphrase).
3. Optionally expand **Advanced options** for algorithm (Ed25519 default; RSA / ECDSA / Ed448) and OpenPGP version (`4` default, `6` for RFC 9580 features such as Ed448).
4. If a team vault is active, confirm **Store key in team vault** as needed.
5. Submit. On success you get a toast with the fingerprint and navigate to the key list or detail.

## Notes

- Create uses a dedicated page — not a modal — so the form stays deep-linkable.
- Subkeys are added later from key detail ([Subkeys](./subkeys)).
- Passphrase fields are cleared after submit.

## See also

- [Import and preview](./import-and-preview)
- [Primary vs subkey](../concepts/primary-vs-subkey)
- [Team vaults](../teams/vaults)
