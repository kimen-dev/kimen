#!/usr/bin/env bash
# One deterministic real-browser invocation. The caller must select exactly
# one supported engine; prerelease supplies this script from a three-job matrix.
set -uo pipefail

fail() {
  printf 'gates-browser: %s\n' "$1" >&2
  exit 1
}

USAGE='usage: gates-browser.sh <chromium|firefox|webkit> [--plan]'
[ "$#" -eq 1 ] || { [ "$#" -eq 2 ] && [ "$2" = '--plan' ]; } || fail "$USAGE"
ENGINE="$1"
PLAN_ONLY="${2:-}"
case "$ENGINE" in
  chromium | firefox | webkit) ;;
  *) fail 'engine must be exactly one of chromium, firefox, webkit' ;;
esac

# CI splits the elements suite across parallel jobs (.github/workflows/ci.yml):
# KIMEN_BROWSER_SHARD=<index>/<count> runs that share of its files, and the
# smaller Chromium-only suites run once, in the last shard. Unset, the gate is
# the whole suite in one invocation (local readiness, release).
SHARD="${KIMEN_BROWSER_SHARD:-}"
SHARD_INDEX=1
SHARD_COUNT=1
if [ -n "$SHARD" ]; then
  if [[ ! "$SHARD" =~ ^([1-9][0-9]*)/([1-9][0-9]*)$ ]] || [ "${BASH_REMATCH[1]}" -gt "${BASH_REMATCH[2]}" ]; then
    fail "KIMEN_BROWSER_SHARD must be <index>/<count> with 1 <= index <= count, got '$SHARD'"
  fi
  SHARD_INDEX="${BASH_REMATCH[1]}"
  SHARD_COUNT="${BASH_REMATCH[2]}"
fi

# Scope. Unset, every suite runs (local readiness, release). CI opts a change
# into the affected scope (scripts/gates/select-affected.mjs): each suite runs
# when the project that owns it is among KIMEN_AFFECTED_PROJECTS, which Nx
# fills with the changed projects and everything that depends on them, so a
# change to @kimen/tokens reaches the elements suite through @kimen/elements.
SCOPE="${KIMEN_GATE_SCOPE:-full}"
case "$SCOPE" in
  full) ;;
  affected)
    [ "${KIMEN_AFFECTED_PROJECTS+set}" = set ] ||
      fail 'the affected scope needs KIMEN_AFFECTED_PROJECTS'
    ;;
  *) fail "KIMEN_GATE_SCOPE must be full or affected, got '$SCOPE'" ;;
esac
affected() {
  [ "$SCOPE" = full ] || [[ ",$KIMEN_AFFECTED_PROJECTS," == *",$1,"* ]]
}

# The browser suites and the projects that own them. Every workspace target
# named test-browser or test-browser-wrapper belongs to one of these
# (scripts/tests/browser-gates.test.mjs checks the inventory).
WRAPPER_PROJECTS=(@kimen/react @kimen/vue)
SUITES=()
affected @kimen/elements && SUITES+=(elements)
AFFECTED_WRAPPERS=()
# Wrapper behavioral suites (spec 034) are Chromium-scoped: the wrapped
# components already carry the three-engine matrix; the wrapper glue runs
# on the ordinary PR engine. Sharded, they run once, in the last shard, with
# the guarded renderer's and the MCP Apps surface's Chromium-only suites.
if [ "$ENGINE" = 'chromium' ] && [ "$SHARD_INDEX" = "$SHARD_COUNT" ]; then
  for project in "${WRAPPER_PROJECTS[@]}"; do
    affected "$project" && AFFECTED_WRAPPERS+=("$project")
  done
  [ "${#AFFECTED_WRAPPERS[@]}" -gt 0 ] && SUITES+=(wrappers)
  affected @kimen/catalog && SUITES+=(catalog)
  affected @kimen/adapter-mcp-apps && SUITES+=(adapter-mcp-apps)
fi
selected() {
  [[ " ${SUITES[*]} " == *" $1 "* ]]
}
comma_list() {
  [ "$#" -gt 0 ] || return 0
  local first="$1"
  shift
  printf '%s' "$first" "${@/#/,}"
}

# --plan names this invocation's suites as a $GITHUB_OUTPUT line and stops,
# so CI prepares a browser only for a shard that has something to run.
if [ "$PLAN_ONLY" = '--plan' ]; then
  printf 'suites=%s\n' "$(comma_list "${SUITES[@]}")"
  exit 0
fi

cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
if [ "${KIMEN_CACHE_ENV_READY:-}" != '1' ]; then
  exec bash scripts/gates/cache-env.sh -- bash scripts/gates/gates-browser.sh "$@"
fi
bash scripts/gates/cache-env.sh --validate || exit 1

export KIMEN_BROWSER_ENGINE="$ENGINE"
export NX_TUI=false

EVIDENCE_DIRECTORY="${KIMEN_WORKTREE_CACHE_ROOT:-$KIMEN_CACHE_ROOT}/gate-evidence"
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

# Nothing ran, so nothing is recorded: a suite without evidence is not green.
if [ "${#SUITES[@]}" -eq 0 ]; then
  echo "BROWSER GATE GREEN — engine=$ENGINE shard=${SHARD:-all}: no browser suite is affected"
  exit 0
fi

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
if ! selected elements; then
  record_browser_evidence "test-browser:$ENGINE${SHARD:+:$SHARD}" skipped
elif [ -n "$SHARD" ]; then
  run_browser_gate "test-browser:$ENGINE:$SHARD" pnpm exec nx run @kimen/elements:test-browser --skipNxCache -- "--shard=$SHARD"
else
  run_browser_gate "test-browser:$ENGINE" pnpm exec nx run @kimen/elements:test-browser --skipNxCache
fi
if [ "$SCOPE" = full ] && selected wrappers; then
  run_browser_gate "test-browser-wrappers:$ENGINE" pnpm exec nx run-many -t test-browser-wrapper --skipNxCache
elif selected wrappers; then
  run_browser_gate "test-browser-wrappers:$ENGINE" pnpm exec nx run-many -t test-browser-wrapper --skipNxCache \
    "--projects=$(comma_list "${AFFECTED_WRAPPERS[@]}")"
fi
# The guarded renderer's interaction contract (spec 028 S17) needs real
# native-control activation; like the wrapper glue it runs on the ordinary
# PR engine — the controls themselves carry the three-engine matrix.
if selected catalog; then
  run_browser_gate "test-browser-catalog:$ENGINE" pnpm exec nx run @kimen/catalog:test-browser --skipNxCache
fi
# The packaged MCP Apps surface document (spec 030 S16–S21) is only proven
# where it runs: inside a sandboxed frame, driven by postMessage alone, under
# its own content policy. Chromium-scoped for now — its content-policy probe
# is verified on this engine only (packages/adapter-mcp-apps/COMPAT.md).
if selected adapter-mcp-apps; then
  run_browser_gate "test-browser-adapter-mcp-apps:$ENGINE" pnpm exec nx run @kimen/adapter-mcp-apps:test-browser --skipNxCache
fi
echo "BROWSER GATE GREEN — engine=$ENGINE shard=${SHARD:-all} executable=$BROWSER_EXECUTABLE"
