# Shared helpers for the Kimen deterministic gates (scripts/gates/*.sh).
# Sourced, never executed. Callers `set -uo pipefail` and cd to the repo root
# BEFORE sourcing this file (all paths below are repo-root relative).

# Resolve the active feature directory (specs/<###-feature-name>).
# Priority:
#   1. explicit argument (a feature dir, or any file inside one)
#   2. SPECIFY_FEATURE_DIRECTORY env var (Spec Kit override)
#   3. .specify/feature.json "feature_directory" (via Spec Kit's common.sh
#      helper, so both resolve the feature identically)
#   4. newest specs/*/ directory containing spec.md
# Prints the directory (without trailing slash) or returns 1.
kimen_resolve_feature_dir() {
  local arg="${1:-}"
  if [ -n "$arg" ]; then
    [ -f "$arg" ] && arg=$(dirname "$arg")
    printf '%s\n' "${arg%/}"
    return 0
  fi
  if [ -n "${SPECIFY_FEATURE_DIRECTORY:-}" ]; then
    printf '%s\n' "${SPECIFY_FEATURE_DIRECTORY%/}"
    return 0
  fi
  if [ -f .specify/scripts/bash/common.sh ]; then
    # shellcheck source=/dev/null
    . .specify/scripts/bash/common.sh
    local fd
    fd=$(read_feature_json_feature_directory "$(pwd)" 2>/dev/null || true)
    if [ -n "$fd" ]; then
      printf '%s\n' "${fd%/}"
      return 0
    fi
  fi
  local d
  for d in $(ls -td specs/*/ 2>/dev/null); do
    if [ -f "${d%/}/spec.md" ]; then
      printf '%s\n' "${d%/}"
      return 0
    fi
  done
  return 1
}

# sha256 of a file, portable across Linux (sha256sum) and macOS (shasum).
kimen_sha256() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    shasum -a 256 "$1" | awk '{print $1}'
  fi
}

# Extract the first complete ```gherkin fenced block from a spec into a caller-
# supplied file. Output matches extract-feature.sh: block contents plus one
# normalized final LF. Returns non-zero for a missing or unterminated block.
kimen_extract_feature_bytes() {
  local spec="$1"
  local output="$2"
  awk '
    /^```gherkin[[:space:]]*$/ && !opened {
      opened = 1
      grab = 1
      next
    }
    /^```[[:space:]]*$/ && grab {
      grab = 0
      closed = 1
      next
    }
    grab { lines[++count] = $0 }
    END {
      if (!opened || !closed || grab) exit 1
      while (count > 0 && lines[count] == "") count--
      for (i = 1; i <= count; i++) print lines[i]
    }
  ' "$spec" > "$output"
}

# New integrity gates accept only direct, repository-relative feature
# directories. They never follow a feature directory symlink outside specs/.
kimen_validate_feature_dir() {
  local dir="${1%/}"
  printf '%s\n' "$dir" | grep -Eq '^specs/[0-9]{3}-[a-z0-9][a-z0-9-]*$' || return 1
  [ -d "$dir" ] && [ ! -L "$dir" ]
}

kimen_is_sha256() {
  printf '%s\n' "$1" | grep -Eq '^[0-9a-f]{64}$'
}

kimen_is_utc_timestamp() {
  local timestamp="$1"
  local normalized
  printf '%s\n' "$timestamp" | grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$' || return 1
  if date --version >/dev/null 2>&1; then
    normalized=$(date -u -d "$timestamp" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null) || return 1
  else
    normalized=$(date -j -u -f '%Y-%m-%dT%H:%M:%SZ' "$timestamp" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null) || return 1
  fi
  [ "$normalized" = "$timestamp" ]
}

# Strictly parse marker v2 without sourcing or evaluating file content.
# On success, exposes the five KIMEN_APPROVAL_* variables to the caller.
kimen_parse_approval_v2() {
  local marker="$1"
  local line key value
  local version_seen=0 approved_seen=0 spec_seen=0 feature_seen=0 migrated_seen=0
  local failed=0 line_number=0

  KIMEN_APPROVAL_VERSION=""
  KIMEN_APPROVED_AT=""
  KIMEN_APPROVAL_SPEC_SHA256=""
  KIMEN_APPROVAL_FEATURE_SHA256=""
  KIMEN_APPROVAL_MIGRATED_FROM_VERSION=""

  if [ ! -f "$marker" ] || [ -L "$marker" ]; then
    echo "  FAIL [$marker]: approval marker is missing or is a symlink"
    return 1
  fi
  while IFS= read -r line || [ -n "$line" ]; do
    line_number=$((line_number + 1))
    if [ -z "$line" ] || ! printf '%s\n' "$line" | grep -qE '^[a-z][a-z0-9-]*: .+$'; then
      echo "  FAIL [$marker]: malformed line $line_number (expected exact 'key: value')"
      failed=1
      continue
    fi
    key=${line%%:*}
    value=${line#*: }
    case "$key" in
      approval-version)
        if [ "$version_seen" -ne 0 ]; then
          echo "  FAIL [$marker]: duplicate key approval-version"
          failed=1
        fi
        version_seen=$((version_seen + 1))
        KIMEN_APPROVAL_VERSION="$value"
        ;;
      approved-at)
        if [ "$approved_seen" -ne 0 ]; then
          echo "  FAIL [$marker]: duplicate key approved-at"
          failed=1
        fi
        approved_seen=$((approved_seen + 1))
        KIMEN_APPROVED_AT="$value"
        ;;
      spec-sha256)
        if [ "$spec_seen" -ne 0 ]; then
          echo "  FAIL [$marker]: duplicate key spec-sha256"
          failed=1
        fi
        spec_seen=$((spec_seen + 1))
        KIMEN_APPROVAL_SPEC_SHA256="$value"
        ;;
      feature-sha256)
        if [ "$feature_seen" -ne 0 ]; then
          echo "  FAIL [$marker]: duplicate key feature-sha256"
          failed=1
        fi
        feature_seen=$((feature_seen + 1))
        KIMEN_APPROVAL_FEATURE_SHA256="$value"
        ;;
      migrated-from-version)
        if [ "$migrated_seen" -ne 0 ]; then
          echo "  FAIL [$marker]: duplicate key migrated-from-version"
          failed=1
        fi
        migrated_seen=$((migrated_seen + 1))
        KIMEN_APPROVAL_MIGRATED_FROM_VERSION="$value"
        ;;
      *)
        echo "  FAIL [$marker]: unknown key $key"
        failed=1
        ;;
    esac
  done < "$marker"

  if [ "$version_seen" -eq 0 ]; then
    echo "  FAIL [$marker]: approval-version is missing and required"
    failed=1
  elif [ "$KIMEN_APPROVAL_VERSION" != "2" ]; then
    echo "  FAIL [$marker]: approval-version must be exactly 2"
    failed=1
  fi
  if [ "$approved_seen" -eq 0 ]; then
    echo "  FAIL [$marker]: approved-at is missing and required"
    failed=1
  elif ! kimen_is_utc_timestamp "$KIMEN_APPROVED_AT"; then
    echo "  FAIL [$marker]: approved-at is not a canonical UTC timestamp"
    failed=1
  fi
  if [ "$spec_seen" -eq 0 ]; then
    echo "  FAIL [$marker]: spec-sha256 is missing and required"
    failed=1
  elif ! kimen_is_sha256 "$KIMEN_APPROVAL_SPEC_SHA256"; then
    echo "  FAIL [$marker]: spec-sha256 must be 64 lowercase hexadecimal characters"
    failed=1
  fi
  if [ "$feature_seen" -eq 0 ]; then
    echo "  FAIL [$marker]: feature-sha256 is missing and required"
    failed=1
  elif ! kimen_is_sha256 "$KIMEN_APPROVAL_FEATURE_SHA256"; then
    echo "  FAIL [$marker]: feature-sha256 must be 64 lowercase hexadecimal characters"
    failed=1
  fi
  if [ "$migrated_seen" -gt 0 ] && [ "$KIMEN_APPROVAL_MIGRATED_FROM_VERSION" != "1" ]; then
    echo "  FAIL [$marker]: migrated-from-version must be exactly 1"
    failed=1
  fi
  [ "$failed" -eq 0 ]
}

# Strict legacy parser used only by the one-time v1 -> v2 migration.
kimen_parse_approval_v1() {
  local marker="$1"
  local line key value
  local approved_seen=0 spec_seen=0 failed=0 line_number=0

  KIMEN_LEGACY_APPROVED_AT=""
  KIMEN_LEGACY_SPEC_SHA256=""
  if [ ! -f "$marker" ] || [ -L "$marker" ]; then
    echo "  FAIL [$marker]: legacy approval marker is missing or is a symlink"
    return 1
  fi
  while IFS= read -r line || [ -n "$line" ]; do
    line_number=$((line_number + 1))
    if [ -z "$line" ] || ! printf '%s\n' "$line" | grep -qE '^[a-z][a-z0-9-]*: .+$'; then
      echo "  FAIL [$marker]: malformed legacy line $line_number"
      failed=1
      continue
    fi
    key=${line%%:*}
    value=${line#*: }
    case "$key" in
      approved-at)
        if [ "$approved_seen" -ne 0 ]; then
          echo "  FAIL [$marker]: duplicate legacy key approved-at"
          failed=1
        fi
        approved_seen=$((approved_seen + 1))
        KIMEN_LEGACY_APPROVED_AT="$value"
        ;;
      spec-sha256)
        if [ "$spec_seen" -ne 0 ]; then
          echo "  FAIL [$marker]: duplicate legacy key spec-sha256"
          failed=1
        fi
        spec_seen=$((spec_seen + 1))
        KIMEN_LEGACY_SPEC_SHA256="$value"
        ;;
      *)
        echo "  FAIL [$marker]: unknown legacy key $key"
        failed=1
        ;;
    esac
  done < "$marker"

  if [ "$approved_seen" -eq 0 ]; then
    echo "  FAIL [$marker]: legacy approved-at is missing"
    failed=1
  elif ! kimen_is_utc_timestamp "$KIMEN_LEGACY_APPROVED_AT"; then
    echo "  FAIL [$marker]: legacy approved-at is not a canonical UTC timestamp"
    failed=1
  fi
  if [ "$spec_seen" -eq 0 ]; then
    echo "  FAIL [$marker]: legacy spec-sha256 is missing"
    failed=1
  elif ! kimen_is_sha256 "$KIMEN_LEGACY_SPEC_SHA256"; then
    echo "  FAIL [$marker]: legacy spec-sha256 must be 64 lowercase hexadecimal characters"
    failed=1
  fi
  [ "$failed" -eq 0 ]
}

kimen_write_approval_v2() {
  local marker="$1"
  local approved_at="$2"
  local spec_sha="$3"
  local feature_sha="$4"
  local migrated="${5:-}"
  local tmp
  tmp=$(mktemp "${marker}.tmp.XXXXXX") || return 1
  {
    echo "approval-version: 2"
    echo "approved-at: $approved_at"
    echo "spec-sha256: $spec_sha"
    echo "feature-sha256: $feature_sha"
    if [ "$migrated" = "1" ]; then
      echo "migrated-from-version: 1"
    fi
  } > "$tmp" || {
    rm -f "$tmp"
    return 1
  }
  mv "$tmp" "$marker"
}
