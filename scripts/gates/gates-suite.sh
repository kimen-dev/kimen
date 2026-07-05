#!/usr/bin/env bash
# Gate: full deterministic suite (constitution Art. III/X). "Done" = this exits 0.
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Non-interactive Nx output (no TUI in gate/CI logs)
export NX_TUI=false

# knip's experimental oxc raw-transfer preallocates a ~4 GiB ArrayBuffer and
# aborts on low-memory runners; disable it so the deadcode gate is deterministic.
export KNIP_DISABLE_RAW_TRANSFER=1

run_gate() {
  local name="$1"; shift
  echo "── GATE $name"
  if "$@"; then
    echo "── GATE $name: PASS"
  else
    echo "── GATE $name: FAIL"
    exit 1
  fi
}

command -v pnpm >/dev/null || { echo "pnpm not found — run 'corepack enable pnpm'"; exit 1; }

# Nx boundaries rule needs a cached ProjectGraph or it silently skips.
# Fail loudly when graph generation errors or emits a missing/empty file.
nx_graph() {
  pnpm exec nx graph --file=.nx/graph.json >/dev/null || return 1
  [ -s .nx/graph.json ]
}

run_gate constitution bash scripts/gates/constitution-check.sh
# Scenario-to-test traceability is a CI gate (Art. II). SKIPs loudly (exit 0)
# while specs/ has no feature files yet; arms itself with the first feature.
run_gate traceability bash scripts/gates/check-traceability.sh
run_gate nx-graph nx_graph
run_gate format pnpm run format:check
run_gate lint pnpm run lint
run_gate styles pnpm run lint:styles
run_gate typecheck pnpm run typecheck
run_gate deadcode pnpm run deadcode
run_gate build pnpm exec nx run-many -t build
# Packaging correctness is validated mechanically before publish (Art. IX/X):
# publint on every publishable package + are-the-types-wrong (esm-only profile:
# @kimen ships ESM; Stencil's dual .cjs.js output mistypes under type:module).
# The loader entrypoint ignores internal-resolution-error: Stencil GENERATES
# loader/index.d.ts with extensionless imports (upstream quirk, Art. I forbids
# hand-editing it); the main entrypoint stays fully strict.
run_gate packaging pnpm run packaging
run_gate test pnpm exec nx run-many -t test

echo "ALL GATES GREEN — done is done (Art. III)"
