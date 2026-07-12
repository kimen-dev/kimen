#!/usr/bin/env bash
# One deterministic real-browser invocation. The caller must select exactly
# one supported engine; prerelease supplies this script from a three-job matrix.
set -uo pipefail

fail() {
  printf 'gates-browser: %s\n' "$1" >&2
  exit 1
}

[ "$#" -eq 1 ] || fail 'usage: gates-browser.sh <chromium|firefox|webkit>'
ENGINE="$1"
case "$ENGINE" in
  chromium | firefox | webkit) ;;
  *) fail 'engine must be exactly one of chromium, firefox, webkit' ;;
esac

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
if [ "${KIMEN_CACHE_ENV_READY:-}" != '1' ]; then
  exec bash scripts/gates/cache-env.sh -- bash scripts/gates/gates-browser.sh "$@"
fi
bash scripts/gates/cache-env.sh --validate || exit 1

export KIMEN_BROWSER_ENGINE="$ENGINE"
export NX_TUI=false

EVIDENCE_DIRECTORY="$KIMEN_CACHE_ROOT/gate-evidence"
KIMEN_GATE_EVIDENCE_FILE="$EVIDENCE_DIRECTORY/current-run.tsv"
mkdir -p "$EVIDENCE_DIRECTORY" || fail 'current-run evidence directory could not be created'
if [ "${KIMEN_GATE_EVIDENCE_READY:-}" != '1' ]; then
  : >"$KIMEN_GATE_EVIDENCE_FILE" || fail 'current-run evidence could not be initialized'
fi
KIMEN_GATE_EVIDENCE_READY=1
export KIMEN_GATE_EVIDENCE_FILE KIMEN_GATE_EVIDENCE_READY

record_browser_evidence() {
  printf 'browser\t%s\t%s\n' "$1" "$2" >>"$KIMEN_GATE_EVIDENCE_FILE" ||
    fail 'current-run evidence could not be recorded'
}

run_browser_gate() {
  local name="$1"
  shift
  echo "── BROWSER[$ENGINE] $name"
  if "$@"; then
    record_browser_evidence "$name" green
    echo "── BROWSER[$ENGINE] $name: PASS"
  else
    record_browser_evidence "$name" red
    echo "── BROWSER[$ENGINE] $name: FAIL"
    exit 1
  fi
}

command -v pnpm >/dev/null || fail "pnpm not found — run 'corepack enable pnpm'"
command -v node >/dev/null || fail 'node not found'

# Configs are executable code. Validate every Stencil/Vitest/browser/mutation
# config before resolving or launching a browser process.
run_browser_gate config-typecheck pnpm exec tsc -p packages/elements/scripts/tsconfig.json --noEmit --pretty false

BROWSER_EXECUTABLE="$({
  node --input-type=module --eval '
    import { chromium, firefox, webkit } from "./packages/elements/node_modules/playwright/index.mjs";
    const engines = { chromium, firefox, webkit };
    process.stdout.write(engines[process.argv[1]].executablePath());
  ' "$ENGINE"
} 2>&1)" || {
  record_browser_evidence "browser-executable:$ENGINE" red
  fail "could not resolve the exact $ENGINE executable: $BROWSER_EXECUTABLE"
}

BROWSERS_ROOT="${PLAYWRIGHT_BROWSERS_PATH%/}"
[ -n "$BROWSERS_ROOT" ] || BROWSERS_ROOT='/'
case "$BROWSER_EXECUTABLE" in
  "$BROWSERS_ROOT"/*) ;;
  *)
    record_browser_evidence "browser-executable:$ENGINE" red
    fail "$ENGINE executable resolves outside PLAYWRIGHT_BROWSERS_PATH: $BROWSER_EXECUTABLE"
    ;;
esac

if [ -L "$BROWSER_EXECUTABLE" ]; then
  record_browser_evidence "browser-executable:$ENGINE" red
  fail "$ENGINE executable must not be a symbolic link: $BROWSER_EXECUTABLE"
fi
if [ ! -f "$BROWSER_EXECUTABLE" ] || [ ! -x "$BROWSER_EXECUTABLE" ]; then
  record_browser_evidence "browser-executable:$ENGINE" red
  fail "missing prepared $ENGINE executable under PLAYWRIGHT_BROWSERS_PATH at $BROWSER_EXECUTABLE; install with PLAYWRIGHT_BROWSERS_PATH='$PLAYWRIGHT_BROWSERS_PATH' pnpm --filter @kimen/elements exec playwright install $ENGINE"
fi

BROWSERS_ROOT_PHYSICAL="$(CDPATH= cd "$BROWSERS_ROOT" && pwd -P)" ||
  fail 'PLAYWRIGHT_BROWSERS_PATH could not be resolved'
EXECUTABLE_DIRECTORY_PHYSICAL="$(CDPATH= cd "$(dirname "$BROWSER_EXECUTABLE")" && pwd -P)" ||
  fail "$ENGINE executable directory could not be resolved"
case "$EXECUTABLE_DIRECTORY_PHYSICAL" in
  "$BROWSERS_ROOT_PHYSICAL" | "$BROWSERS_ROOT_PHYSICAL"/*) ;;
  *)
    record_browser_evidence "browser-executable:$ENGINE" red
    fail "$ENGINE executable escapes PLAYWRIGHT_BROWSERS_PATH after physical resolution"
    ;;
esac
record_browser_evidence "browser-executable:$ENGINE" green

# Browser targets are deliberately uncached: KIMEN_BROWSER_ENGINE is a runtime
# input and independent prerelease jobs must execute rather than reuse another
# engine's Nx result.
run_browser_gate "test-browser:$ENGINE" pnpm exec nx run @kimen/elements:test-browser --skipNxCache
echo "BROWSER GATE GREEN — engine=$ENGINE executable=$BROWSER_EXECUTABLE"
