# Manual QA

API smoke scripts automate backend paths; these UI steps still need a human pass when a PR test plan lists them.

> Canonical location for this checklist. `scripts/MANUAL_CHECKS.md` redirects here.

## Prerequisites

1. **Backend** — `cd backend && ./mvnw spring-boot:run` (http://localhost:8080)
2. **Frontend** — `cd frontend && npm run dev` (http://localhost:5173)
3. **Auth0** — configured in `frontend/.env.local`
4. **Sign in** to the SPA

### ACCESS_TOKEN (for API smokes only)

While signed in, open DevTools → **Network** → reload **Keys** → open `GET /api/keys` → copy the JWT from `Authorization: Bearer …` (without the `Bearer ` prefix).

```bash
export ACCESS_TOKEN='eyJ...'
```

## Quick API regression

```bash
ACCESS_TOKEN="$ACCESS_TOKEN" ./scripts/run-phase6-smokes.sh
```

| Script | Purpose |
|--------|---------|
| `smoke-create-key.sh` | Create primary (Ed25519 default) |
| `SMOKE_RSA_PRIMARY=1 smoke-create-key.sh` | RSA 4096 primary |
| `SMOKE_OPENPGP_VERSION=6 SMOKE_ALGORITHM=ed448 SMOKE_X448_SUBKEY=1 smoke-create-key.sh` | Ed448 v6 + X448 subkey |
| `smoke-lifecycle-key.sh` | Full lifecycle + RSA/ECDH tail |
| `smoke-rotate-legacy.sh` | Import gpg legacy keyring + rotate (needs `gpg`) |
| `generate-legacy-gpg-keyring.sh` | Produce armored keys for import tests |

Optional cleanup: `SMOKE_CLEANUP=1`.

## Team vaults

1. Open `/groups/new`, create a group, confirm redirect to `/groups/{groupId}/keys`.
2. Verify sidebar **Team vaults** expands the new team (Public / Private / Subkeys / Members). Last expanded team persists across reloads.
3. From `/keys/new`, confirm **Store key in team vault** when the team is active; ownership badge shows `Owned by {group}`.
4. From `/keys/import`, confirm team vault default; key appears under `/groups/{groupId}/keys`.
5. Open personal **Keys** and confirm only personal keys (`scope=personal`).
6. Open `/groups/{groupId}/members` — member list + summary load.
7. Switch to **Personal vault** in the sidebar, then back to the team — routes update.

## Storage connections (17a)

1. `/settings` → **Cloud storage connections** loads.
2. **Add AWS S3 connection** → appears as **registered**.
3. Detail shows connection ID, prefix, role ARN, external ID, Phase 17b hint.
4. Edit name; delete unused connection.
5. Optional: `GET /api/storage-connections` returns `provider: aws-s3`.

## Algorithms / import rotate (Phase 6)

Follow legacy import → rotate and advanced create flows:

1. `./scripts/generate-legacy-gpg-keyring.sh` (and `LEGACY_PROFILE=ecdsa` …)
2. Import private armor at `/keys/import` with generator passphrase.
3. Rotate subkeys with matching algorithm family (RSA/ECDH), revoke previous enabled.
4. `/keys/new` Advanced → RSA 4096 (v4); Ed448 + X448 encrypt subkey (v6).

## SSH public + setup pack (9 / 18)

1. Authenticate subkey: **SSH setup** shows server `.pub` and pack download.
2. Download pack → blocking password dialog once; open zip with **7-Zip** / PeaZip / The Unarchiver (not macOS Archive Utility).
3. Encrypt-only subkey: no SSH card. Revoked auth: `.pub` ok, pack disabled.

## Transfer ownership (19)

1. Primary → **Actions & Lifecycle** → **Transfer ownership** (not Danger Zone).
2. Personal → team; team → team; team → personal with member recipient.
3. Non-owner member forbidden; subkey has no card; revoked blocked; fingerprint conflict → 409.

## Private keyring export (20)

1. Primary Overview → **Export private** (owner / group OWNER only).
2. Mode A: download without new passphrase fields.
3. Mode B: check **Export with a new passphrase**, unlock + rewrap; vault passphrase unchanged.
4. Team **member** (not owner): owner-only copy; download disabled / 404 from API.

## Revocation certificates (21 / 21a)

1. Generate cert → key stays active; file is public key block with revocation.
2. Apply → revoked; apply again idempotent.
3. Primary revoke or apply cascades active **subkey rows** to revoked in DB.
4. Subkey-only revoke does not cascade sideways.

## Passphrase remount + tabs (11 / 12)

1. Type passphrase on Actions; navigate to another key — fields empty; `[pgp-ui] keyDetail.unmount`.
2. Tab keyboard: focus tab button, ArrowRight/Left, Home/End; inactive panels stay in DOM with `hidden`.

## PR sign-off template

```markdown
- [x] Manual: team vaults sidebar + create/import ownership
- [x] Manual: import legacy → rotate matching algorithm
- [x] Manual: `/keys/new` Advanced RSA / Ed448+X448
- [x] Manual: SSH setup pack + 7-Zip unzip
- [x] Manual: transfer ownership + private export Mode A/B
- [x] Manual: revoke cert generate/apply + subkey cascade
- [x] API: `ACCESS_TOKEN=… ./scripts/run-phase6-smokes.sh`
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ACCESS_TOKEN` / 401 | Re-copy JWT after signing in |
| Rotate fails on imported key | Use generator default passphrase or `TEST_PASSPHRASE=…` |
| `gpg` not found | `apt install gnupg` |
| Ed448 missing | Set OpenPGP version to 6 in Advanced |
| Backend unreachable | `curl -s http://localhost:8080/actuator/health` |
| Zip “compression method 99” | Use 7-Zip / PeaZip / The Unarchiver |

## See also

- [Local setup](./local-setup)
- [Contributing](./contributing)
- [User guides](/user/getting-started)
