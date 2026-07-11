#!/usr/bin/env bash
# Reusable deterministic non-browser gate. A feature argument keeps the narrow
# contract/approval/traceability diagnostic used by Spec Kit fixtures.
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

[ "$#" -le 1 ] || {
  echo 'gates-core: usage: gates-core.sh [specs/NNN-feature]' >&2
  exit 1
}
ONLY="${1:-}"
FEATURE_ARG=()
[ -n "$ONLY" ] && FEATURE_ARG+=("$ONLY")

# Direct core runs receive the same isolated caches as the full suite. The
# feature-scoped fixture path also exercises this wrapper without invoking Nx.
if [ "${KIMEN_CACHE_ENV_READY:-}" != '1' ]; then
  exec bash scripts/gates/cache-env.sh -- bash scripts/gates/gates-core.sh "$@"
fi
bash scripts/gates/cache-env.sh --validate || exit 1

export NX_TUI=false
export KNIP_DISABLE_RAW_TRANSFER=1

EVIDENCE_DIRECTORY="$KIMEN_CACHE_ROOT/gate-evidence"
KIMEN_GATE_EVIDENCE_FILE="$EVIDENCE_DIRECTORY/current-run.tsv"
mkdir -p "$EVIDENCE_DIRECTORY" || {
  echo 'gates-core: current-run evidence directory could not be created' >&2
  exit 1
}
if [ "${KIMEN_GATE_EVIDENCE_READY:-}" != '1' ]; then
  : >"$KIMEN_GATE_EVIDENCE_FILE" || {
    echo 'gates-core: current-run evidence could not be initialized' >&2
    exit 1
  }
fi
KIMEN_GATE_EVIDENCE_READY=1
export KIMEN_GATE_EVIDENCE_FILE KIMEN_GATE_EVIDENCE_READY

record_core_evidence() {
  printf 'core\t%s\t%s\n' "$1" "$2" >>"$KIMEN_GATE_EVIDENCE_FILE" || {
    echo 'gates-core: current-run evidence could not be recorded' >&2
    exit 1
  }
}

run_core_gate() {
  local name="$1"
  shift
  echo "── CORE $name"
  if "$@"; then
    record_core_evidence "$name" green
    echo "── CORE $name: PASS"
  else
    record_core_evidence "$name" red
    echo "── CORE $name: FAIL"
    exit 1
  fi
}

# Approval is meaningful only for a synchronized contract; traceability is
# meaningful only for an approved behavior set. Keep this order fail-closed.
if [ -z "$ONLY" ]; then
  run_core_gate constitution bash scripts/gates/constitution-check.sh
fi
run_core_gate spec-contracts bash scripts/gates/check-spec-contracts.sh "${FEATURE_ARG[@]}"
run_core_gate approvals bash scripts/gates/check-approvals.sh "${FEATURE_ARG[@]}"
run_core_gate traceability bash scripts/gates/check-traceability.sh "${FEATURE_ARG[@]}"

if [ -n "$ONLY" ]; then
  record_core_evidence mutation not-applicable
  echo "── CORE mutation: N/A (feature-scoped diagnostic; repository-wide changed files required)"
  echo "CORE GATES GREEN — mutation N/A for feature-scoped diagnostics"
  exit 0
fi

command -v pnpm >/dev/null || {
  echo "gates-core: pnpm not found — run 'corepack enable pnpm'" >&2
  exit 1
}
MUTATION_STATE='local'
case "${KIMEN_MUTATION_DELEGATED_TO:-}" in
  '') ;;
  mutation)
    if [ "${CI:-}" != 'true' ] || [ "${GITHUB_ACTIONS:-}" != 'true' ]; then
      record_core_evidence mutation red
      echo "── CORE mutation: FAIL (delegation requires CI=true and GITHUB_ACTIONS=true)" >&2
      exit 1
    fi
    MUTATION_STATE='delegated'
    ;;
  *)
    record_core_evidence mutation red
    echo "── CORE mutation: FAIL (KIMEN_MUTATION_DELEGATED_TO must equal mutation)" >&2
    exit 1
    ;;
esac

# Nx boundaries need a materialized ProjectGraph or their lint rule silently
# skips. Fail if graph generation does not leave a non-empty artifact.
nx_graph() {
  pnpm exec nx graph --file=.nx/graph.json >/dev/null || return 1
  [ -s .nx/graph.json ]
}

run_core_gate workflows pnpm run check:workflows
run_core_gate nx-graph nx_graph
run_core_gate format pnpm run format:check
# Build precedes type-aware analysis because component tests and generated
# contract sync both consume fresh dist output on a clean checkout.
run_core_gate build pnpm exec nx run-many -t build
run_core_gate tokens-sync node scripts/gates/check-generated-sync.mjs tokens
run_core_gate surfaces-sync node scripts/gates/check-generated-sync.mjs surfaces
run_core_gate public-api pnpm run check:api
run_core_gate token-contract pnpm run check:tokens
run_core_gate component-inventory pnpm run check:component-inventory
run_core_gate capabilities-static pnpm run check:capabilities
run_core_gate lint pnpm run lint
run_core_gate styles pnpm run lint:styles
run_core_gate typecheck pnpm run typecheck
run_core_gate deadcode pnpm run deadcode
run_core_gate packaging pnpm run packaging
run_core_gate packed-manifest pnpm run check:packed-manifest
run_core_gate contrast pnpm --filter @kimen/tokens contrast
run_core_gate generator-contract pnpm run test:generator-contract
run_core_gate infra-contracts pnpm run test:infra
run_core_gate sandbox-contract pnpm run test:sandbox
run_core_gate budgets pnpm exec nx run-many -t size
run_core_gate test pnpm exec nx run-many -t test
run_core_gate pack-consumer pnpm run test:consumer-contract

case "$MUTATION_STATE" in
  delegated)
    record_core_evidence mutation delegated
    echo "── CORE mutation: DELEGATED to ci / mutation (GitHub Actions only)"
    echo "CORE GATES GREEN — mutation delegated; Definition of Done also requires ci / mutation"
    ;;
  *)
    run_core_gate mutation pnpm run test:mutation
    echo "CORE GATES GREEN"
    ;;
esac
