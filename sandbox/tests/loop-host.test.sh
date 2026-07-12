#!/usr/bin/env bash
# @spec:018-project-integrity-hardening#S5
# RED contract: host-authoritative finalization and phase ordering. Every test
# uses temporary Git repositories and local process-boundary fakes; there is no
# Docker daemon, network access, model credential or publishing authority.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
FINALIZER="$ROOT/sandbox/finalize-attempt.sh"
LOOP="$ROOT/sandbox/loop.sh"
JOURNAL_TOOL="$ROOT/sandbox/attempt-journal.mjs"
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
  printf '%s\n' "$output" | sed -n '1,160p' >&2
}

new_repo() {
  local repo="$1"

  mkdir -p "$repo"
  git -C "$repo" init --quiet
  git -C "$repo" branch -M main
  git -C "$repo" config user.name fixture
  git -C "$repo" config user.email fixture@kimen.local
  printf '.kimen/attempts/\nreports/\n' > "$repo/.gitignore"
  printf 'baseline\n' > "$repo/baseline.txt"
  git -C "$repo" add .gitignore baseline.txt
  git -C "$repo" commit --quiet -m 'test: baseline'
}

write_progress() {
  local repo="$1"
  local attempt_id="$2"
  local agent_status="$3"
  local agent_rc="$4"
  local revoke_status="$5"
  local revoke_rc="$6"
  local gate_status="$7"
  local gate_rc="$8"
  local base_sha
  local evidence
  base_sha=$(git -C "$repo" rev-parse HEAD)
  evidence="$repo/.kimen/attempts/$attempt_id.json"
  mkdir -p "$(dirname "$evidence")"
  chmod 0700 "$repo/.kimen" "$repo/.kimen/attempts"

  node - "$evidence" "$attempt_id" "$base_sha" "$agent_status" "$agent_rc" \
    "$revoke_status" "$revoke_rc" "$gate_status" "$gate_rc" <<'NODE'
const fs = require('node:fs');
const [path, attemptId, baseSha, agentStatus, rawAgentRc, revokeStatus, rawRevokeRc, gateStatus, rawGateRc] = process.argv.slice(2);
const exitCode = (raw) => raw === 'null' ? null : Number(raw);
const phase = (status, raw) => ({ status, exitCode: exitCode(raw) });
const passed = { status: 'passed', exitCode: 0 };
const evidence = {
  schemaVersion: 1,
  attemptId,
  baseSha,
  taskSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  phases: {
    bootstrapFirewall: passed,
    bootstrapProxy: passed,
    install: passed,
    browser: passed,
    leaseAcquire: passed,
    agentFirewall: passed,
    agentProxy: passed,
    agent: phase(agentStatus, rawAgentRc),
    agentDestroy: passed,
    leaseRevoke: phase(revokeStatus, rawRevokeRc),
    gates: phase(gateStatus, rawGateRc),
    finalize: { status: 'running', exitCode: null },
  },
};
fs.writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
NODE
  local anchor="$(dirname "$repo")/.${repo##*/}.attempt-$attempt_id.anchor"
  if [[ "${repo##*/}" = kimen-loop-* ]]; then
    local journal_root="$(dirname "$repo")/.kimen-loop-journal"
    local journal_dir
    journal_dir=$(node "$JOURNAL_TOOL" init "$journal_root" "$repo" "$attempt_id" "$base_sha" \
      aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)
    node "$JOURNAL_TOOL" update "$journal_root" "$attempt_id" lease-intent \
      "$journal_dir/model-lease.json" "$journal_dir/model-lease.id"
    node "$JOURNAL_TOOL" update "$journal_root" "$attempt_id" lease-acquiring 3600
    node "$JOURNAL_TOOL" update "$journal_root" "$attempt_id" lease-id fixture-lease-id
    node "$JOURNAL_TOOL" update "$journal_root" "$attempt_id" secret-destroyed
    node "$JOURNAL_TOOL" update "$journal_root" "$attempt_id" lease-revoking
    node "$JOURNAL_TOOL" update "$journal_root" "$attempt_id" lease-revoked
  else
    node - "$evidence" "$anchor" <<'NODE'
const fs = require('node:fs');
const [evidencePath, anchorPath] = process.argv.slice(2);
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
fs.writeFileSync(anchorPath, `${JSON.stringify({
  schemaVersion: 1,
  attemptId: evidence.attemptId,
  baseSha: evidence.baseSha,
  taskSha256: evidence.taskSha256,
})}\n`, { mode: 0o600 });
fs.chmodSync(anchorPath, 0o600);
NODE
  fi
}

update_progress() {
  local repo="$1"
  local attempt_id="$2"
  local agent_status="$3"
  local agent_rc="$4"
  local revoke_status="$5"
  local revoke_rc="$6"
  local gate_status="$7"
  local gate_rc="$8"
  local evidence="$repo/.kimen/attempts/$attempt_id.json"

  node - "$evidence" "$agent_status" "$agent_rc" "$revoke_status" "$revoke_rc" \
    "$gate_status" "$gate_rc" <<'NODE'
const fs = require('node:fs');
const [path, agentStatus, rawAgentRc, revokeStatus, rawRevokeRc, gateStatus, rawGateRc] = process.argv.slice(2);
const evidence = JSON.parse(fs.readFileSync(path, 'utf8'));
const exitCode = (raw) => raw === 'null' ? null : Number(raw);
evidence.phases.agent = { status: agentStatus, exitCode: exitCode(rawAgentRc) };
evidence.phases.leaseRevoke = { status: revokeStatus, exitCode: exitCode(rawRevokeRc) };
evidence.phases.gates = { status: gateStatus, exitCode: exitCode(rawGateRc) };
evidence.phases.finalize = { status: 'running', exitCode: null };
fs.writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
NODE
}

set_fixture_journal_lease_state() {
  local repo="$1"
  local attempt_id="$2"
  local lease_state="$3"
  local started_at="$4"
  local not_after="$5"
  local journal_dir
  journal_dir=$(cd "$(dirname "$repo")/.kimen-loop-journal/$attempt_id" && pwd -P)
  node - "$journal_dir/state.json" "$journal_dir" "$lease_state" "$started_at" "$not_after" <<'NODE'
const fs = require('node:fs');
const [target, directory, leaseState, rawStartedAt, rawNotAfter] = process.argv.slice(2);
const state = JSON.parse(fs.readFileSync(target, 'utf8'));
const numberOrNull = (raw) => raw === 'null' ? null : Number(raw);
state.lease = {
  state: leaseState,
  leaseId: null,
  idFile: `${directory}/model-lease.id`,
  secretPath: `${directory}/model-lease.json`,
  secretState: leaseState === 'prepared' ? 'absent' : 'pending',
  acquireStartedAt: numberOrNull(rawStartedAt),
  leaseNotAfter: numberOrNull(rawNotAfter),
};
fs.writeFileSync(target, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
fs.chmodSync(target, 0o600);
for (const name of ['model-lease.id', 'model-lease.json']) {
  try { fs.unlinkSync(`${directory}/${name}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}
NODE
  node - "$repo/.kimen/attempts/$attempt_id.json" <<'NODE'
const fs = require('node:fs');
const target = process.argv[2];
const evidence = JSON.parse(fs.readFileSync(target, 'utf8'));
evidence.phases.leaseAcquire = { status: 'not-run', exitCode: null };
evidence.phases.leaseRevoke = { status: 'not-run', exitCode: null };
evidence.phases.finalize = { status: 'running', exitCode: null };
fs.writeFileSync(target, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
NODE
}

write_early_progress() {
  local repo="$1"
  local attempt_id="$2"
  local evidence
  write_progress "$repo" "$attempt_id" not-run null not-run null not-run null
  evidence="$repo/.kimen/attempts/$attempt_id.json"
  node - "$evidence" <<'NODE'
const fs = require('node:fs');
const path = process.argv[2];
const evidence = JSON.parse(fs.readFileSync(path, 'utf8'));
for (const phase of Object.keys(evidence.phases)) {
  evidence.phases[phase] = { status: 'not-run', exitCode: null };
}
evidence.phases.bootstrapFirewall = { status: 'interrupted', exitCode: 130 };
evidence.phases.finalize = { status: 'running', exitCode: null };
fs.writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
NODE
}

run_finalizer() {
  local repo="$1"
  local attempt_id="$2"
  shift 2
  env "$@" bash "$FINALIZER" --repo "$repo" --attempt-id "$attempt_id"
}

require_finalizer() {
  [ -x "$FINALIZER" ] || fail 'missing sandbox/finalize-attempt.sh RED CLI contract'
}

assert_final_evidence() {
  local repo="$1"
  local attempt_id="$2"
  local base_sha="$3"
  local pre_finalize_sha="$4"
  local expected_gate="$5"
  local expected_overall="$6"
  local expected_agent_status="$7"
  local expected_agent_rc="$8"
  local expected_revoke_status="$9"
  local expected_gate_status="${10}"
  local evidence_path=".kimen/attempts/$attempt_id.json"
  local evidence_sha
  local snapshot_sha
  local snapshot_parent
  local commits
  local evidence_paths

  evidence_sha=$(git -C "$repo" rev-parse "refs/heads/loop/$attempt_id") || return 1
  snapshot_sha=$(git -C "$repo" rev-parse "$evidence_sha^") || return 1
  snapshot_parent=$(git -C "$repo" rev-parse "$snapshot_sha^") || return 1
  commits=$(git -C "$repo" rev-list --count "$pre_finalize_sha..$evidence_sha")

  git -C "$repo" merge-base --is-ancestor "$base_sha" "$pre_finalize_sha" || fail 'pre-finalization HEAD does not descend from the recorded base'
  [ "$snapshot_parent" = "$pre_finalize_sha" ] || fail 'snapshot commit is not immediately after the pre-finalization HEAD'
  [ "$commits" -eq 2 ] || fail "finalization added $commits commits instead of exactly two"
  [ "$snapshot_sha" != "$evidence_sha" ] || fail 'evidence commit points to itself instead of its parent snapshot'

  evidence_paths=$(git -C "$repo" diff-tree --no-commit-id --name-only -r "$evidence_sha")
  [ "$evidence_paths" = "$evidence_path" ] || fail "evidence commit retained paths other than the exact ignored evidence file: [$evidence_paths]"
  git -C "$repo" check-ignore --no-index -q "$evidence_path" || fail 'fixture evidence path is not ignored in ordinary work'
  git -C "$repo" ls-tree -r --name-only "$evidence_sha" | grep -Fxq "$evidence_path" || fail 'exact ignored evidence was not force-added'
  ! git -C "$repo" ls-tree -r --name-only "$evidence_sha" | grep -Eq '^\.kimen/attempts/.*\.(tmp|log)$|^reports/' || fail 'an ignored sibling leaked into the snapshot'
  git -C "$repo" show "$evidence_sha:$evidence_path" | cmp - "$repo/$evidence_path" || fail 'fetchable evidence differs from the committed evidence bytes'

  node - "$repo/$evidence_path" "$attempt_id" "$base_sha" "$snapshot_sha" "$expected_gate" \
    "$expected_overall" "$expected_agent_status" "$expected_agent_rc" \
    "$expected_revoke_status" "$expected_gate_status" <<'NODE'
const fs = require('node:fs');
const [path, attemptId, baseSha, snapshotSha, gateVerdict, verdict, agentStatus, rawAgentRc, revokeStatus, gateStatus] = process.argv.slice(2);
const evidence = JSON.parse(fs.readFileSync(path, 'utf8'));
const expectedAgentRc = rawAgentRc === 'null' ? null : Number(rawAgentRc);
const expectedRevokeRc = revokeStatus === 'passed' ? 0 : revokeStatus === 'failed' ? 89 : null;
const expectedGateRc = gateStatus === 'passed' ? 0 : gateStatus === 'failed' ? 7 : null;
const expected = {
  attemptId,
  baseSha,
  snapshotSha,
  evidenceRef: `loop/${attemptId}`,
  gateVerdict,
  verdict,
  agent: { status: agentStatus, exitCode: expectedAgentRc },
  revoke: { status: revokeStatus, exitCode: expectedRevokeRc },
  gates: { status: gateStatus, exitCode: expectedGateRc },
};
const actual = {
  attemptId: evidence.attemptId,
  baseSha: evidence.baseSha,
  snapshotSha: evidence.snapshotSha,
  evidenceRef: evidence.evidenceRef,
  gateVerdict: evidence.gateVerdict,
  verdict: evidence.verdict,
  agent: evidence.phases.agent,
  revoke: evidence.phases.leaseRevoke,
  gates: evidence.phases.gates,
};
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  console.error('unexpected evidence', JSON.stringify({ expected, actual }, null, 2));
  process.exit(1);
}
if (evidence.phases.finalize.status !== 'passed' || evidence.phases.finalize.exitCode !== 0) {
  console.error('successful finalization was not recorded as passed');
  process.exit(1);
}
NODE
}

test_clean_tree_still_gets_two_commits_and_observable_agent_failure() {
  local tmp
  local repo
  local attempt_id='20260710-010101-clean'
  local start_sha
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  repo="$tmp/repo"
  require_finalizer
  new_repo "$repo"
  start_sha=$(git -C "$repo" rev-parse HEAD)
  write_progress "$repo" "$attempt_id" failed 42 passed 0 passed 0

  set +e
  run_finalizer "$repo" "$attempt_id"
  rc=$?
  set -e

  [ "$rc" -eq 0 ] || fail "agent nonzero plus green gates returned overall $rc instead of green"
  assert_final_evidence "$repo" "$attempt_id" "$start_sha" "$start_sha" green green failed 42 passed passed
  [ -z "$(git -C "$repo" diff-tree --no-commit-id --name-only -r "loop/$attempt_id^")" ] || fail 'clean attempt snapshot is not allow-empty'
}

test_dirty_tree_records_product_then_only_exact_evidence() {
  local tmp
  local repo
  local attempt_id='20260710-010102-dirty'
  local start_sha
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  repo="$tmp/repo"
  require_finalizer
  new_repo "$repo"
  start_sha=$(git -C "$repo" rev-parse HEAD)
  printf 'product change\n' > "$repo/product.txt"
  mkdir -p "$repo/.kimen/attempts" "$repo/reports"
  printf 'must remain ignored\n' > "$repo/.kimen/attempts/not-evidence.tmp"
  printf 'must remain ignored\n' > "$repo/reports/not-evidence.log"
  write_progress "$repo" "$attempt_id" passed 0 passed 0 failed 7
  set +e
  run_finalizer "$repo" "$attempt_id"
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'red gates returned an overall green exit code'
  assert_final_evidence "$repo" "$attempt_id" "$start_sha" "$start_sha" red red passed 0 passed failed
  git -C "$repo" ls-tree -r --name-only "loop/$attempt_id^" | grep -Fxq product.txt || fail 'dirty product change is absent from snapshot commit'
}

test_finalizer_ignores_agent_controlled_git_metadata_and_environment() {
  local tmp
  local repo
  local attempt_id='20260710-010102-host-git'
  local base_sha
  local marker
  local escape
  local hooks
  local outside
  local poison_index
  local global_config
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  repo="$tmp/repo"
  marker="$tmp/host-escape.log"
  escape="$tmp/git-escape"
  hooks="$tmp/hooks"
  outside="$tmp/outside-worktree"
  poison_index="$tmp/poison-index"
  global_config="$tmp/global.gitconfig"
  mkdir -p "$hooks" "$outside"
  require_finalizer
  new_repo "$repo"
  base_sha=$(git -C "$repo" rev-parse HEAD)
  printf 'product change\n' > "$repo/product.txt"
  printf 'outside must not be snapshotted\n' > "$outside/outside.txt"
  write_progress "$repo" "$attempt_id" passed 0 passed 0 passed 0

  cat > "$escape" <<EOF
#!/usr/bin/env bash
printf '%s\n' "\${1:-git-command}" >> '$marker'
exit 91
EOF
  cat > "$hooks/post-commit" <<EOF
#!/usr/bin/env bash
printf 'post-commit\n' >> '$marker'
exit 91
EOF
  cat > "$global_config" <<EOF
[core]
  hooksPath = $hooks
[commit]
  gpgSign = true
[gpg]
  program = $escape
EOF
  chmod +x "$escape" "$hooks/post-commit"
  printf 'product.txt filter=escape\n' > "$repo/.gitattributes"
  git -C "$repo" config core.hooksPath "$hooks"
  git -C "$repo" config core.fsmonitor "$escape fsmonitor"
  git -C "$repo" config filter.escape.clean "$escape filter"
  git -C "$repo" config filter.escape.required true
  git -C "$repo" config commit.gpgSign true
  git -C "$repo" config gpg.program "$escape"
  git -C "$repo" config core.worktree "$outside"
  printf 'host index sentinel\n' > "$poison_index"

  set +e
  run_finalizer "$repo" "$attempt_id" \
    GIT_CONFIG_GLOBAL="$global_config" \
    GIT_INDEX_FILE="$poison_index" \
    GIT_OPTIONAL_LOCKS=1
  rc=$?
  set -e

  [ "$rc" -eq 0 ] || fail "clean host control plane returned $rc for green evidence"
  [ ! -e "$marker" ] || fail 'host finalization executed agent-controlled Git metadata'
  [ "$(cat "$poison_index")" = 'host index sentinel' ] || fail 'host finalization consumed the inherited Git index'
  assert_final_evidence "$repo" "$attempt_id" "$base_sha" "$base_sha" green green passed 0 passed passed
  git -C "$repo" ls-tree -r --name-only "loop/$attempt_id^" | grep -Fxq product.txt || fail 'clean finalizer omitted the product change'
  ! git -C "$repo" ls-tree -r --name-only "loop/$attempt_id^" | grep -Fxq outside.txt || fail 'agent core.worktree escaped the dedicated clone'
  [ ! -e "$repo/.git/config" ] || ! grep -Eq 'escape|fsmonitor|worktree|gpgSign|hooksPath' "$repo/.git/config" || fail 'agent-controlled local Git config survived finalization'
}

test_finalizer_rejects_a_tracked_path_through_a_symlinked_ancestor() {
  local tmp
  local repo
  local outside
  local attempt_id='20260711-010102-ancestor'
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  repo="$tmp/repo"
  outside="$tmp/outside"
  new_repo "$repo"
  mkdir -p "$repo/tracked" "$outside"
  printf 'inside\n' > "$repo/tracked/value.txt"
  git -C "$repo" add tracked/value.txt
  git -C "$repo" commit --quiet -m 'test: tracked directory'
  write_progress "$repo" "$attempt_id" passed 0 passed 0 passed 0
  rm -rf "$repo/tracked"
  printf 'host secret must never be hashed\n' > "$outside/value.txt"
  ln -s "$outside" "$repo/tracked"

  set +e
  run_finalizer "$repo" "$attempt_id"
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'symlinked tracked ancestor was followed by the host finalizer'
  ! git -C "$repo" show-ref --verify --quiet "refs/heads/loop/$attempt_id" || fail 'unsafe ancestor produced an evidence ref'
  [ "$(cat "$outside/value.txt")" = 'host secret must never be hashed' ] || fail 'outside host file changed during rejected finalization'
}

test_finalizer_rejects_a_symlinked_attempt_evidence_ancestor() {
  local tmp
  local repo
  local outside
  local attempt_id='20260711-010102-evidence-ancestor'
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  repo="$tmp/repo"
  outside="$tmp/outside"
  new_repo "$repo"
  write_progress "$repo" "$attempt_id" passed 0 passed 0 passed 0
  mkdir -p "$outside"
  mv "$repo/.kimen/attempts" "$outside/attempts"
  ln -s "$outside/attempts" "$repo/.kimen/attempts"

  set +e
  run_finalizer "$repo" "$attempt_id"
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'symlinked evidence ancestor was accepted'
  ! git -C "$repo" show-ref --verify --quiet "refs/heads/loop/$attempt_id" || fail 'unsafe evidence ancestry produced a ref'
}

make_fail_control_promotion_mv() {
  local bin="$1"
  cat > "$bin/mv" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
case "${1:-}" in
  */control.git) exit 87 ;;
esac
exec /bin/mv "$@"
EOF
  chmod +x "$bin/mv"
}

make_signal_control_promotion_mv() {
  local bin="$1"
  cat > "$bin/mv" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
case "${1:-}" in
  */control.git)
    kill -TERM "$PPID"
    exit 0
    ;;
esac
exec /bin/mv "$@"
EOF
  chmod +x "$bin/mv"
}

make_crash_after_control_promotion_mv() {
  local bin="$1"
  cat > "$bin/mv" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
case "${1:-}" in
  */control.git)
    /bin/mv "$@"
    kill -KILL "$PPID"
    exit 0
    ;;
esac
exec /bin/mv "$@"
EOF
  chmod +x "$bin/mv"
}

make_fail_finalized_proof_fsync() {
  local bin="$1"
  cat > "$bin/fsync-proof" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
case "${1:-}" in
  *.finalized-*) exit 87 ;;
esac
exit 0
EOF
  chmod +x "$bin/fsync-proof"
}

test_failed_control_promotion_restores_the_original_git_directory() {
  local tmp
  local repo
  local bin
  local attempt_id='20260711-010102-promote'
  local base_sha
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  repo="$tmp/repo"
  bin="$tmp/bin"
  mkdir -p "$bin"
  new_repo "$repo"
  base_sha=$(git -C "$repo" rev-parse HEAD)
  write_progress "$repo" "$attempt_id" passed 0 passed 0 passed 0
  make_fail_control_promotion_mv "$bin"

  set +e
  run_finalizer "$repo" "$attempt_id" KIMEN_TRUSTED_MV_BIN="$bin/mv"
  rc=$?
  set -e

  [ "$rc" -eq 87 ] || fail "injected promotion failure returned $rc instead of 87"
  [ -d "$repo/.git" ] && [ ! -L "$repo/.git" ] || fail 'promotion failure lost the original Git directory'
  [ "$(git -C "$repo" rev-parse HEAD)" = "$base_sha" ] || fail 'promotion failure left the clean control plane half-installed'
  ! git -C "$repo" show-ref --verify --quiet "refs/heads/loop/$attempt_id" || fail 'failed promotion exposed an untrusted partial ref'
}

test_failed_finalized_proof_fsync_never_publishes_unproved_ref() {
  local tmp
  local repo
  local bin
  local attempt_id='20260711-010102-proof-fsync'
  local base_sha
  local proof
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  repo="$tmp/repo"
  bin="$tmp/bin"
  mkdir -p "$bin"
  new_repo "$repo"
  base_sha=$(git -C "$repo" rev-parse HEAD)
  write_progress "$repo" "$attempt_id" passed 0 passed 0 passed 0
  make_fail_finalized_proof_fsync "$bin"
  proof="$(dirname "$repo")/.${repo##*/}.finalized-$attempt_id"

  set +e
  run_finalizer "$repo" "$attempt_id" KIMEN_TRUSTED_PROOF_FSYNC_BIN="$bin/fsync-proof"
  rc=$?
  set -e

  [ "$rc" -eq 87 ] || fail "injected proof fsync failure returned $rc instead of 87"
  [ ! -e "$proof" ] || fail 'unfsynced host proof survived failed promotion cleanup'
  [ "$(git -C "$repo" rev-parse HEAD)" = "$base_sha" ] || fail 'proof fsync failure did not restore original Git control state'
  ! git -C "$repo" show-ref --verify --quiet "refs/heads/loop/$attempt_id" || fail 'proof fsync failure exposed an unproved ref'

  run_finalizer "$repo" "$attempt_id"
  [ -f "$proof" ] || fail 'retry did not publish a durable adjacent proof'
}

test_signal_during_control_promotion_restores_and_stops_finalization() {
  local tmp
  local repo
  local bin
  local attempt_id='20260711-010102-promote-signal'
  local base_sha
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  repo="$tmp/repo"
  bin="$tmp/bin"
  mkdir -p "$bin"
  new_repo "$repo"
  base_sha=$(git -C "$repo" rev-parse HEAD)
  write_progress "$repo" "$attempt_id" passed 0 passed 0 passed 0
  make_signal_control_promotion_mv "$bin"

  set +e
  run_finalizer "$repo" "$attempt_id" KIMEN_TRUSTED_MV_BIN="$bin/mv"
  rc=$?
  set -e

  [ "$rc" -eq 130 ] || fail "promotion signal returned $rc instead of 130"
  [ -d "$repo/.git" ] && [ "$(git -C "$repo" rev-parse HEAD)" = "$base_sha" ] || fail 'promotion signal did not restore the original Git directory'
  ! git -C "$repo" show-ref --verify --quiet "refs/heads/loop/$attempt_id" || fail 'signalled promotion continued to publish a ref'
}

test_completed_promotion_recovers_a_marker_after_backup_cleanup() {
  local tmp
  local repo
  local attempt_id='20260711-010102-promote-complete'
  local marker
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  repo="$tmp/repo"
  new_repo "$repo"
  write_progress "$repo" "$attempt_id" passed 0 passed 0 passed 0
  run_finalizer "$repo" "$attempt_id"
  marker="$(dirname "$repo")/.${repo##*/}.promotion-$attempt_id.state"
  printf 'schemaVersion=1\ncontrol=/already/promoted\n' > "$marker"
  chmod 0600 "$marker"

  set +e
  run_finalizer "$repo" "$attempt_id"
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'completed attempt was finalized twice'
  [ ! -e "$marker" ] || fail 'completed promotion left a stale marker requiring manual recovery'
  git -C "$repo" show-ref --verify --quiet "refs/heads/loop/$attempt_id" || fail 'completed promotion lost its verified ref'
}

test_green_verdict_requires_every_containment_phase_to_pass() {
  local tmp
  local repo
  local attempt_id='20260711-010102-phase-table'
  local evidence
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  repo="$tmp/repo"
  new_repo "$repo"
  write_progress "$repo" "$attempt_id" passed 0 passed 0 passed 0
  evidence="$repo/.kimen/attempts/$attempt_id.json"
  node - "$evidence" <<'NODE'
const fs = require('node:fs');
const path = process.argv[2];
const evidence = JSON.parse(fs.readFileSync(path, 'utf8'));
evidence.phases.bootstrapProxy = { status: 'not-run', exitCode: null };
fs.writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
NODE

  set +e
  run_finalizer "$repo" "$attempt_id"
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'green gates overrode a missing containment phase'
  node -e 'const e=require(process.argv[1]); process.exit(e.gateVerdict==="green"&&e.verdict==="red"?0:1)' "$evidence"
}

test_green_verdict_rejects_an_agent_that_never_started() {
  local tmp
  local repo
  local attempt_id='20260711-010102-agent-not-run'
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  repo="$tmp/repo"
  new_repo "$repo"
  write_progress "$repo" "$attempt_id" not-run null passed 0 passed 0

  set +e
  run_finalizer "$repo" "$attempt_id"
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'green gates accepted an agent phase that never started'
}

test_agent_commit_after_initial_evidence_gets_red_descendant_snapshot() {
  local tmp
  local repo
  local attempt_id='20260710-010103-committed'
  local base_sha
  local pre_finalize_sha
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  repo="$tmp/repo"
  require_finalizer
  new_repo "$repo"
  base_sha=$(git -C "$repo" rev-parse HEAD)
  write_progress "$repo" "$attempt_id" running null not-run null not-run null
  printf 'agent committed this\n' > "$repo/agent.txt"
  git -C "$repo" add agent.txt
  git -C "$repo" commit --quiet -m 'feat: agent result'
  pre_finalize_sha=$(git -C "$repo" rev-parse HEAD)
  update_progress "$repo" "$attempt_id" passed 0 passed 0 failed 7

  set +e
  run_finalizer "$repo" "$attempt_id"
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'failed gates after an agent commit returned green'
  assert_final_evidence "$repo" "$attempt_id" "$base_sha" "$pre_finalize_sha" red red passed 0 passed failed
  [ "$(git -C "$repo" rev-list --count "$base_sha..loop/$attempt_id")" -eq 3 ] || fail 'agent plus two finalizer commits were not retained'
  git -C "$repo" ls-tree -r --name-only "loop/$attempt_id^" | grep -Fxq agent.txt || fail 'agent commit is absent from the red snapshot lineage'
  [ -z "$(git -C "$repo" diff-tree --no-commit-id --name-only -r "loop/$attempt_id^")" ] || fail 'already-committed attempt did not receive an allow-empty snapshot commit'
}

test_rewritten_history_is_rejected_before_snapshotting() {
  local tmp
  local repo
  local attempt_id='20260710-010103-rewritten'
  local base_sha
  local unrelated_sha
  local tree_sha
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  repo="$tmp/repo"
  require_finalizer
  new_repo "$repo"
  base_sha=$(git -C "$repo" rev-parse HEAD)
  write_progress "$repo" "$attempt_id" interrupted 137 passed 0 failed 7
  tree_sha=$(git -C "$repo" rev-parse 'HEAD^{tree}')
  unrelated_sha=$(printf 'test: rewritten history\n' | git -C "$repo" commit-tree "$tree_sha")
  git -C "$repo" update-ref HEAD "$unrelated_sha"

  set +e
  run_finalizer "$repo" "$attempt_id"
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'unrelated rewritten history was accepted'
  [ "$(git -C "$repo" rev-parse HEAD)" = "$unrelated_sha" ] || fail 'rejected history was mutated before finalization stopped'
  ! git -C "$repo" show-ref --verify --quiet "refs/heads/loop/$attempt_id" || fail 'rejected history produced an evidence ref'
}

test_failed_revoke_keeps_gates_not_run_and_overall_red() {
  local tmp
  local repo
  local attempt_id='20260710-010104-revoke'
  local start_sha
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  repo="$tmp/repo"
  require_finalizer
  new_repo "$repo"
  start_sha=$(git -C "$repo" rev-parse HEAD)
  write_progress "$repo" "$attempt_id" passed 0 failed 89 not-run null

  set +e
  run_finalizer "$repo" "$attempt_id"
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'failed revocation returned green'
  assert_final_evidence "$repo" "$attempt_id" "$start_sha" "$start_sha" red red passed 0 failed not-run
}

test_early_interruption_is_fetchable_and_red() {
  local tmp
  local repo
  local attempt_id='20260710-010105-early'
  local start_sha
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  repo="$tmp/repo"
  require_finalizer
  new_repo "$repo"
  start_sha=$(git -C "$repo" rev-parse HEAD)
  write_early_progress "$repo" "$attempt_id"

  set +e
  run_finalizer "$repo" "$attempt_id"
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'early interrupted attempt returned green'
  assert_final_evidence "$repo" "$attempt_id" "$start_sha" "$start_sha" red red not-run null not-run not-run
  node -e \
    'const e=require(process.argv[1]); const p=e.phases.bootstrapFirewall; process.exit(p.status==="interrupted"&&p.exitCode===130?0:1)' \
    "$repo/.kimen/attempts/$attempt_id.json"
}

test_container_interruption_remains_evidence_and_gates_stay_authoritative() {
  local tmp
  local repo
  local attempt_id='20260710-010106-container'
  local start_sha
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  repo="$tmp/repo"
  require_finalizer
  new_repo "$repo"
  start_sha=$(git -C "$repo" rev-parse HEAD)
  write_progress "$repo" "$attempt_id" interrupted 137 passed 0 passed 0

  run_finalizer "$repo" "$attempt_id"

  assert_final_evidence "$repo" "$attempt_id" "$start_sha" "$start_sha" green green interrupted 137 passed passed
}

make_fail_second_commit_git() {
  local bin="$1"
  local real_git="$2"
  cat > "$bin/git" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
bin=$(cd "$(dirname "$0")" && pwd)
if [ "${1:-}" = commit-tree ]; then
  count=0
  [ ! -f "$bin/git-commit-count" ] || count=$(cat "$bin/git-commit-count")
  count=$((count + 1))
  printf '%s\n' "$count" > "$bin/git-commit-count"
  if [ "$count" -eq 2 ]; then
    exit 86
  fi
fi
exec "$(cat "$bin/real-git-path")" "$@"
EOF
  chmod +x "$bin/git"
  printf '%s\n' "$real_git" > "$bin/real-git-path"
}

test_finalizer_commit_failure_is_recovered_as_red_evidence() {
  local tmp
  local repo
  local bin
  local attempt_id='20260710-010107-finalizer'
  local start_sha
  local rc
  local evidence
  local snapshot_sha
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  repo="$tmp/repo"
  bin="$tmp/bin"
  mkdir -p "$bin"
  require_finalizer
  new_repo "$repo"
  start_sha=$(git -C "$repo" rev-parse HEAD)
  write_progress "$repo" "$attempt_id" passed 0 passed 0 passed 0
  make_fail_second_commit_git "$bin" "$(command -v git)"

  set +e
  run_finalizer "$repo" "$attempt_id" \
    KIMEN_TRUSTED_GIT_BIN="$bin/git"
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'injected evidence-commit failure returned green'
  evidence="$repo/.kimen/attempts/$attempt_id.json"
  git -C "$repo" rev-parse "refs/heads/loop/$attempt_id" >/dev/null || fail 'finalizer failure left no fetchable evidence ref'
  [ "$(git -C "$repo" rev-list --count "$start_sha..loop/$attempt_id")" -eq 2 ] || fail 'finalizer recovery did not retain exactly snapshot plus evidence commits'
  snapshot_sha=$(git -C "$repo" rev-parse "loop/$attempt_id^")
  git -C "$repo" show "loop/$attempt_id:.kimen/attempts/$attempt_id.json" | cmp - "$evidence" || fail 'recovered finalizer-failure evidence was not committed'
  node - "$evidence" "$snapshot_sha" <<'NODE'
const fs = require('node:fs');
const [path, snapshotSha] = process.argv.slice(2);
const evidence = JSON.parse(fs.readFileSync(path, 'utf8'));
if (evidence.gateVerdict !== 'green' || evidence.verdict !== 'red') process.exit(1);
if (evidence.phases.finalize.status !== 'failed' || evidence.phases.finalize.exitCode !== 86) process.exit(1);
if (evidence.snapshotSha !== snapshotSha || evidence.evidenceRef !== `loop/${evidence.attemptId}`) process.exit(1);
NODE
}

write_host_fakes() {
  local source="$1"
  local bin="$2"
  local fixture_root
  fixture_root=$(dirname "$source")

  cat > "$source/sandbox/model-lease.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
command_name=${1:?}
shift
case "$command_name" in
  acquire)
    [ "${1:-}" = --output ] || exit 64
    secret=${2:?}
    shift 2
    lease_not_after=
    if [ "$#" -gt 0 ]; then
      [ "$#" -eq 2 ] && [ "${1:-}" = --not-after-ms ] || exit 64
      lease_not_after=${2:?}
      [[ "$lease_not_after" =~ ^[0-9]+$ ]] || exit 64
    fi
    if [ "${REQUIRE_LEASE_DEADLINE_TEST:-0}" = 1 ]; then
      [ -n "$lease_not_after" ] || exit 64
      [ "${KIMEN_LEASE_NOT_AFTER_MS:-}" = "$lease_not_after" ] || exit 65
      persisted_not_after=$(node -e \
        'const s=require(process.argv[1]);process.stdout.write(String(s.lease.leaseNotAfter));' \
        "$(dirname "$secret")/state.json")
      [ "$lease_not_after" = "$persisted_not_after" ] || exit 65
      printf '%s\n' "$lease_not_after" > "$KIMEN_HOST_STATE/received-lease-not-after"
    fi
    if [ "${LEASE_HELPER_WAIT_BEFORE_MINT_TEST:-0}" = 1 ]; then
      : > "$KIMEN_HOST_STATE/lease-helper-ready"
      while [ ! -e "$KIMEN_HOST_STATE/release-lease-helper" ]; do sleep 0.05; done
    fi
    if [ -n "${LEASE_HELPER_NOW_MS_TEST:-}" ] &&
      [ -n "$lease_not_after" ] && [ "$LEASE_HELPER_NOW_MS_TEST" -ge "$lease_not_after" ]; then
      : > "$KIMEN_HOST_STATE/lease-deadline-rejected"
      exit 74
    fi
    printf 'lease:acquire\n' >> "$KIMEN_HOST_EVENT_LOG"
    printf '%s\n' "$secret" > "$KIMEN_HOST_STATE/secret-path"
    printf '{"leaseId":"fixture-lease-id","token":"fixture-not-a-real-credential"}\n' > "$secret"
    chmod 600 "$secret"
    if [ "${ACQUIRE_IGNORE_TERM_AND_BLOCK_TEST:-0}" = 1 ]; then
      printf '%s\n' "$$" > "$KIMEN_HOST_STATE/acquire-blocking-pid"
      trap '' TERM
      kill -TERM "$PPID"
      while :; do sleep 1; done
    fi
    if [ "${EMPTY_LEASE_ID_TEST:-0}" -ne 1 ]; then
      printf 'fixture-lease-id\n'
    fi
    ;;
  revoke)
    [ "${1:-}" = --lease-id ] || exit 64
    [ "${2:-}" = fixture-lease-id ] || exit 65
    secret=$(cat "$KIMEN_HOST_STATE/secret-path")
    [ ! -e "$secret" ] || {
      printf 'lease:secret-still-present\n' >> "$KIMEN_HOST_EVENT_LOG"
      exit 96
    }
    printf 'secret:destroyed\nlease:revoke\n' >> "$KIMEN_HOST_EVENT_LOG"
    if [ "${HOST_KILL_DURING_REVOKE_TEST:-0}" = 1 ]; then
      kill -KILL "$PPID"
      exit 137
    fi
    exit "${REVOKE_TEST_RC:-0}"
    ;;
  *) exit 64 ;;
esac
EOF

  cat > "$source/sandbox/finalize-attempt.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
[ "${1:-}" = --repo ] || exit 64
repo=${2:?}
[ "${3:-}" = --attempt-id ] || exit 64
attempt_id=${4:?}
printf 'finalize:%s\n' "$attempt_id" >> "$KIMEN_HOST_EVENT_LOG"
if [ "${5:-}" = --recovery ] && [ -n "${RECOVERY_FINALIZER_TEST_RC+x}" ]; then
  exit "$RECOVERY_FINALIZER_TEST_RC"
fi
if [ "${FINALIZER_TEST_RC:-0}" -ne 0 ]; then
  exit "$FINALIZER_TEST_RC"
fi
set +e
if [ "${HOST_INTERRUPT_DURING_FINALIZER:-0}" = 1 ]; then
  bash "$KIMEN_REAL_FINALIZER" "$@" &
  finalizer_pid=$!
  sleep 0.05
  kill -TERM "$finalizer_pid" 2>/dev/null || true
  wait "$finalizer_pid"
else
  bash "$KIMEN_REAL_FINALIZER" "$@"
fi
rc=$?
set -e
cp "$repo/.kimen/attempts/$attempt_id.json" "$KIMEN_HOST_STATE/final-evidence.json"
exit "$rc"
EOF

  cat > "$source/sandbox/loop-entry.sh" <<'EOF'
#!/usr/bin/env bash
exit 99
EOF

  cat > "$bin/date" <<'EOF'
#!/usr/bin/env bash
printf '%s\n' "${DATE_TEST_VALUE:-20260710-010203}"
EOF

  cat > "$bin/docker" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
command_name=${1:?}
shift
case "$command_name" in
  build)
    previous=''
    for arg in "$@"; do
      if [ "$previous" = --iidfile ]; then
        if [ "${EMPTY_IMAGE_ID_TEST:-0}" -ne 1 ]; then
          printf 'sha256:fixture-image\n' > "$arg"
        fi
      fi
      previous="$arg"
    done
    exit "${DOCKER_BUILD_TEST_RC:-0}"
    ;;
  image)
    [ "${1:-}" = inspect ] || exit 64
    printf 'sha256:fixture-image\n'
    exit "${IMAGE_INSPECT_TEST_RC:-0}"
    ;;
  cp)
    source_path=${1:?}
    destination=${2:?}
    cid=${source_path%%:*}
    [ "${CONTAINER_EVIDENCE_COPY_TEST_RC:-0}" -eq 0 ] || exit "$CONTAINER_EVIDENCE_COPY_TEST_RC"
    cp "$KIMEN_HOST_STATE/$cid-evidence.json" "$destination"
    ;;
  inspect)
    format=
    cid=
    while [ "$#" -gt 0 ]; do
      if [ "$1" = --format ]; then
        format=${2:?}
        shift 2
      else
        cid=$1
        shift
      fi
    done
    [ -n "$cid" ] || exit 64
    [ -e "$KIMEN_HOST_STATE/$cid-phase" ] || exit 1
    phase=$(cat "$KIMEN_HOST_STATE/$cid-phase")
    if [ "$phase" = agent ] && [ "${AGENT_INSPECT_ALWAYS_ERROR_TEST:-0}" = 1 ]; then
      exit 75
    fi
    if [ "$phase" = agent ] && [ "${AGENT_INSPECT_ABSENCE_ERROR_TEST:-0}" = 1 ] &&
      [ -e "$KIMEN_HOST_STATE/$cid-remove-returned" ]; then
      exit 75
    fi
    [ ! -e "$KIMEN_HOST_STATE/$cid-removed" ] || exit 1
    if [ -n "$format" ]; then
      printf '%s\t%s\t%s\n' \
        "$(cat "$KIMEN_HOST_STATE/$cid-label-attempt")" \
        "$(cat "$KIMEN_HOST_STATE/$cid-label-repo")" \
        "$(cat "$KIMEN_HOST_STATE/$cid-label-phase")"
    fi
    ;;
  rm)
    [ "${1:-}" = -f ] || exit 64
    cid=${2:?}
    phase=$(cat "$KIMEN_HOST_STATE/$cid-phase" 2>/dev/null || printf unknown)
    if [ "$phase" = agent ] && [ "${AGENT_DESTROY_TEST_RC:-0}" -ne 0 ]; then
      exit "$AGENT_DESTROY_TEST_RC"
    fi
    if [ "$phase" = agent ] && [ "${AGENT_INSPECT_ABSENCE_ERROR_TEST:-0}" = 1 ]; then
      : > "$KIMEN_HOST_STATE/$cid-remove-returned"
      exit 0
    fi
    : > "$KIMEN_HOST_STATE/$cid-removed"
    printf 'container:%s-destroyed\n' "$phase" >> "$KIMEN_HOST_EVENT_LOG"
    if [ "$phase" = agent ] && [ "${HOST_KILL_AFTER_AGENT_REMOVE_TEST:-0}" = 1 ]; then
      kill -KILL "$PPID"
      exit 137
    fi
    ;;
  ps)
    [ "${1:-}" = -aq ] || exit 64
    shift
    no_trunc=0
    wanted_attempt=
    wanted_repo=
    wanted_phase=
    wanted_id=
    wanted_name=
    while [ "$#" -gt 0 ]; do
      if [ "$1" = --no-trunc ]; then
        no_trunc=1
        shift
        continue
      fi
      [ "$1" = --filter ] || exit 64
      filter=${2:?}
      shift 2
      case "$filter" in
        label=kimen.attempt=*) wanted_attempt=${filter#label=kimen.attempt=} ;;
        label=kimen.repo=*) wanted_repo=${filter#label=kimen.repo=} ;;
        label=kimen.phase=*) wanted_phase=${filter#label=kimen.phase=} ;;
        id=*) wanted_id=${filter#id=} ;;
        name=*)
          wanted_name=${filter#name=}
          wanted_name=${wanted_name#^/}
          wanted_name=${wanted_name%\$}
          ;;
        *) exit 64 ;;
      esac
    done
    pending="$KIMEN_HOST_STATE/late-create-pending"
    if [ -n "$wanted_name" ] && [ -d "$pending" ] &&
      [ "$(cat "$pending/name")" = "$wanted_name" ]; then
      cid=$(cat "$pending/cid")
      cp "$pending/phase" "$KIMEN_HOST_STATE/$cid-phase"
      cp "$pending/label-attempt" "$KIMEN_HOST_STATE/$cid-label-attempt"
      cp "$pending/label-repo" "$KIMEN_HOST_STATE/$cid-label-repo"
      cp "$pending/label-phase" "$KIMEN_HOST_STATE/$cid-label-phase"
      cp "$pending/name" "$KIMEN_HOST_STATE/$cid-name"
      cp "$pending/args" "$KIMEN_HOST_STATE/$cid-args"
      rm -f "$pending/cid" "$pending/phase" "$pending/label-attempt" \
        "$pending/label-repo" "$pending/label-phase" "$pending/name" "$pending/args"
      rmdir "$pending"
      exit 0
    fi
    for phase_file in "$KIMEN_HOST_STATE"/*-phase; do
      [ -e "$phase_file" ] || continue
      case "$phase_file" in *-label-phase) continue ;; esac
      cid=${phase_file#"$KIMEN_HOST_STATE/"}
      cid=${cid%-phase}
      [ ! -e "$KIMEN_HOST_STATE/$cid-removed" ] || continue
      if [ -n "$wanted_id" ]; then
        [ "$cid" = "$wanted_id" ] || continue
        if [ "$no_trunc" -eq 1 ]; then
          printf '%s\n' "$cid"
        else
          printf '%.12s\n' "$cid"
        fi
        continue
      fi
      if [ -n "$wanted_name" ]; then
        [ "$(cat "$KIMEN_HOST_STATE/$cid-name")" = "$wanted_name" ] || continue
        if [ "$no_trunc" -eq 1 ]; then
          printf '%s\n' "$cid"
        else
          printf '%.12s\n' "$cid"
        fi
        continue
      fi
      if [ "$(cat "$KIMEN_HOST_STATE/$cid-phase")" = agent ] &&
        { [ "${HIDE_AGENT_LABEL_QUERY_TEST:-0}" = 1 ] || [ -e "$KIMEN_HOST_STATE/$cid-hide-label-once" ]; }; then
        rm -f "$KIMEN_HOST_STATE/$cid-hide-label-once"
        continue
      fi
      [ "$(cat "$KIMEN_HOST_STATE/$cid-label-attempt")" = "$wanted_attempt" ] || continue
      [ "$(cat "$KIMEN_HOST_STATE/$cid-label-repo")" = "$wanted_repo" ] || continue
      [ "$(cat "$KIMEN_HOST_STATE/$cid-label-phase")" = "$wanted_phase" ] || continue
      if [ "$no_trunc" -eq 1 ]; then
        printf '%s\n' "$cid"
      else
        printf '%.12s\n' "$cid"
      fi
    done
    ;;
  create)
    all=" $* "
    case "$all" in
      *fixture-not-a-real-credential*) exit 95 ;;
    esac
    phase=unknown
    case "$all" in
      *KIMEN_LOOP_PHASE=bootstrap*|*'loop-entry.sh bootstrap'*) phase=bootstrap ;;
      *KIMEN_LOOP_PHASE=agent*|*'loop-entry.sh agent'*) phase=agent ;;
      *KIMEN_LOOP_PHASE=gates*|*'loop-entry.sh gates'*) phase=gates ;;
    esac
    cidfile=
    label_attempt=
    label_repo=
    label_phase=
    container_name=
    previous=
    for arg in "$@"; do
      if [ "$previous" = --cidfile ]; then cidfile=$arg; fi
      if [ "$previous" = --label ]; then
        case "$arg" in
          kimen.attempt=*) label_attempt=${arg#kimen.attempt=} ;;
          kimen.repo=*) label_repo=${arg#kimen.repo=} ;;
          kimen.phase=*) label_phase=${arg#kimen.phase=} ;;
        esac
      fi
      if [ "$previous" = --name ]; then container_name=$arg; fi
      previous=$arg
    done
    [ -n "$cidfile" ] && [ -n "$label_attempt" ] && [ -n "$label_repo" ] || exit 98
    [ "$label_phase" = "$phase" ] || exit 98
    [ -n "$container_name" ] || container_name="fixture-$label_attempt-$phase"
    case "$phase" in
      bootstrap)
        case "$all" in *KIMEN_EGRESS_POLICY=registry-only*) ;; *) exit 91 ;; esac
        case "$all" in *model-lease*) exit 92 ;; esac
        case "$all" in *:/workspace/.kimen/attempts:ro*) ;; *) exit 97 ;; esac
        cid=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
        ;;
      agent)
        case "$all" in *KIMEN_EGRESS_POLICY=agent-allowlist*) ;; *) exit 91 ;; esac
        case "$all" in */run/kimen/model-lease.json*) ;; *) exit 92 ;; esac
        case "$all" in *:/workspace/.kimen/attempts:ro*) ;; *) exit 97 ;; esac
        cid=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
        ;;
      gates)
        case "$all" in *model-lease*) exit 92 ;; esac
        case "$all" in *' --network none '*|*' --network=none '*) ;; *) exit 94 ;; esac
        cid=cccccccccccccccccccccccccccccccc
        ;;
      *) exit 90 ;;
    esac
    if [ "$phase" = agent ] && [ "${HOST_KILL_BEFORE_AGENT_CREATE_COMPLETES_TEST:-0}" = 1 ]; then
      kill -KILL "$PPID"
      exit 137
    fi
    if [ "$phase" = agent ] && [ "${HOST_KILL_DURING_AGENT_CREATE_BEFORE_CID_TEST:-0}" = 1 ]; then
      printf '%s\n' "$phase" > "$KIMEN_HOST_STATE/$cid-phase"
      printf '%s\n' "$label_attempt" > "$KIMEN_HOST_STATE/$cid-label-attempt"
      printf '%s\n' "$label_repo" > "$KIMEN_HOST_STATE/$cid-label-repo"
      printf '%s\n' "$label_phase" > "$KIMEN_HOST_STATE/$cid-label-phase"
      printf '%s\n' "$container_name" > "$KIMEN_HOST_STATE/$cid-name"
      printf '%s\n' "$all" > "$KIMEN_HOST_STATE/$cid-args"
      : > "$KIMEN_HOST_STATE/$cid-hide-label-once"
      kill -KILL "$PPID"
      exit 137
    fi
    if [ "$phase" = agent ] && [ "${AGENT_CREATE_RC125_LATE_TEST:-0}" = 1 ]; then
      pending="$KIMEN_HOST_STATE/late-create-pending"
      mkdir -p "$pending"
      printf '%s\n' "$cid" > "$pending/cid"
      printf '%s\n' "$phase" > "$pending/phase"
      printf '%s\n' "$label_attempt" > "$pending/label-attempt"
      printf '%s\n' "$label_repo" > "$pending/label-repo"
      printf '%s\n' "$label_phase" > "$pending/label-phase"
      printf '%s\n' "$container_name" > "$pending/name"
      printf '%s\n' "$all" > "$pending/args"
      exit 125
    fi
    if [ "$phase" = agent ] && [ "${AGENT_CREATE_RC125_CIDFILE_TEST:-0}" = 1 ]; then
      printf '%s\n' "$cid" > "$cidfile"
      chmod 0600 "$cidfile"
      exit 125
    fi
    printf '%s\n' "$cid" > "$cidfile"
    chmod 0600 "$cidfile"
    printf '%s\n' "$phase" > "$KIMEN_HOST_STATE/$cid-phase"
    printf '%s\n' "$label_attempt" > "$KIMEN_HOST_STATE/$cid-label-attempt"
    printf '%s\n' "$label_repo" > "$KIMEN_HOST_STATE/$cid-label-repo"
    printf '%s\n' "$label_phase" > "$KIMEN_HOST_STATE/$cid-label-phase"
    printf '%s\n' "$container_name" > "$KIMEN_HOST_STATE/$cid-name"
    printf '%s\n' "$all" > "$KIMEN_HOST_STATE/$cid-args"
    rm -f "$KIMEN_HOST_STATE/$cid-removed"
    if [ "$phase" = agent ] && [ "${HOST_KILL_AFTER_AGENT_CREATE_TEST:-0}" = 1 ]; then
      kill -KILL "$PPID"
    fi
    printf '%s\n' "$cid"
    ;;
  start)
    [ "${1:-}" = --attach ] || exit 64
    cid=${2:?}
    [ -e "$KIMEN_HOST_STATE/$cid-phase" ] || exit 1
    [ ! -e "$KIMEN_HOST_STATE/$cid-removed" ] || exit 1
    phase=$(cat "$KIMEN_HOST_STATE/$cid-phase")
    all=$(cat "$KIMEN_HOST_STATE/$cid-args")
    case "$phase" in
      bootstrap)
        mode=${BOOTSTRAP_MILESTONE_MODE:-passed}
        if [ "$mode" != missing ]; then
          case "$mode" in
            passed) firewall_status=passed; firewall_rc=0; proxy_status=passed; proxy_rc=0; child_status=passed; child_rc=0 ;;
            firewall-failed) firewall_status=failed; firewall_rc=71; proxy_status=not-run; proxy_rc=null; child_status=not-run; child_rc=null ;;
            proxy-failed) firewall_status=passed; firewall_rc=0; proxy_status=failed; proxy_rc=72; child_status=not-run; child_rc=null ;;
            *) exit 99 ;;
          esac
          node - "$KIMEN_HOST_STATE/$cid-evidence.json" "$firewall_status" "$firewall_rc" "$proxy_status" "$proxy_rc" "$child_status" "$child_rc" <<'NODE'
const fs = require('node:fs');
const [path, firewallStatus, rawFirewallRc, proxyStatus, rawProxyRc, childStatus, rawChildRc] = process.argv.slice(2);
const value = (status, raw) => ({ status, exitCode: raw === 'null' ? null : Number(raw) });
fs.writeFileSync(path, `${JSON.stringify({
  schemaVersion: 1,
  phase: 'bootstrap',
  milestones: {
    firewall: value(firewallStatus, rawFirewallRc),
    proxy: value(proxyStatus, rawProxyRc),
    childStarted: value(childStatus, rawChildRc),
  },
}, null, 2)}\n`);
NODE
        fi
        printf 'docker:bootstrap\n' >> "$KIMEN_HOST_EVENT_LOG"
        if [ "${BOOTSTRAP_INTERRUPT_TEST:-0}" = 1 ]; then
          kill -TERM "$PPID"
        fi
        exit "${BOOTSTRAP_TEST_RC:-0}"
        ;;
      agent)
        mode=${AGENT_MILESTONE_MODE:-passed}
        if [ "$mode" != missing ]; then
          case "$mode" in
            passed) firewall_status=passed; firewall_rc=0; proxy_status=passed; proxy_rc=0; child_status=passed; child_rc=0 ;;
            firewall-failed) firewall_status=failed; firewall_rc=73; proxy_status=not-run; proxy_rc=null; child_status=not-run; child_rc=null ;;
            proxy-failed) firewall_status=passed; firewall_rc=0; proxy_status=failed; proxy_rc=74; child_status=not-run; child_rc=null ;;
            child-missing) firewall_status=passed; firewall_rc=0; proxy_status=passed; proxy_rc=0; child_status=not-run; child_rc=null ;;
            *) exit 99 ;;
          esac
          node - "$KIMEN_HOST_STATE/$cid-evidence.json" "$firewall_status" "$firewall_rc" "$proxy_status" "$proxy_rc" "$child_status" "$child_rc" <<'NODE'
const fs = require('node:fs');
const [path, firewallStatus, rawFirewallRc, proxyStatus, rawProxyRc, childStatus, rawChildRc] = process.argv.slice(2);
const value = (status, raw) => ({ status, exitCode: raw === 'null' ? null : Number(raw) });
fs.writeFileSync(path, `${JSON.stringify({
  schemaVersion: 1,
  phase: 'agent',
  milestones: {
    firewall: value(firewallStatus, rawFirewallRc),
    proxy: value(proxyStatus, rawProxyRc),
    childStarted: value(childStatus, rawChildRc),
  },
}, null, 2)}\n`);
NODE
        fi
        printf 'docker:agent\n' >> "$KIMEN_HOST_EVENT_LOG"
        if [ "${HOST_KILL_DURING_AGENT_TEST:-0}" = 1 ]; then
          kill -KILL "$PPID"
          exit 137
        fi
        if [ "${AGENT_EXTERNAL_BLOCK_TEST:-0}" = 1 ]; then
          : > "$KIMEN_HOST_STATE/agent-external-blocked"
          while [ ! -e "$KIMEN_HOST_STATE/release-agent" ]; do sleep 0.05; done
        fi
        if [ "${AGENT_IGNORE_TERM_AND_BLOCK_TEST:-0}" = 1 ]; then
          printf '%s\n' "$$" > "$KIMEN_HOST_STATE/agent-blocking-pid"
          trap '' TERM
          kill -TERM "$PPID"
          while :; do sleep 1; done
        fi
        if [ "${HOST_INTERRUPT_TEST:-0}" = 1 ]; then
          kill -TERM "$PPID"
        fi
        exit "${AGENT_TEST_RC:-0}"
        ;;
      gates)
        secret=$(cat "$KIMEN_HOST_STATE/secret-path" 2>/dev/null || true)
        [ -z "$secret" ] || [ ! -e "$secret" ] || exit 96
        printf 'docker:gates\n' >> "$KIMEN_HOST_EVENT_LOG"
        if [ "${HOST_INTERRUPT_DURING_GATES:-0}" = 1 ]; then
          kill -TERM "$PPID"
        fi
        exit "${GATE_TEST_RC:-0}"
        ;;
      *)
        printf 'docker:unknown\n' >> "$KIMEN_HOST_EVENT_LOG"
        exit 90
        ;;
    esac
    ;;
  run)
    exit 64
    ;;
  network)
    exit 0
    ;;
  *) exit 64 ;;
esac
EOF
  cat > "$fixture_root/external-broker-fixture" <<'EOF'
#!/usr/bin/env bash
exit 88
EOF
  chmod +x "$source/sandbox/model-lease.sh" "$source/sandbox/finalize-attempt.sh" \
    "$source/sandbox/loop-entry.sh" "$bin/date" "$bin/docker" \
    "$fixture_root/external-broker-fixture"
}

new_host_fixture() {
  local tmp="$1"
  local source="$tmp/source"
  local bin="$tmp/bin"

  mkdir -p "$source/sandbox" "$bin" "$tmp/state"
  cp "$LOOP" "$source/sandbox/loop.sh"
  cp "$JOURNAL_TOOL" "$source/sandbox/attempt-journal.mjs"
  write_host_fakes "$source" "$bin"
  printf 'FROM scratch\n' > "$source/sandbox/Dockerfile"
  new_repo "$source"
  git -C "$source" add sandbox
  git -C "$source" commit --quiet -m 'test: loop fixture'
}

run_host_loop() {
  local tmp="$1"
  local test_attempt_id=20260710-010203
  local assignment
  shift
  for assignment in "$@"; do
    case "$assignment" in
      DATE_TEST_VALUE=*) test_attempt_id=${assignment#DATE_TEST_VALUE=} ;;
      ATTEMPT_ID_TEST_VALUE=*) test_attempt_id=${assignment#ATTEMPT_ID_TEST_VALUE=} ;;
    esac
  done
  (
    cd "$tmp/source"
    env \
      PATH="$tmp/bin:$PATH" \
      KIMEN_HOST_EVENT_LOG="$tmp/events.log" \
      KIMEN_HOST_STATE="$tmp/state" \
      KIMEN_MODEL_LEASE_HELPER="$tmp/external-broker-fixture" \
      KIMEN_REAL_FINALIZER="$FINALIZER" \
      KIMEN_LOOP_TEST_MODE=1 \
      KIMEN_ATTEMPT_ID_TEST="$test_attempt_id" \
      "$@" \
      bash sandbox/loop.sh main 'S5 host fixture'
  ) > "$tmp/host.log" 2>&1
}

run_host_loop_unseeded() {
  local tmp="$1"
  shift
  (
    cd "$tmp/source"
    env \
      PATH="$tmp/bin:$PATH" \
      KIMEN_HOST_EVENT_LOG="$tmp/events.log" \
      KIMEN_HOST_STATE="$tmp/state" \
      KIMEN_MODEL_LEASE_HELPER="$tmp/external-broker-fixture" \
      KIMEN_REAL_FINALIZER="$FINALIZER" \
      KIMEN_LOOP_TEST_MODE=1 \
      "$@" \
      bash sandbox/loop.sh main 'S5 host fixture'
  ) >> "$tmp/host.log" 2>&1
}

normalized_events() {
  sed -E 's/^finalize:.*/finalize/' "$1"
}

assert_events_are() {
  local path="$1"
  local expected="$2"
  local actual
  actual=$(normalized_events "$path" 2>/dev/null || true)
  [ "$actual" = "$expected" ] || fail "unexpected host order; got [$actual], expected [$expected]"
}

test_host_orders_bootstrap_agent_destroy_revoke_and_fresh_gates() {
  local tmp
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=42 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e

  [ "$rc" -eq 0 ] || {
    sed -n '1,200p' "$tmp/host.log" >&2
    fail "green gates with observable AGENT_RC=42 returned host verdict $rc"
  }
  assert_events_are "$tmp/events.log" $'docker:bootstrap\ncontainer:bootstrap-destroyed\nlease:acquire\ndocker:agent\ncontainer:agent-destroyed\nsecret:destroyed\nlease:revoke\ndocker:gates\ncontainer:gates-destroyed\nfinalize'
}

test_host_clone_has_no_shared_git_objects_or_alternates() {
  local tmp
  local source
  local clone
  local object_sha
  local source_object
  local clone_object
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"
  source="$tmp/source"
  clone="$tmp/kimen-loop-20260710-010203"
  object_sha=$(git -C "$source" rev-parse 'HEAD^{tree}')
  source_object="$source/.git/objects/${object_sha:0:2}/${object_sha:2}"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=71
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'early fixture unexpectedly returned green'
  clone_object="$clone/.git/objects/${object_sha:0:2}/${object_sha:2}"
  [ -f "$source_object" ] || fail 'expected loose source object is absent from the source fixture'
  git -C "$clone" cat-file -e "$object_sha^{tree}" || fail 'dedicated clone cannot resolve the source tree object'
  if [ -e "$clone_object" ]; then
    [ ! "$source_object" -ef "$clone_object" ] || fail 'dedicated clone shares a hardlinked Git object with the source repository'
  fi
  [ ! -e "$clone/.git/objects/info/alternates" ] || fail 'dedicated clone borrows objects through an alternates file'
}

test_real_attempt_ids_are_unique_even_with_the_same_second() {
  local tmp
  local first_rc
  local second_rc
  local clones
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop_unseeded "$tmp" DATE_TEST_VALUE=20260710-010203 DOCKER_BUILD_TEST_RC=71
  first_rc=$?
  run_host_loop_unseeded "$tmp" DATE_TEST_VALUE=20260710-010203 DOCKER_BUILD_TEST_RC=71
  second_rc=$?
  set -e
  [ "$first_rc" -eq 71 ] && [ "$second_rc" -eq 71 ] || fail 'unseeded early attempts did not retain their red rc'
  clones=("$tmp"/kimen-loop-20260710-010203-*)
  [ "${#clones[@]}" -eq 2 ] || fail "same-second attempt IDs produced ${#clones[@]} clones instead of two"
  [ "${clones[0]}" != "${clones[1]}" ] || fail 'same-second attempts reused an identifier'
  for clone in "${clones[@]}"; do
    [[ "${clone##*/}" =~ ^kimen-loop-20260710-010203-[0-9]+-[0-9a-f]{16}$ ]] || fail "non-unique attempt ID format: ${clone##*/}"
  done
}

test_failed_revoke_prevents_authoritative_gates() {
  local tmp
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 REVOKE_TEST_RC=89 GATE_TEST_RC=0
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'revoke failure returned green'
  assert_events_are "$tmp/events.log" $'docker:bootstrap\ncontainer:bootstrap-destroyed\nlease:acquire\ndocker:agent\ncontainer:agent-destroyed\nsecret:destroyed\nlease:revoke'
  ! grep -q '^finalize:' "$tmp/events.log" || fail 'Git finalized while lease revocation was unresolved'
}

test_agent_rc_zero_cannot_forge_missing_proxy_evidence() {
  local tmp
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 \
    AGENT_MILESTONE_MODE=proxy-failed REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'AGENT_RC=0 forged green without a proxy milestone'
  ! grep -q '^docker:gates$' "$tmp/events.log" || fail 'authoritative gates ran after agent containment failed'
  node -e '
    const e=require(process.argv[1]);
    process.exit(e.phases.agentProxy.status==="failed"&&e.phases.agent.status==="not-run"&&e.phases.agentDestroy.status==="passed"?0:1);
  ' "$tmp/state/final-evidence.json"
}

test_agent_container_must_be_destroyed_before_revoke_and_gates() {
  local tmp
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 \
    AGENT_DESTROY_TEST_RC=75 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'an undeleted agent container returned green'
  ! grep -q '^lease:revoke$' "$tmp/events.log" || fail 'lease transition ran before container absence was verified'
  ! grep -q '^docker:gates$' "$tmp/events.log" || fail 'gates ran while the agent container still existed'
  ! grep -q '^finalize:' "$tmp/events.log" || fail 'Git finalized while an agent container still existed'
  node -e 'const s=require(process.argv[1]);process.exit(s.containers.agent.state==="running"?0:1)' \
    "$tmp/.kimen-loop-journal/20260710-010203/state.json"
}

test_label_lookup_uses_full_id_for_normal_agent_destruction() {
  local tmp
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 \
    REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e

  [ "$rc" -eq 0 ] || fail "normal destruction rejected the full container identity: rc=$rc"
  grep -q '^container:agent-destroyed$' "$tmp/events.log" ||
    fail 'normal agent container was not destroyed'
  grep -q '^docker:gates$' "$tmp/events.log" ||
    fail 'gates did not run after normal agent destruction'
}

test_inspect_error_cannot_prove_container_absence_while_ps_still_lists_it() {
  local tmp
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 \
    AGENT_INSPECT_ABSENCE_ERROR_TEST=1 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'inspect error forged container absence while ps still listed it'
  ! grep -q '^lease:revoke$' "$tmp/events.log" || fail 'lease revoked before authoritative container absence proof'
  ! grep -q '^docker:gates$' "$tmp/events.log" || fail 'gates ran while container remained listed'
  ! grep -q '^finalize:' "$tmp/events.log" || fail 'Git finalized while container absence was ambiguous'
}

test_root_milestone_firewall_failure_blocks_before_lease() {
  local tmp
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 BOOTSTRAP_MILESTONE_MODE=firewall-failed
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'root-reported firewall failure returned green'
  ! grep -q '^lease:acquire$' "$tmp/events.log" || fail 'lease was acquired after bootstrap firewall failure'
  node -e '
    const e=require(process.argv[1]);
    process.exit(e.phases.bootstrapFirewall.status==="failed"&&e.phases.bootstrapProxy.status==="not-run"?0:1);
  ' "$tmp/state/final-evidence.json"
}

test_early_host_path_finalizes_without_acquiring_a_lease() {
  local tmp
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=71
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'early bootstrap failure returned green'
  assert_events_are "$tmp/events.log" $'docker:bootstrap\ncontainer:bootstrap-destroyed\nfinalize'
}

test_docker_build_failure_finalizes_red_before_lease() {
  local tmp
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" DOCKER_BUILD_TEST_RC=76
  rc=$?
  set -e

  [ "$rc" -eq 76 ] || fail "Docker build failure returned $rc instead of 76"
  assert_events_are "$tmp/events.log" 'finalize'
  node -e 'const e=require(process.argv[1]);process.exit(e.phases.bootstrapFirewall.status==="failed"&&e.phases.bootstrapFirewall.exitCode===76?0:1)' \
    "$tmp/state/final-evidence.json"
}

test_image_inspect_failure_finalizes_red_before_lease() {
  local tmp
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" IMAGE_INSPECT_TEST_RC=77
  rc=$?
  set -e

  [ "$rc" -eq 77 ] || fail "image inspect failure returned $rc instead of 77"
  assert_events_are "$tmp/events.log" 'finalize'
  node -e 'const e=require(process.argv[1]);process.exit(e.phases.bootstrapFirewall.status==="failed"&&e.phases.bootstrapFirewall.exitCode===77?0:1)' \
    "$tmp/state/final-evidence.json"
}

test_missing_image_id_finalizes_red_before_lease() {
  local tmp
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" EMPTY_IMAGE_ID_TEST=1
  rc=$?
  set -e

  [ "$rc" -eq 70 ] || fail "missing image ID returned $rc instead of 70"
  assert_events_are "$tmp/events.log" 'finalize'
  node -e 'const e=require(process.argv[1]);process.exit(e.phases.bootstrapFirewall.status==="failed"&&e.phases.bootstrapFirewall.exitCode===70?0:1)' \
    "$tmp/state/final-evidence.json"
}

test_bootstrap_signal_is_red_and_never_acquires_a_lease() {
  local tmp
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 BOOTSTRAP_INTERRUPT_TEST=1
  rc=$?
  set -e

  [ "$rc" -eq 130 ] || fail "bootstrap interruption returned $rc instead of 130"
  assert_events_are "$tmp/events.log" $'docker:bootstrap\ncontainer:bootstrap-destroyed\nfinalize'
}

test_empty_lease_id_is_red_and_never_starts_the_agent() {
  local tmp
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 EMPTY_LEASE_ID_TEST=1
  rc=$?
  set -e

  [ "$rc" -eq 70 ] || fail "empty stdout lease ID returned $rc instead of recovered red 70"
  assert_events_are "$tmp/events.log" $'docker:bootstrap\ncontainer:bootstrap-destroyed\nlease:acquire\nsecret:destroyed\nlease:revoke\nfinalize'
}

test_host_signal_runs_cleanup_and_finalizer_but_never_gates() {
  local tmp
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 REVOKE_TEST_RC=0 HOST_INTERRUPT_TEST=1
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'host interruption returned green'
  assert_events_are "$tmp/events.log" $'docker:bootstrap\ncontainer:bootstrap-destroyed\nlease:acquire\ndocker:agent\ncontainer:agent-destroyed\nsecret:destroyed\nlease:revoke\nfinalize'
}

test_blocking_child_that_ignores_term_is_killed_reaped_and_cleaned() {
  local tmp
  local rc
  local child_pid
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_IGNORE_TERM_AND_BLOCK_TEST=1 \
    REVOKE_TEST_RC=0
  rc=$?
  set -e

  [ "$rc" -eq 130 ] || fail "TERM-ignoring child returned $rc instead of 130"
  child_pid=$(cat "$tmp/state/agent-blocking-pid")
  ! kill -0 "$child_pid" 2>/dev/null || fail 'TERM-ignoring Docker child was not killed and reaped'
  assert_events_are "$tmp/events.log" $'docker:bootstrap\ncontainer:bootstrap-destroyed\nlease:acquire\ndocker:agent\ncontainer:agent-destroyed\nsecret:destroyed\nlease:revoke\nfinalize'
  ! grep -q '^docker:gates$' "$tmp/events.log" || fail 'gates began after an interrupted blocking child'
}

test_blocking_acquire_is_killed_and_known_envelope_is_revoked() {
  local tmp
  local rc
  local child_pid
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 ACQUIRE_IGNORE_TERM_AND_BLOCK_TEST=1 \
    REVOKE_TEST_RC=0
  rc=$?
  set -e

  [ "$rc" -eq 130 ] || fail "blocking acquisition returned $rc instead of 130"
  child_pid=$(cat "$tmp/state/acquire-blocking-pid")
  ! kill -0 "$child_pid" 2>/dev/null || fail 'TERM-ignoring acquisition helper was not killed and reaped'
  assert_events_are "$tmp/events.log" $'docker:bootstrap\ncontainer:bootstrap-destroyed\nlease:acquire\nsecret:destroyed\nlease:revoke\nfinalize'
  ! grep -q '^docker:agent$' "$tmp/events.log" || fail 'agent began after acquisition interruption'
}

test_sigkill_during_agent_is_operationally_recovered_before_git_or_bootstrap() {
  local tmp
  local rc
  local agent_destroy_line
  local revoke_line
  local stale_finalize_line
  local next_bootstrap_line
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 HOST_KILL_DURING_AGENT_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'SIGKILL fixture unexpectedly returned green'
  [ -f "$tmp/.kimen-loop.lock/owner.json" ] || fail 'SIGKILL did not leave a durable global lock for adoption'

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010204 BOOTSTRAP_TEST_RC=0 \
    AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e
  [ "$rc" -eq 0 ] || fail "recovery launch returned $rc"
  [ ! -e "$tmp/.kimen-loop.lock" ] || fail 'adopted global lock was not released after completed recovery and attempt'

  agent_destroy_line=$(grep -n '^container:agent-destroyed$' "$tmp/events.log" | head -n 1 | cut -d: -f1)
  revoke_line=$(grep -n '^lease:revoke$' "$tmp/events.log" | head -n 1 | cut -d: -f1)
  stale_finalize_line=$(grep -n '^finalize:20260710-010203$' "$tmp/events.log" | head -n 1 | cut -d: -f1)
  next_bootstrap_line=$(grep -n '^docker:bootstrap$' "$tmp/events.log" | sed -n '2p' | cut -d: -f1)
  [ -n "$agent_destroy_line" ] || fail 'stale agent container was not destroyed during startup recovery'
  [ -n "$revoke_line" ] || fail 'stale model lease was not revoked during startup recovery'
  [ -n "$stale_finalize_line" ] || fail 'stale attempt was not finalized after operational cleanup'
  [ -n "$next_bootstrap_line" ] || fail 'new bootstrap never began after recovery'
  [ "$agent_destroy_line" -lt "$revoke_line" ] || fail 'lease revoke preceded stale container destruction'
  [ "$revoke_line" -lt "$stale_finalize_line" ] || fail 'Git recovery began before stale lease cleanup'
  [ "$stale_finalize_line" -lt "$next_bootstrap_line" ] || fail 'new bootstrap began before stale Git recovery'
}

test_live_global_lock_blocks_second_loop_without_touching_authority() {
  local tmp
  local first_pid
  local first_rc
  local second_rc
  local events_before
  local events_after
  local remaining
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_EXTERNAL_BLOCK_TEST=1 \
    REVOKE_TEST_RC=0 GATE_TEST_RC=0 &
  first_pid=$!
  set -e
  remaining=200
  while [ ! -e "$tmp/state/agent-external-blocked" ] && [ "$remaining" -gt 0 ]; do
    sleep 0.05
    remaining=$((remaining - 1))
  done
  [ -e "$tmp/state/agent-external-blocked" ] || fail 'first loop never reached active agent state'
  events_before=$(wc -l < "$tmp/events.log" | tr -d ' ')

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010204 ATTEMPT_ID_TEST_VALUE=20260710-010204 \
    BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  second_rc=$?
  set -e
  events_after=$(wc -l < "$tmp/events.log" | tr -d ' ')
  : > "$tmp/state/release-agent"
  set +e
  wait "$first_pid"
  first_rc=$?
  set -e

  [ "$second_rc" -eq 75 ] || fail "second live-lock contender returned $second_rc instead of 75"
  [ "$events_after" -eq "$events_before" ] || fail 'second contender touched Docker or lease authority owned by live loop'
  [ "$first_rc" -eq 0 ] || fail "first lock owner failed after release with rc=$first_rc"
}

test_simultaneous_pre_mkdir_claims_have_exactly_one_authority_owner() {
  local tmp
  local first_pid
  local second_pid
  local first_rc
  local second_rc
  local ready_count=0
  local remaining=200
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" ATTEMPT_ID_TEST_VALUE=20260710-010203 LOCK_WAIT_BEFORE_MKDIR_TEST=1 \
    BOOTSTRAP_TEST_RC=0 AGENT_EXTERNAL_BLOCK_TEST=1 REVOKE_TEST_RC=0 GATE_TEST_RC=0 &
  first_pid=$!
  run_host_loop "$tmp" ATTEMPT_ID_TEST_VALUE=20260710-010204 LOCK_WAIT_BEFORE_MKDIR_TEST=1 \
    BOOTSTRAP_TEST_RC=0 AGENT_EXTERNAL_BLOCK_TEST=1 REVOKE_TEST_RC=0 GATE_TEST_RC=0 &
  second_pid=$!
  set -e
  while [ "$remaining" -gt 0 ]; do
    ready_count=$({ compgen -G "$tmp/state/lock-ready.*" || true; } | wc -l | tr -d ' ')
    [ "$ready_count" -eq 2 ] && break
    sleep 0.05
    remaining=$((remaining - 1))
  done
  [ "$ready_count" -eq 2 ] || fail "only $ready_count lock claims reached the synchronized race"
  : > "$tmp/state/release-lock-race"
  remaining=200
  while [ ! -e "$tmp/state/agent-external-blocked" ] && [ "$remaining" -gt 0 ]; do
    sleep 0.05
    remaining=$((remaining - 1))
  done
  [ -e "$tmp/state/agent-external-blocked" ] || fail 'no lock-race winner reached the agent phase'
  : > "$tmp/state/release-agent"
  set +e
  wait "$first_pid"; first_rc=$?
  wait "$second_pid"; second_rc=$?
  set -e

  { [ "$first_rc" -eq 0 ] && [ "$second_rc" -eq 75 ]; } ||
    { [ "$first_rc" -eq 75 ] && [ "$second_rc" -eq 0 ]; } ||
    fail "lock race returned first=$first_rc second=$second_rc instead of one owner/one contender"
  [ "$(grep -c '^docker:bootstrap$' "$tmp/events.log")" -eq 1 ] || fail 'both synchronized contenders touched Docker'
  [ "$(grep -c '^lease:acquire$' "$tmp/events.log")" -eq 1 ] || fail 'both synchronized contenders touched lease authority'
}

test_crash_before_initial_lock_publish_leaves_no_incomplete_fixed_lock() {
  local tmp
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" LOCK_KILL_BEFORE_PUBLISH_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'pre-publish lock crash unexpectedly returned green'
  [ -d "$tmp/.kimen-loop.lock" ] && [ ! -e "$tmp/.kimen-loop.lock/owner.json" ] ||
    fail 'pre-owner crash did not retain an identifiable incomplete fixed lock'
  compgen -G "$tmp/.kimen-loop.lock.claim.*" >/dev/null || fail 'pre-owner crash lost its durable external claim'
  ! grep -q '^docker:' "$tmp/events.log" 2>/dev/null || fail 'pre-publish lock crash reached Docker'

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010204 BOOTSTRAP_TEST_RC=0 \
    AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e
  [ "$rc" -eq 0 ] || fail "successor could not acquire after pre-publish crash: rc=$rc"
  ! compgen -G "$tmp/.kimen-loop.lock.claim.*" >/dev/null || fail 'recovery left a dead external lock claim'
}

test_initial_canonical_temp_owner_crash_is_recovered() {
  local tmp
  local rc
  local temps
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" LOCK_KILL_AFTER_INITIAL_CANONICAL_TEMP_WRITE_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'initial canonical temp-owner crash hook did not terminate the owner'
  [ ! -e "$tmp/.kimen-loop.lock/owner.json" ] ||
    fail 'initial canonical temp-owner crash occurred after owner publication'
  shopt -s nullglob
  temps=("$tmp/.kimen-loop.lock"/.owner.*.tmp)
  shopt -u nullglob
  [ "${#temps[@]}" -eq 1 ] && [ -f "${temps[0]}" ] ||
    fail 'initial canonical temp-owner crash did not retain its partial publication file'
  ! grep -q '^docker:' "$tmp/events.log" 2>/dev/null ||
    fail 'initial canonical temp-owner crash reached Docker'

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010204 BOOTSTRAP_TEST_RC=0 \
    AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e
  [ "$rc" -eq 0 ] || fail "successor could not reclaim initial canonical temp owner: rc=$rc"
  [ ! -e "$tmp/.kimen-loop.lock" ] ||
    fail 'successor left the lock after initial canonical temp-owner recovery'
}

test_live_canonical_temp_owner_blocks_without_touching_authority() {
  local tmp
  local rc
  local lock
  local root_path
  local temporary
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"
  lock="$tmp/.kimen-loop.lock"
  root_path=$(cd "$tmp/source" && pwd -P)
  temporary="$lock/.owner.$$.$(date +%s).tmp"
  mkdir -m 0700 "$lock"
  node - "$temporary" "$$" "$root_path" <<'NODE'
const fs = require('node:fs');
const [path, rawPid, rootPath] = process.argv.slice(2);
fs.writeFileSync(path, `${JSON.stringify({
  schemaVersion: 1,
  pid: Number(rawPid),
  rootPath,
  acquiredAt: Date.now(),
})}\n`, { mode: 0o600 });
NODE

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e
  if [ "$rc" -ne 75 ]; then
    sed -n '1,120p' "$tmp/host.log" >&2
    fail "live canonical temp owner returned $rc instead of 75"
  fi
  [ -f "$temporary" ] || fail 'contender removed a live canonical temp owner'
  ! grep -q '^docker:' "$tmp/events.log" 2>/dev/null ||
    fail 'contender reached Docker while a live canonical temp owner existed'
  ! grep -q '^lease:' "$tmp/events.log" 2>/dev/null ||
    fail 'contender reached lease authority while a live canonical temp owner existed'
}

test_initial_claim_mkdir_crash_is_recovered_from_path_identity() {
  local tmp
  local rc
  local claims
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" LOCK_KILL_AFTER_INITIAL_CLAIM_MKDIR_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'initial-claim mkdir crash hook did not terminate the claimant'
  shopt -s nullglob
  claims=("$tmp"/.kimen-loop.lock.claim.*)
  shopt -u nullglob
  [ "${#claims[@]}" -eq 1 ] || fail 'initial-claim mkdir crash did not leave exactly one durable claim path'
  [ -d "${claims[0]}" ] && [ -z "$(ls -A "${claims[0]}")" ] ||
    fail 'initial-claim mkdir crash did not stop before owner publication'

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010204 BOOTSTRAP_TEST_RC=0 \
    AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e
  [ "$rc" -eq 0 ] || fail "successor could not reclaim empty dead initial claim: rc=$rc"
  ! compgen -G "$tmp/.kimen-loop.lock.claim.*" >/dev/null ||
    fail 'successor left the empty dead initial claim behind'
}

test_initial_claim_temp_owner_crash_is_recovered_from_path_identity() {
  local tmp
  local rc
  local claims
  local temps
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" LOCK_KILL_AFTER_INITIAL_CLAIM_TEMP_WRITE_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'initial-claim temp-owner crash hook did not terminate the claimant'
  shopt -s nullglob
  claims=("$tmp"/.kimen-loop.lock.claim.*)
  shopt -u nullglob
  [ "${#claims[@]}" -eq 1 ] || fail 'initial temp-owner crash did not leave exactly one durable claim path'
  [ ! -e "${claims[0]}/owner.json" ] || fail 'initial temp-owner crash occurred after owner publication'
  shopt -s nullglob
  temps=("${claims[0]}"/.owner.*.tmp)
  shopt -u nullglob
  [ "${#temps[@]}" -eq 1 ] && [ -f "${temps[0]}" ] ||
    fail 'initial temp-owner crash did not retain its partial publication file'

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010204 BOOTSTRAP_TEST_RC=0 \
    AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e
  [ "$rc" -eq 0 ] || fail "successor could not reclaim temp-only dead initial claim: rc=$rc"
  ! compgen -G "$tmp/.kimen-loop.lock.claim.*" >/dev/null ||
    fail 'successor left the temp-only dead initial claim behind'
}

test_live_empty_initial_claim_blocks_a_contender() {
  local tmp
  local rc
  local claim
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"
  claim="$tmp/.kimen-loop.lock.claim.$$.0123456789abcdef"
  mkdir -m 0700 "$claim"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e
  [ "$rc" -eq 75 ] || fail "live empty initial claim returned $rc instead of 75"
  [ -d "$claim" ] || fail 'contender removed a live empty initial claim'
  ! grep -q '^docker:' "$tmp/events.log" 2>/dev/null ||
    fail 'contender reached Docker while a live empty initial claim existed'
}

test_dead_adoption_claim_is_reclaimed_before_recovery() {
  local tmp
  local rc
  local bootstrap_before
  local bootstrap_after_second
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 HOST_KILL_DURING_AGENT_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'owner crash fixture unexpectedly returned green'
  bootstrap_before=$(grep -c '^docker:bootstrap$' "$tmp/events.log")

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010204 LOCK_KILL_AFTER_ADOPTION_CLAIM_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'adopter crash fixture unexpectedly returned green'
  bootstrap_after_second=$(grep -c '^docker:bootstrap$' "$tmp/events.log")
  [ "$bootstrap_after_second" -eq "$bootstrap_before" ] || fail 'crashing adopter reached a new bootstrap'
  [ -f "$tmp/.kimen-loop.lock/adoption/owner.json" ] || fail 'adopter did not leave durable ownership for reclamation'

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010205 BOOTSTRAP_TEST_RC=0 \
    AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e
  [ "$rc" -eq 0 ] || fail "successor could not reclaim dead adoption and recover: rc=$rc"
  [ ! -e "$tmp/.kimen-loop.lock" ] || fail 'reclaimed lock remained after successful recovery'
}

test_adoption_canonical_temp_owner_crash_is_recovered() {
  local tmp
  local rc
  local bootstrap_before
  local temps
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 HOST_KILL_DURING_AGENT_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'adoption canonical temp-owner fixture did not leave a stale lock'
  bootstrap_before=$(grep -c '^docker:bootstrap$' "$tmp/events.log")

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010204 \
    LOCK_KILL_AFTER_ADOPTION_CANONICAL_TEMP_WRITE_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'adoption canonical temp-owner crash hook did not terminate the adopter'
  [ "$(grep -c '^docker:bootstrap$' "$tmp/events.log")" -eq "$bootstrap_before" ] ||
    fail 'adoption canonical temp-owner crash reached a new bootstrap'
  [ -e "$tmp/.kimen-loop.lock/owner.json" ] ||
    fail 'adoption canonical temp-owner crash lost the stale canonical owner'
  shopt -s nullglob
  temps=("$tmp/.kimen-loop.lock"/.owner.*.tmp)
  shopt -u nullglob
  [ "${#temps[@]}" -eq 1 ] && [ -f "${temps[0]}" ] ||
    fail 'adoption canonical temp-owner crash did not retain its partial publication file'

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010205 BOOTSTRAP_TEST_RC=0 \
    AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e
  [ "$rc" -eq 0 ] || fail "successor could not reclaim adoption canonical temp owner: rc=$rc"
  [ ! -e "$tmp/.kimen-loop.lock" ] ||
    fail 'successor left the lock after adoption canonical temp-owner recovery'
}

test_adoption_claim_mkdir_crash_is_recovered_from_path_identity() {
  local tmp
  local rc
  local bootstrap_before
  local claims
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 HOST_KILL_DURING_AGENT_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'adoption mkdir fixture did not leave a stale lock'
  bootstrap_before=$(grep -c '^docker:bootstrap$' "$tmp/events.log")

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010204 LOCK_KILL_AFTER_ADOPTION_CLAIM_MKDIR_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'adoption-claim mkdir crash hook did not terminate the adopter'
  [ "$(grep -c '^docker:bootstrap$' "$tmp/events.log")" -eq "$bootstrap_before" ] ||
    fail 'adoption-claim mkdir crash reached a new bootstrap'
  shopt -s nullglob
  claims=("$tmp/.kimen-loop.lock"/.adoption-claim.*)
  shopt -u nullglob
  [ "${#claims[@]}" -eq 1 ] || fail 'adoption mkdir crash did not leave exactly one durable claim path'
  [ -d "${claims[0]}" ] && [ -z "$(ls -A "${claims[0]}")" ] ||
    fail 'adoption mkdir crash did not stop before owner publication'

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010205 BOOTSTRAP_TEST_RC=0 \
    AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e
  [ "$rc" -eq 0 ] || fail "successor could not reclaim empty dead adoption claim: rc=$rc"
  [ ! -e "$tmp/.kimen-loop.lock" ] || fail 'successor left lock after empty adoption-claim recovery'
}

test_adoption_claim_temp_owner_crash_is_recovered_from_path_identity() {
  local tmp
  local rc
  local bootstrap_before
  local claims
  local temps
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 HOST_KILL_DURING_AGENT_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'adoption temp-owner fixture did not leave a stale lock'
  bootstrap_before=$(grep -c '^docker:bootstrap$' "$tmp/events.log")

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010204 LOCK_KILL_AFTER_ADOPTION_CLAIM_TEMP_WRITE_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'adoption-claim temp-owner crash hook did not terminate the adopter'
  [ "$(grep -c '^docker:bootstrap$' "$tmp/events.log")" -eq "$bootstrap_before" ] ||
    fail 'adoption-claim temp-owner crash reached a new bootstrap'
  shopt -s nullglob
  claims=("$tmp/.kimen-loop.lock"/.adoption-claim.*)
  shopt -u nullglob
  [ "${#claims[@]}" -eq 1 ] || fail 'adoption temp-owner crash did not leave exactly one durable claim path'
  [ ! -e "${claims[0]}/owner.json" ] || fail 'adoption temp-owner crash occurred after owner publication'
  shopt -s nullglob
  temps=("${claims[0]}"/.owner.*.tmp)
  shopt -u nullglob
  [ "${#temps[@]}" -eq 1 ] && [ -f "${temps[0]}" ] ||
    fail 'adoption temp-owner crash did not retain its partial publication file'

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010205 BOOTSTRAP_TEST_RC=0 \
    AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e
  [ "$rc" -eq 0 ] || fail "successor could not reclaim temp-only dead adoption claim: rc=$rc"
  [ ! -e "$tmp/.kimen-loop.lock" ] || fail 'successor left lock after temp-only adoption-claim recovery'
}

test_live_empty_adoption_claim_blocks_a_contender() {
  local tmp
  local rc
  local bootstrap_before
  local claim
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 HOST_KILL_DURING_AGENT_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'live adoption-claim fixture did not leave a stale lock'
  bootstrap_before=$(grep -c '^docker:bootstrap$' "$tmp/events.log")
  claim="$tmp/.kimen-loop.lock/.adoption-claim.$$.fedcba9876543210"
  mkdir -m 0700 "$claim"

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010204 BOOTSTRAP_TEST_RC=0 \
    AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e
  [ "$rc" -eq 75 ] || fail "live empty adoption claim returned $rc instead of 75"
  [ -d "$claim" ] || fail 'contender removed a live empty adoption claim'
  [ "$(grep -c '^docker:bootstrap$' "$tmp/events.log")" -eq "$bootstrap_before" ] ||
    fail 'contender reached a new bootstrap while a live empty adoption claim existed'
}

test_sigkill_after_agent_create_recovers_labeled_container_before_git() {
  local tmp
  local rc
  local destroy_line
  local revoke_line
  local stale_finalize_line
  local finalize_line
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 HOST_KILL_AFTER_AGENT_CREATE_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'post-create SIGKILL unexpectedly returned green'

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010204 BOOTSTRAP_TEST_RC=0 \
    AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e
  [ "$rc" -eq 0 ] || fail "post-create recovery returned $rc"
  destroy_line=$(grep -n '^container:agent-destroyed$' "$tmp/events.log" | head -n1 | cut -d: -f1)
  revoke_line=$(grep -n '^lease:revoke$' "$tmp/events.log" | head -n1 | cut -d: -f1)
  finalize_line=$(grep -n '^finalize:20260710-010203$' "$tmp/events.log" | head -n1 | cut -d: -f1)
  [ -n "$destroy_line" ] && [ "$destroy_line" -lt "$revoke_line" ] || fail 'created agent was not destroyed before revoke'
  [ "$revoke_line" -lt "$finalize_line" ] || fail 'post-create Git recovery preceded operational cleanup'
}

test_create_without_cid_recovers_by_deterministic_name_when_late_container_is_listed() {
  local tmp
  local rc
  local destroy_line
  local revoke_line
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 HOST_KILL_DURING_AGENT_CREATE_BEFORE_CID_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'pre-CID create crash unexpectedly returned green'

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010204 BOOTSTRAP_TEST_RC=0 \
    AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e
  [ "$rc" -eq 0 ] || fail "late named-container recovery returned $rc"
  destroy_line=$(grep -n '^container:agent-destroyed$' "$tmp/events.log" | head -n1 | cut -d: -f1)
  revoke_line=$(grep -n '^lease:revoke$' "$tmp/events.log" | head -n1 | cut -d: -f1)
  stale_finalize_line=$(grep -n '^finalize:20260710-010203$' "$tmp/events.log" | head -n1 | cut -d: -f1)
  [ -n "$destroy_line" ] || fail 'late container with missing CID was not recovered by deterministic name'
  [ "$destroy_line" -lt "$revoke_line" ] || fail 'late named container was not destroyed before revoke'
  [ "$destroy_line" -lt "$stale_finalize_line" ] || fail 'late named container was only destroyed by the next attempt'
}

test_create_without_cid_and_without_named_result_blocks_fail_closed() {
  local tmp
  local rc
  local bootstrap_before
  local bootstrap_after
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 HOST_KILL_BEFORE_AGENT_CREATE_COMPLETES_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'ambiguous create crash unexpectedly returned green'
  bootstrap_before=$(grep -c '^docker:bootstrap$' "$tmp/events.log")

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010204 BOOTSTRAP_TEST_RC=0 \
    AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e
  bootstrap_after=$(grep -c '^docker:bootstrap$' "$tmp/events.log")
  [ "$rc" -ne 0 ] || fail 'ambiguous create outcome allowed another attempt'
  [ "$bootstrap_after" -eq "$bootstrap_before" ] || fail 'new bootstrap ran while create outcome remained ambiguous'
  ! grep -q '^lease:revoke$' "$tmp/events.log" || fail 'lease revoked before ambiguous create outcome was resolved'
  ! grep -q '^finalize:' "$tmp/events.log" || fail 'Git finalized while create outcome remained ambiguous'
}

test_create_rc125_with_late_named_container_stays_ambiguous() {
  local tmp
  local cid_tmp
  local rc
  local bootstrap_count
  tmp=$(mktemp -d)
  cid_tmp=$(mktemp -d)
  trap "rm -rf '$tmp' '$cid_tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_CREATE_RC125_LATE_TEST=1
  rc=$?
  set -e
  bootstrap_count=$(grep -c '^docker:bootstrap$' "$tmp/events.log")

  [ "$rc" -ne 0 ] || fail 'ambiguous rc=125 create unexpectedly returned green'
  [ "$bootstrap_count" -eq 1 ] || fail 'ambiguous rc=125 create launched another attempt'
  [ -e "$tmp/state/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb-phase" ] ||
    fail 'late-create fixture did not materialize after the first empty name query'
  ! grep -q '^container:agent-destroyed$' "$tmp/events.log" ||
    fail 'late container was claimed destroyed without being observed'
  ! grep -q '^lease:revoke$' "$tmp/events.log" ||
    fail 'lease revoked after an ambiguous rc=125 create outcome'
  ! grep -q '^docker:gates$' "$tmp/events.log" ||
    fail 'gates ran after an ambiguous rc=125 create outcome'
  ! grep -q '^finalize:' "$tmp/events.log" ||
    fail 'Git finalized after an ambiguous rc=125 create outcome'
  node -e 'const s=require(process.argv[1]);process.exit(s.containers.agent.state==="creating"?0:1)' \
    "$tmp/.kimen-loop-journal/20260710-010203/state.json" ||
    fail 'generic create failure did not remain durably ambiguous'

  new_host_fixture "$cid_tmp"
  set +e
  run_host_loop "$cid_tmp" BOOTSTRAP_TEST_RC=0 AGENT_CREATE_RC125_CIDFILE_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'rc=125 with only a CID file unexpectedly returned green'
  ! grep -q '^lease:revoke$' "$cid_tmp/events.log" ||
    fail 'CID-file-only create outcome was mistaken for authoritative absence'
  ! grep -q '^finalize:' "$cid_tmp/events.log" ||
    fail 'Git finalized from a point-in-time CID absence while create remained ambiguous'
  node -e 'const s=require(process.argv[1]);process.exit(s.containers.agent.state==="creating"?0:1)' \
    "$cid_tmp/.kimen-loop-journal/20260710-010203/state.json" ||
    fail 'CID-file-only create failure did not remain durably ambiguous'
}

test_known_cid_requires_exact_id_absence_when_labels_hide_and_inspect_fails() {
  local tmp
  local rc
  local bootstrap_before
  local bootstrap_after
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 HOST_KILL_DURING_AGENT_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'known-CID crash unexpectedly returned green'
  bootstrap_before=$(grep -c '^docker:bootstrap$' "$tmp/events.log")

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010204 HIDE_AGENT_LABEL_QUERY_TEST=1 \
    AGENT_INSPECT_ALWAYS_ERROR_TEST=1 BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 \
    REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e
  bootstrap_after=$(grep -c '^docker:bootstrap$' "$tmp/events.log")
  [ "$rc" -ne 0 ] || fail 'inspect error plus hidden labels forged exact CID absence'
  [ "$bootstrap_after" -eq "$bootstrap_before" ] || fail 'new bootstrap ran without exact CID absence proof'
  ! grep -q '^lease:revoke$' "$tmp/events.log" || fail 'lease revoked without exact CID absence proof'
  ! grep -q '^finalize:' "$tmp/events.log" || fail 'Git finalized without exact CID absence proof'
}

test_sigkill_after_remove_is_reconciled_before_revoke_and_git() {
  local tmp
  local rc
  local destroy_line
  local revoke_line
  local finalize_line
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 HOST_KILL_AFTER_AGENT_REMOVE_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'post-remove SIGKILL unexpectedly returned green'

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010204 BOOTSTRAP_TEST_RC=0 \
    AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e
  [ "$rc" -eq 0 ] || fail "post-remove recovery returned $rc"
  destroy_line=$(grep -n '^container:agent-destroyed$' "$tmp/events.log" | head -n1 | cut -d: -f1)
  revoke_line=$(grep -n '^lease:revoke$' "$tmp/events.log" | head -n1 | cut -d: -f1)
  finalize_line=$(grep -n '^finalize:20260710-010203$' "$tmp/events.log" | head -n1 | cut -d: -f1)
  [ "$destroy_line" -lt "$revoke_line" ] || fail 'post-remove state skipped cleanup ordering'
  [ "$revoke_line" -lt "$finalize_line" ] || fail 'post-remove Git recovery preceded revoke'
  node -e 'const s=require(process.argv[1]);process.exit(s.containers.agent.state==="destroyed"?0:1)' \
    "$tmp/.kimen-loop-journal/20260710-010203/state.json"
}

test_sigkill_during_revoke_retries_idempotently_before_git() {
  local tmp
  local rc
  local revoke_count
  local second_revoke_line
  local finalize_line
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 HOST_KILL_DURING_REVOKE_TEST=1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'revoke SIGKILL unexpectedly returned green'

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010204 BOOTSTRAP_TEST_RC=0 \
    AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e
  [ "$rc" -eq 0 ] || fail "revoke recovery returned $rc"
  revoke_count=$(grep -c '^lease:revoke$' "$tmp/events.log")
  [ "$revoke_count" -ge 2 ] || fail 'startup recovery did not retry idempotent revoke'
  second_revoke_line=$(grep -n '^lease:revoke$' "$tmp/events.log" | sed -n '2p' | cut -d: -f1)
  finalize_line=$(grep -n '^finalize:20260710-010203$' "$tmp/events.log" | head -n1 | cut -d: -f1)
  [ "$second_revoke_line" -lt "$finalize_line" ] || fail 'Git recovery preceded confirmed retry revoke'
}

test_prepared_lease_intent_is_cancelled_without_waiting_for_expiry() {
  local tmp
  local stale
  local rc
  local first_event
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"
  stale="$tmp/kimen-loop-prepared"
  new_repo "$stale"
  write_progress "$stale" prepared-attempt interrupted 137 passed 0 not-run null
  set_fixture_journal_lease_state "$stale" prepared-attempt prepared null null

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010204 BOOTSTRAP_TEST_RC=0 \
    AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e

  [ "$rc" -eq 0 ] || fail "prepared lease recovery returned $rc"
  first_event=$(sed -n '1p' "$tmp/events.log")
  [ "$first_event" = 'finalize:prepared-attempt' ] || fail 'prepared lease intent did not recover before bootstrap'
  node -e '
    const state=require(process.argv[1]);
    process.exit(state.lease.state==="cancelled"?0:1);
  ' "$tmp/.kimen-loop-journal/prepared-attempt/state.json"
  node -e '
    const evidence=require(process.argv[1]);
    process.exit(evidence.phases.leaseAcquire.status==="interrupted"&&evidence.verdict==="red"?0:1);
  ' "$stale/.kimen/attempts/prepared-attempt.json"
}

test_unidentified_acquiring_lease_blocks_until_durable_expiry_then_recovers() {
  local tmp
  local stale
  local rc
  local first_event
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"
  stale="$tmp/kimen-loop-unknown-lease"
  new_repo "$stale"
  write_progress "$stale" unknown-lease interrupted 137 passed 0 not-run null
  set_fixture_journal_lease_state "$stale" unknown-lease acquiring 100000 191000

  set +e
  run_host_loop "$tmp" KIMEN_JOURNAL_NOW_MS_TEST=161001
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'unidentified live lease allowed another attempt'
  ! grep -q '^docker:bootstrap$' "$tmp/events.log" 2>/dev/null || fail 'bootstrap ran before unknown lease expiry'
  ! grep -q '^finalize:' "$tmp/events.log" 2>/dev/null || fail 'Git finalized before unknown lease expiry'

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010204 KIMEN_JOURNAL_NOW_MS_TEST=191001 \
    BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e
  [ "$rc" -eq 0 ] || fail "post-expiry recovery returned $rc"
  first_event=$(sed -n '1p' "$tmp/events.log")
  [ "$first_event" = 'finalize:unknown-lease' ] || fail 'expired unknown lease was not resolved before bootstrap'
  node -e '
    const state=require(process.argv[1]);
    process.exit(state.lease.state==="expired"?0:1);
  ' "$tmp/.kimen-loop-journal/unknown-lease/state.json"
  node -e '
    const evidence=require(process.argv[1]);
    process.exit(evidence.phases.leaseAcquire.status==="interrupted"&&evidence.verdict==="red"?0:1);
  ' "$stale/.kimen/attempts/unknown-lease.json"
}

test_lease_not_after_includes_full_synchronous_helper_timeout() {
  local tmp
  local repo
  local base_sha
  local journal_root
  local journal_dir
  local not_after
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  repo="$tmp/kimen-loop-lease-bound"
  journal_root="$tmp/.kimen-loop-journal"
  new_repo "$repo"
  base_sha=$(git -C "$repo" rev-parse HEAD)
  journal_dir=$(node "$JOURNAL_TOOL" init "$journal_root" "$repo" lease-bound "$base_sha" \
    aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)
  node "$JOURNAL_TOOL" update "$journal_root" lease-bound lease-intent \
    "$journal_dir/model-lease.json" "$journal_dir/model-lease.id"
  env KIMEN_LOOP_TEST_MODE=1 KIMEN_JOURNAL_NOW_MS_TEST=100000 \
    node "$JOURNAL_TOOL" update "$journal_root" lease-bound lease-acquiring 1
  not_after=$(node "$JOURNAL_TOOL" get "$journal_root" lease-bound lease.leaseNotAfter)
  [ "$not_after" -eq 191000 ] || fail "lease upper bound $not_after omitted the full 30s helper timeout"
}

test_host_passes_fsynced_lease_deadline_to_helper() {
  local tmp
  local rc
  local persisted_not_after
  local received_not_after
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" REQUIRE_LEASE_DEADLINE_TEST=1 BOOTSTRAP_TEST_RC=0 \
    AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e
  [ "$rc" -eq 0 ] || fail "host did not pass its fsynced lease deadline to helper: rc=$rc"
  persisted_not_after=$(node "$JOURNAL_TOOL" get \
    "$tmp/.kimen-loop-journal" 20260710-010203 lease.leaseNotAfter)
  received_not_after=$(cat "$tmp/state/received-lease-not-after")
  [ "$received_not_after" = "$persisted_not_after" ] ||
    fail 'helper deadline differed from the fsynced lifecycle journal bound'
}

test_pause_after_journal_cannot_mint_past_absolute_deadline() {
  local tmp
  local loop_pid
  local rc
  local remaining=200
  local persisted_not_after
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" KIMEN_JOURNAL_NOW_MS_TEST=100000 KIMEN_AGENT_TIMEOUT_SECONDS=1 \
    REQUIRE_LEASE_DEADLINE_TEST=1 LEASE_HELPER_WAIT_BEFORE_MINT_TEST=1 \
    LEASE_HELPER_NOW_MS_TEST=191000 BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 \
    REVOKE_TEST_RC=0 GATE_TEST_RC=0 &
  loop_pid=$!
  set -e
  while [ ! -e "$tmp/state/lease-helper-ready" ] && [ "$remaining" -gt 0 ]; do
    sleep 0.05
    remaining=$((remaining - 1))
  done
  [ -e "$tmp/state/lease-helper-ready" ] || fail 'helper never reached the pre-mint pause'
  persisted_not_after=$(node "$JOURNAL_TOOL" get \
    "$tmp/.kimen-loop-journal" 20260710-010203 lease.leaseNotAfter)
  [ "$persisted_not_after" -eq 191000 ] ||
    fail "pre-mint pause observed unexpected durable deadline $persisted_not_after"
  : > "$tmp/state/release-lease-helper"
  set +e
  wait "$loop_pid"
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'helper minted after its absolute deadline elapsed'
  [ -e "$tmp/state/lease-deadline-rejected" ] ||
    fail 'helper did not reject the deadline after the pre-mint pause'
  ! grep -q '^lease:acquire$' "$tmp/events.log" ||
    fail 'broker mint was invoked after the absolute deadline'
  [ ! -e "$tmp/state/secret-path" ] || fail 'expired pre-mint pause created a lease secret'
  ! grep -q '^docker:agent$' "$tmp/events.log" || fail 'agent started after expired pre-mint pause'
  ! grep -q '^finalize:' "$tmp/events.log" || fail 'Git finalized while mint outcome remained unidentified'
}

test_journal_clock_override_requires_explicit_test_mode() {
  local tmp
  local repo
  local base_sha
  local journal_root
  local journal_dir
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  repo="$tmp/kimen-loop-clock-guard"
  journal_root="$tmp/.kimen-loop-journal"
  new_repo "$repo"
  base_sha=$(git -C "$repo" rev-parse HEAD)
  journal_dir=$(node "$JOURNAL_TOOL" init "$journal_root" "$repo" clock-guard "$base_sha" \
    aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa)
  node "$JOURNAL_TOOL" update "$journal_root" clock-guard lease-intent \
    "$journal_dir/model-lease.json" "$journal_dir/model-lease.id"
  set +e
  env KIMEN_JOURNAL_NOW_MS_TEST=100000 \
    node "$JOURNAL_TOOL" update "$journal_root" clock-guard lease-acquiring 1
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'journal accepted a clock override outside explicit test mode'
}

test_loop_clock_override_requires_explicit_test_mode() {
  local tmp
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"
  set +e
  (
    cd "$tmp/source"
    env PATH="$tmp/bin:$PATH" \
      KIMEN_HOST_EVENT_LOG="$tmp/events.log" \
      KIMEN_HOST_STATE="$tmp/state" \
      KIMEN_MODEL_LEASE_HELPER="$tmp/external-broker-fixture" \
      KIMEN_REAL_FINALIZER="$FINALIZER" \
      KIMEN_JOURNAL_NOW_MS_TEST=100000 \
      DOCKER_BUILD_TEST_RC=71 \
      bash sandbox/loop.sh main 'S5 host fixture'
  ) > "$tmp/host.log" 2>&1
  rc=$?
  set -e
  [ "$rc" -eq 64 ] || fail "loop clock override outside test mode returned $rc instead of 64"
  ! grep -q '^docker:' "$tmp/events.log" 2>/dev/null || fail 'loop touched Docker before rejecting clock override'
}

test_gate_signal_is_recorded_red_even_when_docker_returns_zero() {
  local tmp
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 REVOKE_TEST_RC=0 \
    GATE_TEST_RC=0 HOST_INTERRUPT_DURING_GATES=1
  rc=$?
  set -e

  [ "$rc" -eq 130 ] || fail "gate interruption returned $rc instead of 130"
  node -e '
    const e=require(process.argv[1]);
    process.exit(e.verdict==="red"&&e.phases.gates.status==="interrupted"&&e.phases.gates.exitCode===130?0:1);
  ' "$tmp/state/final-evidence.json"
}

test_finalizer_signal_exits_red_and_is_recovered_on_next_launch() {
  local tmp
  local stale
  local marker
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"
  stale="$tmp/kimen-loop-20260710-010203"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 REVOKE_TEST_RC=0 \
    GATE_TEST_RC=0 HOST_INTERRUPT_DURING_FINALIZER=1
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'finalizer interruption returned green'
  marker="$(dirname "$stale")/.${stale##*/}.finalized-20260710-010203"
  [ ! -e "$marker" ] || fail 'interrupted finalizer published a final marker'

  set +e
  run_host_loop "$tmp" DATE_TEST_VALUE=20260710-010204 BOOTSTRAP_TEST_RC=0 \
    AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e

  [ "$rc" -eq 0 ] || fail 'next launch did not recover the interrupted finalizer'
  node -e '
    const e=require(process.argv[1]);
    process.exit(e.verdict==="red"&&e.phases.finalize.status==="interrupted"?0:1);
  ' "$stale/.kimen/attempts/20260710-010203.json"
}

test_stale_terminal_attempt_is_recovered_red_before_new_bootstrap() {
  local tmp
  local stale
  local base_sha
  local evidence
  local first_event
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"
  stale="$tmp/kimen-loop-stale"
  new_repo "$stale"
  base_sha=$(git -C "$stale" rev-parse HEAD)
  write_progress "$stale" stale-attempt interrupted 137 passed 0 not-run null
  printf 'agent commit retained by recovery\n' > "$stale/agent.txt"
  git -C "$stale" add agent.txt
  git -C "$stale" commit --quiet -m 'feat: stale agent commit'
  evidence="$stale/.kimen/attempts/stale-attempt.json"
  node - "$evidence" <<'NODE'
const fs = require('node:fs');
const path = process.argv[2];
const evidence = JSON.parse(fs.readFileSync(path, 'utf8'));
evidence.phases.finalize = { status: 'passed', exitCode: 0 };
fs.writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
NODE

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e

  [ "$rc" -eq 0 ] || fail "new attempt returned $rc after stale-recovery scan"
  first_event=$(sed -n '1p' "$tmp/events.log")
  [ "$first_event" = 'finalize:stale-attempt' ] || fail "new bootstrap began before stale recovery: [$first_event]"
  grep -q '^docker:bootstrap$' "$tmp/events.log" || fail 'new attempt never started after stale recovery'
  [ "$(git -C "$stale" rev-list --count "$base_sha..loop/stale-attempt")" -eq 3 ] || fail 'recovery did not retain agent commit plus exactly two finalization commits'
  node - "$evidence" "$base_sha" <<'NODE'
const fs = require('node:fs');
const [path, baseSha] = process.argv.slice(2);
const evidence = JSON.parse(fs.readFileSync(path, 'utf8'));
if (evidence.baseSha !== baseSha || evidence.verdict !== 'red') process.exit(1);
if (evidence.phases.finalize.status !== 'interrupted' || evidence.phases.finalize.exitCode !== 130) process.exit(1);
if (evidence.phases.agent.status !== 'interrupted' || evidence.phases.agent.exitCode !== 137) process.exit(1);
NODE
}

test_corrupt_stale_json_blocks_the_next_attempt() {
  local tmp
  local stale
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"
  stale="$tmp/kimen-loop-corrupt"
  new_repo "$stale"
  mkdir -p "$stale/.kimen/attempts"
  chmod 0700 "$stale/.kimen" "$stale/.kimen/attempts"
  printf '{not-json\n' > "$stale/.kimen/attempts/corrupt-attempt.json"
  chmod 0600 "$stale/.kimen/attempts/corrupt-attempt.json"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'corrupt stale JSON allowed a new attempt'
  ! grep -q '^docker:bootstrap$' "$tmp/events.log" || fail 'new bootstrap ran after corrupt recovery metadata'
}

test_corrupt_lifecycle_journal_blocks_before_any_new_bootstrap() {
  local tmp
  local stale
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"
  stale="$tmp/kimen-loop-corrupt-journal"
  new_repo "$stale"
  write_progress "$stale" corrupt-journal interrupted 137 passed 0 not-run null
  printf '{not-json\n' > "$tmp/.kimen-loop-journal/corrupt-journal/state.json"
  chmod 0600 "$tmp/.kimen-loop-journal/corrupt-journal/state.json"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'corrupt lifecycle journal allowed a new attempt'
  ! grep -q '^docker:bootstrap$' "$tmp/events.log" 2>/dev/null || fail 'bootstrap ran after corrupt lifecycle journal'
  ! grep -q '^finalize:' "$tmp/events.log" 2>/dev/null || fail 'Git recovery trusted corrupt lifecycle journal'
}

test_missing_lifecycle_journal_for_valid_evidence_blocks_fail_closed() {
  local tmp
  local stale
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"
  stale="$tmp/kimen-loop-missing-journal"
  new_repo "$stale"
  write_progress "$stale" missing-journal interrupted 137 passed 0 not-run null
  mv "$tmp/.kimen-loop-journal/missing-journal" "$tmp/orphaned-missing-journal"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'valid evidence without lifecycle journal allowed a new attempt'
  ! grep -q '^docker:bootstrap$' "$tmp/events.log" 2>/dev/null || fail 'bootstrap ran without a lifecycle journal'
  ! grep -q '^finalize:' "$tmp/events.log" 2>/dev/null || fail 'Git recovery ran without a lifecycle journal'
}

test_unrelated_stale_history_blocks_the_next_attempt() {
  local tmp
  local stale
  local tree_sha
  local unrelated_sha
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"
  stale="$tmp/kimen-loop-rewritten"
  new_repo "$stale"
  write_progress "$stale" rewritten-attempt interrupted 137 passed 0 not-run null
  tree_sha=$(git -C "$stale" rev-parse 'HEAD^{tree}')
  unrelated_sha=$(printf 'test: unrelated stale history\n' | git -C "$stale" commit-tree "$tree_sha")
  git -C "$stale" update-ref HEAD "$unrelated_sha"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'unrelated stale history allowed a new attempt'
  ! git -C "$stale" show-ref --verify --quiet refs/heads/loop/rewritten-attempt || fail 'rewritten recovery produced a ref'
  ! grep -q '^docker:bootstrap$' "$tmp/events.log" || fail 'new bootstrap ran after rewritten stale history'
}

test_recovery_finalizer_operational_error_blocks_the_next_attempt() {
  local tmp
  local stale
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"
  stale="$tmp/kimen-loop-finalizer-error"
  new_repo "$stale"
  write_progress "$stale" finalizer-error interrupted 137 passed 0 not-run null

  set +e
  run_host_loop "$tmp" FINALIZER_TEST_RC=88
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'recovery finalizer error allowed a new attempt'
  ! grep -q '^docker:bootstrap$' "$tmp/events.log" || fail 'new bootstrap ran after operational recovery failure'
}

test_recovery_finalizer_zero_is_not_a_valid_red_recovery() {
  local tmp
  local stale
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"
  stale="$tmp/kimen-loop-finalizer-zero"
  new_repo "$stale"
  write_progress "$stale" finalizer-zero interrupted 137 passed 0 not-run null

  set +e
  run_host_loop "$tmp" RECOVERY_FINALIZER_TEST_RC=0
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'recovery rc=0 was accepted instead of requiring red rc=1'
  ! grep -q '^docker:bootstrap$' "$tmp/events.log" 2>/dev/null || fail 'new bootstrap ran after invalid recovery rc=0'
}

test_unverified_existing_attempt_ref_blocks_the_next_attempt() {
  local tmp
  local stale
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"
  stale="$tmp/kimen-loop-existing-ref"
  new_repo "$stale"
  write_progress "$stale" existing-ref interrupted 137 passed 0 not-run null
  git -C "$stale" update-ref refs/heads/loop/existing-ref HEAD

  set +e
  run_host_loop "$tmp"
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'unverified pre-existing attempt ref was accepted'
  ! grep -q '^finalize:existing-ref$' "$tmp/events.log" || fail 'recovery finalizer ran over a pre-existing ref'
  ! grep -q '^docker:bootstrap$' "$tmp/events.log" || fail 'new bootstrap ran after an unverified pre-existing ref'
}

test_valid_existing_ref_without_host_proof_blocks_even_with_internal_marker() {
  local tmp
  local stale
  local marker
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"
  stale="$tmp/kimen-loop-valid-ref"
  new_repo "$stale"
  write_progress "$stale" valid-ref passed 0 passed 0 passed 0
  run_finalizer "$stale" valid-ref
  marker="$(dirname "$stale")/.${stale##*/}.finalized-valid-ref"
  rm -f "$marker"

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'ref without adjacent host proof was accepted'
  [ ! -e "$marker" ] || fail 'missing host proof was recreated from agent-writable Git state'
  ! grep -q '^finalize:valid-ref$' "$tmp/events.log" || fail 'valid existing ref was finalized a second time'
  ! grep -q '^docker:bootstrap$' "$tmp/events.log" || fail 'new bootstrap ran after proofless existing ref'
}

test_post_promotion_crash_restores_then_recovers_before_new_attempt() {
  local tmp
  local stale
  local bin
  local promotion_marker
  local promotion_backup
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"
  stale="$tmp/kimen-loop-promotion-crash"
  bin="$tmp/crash-bin"
  mkdir -p "$bin"
  new_repo "$stale"
  write_progress "$stale" promotion-crash interrupted 137 passed 0 not-run null
  make_crash_after_control_promotion_mv "$bin"

  set +e
  run_finalizer "$stale" promotion-crash KIMEN_TRUSTED_MV_BIN="$bin/mv"
  rc=$?
  set -e
  [ "$rc" -ne 0 ] || fail 'injected post-promotion crash returned green'
  promotion_marker="$(dirname "$stale")/.${stale##*/}.promotion-promotion-crash.state"
  promotion_backup="$(dirname "$stale")/.${stale##*/}.promotion-promotion-crash.agent.git"
  [ -f "$promotion_marker" ] && [ -d "$promotion_backup" ] || fail 'post-promotion crash did not retain restorable host state'
  git -C "$stale" show-ref --verify --quiet refs/heads/loop/promotion-crash || fail 'fixture did not reach the post-ref promotion window'

  set +e
  run_host_loop "$tmp" BOOTSTRAP_TEST_RC=0 AGENT_TEST_RC=0 REVOKE_TEST_RC=0 GATE_TEST_RC=0
  rc=$?
  set -e

  [ "$rc" -eq 0 ] || fail 'post-promotion crash state blocked the next attempt'
  [ ! -e "$promotion_marker" ] && [ ! -e "$promotion_backup" ] || fail 'post-promotion crash state was not cleaned after recovery'
  grep -q '^finalize:promotion-crash$' "$tmp/events.log" || fail 'promotion crash did not re-enter authoritative recovery'
  node -e '
    const e=require(process.argv[1]);
    process.exit(e.verdict==="red"&&e.phases.finalize.status==="interrupted"?0:1);
  ' "$stale/.kimen/attempts/promotion-crash.json"
}

test_symlinked_stale_json_blocks_the_next_attempt() {
  local tmp
  local stale
  local evidence
  local outside
  local rc
  tmp=$(mktemp -d)
  trap "rm -rf '$tmp'" EXIT
  new_host_fixture "$tmp"
  stale="$tmp/kimen-loop-symlink-json"
  outside="$tmp/outside-evidence.json"
  new_repo "$stale"
  write_progress "$stale" symlink-json interrupted 137 passed 0 not-run null
  evidence="$stale/.kimen/attempts/symlink-json.json"
  mv "$evidence" "$outside"
  ln -s "$outside" "$evidence"

  set +e
  run_host_loop "$tmp"
  rc=$?
  set -e

  [ "$rc" -ne 0 ] || fail 'symlinked stale JSON was silently ignored'
  ! grep -q '^docker:bootstrap$' "$tmp/events.log" 2>/dev/null || fail 'new bootstrap ran after symlinked stale JSON'
}

run_test 'S5 clean attempts get allow-empty snapshot plus evidence commits' \
  test_clean_tree_still_gets_two_commits_and_observable_agent_failure
run_test 'S5 dirty attempts snapshot product changes and force-add only exact evidence' \
  test_dirty_tree_records_product_then_only_exact_evidence
run_test 'S5 host finalization ignores agent-controlled Git metadata and inherited Git state' \
  test_finalizer_ignores_agent_controlled_git_metadata_and_environment
run_test 'S5 tracked paths cannot escape through a symlinked ancestor' \
  test_finalizer_rejects_a_tracked_path_through_a_symlinked_ancestor
run_test 'S5 attempt evidence cannot escape through a symlinked ancestor' \
  test_finalizer_rejects_a_symlinked_attempt_evidence_ancestor
run_test 'S5 failed clean-control promotion restores the original Git directory' \
  test_failed_control_promotion_restores_the_original_git_directory
run_test 'S5 failed proof fsync never publishes an unproved ref' \
  test_failed_finalized_proof_fsync_never_publishes_unproved_ref
run_test 'S5 a promotion signal restores Git state and stops finalization' \
  test_signal_during_control_promotion_restores_and_stops_finalization
run_test 'S5 completed promotion state clears a marker left after backup cleanup' \
  test_completed_promotion_recovers_a_marker_after_backup_cleanup
run_test 'S5 green requires every containment and operational phase to pass' \
  test_green_verdict_requires_every_containment_phase_to_pass
run_test 'S5 green rejects an agent phase that never started' \
  test_green_verdict_rejects_an_agent_that_never_started
run_test 'S5 initial evidence retains an agent commit before a red two-commit finalization' \
  test_agent_commit_after_initial_evidence_gets_red_descendant_snapshot
run_test 'S5 rewritten unrelated history is rejected before snapshotting' \
  test_rewritten_history_is_rejected_before_snapshotting
run_test 'S5 failed revocation leaves gates not-run and overall red' \
  test_failed_revoke_keeps_gates_not_run_and_overall_red
run_test 'S5 an early interruption remains fetchable with red evidence' \
  test_early_interruption_is_fetchable_and_red
run_test 'S5 container interruption remains observable while gates own gateVerdict' \
  test_container_interruption_remains_evidence_and_gates_stay_authoritative
run_test 'S5 a finalizer failure is retried into fetchable red evidence' \
  test_finalizer_commit_failure_is_recovered_as_red_evidence
run_test 'S5 host orders registry bootstrap, leased agent, destruction, revoke, fresh gates' \
  test_host_orders_bootstrap_agent_destroy_revoke_and_fresh_gates
run_test 'S5 dedicated clones share neither Git objects nor alternates with the source' \
  test_host_clone_has_no_shared_git_objects_or_alternates
run_test 'S5 real attempt IDs remain unique within the same second' \
  test_real_attempt_ids_are_unique_even_with_the_same_second
run_test 'S5 failed revoke prevents authoritative gates' \
  test_failed_revoke_prevents_authoritative_gates
run_test 'S5 AGENT_RC zero cannot forge missing root-only proxy evidence' \
  test_agent_rc_zero_cannot_forge_missing_proxy_evidence
run_test 'S5 agent container destruction is verified before revoke and gates' \
  test_agent_container_must_be_destroyed_before_revoke_and_gates
run_test 'S5 label lookup uses the full container ID for normal destruction' \
  test_label_lookup_uses_full_id_for_normal_agent_destruction
run_test 'S5 inspect error cannot prove absence while ps still lists container' \
  test_inspect_error_cannot_prove_container_absence_while_ps_still_lists_it
run_test 'S5 a root-only firewall failure blocks before lease acquisition' \
  test_root_milestone_firewall_failure_blocks_before_lease
run_test 'S5 early host failure finalizes without acquiring a lease' \
  test_early_host_path_finalizes_without_acquiring_a_lease
run_test 'S5 Docker build failure finalizes red before lease or agent' \
  test_docker_build_failure_finalizes_red_before_lease
run_test 'S5 image inspection failure finalizes red before lease or agent' \
  test_image_inspect_failure_finalizes_red_before_lease
run_test 'S5 missing image ID finalizes red before lease or agent' \
  test_missing_image_id_finalizes_red_before_lease
run_test 'S5 bootstrap interruption is red and never acquires a lease' \
  test_bootstrap_signal_is_red_and_never_acquires_a_lease
run_test 'S5 empty lease IDs fail closed before the agent phase' \
  test_empty_lease_id_is_red_and_never_starts_the_agent
run_test 'S5 host interruption runs cleanup and finalization without gates' \
  test_host_signal_runs_cleanup_and_finalizer_but_never_gates
run_test 'S5 TERM-ignoring child is killed, reaped, and cleaned before finalization' \
  test_blocking_child_that_ignores_term_is_killed_reaped_and_cleaned
run_test 'S5 TERM-ignoring acquisition is killed and its known lease revoked' \
  test_blocking_acquire_is_killed_and_known_envelope_is_revoked
run_test 'S5 SIGKILL during agent is cleaned before Git recovery or another bootstrap' \
  test_sigkill_during_agent_is_operationally_recovered_before_git_or_bootstrap
run_test 'S5 live global lock blocks a second loop without touching authority' \
  test_live_global_lock_blocks_second_loop_without_touching_authority
run_test 'S5 simultaneous pre-mkdir claims yield one authority owner' \
  test_simultaneous_pre_mkdir_claims_have_exactly_one_authority_owner
run_test 'S5 crash before initial lock publish leaves no incomplete fixed lock' \
  test_crash_before_initial_lock_publish_leaves_no_incomplete_fixed_lock
run_test 'S5 initial canonical temp owner is recovered after a publication crash' \
  test_initial_canonical_temp_owner_crash_is_recovered
run_test 'S5 live canonical temp owner blocks without touching authority' \
  test_live_canonical_temp_owner_blocks_without_touching_authority
run_test 'S5 empty initial claim is reclaimed from its durable path identity' \
  test_initial_claim_mkdir_crash_is_recovered_from_path_identity
run_test 'S5 temp-only initial claim is reclaimed from its durable path identity' \
  test_initial_claim_temp_owner_crash_is_recovered_from_path_identity
run_test 'S5 live empty initial claim blocks a competing loop' \
  test_live_empty_initial_claim_blocks_a_contender
run_test 'S5 dead adoption claim is reclaimed before recovery' \
  test_dead_adoption_claim_is_reclaimed_before_recovery
run_test 'S5 adoption canonical temp owner is recovered after a publication crash' \
  test_adoption_canonical_temp_owner_crash_is_recovered
run_test 'S5 empty adoption claim is reclaimed from its durable path identity' \
  test_adoption_claim_mkdir_crash_is_recovered_from_path_identity
run_test 'S5 temp-only adoption claim is reclaimed from its durable path identity' \
  test_adoption_claim_temp_owner_crash_is_recovered_from_path_identity
run_test 'S5 live empty adoption claim blocks a competing adopter' \
  test_live_empty_adoption_claim_blocks_a_contender
run_test 'S5 SIGKILL after agent create recovers labeled container before Git' \
  test_sigkill_after_agent_create_recovers_labeled_container_before_git
run_test 'S5 pre-CID create crash recovers a late container by deterministic name' \
  test_create_without_cid_recovers_by_deterministic_name_when_late_container_is_listed
run_test 'S5 ambiguous pre-CID create outcome blocks fail closed' \
  test_create_without_cid_and_without_named_result_blocks_fail_closed
run_test 'S5 docker create rc125 stays ambiguous across late-name and CID-file races' \
  test_create_rc125_with_late_named_container_stays_ambiguous
run_test 'S5 known CID needs exact-ID absence when labels hide and inspect fails' \
  test_known_cid_requires_exact_id_absence_when_labels_hide_and_inspect_fails
run_test 'S5 SIGKILL after remove reconciles journal before revoke and Git' \
  test_sigkill_after_remove_is_reconciled_before_revoke_and_git
run_test 'S5 SIGKILL during revoke retries idempotently before Git' \
  test_sigkill_during_revoke_retries_idempotently_before_git
run_test 'S5 prepared lease intent cancels without waiting for expiry' \
  test_prepared_lease_intent_is_cancelled_without_waiting_for_expiry
run_test 'S5 unidentified acquiring lease blocks until durable expiry' \
  test_unidentified_acquiring_lease_blocks_until_durable_expiry_then_recovers
run_test 'S5 lease upper bound includes full synchronous helper timeout' \
  test_lease_not_after_includes_full_synchronous_helper_timeout
run_test 'S5 host passes its fsynced absolute lease deadline to the helper' \
  test_host_passes_fsynced_lease_deadline_to_helper
run_test 'S5 a pre-mint pause cannot outlive the fsynced absolute lease deadline' \
  test_pause_after_journal_cannot_mint_past_absolute_deadline
run_test 'S5 journal clock override requires explicit test mode' \
  test_journal_clock_override_requires_explicit_test_mode
run_test 'S5 loop clock override requires explicit test mode' \
  test_loop_clock_override_requires_explicit_test_mode
run_test 'S5 a signal during gates is recorded red even when Docker returns zero' \
  test_gate_signal_is_recorded_red_even_when_docker_returns_zero
run_test 'S5 a finalizer signal exits red and is recovered on the next launch' \
  test_finalizer_signal_exits_red_and_is_recovered_on_next_launch
run_test 'S5 a terminal stale interruption is recovered red before a new attempt' \
  test_stale_terminal_attempt_is_recovered_red_before_new_bootstrap
run_test 'S5 corrupt stale JSON blocks the next attempt' \
  test_corrupt_stale_json_blocks_the_next_attempt
run_test 'S5 corrupt lifecycle journal blocks before bootstrap or Git' \
  test_corrupt_lifecycle_journal_blocks_before_any_new_bootstrap
run_test 'S5 missing lifecycle journal for valid evidence blocks fail closed' \
  test_missing_lifecycle_journal_for_valid_evidence_blocks_fail_closed
run_test 'S5 unrelated stale history blocks the next attempt' \
  test_unrelated_stale_history_blocks_the_next_attempt
run_test 'S5 operational recovery failure blocks the next attempt' \
  test_recovery_finalizer_operational_error_blocks_the_next_attempt
run_test 'S5 recovery accepts rc=1 only, never rc=0' \
  test_recovery_finalizer_zero_is_not_a_valid_red_recovery
run_test 'S5 an unverified existing attempt ref blocks the next attempt' \
  test_unverified_existing_attempt_ref_blocks_the_next_attempt
run_test 'S5 a valid ref without adjacent host proof blocks fail closed' \
  test_valid_existing_ref_without_host_proof_blocks_even_with_internal_marker
run_test 'S5 a post-promotion crash restores and recovers before a new attempt' \
  test_post_promotion_crash_restores_then_recovers_before_new_attempt
run_test 'S5 a symlinked stale JSON entry blocks the next attempt' \
  test_symlinked_stale_json_blocks_the_next_attempt

echo "loop-host S5 contracts: $PASS_COUNT passed, $FAIL_COUNT RED"
[ "$FAIL_COUNT" -eq 0 ]
