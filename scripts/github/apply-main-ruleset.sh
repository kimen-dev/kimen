#!/usr/bin/env bash
# Render/apply the desired main ruleset with live-observed actor/App IDs.
# Remote mutation is disabled by default; T087 performs it only after all local
# gates and a real clean-context-review check are green.
set -euo pipefail
umask 077
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
# shellcheck source=../gates/lib.sh
. scripts/gates/lib.sh

MODE="${1:---render}"
DESIRED=.github/rulesets/main.json
RULESET_NAME=kimen-protected-main
REVIEW_CONTEXT=clean-context-review
FOUNDER_LOGIN=MarsGotta
BREAK_GLASS_SCHEMA=kimen-break-glass-rollback-v1
BREAK_GLASS_CONFIRMATION=founder-opens-current-pr-only-bypass
BREAK_GLASS_MAX_SECONDS=600
BACKUP_DIR="${KIMEN_RULESET_BACKUP_DIR:-reports/rulesets}"
BACKUP_SCHEMA=kimen-ruleset-rollback-v1
CREATE_INTENT_SCHEMA=kimen-ruleset-create-intent-v1
WRITER_LOCK_SCHEMA=kimen-ruleset-writer-lock-v1
EXCLUSIVE_WRITER_CONFIRMATION=founder-confirms-exclusive-ruleset-writer
WRITER_LOCK=""
WRITER_LOCK_ADOPTED=false
WRITER_LOCK_DEVICE=""
WRITER_LOCK_HELD=false
WRITER_LOCK_INODE=""
WRITER_LOCK_STATE=""
EVIDENCE_CHAIN_SNAPSHOT=""

command -v jq >/dev/null || { echo "apply-main-ruleset: jq is required" >&2; exit 1; }
command -v node >/dev/null || { echo "apply-main-ruleset: node is required" >&2; exit 1; }

validate_repository() {
  printf '%s\n' "$1" | grep -Eq '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$' || {
    echo "apply-main-ruleset: invalid repository" >&2
    return 1
  }
}

require_github_access() {
  command -v gh >/dev/null || { echo "apply-main-ruleset: gh is required" >&2; return 1; }
  gh auth status >/dev/null
}

# GitHub's repository-ruleset REST PUT/DELETE endpoints do not document
# conditional If-Match/ETag writes. The local durable lock serializes only
# processes using this same BACKUP_DIR. The exact founder confirmation below
# asserts that the GitHub UI, every other admin/automation process and any
# external writer remain quiescent for the full mutation/rollback window.
# Without that operational single-writer condition, GET-before-write remains
# an unavoidable REST API TOCTOU limit and this script must not mutate.
require_exclusive_writer_confirmation() {
  if [ "${KIMEN_CONFIRM_EXCLUSIVE_RULESET_WRITER:-}" != "$EXCLUSIVE_WRITER_CONFIRMATION" ]; then
    echo "apply-main-ruleset: exact exclusive-writer confirmation missing; set KIMEN_CONFIRM_EXCLUSIVE_RULESET_WRITER=$EXCLUSIVE_WRITER_CONFIRMATION only after excluding GitHub UI, other admin/automation and external writers for the whole operation" >&2
    return 1
  fi
}

normalize_ruleset() {
  jq -S '{name,target,enforcement,bypass_actors,conditions,rules}' "$1"
}

json_files_equal() {
  local left
  local right
  local status=0

  left=$(mktemp) || return 1
  right=$(mktemp) || {
    rm -f "$left"
    return 1
  }
  jq -S . "$1" > "$left" || status=1
  jq -S . "$2" > "$right" || status=1
  if [ "$status" -eq 0 ] && ! diff -q "$left" "$right" >/dev/null; then
    status=1
  fi
  rm -f "$left" "$right"
  return "$status"
}

read_file_mode() {
  local path="$1"
  local mode

  if mode=$(stat -f '%Lp' "$path" 2>/dev/null); then
    :
  elif mode=$(stat -c '%a' "$path" 2>/dev/null); then
    :
  else
    return 1
  fi
  printf '%s\n' "$mode"
}

fsync_path() {
  local path="$1"

  node -e '
    const fs = require("node:fs");
    const fd = fs.openSync(process.argv[1], "r");
    try {
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
  ' "$path"
}

sync_evidence_pair() {
  local evidence="$1"

  fsync_path "$evidence" || return 1
  fsync_path "${evidence}.sha256" || return 1
  fsync_path "$(dirname "$evidence")" || return 1
}

assert_no_symlink_ancestors() {
  local path="$1"
  local parent
  local next

  parent=$(dirname "$path")
  while :; do
    if [ -L "$parent" ]; then
      echo "apply-main-ruleset: rollback backup has a symlink ancestor: $parent" >&2
      return 1
    fi
    next=$(dirname "$parent")
    [ "$next" != "$parent" ] || break
    parent="$next"
  done
}

read_path_facts() {
  local path="$1"

  if stat -f '%d|%i|%u|%Lp|%l|%z|%m' "$path" 2>/dev/null; then
    return 0
  fi
  stat -c '%d|%i|%u|%a|%h|%s|%Y' "$path" 2>/dev/null
}

build_secure_evidence_chain_snapshot() {
  node -e '
    const fs = require("node:fs");
    const path = require("node:path");
    const target = path.resolve(process.argv[1]);
    const currentUid = typeof process.getuid === "function" ? process.getuid() : -1;
    const paths = [];
    for (let cursor = target; ; cursor = path.dirname(cursor)) {
      paths.unshift(cursor);
      const parent = path.dirname(cursor);
      if (parent === cursor) break;
    }
    const snapshot = paths.map((entry) => {
      const stat = fs.lstatSync(entry);
      const mode = stat.mode & 0o7777;
      const writableByGroupOrWorld = (mode & 0o022) !== 0;
      const safeRootSticky = stat.uid === 0 && (mode & 0o1000) !== 0;
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw new Error(`evidence ancestor is not a regular directory: ${entry}`);
      }
      if (stat.uid !== 0 && stat.uid !== currentUid) {
        throw new Error(`evidence ancestor owner is neither root nor current UID: ${entry}`);
      }
      if (writableByGroupOrWorld && !safeRootSticky) {
        throw new Error(`evidence ancestor is group/world-writable without root sticky protection: ${entry}`);
      }
      return {
        path: entry,
        device: String(stat.dev),
        inode: String(stat.ino),
        uid: stat.uid,
        mode,
      };
    });
    process.stdout.write(JSON.stringify(snapshot));
  ' "$1"
}

assert_secure_evidence_chain_unchanged() {
  [ -n "$EVIDENCE_CHAIN_SNAPSHOT" ] || {
    echo "apply-main-ruleset: evidence ancestor-chain snapshot is missing" >&2
    return 1
  }
  node -e '
    const fs = require("node:fs");
    const snapshot = JSON.parse(process.argv[1]);
    const currentUid = typeof process.getuid === "function" ? process.getuid() : -1;
    for (const expected of snapshot) {
      const stat = fs.lstatSync(expected.path);
      const mode = stat.mode & 0o7777;
      const writableByGroupOrWorld = (mode & 0o022) !== 0;
      const safeRootSticky = stat.uid === 0 && (mode & 0o1000) !== 0;
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw new Error(`evidence ancestor changed type: ${expected.path}`);
      }
      if (stat.uid !== 0 && stat.uid !== currentUid) {
        throw new Error(`evidence ancestor owner changed: ${expected.path}`);
      }
      if (writableByGroupOrWorld && !safeRootSticky) {
        throw new Error(`evidence ancestor became unsafe-writable: ${expected.path}`);
      }
      if (
        String(stat.dev) !== expected.device ||
        String(stat.ino) !== expected.inode ||
        stat.uid !== expected.uid ||
        mode !== expected.mode
      ) {
        throw new Error(`evidence ancestor identity changed: ${expected.path}`);
      }
    }
  ' "$EVIDENCE_CHAIN_SNAPSHOT" || {
    echo "apply-main-ruleset: evidence ancestor chain changed; refusing operation" >&2
    return 1
  }
}

assert_secure_directory() {
  local directory="$1"
  local device
  local facts
  local inode
  local links
  local mode
  local mode_value
  local mtime
  local owner
  local size

  if [ -L "$directory" ] || [ ! -d "$directory" ]; then
    echo "apply-main-ruleset: evidence directory must be a regular non-symlink directory: $directory" >&2
    return 1
  fi
  assert_no_symlink_ancestors "$directory/.evidence" || return 1
  if ! facts=$(read_path_facts "$directory"); then
    echo "apply-main-ruleset: evidence directory metadata could not be read: $directory" >&2
    return 1
  fi
  IFS='|' read -r device inode owner mode links size mtime <<< "$facts"
  case "$owner:$mode" in
    *[!0-9:]* | :* | *:) echo "apply-main-ruleset: evidence directory metadata is invalid: $directory" >&2; return 1 ;;
  esac
  if [ "$owner" -ne "$(id -u)" ]; then
    echo "apply-main-ruleset: evidence directory owner is not the current process owner: $directory" >&2
    return 1
  fi
  mode_value=$((8#$mode))
  if [ $((mode_value & 8#077)) -ne 0 ]; then
    echo "apply-main-ruleset: evidence directory permissions must exclude group and world access: $directory" >&2
    return 1
  fi
}

prepare_secure_evidence_directory() {
  local cursor="$1"
  local directory="$1"
  local existing_ancestor
  local next

  assert_no_symlink_ancestors "$directory/.rollback-evidence" || return 1
  while [ ! -e "$cursor" ]; do
    next=$(dirname "$cursor")
    if [ "$next" = "$cursor" ]; then
      echo "apply-main-ruleset: no existing ancestor for evidence directory: $directory" >&2
      return 1
    fi
    cursor="$next"
  done
  existing_ancestor="$cursor"
  if [ -L "$existing_ancestor" ] || [ ! -d "$existing_ancestor" ]; then
    echo "apply-main-ruleset: evidence ancestor is not a regular directory: $existing_ancestor" >&2
    return 1
  fi
  if ! build_secure_evidence_chain_snapshot "$existing_ancestor" >/dev/null; then
    echo "apply-main-ruleset: evidence ancestor chain is unsafe before directory creation" >&2
    return 1
  fi
  if ! mkdir -p "$directory"; then
    echo "apply-main-ruleset: evidence directory could not be created: $directory" >&2
    return 1
  fi
  assert_no_symlink_ancestors "$directory/.rollback-evidence" || return 1
  assert_secure_directory "$directory" || return 1
  if ! EVIDENCE_CHAIN_SNAPSHOT=$(build_secure_evidence_chain_snapshot "$directory"); then
    echo "apply-main-ruleset: evidence ancestor chain is unsafe after directory creation" >&2
    return 1
  fi

  # Persist every directory entry created by mkdir -p, deepest first, then
  # the first ancestor that existed before mkdir. This makes the directory
  # chain itself durable before any remote POST/PUT/DELETE is attempted.
  cursor="$directory"
  while :; do
    if ! fsync_path "$cursor"; then
      echo "apply-main-ruleset: fsync could not persist evidence directory chain at $cursor" >&2
      return 1
    fi
    [ "$cursor" != "$existing_ancestor" ] || break
    cursor=$(dirname "$cursor")
  done
  assert_secure_evidence_chain_unchanged
}

canonical_existing_path() {
  node -e '
    const fs = require("node:fs");
    process.stdout.write(fs.realpathSync(process.argv[1]));
  ' "$1"
}

create_lock_state_staging() {
  local directory="$1"
  local state_json="$2"

  # O_EXCL|O_NOFOLLOW plus an fd write prevents a swapped final component from
  # clobbering an existing target. This is not openat-style directory
  # confinement: a same-UID directory swap can redirect creation of a fresh
  # random name, but the surrounding device/inode checks reject success.
  node -e '
    const crypto = require("node:crypto");
    const fs = require("node:fs");
    const path = require("node:path");
    const flags = fs.constants.O_CREAT | fs.constants.O_EXCL |
      fs.constants.O_WRONLY | (fs.constants.O_NOFOLLOW || 0);
    for (let attempt = 0; attempt < 128; attempt += 1) {
      const candidate = path.join(
        process.argv[1],
        `.state-staging-${process.pid}-${crypto.randomBytes(16).toString("hex")}`,
      );
      let fd;
      try {
        fd = fs.openSync(candidate, flags, 0o600);
      } catch (error) {
        if (error && error.code === "EEXIST") continue;
        throw error;
      }
      try {
        fs.writeFileSync(fd, `${process.argv[2]}\n`, "utf8");
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      process.stdout.write(candidate);
      process.exit(0);
    }
    throw new Error("could not allocate exclusive writer-lock state staging");
  ' "$directory" "$state_json"
}

capture_writer_lock_identity() {
  local device
  local facts
  local inode
  local links
  local mode
  local mode_value
  local mtime
  local owner
  local size

  if [ -L "$WRITER_LOCK" ] || [ ! -d "$WRITER_LOCK" ] ||
    ! facts=$(read_path_facts "$WRITER_LOCK"); then
    echo "apply-main-ruleset: exclusive-writer lock is not a readable regular directory: $WRITER_LOCK" >&2
    return 1
  fi
  IFS='|' read -r device inode owner mode links size mtime <<< "$facts"
  case "$device:$inode:$owner:$mode" in
    *[!0-9:]* | :* | *:) echo "apply-main-ruleset: exclusive-writer lock metadata is invalid" >&2; return 1 ;;
  esac
  mode_value=$((8#$mode))
  if [ "$owner" -ne "$(id -u)" ] || [ "$mode_value" -ne $((8#700)) ]; then
    echo "apply-main-ruleset: exclusive-writer lock owner/mode must be current-UID/0700" >&2
    return 1
  fi
  WRITER_LOCK_DEVICE="$device"
  WRITER_LOCK_INODE="$inode"
}

assert_writer_lock_identity() {
  local device
  local facts
  local inode
  local links
  local mode
  local mode_value
  local mtime
  local owner
  local size

  if [ -z "$WRITER_LOCK_DEVICE" ] || [ -z "$WRITER_LOCK_INODE" ] ||
    [ -L "$WRITER_LOCK" ] || [ ! -d "$WRITER_LOCK" ] ||
    ! facts=$(read_path_facts "$WRITER_LOCK"); then
    echo "apply-main-ruleset: CRITICAL — exclusive-writer lock identity is unavailable or changed: $WRITER_LOCK" >&2
    return 1
  fi
  IFS='|' read -r device inode owner mode links size mtime <<< "$facts"
  case "$device:$inode:$owner:$mode" in
    *[!0-9:]* | :* | *:) echo "apply-main-ruleset: CRITICAL — exclusive-writer lock metadata changed" >&2; return 1 ;;
  esac
  mode_value=$((8#$mode))
  if [ "$device" != "$WRITER_LOCK_DEVICE" ] || [ "$inode" != "$WRITER_LOCK_INODE" ] ||
    [ "$owner" -ne "$(id -u)" ] || [ "$mode_value" -ne $((8#700)) ]; then
    echo "apply-main-ruleset: CRITICAL — exclusive-writer lock device/inode/owner/mode changed; refusing cleanup or adoption" >&2
    return 1
  fi
}

set_writer_lock_state() {
  local state="$1"
  local operation="${2:-}"
  local recovery_kind="${3:-}"
  local evidence="${4:-}"
  local digest_source="${5:-$evidence}"
  local evidence_digest=""
  local evidence_path=""
  local staging
  local state_json
  local state_path="$WRITER_LOCK/state.json"

  [ "$WRITER_LOCK_HELD" = true ] || return 1
  WRITER_LOCK_STATE=transitioning
  assert_secure_evidence_chain_unchanged || return 1
  assert_writer_lock_identity || return 1
  case "$state" in
    releasable)
      operation=""
      recovery_kind=""
      evidence=""
      ;;
    mutating | recovery-ready)
      [ -n "$operation" ] && [ -n "$recovery_kind" ] && [ -n "$evidence" ] || {
        echo "apply-main-ruleset: writer-lock state $state requires an operation and exact recovery evidence" >&2
        return 1
      }
      assert_secure_evidence_file "$evidence" || return 1
      evidence_path=$(canonical_existing_path "$evidence") || return 1
      evidence_digest=$(kimen_sha256 "$digest_source") || return 1
      ;;
    *)
      echo "apply-main-ruleset: invalid writer-lock state: $state" >&2
      return 1
      ;;
  esac

  if ! state_json=$(jq -c -S -n \
    --arg schema "$WRITER_LOCK_SCHEMA" \
    --arg repository "$REPOSITORY" \
    --arg ruleset_name "$RULESET_NAME" \
    --arg device "$WRITER_LOCK_DEVICE" \
    --arg inode "$WRITER_LOCK_INODE" \
    --arg state "$state" \
    --arg operation "$operation" \
    --arg recovery_kind "$recovery_kind" \
    --arg evidence_path "$evidence_path" \
    --arg evidence_digest "$evidence_digest" '
      {
        schemaVersion: $schema,
        repository: $repository,
        rulesetName: $ruleset_name,
        lockDevice: $device,
        lockInode: $inode,
        state: $state,
        operation: (if $operation == "" then null else $operation end),
        recoveryKind: (if $recovery_kind == "" then null else $recovery_kind end),
        evidencePath: (if $evidence_path == "" then null else $evidence_path end),
        evidenceSha256: (if $evidence_digest == "" then null else $evidence_digest end)
      }
    '); then
    return 1
  fi
  assert_secure_evidence_chain_unchanged || return 1
  assert_writer_lock_identity || return 1
  if ! staging=$(create_lock_state_staging "$WRITER_LOCK" "$state_json"); then
    echo "apply-main-ruleset: writer-lock state staging could not be created exclusively" >&2
    return 1
  fi
  if ! assert_secure_evidence_chain_unchanged || ! assert_writer_lock_identity ||
    ! assert_secure_evidence_file "$staging" ||
    ! mv -f "$staging" "$state_path" || ! fsync_path "$state_path" ||
    ! fsync_path "$WRITER_LOCK" || ! assert_secure_evidence_chain_unchanged ||
    ! assert_writer_lock_identity; then
    rm -f "$staging"
    echo "apply-main-ruleset: writer-lock state transition could not be persisted; lock retained fail-closed" >&2
    return 1
  fi
  WRITER_LOCK_STATE="$state"
  if [ "$state" = recovery-ready ] && [ "$WRITER_LOCK_ADOPTED" = true ]; then
    if [ -L "$WRITER_LOCK/.recovery-adoption" ] ||
      [ ! -d "$WRITER_LOCK/.recovery-adoption" ] ||
      ! rmdir "$WRITER_LOCK/.recovery-adoption" ||
      ! fsync_path "$WRITER_LOCK" || ! assert_secure_evidence_chain_unchanged ||
      ! assert_writer_lock_identity; then
      WRITER_LOCK_STATE=transitioning
      echo "apply-main-ruleset: recovery adoption could not be closed; lock requires manual inspection" >&2
      return 1
    fi
    WRITER_LOCK_ADOPTED=false
  fi
}

validate_recovery_writer_lock() {
  local recovery_kind="$1"
  local evidence="$2"
  local frozen_evidence="$3"
  local evidence_digest
  local evidence_path
  local lock_device
  local lock_inode
  local state_path="$WRITER_LOCK/state.json"

  assert_secure_directory "$WRITER_LOCK" || return 1
  assert_secure_evidence_file "$state_path" || return 1
  if ! jq -e -s \
    --arg schema "$WRITER_LOCK_SCHEMA" \
    --arg repository "$REPOSITORY" \
    --arg ruleset_name "$RULESET_NAME" \
    --arg recovery_kind "$recovery_kind" '
      length == 1 and
      (.[0] |
        type == "object" and
        (keys == [
          "evidencePath",
          "evidenceSha256",
          "lockDevice",
          "lockInode",
          "operation",
          "recoveryKind",
          "repository",
          "rulesetName",
          "schemaVersion",
          "state"
        ]) and
        .schemaVersion == $schema and
        .repository == $repository and
        .rulesetName == $ruleset_name and
        .state == "recovery-ready" and
        .recoveryKind == $recovery_kind and
        (.operation | type == "string" and length > 0) and
        (.lockDevice | type == "string" and test("^[0-9]+$")) and
        (.lockInode | type == "string" and test("^[0-9]+$")) and
        (.evidencePath | type == "string" and length > 0) and
        (.evidenceSha256 | type == "string" and test("^[0-9a-f]{64}$")))
    ' "$state_path" >/dev/null 2>&1; then
    echo "apply-main-ruleset: existing writer lock is not recovery-ready for $recovery_kind" >&2
    return 1
  fi
  lock_device=$(jq -er -s '.[0].lockDevice' "$state_path") || return 1
  lock_inode=$(jq -er -s '.[0].lockInode' "$state_path") || return 1
  WRITER_LOCK_DEVICE="$lock_device"
  WRITER_LOCK_INODE="$lock_inode"
  assert_writer_lock_identity || return 1
  evidence_path=$(canonical_existing_path "$evidence") || return 1
  evidence_digest=$(kimen_sha256 "$frozen_evidence") || return 1
  if ! jq -e -s \
    --arg path "$evidence_path" \
    --arg digest "$evidence_digest" '
      length == 1 and .[0].evidencePath == $path and .[0].evidenceSha256 == $digest
    ' "$state_path" >/dev/null 2>&1; then
    echo "apply-main-ruleset: recovery evidence path/digest does not match the retained writer lock" >&2
    return 1
  fi
}

acquire_exclusive_writer_lock() {
  WRITER_LOCK="$BACKUP_DIR/.exclusive-writer.lock"
  WRITER_LOCK_ADOPTED=false
  assert_secure_evidence_chain_unchanged || return 1
  if [ -e "$WRITER_LOCK" ] || [ -L "$WRITER_LOCK" ]; then
    echo "apply-main-ruleset: exclusive-writer lock already exists; use exact --claim-create/--rollback recovery evidence when it is recovery-ready, or remove it manually only after proving no writer is live: $WRITER_LOCK" >&2
    return 1
  fi
  if ! mkdir "$WRITER_LOCK"; then
    echo "apply-main-ruleset: exclusive-writer lock could not be acquired: $WRITER_LOCK" >&2
    return 1
  fi
  if ! assert_secure_evidence_chain_unchanged || ! assert_secure_directory "$WRITER_LOCK" ||
    ! fsync_path "$WRITER_LOCK" || ! fsync_path "$BACKUP_DIR" ||
    ! capture_writer_lock_identity; then
    echo "apply-main-ruleset: exclusive-writer lock could not be made durable; it is retained fail-closed for manual inspection: $WRITER_LOCK" >&2
    return 1
  fi
  WRITER_LOCK_HELD=true
  if ! set_writer_lock_state releasable; then
    echo "apply-main-ruleset: exclusive-writer lock has no durable releasable state and is retained for manual inspection" >&2
    return 1
  fi
}

acquire_or_adopt_recovery_lock() {
  local recovery_kind="$1"
  local evidence="$2"
  local frozen_evidence="$3"
  local adoption="$BACKUP_DIR/.exclusive-writer.lock/.recovery-adoption"

  # Only a normal error path can publish recovery-ready after reconciling as
  # far as the API permits. A process death while state is mutating deliberately
  # leaves a non-adoptable lock: the founder must prove the process is gone and
  # inspect remote state plus the exact evidence before manual lock removal.
  WRITER_LOCK="$BACKUP_DIR/.exclusive-writer.lock"
  assert_secure_evidence_chain_unchanged || return 1
  if [ ! -e "$WRITER_LOCK" ] && [ ! -L "$WRITER_LOCK" ]; then
    acquire_exclusive_writer_lock
    return
  fi
  if ! validate_recovery_writer_lock "$recovery_kind" "$evidence" "$frozen_evidence"; then
    echo "apply-main-ruleset: refusing to adopt retained writer lock with unrelated or unsafe evidence" >&2
    return 1
  fi
  if [ -e "$adoption" ] || [ -L "$adoption" ] || ! mkdir "$adoption"; then
    echo "apply-main-ruleset: retained writer lock is already being adopted or needs manual inspection" >&2
    return 1
  fi
  if ! fsync_path "$adoption" || ! fsync_path "$WRITER_LOCK" ||
    ! assert_secure_evidence_chain_unchanged || ! assert_writer_lock_identity; then
    echo "apply-main-ruleset: recovery adoption could not be persisted; lock retained fail-closed" >&2
    return 1
  fi
  WRITER_LOCK_HELD=true
  WRITER_LOCK_ADOPTED=true
  WRITER_LOCK_STATE=recovery-ready
  if ! set_writer_lock_state mutating "recovery-adoption:$recovery_kind" \
    "$recovery_kind" "$evidence" "$frozen_evidence"; then
    echo "apply-main-ruleset: recovery adoption state could not be persisted; manual inspection required" >&2
    return 1
  fi
}

release_exclusive_writer_lock() {
  local adoption
  local state_path

  if [ "$WRITER_LOCK_HELD" != true ]; then
    return 0
  fi
  if [ "$WRITER_LOCK_STATE" != releasable ]; then
    echo "apply-main-ruleset: writer lock remains $WRITER_LOCK_STATE and is retained fail-closed for exact recovery: $WRITER_LOCK" >&2
    return 1
  fi
  assert_secure_evidence_chain_unchanged || return 1
  assert_writer_lock_identity || return 1
  state_path="$WRITER_LOCK/state.json"
  assert_secure_evidence_file "$state_path" || return 1
  if ! jq -e -s \
    --arg schema "$WRITER_LOCK_SCHEMA" \
    --arg repository "$REPOSITORY" \
    --arg ruleset_name "$RULESET_NAME" \
    --arg device "$WRITER_LOCK_DEVICE" \
    --arg inode "$WRITER_LOCK_INODE" '
      length == 1 and
      (.[0] |
        .schemaVersion == $schema and
        .repository == $repository and
        .rulesetName == $ruleset_name and
        .lockDevice == $device and
        .lockInode == $inode and
        .state == "releasable" and
        .operation == null and
        .recoveryKind == null and
        .evidencePath == null and
        .evidenceSha256 == null)
    ' "$state_path" >/dev/null 2>&1; then
    echo "apply-main-ruleset: CRITICAL — releasable writer-lock state is invalid; retaining lock" >&2
    return 1
  fi
  adoption="$WRITER_LOCK/.recovery-adoption"
  if [ -e "$adoption" ] || [ -L "$adoption" ]; then
    if [ -L "$adoption" ] || [ ! -d "$adoption" ] || ! rmdir "$adoption"; then
      echo "apply-main-ruleset: CRITICAL — recovery-adoption marker changed or is not empty; retaining lock" >&2
      return 1
    fi
  fi
  if ! assert_secure_evidence_chain_unchanged || ! assert_writer_lock_identity ||
    ! rm -f "$state_path" || ! fsync_path "$WRITER_LOCK" ||
    ! assert_secure_evidence_chain_unchanged || ! assert_writer_lock_identity ||
    ! rmdir "$WRITER_LOCK" || ! assert_secure_evidence_chain_unchanged; then
    echo "apply-main-ruleset: CRITICAL — exclusive-writer lock could not be released and remains fail-closed: $WRITER_LOCK" >&2
    return 1
  fi
  WRITER_LOCK_HELD=false
  WRITER_LOCK_STATE=""
  if ! fsync_path "$BACKUP_DIR"; then
    echo "apply-main-ruleset: CRITICAL — exclusive-writer lock removal could not be persisted" >&2
    return 1
  fi
}

assert_secure_evidence_file() {
  local evidence="$1"
  local facts
  local device
  local inode
  local links
  local mode
  local mtime
  local owner
  local size

  if [ -L "$evidence" ] || [ ! -f "$evidence" ]; then
    echo "apply-main-ruleset: evidence must be a regular non-symlink file: $evidence" >&2
    return 1
  fi
  assert_no_symlink_ancestors "$evidence" || return 1
  assert_secure_directory "$(dirname "$evidence")" || return 1
  if ! facts=$(read_path_facts "$evidence"); then
    echo "apply-main-ruleset: evidence metadata could not be read: $evidence" >&2
    return 1
  fi
  IFS='|' read -r device inode owner mode links size mtime <<< "$facts"
  case "$owner:$mode:$links" in
    *[!0-9:]* | :* | *:) echo "apply-main-ruleset: evidence metadata is invalid: $evidence" >&2; return 1 ;;
  esac
  if [ "$owner" -ne "$(id -u)" ] || [ $((8#$mode)) -ne $((8#600)) ]; then
    echo "apply-main-ruleset: evidence owner/mode must be current-UID/0600: $evidence" >&2
    return 1
  fi
  if [ "$links" -ne 1 ]; then
    echo "apply-main-ruleset: evidence hardlinks are forbidden (link count $links): $evidence" >&2
    return 1
  fi
}

make_private_snapshot_directory() {
  local directory

  if ! directory=$(mktemp -d); then
    return 1
  fi
  if ! (CDPATH= cd "$directory" && pwd -P); then
    rm -rf "$directory"
    return 1
  fi
}

freeze_evidence_pair() {
  local evidence="$1"
  local snapshot_directory="$2"
  local actual_digest
  local after_evidence
  local after_sidecar
  local before_evidence
  local before_sidecar
  local expected_digest
  local sidecar="${evidence}.sha256"
  local snapshot="$snapshot_directory/evidence.json"
  local snapshot_sidecar="${snapshot}.sha256"

  # The sidecar and private snapshot detect corruption and later path swaps.
  # They are not a signature: a same-UID attacker controlling both source files
  # before this snapshot can forge both, which is the documented trust limit.
  FROZEN_EVIDENCE_PATH=""
  assert_secure_evidence_file "$evidence" || return 1
  assert_secure_evidence_file "$sidecar" || return 1
  assert_secure_directory "$snapshot_directory" || return 1
  before_evidence=$(read_path_facts "$evidence") || return 1
  before_sidecar=$(read_path_facts "$sidecar") || return 1
  if ! cp "$evidence" "$snapshot" || ! cp "$sidecar" "$snapshot_sidecar"; then
    rm -f "$snapshot" "$snapshot_sidecar"
    echo "apply-main-ruleset: evidence could not be copied into the process-owned snapshot" >&2
    return 1
  fi
  if ! chmod 600 "$snapshot" "$snapshot_sidecar"; then
    rm -f "$snapshot" "$snapshot_sidecar"
    return 1
  fi
  after_evidence=$(read_path_facts "$evidence") || return 1
  after_sidecar=$(read_path_facts "$sidecar") || return 1
  if [ "$before_evidence" != "$after_evidence" ] || [ "$before_sidecar" != "$after_sidecar" ]; then
    rm -f "$snapshot" "$snapshot_sidecar"
    echo "apply-main-ruleset: evidence changed while it was being frozen" >&2
    return 1
  fi
  if [ "$(wc -l < "$snapshot_sidecar" | tr -d ' ')" -ne 1 ] ||
    ! grep -Eq '^[0-9a-f]{64}$' "$snapshot_sidecar"; then
    rm -f "$snapshot" "$snapshot_sidecar"
    echo "apply-main-ruleset: evidence sidecar is invalid" >&2
    return 1
  fi
  expected_digest=$(sed -n '1p' "$snapshot_sidecar") || return 1
  actual_digest=$(kimen_sha256 "$snapshot") || return 1
  if [ "$actual_digest" != "$expected_digest" ]; then
    rm -f "$snapshot" "$snapshot_sidecar"
    echo "apply-main-ruleset: evidence bytes do not match the process sidecar digest" >&2
    return 1
  fi
  FROZEN_EVIDENCE_PATH="$snapshot"
}

validate_rollback_backup() {
  local backup="$1"
  local actual_digest
  local expected_digest
  local mode
  local unsigned

  if [ -z "$backup" ] || [ -L "$backup" ] || [ ! -f "$backup" ]; then
    echo "apply-main-ruleset: rollback backup must be a regular non-symlink file" >&2
    return 1
  fi
  assert_no_symlink_ancestors "$backup" || return 1
  if ! mode=$(read_file_mode "$backup") || [ "$mode" != "600" ]; then
    echo "apply-main-ruleset: rollback backup must have mode 0600" >&2
    return 1
  fi
  if ! jq -e -s \
    --arg schema "$BACKUP_SCHEMA" \
    --arg repository "$REPOSITORY" \
    --arg ruleset_name "$RULESET_NAME" '
      length == 1 and
      (.[0] |
        type == "object" and
        (keys == [
          "expectedForwardPayload",
          "integritySha256",
          "operation",
          "payload",
          "repository",
          "rulesetId",
          "rulesetName",
          "schemaVersion"
        ]) and
        .schemaVersion == $schema and
        .repository == $repository and
        .rulesetName == $ruleset_name and
        (.rulesetId |
          type == "number" and . == floor and . > 0 and . <= 9007199254740991) and
        (.operation == "created" or .operation == "updated") and
        (.integritySha256 | type == "string" and test("^[0-9a-f]{64}$")) and
        (.payload |
          type == "object" and
          (keys == ["bypass_actors", "conditions", "enforcement", "name", "rules", "target"]) and
          .name == $ruleset_name and
          .target == "branch" and
          (.enforcement == "active" or .enforcement == "disabled" or .enforcement == "evaluate") and
          (.bypass_actors | type == "array") and
          (.conditions | type == "object") and
          (.rules | type == "array")) and
        (.expectedForwardPayload |
          type == "object" and
          (keys == ["bypass_actors", "conditions", "enforcement", "name", "rules", "target"]) and
          .name == $ruleset_name and
          .target == "branch" and
          (.enforcement == "active" or .enforcement == "disabled" or .enforcement == "evaluate") and
          (.bypass_actors | type == "array") and
          (.conditions | type == "object") and
          (.rules | type == "array")) and
        (.operation == "updated" or
          (.payload.enforcement == "disabled" and .payload == .expectedForwardPayload)))
    ' "$backup" >/dev/null 2>&1; then
    echo "apply-main-ruleset: rollback backup schema or repository/ruleset binding is invalid" >&2
    return 1
  fi

  if ! unsigned=$(mktemp); then
    return 1
  fi
  if ! jq -S -s '.[0] | del(.integritySha256)' "$backup" > "$unsigned"; then
    rm -f "$unsigned"
    echo "apply-main-ruleset: rollback backup could not be canonicalized" >&2
    return 1
  fi
  if ! actual_digest=$(kimen_sha256 "$unsigned"); then
    rm -f "$unsigned"
    return 1
  fi
  rm -f "$unsigned"
  if ! expected_digest=$(jq -er -s '.[0].integritySha256' "$backup"); then
    return 1
  fi
  if [ "$actual_digest" != "$expected_digest" ]; then
    echo "apply-main-ruleset: rollback backup integrity mismatch" >&2
    return 1
  fi
}

validate_creation_intent() {
  local intent="$1"
  local expected_payload="$2"
  local actual_digest
  local expected_digest
  local intent_payload
  local normalized_expected
  local unsigned

  if ! jq -e -s \
    --arg schema "$CREATE_INTENT_SCHEMA" \
    --arg repository "$REPOSITORY" \
    --arg ruleset_name "$RULESET_NAME" '
      length == 1 and
      (.[0] |
        type == "object" and
        (keys == [
          "integritySha256",
          "operation",
          "payload",
          "repository",
          "rulesetName",
          "schemaVersion"
        ]) and
        .schemaVersion == $schema and
        .repository == $repository and
        .rulesetName == $ruleset_name and
        .operation == "create" and
        (.integritySha256 | type == "string" and test("^[0-9a-f]{64}$")) and
        (.payload | type == "object" and .name == $ruleset_name))
    ' "$intent" >/dev/null 2>&1; then
    echo "apply-main-ruleset: create-intent schema or binding is invalid" >&2
    return 1
  fi

  if ! unsigned=$(mktemp) || ! intent_payload=$(mktemp) || ! normalized_expected=$(mktemp); then
    rm -f "${intent_payload:-}" "${normalized_expected:-}" "${unsigned:-}"
    return 1
  fi
  if ! jq -S -s '.[0] | del(.integritySha256)' "$intent" > "$unsigned" ||
    ! actual_digest=$(kimen_sha256 "$unsigned") ||
    ! expected_digest=$(jq -er -s '.[0].integritySha256' "$intent"); then
    rm -f "$intent_payload" "$normalized_expected" "$unsigned"
    return 1
  fi
  if [ "$actual_digest" != "$expected_digest" ]; then
    rm -f "$intent_payload" "$normalized_expected" "$unsigned"
    echo "apply-main-ruleset: create-intent integrity mismatch" >&2
    return 1
  fi
  if ! jq -S -s '.[0].payload' "$intent" > "$intent_payload" ||
    ! jq -S . "$expected_payload" > "$normalized_expected"; then
    rm -f "$intent_payload" "$normalized_expected" "$unsigned"
    return 1
  fi
  rm -f "$unsigned"
  if ! diff -u "$normalized_expected" "$intent_payload"; then
    rm -f "$intent_payload" "$normalized_expected"
    echo "apply-main-ruleset: create-intent payload does not match the POST payload" >&2
    return 1
  fi
  rm -f "$intent_payload" "$normalized_expected"
}

write_evidence_sidecar() {
  local evidence="$1"
  local digest
  local sidecar="${evidence}.sha256"
  local staging

  if ! digest=$(kimen_sha256 "$evidence"); then
    return 1
  fi
  if ! staging=$(mktemp "${sidecar}.staging-XXXXXX"); then
    return 1
  fi
  if ! printf '%s\n' "$digest" > "$staging" || ! chmod 600 "$staging"; then
    rm -f "$staging"
    return 1
  fi
  if ! ln "$staging" "$sidecar"; then
    rm -f "$staging"
    return 1
  fi
  rm -f "$staging"
}

create_rollback_backup() {
  local operation="$1"
  local ruleset_id="$2"
  local payload="$3"
  local expected_forward_payload="$4"
  local backup
  local digest
  local unsigned

  if ! unsigned=$(mktemp); then
    echo "apply-main-ruleset: could not allocate rollback evidence staging" >&2
    return 1
  fi
  if ! backup=$(mktemp "$BACKUP_DIR/main-before-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX"); then
    rm -f "$unsigned"
    echo "apply-main-ruleset: could not allocate rollback backup" >&2
    return 1
  fi
  if ! jq -S \
    --arg schema "$BACKUP_SCHEMA" \
    --arg repository "$REPOSITORY" \
    --arg ruleset_name "$RULESET_NAME" \
    --arg operation "$operation" \
    --slurpfile expected_forward "$expected_forward_payload" \
    --argjson ruleset_id "$ruleset_id" '
      {
        schemaVersion: $schema,
        repository: $repository,
        rulesetName: $ruleset_name,
        rulesetId: $ruleset_id,
        operation: $operation,
        payload: .,
        expectedForwardPayload: $expected_forward[0]
      }
    ' "$payload" > "$unsigned"; then
    rm -f "$backup" "$unsigned"
    return 1
  fi
  if ! digest=$(kimen_sha256 "$unsigned"); then
    rm -f "$backup" "$unsigned"
    return 1
  fi
  if ! jq -S --arg digest "$digest" '. + {integritySha256: $digest}' "$unsigned" > "$backup"; then
    rm -f "$backup" "$unsigned"
    return 1
  fi
  rm -f "$unsigned"
  chmod 600 "$backup"
  if ! write_evidence_sidecar "$backup" || ! sync_evidence_pair "$backup"; then
    rm -f "$backup" "${backup}.sha256"
    return 1
  fi
  printf '%s\n' "$backup"
}

create_break_glass_backup() {
  local ruleset_id="$1"
  local payload="$2"
  local expected_forward_payload="$3"
  local pull_request="$4"
  local head_sha="$5"
  local founder_user_id="$6"
  local restoration_issue_number="$7"
  local restoration_issue_url="$8"
  local request_payload_sha256="$9"
  local opened_at="${10}"
  local deadline="${11}"
  local backup
  local digest
  local unsigned

  unsigned=$(mktemp) || return 1
  backup=$(mktemp "$BACKUP_DIR/break-glass-pr-${pull_request}-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX") || {
    rm -f "$unsigned"
    return 1
  }
  jq -S \
    --arg schema "$BREAK_GLASS_SCHEMA" \
    --arg repository "$REPOSITORY" \
    --arg ruleset_name "$RULESET_NAME" \
    --arg founder_login "$FOUNDER_LOGIN" \
    --arg head_sha "$head_sha" \
    --arg restoration_issue_url "$restoration_issue_url" \
    --arg request_payload_sha256 "$request_payload_sha256" \
    --argjson ruleset_id "$ruleset_id" \
    --argjson pull_request "$pull_request" \
    --argjson founder_user_id "$founder_user_id" \
    --argjson restoration_issue_number "$restoration_issue_number" \
    --argjson opened_at "$opened_at" \
    --argjson deadline "$deadline" \
    --slurpfile expected_forward "$expected_forward_payload" '
      {
        schemaVersion: $schema,
        repository: $repository,
        rulesetName: $ruleset_name,
        rulesetId: $ruleset_id,
        operation: "updated",
        payload: .,
        expectedForwardPayload: $expected_forward[0],
        breakGlass: {
          pullRequest: $pull_request,
          headSha: $head_sha,
          founderLogin: $founder_login,
          founderUserId: $founder_user_id,
          restorationIssueNumber: $restoration_issue_number,
          restorationIssueUrl: $restoration_issue_url,
          requestPayloadSha256: $request_payload_sha256,
          openedAtEpochSeconds: $opened_at,
          deadlineEpochSeconds: $deadline
        }
      }
    ' "$payload" > "$unsigned" || {
    rm -f "$backup" "$unsigned"
    return 1
  }
  digest=$(kimen_sha256 "$unsigned") || {
    rm -f "$backup" "$unsigned"
    return 1
  }
  jq -S --arg digest "$digest" '. + {integritySha256: $digest}' "$unsigned" > "$backup" || {
    rm -f "$backup" "$unsigned"
    return 1
  }
  rm -f "$unsigned"
  chmod 600 "$backup"
  if ! write_evidence_sidecar "$backup" || ! sync_evidence_pair "$backup"; then
    rm -f "$backup" "${backup}.sha256"
    return 1
  fi
  printf '%s\n' "$backup"
}

validate_break_glass_backup() {
  local backup="$1"
  local actual_digest
  local expected_digest
  local mode
  local unsigned

  if [ -z "$backup" ] || [ -L "$backup" ] || [ ! -f "$backup" ]; then
    echo "apply-main-ruleset: break-glass evidence must be a regular non-symlink file" >&2
    return 1
  fi
  assert_no_symlink_ancestors "$backup" || return 1
  mode=$(read_file_mode "$backup") || return 1
  if [ "$mode" != "600" ]; then
    echo "apply-main-ruleset: break-glass evidence must have mode 0600" >&2
    return 1
  fi
  if ! jq -e -s \
    --arg schema "$BREAK_GLASS_SCHEMA" \
    --arg repository "$REPOSITORY" \
    --arg ruleset_name "$RULESET_NAME" \
    --arg founder_login "$FOUNDER_LOGIN" \
    --arg max_seconds "$BREAK_GLASS_MAX_SECONDS" '
      length == 1 and
      (.[0] |
        type == "object" and
        (keys == [
          "breakGlass",
          "expectedForwardPayload",
          "integritySha256",
          "operation",
          "payload",
          "repository",
          "rulesetId",
          "rulesetName",
          "schemaVersion"
        ]) and
        .schemaVersion == $schema and
        .repository == $repository and
        .rulesetName == $ruleset_name and
        .operation == "updated" and
        (.rulesetId | type == "number" and . == floor and . > 0) and
        (.integritySha256 | type == "string" and test("^[0-9a-f]{64}$")) and
        .payload as $prior |
        .expectedForwardPayload as $forward |
        .breakGlass as $bg |
        ($prior | type == "object" and keys == ["bypass_actors", "conditions", "enforcement", "name", "rules", "target"]) and
        ($forward | type == "object" and keys == ["bypass_actors", "conditions", "enforcement", "name", "rules", "target"]) and
        $prior.name == $ruleset_name and
        $prior.target == "branch" and
        $prior.enforcement == "active" and
        $prior.bypass_actors == [] and
        (($forward | .bypass_actors = []) == $prior) and
        ($bg | type == "object" and keys == [
          "deadlineEpochSeconds",
          "founderLogin",
          "founderUserId",
          "headSha",
          "openedAtEpochSeconds",
          "pullRequest",
          "requestPayloadSha256",
          "restorationIssueNumber",
          "restorationIssueUrl"
        ]) and
        ($bg.pullRequest | type == "number" and . == floor and . > 0) and
        ($bg.headSha | type == "string" and test("^[0-9a-f]{40}$")) and
        $bg.founderLogin == $founder_login and
        ($bg.founderUserId | type == "number" and . == floor and . > 0) and
        ($bg.restorationIssueNumber | type == "number" and . == floor and . > 0) and
        $bg.restorationIssueUrl == ("https://github.com/" + $repository + "/issues/" + ($bg.restorationIssueNumber | tostring)) and
        ($bg.requestPayloadSha256 | type == "string" and test("^[0-9a-f]{64}$")) and
        ($bg.openedAtEpochSeconds | type == "number" and . == floor and . > 0) and
        ($bg.deadlineEpochSeconds | type == "number" and . == floor) and
        ($bg.deadlineEpochSeconds > $bg.openedAtEpochSeconds) and
        (($bg.deadlineEpochSeconds - $bg.openedAtEpochSeconds) <= ($max_seconds | tonumber)) and
        $forward.bypass_actors == [{
          actor_id: $bg.founderUserId,
          actor_type: "User",
          bypass_mode: "pull_request"
        }])
    ' "$backup" >/dev/null 2>&1; then
    echo "apply-main-ruleset: break-glass evidence schema or binding is invalid" >&2
    return 1
  fi
  unsigned=$(mktemp) || return 1
  jq -S -s '.[0] | del(.integritySha256)' "$backup" > "$unsigned" || {
    rm -f "$unsigned"
    return 1
  }
  actual_digest=$(kimen_sha256 "$unsigned") || {
    rm -f "$unsigned"
    return 1
  }
  rm -f "$unsigned"
  expected_digest=$(jq -er -s '.[0].integritySha256' "$backup") || return 1
  if [ "$actual_digest" != "$expected_digest" ]; then
    echo "apply-main-ruleset: break-glass evidence integrity mismatch" >&2
    return 1
  fi
}

create_creation_intent() {
  local payload="$1"
  local digest
  local intent
  local unsigned

  if ! unsigned=$(mktemp); then
    echo "apply-main-ruleset: could not allocate create-intent staging" >&2
    return 1
  fi
  if ! intent=$(mktemp "$BACKUP_DIR/create-intent-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX"); then
    rm -f "$unsigned"
    echo "apply-main-ruleset: could not allocate create-intent journal" >&2
    return 1
  fi
  if ! jq -S \
    --arg schema "$CREATE_INTENT_SCHEMA" \
    --arg repository "$REPOSITORY" \
    --arg ruleset_name "$RULESET_NAME" '
      {
        schemaVersion: $schema,
        repository: $repository,
        rulesetName: $ruleset_name,
        operation: "create",
        payload: .
      }
    ' "$payload" > "$unsigned"; then
    rm -f "$intent" "$unsigned"
    return 1
  fi
  if ! digest=$(kimen_sha256 "$unsigned"); then
    rm -f "$intent" "$unsigned"
    return 1
  fi
  if ! jq -S --arg digest "$digest" '. + {integritySha256: $digest}' "$unsigned" > "$intent"; then
    rm -f "$intent" "$unsigned"
    return 1
  fi
  rm -f "$unsigned"
  chmod 600 "$intent"
  if ! write_evidence_sidecar "$intent" || ! sync_evidence_pair "$intent"; then
    rm -f "$intent" "${intent}.sha256"
    return 1
  fi
  printf '%s\n' "$intent"
}

ruleset_identity_matches() {
  local ruleset_id="$1"
  local observed

  if ! observed=$(mktemp); then
    return 1
  fi
  if ! gh api --method GET -F includes_parents=false \
    "repos/$REPOSITORY/rulesets/$ruleset_id" > "$observed"; then
    rm -f "$observed"
    echo "apply-main-ruleset: ruleset $ruleset_id does not exist or could not be observed" >&2
    return 1
  fi
  if ! jq -e --argjson id "$ruleset_id" --arg name "$RULESET_NAME" \
    --arg repository "$REPOSITORY" '
    .id == $id and
    .name == $name and
    .source_type == "Repository" and
    .source == $repository
  ' "$observed" >/dev/null 2>&1; then
    rm -f "$observed"
    echo "apply-main-ruleset: ruleset $ruleset_id ID/name does not match $RULESET_NAME" >&2
    return 1
  fi
  rm -f "$observed"
}

ruleset_absence_verified() {
  local detail_status
  local ruleset_id="$1"
  local observed
  local remaining

  if ! observed=$(mktemp); then
    return 1
  fi
  if gh api --include --method GET -F includes_parents=false \
    "repos/$REPOSITORY/rulesets/$ruleset_id" > "$observed" 2>&1; then
    rm -f "$observed"
    return 1
  fi
  detail_status=$(awk '
    $1 ~ /^HTTP\/[0-9.]+$/ && $2 ~ /^[0-9][0-9][0-9]$/ { status = $2 }
    END { print status }
  ' "$observed")
  rm -f "$observed"
  if [ "$detail_status" != "404" ]; then
    echo "apply-main-ruleset: detail GET did not return an authoritative 404 (status ${detail_status:-network/no-status}); refusing to claim ruleset $ruleset_id is absent" >&2
    return 1
  fi
  if ! remaining=$(gh api --method GET -F includes_parents=false \
    "repos/$REPOSITORY/rulesets" --paginate \
    --jq ".[] | select(.source_type == \"Repository\" and .source == \"$REPOSITORY\" and (.id == $ruleset_id or .name == \"$RULESET_NAME\")) | .id"); then
    echo "apply-main-ruleset: could not verify ruleset $ruleset_id absence in the ruleset list" >&2
    return 1
  fi
  [ -z "$remaining" ]
}

delete_ruleset_verified() {
  local ruleset_id="$1"
  local expected_forward="$2"
  local delete_status=0

  if ! observe_ruleset_exact "$ruleset_id" "$expected_forward"; then
    echo "apply-main-ruleset: refusing DELETE because ruleset $ruleset_id is stale or does not match the expected forward payload" >&2
    return 1
  fi
  assert_secure_evidence_chain_unchanged || return 1
  assert_writer_lock_identity || return 1
  gh api --method DELETE "repos/$REPOSITORY/rulesets/$ruleset_id" >/dev/null || delete_status=$?

  if ! ruleset_absence_verified "$ruleset_id"; then
    echo "apply-main-ruleset: DELETE left ruleset $ruleset_id present (command status $delete_status)" >&2
    return 1
  fi
  if [ "$delete_status" -ne 0 ]; then
    echo "apply-main-ruleset: reconciled DELETE command error; ruleset $ruleset_id is absent" >&2
  fi
}

observe_ruleset_exact() {
  local ruleset_id="$1"
  local expected="$2"
  local actual
  local expected_sorted
  local observed

  if ! observed=$(mktemp) || ! actual=$(mktemp) || ! expected_sorted=$(mktemp); then
    rm -f "${actual:-}" "${expected_sorted:-}" "${observed:-}"
    return 1
  fi
  if ! jq -S . "$expected" > "$expected_sorted"; then
    rm -f "$actual" "$expected_sorted" "$observed"
    echo "apply-main-ruleset: expected ruleset payload is invalid" >&2
    return 1
  fi
  if ! gh api --method GET -F includes_parents=false \
    "repos/$REPOSITORY/rulesets/$ruleset_id" > "$observed"; then
    rm -f "$actual" "$expected_sorted" "$observed"
    echo "apply-main-ruleset: GET could not confirm ruleset $ruleset_id state" >&2
    return 1
  fi
  if ! jq -e --argjson id "$ruleset_id" --arg name "$RULESET_NAME" \
    --arg repository "$REPOSITORY" '
    .id == $id and
    .name == $name and
    .source_type == "Repository" and
    .source == $repository
  ' "$observed" >/dev/null 2>&1; then
    rm -f "$actual" "$expected_sorted" "$observed"
    echo "apply-main-ruleset: observed ruleset $ruleset_id has an unexpected ID/name or repository origin" >&2
    return 1
  fi
  if ! normalize_ruleset "$observed" > "$actual"; then
    rm -f "$actual" "$expected_sorted" "$observed"
    echo "apply-main-ruleset: observed ruleset $ruleset_id payload is invalid" >&2
    return 1
  fi
  rm -f "$observed"
  if ! diff -u "$expected_sorted" "$actual"; then
    rm -f "$actual" "$expected_sorted"
    echo "apply-main-ruleset: observed ruleset $ruleset_id payload mismatch" >&2
    return 1
  fi
  rm -f "$actual" "$expected_sorted"
}

restore_ruleset_verified() {
  local backup="$1"
  local expected
  local expected_forward
  local put_status=0
  local restore_confirmed=false
  local ruleset_id

  if ! ruleset_id=$(jq -er -s '.[0].rulesetId' "$backup") ||
    ! expected=$(mktemp) || ! expected_forward=$(mktemp); then
    rm -f "${expected:-}" "${expected_forward:-}"
    return 1
  fi
  if ! jq -S -s '.[0].payload' "$backup" > "$expected" ||
    ! jq -S -s '.[0].expectedForwardPayload' "$backup" > "$expected_forward"; then
    rm -f "$expected" "$expected_forward"
    return 1
  fi
  if observe_ruleset_exact "$ruleset_id" "$expected"; then
    rm -f "$expected" "$expected_forward"
    echo "apply-main-ruleset: ruleset $ruleset_id already matches the prior payload; rollback is idempotent" >&2
    return 0
  fi
  if ! observe_ruleset_exact "$ruleset_id" "$expected_forward"; then
    rm -f "$expected" "$expected_forward"
    echo "apply-main-ruleset: refusing stale rollback because ruleset $ruleset_id matches neither the prior nor expected forward payload" >&2
    return 1
  fi
  assert_secure_evidence_chain_unchanged || {
    rm -f "$expected" "$expected_forward"
    return 1
  }
  assert_writer_lock_identity || {
    rm -f "$expected" "$expected_forward"
    return 1
  }
  gh api --method PUT "repos/$REPOSITORY/rulesets/$ruleset_id" \
    --input "$expected" >/dev/null || put_status=$?
  if observe_ruleset_exact "$ruleset_id" "$expected"; then
    restore_confirmed=true
  else
    echo "apply-main-ruleset: retrying exact GET reconciliation for ruleset $ruleset_id" >&2
    if observe_ruleset_exact "$ruleset_id" "$expected"; then
      restore_confirmed=true
    fi
  fi
  if [ "$restore_confirmed" = true ]; then
    rm -f "$expected" "$expected_forward"
    if [ "$put_status" -ne 0 ]; then
      echo "apply-main-ruleset: reconciled PUT command error; ruleset $ruleset_id is restored" >&2
    fi
    return 0
  fi
  rm -f "$expected" "$expected_forward"
  echo "apply-main-ruleset: exact restore of ruleset $ruleset_id was not confirmed (command status $put_status)" >&2
  return 1
}

rollback_backup() {
  local backup="$1"
  local operation
  local ruleset_id
  local expected_forward

  if ! operation=$(jq -er -s '.[0].operation' "$backup") ||
    ! ruleset_id=$(jq -er -s '.[0].rulesetId' "$backup"); then
    echo "apply-main-ruleset: rollback snapshot could not be parsed" >&2
    return 1
  fi
  if [ "$operation" = "created" ]; then
    if ! expected_forward=$(mktemp) ||
      ! jq -S -s '.[0].expectedForwardPayload' "$backup" > "$expected_forward"; then
      rm -f "${expected_forward:-}"
      return 1
    fi
    if ruleset_absence_verified "$ruleset_id"; then
      rm -f "$expected_forward"
      echo "apply-main-ruleset: ruleset $ruleset_id is already absent; rollback is idempotent" >&2
      return 0
    fi
    if ! delete_ruleset_verified "$ruleset_id" "$expected_forward"; then
      rm -f "$expected_forward"
      echo "apply-main-ruleset: refusing stale created rollback for ruleset $ruleset_id" >&2
      return 1
    fi
    rm -f "$expected_forward"
  elif [ "$operation" = "updated" ]; then
    restore_ruleset_verified "$backup"
  else
    echo "apply-main-ruleset: invalid rollback operation" >&2
    return 1
  fi
}

freeze_main_rollback_backup() {
  local backup="$1"

  if ! BACKUP_SNAPSHOT_DIR=$(make_private_snapshot_directory); then
    echo "apply-main-ruleset: could not allocate process-owned rollback snapshot" >&2
    return 1
  fi
  if ! freeze_evidence_pair "$backup" "$BACKUP_SNAPSHOT_DIR"; then
    rm -rf "$BACKUP_SNAPSHOT_DIR"
    BACKUP_SNAPSHOT_DIR=""
    return 1
  fi
  BACKUP_SNAPSHOT="$FROZEN_EVIDENCE_PATH"
  if ! validate_rollback_backup "$BACKUP_SNAPSHOT"; then
    rm -rf "$BACKUP_SNAPSHOT_DIR"
    BACKUP_SNAPSHOT_DIR=""
    BACKUP_SNAPSHOT=""
    return 1
  fi
}

reconcile_ambiguous_creation() {
  local expected="$1"
  local intent="$2"
  local matching_id

  if ! matching_id=$(gh api --method GET -F includes_parents=false \
    "repos/$REPOSITORY/rulesets" --paginate \
    --jq ".[] | select(.source_type == \"Repository\" and .source == \"$REPOSITORY\" and .name == \"$RULESET_NAME\") | .id"); then
    echo "apply-main-ruleset: could not list rulesets after ambiguous POST; recovery journal: $intent" >&2
    return 1
  fi
  if [ -z "$matching_id" ]; then
    echo "apply-main-ruleset: ambiguous POST left no matching ruleset currently observable; recovery journal retained: $intent" >&2
    return 0
  fi
  if ! jq -en --arg id "$matching_id" '
    $id | test("^[0-9]+$") and
      (tonumber | . == floor and . > 0 and . <= 9007199254740991)
  ' >/dev/null; then
    echo "apply-main-ruleset: ambiguous POST left multiple or invalid matching IDs; recovery journal: $intent" >&2
    return 1
  fi
  if ! observe_ruleset_exact "$matching_id" "$expected"; then
    echo "apply-main-ruleset: matching ruleset $matching_id does not match the create intent; recovery journal: $intent" >&2
    return 1
  fi
  echo "apply-main-ruleset: matching ruleset $matching_id is uncorrelated after ambiguous POST; no DELETE was attempted. Inspect ownership, then run --claim-create '$intent' '$matching_id' for explicit recovery" >&2
}

render_payload() {
  local integrations="${KIMEN_CHECK_INTEGRATIONS_JSON:-}"
  if ! printf '%s\n' "$integrations" | jq -e 'type == "object"' >/dev/null 2>&1; then
    echo "apply-main-ruleset: KIMEN_CHECK_INTEGRATIONS_JSON must map every observed context to its App ID" >&2
    return 1
  fi

  jq --argjson integrations "$integrations" '
    .rules |= map(
        if .type == "required_status_checks" then
          .parameters.required_status_checks |= map(
            .integration_id = ($integrations[.context] // error("missing integration for " + .context))
          )
        else . end
      )
    | if (
        .bypass_actors == [] and
        ([.rules[] | select(.type == "required_status_checks")
          | .parameters.required_status_checks[].integration_id]
          | all(type == "number" and . == floor and . > 1 and . <= 9007199254740991))
      ) then . else error("unresolved actor or integration sentinel") end
  ' "$DESIRED"
}

trusted_review_app_id() {
  local integrations="${KIMEN_CHECK_INTEGRATIONS_JSON:-}"
  local app_id
  if ! app_id=$(printf '%s\n' "$integrations" | jq -er --arg context "$REVIEW_CONTEXT" '
    .[$context]
    | select(type == "number" and . == floor and . > 1 and . <= 9007199254740991)
  ' 2>/dev/null); then
    echo "apply-main-ruleset: KIMEN_CHECK_INTEGRATIONS_JSON must bind $REVIEW_CONTEXT to its trusted observed App ID" >&2
    return 1
  fi
  printf '%s\n' "$app_id"
}

render_active_payload() {
  local initial_payload="$1"
  local review_app_id="$2"

  jq --arg context "$REVIEW_CONTEXT" --argjson app_id "$review_app_id" '
    .enforcement = "active"
    | .rules |= map(
        if .type == "required_status_checks" then
          .parameters.required_status_checks += [{context: $context, integration_id: $app_id}]
        else . end
      )
    | if (
        [.rules[] | select(.type == "required_status_checks")
          | .parameters.required_status_checks[] | select(.context == $context)]
        | length == 1
      ) then . else error("review requirement must exist exactly once") end
  ' "$initial_payload"
}

observe_current_review_check() {
  local pull_request="${KIMEN_REVIEW_PULL_REQUEST:-}"
  local expected_external_id
  if ! jq -en --arg value "$pull_request" '
    $value
    | test("^[0-9]+$") and
      (tonumber | . == floor and . > 0 and . <= 9007199254740991)
  ' >/dev/null; then
    echo "apply-main-ruleset: KIMEN_REVIEW_PULL_REQUEST must be a positive integer" >&2
    return 1
  fi

  if ! REVIEW_APP_ID=$(trusted_review_app_id); then
    return 1
  fi

  REVIEW_PR_PAYLOAD=$(mktemp)
  REVIEW_CHECKS_PAYLOAD=$(mktemp)
  gh api --method GET \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2022-11-28' \
    "repos/$REPOSITORY/pulls/$pull_request" > "$REVIEW_PR_PAYLOAD"
  if ! CURRENT_REVIEW_SHA=$(jq -er --argjson pull_request "$pull_request" '
    select(
      .number == $pull_request and
      .state == "open" and
      .base.ref == "main" and
      (.head.sha | type == "string" and test("^[0-9a-fA-F]{40}$"))
    )
    | .head.sha
  ' "$REVIEW_PR_PAYLOAD" 2>/dev/null); then
    echo "apply-main-ruleset: review PR must be open, target main and expose a current 40-hex head SHA" >&2
    return 1
  fi
  expected_external_id="$REVIEW_CONTEXT:pr:$pull_request:$CURRENT_REVIEW_SHA"

  gh api --method GET \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2022-11-28' \
    -f "check_name=$REVIEW_CONTEXT" \
    -f filter=latest \
    -f per_page=100 \
    "repos/$REPOSITORY/commits/$CURRENT_REVIEW_SHA/check-runs" > "$REVIEW_CHECKS_PAYLOAD"
  if ! jq -e \
    --arg context "$REVIEW_CONTEXT" \
    --arg external_id "$expected_external_id" \
    --arg head "$CURRENT_REVIEW_SHA" \
    --argjson app_id "$REVIEW_APP_ID" '
      if (.check_runs | type) != "array" then false
      else
        [
          .check_runs[]
          | select(
              (.id | type == "number" and . == floor and . > 0 and . <= 9007199254740991) and
              .name == $context and
              .head_sha == $head and
              (.app.id == $app_id)
            )
        ] as $matching
        | if ($matching | length) == 0 then false
          else
            ($matching | max_by(.id)) as $latest
            | $latest.external_id == $external_id and
              $latest.status == "completed" and
              $latest.conclusion == "success"
          end
      end
    ' "$REVIEW_CHECKS_PAYLOAD" >/dev/null 2>&1; then
    echo "apply-main-ruleset: the latest exact current-revision $REVIEW_CONTEXT Check Run (external identity $expected_external_id) from trusted App ID $REVIEW_APP_ID is not green for PR #$pull_request head $CURRENT_REVIEW_SHA" >&2
    return 1
  fi
}

observe_authenticated_founder() {
  local observed

  observed=$(mktemp) || return 1
  if ! gh api --method GET user > "$observed"; then
    rm -f "$observed"
    echo "apply-main-ruleset: authenticated GitHub identity could not be observed" >&2
    return 1
  fi
  if ! jq -e --arg login "$FOUNDER_LOGIN" '
    .login == $login and
    .type == "User" and
    (.id | type == "number" and . == floor and . > 0 and . <= 9007199254740991)
  ' "$observed" >/dev/null 2>&1; then
    rm -f "$observed"
    echo "apply-main-ruleset: authenticated GitHub user must be the canonical founder MarsGotta" >&2
    return 1
  fi
  FOUNDER_USER_ID=$(jq -er '.id' "$observed") || {
    rm -f "$observed"
    return 1
  }
  rm -f "$observed"
}

observe_break_glass_request() {
  local pull_request="$1"
  local expected_head="${2:-}"
  local expected_payload_sha256="${3:-}"
  local event_payload
  local issue_payload
  local parsed_payload
  local pr_payload

  pr_payload=$(mktemp) || return 1
  event_payload=$(mktemp) || {
    rm -f "$pr_payload"
    return 1
  }
  parsed_payload=$(mktemp) || {
    rm -f "$pr_payload" "$event_payload"
    return 1
  }
  issue_payload=$(mktemp) || {
    rm -f "$pr_payload" "$event_payload" "$parsed_payload"
    return 1
  }
  if ! gh api --method GET "repos/$REPOSITORY/pulls/$pull_request" > "$pr_payload"; then
    rm -f "$pr_payload" "$event_payload" "$parsed_payload" "$issue_payload"
    echo "apply-main-ruleset: break-glass PR could not be observed" >&2
    return 1
  fi
  if ! jq -e --argjson pull_request "$pull_request" --arg login "$FOUNDER_LOGIN" '
    .number == $pull_request and
    .user.login == $login and
    .base.ref == "main" and
    (.head.sha | type == "string" and test("^[0-9a-f]{40}$")) and
    (.state == "open" or .state == "closed") and
    (.merged == true or .merged == false)
  ' "$pr_payload" >/dev/null 2>&1; then
    rm -f "$pr_payload" "$event_payload" "$parsed_payload" "$issue_payload"
    echo "apply-main-ruleset: break-glass PR must be a founder-authored PR targeting main with observable state" >&2
    return 1
  fi
  BREAK_GLASS_HEAD=$(jq -er '.head.sha' "$pr_payload") || return 1
  if [ -n "$expected_head" ] && [ "$BREAK_GLASS_HEAD" != "$expected_head" ]; then
    rm -f "$pr_payload" "$event_payload" "$parsed_payload" "$issue_payload"
    echo "apply-main-ruleset: break-glass PR head revision changed during the session" >&2
    return 1
  fi
  if ! jq -S --arg repository "$REPOSITORY" '
    {repository: {full_name: $repository}, pull_request: .}
  ' "$pr_payload" > "$event_payload"; then
    rm -f "$pr_payload" "$event_payload" "$parsed_payload" "$issue_payload"
    return 1
  fi
  if ! GITHUB_ACTOR="$FOUNDER_LOGIN" \
    GITHUB_EVENT_NAME=pull_request_target \
    GITHUB_EVENT_PATH="$event_payload" \
    GITHUB_REPOSITORY="$REPOSITORY" \
    KIMEN_BREAK_GLASS_LABEL=break-glass \
    KIMEN_FOUNDER_LOGIN="$FOUNDER_LOGIN" \
    node .github/scripts/review-evidence.cjs break-glass-payload-event > "$parsed_payload" ||
    ! node .github/scripts/review-evidence.cjs validate-break-glass < "$parsed_payload" >/dev/null; then
    rm -f "$pr_payload" "$event_payload" "$parsed_payload" "$issue_payload"
    echo "apply-main-ruleset: live break-glass PR label, author, justification or restoration marker is invalid" >&2
    return 1
  fi
  OBSERVED_BREAK_GLASS_REQUEST_SHA256=$(kimen_sha256 "$parsed_payload") || {
    rm -f "$pr_payload" "$event_payload" "$parsed_payload" "$issue_payload"
    return 1
  }
  if [ -n "$expected_payload_sha256" ] &&
    [ "$OBSERVED_BREAK_GLASS_REQUEST_SHA256" != "$expected_payload_sha256" ]; then
    rm -f "$pr_payload" "$event_payload" "$parsed_payload" "$issue_payload"
    echo "apply-main-ruleset: validated request payload changed during the break-glass session" >&2
    return 1
  fi
  BREAK_GLASS_REQUEST_PAYLOAD_SHA256="$OBSERVED_BREAK_GLASS_REQUEST_SHA256"
  BREAK_GLASS_ISSUE_URL=$(jq -er '.request.restorationIssue' "$parsed_payload") || return 1
  if ! BREAK_GLASS_ISSUE_NUMBER=$(jq -er --arg prefix "https://github.com/$REPOSITORY/issues/" '
    .request.restorationIssue
    | select(startswith($prefix))
    | ltrimstr($prefix)
    | select(test("^[1-9][0-9]*$"))
    | tonumber
  ' "$parsed_payload"); then
    rm -f "$pr_payload" "$event_payload" "$parsed_payload" "$issue_payload"
    echo "apply-main-ruleset: restoration issue number could not be parsed" >&2
    return 1
  fi
  if ! gh api --method GET "repos/$REPOSITORY/issues/$BREAK_GLASS_ISSUE_NUMBER" > "$issue_payload" ||
    ! jq -e --argjson issue "$BREAK_GLASS_ISSUE_NUMBER" --arg url "$BREAK_GLASS_ISSUE_URL" '
      .number == $issue and
      .state == "open" and
      .html_url == $url and
      (has("pull_request") | not)
    ' "$issue_payload" >/dev/null 2>&1; then
    rm -f "$pr_payload" "$event_payload" "$parsed_payload" "$issue_payload"
    echo "apply-main-ruleset: restoration issue must exist, remain open and must not be a pull request" >&2
    return 1
  fi
  BREAK_GLASS_PR_STATE=$(jq -er '.state' "$pr_payload") || return 1
  BREAK_GLASS_PR_MERGED=$(jq -r '.merged == true' "$pr_payload") || return 1
  rm -f "$pr_payload" "$event_payload" "$parsed_payload" "$issue_payload"
}

if [ "$MODE" = "--render" ]; then
  render_payload
  exit 0
fi

if [ "$MODE" = "--close-break-glass" ]; then
  BREAK_GLASS_EVIDENCE="${2:-}"
  REPOSITORY="${KIMEN_GITHUB_REPOSITORY:-kimen-dev/kimen}"
  validate_repository "$REPOSITORY"
  require_exclusive_writer_confirmation
  CLOSE_SNAPSHOT_DIR=$(make_private_snapshot_directory)
  close_break_glass_cleanup() {
    local status=$?
    trap - EXIT
    if ! release_exclusive_writer_lock; then
      status=1
    fi
    rm -rf "$CLOSE_SNAPSHOT_DIR"
    exit "$status"
  }
  trap close_break_glass_cleanup EXIT
  freeze_evidence_pair "$BREAK_GLASS_EVIDENCE" "$CLOSE_SNAPSHOT_DIR"
  BREAK_GLASS_SNAPSHOT="$FROZEN_EVIDENCE_PATH"
  validate_break_glass_backup "$BREAK_GLASS_SNAPSHOT"
  prepare_secure_evidence_directory "$BACKUP_DIR"
  acquire_or_adopt_recovery_lock break-glass-rollback \
    "$BREAK_GLASS_EVIDENCE" "$BREAK_GLASS_SNAPSHOT"
  if ! require_github_access || ! observe_authenticated_founder; then
    if [ "$WRITER_LOCK_ADOPTED" = true ]; then
      set_writer_lock_state recovery-ready close-break-glass break-glass-rollback \
        "$BREAK_GLASS_EVIDENCE" "$BREAK_GLASS_SNAPSHOT" || true
    else
      set_writer_lock_state releasable || true
    fi
    exit 1
  fi
  EVIDENCE_FOUNDER_USER_ID=$(jq -er -s '.[0].breakGlass.founderUserId' "$BREAK_GLASS_SNAPSHOT")
  if [ "$EVIDENCE_FOUNDER_USER_ID" != "$FOUNDER_USER_ID" ]; then
    if [ "$WRITER_LOCK_ADOPTED" = true ]; then
      set_writer_lock_state recovery-ready close-break-glass break-glass-rollback \
        "$BREAK_GLASS_EVIDENCE" "$BREAK_GLASS_SNAPSHOT" || true
    else
      set_writer_lock_state releasable || true
    fi
    echo "apply-main-ruleset: authenticated founder ID does not match break-glass evidence" >&2
    exit 1
  fi
  set_writer_lock_state mutating close-break-glass break-glass-rollback \
    "$BREAK_GLASS_EVIDENCE" "$BREAK_GLASS_SNAPSHOT"
  if ! rollback_backup "$BREAK_GLASS_SNAPSHOT"; then
    set_writer_lock_state recovery-ready close-break-glass break-glass-rollback \
      "$BREAK_GLASS_EVIDENCE" "$BREAK_GLASS_SNAPSHOT" || true
    echo "apply-main-ruleset: break-glass revocation remains unresolved; exact recovery evidence retained" >&2
    exit 1
  fi
  set_writer_lock_state releasable
  release_exclusive_writer_lock
  echo "apply-main-ruleset: PASS — temporary break-glass bypass is revoked; evidence: $BREAK_GLASS_EVIDENCE"
  exit 0
fi

if [ "$MODE" = "--open-break-glass" ]; then
  BREAK_GLASS_PULL_REQUEST="${2:-}"
  BREAK_GLASS_TIMEOUT="${KIMEN_BREAK_GLASS_TIMEOUT_SECONDS:-$BREAK_GLASS_MAX_SECONDS}"
  REPOSITORY="${KIMEN_GITHUB_REPOSITORY:-kimen-dev/kimen}"
  validate_repository "$REPOSITORY"
  if ! jq -en --arg value "$BREAK_GLASS_PULL_REQUEST" '
    $value | test("^[0-9]+$") and (tonumber | . == floor and . > 0)
  ' >/dev/null; then
    echo "apply-main-ruleset: --open-break-glass requires one positive PR number" >&2
    exit 2
  fi
  if ! printf '%s\n' "$BREAK_GLASS_TIMEOUT" | grep -Eq '^[0-9]+$' ||
    [ "$BREAK_GLASS_TIMEOUT" -lt 1 ] || [ "$BREAK_GLASS_TIMEOUT" -gt "$BREAK_GLASS_MAX_SECONDS" ]; then
    echo "apply-main-ruleset: break-glass timeout must be between 1 and $BREAK_GLASS_MAX_SECONDS seconds" >&2
    exit 2
  fi
  if [ "${KIMEN_CONFIRM_BREAK_GLASS_SESSION:-}" != "$BREAK_GLASS_CONFIRMATION" ]; then
    echo "apply-main-ruleset: exact break-glass confirmation missing" >&2
    exit 1
  fi
  require_exclusive_writer_confirmation
  prepare_secure_evidence_directory "$BACKUP_DIR"
  BREAK_GLASS_INITIAL=$(mktemp)
  BREAK_GLASS_BASELINE=$(mktemp)
  BREAK_GLASS_FORWARD=$(mktemp)
  BREAK_GLASS_EVIDENCE=""
  BREAK_GLASS_SNAPSHOT=""
  BREAK_GLASS_SNAPSHOT_DIR=""
  BREAK_GLASS_GRANTED=false
  BREAK_GLASS_REVOKED=false
  BREAK_GLASS_MERGED=false
  break_glass_session_cleanup() {
    local status=$?
    trap - EXIT INT TERM
    if [ "$BREAK_GLASS_GRANTED" = true ] && [ "$BREAK_GLASS_REVOKED" != true ]; then
      if rollback_backup "$BREAK_GLASS_SNAPSHOT"; then
        BREAK_GLASS_REVOKED=true
        set_writer_lock_state releasable || status=1
      else
        set_writer_lock_state recovery-ready open-break-glass break-glass-rollback \
          "$BREAK_GLASS_EVIDENCE" "$BREAK_GLASS_SNAPSHOT" || true
        echo "apply-main-ruleset: CRITICAL — break-glass bypass could not be revoked; run --close-break-glass with exact evidence: $BREAK_GLASS_EVIDENCE" >&2
        status=1
      fi
    elif [ "$WRITER_LOCK_HELD" = true ] && [ "$WRITER_LOCK_STATE" = releasable ]; then
      :
    fi
    if [ "$WRITER_LOCK_HELD" = true ] && [ "$WRITER_LOCK_STATE" = releasable ]; then
      release_exclusive_writer_lock || status=1
    fi
    rm -f "$BREAK_GLASS_INITIAL" "$BREAK_GLASS_BASELINE" "$BREAK_GLASS_FORWARD"
    [ -z "$BREAK_GLASS_SNAPSHOT_DIR" ] || rm -rf "$BREAK_GLASS_SNAPSHOT_DIR"
    if [ "$status" -eq 0 ] && [ "$BREAK_GLASS_MERGED" = true ] && [ "$BREAK_GLASS_REVOKED" = true ]; then
      echo "apply-main-ruleset: PASS — founder merge observed and temporary bypass revoked; evidence: $BREAK_GLASS_EVIDENCE"
    fi
    exit "$status"
  }
  trap break_glass_session_cleanup EXIT
  trap 'echo "apply-main-ruleset: break-glass session interrupted; revoking temporary bypass" >&2; exit 130' INT TERM
  acquire_exclusive_writer_lock
  require_github_access
  observe_authenticated_founder
  render_payload > "$BREAK_GLASS_INITIAL"
  REVIEW_APP_ID=$(trusted_review_app_id)
  render_active_payload "$BREAK_GLASS_INITIAL" "$REVIEW_APP_ID" > "$BREAK_GLASS_BASELINE"
  BREAK_GLASS_RULESET_ID=$(gh api --method GET -F includes_parents=false \
    "repos/$REPOSITORY/rulesets" --paginate \
    --jq ".[] | select(.source_type == \"Repository\" and .source == \"$REPOSITORY\" and .name == \"$RULESET_NAME\") | .id")
  if ! jq -en --arg id "$BREAK_GLASS_RULESET_ID" '
    $id | test("^[0-9]+$") and (tonumber | . == floor and . > 0)
  ' >/dev/null; then
    echo "apply-main-ruleset: break-glass requires exactly one active $RULESET_NAME ruleset" >&2
    exit 1
  fi
  observe_ruleset_exact "$BREAK_GLASS_RULESET_ID" "$BREAK_GLASS_BASELINE"
  observe_break_glass_request "$BREAK_GLASS_PULL_REQUEST"
  if [ "$BREAK_GLASS_PR_STATE" != open ] || [ "$BREAK_GLASS_PR_MERGED" != false ]; then
    echo "apply-main-ruleset: break-glass can open only for a current unmerged PR" >&2
    exit 1
  fi
  BREAK_GLASS_OPENED_AT=$(date +%s)
  BREAK_GLASS_DEADLINE=$((BREAK_GLASS_OPENED_AT + BREAK_GLASS_TIMEOUT))
  jq --argjson founder_user_id "$FOUNDER_USER_ID" '
    .bypass_actors = [{
      actor_id: $founder_user_id,
      actor_type: "User",
      bypass_mode: "pull_request"
    }]
  ' "$BREAK_GLASS_BASELINE" > "$BREAK_GLASS_FORWARD"
  BREAK_GLASS_EVIDENCE=$(create_break_glass_backup \
    "$BREAK_GLASS_RULESET_ID" "$BREAK_GLASS_BASELINE" "$BREAK_GLASS_FORWARD" \
    "$BREAK_GLASS_PULL_REQUEST" "$BREAK_GLASS_HEAD" "$FOUNDER_USER_ID" \
    "$BREAK_GLASS_ISSUE_NUMBER" "$BREAK_GLASS_ISSUE_URL" \
    "$BREAK_GLASS_REQUEST_PAYLOAD_SHA256" "$BREAK_GLASS_OPENED_AT" "$BREAK_GLASS_DEADLINE")
  BREAK_GLASS_SNAPSHOT_DIR=$(make_private_snapshot_directory)
  freeze_evidence_pair "$BREAK_GLASS_EVIDENCE" "$BREAK_GLASS_SNAPSHOT_DIR"
  BREAK_GLASS_SNAPSHOT="$FROZEN_EVIDENCE_PATH"
  validate_break_glass_backup "$BREAK_GLASS_SNAPSHOT"
  set_writer_lock_state mutating open-break-glass break-glass-rollback \
    "$BREAK_GLASS_EVIDENCE" "$BREAK_GLASS_SNAPSHOT"
  BREAK_GLASS_GRANTED=true
  if ! gh api --method PUT "repos/$REPOSITORY/rulesets/$BREAK_GLASS_RULESET_ID" \
    --input "$BREAK_GLASS_FORWARD" >/dev/null ||
    ! observe_ruleset_exact "$BREAK_GLASS_RULESET_ID" "$BREAK_GLASS_FORWARD"; then
    echo "apply-main-ruleset: temporary break-glass grant was not confirmed; revoking" >&2
    exit 1
  fi
  echo "apply-main-ruleset: BREAK-GLASS OPEN for PR #$BREAK_GLASS_PULL_REQUEST until epoch $BREAK_GLASS_DEADLINE; merge manually now; evidence: $BREAK_GLASS_EVIDENCE" >&2
  while :; do
    if ! observe_break_glass_request "$BREAK_GLASS_PULL_REQUEST" "$BREAK_GLASS_HEAD" \
      "$BREAK_GLASS_REQUEST_PAYLOAD_SHA256"; then
      echo "apply-main-ruleset: live PR/body/label/issue observation failed; revoking temporary bypass" >&2
      exit 1
    fi
    if [ "$BREAK_GLASS_PR_STATE" = closed ] && [ "$BREAK_GLASS_PR_MERGED" = true ]; then
      BREAK_GLASS_MERGED=true
      exit 0
    fi
    if [ "$BREAK_GLASS_PR_STATE" != open ] || [ "$BREAK_GLASS_PR_MERGED" != false ]; then
      echo "apply-main-ruleset: PR entered an unexpected state before merge; revoking temporary bypass" >&2
      exit 1
    fi
    BREAK_GLASS_NOW=$(date +%s)
    if [ "$BREAK_GLASS_NOW" -ge "$BREAK_GLASS_DEADLINE" ]; then
      echo "apply-main-ruleset: break-glass deadline reached without merge; revoking temporary bypass" >&2
      exit 1
    fi
    BREAK_GLASS_REMAINING=$((BREAK_GLASS_DEADLINE - BREAK_GLASS_NOW))
    if [ "$BREAK_GLASS_REMAINING" -gt 2 ]; then
      sleep 2
    else
      sleep "$BREAK_GLASS_REMAINING"
    fi
  done
fi

if [ "$MODE" = "--rollback" ]; then
  BACKUP="${2:-}"
  REPOSITORY="${KIMEN_GITHUB_REPOSITORY:-kimen-dev/kimen}"
  validate_repository "$REPOSITORY"
  require_exclusive_writer_confirmation
  ROLLBACK_SNAPSHOT_DIR=$(make_private_snapshot_directory)
  rollback_snapshot_cleanup() {
    if ! release_exclusive_writer_lock; then
      echo "apply-main-ruleset: CRITICAL — rollback cleanup could not release the local writer lock" >&2
    fi
    rm -rf "$ROLLBACK_SNAPSHOT_DIR"
  }
  trap rollback_snapshot_cleanup EXIT
  freeze_evidence_pair "$BACKUP" "$ROLLBACK_SNAPSHOT_DIR"
  BACKUP_SNAPSHOT="$FROZEN_EVIDENCE_PATH"
  validate_rollback_backup "$BACKUP_SNAPSHOT"
  prepare_secure_evidence_directory "$BACKUP_DIR"
  acquire_or_adopt_recovery_lock rollback-backup "$BACKUP" "$BACKUP_SNAPSHOT"
  if ! require_github_access; then
    if [ "$WRITER_LOCK_ADOPTED" = true ]; then
      set_writer_lock_state recovery-ready explicit-rollback rollback-backup "$BACKUP" "$BACKUP_SNAPSHOT" || true
    else
      set_writer_lock_state releasable || true
    fi
    exit 1
  fi
  set_writer_lock_state mutating explicit-rollback rollback-backup "$BACKUP" "$BACKUP_SNAPSHOT"
  if ! rollback_backup "$BACKUP_SNAPSHOT"; then
    set_writer_lock_state recovery-ready explicit-rollback rollback-backup "$BACKUP" "$BACKUP_SNAPSHOT" || true
    echo "apply-main-ruleset: rollback remains unresolved; exact recovery lock retained" >&2
    exit 1
  fi
  set_writer_lock_state releasable
  if ! release_exclusive_writer_lock; then
    exit 1
  fi
  exit 0
fi

if [ "$MODE" = "--claim-create" ]; then
  CREATE_INTENT="${2:-}"
  CLAIM_RULESET_ID="${3:-}"
  REPOSITORY="${KIMEN_GITHUB_REPOSITORY:-kimen-dev/kimen}"
  validate_repository "$REPOSITORY"
  if ! jq -en --arg id "$CLAIM_RULESET_ID" '
    $id | test("^[0-9]+$") and
      (tonumber | . == floor and . > 0 and . <= 9007199254740991)
  ' >/dev/null; then
    echo "apply-main-ruleset: --claim-create requires one explicit positive ruleset ID" >&2
    exit 2
  fi
  require_exclusive_writer_confirmation
  CLAIM_SNAPSHOT_DIR=$(make_private_snapshot_directory)
  CLAIM_PAYLOAD=$(mktemp)
  CLAIM_BACKUP_SNAPSHOT_DIR=""
  claim_cleanup() {
    if ! release_exclusive_writer_lock; then
      echo "apply-main-ruleset: CRITICAL — creation-claim cleanup could not release the local writer lock" >&2
    fi
    rm -rf "$CLAIM_SNAPSHOT_DIR"
    [ -z "$CLAIM_BACKUP_SNAPSHOT_DIR" ] || rm -rf "$CLAIM_BACKUP_SNAPSHOT_DIR"
    rm -f "$CLAIM_PAYLOAD"
  }
  trap claim_cleanup EXIT
  freeze_evidence_pair "$CREATE_INTENT" "$CLAIM_SNAPSHOT_DIR"
  CLAIM_SNAPSHOT="$FROZEN_EVIDENCE_PATH"
  jq -S -s '.[0].payload' "$CLAIM_SNAPSHOT" > "$CLAIM_PAYLOAD"
  validate_creation_intent "$CLAIM_SNAPSHOT" "$CLAIM_PAYLOAD"
  prepare_secure_evidence_directory "$BACKUP_DIR"
  acquire_or_adopt_recovery_lock create-intent "$CREATE_INTENT" "$CLAIM_SNAPSHOT"
  set_writer_lock_state mutating creation-claim create-intent "$CREATE_INTENT" "$CLAIM_SNAPSHOT"
  if ! require_github_access; then
    if [ "$WRITER_LOCK_ADOPTED" = true ]; then
      set_writer_lock_state recovery-ready creation-claim create-intent "$CREATE_INTENT" "$CLAIM_SNAPSHOT" || true
    else
      set_writer_lock_state releasable || true
    fi
    exit 1
  fi
  if ! observe_ruleset_exact "$CLAIM_RULESET_ID" "$CLAIM_PAYLOAD"; then
    echo "apply-main-ruleset: refusing creation claim because ruleset $CLAIM_RULESET_ID does not exactly match the frozen journal" >&2
    if [ "$WRITER_LOCK_ADOPTED" = true ]; then
      set_writer_lock_state recovery-ready creation-claim create-intent "$CREATE_INTENT" "$CLAIM_SNAPSHOT" || true
    else
      set_writer_lock_state releasable || true
    fi
    exit 1
  fi
  if ! CLAIM_BACKUP=$(create_rollback_backup created "$CLAIM_RULESET_ID" "$CLAIM_PAYLOAD" "$CLAIM_PAYLOAD"); then
    echo "apply-main-ruleset: creation claim could not persist rollback evidence" >&2
    if [ "$WRITER_LOCK_ADOPTED" = true ]; then
      set_writer_lock_state recovery-ready creation-claim create-intent "$CREATE_INTENT" "$CLAIM_SNAPSHOT" || true
    else
      set_writer_lock_state releasable || true
    fi
    exit 1
  fi
  CLAIM_BACKUP_SNAPSHOT_DIR=$(make_private_snapshot_directory)
  if ! freeze_evidence_pair "$CLAIM_BACKUP" "$CLAIM_BACKUP_SNAPSHOT_DIR" ||
    ! validate_rollback_backup "$FROZEN_EVIDENCE_PATH"; then
    echo "apply-main-ruleset: creation claim rollback evidence failed frozen validation" >&2
    if [ "$WRITER_LOCK_ADOPTED" = true ]; then
      set_writer_lock_state recovery-ready creation-claim create-intent "$CREATE_INTENT" "$CLAIM_SNAPSHOT" || true
    else
      set_writer_lock_state releasable || true
    fi
    exit 1
  fi
  set_writer_lock_state releasable
  if ! release_exclusive_writer_lock; then
    exit 1
  fi
  echo "apply-main-ruleset: PASS — creation intent claimed for ruleset $CLAIM_RULESET_ID; rollback: $CLAIM_BACKUP"
  exit 0
fi

if [ "$MODE" != "--apply-disabled" ] && [ "$MODE" != "--activate" ]; then
  echo "usage: apply-main-ruleset.sh --render|--apply-disabled|--activate|--open-break-glass <pr>|--close-break-glass <evidence>|--rollback <backup>|--claim-create <intent> <ruleset-id>" >&2
  exit 2
fi

REPOSITORY="${KIMEN_GITHUB_REPOSITORY:-kimen-dev/kimen}"
validate_repository "$REPOSITORY"
require_exclusive_writer_confirmation

prepare_secure_evidence_directory "$BACKUP_DIR"
PAYLOAD=$(mktemp)
ACTUAL=""
BACKUP_SNAPSHOT=""
BACKUP_SNAPSHOT_DIR=""
CREATE_INTENT=""
CURRENT=""
CURRENT_NORMALIZED=""
INITIAL_PAYLOAD=""
INTENT_SNAPSHOT=""
INTENT_SNAPSHOT_DIR=""
POST_RESPONSE=""
REVIEW_PR_PAYLOAD=""
REVIEW_CHECKS_PAYLOAD=""
CURRENT_REVIEW_SHA=""
REVIEW_APP_ID=""
cleanup() {
  if ! release_exclusive_writer_lock; then
    echo "apply-main-ruleset: CRITICAL — main-operation cleanup could not release the local writer lock" >&2
  fi
  rm -f "$PAYLOAD" "${ACTUAL:-}" "${CURRENT:-}" "${CURRENT_NORMALIZED:-}" "${INITIAL_PAYLOAD:-}" "${POST_RESPONSE:-}" "${REVIEW_PR_PAYLOAD:-}" "${REVIEW_CHECKS_PAYLOAD:-}"
  [ -z "${BACKUP_SNAPSHOT_DIR:-}" ] || rm -rf "$BACKUP_SNAPSHOT_DIR"
  [ -z "${INTENT_SNAPSHOT_DIR:-}" ] || rm -rf "$INTENT_SNAPSHOT_DIR"
}
trap cleanup EXIT
acquire_exclusive_writer_lock
require_github_access
render_payload > "$PAYLOAD"
if [ "$MODE" = "--activate" ]; then
  [ "${KIMEN_CONFIRM_RULESET_ACTIVATION:-}" = "activate-current-green-revision" ] || {
    echo "apply-main-ruleset: activation confirmation missing" >&2
    exit 1
  }
  INITIAL_PAYLOAD=$(mktemp)
  cp "$PAYLOAD" "$INITIAL_PAYLOAD"
  observe_current_review_check
  render_active_payload "$PAYLOAD" "$REVIEW_APP_ID" > "$PAYLOAD.active"
  mv "$PAYLOAD.active" "$PAYLOAD"
elif ! jq -e '.enforcement == "disabled"' "$PAYLOAD" >/dev/null; then
  echo "apply-main-ruleset: --apply-disabled requires a disabled payload" >&2
  exit 1
fi

EXISTING_ID=$(gh api --method GET -F includes_parents=false \
  "repos/$REPOSITORY/rulesets" --paginate \
  --jq ".[] | select(.source_type == \"Repository\" and .source == \"$REPOSITORY\" and .name == \"$RULESET_NAME\") | .id")
if [ -n "$EXISTING_ID" ]; then
  if ! jq -en --arg id "$EXISTING_ID" '$id | test("^[0-9]+$") and (tonumber | . == floor and . > 0 and . <= 9007199254740991)' >/dev/null; then
    echo "apply-main-ruleset: expected at most one positive integer ruleset ID" >&2
    exit 1
  fi
fi
if [ "$MODE" = "--activate" ] && [ -z "$EXISTING_ID" ]; then
  echo "apply-main-ruleset: --activate requires the verified disabled initial ruleset; run --apply-disabled first" >&2
  exit 1
fi
BACKUP=""
if [ -n "$EXISTING_ID" ]; then
  CURRENT=$(mktemp)
  CURRENT_NORMALIZED=$(mktemp)
  gh api --method GET -F includes_parents=false \
    "repos/$REPOSITORY/rulesets/$EXISTING_ID" > "$CURRENT"
  if ! jq -e --argjson id "$EXISTING_ID" --arg name "$RULESET_NAME" \
    --arg repository "$REPOSITORY" '
    .id == $id and
    .name == $name and
    .source_type == "Repository" and
    .source == $repository
  ' "$CURRENT" >/dev/null 2>&1; then
    echo "apply-main-ruleset: detail GET identity or repository origin does not match ruleset $EXISTING_ID; refusing rollback evidence" >&2
    exit 1
  fi
  jq '{name,target,enforcement,bypass_actors,conditions,rules}' "$CURRENT" > "$CURRENT_NORMALIZED"
  if [ "$MODE" = "--apply-disabled" ]; then
    if json_files_equal "$PAYLOAD" "$CURRENT_NORMALIZED"; then
      set_writer_lock_state releasable
      release_exclusive_writer_lock
      echo "apply-main-ruleset: PASS — ruleset $EXISTING_ID already matches the exact disabled initial payload; no-op"
      exit 0
    fi
    echo "apply-main-ruleset: existing ruleset is active, evaluate, or divergent from the exact disabled initial payload; refusing downgrade/overwrite" >&2
    exit 1
  fi
  if json_files_equal "$PAYLOAD" "$CURRENT_NORMALIZED"; then
    set_writer_lock_state releasable
    release_exclusive_writer_lock
    echo "apply-main-ruleset: PASS — ruleset $EXISTING_ID already matches the exact active review policy; no-op"
    exit 0
  fi
  if ! json_files_equal "$INITIAL_PAYLOAD" "$CURRENT_NORMALIZED"; then
    echo "apply-main-ruleset: live ruleset matches neither the exact active review policy nor the verified disabled initial payload; refusing activation" >&2
    exit 1
  fi
  if ! BACKUP=$(create_rollback_backup updated "$EXISTING_ID" "$CURRENT_NORMALIZED" "$PAYLOAD"); then
    echo "apply-main-ruleset: refusing update because rollback evidence could not be persisted" >&2
    exit 1
  fi
  if ! freeze_main_rollback_backup "$BACKUP"; then
    echo "apply-main-ruleset: refusing update because rollback evidence validation failed" >&2
    exit 1
  fi
  if ! observe_ruleset_exact "$EXISTING_ID" "$CURRENT_NORMALIZED"; then
    echo "apply-main-ruleset: live ruleset changed after rollback evidence was frozen; refusing PUT" >&2
    exit 1
  fi
  set_writer_lock_state mutating "main-put:$MODE" rollback-backup "$BACKUP" "$BACKUP_SNAPSHOT"
  assert_secure_evidence_chain_unchanged
  assert_writer_lock_identity
  if ! gh api --method PUT "repos/$REPOSITORY/rulesets/$EXISTING_ID" --input "$PAYLOAD" >/dev/null; then
    echo "apply-main-ruleset: PUT returned an ambiguous error; attempting verified rollback" >&2
    if rollback_backup "$BACKUP_SNAPSHOT"; then
      echo "apply-main-ruleset: recovered ruleset $EXISTING_ID after ambiguous PUT" >&2
      set_writer_lock_state releasable || true
    else
      echo "apply-main-ruleset: CRITICAL — rollback after ambiguous PUT was not confirmed for ruleset $EXISTING_ID; recovery backup: $BACKUP" >&2
      set_writer_lock_state recovery-ready "main-put:$MODE" rollback-backup "$BACKUP" "$BACKUP_SNAPSHOT" || true
    fi
    exit 1
  fi
  RULESET_ID="$EXISTING_ID"
  rm -f "$CURRENT"
  CURRENT=""
  rm -f "$CURRENT_NORMALIZED"
  CURRENT_NORMALIZED=""
else
  # GitHub's REST API cannot make POST plus local evidence transactional. This
  # durable pre-POST intent makes the residual crash window recoverable by
  # repository/name/payload reconciliation; it does not claim atomicity.
  if ! CREATE_INTENT=$(create_creation_intent "$PAYLOAD"); then
    echo "apply-main-ruleset: refusing POST because its recovery journal could not be persisted" >&2
    exit 1
  fi
  if ! INTENT_SNAPSHOT_DIR=$(make_private_snapshot_directory); then
    echo "apply-main-ruleset: refusing POST because its journal snapshot could not be allocated" >&2
    exit 1
  fi
  if ! freeze_evidence_pair "$CREATE_INTENT" "$INTENT_SNAPSHOT_DIR"; then
    echo "apply-main-ruleset: refusing POST because its journal provenance could not be frozen" >&2
    exit 1
  fi
  INTENT_SNAPSHOT="$FROZEN_EVIDENCE_PATH"
  if ! validate_creation_intent "$INTENT_SNAPSHOT" "$PAYLOAD"; then
    echo "apply-main-ruleset: refusing POST because its recovery journal is invalid" >&2
    exit 1
  fi
  POST_RESPONSE=$(mktemp)
  POST_STATUS=0
  set_writer_lock_state mutating main-post create-intent "$CREATE_INTENT" "$INTENT_SNAPSHOT"
  assert_secure_evidence_chain_unchanged
  assert_writer_lock_identity
  gh api --method POST "repos/$REPOSITORY/rulesets" --input "$PAYLOAD" > "$POST_RESPONSE" || POST_STATUS=$?
  RULESET_ID=""
  if [ "$POST_STATUS" -eq 0 ]; then
    if ! RULESET_ID=$(jq -er '.id | select(type == "number" and . == floor and . > 0 and . <= 9007199254740991)' "$POST_RESPONSE" 2>/dev/null); then
      RULESET_ID=""
    fi
  fi
  if [ "$POST_STATUS" -ne 0 ] || [ -z "$RULESET_ID" ]; then
    echo "apply-main-ruleset: POST response was ambiguous or malformed (status $POST_STATUS); reconciling by ruleset name" >&2
    if ! reconcile_ambiguous_creation "$PAYLOAD" "$CREATE_INTENT"; then
      echo "apply-main-ruleset: CRITICAL — ambiguous POST recovery is incomplete; journal: $CREATE_INTENT" >&2
    fi
    set_writer_lock_state recovery-ready main-post create-intent "$CREATE_INTENT" "$INTENT_SNAPSHOT" || true
    exit 1
  fi
  BACKUP_CREATION_FAILED=false
  if ! BACKUP=$(create_rollback_backup created "$RULESET_ID" "$PAYLOAD" "$PAYLOAD"); then
    BACKUP_CREATION_FAILED=true
  elif ! freeze_main_rollback_backup "$BACKUP"; then
    BACKUP_CREATION_FAILED=true
  fi
  if [ "$BACKUP_CREATION_FAILED" = true ]; then
    echo "apply-main-ruleset: ruleset $RULESET_ID was created but rollback evidence could not be persisted and validated" >&2
    if delete_ruleset_verified "$RULESET_ID" "$PAYLOAD"; then
      echo "apply-main-ruleset: removed ruleset $RULESET_ID after evidence failure; refusing success" >&2
      set_writer_lock_state releasable || true
    else
      echo "apply-main-ruleset: CRITICAL — ruleset $RULESET_ID may remain without rollback evidence" >&2
      set_writer_lock_state recovery-ready main-post create-intent "$CREATE_INTENT" "$INTENT_SNAPSHOT" || true
    fi
    exit 1
  fi
  set_writer_lock_state mutating main-post-created rollback-backup "$BACKUP" "$BACKUP_SNAPSHOT"
fi

if ! observe_ruleset_exact "$RULESET_ID" "$PAYLOAD"; then
  echo "apply-main-ruleset: final GET did not confirm the live payload; attempting verified rollback" >&2
  if rollback_backup "$BACKUP_SNAPSHOT"; then
    echo "apply-main-ruleset: recovered ruleset $RULESET_ID after final observation failure" >&2
    set_writer_lock_state releasable || true
  else
    echo "apply-main-ruleset: CRITICAL — rollback after final observation failure was not confirmed for ruleset $RULESET_ID; recovery backup: $BACKUP" >&2
    set_writer_lock_state recovery-ready main-final-observation rollback-backup "$BACKUP" "$BACKUP_SNAPSHOT" || true
  fi
  exit 1
fi
if [ "$MODE" = "--activate" ] && ! observe_current_review_check; then
  echo "apply-main-ruleset: current review observation changed during activation; rolling back" >&2
  if rollback_backup "$BACKUP_SNAPSHOT"; then
    set_writer_lock_state releasable || true
  else
    echo "apply-main-ruleset: CRITICAL — rollback after review re-observation failure was not confirmed; recovery backup: $BACKUP" >&2
    set_writer_lock_state recovery-ready main-review-recheck rollback-backup "$BACKUP" "$BACKUP_SNAPSHOT" || true
  fi
  exit 1
fi
set_writer_lock_state releasable
if ! release_exclusive_writer_lock; then
  exit 1
fi
echo "apply-main-ruleset: PASS — ruleset $RULESET_ID matches payload; rollback: $BACKUP"
