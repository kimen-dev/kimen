#!/usr/bin/env bash
# Gate: SAST over the vendored Semgrep ruleset (Art. X determinism).
#
# The same command in CI and on a developer machine, so a local pass and the
# required check cannot disagree about what was scanned. `.semgrep/` is pinned
# in-tree, so this needs no network at scan time.
#
# Usage: semgrep-scan.sh
#   Runs `semgrep` from PATH; falls back to `uvx` so a machine without it
#   installed still gets the real verdict rather than a skip.
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

SEMGREP_VERSION='1.168.0'

# `.specify`, `.agents` and `.claude` are vendored agent tooling, not shipped
# code. `.semgrep` is the ruleset itself: rule files carry code patterns as
# data, and other rules match them.
EXCLUDES=(--exclude .specify --exclude .agents --exclude .claude --exclude .semgrep)

# The engine is part of the pin. A different Semgrep on PATH can parse or
# evaluate the same vendored rules differently, so a local pass on it predicts
# nothing about the required check — which is the whole reason this script
# exists. Take it only when its version matches; otherwise run the pinned one.
installed_version() {
  command -v semgrep >/dev/null 2>&1 || return 1
  semgrep --version 2>/dev/null | head -1 | tr -d '[:space:]'
}

found="$(installed_version)"

if [ "$found" = "$SEMGREP_VERSION" ]; then
  runner=(semgrep)
elif command -v uvx >/dev/null 2>&1; then
  runner=(uvx --from "semgrep==${SEMGREP_VERSION}" semgrep)
else
  echo "GATE semgrep: FAIL (need semgrep ${SEMGREP_VERSION}, or uvx to fetch it)" >&2
  echo "  on PATH: ${found:-none}" >&2
  echo "  install: pipx install semgrep==${SEMGREP_VERSION}" >&2
  exit 1
fi

"${runner[@]}" scan --config .semgrep/ --error --metrics=off "${EXCLUDES[@]}"
status=$?

if [ "$status" -ne 0 ]; then
  echo "GATE semgrep: FAIL"
  exit "$status"
fi

echo "GATE semgrep: PASS (vendored ruleset)"
