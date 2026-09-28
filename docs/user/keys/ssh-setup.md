# SSH setup

For **authenticate** subkeys with SSH-compatible algorithms (`ed25519`, `rsa`, `ecdsa`), Overview shows an **SSH setup** card.

![SSH setup password dialog](/assets/screenshots/ssh-setup-password-dialog.svg)

*Screenshot placeholder: one-time archive password dialog after downloading the setup pack.*

## On servers

Copy or download the OpenSSH **public** key (`.pub`) from the server. No passphrase required.

## On this computer (setup pack)

1. Enter the vault passphrase and confirm the warning.
2. **Download SSH setup pack** — AES-256 encrypted zip in a JSON envelope with a one-time `archivePassword`.
3. A **blocking dialog** shows the password once. Copy it, then dismiss. Re-download generates a **new** password.

### Inside the zip

- OpenSSH **private** key (unencrypted PEM inside the zip)
- Matching `.pub`
- `README.txt` and `config-snippet.txt`

### Tooling compatibility

Open the zip with **7-Zip**, PeaZip, or The Unarchiver. macOS Archive Utility / Finder, stock Info-ZIP `unzip`, and older Windows Explorer do **not** support WinZip AES (you may see “unsupported compression method 99”).

## Limits

- Encrypt-only subkeys hide SSH setup.
- Revoked auth subkeys can still export `.pub` but not the pack.
- The archive password is never logged or stored in the zip.

## See also

- [Export public](./export-public)
- [Export private](./export-private)
- [Key detail](./detail)
