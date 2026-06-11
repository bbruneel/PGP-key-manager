#!/usr/bin/env bash
# Generate a throwaway PGP keyring (primary + subkeys) in an isolated GNUPGHOME
# for manual import testing. Does not touch ~/.gnupg.
#
# For legacy RSA/ECDSA/ECDH rotate tests (Phase 6), use generate-legacy-gpg-keyring.sh
# and scripts/MANUAL_CHECKS.md.
#
# Usage:
#   ./scripts/generate-test-gpg-keyring.sh
#   ./scripts/generate-test-gpg-keyring.sh /path/to/output-dir
#   OUTPUT_DIR=~/pgp-km-test-exports ./scripts/generate-test-gpg-keyring.sh
#
# Optional env:
#   OUTPUT_DIR       directory for .asc exports (default: ./tmp/pgp-km-test-exports)
#   GNUPGHOME        use an existing isolated homedir instead of creating a temp one
#   KEEP_GNUPGHOME   set to 1 to keep the temp homedir after export (for gpg --list-keys)
#   TEST_PASSPHRASE  passphrase for keys (default: empty / %no-protection)
#
# Requires: gpg (GnuPG 2.x)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUTPUT_DIR="${1:-${OUTPUT_DIR:-${REPO_ROOT}/tmp/pgp-km-test-exports}}"
TEST_PASSPHRASE="${TEST_PASSPHRASE:-}"
CREATED_GNUPGHOME=""

cleanup() {
  if [[ -n "${CREATED_GNUPGHOME}" && "${KEEP_GNUPGHOME:-}" != "1" ]]; then
    rm -rf "${CREATED_GNUPGHOME}"
  fi
}
trap cleanup EXIT

if ! command -v gpg >/dev/null 2>&1; then
  echo "error: gpg not found; install gnupg (e.g. apt install gnupg)" >&2
  exit 1
fi

if [[ -z "${GNUPGHOME:-}" ]]; then
  CREATED_GNUPGHOME="$(mktemp -d /tmp/pgp-km-test.XXXXXX)"
  export GNUPGHOME="${CREATED_GNUPGHOME}"
  chmod 700 "${GNUPGHOME}"
else
  chmod 700 "${GNUPGHOME}" 2>/dev/null || true
fi

mkdir -p "${OUTPUT_DIR}"

PRIMARY_BATCH="$(mktemp)"
trap 'rm -f "${PRIMARY_BATCH}"; cleanup' EXIT

write_primary_batch_ed25519() {
  cat >"${PRIMARY_BATCH}" <<EOF
%no-protection
Key-Type: EDDSA
Key-Curve: Ed25519
Key-Usage: cert
Subkey-Type: ECDH
Subkey-Curve: Cv25519
Subkey-Usage: encrypt
Name-Real: PGP KM Test
Name-Email: pgp-km-test@example.invalid
Expire-Date: 2y
EOF
}

write_primary_batch_rsa() {
  cat >"${PRIMARY_BATCH}" <<EOF
%no-protection
Key-Type: RSA
Key-Length: 3072
Key-Usage: cert
Subkey-Type: RSA
Subkey-Length: 3072
Subkey-Usage: encrypt
Name-Real: PGP KM Test
Name-Email: pgp-km-test@example.invalid
Expire-Date: 2y
EOF
}

generate_primary() {
  if gpg --version 2>/dev/null | grep -q 'libgcrypt'; then
    write_primary_batch_ed25519
    if gpg --batch --generate-key "${PRIMARY_BATCH}" 2>/dev/null; then
      return 0
    fi
    echo "note: Ed25519 batch generation failed; falling back to RSA" >&2
  fi
  write_primary_batch_rsa
  gpg --batch --generate-key "${PRIMARY_BATCH}"
}

generate_primary

FPR="$(gpg --list-keys --with-colons | awk -F: '$1=="fpr" {print $10; exit}')"
if [[ -z "${FPR}" ]]; then
  echo "error: failed to read primary fingerprint from isolated keyring" >&2
  exit 1
fi

# Second subkey so multi-key export has ≥2 non-master keys for import tests.
if [[ -n "${TEST_PASSPHRASE}" ]]; then
  gpg --batch --pinentry-mode loopback --passphrase "${TEST_PASSPHRASE}" \
    --quick-add-key "${FPR}" ed25519 sign 2y 2>/dev/null \
    || gpg --batch --pinentry-mode loopback --passphrase "${TEST_PASSPHRASE}" \
      --quick-add-key "${FPR}" rsa3072 sign 2y
else
  gpg --batch --pinentry-mode loopback --passphrase '' \
    --quick-add-key "${FPR}" ed25519 sign 2y 2>/dev/null \
    || gpg --batch --pinentry-mode loopback --passphrase '' \
      --quick-add-key "${FPR}" rsa3072 sign 2y
fi

PUBLIC_OUT="${OUTPUT_DIR}/multi-key-public.asc"
SECRET_OUT="${OUTPUT_DIR}/multi-key-secret.asc"

gpg --armor --export >"${PUBLIC_OUT}"
gpg --armor --export-secret-keys >"${SECRET_OUT}"

SUBKEY_COUNT="$(gpg --list-keys --with-colons "${FPR}" | awk -F: '$1=="sub" {c++} END {print c+0}')"

echo ""
echo "✓ Test keyring generated (isolated from ~/.gnupg)"
echo "  GNUPGHOME=${GNUPGHOME}"
echo "  primary fingerprint: ${FPR}"
echo "  subkeys: ${SUBKEY_COUNT}"
echo ""
echo "Exported armored blocks:"
echo "  public:  ${PUBLIC_OUT}"
echo "  secret:  ${SECRET_OUT}"
echo ""
echo "Import in the app (Keys → Import):"
echo "  • Paste ${PUBLIC_OUT} into Armored public key (subkeys auto-register on import)."
echo "  • For private import, also paste ${SECRET_OUT}"
if [[ -z "${TEST_PASSPHRASE}" ]]; then
  echo "  • Passphrase: (empty)"
else
  echo "  • Passphrase: (value of TEST_PASSPHRASE)"
fi
echo ""
if [[ -x "${SCRIPT_DIR}/smoke-import-subkeys.sh" ]]; then
  echo "Optional API smoke:"
  echo "  ACCESS_TOKEN='eyJ...' ./scripts/smoke-import-subkeys.sh \"${PUBLIC_OUT}\""
  echo ""
fi
echo ""
if [[ "${KEEP_GNUPGHOME:-}" == "1" ]]; then
  echo "KEEP_GNUPGHOME=1 — inspect with: GNUPGHOME=${GNUPGHOME} gpg --list-keys --with-subkeys"
else
  echo "Temp GNUPGHOME will be removed on exit. To keep it: KEEP_GNUPGHOME=1 $0"
fi
