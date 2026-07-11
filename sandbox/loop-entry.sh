#!/usr/bin/env bash
# @spec:018-project-integrity-hardening#S5
# One invocation executes exactly one container phase. Host orchestration owns
# secret destruction, revocation and the transition to fresh networkless gates.
set -euo pipefail

PHASE=${1:-${KIMEN_LOOP_PHASE:-}}

usage() {
  echo 'usage: loop-entry.sh <bootstrap|agent|gates>' >&2
  exit 64
}

assert_secretless() {
  local name
  for name in KIMEN_MODEL_LEASE_FILE OPENAI_API_KEY ANTHROPIC_API_KEY \
    ANTHROPIC_AUTH_TOKEN NODE_AUTH_TOKEN NPM_TOKEN; do
    if [ -n "${!name:-}" ]; then
      echo "loop-entry: $PHASE phase refuses secret environment" >&2
      exit 97
    fi
  done
}

configure_git_identity() {
  git config user.name 'kimen-loop'
  git config user.email 'loop@kimen.local'
}

run_bootstrap() {
  assert_secretless
  if [ "${KIMEN_FIREWALL_READY:-0}" != 1 ]; then
    sudo /usr/local/bin/init-firewall.sh
  fi
  pnpm install --frozen-lockfile
  pnpm --filter @kimen/elements exec playwright install chromium
}

run_agent() {
  local lease_file=${KIMEN_MODEL_LEASE_FILE:-}
  [ -n "$lease_file" ] && [ -f "$lease_file" ] && [ -r "$lease_file" ] || {
    echo 'loop-entry: agent phase requires one readable model lease' >&2
    return 98
  }
  [ -z "${NODE_AUTH_TOKEN:-}${NPM_TOKEN:-}" ] || {
    echo 'loop-entry: agent phase refuses registry credentials' >&2
    return 97
  }
  configure_git_identity

  # A conforming host has already verified this envelope. Export only the
  # short-lived gateway token inside this disposable agent process when the
  # mounted fixture is a real JSON envelope; never print it.
  if command -v jq >/dev/null 2>&1 && jq -e '.tokenFormat == "jwt"' "$lease_file" >/dev/null 2>&1; then
    provider=$(jq -r '.provider' "$lease_file")
    endpoint=$(jq -r '.endpoint' "$lease_file")
    token=$(jq -r '.token' "$lease_file")
    case "$provider" in
      openai)
        export OPENAI_BASE_URL=$endpoint
        export OPENAI_API_KEY=$token
        ;;
      anthropic)
        export ANTHROPIC_BASE_URL=$endpoint
        export ANTHROPIC_AUTH_TOKEN=$token
        ;;
      *)
        echo 'loop-entry: unsupported lease provider' >&2
        return 98
        ;;
    esac
    unset token
  fi

  prompt="You are running an UNATTENDED implementation loop under the Kimen contract.
Read AGENTS.md and .specify/memory/constitution.md first.

TASK: ${KIMEN_TASK:?KIMEN_TASK is required}

Run the approved implementation tasks only. Maximum 3 fix iterations. Never
push or publish. The fresh host-managed gate container is the only verdict."

  set +e
  timeout "${KIMEN_AGENT_TIMEOUT_SECONDS:-3600}" codex exec \
    --dangerously-bypass-approvals-and-sandbox "$prompt"
  agent_rc=$?
  set -e
  return "$agent_rc"
}

run_gates() {
  assert_secretless
  set +e
  bash scripts/gates/gates-suite.sh
  gate_rc=$?
  set -e
  return "$gate_rc"
}

case "$PHASE" in
  bootstrap) run_bootstrap ;;
  agent) run_agent ;;
  gates) run_gates ;;
  *) usage ;;
esac
