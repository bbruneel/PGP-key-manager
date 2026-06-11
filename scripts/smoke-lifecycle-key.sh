#!/usr/bin/env bash
# Smoke test: primary create → subkey (POST /subkeys) → export → extend → revoke subkey.
# Phase 4 UI mirrors the create-subkey payload below (encrypt + cv25519 + passphrase).
#
# Usage:
#   ACCESS_TOKEN='eyJ...' ./scripts/smoke-lifecycle-key.sh
#   ./scripts/smoke-lifecycle-key.sh 'eyJ...'
#
# Optional env:
#   API_BASE_URL   default http://localhost:8080
#   SMOKE_CLEANUP  set to 1 to DELETE the created primary after verification

set -euo pipefail

API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
TOKEN="${ACCESS_TOKEN:-${1:-}}"

if [[ -z "${TOKEN}" ]]; then
  echo "error: set ACCESS_TOKEN or pass the JWT as the first argument" >&2
  exit 1
fi

REQUEST_ID="$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid)"
PASSPHRASE="smoke-lifecycle-passphrase-1"

echo "→ POST ${API_BASE_URL}/api/keys (create primary)"
CREATE_RESPONSE="$(
  curl -sS -w '\n%{http_code}' -X POST "${API_BASE_URL}/api/keys" \
    -H 'Accept: application/json; version=1' \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "X-Request-Id: ${REQUEST_ID}" \
    -d "{
      \"label\": \"smoke-lifecycle-primary\",
      \"keyType\": \"private\",
      \"capabilities\": [\"certify\", \"sign\"],
      \"algorithmSpec\": { \"algorithm\": \"ed25519\" },
      \"validity\": { \"expiresAt\": \"2030-06-01T00:00:00Z\" },
      \"userIds\": [{ \"name\": \"Lifecycle Smoke\", \"email\": \"lifecycle@example.com\" }],
      \"passphrase\": \"${PASSPHRASE}\"
    }"
)"

CREATE_BODY="$(echo "${CREATE_RESPONSE}" | sed '$d')"
CREATE_STATUS="$(echo "${CREATE_RESPONSE}" | tail -n 1)"

if [[ "${CREATE_STATUS}" != "201" ]]; then
  echo "error: expected HTTP 201 on create, got ${CREATE_STATUS}" >&2
  echo "${CREATE_BODY}" >&2
  exit 1
fi

PRIMARY_ID="$(echo "${CREATE_BODY}" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")"
echo "✓ created primary id=${PRIMARY_ID}"

echo "→ POST ${API_BASE_URL}/api/keys/${PRIMARY_ID}/subkeys"
SUBKEY_RESPONSE="$(
  curl -sS -w '\n%{http_code}' -X POST "${API_BASE_URL}/api/keys/${PRIMARY_ID}/subkeys" \
    -H 'Accept: application/json; version=1' \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "{
      \"capabilities\": [\"encrypt\"],
      \"algorithm\": { \"algorithm\": \"cv25519\" },
      \"validity\": { \"expiresAt\": \"2029-06-01T00:00:00Z\" },
      \"passphrase\": \"${PASSPHRASE}\"
    }"
)"

SUBKEY_BODY="$(echo "${SUBKEY_RESPONSE}" | sed '$d')"
SUBKEY_STATUS="$(echo "${SUBKEY_RESPONSE}" | tail -n 1)"

if [[ "${SUBKEY_STATUS}" != "201" ]]; then
  echo "error: expected HTTP 201 on create subkey, got ${SUBKEY_STATUS}" >&2
  echo "${SUBKEY_BODY}" >&2
  exit 1
fi

SUBKEY_ID="$(echo "${SUBKEY_BODY}" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")"
echo "✓ created subkey id=${SUBKEY_ID}"

echo "→ GET ${API_BASE_URL}/api/keys/${PRIMARY_ID}/export-public"
EXPORT_BODY="$(
  curl -sS -w '\n%{http_code}' "${API_BASE_URL}/api/keys/${PRIMARY_ID}/export-public" \
    -H 'Accept: application/pgp-keys' \
    -H "Authorization: Bearer ${TOKEN}"
)"
EXPORT_TEXT="$(echo "${EXPORT_BODY}" | sed '$d')"
EXPORT_STATUS="$(echo "${EXPORT_BODY}" | tail -n 1)"

if [[ "${EXPORT_STATUS}" != "200" ]]; then
  echo "error: expected HTTP 200 on export, got ${EXPORT_STATUS}" >&2
  exit 1
fi

echo "${EXPORT_TEXT}" | grep -q "BEGIN PGP PUBLIC KEY BLOCK"
echo "✓ export-public returned armored key"

echo "→ POST ${API_BASE_URL}/api/keys/${SUBKEY_ID}/extend-expiry"
EXTEND_STATUS="$(
  curl -sS -o /dev/null -w '%{http_code}' -X POST "${API_BASE_URL}/api/keys/${SUBKEY_ID}/extend-expiry" \
    -H 'Accept: application/json; version=1' \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "{
      \"expiresAt\": \"2031-06-01T00:00:00Z\",
      \"passphrase\": \"${PASSPHRASE}\"
    }"
)"

if [[ "${EXTEND_STATUS}" != "200" ]]; then
  echo "error: expected HTTP 200 on extend-expiry, got ${EXTEND_STATUS}" >&2
  exit 1
fi
echo "✓ extend-expiry succeeded"

echo "→ POST ${API_BASE_URL}/api/keys/${SUBKEY_ID}/revoke"
REVOKE_STATUS="$(
  curl -sS -o /dev/null -w '%{http_code}' -X POST "${API_BASE_URL}/api/keys/${SUBKEY_ID}/revoke" \
    -H 'Accept: application/json; version=1' \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "{
      \"reason\": \"key_retired\",
      \"passphrase\": \"${PASSPHRASE}\"
    }"
)"

if [[ "${REVOKE_STATUS}" != "200" ]]; then
  echo "error: expected HTTP 200 on revoke, got ${REVOKE_STATUS}" >&2
  exit 1
fi
echo "✓ revoke subkey succeeded"

echo "→ POST ${API_BASE_URL}/api/keys/${PRIMARY_ID}/subkeys (RSA 4096 encrypt — Phase 6 legacy)"
RSA_SUBKEY_RESPONSE="$(
  curl -sS -w '\n%{http_code}' -X POST "${API_BASE_URL}/api/keys/${PRIMARY_ID}/subkeys" \
    -H 'Accept: application/json; version=1' \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "{
      \"capabilities\": [\"encrypt\"],
      \"algorithm\": { \"algorithm\": \"rsa\", \"keySize\": 4096 },
      \"validity\": { \"expiresAt\": \"2029-06-01T00:00:00Z\" },
      \"passphrase\": \"${PASSPHRASE}\"
    }"
)"

RSA_SUBKEY_BODY="$(echo "${RSA_SUBKEY_RESPONSE}" | sed '$d')"
RSA_SUBKEY_STATUS="$(echo "${RSA_SUBKEY_RESPONSE}" | tail -n 1)"

if [[ "${RSA_SUBKEY_STATUS}" != "201" ]]; then
  echo "error: expected HTTP 201 on RSA subkey create, got ${RSA_SUBKEY_STATUS}" >&2
  echo "${RSA_SUBKEY_BODY}" >&2
  exit 1
fi

RSA_SUBKEY_ID="$(echo "${RSA_SUBKEY_BODY}" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")"
echo "✓ created RSA encrypt subkey id=${RSA_SUBKEY_ID}"

echo "→ POST ${API_BASE_URL}/api/keys/${RSA_SUBKEY_ID}/rotate (ECDH P-256 — Phase 6 legacy)"
ROTATE_RESPONSE="$(
  curl -sS -w '\n%{http_code}' -X POST "${API_BASE_URL}/api/keys/${RSA_SUBKEY_ID}/rotate" \
    -H 'Accept: application/json; version=1' \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN}" \
    -d "{
      \"capabilities\": [\"encrypt\"],
      \"algorithm\": { \"algorithm\": \"ecdh\", \"curve\": \"P-256\" },
      \"validity\": { \"expiresAt\": \"2029-06-01T00:00:00Z\" },
      \"revokePrevious\": true,
      \"passphrase\": \"${PASSPHRASE}\"
    }"
)"

ROTATE_BODY="$(echo "${ROTATE_RESPONSE}" | sed '$d')"
ROTATE_STATUS="$(echo "${ROTATE_RESPONSE}" | tail -n 1)"

if [[ "${ROTATE_STATUS}" != "201" ]]; then
  echo "error: expected HTTP 201 on rotate with ECDH, got ${ROTATE_STATUS}" >&2
  echo "${ROTATE_BODY}" >&2
  exit 1
fi
echo "✓ rotate with ECDH P-256 succeeded"

if [[ "${SMOKE_CLEANUP:-}" == "1" ]]; then
  echo "→ DELETE ${API_BASE_URL}/api/keys/${PRIMARY_ID}"
  DELETE_STATUS="$(
    curl -sS -o /dev/null -w '%{http_code}' -X DELETE "${API_BASE_URL}/api/keys/${PRIMARY_ID}" \
      -H 'Accept: application/json; version=1' \
      -H "Authorization: Bearer ${TOKEN}"
  )"
  if [[ "${DELETE_STATUS}" != "204" ]]; then
    echo "warning: cleanup delete returned ${DELETE_STATUS}" >&2
  else
    echo "✓ cleaned up test primary"
  fi
fi

echo "Lifecycle smoke test passed."
