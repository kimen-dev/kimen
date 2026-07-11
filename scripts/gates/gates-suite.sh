#!/usr/bin/env bash
# Gate: full deterministic suite (constitution Art. III/X). "Done" = this exits 0.
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Allocate every writable tool cache before Nx or Playwright can consult
# mutable user/global state. cache-env marks the one permitted re-entry.
if [ "${KIMEN_CACHE_ENV_READY:-}" != '1' ]; then
  exec bash scripts/gates/cache-env.sh -- bash scripts/gates/gates-suite.sh "$@"
fi
bash scripts/gates/cache-env.sh --validate || exit 1

EVIDENCE_DIRECTORY="$KIMEN_CACHE_ROOT/gate-evidence"
KIMEN_GATE_EVIDENCE_FILE="$EVIDENCE_DIRECTORY/current-run.tsv"
mkdir -p "$EVIDENCE_DIRECTORY" || exit 1
: >"$KIMEN_GATE_EVIDENCE_FILE" || exit 1
KIMEN_GATE_EVIDENCE_READY=1
export KIMEN_GATE_EVIDENCE_FILE KIMEN_GATE_EVIDENCE_READY

record_suite_evidence() {
  printf 'suite\t%s\t%s\n' "$1" "$2" >>"$KIMEN_GATE_EVIDENCE_FILE" || exit 1
}

run_gate() {
  local name="$1"; shift
  echo "── GATE $name"
  if "$@"; then
    record_suite_evidence "$name" green
    echo "── GATE $name: PASS"
  else
    record_suite_evidence "$name" red
    echo "── GATE $name: FAIL"
    exit 1
  fi
}

# The trusted Check Run controller is security-critical bootstrap code and
# must carry its own dependency-free regression suite on main.
run_gate review-evidence node --test .github/scripts/review-evidence.test.cjs
run_gate core bash scripts/gates/gates-core.sh
run_gate test-browser bash scripts/gates/gates-browser.sh chromium
KIMEN_CAPABILITY_EVIDENCE_FILE="$EVIDENCE_DIRECTORY/capabilities-current-run.json"
export KIMEN_CAPABILITY_EVIDENCE_FILE
run_gate capabilities node scripts/gates/check-capabilities.mjs \
  --write-evidence "$KIMEN_CAPABILITY_EVIDENCE_FILE" \
  --gate-evidence "$KIMEN_GATE_EVIDENCE_FILE"
# run_gate appends the capability verdict after the command succeeds. Rebuild
# the revision record from that final TSV so review packets consume the exact
# complete gate set rather than the pre-verdict snapshot.
node scripts/gates/check-capabilities.mjs --write-evidence "$KIMEN_CAPABILITY_EVIDENCE_FILE" \
  --gate-evidence "$KIMEN_GATE_EVIDENCE_FILE" >/dev/null || exit 1

if [ "${KIMEN_MUTATION_DELEGATED_TO:-}" = 'mutation' ]; then
  echo "GATES JOB GREEN — mutation delegated; Definition of Done requires ci / mutation and ci / containment"
else
  echo "LOCAL GATES GREEN — protected main still requires ci / containment"
fi
echo "CURRENT-RUN EVIDENCE: $KIMEN_GATE_EVIDENCE_FILE"
