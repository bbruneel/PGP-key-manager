# SSH setup

For **authenticate** subkeys with SSH-compatible algorithms (`ed25519`, `rsa`, `ecdsa`), Overview shows an **SSH setup** card.

![SSH setup password dialog](/assets/screenshots/ssh-setup-password-dialog.svg)

*Screenshot placeholder: one-time archive password dialog after downloading the setup pack.*

## How to get here

1. Open a vault list (Personal or team → Public / Private / Subkeys).
2. Open the **primary**, then **Subkeys**, and **View** an authenticate subkey — or open a subkey row from the vault **Subkeys** list.
3. On that subkey’s **Overview**, use the **SSH setup** card.

Encrypt-only subkeys do not show this card.

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
- Pack download needs private material on the **primary**.

## See also

- [Key detail](./detail)
- [Subkeys](./subkeys)
- [Export public](./export-public)
- [Export private](./export-private)
