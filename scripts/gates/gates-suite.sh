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
# The trusted Check Run controller is security-critical bootstrap code and
# must carry its own dependency-free regression suite on main.
run_gate review-evidence node --test .github/scripts/review-evidence.test.cjs
run_gate nx-graph nx_graph
run_gate format pnpm run format:check
# Build runs BEFORE lint/typecheck: browser tests import the built dist
# output (they assert what ships, Art. III), so type-aware analysis needs
# dist/ to exist — a fresh CI clone has none until this gate.
run_gate build pnpm exec nx run-many -t build
# The compiled token CSS is committed as the public token contract (Art. I:
# generated, committed, diffable). After a fresh build it must match the
# committed copy exactly, or the sources and the contract have drifted.
run_gate tokens-sync git diff --exit-code -- packages/tokens/dist/css
# Agent surfaces are committed contracts (Art. I): the normalized docs-json
# intermediate, the custom-elements manifest and both llms.txt copies must
# match a fresh regeneration exactly (tokens-sync precedent).
run_gate surfaces-sync git diff --exit-code -- \
  packages/elements/generated packages/elements/llms.txt llms.txt
run_gate contrast pnpm --filter @kimen/tokens contrast
run_gate lint pnpm run lint
run_gate styles pnpm run lint:styles
run_gate typecheck pnpm run typecheck
run_gate deadcode pnpm run deadcode
# Packaging correctness is validated mechanically before publish (Art. IX/X):
# publint on every publishable package + are-the-types-wrong (esm-only profile:
# @kimen ships ESM; Stencil's dual .cjs.js output mistypes under type:module).
# The loader entrypoint ignores internal-resolution-error: Stencil GENERATES
# loader/index.d.ts with extensionless imports (upstream quirk, Art. I forbids
# hand-editing it); the main entrypoint stays fully strict.
run_gate packaging pnpm run packaging
# Per-component budgets (Art. IV): marginal cost single-digit KB; the shared
# Stencil runtime is a separately-capped line item (see size-limit config).
run_gate budgets pnpm exec nx run-many -t size
run_gate test pnpm exec nx run-many -t test
# Real-browser suite (Art. III: never mock-doc/jsdom alone; Art. IV baseline).
# Prerequisite once per machine: pnpm --filter @kimen/elements exec playwright install chromium
# Pre-release engine matrix: KIMEN_BROWSER_MATRIX=1 (chromium + firefox + webkit).
run_gate test-browser pnpm exec nx run-many -t test-browser

echo "ALL GATES GREEN — done is done (Art. III)"
