#!/usr/bin/env bash
# Smoke test: POST /api/keys (generate primary) against a running local API.
#
# Usage:
#   ACCESS_TOKEN='eyJ...' ./scripts/smoke-create-key.sh
#   ./scripts/smoke-create-key.sh 'eyJ...'
#
# Optional env:
#   API_BASE_URL          default http://localhost:8080
#   SMOKE_CLEANUP         set to 1 to DELETE the created key after verification
#   SMOKE_RSA_PRIMARY     set to 1 to create RSA 4096 primary instead of Ed25519 (Phase 6 legacy)
#   SMOKE_ALGORITHM       primary algorithm: ed25519 | rsa | ecdsa | ed448 (overrides SMOKE_RSA_PRIMARY)
#   SMOKE_OPENPGP_VERSION 4 or 6 (omit for server default 4; required for ed448)
#   SMOKE_X448_SUBKEY     set to 1 to also POST an X448 encrypt subkey (requires v6 primary)

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
TOKEN="${ACCESS_TOKEN:-${1:-}}"

if [[ -z "${TOKEN}" ]]; then
  echo "error: set ACCESS_TOKEN or pass the JWT as the first argument" >&2
  echo "tip: while signed in at http://localhost:5173, DevTools → Network → GET /api/keys → copy Authorization Bearer value" >&2
  exit 1
fi

REQUEST_ID="$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid)"
PASSPHRASE="smoke-test-passphrase-1"

ALGORITHM="${SMOKE_ALGORITHM:-}"
if [[ -z "${ALGORITHM}" && "${SMOKE_RSA_PRIMARY:-}" == "1" ]]; then
  ALGORITHM="rsa"
fi
if [[ -z "${ALGORITHM}" ]]; then
  ALGORITHM="ed25519"
fi

OPENPGP_VERSION="${SMOKE_OPENPGP_VERSION:-}"
if [[ "${ALGORITHM}" == "ed448" && -z "${OPENPGP_VERSION}" ]]; then
  OPENPGP_VERSION="6"
fi

case "${ALGORITHM}" in
  ed25519)
    ALGORITHM_JSON='{ "algorithm": "ed25519" }'
    LABEL="smoke-test-ed25519-primary"
    ;;
  rsa)
    ALGORITHM_JSON='{ "algorithm": "rsa", "keySize": 4096 }'
    LABEL="smoke-test-rsa-primary"
    ;;
  ecdsa)
    ALGORITHM_JSON='{ "algorithm": "ecdsa", "curve": "P-256" }'
    LABEL="smoke-test-ecdsa-primary"
    ;;
  ed448)
    ALGORITHM_JSON='{ "algorithm": "ed448" }'
    LABEL="smoke-test-ed448-primary"
    ;;
  *)
    echo "error: unsupported SMOKE_ALGORITHM=${ALGORITHM} (use ed25519, rsa, ecdsa, or ed448)" >&2
    exit 1
    ;;
esac

OPENPGP_FIELD=""
if [[ -n "${OPENPGP_VERSION}" ]]; then
  OPENPGP_FIELD="\"openpgpVersion\": ${OPENPGP_VERSION},"
fi

echo "→ POST ${API_BASE_URL}/api/keys (algorithm=${ALGORITHM}${OPENPGP_VERSION:+, openpgpVersion=${OPENPGP_VERSION}})"
CREATE_RESPONSE="$(
  curl -sS -w '\n%{http_code}' -X POST "${API_BASE_URL}/api/keys" \
    -H 'Accept: application/json; version=1' \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "X-Request-Id: ${REQUEST_ID}" \
    -d "{
      \"label\": \"${LABEL}\",
      \"keyType\": \"private\",
      \"capabilities\": [\"certify\", \"sign\"],
      ${OPENPGP_FIELD}
      \"algorithmSpec\": ${ALGORITHM_JSON},
      \"validity\": { \"expiresAt\": \"2030-06-01T00:00:00Z\" },
      \"userIds\": [{ \"name\": \"Smoke Test\", \"email\": \"smoke@example.com\" }],
      \"passphrase\": \"${PASSPHRASE}\"
    }"
)"

CREATE_BODY="$(echo "${CREATE_RESPONSE}" | sed '$d')"
CREATE_STATUS="$(echo "${CREATE_RESPONSE}" | tail -n 1)"

if [[ "${CREATE_STATUS}" != "201" ]]; then
  echo "error: expected HTTP 201, got ${CREATE_STATUS}" >&2
  echo "${CREATE_BODY}" >&2
  exit 1
fi

KEY_ID="$(echo "${CREATE_BODY}" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")"
FINGERPRINT="$(echo "${CREATE_BODY}" | python3 -c "import json,sys; print(json.load(sys.stdin)['fingerprint'])")"
CREATED_ALGORITHM="$(echo "${CREATE_BODY}" | python3 -c "import json,sys; print(json.load(sys.stdin).get('algorithm') or '')")"

echo "✓ created key id=${KEY_ID}"
echo "  fingerprint=${FINGERPRINT}"
echo "  algorithm=${CREATED_ALGORITHM}"

if [[ "${SMOKE_X448_SUBKEY:-}" == "1" ]]; then
  if [[ "${OPENPGP_VERSION}" != "6" ]]; then
    echo "error: SMOKE_X448_SUBKEY requires SMOKE_OPENPGP_VERSION=6" >&2
    exit 1
  fi

  echo "→ POST ${API_BASE_URL}/api/keys/${KEY_ID}/subkeys (X448 encrypt — Phase 6 v6)"
  SUBKEY_RESPONSE="$(
    curl -sS -w '\n%{http_code}' -X POST "${API_BASE_URL}/api/keys/${KEY_ID}/subkeys" \
      -H 'Accept: application/json; version=1' \
      -H 'Content-Type: application/json' \
      -H "Authorization: Bearer ${TOKEN}" \
      -d "{
        \"capabilities\": [\"encrypt\"],
        \"algorithm\": { \"algorithm\": \"x448\" },
        \"validity\": { \"expiresAt\": \"2029-06-01T00:00:00Z\" },
        \"passphrase\": \"${PASSPHRASE}\"
      }"
  )"

  SUBKEY_BODY="$(echo "${SUBKEY_RESPONSE}" | sed '$d')"
  SUBKEY_STATUS="$(echo "${SUBKEY_RESPONSE}" | tail -n 1)"

  if [[ "${SUBKEY_STATUS}" != "201" ]]; then
    echo "error: expected HTTP 201 on X448 subkey create, got ${SUBKEY_STATUS}" >&2
    echo "${SUBKEY_BODY}" >&2
    exit 1
  fi

  SUBKEY_ID="$(echo "${SUBKEY_BODY}" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")"
  SUBKEY_ALGORITHM="$(echo "${SUBKEY_BODY}" | python3 -c "import json,sys; print(json.load(sys.stdin).get('algorithm') or '')")"
  echo "✓ created X448 encrypt subkey id=${SUBKEY_ID} algorithm=${SUBKEY_ALGORITHM}"
fi

echo "→ GET ${API_BASE_URL}/api/keys"
LIST_RESPONSE="$(
  curl -sS -w '\n%{http_code}' "${API_BASE_URL}/api/keys" \
    -H 'Accept: application/json; version=1' \
    -H "Authorization: Bearer ${TOKEN}"
)"
LIST_BODY="$(echo "${LIST_RESPONSE}" | sed '$d')"
LIST_STATUS="$(echo "${LIST_RESPONSE}" | tail -n 1)"

if [[ "${LIST_STATUS}" != "200" ]]; then
  echo "error: expected HTTP 200 on list, got ${LIST_STATUS}" >&2
  echo "${LIST_BODY}" >&2
  exit 1
fi

echo "${LIST_BODY}" | python3 -c "import json,sys; keys=json.load(sys.stdin); assert any(k.get('label')=='${LABEL}' for k in keys), '${LABEL} not found in list'; print('✓ key appears in list')"

if [[ "${SMOKE_CLEANUP:-}" == "1" ]]; then
  echo "→ DELETE ${API_BASE_URL}/api/keys/${KEY_ID}"
  DELETE_STATUS="$(
    curl -sS -o /dev/null -w '%{http_code}' -X DELETE "${API_BASE_URL}/api/keys/${KEY_ID}" \
      -H 'Accept: application/json; version=1' \
      -H "Authorization: Bearer ${TOKEN}"
  )"
  if [[ "${DELETE_STATUS}" != "204" ]]; then
    echo "warning: cleanup delete returned ${DELETE_STATUS}" >&2
  else
    echo "✓ cleaned up test key"
  fi
fi

echo "Smoke test passed."
