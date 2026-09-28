# Revoke and certificates

Two different kill-switches exist for **primary** keys.

![Revoke vs revocation certificate](/assets/screenshots/revoke-vs-revocation-cert.svg)

*Screenshot placeholder: Actions & Lifecycle sibling cards — Revoke now vs Generate/Apply revocation certificate.*

## Revoke now

Immediately marks the key revoked in the vault. Cryptographic revocation in the keyring requires private material + passphrase. Public-only keys get metadata revocation only.

When a **primary** is revoked, still-active child **subkey rows** are marked revoked in the database with the same timestamp/reason. This does **not** add OpenPGP `SUBKEY_REVOCATION` packets — primary `KEY_REVOCATION` already invalidates the certificate for OpenPGP consumers.

## Generate revocation certificate

Downloads a GnuPG-compatible armored public key block with a `KEY_REVOCATION` signature.

- Does **not** revoke the key in the vault.
- Requires private material + passphrase.
- Store the file offline as a break-glass control.

## Apply revocation certificate

Paste a previously generated (or external) cert. No passphrase. The server verifies fingerprint + signature, merges into stored rings, and marks the primary revoked. Metadata-only revoked keys can still sync armor. Applying again is a no-op when rings already contain `KEY_REVOCATION` (cascade still cleans leftover active subkeys).

## Subkeys

Generate/apply cert cards are primary-only. Subkey-only revoke does not cascade to siblings.

## See also

- [Key detail](./detail)
- [Import and preview](./import-and-preview) (revocation detection from armor)
- [Primary vs subkey](../concepts/primary-vs-subkey)
