#!/usr/bin/env bash
# Gate: constitutional consistency (no-drift rule, Art. I applied to governance).
#
# The operative in-repo governance text is the digest at
# .specify/memory/constitution.md. The normative master is maintained by the
# founder OUTSIDE this repository; when a local copy is present (internal/,
# gitignored, founder machines only), the version stamps must match. CI and
# external clones only validate the digest.
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
FAIL=0

DIGEST_V=$(grep -oE '\*\*Version\*\*: [0-9]+\.[0-9]+\.[0-9]+' .specify/memory/constitution.md | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || true)
if [ -z "$DIGEST_V" ]; then
  echo "GATE constitution: FAIL — digest missing its version stamp (.specify/memory/constitution.md)"
  FAIL=1
else
  echo "GATE constitution: digest v$DIGEST_V"
fi

MASTER=internal/kimen-constitution.md
if [ -f "$MASTER" ]; then
  MASTER_V=$(grep -oE '\*\*Version\*\*: [0-9]+\.[0-9]+\.[0-9]+' "$MASTER" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1 || true)
  if [ -n "$DIGEST_V" ] && [ "$MASTER_V" != "$DIGEST_V" ]; then
    echo "GATE constitution: FAIL — digest v$DIGEST_V is stale (master is v$MASTER_V). Regenerate the digest before any /speckit-* run."
    FAIL=1
  else
    echo "GATE constitution: master present and in sync (v$MASTER_V)"
  fi
fi

for f in AGENTS.md LICENSE SECURITY.md CONTRIBUTING.md .specify/memory/constitution.md .specify/templates/overrides/spec-template.md .specify/templates/overrides/tasks-template.md .specify/templates/overrides/plan-template.md; do
  if [ ! -f "$f" ]; then
    echo "GATE constitution: FAIL — required governance file missing: $f"
    FAIL=1
  fi
done

[ "$FAIL" -eq 0 ] && echo "GATE constitution: PASS"
exit $FAIL
