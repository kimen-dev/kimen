#!/usr/bin/env bash
# Gate: constitutional consistency (no-drift rule, Art. I applied to governance).
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
FAIL=0

ROOT_V=$(grep -oE '\*\*Version\*\*: [0-9]+\.[0-9]+\.[0-9]+' kimen-constitution.md | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || true)
DIGEST_V=$(grep -oE '\*\*Version\*\*: [0-9]+\.[0-9]+\.[0-9]+' .specify/memory/constitution.md | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || true)
if [ -z "$ROOT_V" ] || [ -z "$DIGEST_V" ]; then
  echo "GATE constitution: FAIL — missing version stamp (root: '$ROOT_V', digest: '$DIGEST_V')"
  FAIL=1
elif [ "$ROOT_V" != "$DIGEST_V" ]; then
  echo "GATE constitution: FAIL — digest v$DIGEST_V is stale (root is v$ROOT_V). Regenerate .specify/memory/constitution.md before any /speckit-* run."
  FAIL=1
else
  echo "GATE constitution: version stamps in sync (v$ROOT_V)"
fi

for f in kimen-constitution.md AGENTS.md LICENSE SECURITY.md CONTRIBUTING.md .specify/memory/constitution.md .specify/templates/overrides/spec-template.md .specify/templates/overrides/tasks-template.md; do
  if [ ! -f "$f" ]; then
    echo "GATE constitution: FAIL — required governance file missing: $f"
    FAIL=1
  fi
done

[ "$FAIL" -eq 0 ] && echo "GATE constitution: PASS"
exit $FAIL
