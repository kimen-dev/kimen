#!/usr/bin/env bash
# Apply the small source-controlled main ruleset. Dry-run unless --apply is explicit.
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

RULESET_PATH='.github/rulesets/main.json'
REPOSITORY="${KIMEN_GITHUB_REPOSITORY:-kimen-dev/kimen}"
MODE="${1:---dry-run}"

case "$MODE" in
  --dry-run)
    jq . "$RULESET_PATH"
    exit 0
    ;;
  --apply)
    [ "${KIMEN_CONFIRM_MAIN_RULESET:-}" = 'apply-kimen-main-ruleset' ] || {
      echo 'Refusing live mutation: set KIMEN_CONFIRM_MAIN_RULESET=apply-kimen-main-ruleset.' >&2
      exit 1
    }
    ;;
  *)
    echo 'usage: apply-main-ruleset.sh [--dry-run|--apply]' >&2
    exit 2
    ;;
esac

command -v gh >/dev/null || { echo 'gh is required' >&2; exit 1; }
command -v jq >/dev/null || { echo 'jq is required' >&2; exit 1; }

name="$(jq -r .name "$RULESET_PATH")"
ruleset_id="$(gh api "repos/$REPOSITORY/rulesets" --jq ".[] | select(.name == \"$name\") | .id" | head -n 1)"
if [ -n "$ruleset_id" ]; then
  gh api "repos/$REPOSITORY/rulesets/$ruleset_id" --method PUT --input "$RULESET_PATH" >/dev/null
  echo "Updated ruleset $name ($ruleset_id)."
else
  gh api "repos/$REPOSITORY/rulesets" --method POST --input "$RULESET_PATH" >/dev/null
  echo "Created ruleset $name."
fi
