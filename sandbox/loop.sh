#!/usr/bin/env bash
# ONE command = one unattended loop (constitution Art. XI + onmars-spec).
#
#   bash sandbox/loop.sh <feature-branch> "<task>"
#
# It does everything: disposable clone of the branch, sandboxed container
# (credential-free, egress allowlist), pnpm install, Playwright (cached),
# Codex runs the task under the loop contract, and the gates suite gives
# the ONLY verdict. You review the diff afterwards and keep or discard.
#
# Auth: run `bash sandbox/login.sh` once first (ChatGPT subscription).
set -euo pipefail
cd "$(dirname "$0")/.."

BRANCH="${1:?usage: bash sandbox/loop.sh <feature-branch> \"<task>\"}"
TASK="${2:?usage: bash sandbox/loop.sh <feature-branch> \"<task>\"}"
STAMP=$(date +%Y%m%d-%H%M%S)
CLONE="$(pwd)/../kimen-loop-$STAMP"

git clone --quiet --branch "$BRANCH" . "$CLONE"
docker build -t kimen-sandbox sandbox/

set +e
docker run --rm \
  --cap-add=NET_ADMIN --cap-add=NET_RAW \
  -v "$CLONE":/workspace -w /workspace \
  -v kimen-codex-auth:/home/node/.codex \
  -v kimen-playwright-cache:/home/node/.cache/ms-playwright \
  -v kimen-pnpm-store:/home/node/.local/share/pnpm \
  -e KIMEN_TASK="$TASK" \
  kimen-sandbox \
  bash -lc 'bash /usr/local/bin/loop-entry.sh'
VERDICT=$?
set -e

echo ""
if [ "$VERDICT" -eq 0 ]; then
  echo "LOOP GREEN (gates exit 0). Review the result OUTSIDE the sandbox:"
  echo "  git -C $CLONE log --oneline -3"
  echo "  git -C $CLONE diff $BRANCH --stat"
  echo "To keep it:       git fetch \"$CLONE\" \"$BRANCH\":loop/$STAMP"
else
  echo "LOOP RED (onmars-spec escalation): gates did not reach exit 0."
  echo "Inspect $CLONE if you want to understand the failure."
fi
echo "To discard:       rm -rf \"$CLONE\""
exit $VERDICT
