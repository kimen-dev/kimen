#!/usr/bin/env bash
# Gate: full deterministic suite (constitution Art. III/X). "Done" = this exits 0.
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

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

run_gate constitution bash scripts/gates/constitution-check.sh
# Nx boundaries rule needs a cached ProjectGraph or it silently skips (gate hole)
pnpm exec nx graph --file=.nx/graph.json >/dev/null 2>&1 || true
run_gate format pnpm run format:check
run_gate lint pnpm run lint
run_gate styles pnpm run lint:styles
run_gate typecheck pnpm run typecheck
run_gate deadcode pnpm run deadcode
run_gate build pnpm -r run build
run_gate test pnpm -r run test

echo "ALL GATES GREEN — done is done (Art. III)"
