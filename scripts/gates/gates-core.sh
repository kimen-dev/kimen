#!/usr/bin/env bash
# Reusable fast non-browser quality gate. A feature argument keeps the narrow
# contract/traceability diagnostic used by Spec Kit fixtures.
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

# Traceability is meaningful only for a synchronized behavior contract.
if [ -z "$ONLY" ]; then
  run_core_gate constitution bash scripts/gates/constitution-check.sh
fi
run_core_gate spec-contracts bash scripts/gates/check-spec-contracts.sh "${FEATURE_ARG[@]}"
run_core_gate traceability bash scripts/gates/check-traceability.sh "${FEATURE_ARG[@]}"

if [ -n "$ONLY" ]; then
  echo "CORE CONTRACT GATES GREEN"
  exit 0
fi

command -v pnpm >/dev/null || {
  echo "gates-core: pnpm not found — run 'corepack enable pnpm'" >&2
  exit 1
}
# Nx boundaries need a materialized ProjectGraph or their lint rule silently
# skips. Fail if graph generation does not leave a non-empty artifact.
nx_graph() {
  pnpm exec nx graph --file=.nx/graph.json >/dev/null || return 1
  [ -s .nx/graph.json ]
}

agent_skills() {
  [ -d .agents/skills ] &&
    [ -L .claude/skills ] &&
    [ "$(readlink .claude/skills)" = '../.agents/skills' ] &&
    [ -f .agents/skills/frontend-qa/SKILL.md ]
}

run_core_gate workflows pnpm run check:workflows
run_core_gate agent-skills agent_skills
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
run_core_gate lint pnpm run lint
run_core_gate styles pnpm run lint:styles
run_core_gate typecheck pnpm run typecheck
run_core_gate deadcode pnpm run deadcode
run_core_gate contrast pnpm --filter @kimen/tokens contrast
run_core_gate budgets pnpm exec nx run-many -t size
run_core_gate test pnpm exec nx run-many -t test
echo "CORE QUALITY GREEN"
