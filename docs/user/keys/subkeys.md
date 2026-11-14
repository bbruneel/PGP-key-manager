# Subkeys

Subkeys are metadata rows under a **primary**. Armored keyring bytes live on the primary row; subkey rows store fingerprint, capabilities, algorithm, and expiry.

## How to get here

1. Open a vault list → **View** a **primary** key.
2. Open the **Subkeys** tab on key detail.

The sidebar vault **Subkeys** filter lists subkey rows across the vault; open one with **View** to work on that subkey (for example rotate or SSH setup). Adding new subkeys is done from the **primary’s** Subkeys tab.

## Add a subkey

1. On the primary **Subkeys** tab, use **Add subkey** (requires private material on the primary).
2. Choose capabilities (not `certify`), algorithm (filtered by capability and primary OpenPGP version), and passphrase.
3. On success, the list refreshes and you navigate to the new subkey.

Metadata-only (public) primaries show a hint to import private material instead of the form.

## Import subkeys from keyring

On the same primary **Subkeys** tab, use **Import subkeys from keyring** to register missing subkey fingerprints from stored primary armor (idempotent). Preview is available before commit. If the keyring shows revocation, existing rows can sync to revoked (including the primary).

## Rotate

Open the **subkey** (from the primary Subkeys list or the vault Subkeys view) → **Actions & Lifecycle** → **Rotate**. Creates a replacement subkey (optionally revoking the previous one). Requires the primary passphrase. Algorithm pickers follow the same capability rules as create.

## See also

- [Key detail](./detail)
- [Primary vs subkey](../concepts/primary-vs-subkey)
- [Import and preview](./import-and-preview)
- [SSH setup](./ssh-setup)
