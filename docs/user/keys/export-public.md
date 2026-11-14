# Export public

Download or copy armored public key material from key detail **Overview**.

## Steps

1. Open a vault list (sidebar → **Personal vault** or a team → Public / Private / Subkeys).
2. Click **View** on the key → key detail **Overview**.
3. Use **Copy** or **Download** on the public export control.
4. The page caches a single `exportPublic` fetch for both copy and download.

## Bulk export

From the [keys list](./list-and-filters), select multiple keys and use **Export selected** for public armor in one pass. Partial failures still download successful keys. The top bar **Export keys** link only opens the personal keys list — selection and export happen on that page.

## See also

- [Key detail](./detail)
- [Export private](./export-private) (owner-only secret keyring)
- [SSH setup](./ssh-setup) (authenticate subkeys)
