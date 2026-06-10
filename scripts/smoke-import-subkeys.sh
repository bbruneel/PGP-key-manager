#!/usr/bin/env bash
# Smoke test: Phase 5 — register multi-key armored export → subkey rows auto-imported.
# Requires a JWT with API access. Generate test armor via backend tests or gpg export.
#
# Usage:
#   ACCESS_TOKEN='eyJ...' ARMORED_PUBLIC="$(cat export.asc)" ./scripts/smoke-import-subkeys.sh
#   ./scripts/smoke-import-subkeys.sh 'eyJ...' /path/to/multi-key-export.asc
#
# Optional env:
#   API_BASE_URL   default http://localhost:8080
#   SMOKE_CLEANUP  set to 1 to DELETE the created primary after verification

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
TOKEN="${ACCESS_TOKEN:-${1:-}}"
ARMOR_FILE="${2:-}"
ARMORED_PUBLIC="${ARMORED_PUBLIC:-}"

if [[ -z "${TOKEN}" ]]; then
  echo "error: set ACCESS_TOKEN or pass the JWT as the first argument" >&2
  exit 1
fi

if [[ -z "${ARMORED_PUBLIC}" && -n "${ARMOR_FILE}" ]]; then
  ARMORED_PUBLIC="$(cat "${ARMOR_FILE}")"
fi

if [[ -z "${ARMORED_PUBLIC}" ]]; then
  echo "error: set ARMORED_PUBLIC or pass an armored export file as the second argument" >&2
  exit 1
fi

json_escape() {
  python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' <<<"${ARMORED_PUBLIC}"
}

ARMOR_JSON="$(json_escape)"

echo "==> Registering multi-key armored export"
REGISTER_RESPONSE="$(
  curl -sS -X POST "${API_BASE_URL}/api/keys" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json; version=1" \
    -d "{\"label\":\"smoke-import-subkeys\",\"keyType\":\"public\",\"armoredPublic\":${ARMOR_JSON}}"
)"

PRIMARY_ID="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])' <<<"${REGISTER_RESPONSE}")"
echo "    primary id: ${PRIMARY_ID}"

echo "==> Listing subkeys"
SUBKEYS_RESPONSE="$(
  curl -sS "${API_BASE_URL}/api/keys/${PRIMARY_ID}/subkeys" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/json; version=1"
)"

SUBKEY_COUNT="$(python3 -c 'import json,sys; print(len(json.load(sys.stdin)))' <<<"${SUBKEYS_RESPONSE}")"
echo "    subkey count: ${SUBKEY_COUNT}"

if [[ "${SUBKEY_COUNT}" -lt 1 ]]; then
  echo "error: expected at least one subkey row after multi-key import" >&2
  exit 1
fi

echo "==> Idempotent import-from-keyring"
IMPORT_RESPONSE="$(
  curl -sS -X POST "${API_BASE_URL}/api/keys/${PRIMARY_ID}/subkeys/import-from-keyring" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/json; version=1"
)"

SKIPPED="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["skippedCount"])' <<<"${IMPORT_RESPONSE}")"
echo "    skipped count: ${SKIPPED}"

if [[ "${SMOKE_CLEANUP:-}" == "1" ]]; then
  echo "==> Cleanup: deleting primary ${PRIMARY_ID}"
  curl -sS -X DELETE "${API_BASE_URL}/api/keys/${PRIMARY_ID}" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Accept: application/json; version=1" \
    -o /dev/null -w "%{http_code}\n" | grep -q 204
fi

echo "Phase 5 smoke import subkeys: OK"
