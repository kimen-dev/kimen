#!/usr/bin/env bash
# Gate: consolidated fast PR quality suite (constitution Art. III/X).
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

case "$#:${1:-}" in
  0:) ;;
  1:--affected)
    if [ -n "${CI:-}" ] || [ "${KIMEN_SANDBOX:-}" = '1' ]; then
      echo 'gates-suite: --affected is local-only; run the full suite here' >&2
      exit 1
    fi
    exec bash scripts/gates/gates-affected.sh
    ;;
  *) echo 'gates-suite: usage: gates-suite.sh [--affected]' >&2; exit 1 ;;
esac

# Allocate every writable tool cache before Nx or Playwright can consult
# mutable user/global state. cache-env marks the one permitted re-entry.
if [ "${KIMEN_CACHE_ENV_READY:-}" != '1' ]; then
  if [ -n "${CI:-}" ] || [ "${KIMEN_SANDBOX:-}" = '1' ]; then
    exec bash scripts/gates/cross-device-tmpdir.sh -- bash scripts/gates/cache-env.sh -- bash scripts/gates/gates-suite.sh "$@"
  fi
  exec bash scripts/gates/cache-env.sh -- bash scripts/gates/gates-suite.sh "$@"
fi
bash scripts/gates/cache-env.sh --validate || exit 1

EVIDENCE_DIRECTORY="${KIMEN_WORKTREE_CACHE_ROOT:-$KIMEN_CACHE_ROOT}/gate-evidence"
KIMEN_GATE_EVIDENCE_FILE="$EVIDENCE_DIRECTORY/current-run.tsv"
mkdir -p "$EVIDENCE_DIRECTORY" || exit 1
: >"$KIMEN_GATE_EVIDENCE_FILE" || exit 1
KIMEN_GATE_EVIDENCE_READY=1
export KIMEN_GATE_EVIDENCE_FILE KIMEN_GATE_EVIDENCE_READY

record_suite_evidence() {
  printf 'suite\t%s\t%s\n' "$1" "$2" >>"$KIMEN_GATE_EVIDENCE_FILE" || exit 1
}

# With no arguments the suite is complete: that is local readiness. CI may
# narrow both parts to a change's affected scope by exporting
# KIMEN_GATE_SCOPE=affected with its lists (scripts/gates/select-affected.mjs
# prints them); such a run records `affected`, never `green`.
run_gate() {
  local name="$1"; shift
  echo "── GATE $name"
  if "$@"; then
    if [ "$name" = 'test-browser' ] && [ "$(uname -s)" != 'Linux' ] &&
      [ -z "${CI:-}" ] && [ "${KIMEN_RUN_VISUALS:-}" != '1' ]; then
      record_suite_evidence "$name" partial
      echo "── GATE $name: PARTIAL (visual specs skipped)"
    elif [ "${KIMEN_GATE_SCOPE:-full}" = affected ]; then
      record_suite_evidence "$name" affected
      echo "── GATE $name: PASS (affected scope)"
    else
      record_suite_evidence "$name" green
      echo "── GATE $name: PASS"
    fi
  else
    record_suite_evidence "$name" red
    echo "── GATE $name: FAIL"
    exit 1
  fi
}

run_gate core bash scripts/gates/gates-core.sh
run_gate test-browser bash scripts/gates/gates-browser.sh chromium
if grep -q $'\tpartial$' "$KIMEN_GATE_EVIDENCE_FILE"; then
  echo 'LOCAL QUALITY CHECKS PASSED WITH SKIPS'
elif grep -q $'\taffected$' "$KIMEN_GATE_EVIDENCE_FILE"; then
  echo 'AFFECTED QUALITY GATES GREEN (not release evidence)'
else
  echo 'QUALITY GATES GREEN'
fi
echo "CURRENT-RUN EVIDENCE: $KIMEN_GATE_EVIDENCE_FILE"
