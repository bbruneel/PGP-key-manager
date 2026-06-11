#!/usr/bin/env bash
# Smoke test: import legacy gpg keyring → rotate subkeys with Phase 6 algorithms (API).
# Complements smoke-lifecycle-key.sh (app-generated keyring) by exercising imported material.
#
# Usage:
#   ACCESS_TOKEN='eyJ...' ./scripts/smoke-rotate-legacy.sh
#   ACCESS_TOKEN='eyJ...' LEGACY_SECRET_FILE=./tmp/.../legacy-mixed-secret.asc ./scripts/smoke-rotate-legacy.sh
#
# Optional env:
#   API_BASE_URL        default http://localhost:8080
#   LEGACY_PROFILE      rsa | ecdsa | mixed (default: mixed) — used when generating armor
#   LEGACY_SECRET_FILE  path to armored secret key (generated via generate-legacy-gpg-keyring.sh if omitted)
#   LEGACY_PASSPHRASE   unlock passphrase (default: legacy-smoke-passphrase-1)
#   SMOKE_CLEANUP       set to 1 to DELETE imported primaries after verification
#   SKIP_ECDSA_PROFILE  set to 1 to skip the ecdsa-profile import + ECDH rotate step

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
TOKEN="${ACCESS_TOKEN:-${1:-}}"
LEGACY_PROFILE="${LEGACY_PROFILE:-mixed}"
LEGACY_PASSPHRASE="${LEGACY_PASSPHRASE:-legacy-smoke-passphrase-1}"
LEGACY_SECRET_FILE="${LEGACY_SECRET_FILE:-}"
CREATED_PRIMARIES=()

if [[ -z "${TOKEN}" ]]; then
  echo "error: set ACCESS_TOKEN or pass the JWT as the first argument" >&2
  echo "tip: while signed in at http://localhost:5173, DevTools → Network → GET /api/keys → copy Authorization Bearer value" >&2
  exit 1
fi

json_escape_file() {
  python3 -c 'import json,sys; print(json.dumps(open(sys.argv[1], encoding="utf-8").read()))' "$1"
}

import_legacy_secret() {
  local label="$1"
  local secret_file="$2"
  local armor_json
  armor_json="$(json_escape_file "${secret_file}")"

  echo "→ POST ${API_BASE_URL}/api/keys (import legacy private keyring: ${label})"
  local response
  response="$(
    curl -sS -w '\n%{http_code}' -X POST "${API_BASE_URL}/api/keys" \
      -H 'Accept: application/json; version=1' \
      -H 'Content-Type: application/json' \
      -H "Authorization: Bearer ${TOKEN}" \
      -d "{
        \"label\": \"${label}\",
        \"keyType\": \"private\",
        \"encryptedPrivateArmored\": ${armor_json}
      }"
  )"

  local body status primary_id
  body="$(echo "${response}" | sed '$d')"
  status="$(echo "${response}" | tail -n 1)"

  if [[ "${status}" != "201" ]]; then
    echo "error: expected HTTP 201 on import, got ${status}" >&2
    echo "${body}" >&2
    exit 1
  fi

  primary_id="$(echo "${body}" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")"
  CREATED_PRIMARIES+=("${primary_id}")
  echo "✓ imported primary id=${primary_id}"
  echo "${primary_id}"
}

find_subkey_id() {
  local primary_id="$1"
  local algorithm="$2"
  local capability="$3"

  curl -sS "${API_BASE_URL}/api/keys/${primary_id}/subkeys" \
    -H 'Accept: application/json; version=1' \
    -H "Authorization: Bearer ${TOKEN}" \
    | python3 -c "
import json, sys
primary_id, algorithm, capability = sys.argv[1:4]
subkeys = json.load(sys.stdin)
for subkey in subkeys:
    if subkey.get('algorithm') != algorithm:
        continue
    caps = subkey.get('capabilities') or []
    if capability not in caps:
        continue
    sub_id = subkey.get('id')
    if sub_id:
        print(sub_id)
        break
else:
    raise SystemExit(f'no {algorithm} subkey with {capability} under primary {primary_id}')
" "${primary_id}" "${algorithm}" "${capability}"
}

rotate_subkey() {
  local subkey_id="$1"
  local description="$2"
  local payload="$3"

  echo "→ POST ${API_BASE_URL}/api/keys/${subkey_id}/rotate (${description})"
  local response
  response="$(
    curl -sS -w '\n%{http_code}' -X POST "${API_BASE_URL}/api/keys/${subkey_id}/rotate" \
      -H 'Accept: application/json; version=1' \
      -H 'Content-Type: application/json' \
      -H "Authorization: Bearer ${TOKEN}" \
      -d "${payload}"
  )"

  local body status
  body="$(echo "${response}" | sed '$d')"
  status="$(echo "${response}" | tail -n 1)"

  if [[ "${status}" != "201" ]]; then
    echo "error: expected HTTP 201 on rotate (${description}), got ${status}" >&2
    echo "${body}" >&2
    exit 1
  fi
  echo "✓ rotate succeeded (${description})"
}

ensure_secret_file() {
  local profile="$1"
  local secret_file="${LEGACY_SECRET_FILE}"

  if [[ -n "${secret_file}" ]]; then
    if [[ ! -f "${secret_file}" ]]; then
      echo "error: LEGACY_SECRET_FILE not found: ${secret_file}" >&2
      exit 1
    fi
    echo "${secret_file}"
    return
  fi

  echo "→ generating legacy keyring (LEGACY_PROFILE=${profile})" >&2
  LEGACY_PROFILE="${profile}" TEST_PASSPHRASE="${LEGACY_PASSPHRASE}" "${SCRIPT_DIR}/generate-legacy-gpg-keyring.sh" >/dev/null

  secret_file="$(cd "${SCRIPT_DIR}/.." && pwd)/tmp/pgp-km-legacy-exports/legacy-${profile}-secret.asc"
  if [[ ! -f "${secret_file}" ]]; then
    echo "error: expected generated secret file at ${secret_file}" >&2
    exit 1
  fi
  echo "${secret_file}"
}

run_rsa_profile_smoke() {
  local secret_file primary_id rsa_encrypt_id
  secret_file="$(ensure_secret_file "${LEGACY_PROFILE}")"
  primary_id="$(import_legacy_secret "smoke-legacy-${LEGACY_PROFILE}" "${secret_file}")"

  rsa_encrypt_id="$(find_subkey_id "${primary_id}" "rsa" "encrypt")"
  echo "  rsa encrypt subkey id=${rsa_encrypt_id}"

  rotate_subkey "${rsa_encrypt_id}" "RSA encrypt → ECDH P-256 (Phase 6 legacy)" "{
    \"capabilities\": [\"encrypt\"],
    \"algorithm\": { \"algorithm\": \"ecdh\", \"curve\": \"P-256\" },
    \"validity\": { \"expiresAt\": \"2029-06-01T00:00:00Z\" },
    \"revokePrevious\": true,
    \"passphrase\": \"${LEGACY_PASSPHRASE}\"
  }"
}

run_ecdsa_profile_smoke() {
  local secret_file primary_id ecdh_encrypt_id
  secret_file="$(ensure_secret_file "ecdsa")"
  primary_id="$(import_legacy_secret "smoke-legacy-ecdsa" "${secret_file}")"

  ecdh_encrypt_id="$(find_subkey_id "${primary_id}" "ecdh" "encrypt")"
  echo "  ecdh encrypt subkey id=${ecdh_encrypt_id}"

  rotate_subkey "${ecdh_encrypt_id}" "ECDH encrypt → ECDH P-384 (matching family)" "{
    \"capabilities\": [\"encrypt\"],
    \"algorithm\": { \"algorithm\": \"ecdh\", \"curve\": \"P-384\" },
    \"validity\": { \"expiresAt\": \"2029-06-01T00:00:00Z\" },
    \"revokePrevious\": true,
    \"passphrase\": \"${LEGACY_PASSPHRASE}\"
  }"
}

if [[ "${LEGACY_PROFILE}" == "ecdsa" ]]; then
  run_ecdsa_profile_smoke
else
  run_rsa_profile_smoke
  if [[ "${SKIP_ECDSA_PROFILE:-}" != "1" ]]; then
    run_ecdsa_profile_smoke
  fi
fi

if [[ "${SMOKE_CLEANUP:-}" == "1" ]]; then
  for primary_id in "${CREATED_PRIMARIES[@]}"; do
    echo "→ DELETE ${API_BASE_URL}/api/keys/${primary_id}"
    DELETE_STATUS="$(
      curl -sS -o /dev/null -w '%{http_code}' -X DELETE "${API_BASE_URL}/api/keys/${primary_id}" \
        -H 'Accept: application/json; version=1' \
        -H "Authorization: Bearer ${TOKEN}"
    )"
    if [[ "${DELETE_STATUS}" != "204" ]]; then
      echo "warning: cleanup delete for ${primary_id} returned ${DELETE_STATUS}" >&2
    else
      echo "✓ cleaned up primary ${primary_id}"
    fi
  done
fi

echo "Legacy rotate smoke test passed."
