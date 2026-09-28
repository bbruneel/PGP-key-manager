# Phase history

Archived implementation phases for PGP Key Manager. Current product behavior is documented under [User guide](/user/getting-started) and [Architecture](/develop/architecture). Agent operating rules live in [`AGENTS.md`](https://github.com/bbruneel/PGP-key-manager/blob/main/AGENTS.md) without repeating this list.

| Phase | Summary |
|-------|---------|
| **1** | Create primary at `/keys/new` — `keysApi.create()`, `[pgp-ui]` create events |
| **2** | Import at `/keys/import` — register-only payload; server parses armor metadata |
| **3** | Key detail lifecycle — get, subkeys, revoke, extend, rotate, export public |
| **4** | Inline add subkey on primary detail |
| **5** | Import subkeys from multi-key keyrings; auto-register on primary import |
| **6** | Extended algorithms (RSA/ECDSA/ECDH, Ed448/X448 on v6) |
| **7** | Update/delete label; list filters; bulk public export; sidebar Keys submenu |
| **8** | Import preview; revocation detection; private-preferred keyring |
| **9** | SSH public key export for authenticate subkeys |
| **PR #33** | Tabbed key detail (Overview / Subkeys / Actions) |
| **10a** | Roving tabindex keyboard navigation on tabs |
| **11** | Remount detail on route change — no passphrase leakage |
| **12** | Extract OverviewTab / SubkeysTab / ActionsTab |
| **13** | Primary revocation sync on re-import; bulk export partial success |
| **14** | Wipeable `char[]` passphrases on backend |
| **15** | Dependency security maintenance (Spring Boot 4.1, Flyway 12.11.x, CVE guards) |
| **16** | Team vaults — groups API, GroupProvider, members, `ownerGroupId`; sidebar `TeamVaultsNav` |
| **17a** | BYO storage connection registry (no S3 I/O yet) |
| **18** | SSH setup pack (AES zip + one-time password dialog) |
| **19** | Transfer ownership between personal and team vaults |
| **20** | Private keyring export Mode A (ciphertext) / Mode B (rewrap) |
| **21** | Export / apply primary revocation certificates |
| **21a** | Primary revoke cascades active subkey DB rows |

## Deferred / later

- Phase **17b+** — STS assume-role and S3 keyring I/O
- **Policies** UI (`/policies` placeholder)
- Expiry alert jobs
- Public key hosting

## See also

- [Architecture](/develop/architecture)
- [Manual QA](/develop/manual-qa)
