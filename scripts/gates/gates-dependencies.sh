#!/usr/bin/env bash
# Focused quality for dependency-only pull requests. The frozen install happens
# in the workflow before this script; this gate validates consumers selected by
# Nx and retains cheap repository-wide integrity checks.
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

[ "$#" -eq 2 ] || {
  echo 'gates-dependencies: usage: gates-dependencies.sh <base-sha> <head-sha>' >&2
  exit 1
}
BASE_SHA="$1"
HEAD_SHA="$2"

if [ "${KIMEN_CACHE_ENV_READY:-}" != '1' ]; then
  exec bash scripts/gates/cache-env.sh -- bash scripts/gates/gates-dependencies.sh "$@"
fi
bash scripts/gates/cache-env.sh --validate || exit 1

export NX_TUI=false
export KNIP_DISABLE_RAW_TRANSFER=1

DEPENDENCY_EVIDENCE_DIRECTORY="$KIMEN_CACHE_ROOT/gate-evidence"
KIMEN_GATE_EVIDENCE_FILE="$DEPENDENCY_EVIDENCE_DIRECTORY/current-run.tsv"
mkdir -p "$DEPENDENCY_EVIDENCE_DIRECTORY" || exit 1
: >"$KIMEN_GATE_EVIDENCE_FILE" || exit 1
KIMEN_GATE_EVIDENCE_READY=1
export KIMEN_GATE_EVIDENCE_FILE KIMEN_GATE_EVIDENCE_READY

run_dependency_gate() {
  local name="$1"
  shift
  echo "── DEPENDENCY $name"
  if "$@"; then
    printf 'dependency\t%s\tgreen\n' "$name" >>"$KIMEN_GATE_EVIDENCE_FILE" || exit 1
    echo "── DEPENDENCY $name: PASS"
  else
    printf 'dependency\t%s\tred\n' "$name" >>"$KIMEN_GATE_EVIDENCE_FILE" || exit 1
    echo "── DEPENDENCY $name: FAIL"
    exit 1
  fi
}

nx_graph() {
  pnpm exec nx graph --file=.nx/graph.json >/dev/null || return 1
  [ -s .nx/graph.json ]
}

run_dependency_gate workflows pnpm run check:workflows
run_dependency_gate format pnpm run format:check
run_dependency_gate nx-graph nx_graph
run_dependency_gate build pnpm exec nx affected -t build --base="$BASE_SHA" --head="$HEAD_SHA" --nxBail=true
run_dependency_gate tokens-sync node scripts/gates/check-generated-sync.mjs tokens
run_dependency_gate surfaces-sync node scripts/gates/check-generated-sync.mjs surfaces
run_dependency_gate catalog-sync node scripts/gates/check-generated-sync.mjs catalog
run_dependency_gate public-api pnpm run check:api
run_dependency_gate token-contract pnpm run check:tokens
run_dependency_gate component-inventory pnpm run check:component-inventory
run_dependency_gate lint pnpm run lint
run_dependency_gate styles pnpm run lint:styles
run_dependency_gate typecheck pnpm run typecheck
run_dependency_gate deadcode pnpm run deadcode
run_dependency_gate contrast pnpm --filter @kimen/tokens contrast
run_dependency_gate infra-tests pnpm run test:infra
run_dependency_gate capabilities pnpm run check:capabilities
run_dependency_gate test pnpm exec nx affected -t test --base="$BASE_SHA" --head="$HEAD_SHA" --nxBail=true
run_dependency_gate size pnpm exec nx affected -t size --base="$BASE_SHA" --head="$HEAD_SHA" --nxBail=true
if [ "$(node scripts/gates/dependency-browser-impact.mjs --base "$BASE_SHA" --head "$HEAD_SHA")" = 'true' ]; then
  run_dependency_gate browser bash scripts/gates/gates-browser.sh chromium
fi
echo 'DEPENDENCY QUALITY GREEN'
echo "CURRENT-RUN EVIDENCE: $KIMEN_GATE_EVIDENCE_FILE"
