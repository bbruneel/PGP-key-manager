# Subkeys

Subkeys are metadata rows under a **primary**. Armored keyring bytes live on the primary row; subkey rows store fingerprint, capabilities, algorithm, and expiry.

## Add a subkey

1. Open a **primary** with private material (`/keys/:id` → **Subkeys**).
2. Use **Add subkey**: choose capabilities (not `certify`), algorithm (filtered by capability and primary OpenPGP version), and passphrase.
3. On success, the list refreshes and you navigate to the new subkey.

Metadata-only (public) primaries show a hint to import private material instead of the form.

## Import subkeys from keyring

Paste or use stored primary armor to register missing subkey fingerprints under the primary (idempotent). Preview is available before commit. If the keyring shows revocation, existing rows can sync to revoked (including the primary).

## Rotate

On a subkey, **Rotate** creates a replacement subkey (optionally revoking the previous one). Requires the primary passphrase. Algorithm pickers follow the same capability rules as create.

## See also

- [Primary vs subkey](../concepts/primary-vs-subkey)
- [Import and preview](./import-and-preview)
- [Key detail](./detail)
