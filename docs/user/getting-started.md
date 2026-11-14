# Getting started

PGP Key Manager is a web app for storing and lifecycle-managing OpenPGP keys. Sign in with Auth0, work in your **personal vault** or a **team vault**, and use dedicated pages for create, import, and key detail.

## First visit

1. Open the app (local default: `http://localhost:5173`, Docker: `http://localhost`).
2. On **Overview**, confirm the footer shows **API Connected** (`GET /api/hello` → `ok`).
3. Sign in with Auth0 when prompted.

## Your first key

Create and import are **not** in the sidebar. Open a vault list first, then use the buttons in the list header.

1. In the sidebar, choose a vault:
   - **Personal vault** — your keys (`/keys`)
   - Or expand a team under **Team vaults**
2. Open a list view: **Public**, **Private**, or **Subkeys** (or click the vault name itself).
3. On the keys list, click **Create key** or **Import key**.

| Goal | List button | Page | Guide |
|------|-------------|------|-------|
| Generate a new primary key | **Create key** | `/keys/new` | [Create a primary key](./keys/create) |
| Register existing armor | **Import key** | `/keys/import` | [Import and preview](./keys/import-and-preview) |

After create or import, you land on key detail (or the list). From there you can add subkeys, export, revoke, and more.

## Where things live

| Area | Location |
|------|----------|
| Personal keys | Sidebar → **Personal vault** → Public / Private / Subkeys |
| Team vaults | Sidebar → **Team vaults** accordion ([details](./teams/vaults)) |
| Create / Import | Keys list header (after opening a vault view) |
| Storage connections | `/settings` ([details](./settings/storage-connections)) |
| Policies | `/policies` — placeholder (not implemented yet) |

## See also

- [Primary vs subkey](./concepts/primary-vs-subkey)
- [Vault ownership](./concepts/vault-ownership)
- [Local setup](/develop/local-setup) if you are running the stack yourself
