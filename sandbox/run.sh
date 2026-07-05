#!/usr/bin/env bash
# Launch the Kimen unattended-loop sandbox (constitution Art. XI).
#
# Usage: bash sandbox/run.sh [clone-path]
#   clone-path: a DEDICATED local clone on the loop's feature branch
#                  (single writer per feature; a worktree would not work:
#                  its .git file points outside the mount). Default: repo root.
#
# What this guarantees (Art. XI / onmars-spec C5):
#   - disposable container (--rm), no volumes beyond the mounted clone
#   - NO credentials: no ~/.npmrc, no ~/.gitconfig with tokens, no gh auth,
#     no SSH agent, no env secrets except the ONE model API key you provide
#     (ANTHROPIC_API_KEY for Claude Code, OPENAI_API_KEY for Codex; use a
#     dedicated low-privilege key either way)
#   - egress restricted to the allowlist in init-firewall.sh
#
# Permission-bypass execution (claude --dangerously-skip-permissions,
# codex --yolo / --dangerously-bypass-approvals-and-sandbox) is allowed
# ONLY inside this container, because it is credential-free (Art. XI).
set -euo pipefail
cd "$(dirname "$0")/.."

WORKDIR_HOST="${1:-$(pwd)}"
IMAGE=kimen-sandbox

docker build -t "$IMAGE" sandbox/

exec docker run --rm -it \
  --cap-add=NET_ADMIN --cap-add=NET_RAW \
  -v "$WORKDIR_HOST":/workspace \
  -w /workspace \
  ${ANTHROPIC_API_KEY:+-e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY"} \
  ${OPENAI_API_KEY:+-e OPENAI_API_KEY="$OPENAI_API_KEY"} \
  "$IMAGE" \
  bash -lc 'sudo /usr/local/bin/init-firewall.sh && corepack enable pnpm 2>/dev/null; exec bash'
