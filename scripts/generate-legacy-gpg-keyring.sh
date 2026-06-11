#!/usr/bin/env bash
# Generate a legacy-algorithm PGP keyring (RSA / ECDSA / ECDH) in an isolated GNUPGHOME
# for manual import and Phase 6 rotate testing. Does not touch ~/.gnupg.
#
# Usage:
#   ./scripts/generate-legacy-gpg-keyring.sh
#   LEGACY_PROFILE=ecdsa ./scripts/generate-legacy-gpg-keyring.sh
#   ./scripts/generate-legacy-gpg-keyring.sh /path/to/output-dir
#
# Optional env:
#   LEGACY_PROFILE   rsa | ecdsa | mixed (default: mixed)
#   OUTPUT_DIR       directory for .asc exports (default: ./tmp/pgp-km-legacy-exports)
#   GNUPGHOME        use an existing isolated homedir instead of creating a temp one
#   KEEP_GNUPGHOME   set to 1 to keep the temp homedir after export
#   TEST_PASSPHRASE  passphrase for keys (default: legacy-smoke-passphrase-1)
#                    set to empty string for %no-protection (manual UI only; API smokes need a passphrase)
#
# Requires: gpg (GnuPG 2.x)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUTPUT_DIR="${1:-${OUTPUT_DIR:-${REPO_ROOT}/tmp/pgp-km-legacy-exports}}"
LEGACY_PROFILE="${LEGACY_PROFILE:-mixed}"
TEST_PASSPHRASE="${TEST_PASSPHRASE:-legacy-smoke-passphrase-1}"
CREATED_GNUPGHOME=""

cleanup() {
  if [[ -n "${CREATED_GNUPGHOME}" && "${KEEP_GNUPGHOME:-}" != "1" ]]; then
    rm -rf "${CREATED_GNUPGHOME}"
  fi
}

if ! command -v gpg >/dev/null 2>&1; then
  echo "error: gpg not found; install gnupg (e.g. apt install gnupg)" >&2
  exit 1
fi

case "${LEGACY_PROFILE}" in
  rsa | ecdsa | mixed) ;;
  *)
    echo "error: LEGACY_PROFILE must be rsa, ecdsa, or mixed (got: ${LEGACY_PROFILE})" >&2
    exit 1
    ;;
esac

if [[ -z "${GNUPGHOME:-}" ]]; then
  CREATED_GNUPGHOME="$(mktemp -d /tmp/pgp-km-legacy.XXXXXX)"
  export GNUPGHOME="${CREATED_GNUPGHOME}"
  chmod 700 "${GNUPGHOME}"
else
  chmod 700 "${GNUPGHOME}" 2>/dev/null || true
fi

mkdir -p "${OUTPUT_DIR}"

PRIMARY_BATCH="$(mktemp)"
trap 'rm -f "${PRIMARY_BATCH}"; cleanup' EXIT

append_passphrase_directive() {
  if [[ -z "${TEST_PASSPHRASE}" ]]; then
    printf '%s\n' '%no-protection'
  else
    printf 'Passphrase: %s\n' "${TEST_PASSPHRASE}"
  fi
}

write_rsa_primary_batch() {
  {
    cat <<'EOF'
Key-Type: RSA
Key-Length: 4096
Key-Usage: cert,sign
Subkey-Type: RSA
Subkey-Length: 4096
Subkey-Usage: encrypt
Name-Real: PGP KM Legacy RSA
Name-Email: legacy-rsa@example.invalid
Expire-Date: 2y
EOF
    append_passphrase_directive
  } >"${PRIMARY_BATCH}"
}

write_ecdsa_primary_batch() {
  {
    cat <<'EOF'
Key-Type: ECDSA
Key-Curve: nistp256
Key-Usage: cert,sign
Subkey-Type: ECDH
Subkey-Curve: nistp256
Subkey-Usage: encrypt
Name-Real: PGP KM Legacy ECDSA
Name-Email: legacy-ecdsa@example.invalid
Expire-Date: 2y
EOF
    append_passphrase_directive
  } >"${PRIMARY_BATCH}"
}

gpg_quick_add_key() {
  local fingerprint="$1"
  shift
  if [[ -z "${TEST_PASSPHRASE}" ]]; then
    gpg --batch --pinentry-mode loopback --passphrase '' \
      --quick-add-key "${fingerprint}" "$@" 2y
  else
    gpg --batch --pinentry-mode loopback --passphrase "${TEST_PASSPHRASE}" \
      --quick-add-key "${fingerprint}" "$@" 2y
  fi
}

gpg_batch_generate() {
  if [[ -z "${TEST_PASSPHRASE}" ]]; then
    gpg --batch --pinentry-mode loopback --passphrase '' --generate-key "${PRIMARY_BATCH}"
  else
    gpg --batch --pinentry-mode loopback --passphrase "${TEST_PASSPHRASE}" --generate-key "${PRIMARY_BATCH}"
  fi
}

generate_keyring() {
  case "${LEGACY_PROFILE}" in
    rsa | mixed)
      write_rsa_primary_batch
      gpg_batch_generate
      ;;
    ecdsa)
      write_ecdsa_primary_batch
      gpg_batch_generate
      ;;
  esac
}

generate_keyring

FPR="$(gpg --list-keys --with-colons | awk -F: '$1=="fpr" {print $10; exit}')"
if [[ -z "${FPR}" ]]; then
  echo "error: failed to read primary fingerprint from isolated keyring" >&2
  exit 1
fi

if [[ "${LEGACY_PROFILE}" == "mixed" ]]; then
  echo "→ adding RSA sign subkey (mixed profile)"
  gpg_quick_add_key "${FPR}" rsa4096 sign
fi

PUBLIC_OUT="${OUTPUT_DIR}/legacy-${LEGACY_PROFILE}-public.asc"
SECRET_OUT="${OUTPUT_DIR}/legacy-${LEGACY_PROFILE}-secret.asc"

gpg_export() {
  if [[ -z "${TEST_PASSPHRASE}" ]]; then
    gpg --batch --pinentry-mode loopback --passphrase '' --armor --export >"${PUBLIC_OUT}"
    gpg --batch --pinentry-mode loopback --passphrase '' --armor --export-secret-keys >"${SECRET_OUT}"
  else
    gpg --batch --pinentry-mode loopback --passphrase "${TEST_PASSPHRASE}" --armor --export >"${PUBLIC_OUT}"
    gpg --batch --pinentry-mode loopback --passphrase "${TEST_PASSPHRASE}" --armor --export-secret-keys >"${SECRET_OUT}"
  fi
}

gpg_export

SUBKEY_COUNT="$(gpg --list-keys --with-colons "${FPR}" | awk -F: '$1=="sub" {c++} END {print c+0}')"

echo ""
echo "✓ Legacy keyring generated (profile=${LEGACY_PROFILE})"
echo "  GNUPGHOME=${GNUPGHOME}"
echo "  primary fingerprint: ${FPR}"
echo "  subkeys: ${SUBKEY_COUNT}"
echo ""
echo "Exported armored blocks:"
echo "  public:  ${PUBLIC_OUT}"
echo "  secret:  ${SECRET_OUT}"
if [[ -z "${TEST_PASSPHRASE}" ]]; then
  echo "  passphrase: (empty — %no-protection)"
else
  echo "  passphrase: ${TEST_PASSPHRASE}"
fi
echo ""
echo "Manual UI (Keys → Import, private mode):"
echo "  • Paste ${SECRET_OUT} into Armored private key"
echo "  • Subkeys auto-register on import"
echo ""
case "${LEGACY_PROFILE}" in
  rsa)
    echo "Rotate in UI (matching family):"
    echo "  • RSA encrypt subkey → Algorithm RSA, 4096 bits"
    ;;
  ecdsa)
    echo "Rotate in UI (matching family):"
    echo "  • ECDH encrypt subkey → Algorithm ECDH, NIST curve P-256 (or P-384/P-521)"
    ;;
  mixed)
    echo "Rotate in UI (matching family):"
    echo "  • RSA encrypt subkey → Algorithm RSA, 4096 bits"
    echo "  • RSA sign subkey → Algorithm RSA, 4096 bits"
    echo "For ECDSA/ECDH rotate tests, also run: LEGACY_PROFILE=ecdsa $0"
    ;;
esac
echo ""
if [[ -x "${SCRIPT_DIR}/smoke-rotate-legacy.sh" ]]; then
  echo "API smoke:"
  echo "  ACCESS_TOKEN='eyJ...' LEGACY_SECRET_FILE='${SECRET_OUT}' ./scripts/smoke-rotate-legacy.sh"
  echo ""
fi
if [[ "${KEEP_GNUPGHOME:-}" == "1" ]]; then
  echo "KEEP_GNUPGHOME=1 — inspect with: GNUPGHOME=${GNUPGHOME} gpg --list-keys --keyid-format long"
else
  echo "Temp GNUPGHOME removed on exit. To keep: KEEP_GNUPGHOME=1 $0"
fi
