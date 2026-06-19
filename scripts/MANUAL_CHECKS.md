# Manual checks (Phase 6 and future PRs)

API smoke scripts automate backend paths; these UI steps still need a human pass before merge when the PR test plan lists them.

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

---

## Quick API regression (automated)

Runs all Phase 6 API smokes with cleanup enabled:

```bash
ACCESS_TOKEN="$ACCESS_TOKEN" ./scripts/run-phase6-smokes.sh
```

Individual scripts:

| Script | Purpose |
|--------|---------|
| `smoke-create-key.sh` | Create primary (Ed25519 default) |
| `SMOKE_RSA_PRIMARY=1 smoke-create-key.sh` | RSA 4096 primary |
| `SMOKE_OPENPGP_VERSION=6 SMOKE_ALGORITHM=ed448 SMOKE_X448_SUBKEY=1 smoke-create-key.sh` | Ed448 v6 + X448 subkey |
| `smoke-lifecycle-key.sh` | Full lifecycle + Phase 6 RSA/ECDH tail |
| `smoke-rotate-legacy.sh` | Import gpg legacy keyring + rotate (needs `gpg`) |
| `generate-legacy-gpg-keyring.sh` | Produce armored keys for import tests |

Optional cleanup on any smoke: `SMOKE_CLEANUP=1`.

---

## Phase 16 — Team vault manual QA

1. Open `/groups/new`, create a group, and confirm redirect to `/groups/{groupId}/keys`.
2. Verify the header **Vault** switcher defaults to the new group and sidebar shows the team section.
3. From `/keys/new`, confirm **Store key in team vault** is checked when an active group exists; create a key and verify ownership badge shows `Owned by {group}` on detail.
4. From `/keys/import`, confirm **Store imported key in team vault** is checked by default; import a key and verify it appears under `/groups/{groupId}/keys`.
5. Open `/keys` (personal vault) and confirm only personal keys are listed (`scope=personal` behavior).
6. Open `/groups/{groupId}/members` and verify member list + summary cards load without API errors.
7. Use group switcher to return to **Personal vault**, then switch back to the group and confirm routes update accordingly.

---

## Phase 17a — Storage connection registry manual QA

1. Open `/settings` while signed in and confirm the **Cloud storage connections** section loads.
2. Click **Add AWS S3 connection**, fill connection name, region, bucket, and IAM role ARN; submit and confirm the connection appears in the list with status **registered**.
3. Select the connection card and verify read-only detail shows connection ID, prefix, role ARN, external ID, and the Phase 17b setup hint.
4. Edit the connection name and confirm the list updates.
5. Delete an unused connection and confirm it disappears.
6. Optional API check: `GET /api/storage-connections` returns the saved row with `provider: aws-s3`.

---

## Phase 17b — Storage connection test manual QA

1. Deploy customer IAM using [`docs/customer-setup/aws/setup.md`](../docs/customer-setup/aws/setup.md) (CloudFormation or manual JSON policies).
2. Open `/settings`, select a connection, and click **Test connection**.
3. On success: toast confirms connectivity; card shows **Last test: succeeded** with timestamp; API returns `200` with `lastTestStatus: succeeded`.
4. On failure (e.g. wrong trust policy): inline message with error category; card shows **Last test: failed**; API returns `502` with `lastTestErrorCategory` (e.g. `assume_role_denied`).
5. Optional API check: `POST /api/storage-connections/{id}/test` persists `lastTestedAt` / `lastTestStatus` on the connection row.

---

## Checklist A — Import legacy key → rotate subkey (UI)

**Covers:** Phase 6A subkey rotate form (RSA / ECDSA / ECDH pickers on imported keyrings).

### 1. Generate test armor

```bash
./scripts/generate-legacy-gpg-keyring.sh
LEGACY_PROFILE=ecdsa ./scripts/generate-legacy-gpg-keyring.sh
```

Outputs under `tmp/pgp-km-legacy-exports/`:

| Profile | Files | Subkeys | Default passphrase |
|---------|-------|---------|-------------------|
| `mixed` (default) | `legacy-mixed-*.asc` | RSA encrypt + RSA sign | `legacy-smoke-passphrase-1` |
| `rsa` | `legacy-rsa-*.asc` | RSA encrypt | same |
| `ecdsa` | `legacy-ecdsa-*.asc` | ECDH encrypt | same |

Optional API pre-check:

```bash
ACCESS_TOKEN="$ACCESS_TOKEN" LEGACY_SECRET_FILE=tmp/pgp-km-legacy-exports/legacy-mixed-secret.asc \
  ./scripts/smoke-rotate-legacy.sh
```

### 2. Import (UI)

1. **Keys → Import** (`/keys/import`)
2. **Import mode:** Private key pair
3. Paste `tmp/pgp-km-legacy-exports/legacy-mixed-secret.asc`
4. Passphrase: `legacy-smoke-passphrase-1` (if you used the default generator settings)
5. Submit → key detail with subkey registration toast

Repeat with `legacy-ecdsa-secret.asc` for ECDH rotate coverage.

### 3. Rotate (UI) — use **matching** algorithm family

For each subkey: primary detail → **Subkeys** → **View** → **Rotate subkey**.

| Subkey (check **Algorithm** in summary) | Capabilities | Rotate to |
|----------------------------------------|--------------|-----------|
| `rsa` + encrypt | encrypt | RSA, 4096 bits |
| `rsa` + sign | sign | RSA, 4096 bits |
| `ecdh` + encrypt | encrypt | ECDH, P-256 (or P-384) |

- Enable **Revoke previous**
- Enter primary passphrase
- Expect success toast and navigation to the new subkey

**Verify:** new subkey fingerprint, old subkey revoked, **Export public** still works. Toggling capabilities that force an algorithm reset should show an info **toast**.

- [ ] RSA encrypt subkey rotated (mixed profile)
- [ ] RSA sign subkey rotated (mixed profile)
- [ ] ECDH encrypt subkey rotated (ecdsa profile)

---

## Checklist B — Create primary (Advanced options UI)

**Covers:** Phase 6B primary compat + 6C Ed448/X448 v6 gating.

### B1 — RSA 4096 primary (v4)

1. `/keys/new`
2. Fill identity + passphrase (≥ 8 characters)
3. Expand **Advanced options**
4. **Algorithm:** RSA (compatibility) → **4096 bits**
5. **OpenPGP version:** 4
6. **Create key**

**Verify:** detail shows `algorithm: rsa`, **OpenPGP v4**.

API equivalent: `SMOKE_RSA_PRIMARY=1 ACCESS_TOKEN="$ACCESS_TOKEN" ./scripts/smoke-create-key.sh`

- [ ] RSA 4096 primary created from UI

### B2 — Ed448 primary + X448 encrypt subkey (v6)

1. `/keys/new` → **Advanced options**
2. **OpenPGP version:** 6
3. **Algorithm:** Ed448 (OpenPGP v6, high security)
4. Create → open primary detail (**OpenPGP v6**, `ed448`)
5. **Add subkey:** capability **encrypt**, algorithm **X448**
6. Submit with passphrase

**Verify:** subkey shows `x448`. Ed448/X448 must not appear when primary is v4.

API equivalent:

```bash
SMOKE_OPENPGP_VERSION=6 SMOKE_ALGORITHM=ed448 SMOKE_X448_SUBKEY=1 \
  ACCESS_TOKEN="$ACCESS_TOKEN" ./scripts/smoke-create-key.sh
```

- [ ] Ed448 v6 primary + X448 encrypt subkey from UI

---

## Checklist C — Lifecycle smoke script

**Covers:** Phase 6 legacy steps at the end of the lifecycle API path (app-generated keyring).

```bash
ACCESS_TOKEN="$ACCESS_TOKEN" ./scripts/smoke-lifecycle-key.sh
# optional: SMOKE_CLEANUP=1
```

Expect `✓ created RSA encrypt subkey` and `✓ rotate with ECDH P-256 succeeded`.

Passphrase used by the script: `smoke-lifecycle-passphrase-1`.

- [ ] `smoke-lifecycle-key.sh` passes

---

## Phase 9 — SSH public key export

1. Create or open a primary key with private material.
2. Add an **authenticate** subkey (default Ed25519) via **Add subkey**.
3. Open the new subkey detail (`/keys/{subkeyId}`).
4. Confirm **Export SSH public key** appears; **Copy SSH public key** should yield a line starting with `ssh-ed25519 `.
5. Open an encrypt-only subkey (e.g. Cv25519): SSH export section should be hidden.
6. Optional API check: `GET /api/keys/{encryptSubkeyId}/export-ssh-public` should return 400.

---

## Phase 11 — Passphrase reset on key navigation

1. Open a primary key with private material (`/keys/:id`).
2. Go to **Actions & Lifecycle**, type a passphrase in **Revoke key** (do not submit).
3. Navigate to another key (subkey **View** link, keys list, or change the URL).
4. Confirm passphrase fields are empty on the new key detail.
5. DevTools console: verify `[pgp-ui] keyDetail.unmount` for the previous key and `keyDetail.pageView` for the new key.

---

## Phase 12 — Tab panel extraction

1. Open a primary key detail (`/keys/:id`).
2. Confirm **Overview**, **Subkeys**, and **Actions & Lifecycle** tabs render and switch correctly.
3. **Tab bar keyboard navigation** (ARIA roving tabindex — focus must be on a tab *button*, not inside a form field):
   - Click **Overview** so the tab button has focus (visible focus ring on the tab bar).
   - Press **ArrowRight** → **Subkeys** tab is selected, Subkeys panel content is visible.
   - Press **ArrowLeft** → back to **Overview**.
   - Press **End** from Overview → **Actions & Lifecycle** is selected.
   - Press **Home** from Actions → back to **Overview**.
   - **Tab / Shift+Tab do not switch tabs** — they move focus through page content (form fields, buttons). That is expected. If focus is inside a passphrase field, arrow keys move the text cursor instead of changing tabs.
4. In DevTools Elements, confirm inactive panels have class `hidden` but remain in the DOM (`data-pgp-ui="keyDetail.tab.overview|subkeys|actions"`).
5. Lifecycle forms (revoke, add subkey, delete) still work from their respective tabs.

---

## PR sign-off template

Copy into the PR test plan when complete:

```markdown
- [x] Manual: import legacy key → rotate subkey with matching RSA/ECDSA/ECDH from UI
- [x] Manual: `/keys/new` Advanced → RSA 4096 primary; v6 → Ed448 primary + X448 encrypt subkey
- [x] Manual: `ACCESS_TOKEN=… ./scripts/smoke-lifecycle-key.sh` (includes Phase 6 legacy steps)
- [x] API: `./scripts/run-phase6-smokes.sh` (optional but recommended)
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `ACCESS_TOKEN` / 401 | Re-copy JWT after signing in; token may have expired |
| Rotate fails on imported key | Use the generator default passphrase, or `TEST_PASSPHRASE=your-pass ./scripts/generate-legacy-gpg-keyring.sh` |
| `gpg` not found | `apt install gnupg` (needed for `generate-legacy-gpg-keyring.sh` and `smoke-rotate-legacy.sh`) |
| Ed448 missing in UI | Set **OpenPGP version** to 6 in Advanced options |
| Backend not reachable | Confirm `curl -s http://localhost:8080/actuator/health` |
| `expected HTTP 200 on export, got 406` | `export-public` returns `application/pgp-keys`, not JSON — pull latest `smoke-lifecycle-key.sh` |
