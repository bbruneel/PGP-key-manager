# Export public

Download or copy armored public key material from key detail **Overview**.

## Steps

1. Open `/keys/:id`.
2. Use **Copy** or **Download** on the public export control.
3. The page caches a single `exportPublic` fetch for both copy and download.

## Bulk export

From the [keys list](./list-and-filters), select multiple keys and export public armor in one pass. Partial failures still download successful keys.

## See also

- [Export private](./export-private) (owner-only secret keyring)
- [SSH setup](./ssh-setup) (authenticate subkeys)
