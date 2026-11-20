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

# Scope. Unset, the gate is complete: that is local readiness and release. CI
# opts a change into the affected scope (scripts/gates/select-affected.mjs):
# every repository-wide gate below still runs, including the build they read,
# and lint, budgets and unit tests cover only the listed projects and paths.
SCOPE="${KIMEN_GATE_SCOPE:-full}"
case "$SCOPE" in
  full) ;;
  affected)
    if [ "${KIMEN_AFFECTED_PROJECTS+set}" != set ] || [ "${KIMEN_AFFECTED_LINT_PATHS+set}" != set ]; then
      echo 'gates-core: the affected scope needs KIMEN_AFFECTED_PROJECTS and KIMEN_AFFECTED_LINT_PATHS' >&2
      exit 1
    fi
    [ -z "$ONLY" ] || {
      echo 'gates-core: a feature argument runs the contract gates only; it takes no scope' >&2
      exit 1
    }
    ;;
  *)
    echo "gates-core: KIMEN_GATE_SCOPE must be full or affected, got '$SCOPE'" >&2
    exit 1
    ;;
esac

# Direct core runs receive the same isolated caches as the full suite. The
# feature-scoped fixture path also exercises this wrapper without invoking Nx.
if [ "${KIMEN_CACHE_ENV_READY:-}" != '1' ]; then
  exec bash scripts/gates/cache-env.sh -- bash scripts/gates/gates-core.sh "$@"
fi
bash scripts/gates/cache-env.sh --validate || exit 1

export NX_TUI=false
export KNIP_DISABLE_RAW_TRANSFER=1

EVIDENCE_DIRECTORY="${KIMEN_WORKTREE_CACHE_ROOT:-$KIMEN_CACHE_ROOT}/gate-evidence"
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
    if [ "$name" = 'infra-tests' ] &&
      grep -Fxq $'skip\tcross-filesystem\tskipped' "$KIMEN_GATE_EVIDENCE_FILE"; then
      record_core_evidence "$name" partial
      echo "── CORE $name: PARTIAL (cross-filesystem check skipped)"
    else
      record_core_evidence "$name" green
      echo "── CORE $name: PASS"
    fi
  else
    record_core_evidence "$name" red
    echo "── CORE $name: FAIL"
    exit 1
  fi
}

# A project gate in the affected scope: it covers the listed projects or
# paths only and records `affected`, or `skipped` when the list is empty (Nx
# would read an empty --projects as every project). Neither status is
# `green`, so current-run evidence from a narrowed run can never back a
# release capability claim (check-capabilities.mjs).
run_affected_gate() {
  local name="$1"
  local list="$2"
  shift 2
  echo "── CORE $name (affected: ${list:-nothing})"
  if [ -z "$list" ]; then
    record_core_evidence "$name" skipped
    echo "── CORE $name: SKIPPED (nothing affected)"
  elif "$@"; then
    record_core_evidence "$name" affected
    echo "── CORE $name: PASS (affected scope)"
  else
    record_core_evidence "$name" red
    echo "── CORE $name: FAIL"
    exit 1
  fi
}

affected_lint() {
  local paths
  IFS=, read -r -a paths <<<"$KIMEN_AFFECTED_LINT_PATHS"
  pnpm exec eslint --no-error-on-unmatched-pattern "${paths[@]}"
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
. scripts/gates/lib.sh
# Nx boundaries need a materialized ProjectGraph or their lint rule silently
# skips. Fail if graph generation does not leave a non-empty artifact.
nx_graph() (
  kimen_use_worktree_nx_graph
  pnpm exec nx graph --file=.nx/graph.json >/dev/null || return 1
  [ -s .nx/graph.json ]
)

agent_skills() {
  [ -d .agents/skills ] &&
    [ -L .claude/skills ] &&
    [ "$(readlink .claude/skills)" = '../.agents/skills' ] &&
    [ -f .agents/skills/frontend-qa/SKILL.md ]
}

run_core_gate workflows pnpm run check:workflows
# SAST early and on the pinned ruleset: it is part of what the required result
# asserts, so the suite that defines local readiness has to run it too. A suite
# that omits a gate CI enforces reports green for changes CI rejects.
run_core_gate semgrep bash scripts/gates/semgrep-scan.sh
run_core_gate agent-skills agent_skills
run_core_gate nx-graph nx_graph
run_core_gate format pnpm run format:check
# Build precedes type-aware analysis because component tests and generated
# contract sync both consume fresh dist output on a clean checkout. It stays
# whole in the affected scope too: generated sync, typecheck and the infra
# tests read every package's build output (scripts/tests/gate-build-order).
run_core_gate build pnpm exec nx run-many -t build
run_core_gate tokens-sync node scripts/gates/check-generated-sync.mjs tokens
run_core_gate surfaces-sync node scripts/gates/check-generated-sync.mjs surfaces
run_core_gate catalog-sync node scripts/gates/check-generated-sync.mjs catalog
run_core_gate wrappers-sync node scripts/gates/check-generated-sync.mjs wrappers
run_core_gate public-api pnpm run check:api
run_core_gate token-contract pnpm run check:tokens
run_core_gate component-inventory pnpm run check:component-inventory
(
  kimen_use_worktree_nx_graph
  if [ "$SCOPE" = full ]; then
    run_core_gate lint pnpm run lint
  else
    run_affected_gate lint "$KIMEN_AFFECTED_LINT_PATHS" affected_lint
  fi
) || exit 1
run_core_gate styles pnpm run lint:styles
run_core_gate typecheck pnpm run typecheck
run_core_gate deadcode pnpm run deadcode
run_core_gate contrast pnpm --filter @kimen/tokens contrast
if [ "$SCOPE" = full ]; then
  run_core_gate budgets pnpm exec nx run-many -t size
else
  run_affected_gate budgets "$KIMEN_AFFECTED_PROJECTS" \
    pnpm exec nx run-many -t size --projects="$KIMEN_AFFECTED_PROJECTS"
fi
# Infrastructure tests assert the wiring promises above (workflow structure,
# gate composition, release invariants); capabilities keeps public status
# claims in sync with docs/capabilities.json. Both are fast node checks.
run_core_gate infra-tests pnpm run test:infra
run_core_gate capabilities pnpm run check:capabilities
if [ "$SCOPE" = full ]; then
  run_core_gate test pnpm exec nx run-many -t test
else
  run_affected_gate test "$KIMEN_AFFECTED_PROJECTS" \
    pnpm exec nx run-many -t test --projects="$KIMEN_AFFECTED_PROJECTS"
fi
if grep -q $'\tpartial$' "$KIMEN_GATE_EVIDENCE_FILE"; then
  echo 'CORE CHECKS PASSED WITH SKIPS'
elif [ "$SCOPE" = affected ]; then
  echo "CORE QUALITY GREEN (affected scope: ${KIMEN_AFFECTED_PROJECTS:-no projects})"
else
  echo 'CORE QUALITY GREEN'
fi
