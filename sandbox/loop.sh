#!/usr/bin/env bash
# @spec:018-project-integrity-hardening#S5
# Host-authoritative unattended attempt orchestration.
set -euo pipefail
umask 077

ROOT=$(cd "$(dirname "$0")/.." && pwd -P)
PARENT=$(dirname "$ROOT")
BRANCH=${1:?usage: bash sandbox/loop.sh <feature-branch> "<task>"}
TASK=${2:?usage: bash sandbox/loop.sh <feature-branch> "<task>"}
ATTEMPT_ID=
CLONE=
FINALIZER="$ROOT/sandbox/finalize-attempt.sh"
LEASE_TOOL="$ROOT/sandbox/model-lease.sh"
JOURNAL_TOOL="$ROOT/sandbox/attempt-journal.mjs"
JOURNAL_ROOT="$PARENT/.kimen-loop-journal"
LOCK_DIR="$PARENT/.kimen-loop.lock"
LOCK_OWNED=0
LOCK_ADOPTED=0
LOCK_SAFE_TO_RELEASE=0
INTERRUPTED=0
SIGNAL_COUNT=0
ACTIVE_CHILD_PID=
LEASE_ID=
LEASE_FILE=
LEASE_ID_FILE=
LEASE_NOT_AFTER=
SECRET_DIR=
EVIDENCE_DIR=
JOURNAL_DIR=

if [ -n "${KIMEN_JOURNAL_NOW_MS_TEST:-}" ] && [ "${KIMEN_LOOP_TEST_MODE:-0}" != 1 ]; then
  echo 'loop: journal clock override requires explicit test mode' >&2
  exit 64
fi

on_signal() {
  INTERRUPTED=1
  SIGNAL_COUNT=$((SIGNAL_COUNT + 1))
  if [ -n "$ACTIVE_CHILD_PID" ]; then
    kill -TERM "$ACTIVE_CHILD_PID" 2>/dev/null || true
  fi
}
trap on_signal INT TERM

run_interruptible() {
  local rc
  local signal_count_at_start=$SIGNAL_COUNT
  local child_pid
  local remaining
  local restore_errexit=0
  case $- in *e*) restore_errexit=1 ;; esac
  "$@" &
  child_pid=$!
  ACTIVE_CHILD_PID=$child_pid
  set +e
  wait "$child_pid"
  rc=$?
  if [ "$SIGNAL_COUNT" -ne "$signal_count_at_start" ]; then
    kill -TERM "$child_pid" 2>/dev/null || true
    remaining=20
    while kill -0 "$child_pid" 2>/dev/null && [ "$remaining" -gt 0 ]; do
      sleep 0.05
      remaining=$((remaining - 1))
    done
    if kill -0 "$child_pid" 2>/dev/null; then
      kill -KILL "$child_pid" 2>/dev/null || true
    fi
    wait "$child_pid" 2>/dev/null || true
  fi
  if [ "$restore_errexit" -eq 1 ]; then set -e; else set +e; fi
  ACTIVE_CHILD_PID=
  if [ "$SIGNAL_COUNT" -ne "$signal_count_at_start" ]; then
    return 130
  fi
  return "$rc"
}

run_interruptible_capture() {
  local output_file
  local rc
  output_file=$(mktemp "${TMPDIR:-/tmp}/kimen-child-output.XXXXXX")
  chmod 0600 "$output_file"
  if run_interruptible "$@" > "$output_file"; then
    rc=0
  else
    rc=$?
  fi
  CAPTURED_OUTPUT=$(cat "$output_file" 2>/dev/null || true)
  rm -f "$output_file"
  return "$rc"
}

read_lock_owner_from() {
  node - "$1" "$ROOT" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [directory, expectedRoot] = process.argv.slice(2);
const directoryStat = fs.lstatSync(directory);
if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink() || directoryStat.uid !== process.getuid() || (directoryStat.mode & 0o077) !== 0) process.exit(65);
const ownerPath = path.join(directory, 'owner.json');
const ownerStat = fs.lstatSync(ownerPath);
if (!ownerStat.isFile() || ownerStat.isSymbolicLink() || ownerStat.uid !== process.getuid() || (ownerStat.mode & 0o077) !== 0) process.exit(65);
const owner = JSON.parse(fs.readFileSync(ownerPath, 'utf8'));
if (owner.schemaVersion !== 1 || !Number.isSafeInteger(owner.pid) || owner.pid < 1 || owner.rootPath !== expectedRoot) process.exit(65);
process.stdout.write(`${owner.pid}\t${owner.rootPath}`);
NODE
}

validate_lock_directory() {
  node - "$1" <<'NODE'
const fs = require('node:fs');
const stat = fs.lstatSync(process.argv[2]);
if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) process.exit(65);
NODE
}

reconcile_canonical_lock_owner_temporaries() {
  node - "$1" "$ROOT" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [directory, expectedRoot] = process.argv.slice(2);
const directoryStat = fs.lstatSync(directory);
if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink() ||
    directoryStat.uid !== process.getuid() || (directoryStat.mode & 0o077) !== 0) process.exit(78);
const deadTemporaries = [];
for (const entry of fs.readdirSync(directory)) {
  if (!entry.startsWith('.owner.')) continue;
  const match = /^\.owner\.([1-9][0-9]*)\.[0-9]+\.tmp$/.exec(entry);
  if (!match) process.exit(78);
  const expectedPid = Number(match[1]);
  const candidate = path.join(directory, entry);
  const stat = fs.lstatSync(candidate);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1 ||
      stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) process.exit(78);
  let owner;
  try { owner = JSON.parse(fs.readFileSync(candidate, 'utf8')); } catch { process.exit(78); }
  if (owner.schemaVersion !== 1 || owner.pid !== expectedPid ||
      owner.rootPath !== expectedRoot || !Number.isSafeInteger(owner.acquiredAt) ||
      owner.acquiredAt < 1) process.exit(78);
  try {
    process.kill(expectedPid, 0);
    process.exit(75);
  } catch (error) {
    if (error?.code !== 'ESRCH') process.exit(75);
  }
  deadTemporaries.push(candidate);
}
if (deadTemporaries.length > 0) {
  for (const candidate of deadTemporaries) fs.unlinkSync(candidate);
  const directoryFd = fs.openSync(directory, fs.constants.O_RDONLY);
  try { fs.fsyncSync(directoryFd); } finally { fs.closeSync(directoryFd); }
}
NODE
}

write_lock_owner_to() {
  local kill_before_rename=${2:-0}
  node - "$1" "$ROOT" "$$" "$kill_before_rename" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [directory, rootPath, rawPid, rawKillBeforeRename] = process.argv.slice(2);
const stat = fs.lstatSync(directory);
if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) process.exit(65);
const target = path.join(directory, 'owner.json');
const temporary = path.join(directory, `.owner.${rawPid}.${Date.now()}.tmp`);
const fd = fs.openSync(temporary, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o600);
try {
  fs.writeFileSync(fd, `${JSON.stringify({ schemaVersion: 1, pid: Number(rawPid), rootPath, acquiredAt: Date.now() })}\n`);
  fs.fsyncSync(fd);
} finally { fs.closeSync(fd); }
if (rawKillBeforeRename === '1') {
  process.kill(Number(rawPid), 'SIGKILL');
  process.exit(137);
}
fs.renameSync(temporary, target);
const directoryFd = fs.openSync(directory, fs.constants.O_RDONLY);
try { fs.fsyncSync(directoryFd); } finally { fs.closeSync(directoryFd); }
NODE
}

lock_claim_directory() {
  local directory=$1
  local kind=$2
  local action=$3
  node - "$directory" "$ROOT" "$kind" "$action" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [directory, expectedRoot, kind, action] = process.argv.slice(2);
const patterns = {
  initial: /^\.kimen-loop\.lock\.claim\.([1-9][0-9]*)\.([0-9a-f]{16})$/,
  adoption: /^\.adoption-claim\.([1-9][0-9]*)\.([0-9a-f]{16})$/,
};
const pattern = patterns[kind];
if (!pattern || !['inspect', 'remove'].includes(action)) process.exit(64);
const match = pattern.exec(path.basename(directory));
if (!match) process.exit(65);
const pid = Number(match[1]);
if (!Number.isSafeInteger(pid) || pid < 1) process.exit(65);
const expectedParent = kind === 'initial'
  ? path.dirname(expectedRoot)
  : path.join(path.dirname(expectedRoot), '.kimen-loop.lock');
if (path.dirname(directory) !== expectedParent) process.exit(65);
const directoryStat = fs.lstatSync(directory);
if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink() ||
    directoryStat.uid !== process.getuid() || (directoryStat.mode & 0o077) !== 0) process.exit(65);
const entries = fs.readdirSync(directory);
let hasOwner = false;
let temporary = null;
for (const entry of entries) {
  if (entry === 'owner.json') {
    if (hasOwner) process.exit(65);
    hasOwner = true;
    continue;
  }
  const temporaryMatch = /^\.owner\.([1-9][0-9]*)\.[0-9]+\.tmp$/.exec(entry);
  if (!temporaryMatch || Number(temporaryMatch[1]) !== pid || temporary !== null) process.exit(65);
  temporary = entry;
}
if (hasOwner && temporary !== null) process.exit(65);
const secureFile = (entry) => {
  const candidate = path.join(directory, entry);
  const stat = fs.lstatSync(candidate);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) process.exit(65);
  return candidate;
};
if (hasOwner) {
  const ownerPath = secureFile('owner.json');
  const owner = JSON.parse(fs.readFileSync(ownerPath, 'utf8'));
  if (owner.schemaVersion !== 1 || owner.pid !== pid || owner.rootPath !== expectedRoot) process.exit(65);
}
if (temporary !== null) secureFile(temporary);
if (action === 'inspect') {
  process.stdout.write(`${pid}\t${expectedRoot}`);
  process.exit(0);
}
for (const entry of entries) fs.unlinkSync(path.join(directory, entry));
const directoryFd = fs.openSync(directory, fs.constants.O_RDONLY);
try { fs.fsyncSync(directoryFd); } finally { fs.closeSync(directoryFd); }
fs.rmdirSync(directory);
const parentFd = fs.openSync(path.dirname(directory), fs.constants.O_RDONLY);
try { fs.fsyncSync(parentFd); } finally { fs.closeSync(parentFd); }
NODE
}

read_lock_claim_from() {
  lock_claim_directory "$1" "$2" inspect
}

remove_lock_claim_directory() {
  lock_claim_directory "$1" "$2" remove
}

prepare_lock_owner_directory() {
  local directory=$1
  local kind=$2
  local kill_before_rename=0
  /bin/mkdir -m 0700 "$directory" || return 78
  fsync_directory "$(dirname "$directory")" || return 78
  if [ "${KIMEN_LOOP_TEST_MODE:-0}" = 1 ]; then
    case "$kind" in
      initial)
        if [ "${LOCK_KILL_AFTER_INITIAL_CLAIM_MKDIR_TEST:-0}" = 1 ]; then kill -KILL "$$"; fi
        [ "${LOCK_KILL_AFTER_INITIAL_CLAIM_TEMP_WRITE_TEST:-0}" != 1 ] || kill_before_rename=1
        ;;
      adoption)
        if [ "${LOCK_KILL_AFTER_ADOPTION_CLAIM_MKDIR_TEST:-0}" = 1 ]; then kill -KILL "$$"; fi
        [ "${LOCK_KILL_AFTER_ADOPTION_CLAIM_TEMP_WRITE_TEST:-0}" != 1 ] || kill_before_rename=1
        ;;
      *) return 78 ;;
    esac
  fi
  write_lock_owner_to "$directory" "$kill_before_rename" || return 78
  fsync_directory "$(dirname "$directory")" || return 78
}

remove_lock_owner_directory() {
  node - "$1" "$ROOT" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [directory, rootPath] = process.argv.slice(2);
const stat = fs.lstatSync(directory);
if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) process.exit(65);
const entries = fs.readdirSync(directory);
if (entries.length !== 1 || entries[0] !== 'owner.json') process.exit(65);
const ownerPath = path.join(directory, 'owner.json');
const ownerStat = fs.lstatSync(ownerPath);
if (!ownerStat.isFile() || ownerStat.isSymbolicLink() || ownerStat.uid !== process.getuid() || (ownerStat.mode & 0o077) !== 0) process.exit(65);
const owner = JSON.parse(fs.readFileSync(ownerPath, 'utf8'));
if (owner.schemaVersion !== 1 || !Number.isSafeInteger(owner.pid) || owner.pid < 1 || owner.rootPath !== rootPath) process.exit(65);
fs.unlinkSync(ownerPath);
const directoryFd = fs.openSync(directory, fs.constants.O_RDONLY);
try { fs.fsyncSync(directoryFd); } finally { fs.closeSync(directoryFd); }
fs.rmdirSync(directory);
const parentFd = fs.openSync(path.dirname(directory), fs.constants.O_RDONLY);
try { fs.fsyncSync(parentFd); } finally { fs.closeSync(parentFd); }
NODE
}

reconcile_lock_claims() {
  local block_live=${1:-0}
  local claim
  local fields
  local pid
  local root
  for claim in "$PARENT"/.kimen-loop.lock.claim.*; do
    [ -e "$claim" ] || continue
    fields=$(read_lock_claim_from "$claim" initial) || return 78
    IFS=$'\t' read -r pid root <<< "$fields"
    if kill -0 "$pid" 2>/dev/null; then
      if [ "$block_live" -eq 1 ]; then
        echo "loop: another unattended loop has a live durable claim (pid=$pid)" >&2
        return 75
      fi
    else
      remove_lock_claim_directory "$claim" initial || return 78
    fi
  done
}

cleanup_dead_lock_claims() {
  reconcile_lock_claims 0
}

reconcile_adoption_claims() {
  local claim
  local fields
  local pid
  local root
  for claim in "$LOCK_DIR"/.adoption-claim.*; do
    [ -e "$claim" ] || continue
    fields=$(read_lock_claim_from "$claim" adoption) || return 78
    IFS=$'\t' read -r pid root <<< "$fields"
    if kill -0 "$pid" 2>/dev/null; then
      echo "loop: another process has a live adoption claim (pid=$pid)" >&2
      return 75
    fi
    remove_lock_claim_directory "$claim" adoption || return 78
  done
}

fsync_directory() {
  node - "$1" <<'NODE'
const fs = require('node:fs');
const fd = fs.openSync(process.argv[2], fs.constants.O_RDONLY);
try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
NODE
}

acquire_loop_lock() {
  local owner_fields
  local owner_pid=
  local owner_root
  local claim_nonce
  local claim_directory
  local adoption_directory="$LOCK_DIR/adoption"
  local adoption_claim
  local claim
  local claim_fields
  local claim_pid
  local canonical_kill_before_rename=0
  local canonical_temporary_rc
  reconcile_lock_claims 1 || return $?
  claim_nonce=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(8).toString("hex"))') || return 78
  claim_directory="$PARENT/.kimen-loop.lock.claim.$$.$claim_nonce"
  prepare_lock_owner_directory "$claim_directory" initial || return 78
  if [ "${KIMEN_LOOP_TEST_MODE:-0}" = 1 ] && [ "${LOCK_WAIT_BEFORE_MKDIR_TEST:-0}" = 1 ]; then
    : > "$KIMEN_HOST_STATE/lock-ready.$$"
    while [ ! -e "$KIMEN_HOST_STATE/release-lock-race" ]; do sleep 0.05; done
  fi
  if /bin/mkdir -m 0700 "$LOCK_DIR" 2>/dev/null; then
    validate_lock_directory "$LOCK_DIR" || return 78
    if [ "${KIMEN_LOOP_TEST_MODE:-0}" = 1 ] && [ "${LOCK_KILL_BEFORE_PUBLISH_TEST:-0}" = 1 ]; then
      kill -KILL "$$"
    fi
    if [ "${KIMEN_LOOP_TEST_MODE:-0}" = 1 ] &&
      [ "${LOCK_KILL_AFTER_INITIAL_CANONICAL_TEMP_WRITE_TEST:-0}" = 1 ]; then
      canonical_kill_before_rename=1
    fi
    write_lock_owner_to "$LOCK_DIR" "$canonical_kill_before_rename" || return 78
    fsync_directory "$PARENT" || return 78
    remove_lock_claim_directory "$claim_directory" initial || return 78
    LOCK_OWNED=1
    cleanup_dead_lock_claims || return 78
    return 0
  fi
  remove_lock_claim_directory "$claim_directory" initial || return 78
  validate_lock_directory "$LOCK_DIR" || return 78
  set +e
  reconcile_canonical_lock_owner_temporaries "$LOCK_DIR"
  canonical_temporary_rc=$?
  set -e
  if [ "$canonical_temporary_rc" -ne 0 ]; then
    [ "$canonical_temporary_rc" -eq 75 ] && return 75
    return 78
  fi
  if [ -f "$LOCK_DIR/owner.json" ] && [ ! -L "$LOCK_DIR/owner.json" ]; then
    owner_fields=$(read_lock_owner_from "$LOCK_DIR") || return 78
    IFS=$'\t' read -r owner_pid owner_root <<< "$owner_fields"
    if kill -0 "$owner_pid" 2>/dev/null; then
      echo "loop: another unattended loop is active (pid=$owner_pid)" >&2
      return 75
    fi
  else
    [ ! -e "$LOCK_DIR/owner.json" ] || return 78
    for claim in "$PARENT"/.kimen-loop.lock.claim.*; do
      [ -e "$claim" ] || continue
      claim_fields=$(read_lock_claim_from "$claim" initial) || return 78
      IFS=$'\t' read -r claim_pid owner_root <<< "$claim_fields"
      if kill -0 "$claim_pid" 2>/dev/null; then
        echo "loop: incomplete lock has a live durable claim (pid=$claim_pid)" >&2
        return 75
      fi
    done
  fi
  if [ -e "$adoption_directory" ]; then
    [ -d "$adoption_directory" ] && [ ! -L "$adoption_directory" ] || return 78
    adoption_fields=$(read_lock_owner_from "$adoption_directory") || return 78
    IFS=$'\t' read -r adoption_pid owner_root <<< "$adoption_fields"
    if kill -0 "$adoption_pid" 2>/dev/null; then
      echo "loop: another process is adopting the stale global lock (pid=$adoption_pid)" >&2
      return 75
    fi
    remove_lock_owner_directory "$adoption_directory" || return 78
  fi
  reconcile_adoption_claims || return $?
  claim_nonce=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(8).toString("hex"))') || return 78
  adoption_claim="$LOCK_DIR/.adoption-claim.$$.$claim_nonce"
  prepare_lock_owner_directory "$adoption_claim" adoption || return 78
  set +e
  node - "$adoption_claim" "$adoption_directory" <<'NODE'
const fs = require('node:fs');
const [source, target] = process.argv.slice(2);
try { fs.renameSync(source, target); } catch (error) {
  if (['EEXIST', 'ENOTEMPTY'].includes(error.code)) process.exit(75);
  throw error;
}
const fd = fs.openSync(require('node:path').dirname(target), fs.constants.O_RDONLY);
try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
NODE
  adoption_publish_rc=$?
  set -e
  if [ "$adoption_publish_rc" -ne 0 ]; then
    [ -e "$adoption_claim" ] || return "$adoption_publish_rc"
    remove_lock_claim_directory "$adoption_claim" adoption || return 78
    return "$adoption_publish_rc"
  fi
  if [ "${KIMEN_LOOP_TEST_MODE:-0}" = 1 ] && [ "${LOCK_KILL_AFTER_ADOPTION_CLAIM_TEST:-0}" = 1 ]; then
    kill -KILL "$$"
  fi
  if [ -n "$owner_pid" ]; then
    owner_fields=$(read_lock_owner_from "$LOCK_DIR") || return 78
    IFS=$'\t' read -r current_owner_pid owner_root <<< "$owner_fields"
    [ "$current_owner_pid" = "$owner_pid" ] || return 75
    kill -0 "$current_owner_pid" 2>/dev/null && return 75
  else
    [ ! -e "$LOCK_DIR/owner.json" ] || return 75
  fi
  canonical_kill_before_rename=0
  if [ "${KIMEN_LOOP_TEST_MODE:-0}" = 1 ] &&
    [ "${LOCK_KILL_AFTER_ADOPTION_CANONICAL_TEMP_WRITE_TEST:-0}" = 1 ]; then
    canonical_kill_before_rename=1
  fi
  write_lock_owner_to "$LOCK_DIR" "$canonical_kill_before_rename" || return 78
  remove_lock_owner_directory "$adoption_directory" || return 78
  fsync_directory "$LOCK_DIR" || return 78
  LOCK_OWNED=1
  LOCK_ADOPTED=1
  cleanup_dead_lock_claims || return 78
}

release_loop_lock() {
  local release_path
  [ "$LOCK_OWNED" -eq 1 ] && [ "$LOCK_SAFE_TO_RELEASE" -eq 1 ] || return 0
  node - "$LOCK_DIR" "$ROOT" "$$" <<'NODE' || return 78
const fs = require('node:fs');
const path = require('node:path');
const [directory, rootPath, rawPid] = process.argv.slice(2);
const stat = fs.lstatSync(directory);
if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) process.exit(65);
const ownerPath = path.join(directory, 'owner.json');
const ownerStat = fs.lstatSync(ownerPath);
if (!ownerStat.isFile() || ownerStat.isSymbolicLink() || ownerStat.uid !== process.getuid() || (ownerStat.mode & 0o077) !== 0) process.exit(65);
const owner = JSON.parse(fs.readFileSync(ownerPath, 'utf8'));
if (owner.schemaVersion !== 1 || owner.pid !== Number(rawPid) || owner.rootPath !== rootPath) process.exit(65);
NODE
  release_path="$LOCK_DIR.release.$$"
  [ ! -e "$release_path" ] || return 78
  /bin/mv "$LOCK_DIR" "$release_path" || return 78
  fsync_directory "$PARENT" || return 78
  /bin/rm -f "$release_path/owner.json"
  /bin/rmdir "$release_path" || return 78
  fsync_directory "$PARENT" || return 78
  LOCK_OWNED=0
}

attempt_anchor() {
  local repo=$1
  local attempt_id=$2
  printf '%s/.%s.attempt-%s.anchor\n' "$(dirname "$repo")" "${repo##*/}" "$attempt_id"
}

write_attempt_anchor() {
  local repo=$1
  local attempt_id=$2
  local evidence="$repo/.kimen/attempts/$attempt_id.json"
  local anchor
  anchor=$(attempt_anchor "$repo" "$attempt_id")
  node - "$evidence" "$anchor.tmp" <<'NODE'
const fs = require('node:fs');
const [evidencePath, anchorPath] = process.argv.slice(2);
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const anchor = {
  schemaVersion: 1,
  attemptId: evidence.attemptId,
  baseSha: evidence.baseSha,
  taskSha256: evidence.taskSha256,
};
fs.writeFileSync(anchorPath, `${JSON.stringify(anchor)}\n`, { mode: 0o600 });
fs.chmodSync(anchorPath, 0o600);
NODE
  mv "$anchor.tmp" "$anchor"
}

validate_attempt_anchor() {
  local repo=$1
  local attempt_id=$2
  local evidence="$repo/.kimen/attempts/$attempt_id.json"
  local anchor
  anchor=$(attempt_anchor "$repo" "$attempt_id")
  [ -f "$anchor" ] && [ ! -L "$anchor" ] || return 1
  node - "$evidence" "$anchor" "$attempt_id" <<'NODE'
const fs = require('node:fs');
const [evidencePath, anchorPath, attemptId] = process.argv.slice(2);
const stat = fs.lstatSync(anchorPath);
if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) process.exit(65);
const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'));
const anchor = JSON.parse(fs.readFileSync(anchorPath, 'utf8'));
if (anchor.schemaVersion !== 1 || anchor.attemptId !== attemptId || evidence.attemptId !== attemptId) process.exit(65);
if (!/^[0-9a-f]{40}$/.test(anchor.baseSha ?? '') || !/^[0-9a-f]{64}$/.test(anchor.taskSha256 ?? '')) process.exit(65);
if (anchor.baseSha !== evidence.baseSha || anchor.taskSha256 !== evidence.taskSha256) process.exit(65);
NODE
}

finalization_marker() {
  local repo=$1
  local attempt_id=$2
  printf '%s/.%s.finalized-%s\n' "$(dirname "$repo")" "${repo##*/}" "$attempt_id"
}

validate_final_ref() {
  local repo=$1
  local attempt_id=$2
  local expected_finalize=$3
  local evidence="$repo/.kimen/attempts/$attempt_id.json"
  local evidence_rel=".kimen/attempts/$attempt_id.json"
  local ref="refs/heads/loop/$attempt_id"
  local ref_sha
  local snapshot_sha
  local snapshot_parent
  local fields
  local recorded_base
  local recorded_snapshot
  local recorded_ref
  local verdict
  local finalize_status
  [ -f "$evidence" ] && [ ! -L "$evidence" ] || return 1
  ref_sha=$(git -C "$repo" rev-parse --verify "$ref^{commit}" 2>/dev/null) || return 1
  snapshot_sha=$(git -C "$repo" rev-parse --verify "$ref_sha^" 2>/dev/null) || return 1
  snapshot_parent=$(git -C "$repo" rev-parse --verify "$snapshot_sha^" 2>/dev/null) || return 1
  fields=$(node - "$evidence" <<'NODE'
const fs = require('node:fs');
const evidence = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
process.stdout.write([
  evidence.baseSha ?? '', evidence.snapshotSha ?? '', evidence.evidenceRef ?? '',
  evidence.verdict ?? '', evidence.phases?.finalize?.status ?? '',
].join('\t'));
NODE
  ) || return 1
  IFS=$'\t' read -r recorded_base recorded_snapshot recorded_ref verdict finalize_status <<< "$fields"
  [ "$recorded_snapshot" = "$snapshot_sha" ] || return 1
  [ "$recorded_ref" = "loop/$attempt_id" ] || return 1
  [ "$finalize_status" = "$expected_finalize" ] || return 1
  if [ "$expected_finalize" = interrupted ]; then
    [ "$verdict" = red ] || return 1
  fi
  git -C "$repo" merge-base --is-ancestor "$recorded_base" "$snapshot_parent" 2>/dev/null || return 1
  [ "$(git -C "$repo" diff-tree --no-commit-id --name-only -r "$ref_sha")" = "$evidence_rel" ] || return 1
  git -C "$repo" show "$ref_sha:$evidence_rel" 2>/dev/null | cmp - "$evidence" || return 1
}

validate_finalization_marker() {
  local repo=$1
  local attempt_id=$2
  local marker
  local expected_sha
  local actual_sha
  local finalize_status
  marker=$(finalization_marker "$repo" "$attempt_id")
  [ -f "$marker" ] && [ ! -L "$marker" ] || return 1
  node - "$marker" <<'NODE'
const fs = require('node:fs');
const stat = fs.lstatSync(process.argv[2]);
if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) process.exit(65);
NODE
  expected_sha=$(sed -n 's/^refSha=//p' "$marker")
  [[ "$expected_sha" =~ ^[0-9a-f]{40}$ ]] || return 1
  actual_sha=$(git -C "$repo" rev-parse --verify "refs/heads/loop/$attempt_id^{commit}" 2>/dev/null) || return 1
  [ "$actual_sha" = "$expected_sha" ] || return 1
  finalize_status=$(node -e 'const e=require(process.argv[1]);process.stdout.write(e.phases.finalize.status)' \
    "$repo/.kimen/attempts/$attempt_id.json") || return 1
  [ "$finalize_status" = passed ] || [ "$finalize_status" = interrupted ] || return 1
  validate_final_ref "$repo" "$attempt_id" "$finalize_status"
}

unsafe_attempt_ref_exists() {
  local repo=$1
  local attempt_id=$2
  local ref="refs/heads/loop/$attempt_id"
  local loose="$repo/.git/$ref"
  [ ! -e "$loose" ] || return 0
  if [ -f "$repo/.git/packed-refs" ] && [ ! -L "$repo/.git/packed-refs" ]; then
    awk -v ref="$ref" '$2 == ref { found=1 } END { exit(found ? 0 : 1) }' "$repo/.git/packed-refs"
    return $?
  fi
  return 1
}

validate_recovery_entry() {
  local repo=$1
  local evidence=$2
  node - "$repo" "$evidence" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [repo, evidencePath] = process.argv.slice(2);
const relative = path.relative(repo, evidencePath);
if (!/^\.kimen\/attempts\/[^/]+\.json$/.test(relative)) process.exit(65);
let current = repo;
for (const part of relative.split('/').slice(0, -1)) {
  current = path.join(current, part);
  const stat = fs.lstatSync(current);
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o022) !== 0) process.exit(65);
}
const stat = fs.lstatSync(evidencePath);
if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) process.exit(65);
NODE
}

validate_attempts_directory() {
  local directory=$1
  node - "$directory" <<'NODE'
const fs = require('node:fs');
const stat = fs.lstatSync(process.argv[2]);
if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o022) !== 0) process.exit(65);
NODE
}

record_recovery_phase() {
  local repo=$1
  local attempt_id=$2
  local phase=$3
  local status=$4
  local raw_rc=$5
  node - "$repo/.kimen/attempts/$attempt_id.json" "$phase" "$status" "$raw_rc" <<'NODE'
const fs = require('node:fs');
const [target, phase, status, rawRc] = process.argv.slice(2);
const evidence = JSON.parse(fs.readFileSync(target, 'utf8'));
if (!Object.hasOwn(evidence.phases ?? {}, phase)) process.exit(65);
evidence.phases[phase] = { status, exitCode: rawRc === 'null' ? null : Number(rawRc) };
const temporary = `${target}.${process.pid}.recovery`;
const fd = fs.openSync(temporary, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o600);
try { fs.writeFileSync(fd, `${JSON.stringify(evidence, null, 2)}\n`); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
fs.renameSync(temporary, target);
const directory = fs.openSync(require('node:path').dirname(target), fs.constants.O_RDONLY);
try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
NODE
}

recovery_phase_status() {
  node -e 'const e=require(process.argv[1]);process.stdout.write(e.phases?.[process.argv[2]]?.status??"")' \
    "$1/.kimen/attempts/$2.json" "$3"
}

record_recovery_pass_if_nonterminal() {
  local repo=$1
  local attempt_id=$2
  local phase=$3
  local status
  status=$(recovery_phase_status "$repo" "$attempt_id" "$phase") || return 78
  if [ "$status" = not-run ] || [ "$status" = running ]; then
    record_recovery_phase "$repo" "$attempt_id" "$phase" passed 0
  fi
}

journal_get() {
  node "$JOURNAL_TOOL" get "$JOURNAL_ROOT" "$1" "$2"
}

read_secure_journal_file() {
  local journal_directory=$1
  local candidate=$2
  [ -n "$candidate" ] || return 1
  node - "$journal_directory" "$candidate" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [directory, candidate] = process.argv.slice(2);
if (path.dirname(candidate) !== directory) process.exit(65);
let stat;
try { stat = fs.lstatSync(candidate); } catch { process.exit(1); }
if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) process.exit(65);
process.stdout.write(fs.readFileSync(candidate, 'utf8').trim());
NODE
}

destroy_journaled_container() {
  local attempt_id=$1
  local repo=$2
  local phase=$3
  local journal_directory=$4
  local container_state
  local container_name
  local state_id
  local cid_file
  local file_id=
  local listed
  local listed_id=
  local named_id=
  local candidate
  local cid=
  local labels
  local inspect_rc
  local absence_rc
  local name_rc
  container_state=$(journal_get "$attempt_id" "containers.$phase.state") || return 78
  container_name=$(journal_get "$attempt_id" "containers.$phase.name") || return 78
  state_id=$(journal_get "$attempt_id" "containers.$phase.id") || return 78
  cid_file=$(journal_get "$attempt_id" "containers.$phase.cidFile") || return 78
  if [ -n "$cid_file" ]; then
    set +e
    file_id=$(read_secure_journal_file "$journal_directory" "$cid_file")
    file_rc=$?
    set -e
    [ "$file_rc" -eq 0 ] || [ "$file_rc" -eq 1 ] || return 78
  fi
  if run_interruptible_capture docker ps -aq --no-trunc \
    --filter "label=kimen.attempt=$attempt_id" \
    --filter "label=kimen.repo=$repo" \
    --filter "label=kimen.phase=$phase"; then
    list_rc=0
  else
    list_rc=$?
  fi
  listed=$CAPTURED_OUTPUT
  [ "$list_rc" -eq 0 ] || return 78
  while IFS= read -r candidate; do
    [ -n "$candidate" ] || continue
    [ -z "$listed_id" ] || [ "$listed_id" = "$candidate" ] || return 78
    listed_id=$candidate
  done <<< "$listed"
  if [ -n "$container_name" ]; then
    if run_interruptible_capture docker ps -aq --no-trunc \
      --filter "name=^/$container_name\$"; then
      name_rc=0
    else
      name_rc=$?
    fi
    [ "$name_rc" -eq 0 ] || return 78
    while IFS= read -r candidate; do
      [ -n "$candidate" ] || continue
      [ -z "$named_id" ] || [ "$named_id" = "$candidate" ] || return 78
      named_id=$candidate
    done <<< "$CAPTURED_OUTPUT"
  fi
  for candidate in "$state_id" "$file_id" "$listed_id" "$named_id"; do
    [ -n "$candidate" ] || continue
    [[ "$candidate" =~ ^[A-Za-z0-9_.:-]{8,128}$ ]] || return 78
    [ -z "$cid" ] || [ "$cid" = "$candidate" ] || return 78
    cid=$candidate
  done
  if [ -z "$cid" ]; then
    case "$container_state" in
      none|destroyed) return 0 ;;
      creating)
        echo "loop: $phase create outcome remains ambiguous without CID or named result" >&2
        return 78
        ;;
      *) return 78 ;;
    esac
  fi
  if run_interruptible_capture docker inspect --format \
    '{{ index .Config.Labels "kimen.attempt" }}{{"\t"}}{{ index .Config.Labels "kimen.repo" }}{{"\t"}}{{ index .Config.Labels "kimen.phase" }}' \
    "$cid"; then
    inspect_rc=0
  else
    inspect_rc=$?
  fi
  labels=$CAPTURED_OUTPUT
  if [ "$inspect_rc" -ne 0 ]; then
    if [ "$container_state" = creating ]; then
      echo "loop: $phase create outcome remains ambiguous without a validated container" >&2
      return 78
    fi
    if run_interruptible_capture docker ps -aq --no-trunc --filter "id=$cid"; then
      absence_rc=0
    else
      absence_rc=$?
    fi
    [ "$absence_rc" -eq 0 ] || return 78
    while IFS= read -r candidate; do
      [ -z "$candidate" ] || return 78
    done <<< "$CAPTURED_OUTPUT"
    node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$attempt_id" container-destroyed "$phase" || return 78
    return 0
  fi
  [ "$labels" = "$attempt_id"$'\t'"$repo"$'\t'"$phase" ] || return 78
  if run_interruptible docker rm -f "$cid" >/dev/null 2>&1; then
    remove_rc=0
  else
    remove_rc=$?
  fi
  if run_interruptible docker inspect "$cid" >/dev/null 2>&1; then
    inspect_rc=0
  else
    inspect_rc=$?
  fi
  [ "$remove_rc" -eq 0 ] && [ "$inspect_rc" -ne 0 ] || return 78
  if run_interruptible_capture docker ps -aq --no-trunc --filter "id=$cid"; then
    absence_rc=0
  else
    absence_rc=$?
  fi
  [ "$absence_rc" -eq 0 ] || return 78
  while IFS= read -r candidate; do
    [ -z "$candidate" ] || return 78
  done <<< "$CAPTURED_OUTPUT"
  node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$attempt_id" container-destroyed "$phase" || return 78
}

destroy_secret_file() {
  local journal_directory=$1
  local secret_path=$2
  [ -n "$secret_path" ] || return 0
  node - "$journal_directory" "$secret_path" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [directory, target] = process.argv.slice(2);
if (path.dirname(target) !== directory) process.exit(65);
try {
  const stat = fs.lstatSync(target);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) process.exit(65);
  fs.unlinkSync(target);
  const fd = fs.openSync(directory, fs.constants.O_RDONLY);
  try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (fs.existsSync(target)) process.exit(65);
NODE
}

resolve_recovery_lease_id() {
  local attempt_id=$1
  local journal_directory=$2
  local lease_id
  local id_file
  local secret_path
  lease_id=$(journal_get "$attempt_id" lease.leaseId) || return 78
  if [ -n "$lease_id" ]; then
    printf '%s' "$lease_id"
    return 0
  fi
  id_file=$(journal_get "$attempt_id" lease.idFile) || return 78
  if [ -n "$id_file" ]; then
    set +e
    lease_id=$(read_secure_journal_file "$journal_directory" "$id_file")
    id_rc=$?
    set -e
    if [ "$id_rc" -eq 0 ] && [ -n "$lease_id" ]; then
      printf '%s' "$lease_id"
      return 0
    fi
    [ "$id_rc" -eq 0 ] || [ "$id_rc" -eq 1 ] || return 78
  fi
  secret_path=$(journal_get "$attempt_id" lease.secretPath) || return 78
  if [ -n "$secret_path" ]; then
    set +e
    lease_id=$(node - "$journal_directory" "$secret_path" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [directory, target] = process.argv.slice(2);
if (path.dirname(target) !== directory) process.exit(65);
let stat;
try { stat = fs.lstatSync(target); } catch { process.exit(1); }
if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) process.exit(65);
const value = JSON.parse(fs.readFileSync(target, 'utf8'))?.leaseId;
if (typeof value !== 'string' || value.length === 0) process.exit(1);
process.stdout.write(value);
NODE
    )
    secret_rc=$?
    set -e
    if [ "$secret_rc" -eq 0 ] && [ -n "$lease_id" ]; then
      printf '%s' "$lease_id"
      return 0
    fi
    [ "$secret_rc" -eq 1 ] || return 78
  fi
  return 78
}

recover_operational_attempt() {
  local journal_directory=$1
  local attempt_id=$2
  local repo=$3
  local update_evidence=${4:-1}
  local mark_interrupted=${5:-0}
  local agent_state
  local agent_status
  local lease_state
  local secret_path
  local lease_id
  local lease_not_after
  local now_ms
  local revoke_rc
  agent_state=$(journal_get "$attempt_id" containers.agent.state) || return 78
  for phase in bootstrap agent gates; do
    destroy_journaled_container "$attempt_id" "$repo" "$phase" "$journal_directory" || return 78
  done
  if [ "$agent_state" != none ]; then
    if [ "$update_evidence" -eq 1 ]; then
      record_recovery_phase "$repo" "$attempt_id" agentDestroy passed 0 || return 78
      if [ "$mark_interrupted" -eq 1 ]; then
        agent_status=$(recovery_phase_status "$repo" "$attempt_id" agent) || return 78
        if [ "$agent_status" = not-run ] || [ "$agent_status" = running ]; then
          record_recovery_phase "$repo" "$attempt_id" agent interrupted 137 || return 78
        fi
      fi
    fi
  fi
  lease_state=$(journal_get "$attempt_id" lease.state) || return 78
  secret_path=$(journal_get "$attempt_id" lease.secretPath) || return 78
  if [ "$lease_state" = none ]; then
    [ -z "$secret_path" ] || return 78
    return 0
  fi
  if [ "$lease_state" = prepared ] || [ "$lease_state" = cancelled ]; then
    destroy_secret_file "$journal_directory" "$secret_path" || return 78
    node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$attempt_id" secret-destroyed || return 78
    if [ "$lease_state" = prepared ]; then
      node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$attempt_id" lease-cancelled || return 78
      if [ "$update_evidence" -eq 1 ]; then
        record_recovery_phase "$repo" "$attempt_id" leaseAcquire interrupted 130 || return 78
        record_recovery_phase "$repo" "$attempt_id" leaseRevoke passed 0 || return 78
      fi
    fi
    return 0
  fi
  if [ "$lease_state" = revoked ] || [ "$lease_state" = expired ]; then
    destroy_secret_file "$journal_directory" "$secret_path" || return 78
    node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$attempt_id" secret-destroyed || return 78
    if [ "$lease_state" = revoked ]; then
      if [ "$update_evidence" -eq 1 ]; then
        record_recovery_pass_if_nonterminal "$repo" "$attempt_id" leaseAcquire || return 78
        record_recovery_phase "$repo" "$attempt_id" leaseRevoke passed 0 || return 78
      fi
    fi
    return 0
  fi
  set +e
  lease_id=$(resolve_recovery_lease_id "$attempt_id" "$journal_directory")
  resolve_rc=$?
  set -e
  if [ "$resolve_rc" -ne 0 ]; then
    lease_not_after=$(journal_get "$attempt_id" lease.leaseNotAfter) || return 78
    now_ms=$(node -e 'const n=Number(process.env.KIMEN_JOURNAL_NOW_MS_TEST??Date.now());if(!Number.isSafeInteger(n))process.exit(65);process.stdout.write(String(n))') || return 78
    if [ -z "$lease_not_after" ] || [ "$now_ms" -lt "$lease_not_after" ]; then
      echo "loop: unidentified lease remains within its guaranteed lifetime for $attempt_id" >&2
      return 75
    fi
    destroy_secret_file "$journal_directory" "$secret_path" || return 78
    node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$attempt_id" secret-destroyed || return 78
    node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$attempt_id" lease-expired || return 78
    if [ "$update_evidence" -eq 1 ]; then
      record_recovery_phase "$repo" "$attempt_id" leaseAcquire interrupted 130 || return 78
      record_recovery_phase "$repo" "$attempt_id" leaseRevoke interrupted 130 || return 78
    fi
    return 0
  fi
  node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$attempt_id" lease-id "$lease_id" || return 78
  if [ "$update_evidence" -eq 1 ]; then
    record_recovery_pass_if_nonterminal "$repo" "$attempt_id" leaseAcquire || return 78
  fi
  destroy_secret_file "$journal_directory" "$secret_path" || return 78
  node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$attempt_id" secret-destroyed || return 78
  node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$attempt_id" lease-revoking || return 78
  set +e
  run_interruptible bash "$LEASE_TOOL" revoke --lease-id "$lease_id"
  revoke_rc=$?
  set -e
  if [ "$revoke_rc" -ne 0 ]; then
    [ "$update_evidence" -ne 1 ] || record_recovery_phase "$repo" "$attempt_id" leaseRevoke failed "$revoke_rc" || true
    return 78
  fi
  node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$attempt_id" lease-revoked || return 78
  [ "$update_evidence" -ne 1 ] || record_recovery_phase "$repo" "$attempt_id" leaseRevoke passed 0 || return 78
}

recover_git_attempt() {
  local repo=$1
  local attempt_id=$2
  local evidence="$repo/.kimen/attempts/$attempt_id.json"
  local marker
  local promotion_marker
  local recovery_rc
  validate_recovery_entry "$repo" "$evidence" || return 78
  validate_attempt_anchor "$repo" "$attempt_id" || return 78
  marker=$(finalization_marker "$repo" "$attempt_id")
  if [ -e "$marker" ]; then
    validate_finalization_marker "$repo" "$attempt_id" || return 78
    node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$attempt_id" finalized || return 78
    return 0
  fi
  promotion_marker="$(dirname "$repo")/.${repo##*/}.promotion-$attempt_id.state"
  if [ ! -e "$promotion_marker" ] && unsafe_attempt_ref_exists "$repo" "$attempt_id"; then
    echo "loop: attempt ref exists without adjacent host proof or promotion recovery state for $attempt_id" >&2
    return 78
  fi
  [ "$INTERRUPTED" -eq 0 ] || return 130
  set +e
  run_interruptible bash "$FINALIZER" --repo "$repo" --attempt-id "$attempt_id" --recovery
  recovery_rc=$?
  set -e
  [ "$recovery_rc" -eq 1 ] || {
    echo "loop: recovery finalizer returned operational rc=$recovery_rc for $attempt_id" >&2
    return 78
  }
  validate_final_ref "$repo" "$attempt_id" interrupted || return 78
  validate_finalization_marker "$repo" "$attempt_id" || return 78
  node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$attempt_id" finalized || return 78
}

recover_stale_attempts() {
  local scan_file
  local journal_directory
  local attempt_id
  local repo
  local finalization_state
  local update_evidence
  scan_file=$(mktemp "${TMPDIR:-/tmp}/kimen-journal-scan.XXXXXX")
  set +e
  node "$JOURNAL_TOOL" scan "$JOURNAL_ROOT" "$PARENT" > "$scan_file"
  scan_rc=$?
  set -e
  if [ "$scan_rc" -ne 0 ]; then
    rm -f "$scan_file"
    echo 'loop: lifecycle-journal scan failed closed' >&2
    return 78
  fi
  while IFS= read -r -d '' journal_directory; do
    attempt_id=${journal_directory##*/}
    repo=$(journal_get "$attempt_id" repoPath) || {
      rm -f "$scan_file"
      return 78
    }
    finalization_state=$(journal_get "$attempt_id" finalization) || {
      rm -f "$scan_file"
      return 78
    }
    if [ "$finalization_state" = complete ]; then
      update_evidence=0
    else
      update_evidence=1
    fi
    recover_operational_attempt "$journal_directory" "$attempt_id" "$repo" "$update_evidence" 1 || {
      rm -f "$scan_file"
      echo "loop: operational recovery failed for $attempt_id" >&2
      return 78
    }
    [ "$INTERRUPTED" -eq 0 ] || {
      rm -f "$scan_file"
      return 130
    }
    recover_git_attempt "$repo" "$attempt_id" || {
      rm -f "$scan_file"
      echo "loop: Git recovery failed for $attempt_id" >&2
      return 78
    }
  done < "$scan_file"
  rm -f "$scan_file"
}

acquire_loop_lock
trap release_loop_lock EXIT
recover_stale_attempts
if [ -n "${KIMEN_ATTEMPT_ID_TEST:-}" ]; then
  [ "${KIMEN_LOOP_TEST_MODE:-0}" = 1 ] || exit 64
  ATTEMPT_ID=$KIMEN_ATTEMPT_ID_TEST
  [[ "$ATTEMPT_ID" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]] || exit 64
else
  STAMP=$(date +%Y%m%d-%H%M%S)
  ATTEMPT_NONCE=$(node -e 'process.stdout.write(require("node:crypto").randomBytes(8).toString("hex"))')
  ATTEMPT_ID="$STAMP-$$-$ATTEMPT_NONCE"
fi
CLONE="$PARENT/kimen-loop-$ATTEMPT_ID"
git clone --quiet --no-local --no-hardlinks --branch "$BRANCH" "$ROOT" "$CLONE"

mkdir -p "$CLONE/.kimen"
[ -d "$CLONE/.kimen" ] && [ ! -L "$CLONE/.kimen" ] || exit 65
chmod 0700 "$CLONE/.kimen"
EVIDENCE_DIR="$CLONE/.kimen/attempts"
mkdir -p "$EVIDENCE_DIR"
[ -d "$EVIDENCE_DIR" ] && [ ! -L "$EVIDENCE_DIR" ] || exit 65
chmod 0700 "$EVIDENCE_DIR"
EVIDENCE="$EVIDENCE_DIR/$ATTEMPT_ID.json"
BASE_SHA=$(git -C "$CLONE" rev-parse HEAD)
node - "$EVIDENCE" "$ATTEMPT_ID" "$BASE_SHA" "$TASK" <<'NODE'
const crypto = require('node:crypto');
const fs = require('node:fs');
const [path, attemptId, baseSha, task] = process.argv.slice(2);
const notRun = () => ({ status: 'not-run', exitCode: null });
const phases = Object.fromEntries([
  'bootstrapFirewall', 'bootstrapProxy', 'install', 'browser', 'leaseAcquire',
  'agentFirewall', 'agentProxy', 'agent', 'agentDestroy', 'leaseRevoke', 'gates', 'finalize',
].map((name) => [name, notRun()]));
const evidence = {
  schemaVersion: 1,
  attemptId,
  baseSha,
  taskSha256: crypto.createHash('sha256').update(task).digest('hex'),
  phases,
};
const fd = fs.openSync(path, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o600);
try { fs.writeFileSync(fd, `${JSON.stringify(evidence, null, 2)}\n`); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
fs.chmodSync(path, 0o600);
const directory = fs.openSync(require('node:path').dirname(path), fs.constants.O_RDONLY);
try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
NODE

validate_attempt_evidence_path() {
  node - "$CLONE" "$EVIDENCE" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [root, evidencePath] = process.argv.slice(2);
const relative = path.relative(root, evidencePath);
if (relative.startsWith('..') || path.isAbsolute(relative)) process.exit(65);
let current = root;
for (const part of relative.split('/').slice(0, -1)) {
  current = path.join(current, part);
  const stat = fs.lstatSync(current);
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o022) !== 0) process.exit(65);
}
const evidence = fs.lstatSync(evidencePath);
if (!evidence.isFile() || evidence.isSymbolicLink() || evidence.uid !== process.getuid() || (evidence.mode & 0o077) !== 0) process.exit(65);
NODE
}

validate_attempt_evidence_path
TASK_SHA256=$(node -e 'const e=require(process.argv[1]);process.stdout.write(e.taskSha256)' "$EVIDENCE")
JOURNAL_DIR=$(node "$JOURNAL_TOOL" init "$JOURNAL_ROOT" "$CLONE" "$ATTEMPT_ID" "$BASE_SHA" "$TASK_SHA256")
[ -n "$JOURNAL_DIR" ] || exit 78

record_phase() {
  local phase=$1
  local status=$2
  local raw_rc=$3
  validate_attempt_evidence_path || return 65
  node - "$EVIDENCE" "$phase" "$status" "$raw_rc" <<'NODE'
const fs = require('node:fs');
const [path, phase, status, rawRc] = process.argv.slice(2);
const evidence = JSON.parse(fs.readFileSync(path, 'utf8'));
if (!Object.hasOwn(evidence.phases, phase)) process.exit(65);
evidence.phases[phase] = { status, exitCode: rawRc === 'null' ? null : Number(rawRc) };
const temporary = `${path}.progress`;
const fd = fs.openSync(temporary, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY, 0o600);
try { fs.writeFileSync(fd, `${JSON.stringify(evidence, null, 2)}\n`); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
fs.renameSync(temporary, path);
fs.chmodSync(path, 0o600);
const directory = fs.openSync(require('node:path').dirname(path), fs.constants.O_RDONLY);
try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
NODE
}

validate_container_evidence() {
  local path=$1
  local expected_phase=$2
  [ -f "$path" ] && [ ! -L "$path" ] || return 1
  node - "$path" "$expected_phase" <<'NODE'
const fs = require('node:fs');
const [path, expectedPhase] = process.argv.slice(2);
const evidence = JSON.parse(fs.readFileSync(path, 'utf8'));
if (evidence.schemaVersion !== 1 || evidence.phase !== expectedPhase) process.exit(65);
const names = Object.keys(evidence.milestones ?? {}).sort();
if (JSON.stringify(names) !== JSON.stringify(['childStarted', 'firewall', 'proxy'])) process.exit(65);
for (const milestone of Object.values(evidence.milestones)) {
  if (!['not-run', 'running', 'passed', 'failed', 'interrupted'].includes(milestone?.status)) process.exit(65);
  const terminal = !['not-run', 'running'].includes(milestone.status);
  if (terminal !== Number.isInteger(milestone.exitCode)) process.exit(65);
  if (milestone.status === 'passed' && milestone.exitCode !== 0) process.exit(65);
  if (['failed', 'interrupted'].includes(milestone.status) && milestone.exitCode === 0) process.exit(65);
}
NODE
}

milestone_value() {
  local path=$1
  local name=$2
  node - "$path" "$name" <<'NODE'
const evidence = JSON.parse(require('node:fs').readFileSync(process.argv[2], 'utf8'));
const milestone = evidence.milestones[process.argv[3]];
process.stdout.write(`${milestone.status}\t${milestone.exitCode === null ? 'null' : milestone.exitCode}`);
NODE
}

collect_container_evidence() {
  local cid=$1
  local destination=$2
  local expected_phase=$3
  [ -n "$cid" ] || return 1
  rm -f "$destination"
  run_interruptible docker cp "$cid:/run/kimen-phase/evidence.json" "$destination" >/dev/null 2>&1 || return 1
  chmod 0600 "$destination" 2>/dev/null || return 1
  validate_container_evidence "$destination" "$expected_phase"
}

create_journaled_container() {
  local phase=$1
  local cid_file=$2
  local create_rc
  local container_name="kimen-$ATTEMPT_ID-$phase"
  shift 2
  CREATED_CID=
  node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$ATTEMPT_ID" container-intent \
    "$phase" "$cid_file" "$container_name" || return 78
  rm -f "$cid_file"
  [ "$INTERRUPTED" -eq 0 ] || return 130
  if run_interruptible docker create \
    --cidfile "$cid_file" \
    --name "$container_name" \
    --label "kimen.attempt=$ATTEMPT_ID" \
    --label "kimen.repo=$CLONE" \
    --label "kimen.phase=$phase" \
    "$@" >/dev/null; then
    create_rc=0
  else
    create_rc=$?
  fi
  if [ "$create_rc" -ne 0 ]; then
    return "$create_rc"
  fi
  CREATED_CID=$(read_secure_journal_file "$JOURNAL_DIR" "$cid_file") || return 78
  [ -n "$CREATED_CID" ] || return 78
  node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$ATTEMPT_ID" container-id "$phase" "$CREATED_CID" || return 78
}

start_journaled_container() {
  local phase=$1
  local cid=$2
  [ "$INTERRUPTED" -eq 0 ] || return 130
  node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$ATTEMPT_ID" container-running "$phase" || return 78
  run_interruptible docker start --attach "$cid"
}

finalize_and_exit() {
  local desired_rc=$1
  local finalizer_rc
  record_phase finalize running null
  set +e
  run_interruptible bash "$FINALIZER" --repo "$CLONE" --attempt-id "$ATTEMPT_ID"
  finalizer_rc=$?
  set -e
  if [ "$finalizer_rc" -eq 0 ] || [ "$finalizer_rc" -eq 1 ]; then
    validate_final_ref "$CLONE" "$ATTEMPT_ID" passed || exit 78
    validate_finalization_marker "$CLONE" "$ATTEMPT_ID" || exit 78
    node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$ATTEMPT_ID" finalized || exit 78
    LOCK_SAFE_TO_RELEASE=1
  else
    desired_rc=$finalizer_rc
  fi
  exit "$desired_rc"
}

IID_FILE="$JOURNAL_DIR/image-id"
set +e
run_interruptible docker build --iidfile "$IID_FILE" -f "$ROOT/sandbox/Dockerfile" "$ROOT/sandbox"
DOCKER_BUILD_RC=$?
set -e
if [ "$DOCKER_BUILD_RC" -ne 0 ]; then
  record_phase bootstrapFirewall failed "$DOCKER_BUILD_RC"
  finalize_and_exit "$DOCKER_BUILD_RC"
fi
IMAGE_ID=$(cat "$IID_FILE" 2>/dev/null || true)
[ -n "$IMAGE_ID" ] || {
  record_phase bootstrapFirewall failed 70
  finalize_and_exit 70
}
[ "$INTERRUPTED" -eq 0 ] || {
  record_phase bootstrapFirewall interrupted 130
  finalize_and_exit 130
}
set +e
run_interruptible docker image inspect "$IMAGE_ID" >/dev/null
IMAGE_INSPECT_RC=$?
set -e
if [ "$INTERRUPTED" -ne 0 ]; then
  record_phase bootstrapFirewall interrupted 130
  finalize_and_exit 130
fi
if [ "$IMAGE_INSPECT_RC" -ne 0 ]; then
  record_phase bootstrapFirewall failed "$IMAGE_INSPECT_RC"
  finalize_and_exit "$IMAGE_INSPECT_RC"
fi
node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$ATTEMPT_ID" image "$IMAGE_ID" || exit 78

BOOTSTRAP_CID_FILE="$JOURNAL_DIR/bootstrap.cid"
BOOTSTRAP_CONTAINER_EVIDENCE="$JOURNAL_DIR/bootstrap-evidence.json"
set +e
create_journaled_container bootstrap "$BOOTSTRAP_CID_FILE" \
  --user 0 \
  --cap-add NET_ADMIN --cap-add NET_RAW \
  --volume "$CLONE:/workspace" --workdir /workspace \
  --volume "$EVIDENCE_DIR:/workspace/.kimen/attempts:ro" \
  --env KIMEN_LOOP_PHASE=bootstrap \
  --env KIMEN_EGRESS_POLICY=registry-only \
  "$IMAGE_ID" \
  bash /usr/local/bin/phase-entry.sh bootstrap
BOOTSTRAP_CREATE_RC=$?
BOOTSTRAP_CID=$CREATED_CID
if [ "$BOOTSTRAP_CREATE_RC" -eq 0 ]; then
  start_journaled_container bootstrap "$BOOTSTRAP_CID"
  BOOTSTRAP_RC=$?
else
  BOOTSTRAP_RC=$BOOTSTRAP_CREATE_RC
fi
set -e
BOOTSTRAP_MILESTONES_OK=0
collect_container_evidence "$BOOTSTRAP_CID" "$BOOTSTRAP_CONTAINER_EVIDENCE" bootstrap && BOOTSTRAP_MILESTONES_OK=1
BOOTSTRAP_DESTROYED=0
destroy_journaled_container "$ATTEMPT_ID" "$CLONE" bootstrap "$JOURNAL_DIR" && BOOTSTRAP_DESTROYED=1
if [ "$BOOTSTRAP_MILESTONES_OK" -eq 1 ]; then
  IFS=$'\t' read -r BOOTSTRAP_FIREWALL_STATUS BOOTSTRAP_FIREWALL_RC <<< "$(milestone_value "$BOOTSTRAP_CONTAINER_EVIDENCE" firewall)"
  IFS=$'\t' read -r BOOTSTRAP_PROXY_STATUS BOOTSTRAP_PROXY_RC <<< "$(milestone_value "$BOOTSTRAP_CONTAINER_EVIDENCE" proxy)"
  IFS=$'\t' read -r BOOTSTRAP_CHILD_STATUS BOOTSTRAP_CHILD_RC <<< "$(milestone_value "$BOOTSTRAP_CONTAINER_EVIDENCE" childStarted)"
  record_phase bootstrapFirewall "$BOOTSTRAP_FIREWALL_STATUS" "$BOOTSTRAP_FIREWALL_RC"
  record_phase bootstrapProxy "$BOOTSTRAP_PROXY_STATUS" "$BOOTSTRAP_PROXY_RC"
else
  BOOTSTRAP_FIREWALL_STATUS=failed
  BOOTSTRAP_PROXY_STATUS=not-run
  BOOTSTRAP_CHILD_STATUS=not-run
  BOOTSTRAP_MISSING_RC=$BOOTSTRAP_RC
  [ "$BOOTSTRAP_MISSING_RC" -ne 0 ] || BOOTSTRAP_MISSING_RC=70
  record_phase bootstrapFirewall failed "$BOOTSTRAP_MISSING_RC"
  record_phase bootstrapProxy not-run null
fi
if [ "$BOOTSTRAP_RC" -ne 0 ] || [ "$BOOTSTRAP_MILESTONES_OK" -ne 1 ] ||
  [ "$BOOTSTRAP_DESTROYED" -ne 1 ] || [ "$BOOTSTRAP_FIREWALL_STATUS" != passed ] ||
  [ "$BOOTSTRAP_PROXY_STATUS" != passed ] || [ "$BOOTSTRAP_CHILD_STATUS" != passed ]; then
  BOOTSTRAP_FAILURE_RC=$BOOTSTRAP_RC
  [ "$BOOTSTRAP_FAILURE_RC" -ne 0 ] || BOOTSTRAP_FAILURE_RC=70
  if [ "$BOOTSTRAP_CHILD_STATUS" = passed ]; then
    record_phase install failed "$BOOTSTRAP_FAILURE_RC"
  else
    record_phase install not-run null
  fi
  record_phase browser not-run null
  [ "$BOOTSTRAP_DESTROYED" -eq 1 ] || exit 78
  finalize_and_exit "$BOOTSTRAP_FAILURE_RC"
fi
if [ "$INTERRUPTED" -eq 1 ]; then
  record_phase bootstrapFirewall interrupted 130
  finalize_and_exit 130
fi
for phase in install browser; do
  record_phase "$phase" passed 0
done

SECRET_DIR="$JOURNAL_DIR"
LEASE_FILE="$SECRET_DIR/model-lease.json"
LEASE_ID_FILE="$SECRET_DIR/model-lease.id"
node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$ATTEMPT_ID" lease-intent \
  "$LEASE_FILE" "$LEASE_ID_FILE" || exit 78
if [ "$INTERRUPTED" -ne 0 ]; then
  recover_operational_attempt "$JOURNAL_DIR" "$ATTEMPT_ID" "$CLONE" || exit 78
  finalize_and_exit 130
fi
node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$ATTEMPT_ID" lease-acquiring \
  "${KIMEN_AGENT_TIMEOUT_SECONDS:-3600}" || exit 78
LEASE_NOT_AFTER=$(journal_get "$ATTEMPT_ID" lease.leaseNotAfter) || exit 78
[[ "$LEASE_NOT_AFTER" =~ ^[0-9]+$ ]] || exit 78
set +e
run_interruptible env KIMEN_LEASE_NOT_AFTER_MS="$LEASE_NOT_AFTER" \
  bash "$LEASE_TOOL" acquire --output "$LEASE_FILE" \
  --not-after-ms "$LEASE_NOT_AFTER" > "$LEASE_ID_FILE"
ACQUIRE_RC=$?
set -e
set +e
LEASE_ID=$(read_secure_journal_file "$JOURNAL_DIR" "$LEASE_ID_FILE")
LEASE_ID_READ_RC=$?
set -e
if [ "$ACQUIRE_RC" -ne 0 ] || [ "$LEASE_ID_READ_RC" -ne 0 ] || [ -z "$LEASE_ID" ]; then
  if [ "$ACQUIRE_RC" -eq 0 ]; then
    ACQUIRE_RC=70
  fi
  if [ "$INTERRUPTED" -eq 1 ]; then
    record_phase leaseAcquire interrupted 130
  else
    record_phase leaseAcquire failed "$ACQUIRE_RC"
  fi
  set +e
  LEASE_ID=$(resolve_recovery_lease_id "$ATTEMPT_ID" "$JOURNAL_DIR")
  RESOLVE_ACQUIRE_RC=$?
  set -e
  if [ "$RESOLVE_ACQUIRE_RC" -eq 0 ] && [ -n "$LEASE_ID" ]; then
    node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$ATTEMPT_ID" lease-id "$LEASE_ID" || exit 78
    recover_operational_attempt "$JOURNAL_DIR" "$ATTEMPT_ID" "$CLONE" || exit 78
    finalize_and_exit "$ACQUIRE_RC"
  fi
  echo 'loop: lease acquisition outcome is unidentified; waiting for durable expiry or recovery' >&2
  exit 78
fi
node "$JOURNAL_TOOL" update "$JOURNAL_ROOT" "$ATTEMPT_ID" lease-id "$LEASE_ID" || exit 78
record_phase leaseAcquire passed 0
if [ "$INTERRUPTED" -eq 1 ]; then
  recover_operational_attempt "$JOURNAL_DIR" "$ATTEMPT_ID" "$CLONE" || exit 78
  finalize_and_exit 130
fi

set +e
AGENT_CID_FILE="$JOURNAL_DIR/agent.cid"
AGENT_CONTAINER_EVIDENCE="$JOURNAL_DIR/agent-evidence.json"
create_journaled_container agent "$AGENT_CID_FILE" \
  --user 0 \
  --cap-add NET_ADMIN --cap-add NET_RAW \
  --volume "$CLONE:/workspace" --workdir /workspace \
  --volume "$EVIDENCE_DIR:/workspace/.kimen/attempts:ro" \
  --volume "$LEASE_FILE:/run/kimen-host/lease.json:ro" \
  --env KIMEN_LOOP_PHASE=agent \
  --env KIMEN_EGRESS_POLICY=agent-allowlist \
  --env KIMEN_MODEL_LEASE_SOURCE=/run/kimen-host/lease.json \
  --env KIMEN_MODEL_LEASE_FILE=/run/kimen/model-lease.json \
  --env "KIMEN_TASK=$TASK" \
  "$IMAGE_ID" \
  bash /usr/local/bin/phase-entry.sh agent
AGENT_CREATE_RC=$?
AGENT_CID=$CREATED_CID
if [ "$AGENT_CREATE_RC" -eq 0 ]; then
  start_journaled_container agent "$AGENT_CID"
  AGENT_RC=$?
else
  AGENT_RC=$AGENT_CREATE_RC
fi
set -e
AGENT_MILESTONES_OK=0
collect_container_evidence "$AGENT_CID" "$AGENT_CONTAINER_EVIDENCE" agent && AGENT_MILESTONES_OK=1
if [ "$AGENT_MILESTONES_OK" -eq 1 ]; then
  IFS=$'\t' read -r AGENT_FIREWALL_STATUS AGENT_FIREWALL_RC <<< "$(milestone_value "$AGENT_CONTAINER_EVIDENCE" firewall)"
  IFS=$'\t' read -r AGENT_PROXY_STATUS AGENT_PROXY_RC <<< "$(milestone_value "$AGENT_CONTAINER_EVIDENCE" proxy)"
  IFS=$'\t' read -r AGENT_CHILD_STATUS AGENT_CHILD_RC <<< "$(milestone_value "$AGENT_CONTAINER_EVIDENCE" childStarted)"
  record_phase agentFirewall "$AGENT_FIREWALL_STATUS" "$AGENT_FIREWALL_RC"
  record_phase agentProxy "$AGENT_PROXY_STATUS" "$AGENT_PROXY_RC"
else
  AGENT_FIREWALL_STATUS=failed
  AGENT_PROXY_STATUS=not-run
  AGENT_CHILD_STATUS=not-run
  AGENT_MISSING_RC=$AGENT_RC
  [ "$AGENT_MISSING_RC" -ne 0 ] || AGENT_MISSING_RC=70
  record_phase agentFirewall failed "$AGENT_MISSING_RC"
  record_phase agentProxy not-run null
fi
if [ "$AGENT_CHILD_STATUS" = passed ]; then
  if [ "$INTERRUPTED" -eq 1 ]; then
    record_phase agent interrupted 130
  elif [ "$AGENT_RC" -eq 0 ]; then
    record_phase agent passed 0
  else
    record_phase agent failed "$AGENT_RC"
  fi
fi
AGENT_CONTAINMENT_RC=0
if [ "$AGENT_MILESTONES_OK" -ne 1 ] ||
  [ "$AGENT_FIREWALL_STATUS" != passed ] || [ "$AGENT_PROXY_STATUS" != passed ] ||
  [ "$AGENT_CHILD_STATUS" != passed ]; then
  AGENT_CONTAINMENT_RC=70
fi
set +e
recover_operational_attempt "$JOURNAL_DIR" "$ATTEMPT_ID" "$CLONE"
OPERATIONAL_RECOVERY_RC=$?
set -e
[ "$OPERATIONAL_RECOVERY_RC" -eq 0 ] || exit 78
AGENT_DESTROYED=1
REVOKE_RC=0

if [ "$INTERRUPTED" -eq 1 ]; then
  finalize_and_exit 130
fi
if [ "$REVOKE_RC" -ne 0 ]; then
  finalize_and_exit "$REVOKE_RC"
fi
if [ "$AGENT_CONTAINMENT_RC" -ne 0 ]; then
  finalize_and_exit "$AGENT_CONTAINMENT_RC"
fi

GATE_CID_FILE="$JOURNAL_DIR/gates.cid"
set +e
create_journaled_container gates "$GATE_CID_FILE" --network none \
  --user 0 \
  --volume "$CLONE:/workspace" --workdir /workspace \
  --volume "$EVIDENCE_DIR:/workspace/.kimen/attempts:ro" \
  --env KIMEN_LOOP_PHASE=gates \
  "$IMAGE_ID" \
  bash /usr/local/bin/phase-entry.sh gates
GATE_CREATE_RC=$?
GATE_CID=$CREATED_CID
if [ "$GATE_CREATE_RC" -eq 0 ]; then
  start_journaled_container gates "$GATE_CID"
  GATE_RC=$?
else
  GATE_RC=$GATE_CREATE_RC
fi
set -e
destroy_journaled_container "$ATTEMPT_ID" "$CLONE" gates "$JOURNAL_DIR" || exit 78
if [ "$INTERRUPTED" -eq 1 ]; then
  record_phase gates interrupted 130
  finalize_and_exit 130
elif [ "$GATE_RC" -eq 0 ]; then
  record_phase gates passed 0
else
  record_phase gates failed "$GATE_RC"
fi
finalize_and_exit "$GATE_RC"
