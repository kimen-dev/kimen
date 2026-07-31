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

if command -v semgrep >/dev/null 2>&1; then
  runner=(semgrep)
elif command -v uvx >/dev/null 2>&1; then
  runner=(uvx --from "semgrep==${SEMGREP_VERSION}" semgrep)
else
  echo "GATE semgrep: FAIL (no semgrep and no uvx on PATH)" >&2
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
