#!/usr/bin/env bash
# Runs INSIDE the sandbox container: firewall, deps, agent loop, verdict.
# The exit code of this script IS the loop verdict (gates, nothing else).
set -euo pipefail

sudo /usr/local/bin/init-firewall.sh

# No ~/.gitconfig is mounted (credential-free by design): give the loop a
# local, clearly-labeled identity so its commits are attributable to it.
git config user.name "kimen-loop"
git config user.email "loop@kimen.local"

pnpm install --frozen-lockfile || exit 1
pnpm --filter @kimen/elements exec playwright install chromium || exit 1

PROMPT="You are running an UNATTENDED implementation loop under the onmars-spec
contract. Read AGENTS.md and .specify/memory/constitution.md first.

TASK: ${KIMEN_TASK}

Rules (binding):
- If this task implements an approved feature under specs/, run
  'bash scripts/gates/pre-implement-check.sh' first and abort if it fails.
  Mechanical tasks (Art. II escape hatch) are exempt.
- Done means EXACTLY: 'bash scripts/gates/gates-suite.sh' exits 0. Nothing
  else closes the task, including your own assessment.
- Maximum 3 fix iterations. If gates are still red, STOP and print the
  failing gates: a stopped loop is correct behavior, a hung loop is not.
- Commit with a conventional message when green. NEVER push."

# Budget guard (onmars-spec C4): the loop can stop or escalate, never hang.
timeout 3600 codex exec --dangerously-bypass-approvals-and-sandbox "$PROMPT"

# The agent's opinion is not the verdict (Art. III). The gates are:
bash scripts/gates/gates-suite.sh
