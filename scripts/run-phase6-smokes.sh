#!/usr/bin/env bash
# Run Phase 6 API smoke scripts against a local backend.
# UI-only checks are listed in scripts/MANUAL_CHECKS.md — run those separately.
#
# Usage:
#   ACCESS_TOKEN='eyJ...' ./scripts/run-phase6-smokes.sh
#
# Optional env:
#   API_BASE_URL     default http://localhost:8080
#   SMOKE_CLEANUP    set to 1 to delete keys created by each smoke (recommended)
#   SKIP_LIFECYCLE   set to 1 to skip smoke-lifecycle-key.sh
#   SKIP_LEGACY      set to 1 to skip smoke-rotate-legacy.sh (requires gpg)
#   SKIP_CREATE      set to 1 to skip smoke-create-key.sh variants

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_BASE_URL="${API_BASE_URL:-http://localhost:8080}"
TOKEN="${ACCESS_TOKEN:-${1:-}}"

if [[ -z "${TOKEN}" ]]; then
  echo "error: set ACCESS_TOKEN or pass the JWT as the first argument" >&2
  echo "tip: while signed in at http://localhost:5173, DevTools → Network → GET /api/keys → copy Authorization Bearer value" >&2
  exit 1
fi

export ACCESS_TOKEN="${TOKEN}"
export API_BASE_URL
export SMOKE_CLEANUP="${SMOKE_CLEANUP:-1}"

echo "== Phase 6 API smokes (API_BASE_URL=${API_BASE_URL}, SMOKE_CLEANUP=${SMOKE_CLEANUP})"
echo ""

if ! curl -sS -o /dev/null -w '' "${API_BASE_URL}/actuator/health" 2>/dev/null; then
  echo "warning: could not reach ${API_BASE_URL}/actuator/health — is the backend running?" >&2
fi

run_step() {
  local name="$1"
  shift
  echo "── ${name}"
  "$@"
  echo ""
}

if [[ "${SKIP_CREATE:-}" != "1" ]]; then
  run_step "smoke-create-key.sh (Ed25519 default)" \
    "${SCRIPT_DIR}/smoke-create-key.sh"

  run_step "smoke-create-key.sh (RSA 4096 primary)" \
    env SMOKE_RSA_PRIMARY=1 "${SCRIPT_DIR}/smoke-create-key.sh"

  run_step "smoke-create-key.sh (Ed448 v6 + X448 encrypt subkey)" \
    env SMOKE_OPENPGP_VERSION=6 SMOKE_ALGORITHM=ed448 SMOKE_X448_SUBKEY=1 \
      "${SCRIPT_DIR}/smoke-create-key.sh"
fi

if [[ "${SKIP_LIFECYCLE:-}" != "1" ]]; then
  run_step "smoke-lifecycle-key.sh (includes Phase 6 RSA/ECDH tail)" \
    "${SCRIPT_DIR}/smoke-lifecycle-key.sh"
fi

if [[ "${SKIP_LEGACY:-}" != "1" ]]; then
  if ! command -v gpg >/dev/null 2>&1; then
    echo "── smoke-rotate-legacy.sh — SKIPPED (gpg not installed)" >&2
    echo ""
  else
    run_step "smoke-rotate-legacy.sh (import legacy keyring + rotate)" \
      "${SCRIPT_DIR}/smoke-rotate-legacy.sh"
  fi
fi

cat <<'EOF'
== API smokes finished

Still required for PR manual sign-off (see scripts/MANUAL_CHECKS.md):
  • Import legacy key → rotate subkey with matching RSA/ECDSA/ECDH in the UI
  • /keys/new Advanced → RSA 4096 primary; v6 → Ed448 primary + X448 encrypt subkey

Tip: generate legacy armor with:
  ./scripts/generate-legacy-gpg-keyring.sh
  LEGACY_PROFILE=ecdsa ./scripts/generate-legacy-gpg-keyring.sh
EOF
