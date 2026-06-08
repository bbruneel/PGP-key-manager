#!/usr/bin/env bash
# Smoke test: POST /api/keys (register/import public key) against a running local API.
#
# Usage:
#   ACCESS_TOKEN='eyJ...' ./scripts/smoke-import-key.sh
#   ./scripts/smoke-import-key.sh 'eyJ...'
#
# Optional env:
#   API_BASE_URL   default http://localhost:8080
#   SMOKE_CLEANUP  set to 1 to DELETE the imported key after verification

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIXTURE="${SCRIPT_DIR}/fixtures/smoke-import-public.asc"
API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
TOKEN="${ACCESS_TOKEN:-${1:-}}"

if [[ -z "${TOKEN}" ]]; then
  echo "error: set ACCESS_TOKEN or pass the JWT as the first argument" >&2
  echo "tip: while signed in at http://localhost:5173, DevTools → Network → GET /api/keys → copy Authorization Bearer value" >&2
  exit 1
fi

if [[ ! -f "${FIXTURE}" ]]; then
  echo "error: missing fixture ${FIXTURE}" >&2
  echo "tip: run (cd backend && ./mvnw test-compile exec:java -Dexec.classpathScope=test -Dexec.mainClass=org.bruneel.pgpkeymanager.SmokeArmoredKeyExporter) > ${FIXTURE}" >&2
  exit 1
fi

REQUEST_ID="$(uuidgen 2>/dev/null || cat /proc/sys/kernel/random/uuid)"
LABEL="smoke-test-import-public"

JSON_PAYLOAD="$(
  python3 - "${LABEL}" "${FIXTURE}" <<'PY'
import json
import sys

label, fixture_path = sys.argv[1:3]
with open(fixture_path, encoding="utf-8") as handle:
    armored_public = handle.read()

print(json.dumps({
    "label": label,
    "keyType": "public",
    "armoredPublic": armored_public,
}))
PY
)"

echo "→ POST ${API_BASE_URL}/api/keys (register public key, server-derived metadata)"
CREATE_RESPONSE="$(
  curl -sS -w '\n%{http_code}' -X POST "${API_BASE_URL}/api/keys" \
    -H 'Accept: application/json; version=1' \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "X-Request-Id: ${REQUEST_ID}" \
    -d "${JSON_PAYLOAD}"
)"

CREATE_BODY="$(echo "${CREATE_RESPONSE}" | sed '$d')"
CREATE_STATUS="$(echo "${CREATE_RESPONSE}" | tail -n 1)"

if [[ "${CREATE_STATUS}" != "201" ]]; then
  echo "error: expected HTTP 201, got ${CREATE_STATUS}" >&2
  echo "${CREATE_BODY}" >&2
  exit 1
fi

KEY_ID="$(echo "${CREATE_BODY}" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")"
IMPORTED_FINGERPRINT="$(echo "${CREATE_BODY}" | python3 -c "import json,sys; print(json.load(sys.stdin)['fingerprint'])")"
PARSED_KEY_ID="$(echo "${CREATE_BODY}" | python3 -c "import json,sys; print(json.load(sys.stdin).get('keyId') or '')")"
PARSED_ALGORITHM="$(echo "${CREATE_BODY}" | python3 -c "import json,sys; print(json.load(sys.stdin).get('algorithm') or '')")"

echo "✓ imported key id=${KEY_ID}"
echo "  fingerprint=${IMPORTED_FINGERPRINT}"
echo "  keyId=${PARSED_KEY_ID}"
echo "  algorithm=${PARSED_ALGORITHM}"

if [[ -z "${PARSED_KEY_ID}" || -z "${PARSED_ALGORITHM}" ]]; then
  echo "error: expected parsed keyId and algorithm in register response" >&2
  echo "${CREATE_BODY}" >&2
  exit 1
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

echo "Smoke import test passed."
