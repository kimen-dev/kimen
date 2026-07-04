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
