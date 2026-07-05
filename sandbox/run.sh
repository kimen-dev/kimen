#!/usr/bin/env bash
# Launch the Kimen unattended-loop sandbox (constitution Art. XI).
#
# Usage: bash sandbox/run.sh [worktree-path]
#   worktree-path: a DEDICATED git worktree for the loop's feature branch
#                  (single writer per feature, onmars-spec C7).
#                  Default: current repo root (fine for a smoke test).
#
# What this guarantees (Art. XI / onmars-spec C5):
#   - disposable container (--rm), no volumes beyond the worktree
#   - NO credentials: no ~/.npmrc, no ~/.gitconfig with tokens, no gh auth,
#     no SSH agent, no env secrets (only ANTHROPIC_API_KEY if provided,
#     scoped to a low-privilege key)
#   - egress restricted to the allowlist in init-firewall.sh
#
# Permission-bypass execution (claude --dangerously-skip-permissions) is
# allowed ONLY inside this container, because it is credential-free.
set -euo pipefail
cd "$(dirname "$0")/.."

WORKTREE="${1:-$(pwd)}"
IMAGE=kimen-sandbox

docker build -t "$IMAGE" sandbox/

exec docker run --rm -it \
  --cap-add=NET_ADMIN --cap-add=NET_RAW \
  -v "$WORKTREE":/workspace \
  -w /workspace \
  ${ANTHROPIC_API_KEY:+-e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"} \
  "$IMAGE" \
  bash -lc 'sudo /usr/local/bin/init-firewall.sh && corepack enable pnpm 2>/dev/null; exec bash'
