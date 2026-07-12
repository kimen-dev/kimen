#!/usr/bin/env bash
# @spec:018-project-integrity-hardening#S5
# RED contract: each container runs exactly one unattended-loop phase. The host
# is responsible for destroying the leased agent container and secret before it
# can start the fresh, networkless gate phase.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
ENTRY="$ROOT/sandbox/loop-entry.sh"
PASS_COUNT=0
FAIL_COUNT=0

fail() {
  echo "FAIL: $*" >&2
  return 1
}

run_test() {
  local name="$1"
  shift
  local output
  local rc

  set +e
  output=$(
    (
      set -euo pipefail
      "$@"
    ) 2>&1
  )
  rc=$?
  set -e

  if [ "$rc" -eq 0 ]; then
    PASS_COUNT=$((PASS_COUNT + 1))
    echo "ok - $name"
    return
  fi

  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo "not ok - $name"
  printf '%s\n' "$output" | sed -n '1,120p' >&2
}

new_fixture() {
  local tmp="$1"

  mkdir -p "$tmp/bin" "$tmp/scripts/gates"
  git -C "$tmp" init --quiet
  git -C "$tmp" config user.name fixture
  git -C "$tmp" config user.email fixture@kimen.local
  printf 'baseline\n' > "$tmp/baseline.txt"
  git -C "$tmp" add baseline.txt
  git -C "$tmp" commit --quiet -m 'test: baseline'

  cat > "$tmp/bin/sudo" <<'EOF'
#!/usr/bin/env bash
printf 'bootstrap:firewall\n' >> "$KIMEN_PHASE_LOG"
exit 0
EOF
  cat > "$tmp/bin/pnpm" <<'EOF'
#!/usr/bin/env bash
printf 'bootstrap:pnpm:%s\n' "$*" >> "$KIMEN_PHASE_LOG"
exit 0
EOF
  cat > "$tmp/bin/timeout" <<'EOF'
#!/usr/bin/env bash
lease=${KIMEN_MODEL_LEASE_FILE:-absent}
printf 'agent:lease=%s\n' "$lease" >> "$KIMEN_PHASE_LOG"
if [ "$lease" = absent ] || [ ! -r "$lease" ]; then
  exit 98
fi
exit "${AGENT_TEST_RC:?}"
EOF
  cat > "$tmp/scripts/gates/gates-suite.sh" <<'EOF'
#!/usr/bin/env bash
if [ -n "${KIMEN_MODEL_LEASE_FILE:-}" ] ||
  [ -n "${OPENAI_API_KEY:-}" ] ||
  [ -n "${ANTHROPIC_API_KEY:-}" ] ||
  [ -n "${NODE_AUTH_TOKEN:-}" ] ||
  [ -n "${NPM_TOKEN:-}" ]; then
  printf 'gates:secret-present\n' >> "$KIMEN_PHASE_LOG"
  exit 97
fi
printf 'gates:secretless\n' >> "$KIMEN_PHASE_LOG"
exit "${GATE_TEST_RC:?}"
EOF
  chmod +x "$tmp/bin/sudo" "$tmp/bin/pnpm" "$tmp/bin/timeout" \
    "$tmp/scripts/gates/gates-suite.sh"
}

invoke_phase() {
  local tmp="$1"
  local phase="$2"
  local agent_rc="$3"
  local gate_rc="$4"
  shift 4

  (
    cd "$tmp"
    env \
      PATH="$tmp/bin:$PATH" \
      KIMEN_TASK='exercise split loop phases' \
      KIMEN_PHASE_LOG="$tmp/phases.log" \
      AGENT_TEST_RC="$agent_rc" \
      GATE_TEST_RC="$gate_rc" \
      "$@" \
      bash "$ENTRY" "$phase"
  ) > "$tmp/$phase.log" 2>&1
}

assert_log_is() {
  local path="$1"
  local expected="$2"
  local actual
  actual=$(cat "$path" 2>/dev/null || true)
  [ "$actual" = "$expected" ] || fail "unexpected phase log; got [$actual], expected [$expected]"
}

test_bootstrap_is_registry_only_and_has_no_lease() {
  local tmp
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_fixture "$tmp"

  invoke_phase "$tmp" bootstrap 0 0

  assert_log_is "$tmp/phases.log" $'bootstrap:firewall\nbootstrap:pnpm:install --frozen-lockfile\nbootstrap:pnpm:--filter @kimen/elements exec playwright install chromium'
}

test_agent_is_the_only_phase_that_receives_the_lease() {
  local tmp
  local secret
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_fixture "$tmp"
  secret="$tmp/model-lease.json"
  printf 'fixture-not-a-real-credential\n' > "$secret"
  chmod 600 "$secret"

  set +e
  invoke_phase "$tmp" agent 42 0 KIMEN_MODEL_LEASE_FILE="$secret"
  rc=$?
  set -e

  [ "$rc" -eq 42 ] || fail "agent phase returned $rc instead of preserving AGENT_RC=42"
  assert_log_is "$tmp/phases.log" "agent:lease=$secret"
}

test_gates_are_fresh_and_secretless() {
  local tmp
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_fixture "$tmp"

  set +e
  invoke_phase "$tmp" gates 0 7
  rc=$?
  set -e

  [ "$rc" -eq 7 ] || fail "gate phase returned $rc instead of preserving GATE_RC=7"
  assert_log_is "$tmp/phases.log" 'gates:secretless'
}

test_gates_fail_closed_if_a_lease_is_mounted() {
  local tmp
  local secret
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_fixture "$tmp"
  secret="$tmp/model-lease.json"
  printf 'fixture-not-a-real-credential\n' > "$secret"
  chmod 600 "$secret"

  set +e
  invoke_phase "$tmp" gates 0 0 KIMEN_MODEL_LEASE_FILE="$secret"
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'gate phase accepted a mounted model lease'
  if [ -f "$tmp/phases.log" ]; then
    ! grep -q '^gates:secretless$' "$tmp/phases.log" || fail 'secret-bearing gates were treated as authoritative'
  fi
}

test_agent_and_gate_exit_codes_remain_independent() {
  local gate_rc="$1"
  local expected_gate_rc="$2"
  local tmp
  local secret
  local agent_actual
  local gate_actual
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_fixture "$tmp"
  secret="$tmp/model-lease.json"
  printf 'fixture-not-a-real-credential\n' > "$secret"
  chmod 600 "$secret"

  set +e
  invoke_phase "$tmp" agent 42 "$gate_rc" KIMEN_MODEL_LEASE_FILE="$secret"
  agent_actual=$?
  set -e
  rm -f "$secret"
  set +e
  invoke_phase "$tmp" gates 42 "$gate_rc"
  gate_actual=$?
  set -e

  [ "$agent_actual" -eq 42 ] || fail "AGENT_RC changed from 42 to $agent_actual"
  [ "$gate_actual" -eq "$expected_gate_rc" ] || fail "GATE_RC changed from $expected_gate_rc to $gate_actual"
  assert_log_is "$tmp/phases.log" $'agent:lease='"$tmp/model-lease.json"$'\ngates:secretless'
}

run_test 'S5 bootstrap runs registry/build setup only and receives no lease' \
  test_bootstrap_is_registry_only_and_has_no_lease
run_test 'S5 only the isolated agent phase receives its short-lived lease' \
  test_agent_is_the_only_phase_that_receives_the_lease
run_test 'S5 the fresh secretless gate phase preserves a red GATE_RC' \
  test_gates_are_fresh_and_secretless
run_test 'S5 gates fail closed instead of accepting a mounted lease' \
  test_gates_fail_closed_if_a_lease_is_mounted
run_test 'S5 AGENT_RC=42 remains observable when GATE_RC=7 is red' \
  test_agent_and_gate_exit_codes_remain_independent 7 7
run_test 'S5 AGENT_RC=42 remains observable when GATE_RC=0 is green' \
  test_agent_and_gate_exit_codes_remain_independent 0 0

echo "loop-entry S5 contracts: $PASS_COUNT passed, $FAIL_COUNT RED"
[ "$FAIL_COUNT" -eq 0 ]
