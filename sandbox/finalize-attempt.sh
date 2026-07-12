#!/usr/bin/env bash
# @spec:018-project-integrity-hardening#S5
# Host-authoritative finalization. The agent clone is product input only: its
# Git config, hooks, index, attributes machinery and refs are never used as the
# host control plane.
set -euo pipefail
umask 077

fail() {
  echo "finalize-attempt: $*" >&2
  exit 64
}

[ "${1:-}" = --repo ] || fail 'expected --repo <path> --attempt-id <id>'
REPO=${2:-}
[ "${3:-}" = --attempt-id ] || fail 'expected --attempt-id <id>'
ATTEMPT_ID=${4:-}
RECOVERY_MODE=0
if [ "$#" -eq 5 ] && [ "${5:-}" = --recovery ]; then
  RECOVERY_MODE=1
elif [ "$#" -ne 4 ]; then
  fail 'unexpected arguments'
fi
[[ "$ATTEMPT_ID" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]] || fail 'invalid attempt id'
[ -d "$REPO" ] && [ ! -L "$REPO" ] || fail 'repo must be a dedicated Git clone'
REPO=$(cd "$REPO" && pwd -P)
AGENT_GIT="$REPO/.git"

EVIDENCE_REL=".kimen/attempts/$ATTEMPT_ID.json"
EVIDENCE="$REPO/$EVIDENCE_REL"

# Resolve host executables before discarding the ambient Git environment. An
# explicit KIMEN_TRUSTED_GIT_BIN is a host-only test/operations seam; Git's own
# environment and PATH never select the executable used below.
NODE_BIN=$(command -v node) || fail 'node is required for evidence validation'
if [ -n "${KIMEN_TRUSTED_GIT_BIN:-}" ]; then
  GIT_BIN=$KIMEN_TRUSTED_GIT_BIN
elif [ -x /usr/bin/git ]; then
  GIT_BIN=/usr/bin/git
else
  GIT_BIN=$(command -v git) || fail 'git is required for finalization'
fi
case "$GIT_BIN" in
  /*) ;;
  *) fail 'trusted Git executable must be an absolute path' ;;
esac
[ -x "$GIT_BIN" ] && [ ! -d "$GIT_BIN" ] || fail 'trusted Git executable is not executable'
if [ -n "${KIMEN_TRUSTED_MV_BIN:-}" ]; then
  MV_BIN=$KIMEN_TRUSTED_MV_BIN
else
  MV_BIN=/bin/mv
fi
case "$MV_BIN" in
  /*) ;;
  *) fail 'trusted mv executable must be an absolute path' ;;
esac
[ -x "$MV_BIN" ] && [ ! -d "$MV_BIN" ] || fail 'trusted mv executable is not executable'
PROOF_FSYNC_BIN=${KIMEN_TRUSTED_PROOF_FSYNC_BIN:-}
if [ -n "$PROOF_FSYNC_BIN" ]; then
  case "$PROOF_FSYNC_BIN" in
    /*) ;;
    *) fail 'trusted proof-fsync executable must be an absolute path' ;;
  esac
  [ -x "$PROOF_FSYNC_BIN" ] && [ ! -d "$PROOF_FSYNC_BIN" ] || fail 'trusted proof-fsync executable is not executable'
fi

SAFE_PATH=/usr/bin:/bin
export PATH=$SAFE_PATH
CONTROL_PARENT=$(mktemp -d "$(dirname "$REPO")/.kimen-finalize.XXXXXX")
CONTROL_GIT="$CONTROL_PARENT/control.git"
CONTROL_HOME="$CONTROL_PARENT/home"
CONTROL_INDEX="$CONTROL_PARENT/index"
mkdir -p "$CONTROL_HOME"
PROMOTION_STEM="$(dirname "$REPO")/.${REPO##*/}.promotion-$ATTEMPT_ID"
PROMOTION_MARKER="$PROMOTION_STEM.state"
PROMOTION_BACKUP="$PROMOTION_STEM.agent.git"
FINALIZED_PROOF="$(dirname "$REPO")/.${REPO##*/}.finalized-$ATTEMPT_ID"
KEEP_CONTROL_PARENT=0

restore_incomplete_promotion() {
  local displaced=
  [ -e "$PROMOTION_MARKER" ] || return 0
  if [ ! -e "$PROMOTION_BACKUP" ]; then
    if [ -f "$FINALIZED_PROOF" ] && [ ! -L "$FINALIZED_PROOF" ] &&
      [ -f "$AGENT_GIT/kimen-host-control-v1" ] && [ ! -L "$AGENT_GIT/kimen-host-control-v1" ]; then
      rm -f "$PROMOTION_MARKER"
      return 0
    fi
    return 1
  fi
  [ -d "$PROMOTION_BACKUP" ] && [ ! -L "$PROMOTION_BACKUP" ] || return 1
  if [ -e "$AGENT_GIT" ]; then
    displaced="$PROMOTION_STEM.displaced.git"
    [ ! -e "$displaced" ] || return 1
    "$MV_BIN" "$AGENT_GIT" "$displaced" || return 1
  fi
  if ! "$MV_BIN" "$PROMOTION_BACKUP" "$AGENT_GIT"; then
    [ -z "$displaced" ] || "$MV_BIN" "$displaced" "$AGENT_GIT" || true
    return 1
  fi
  [ -z "$displaced" ] || rm -rf "$displaced"
  rm -f "$PROMOTION_MARKER"
  rm -f "$FINALIZED_PROOF" "$FINALIZED_PROOF.tmp"
}

if [ -e "$PROMOTION_MARKER" ]; then
  restore_incomplete_promotion || fail "incomplete Git promotion requires manual recovery: $PROMOTION_MARKER"
fi
if [ -e "$PROMOTION_BACKUP" ]; then
  if [ -f "$FINALIZED_PROOF" ] && [ ! -L "$FINALIZED_PROOF" ] &&
    [ -f "$AGENT_GIT/kimen-host-control-v1" ] && [ ! -L "$AGENT_GIT/kimen-host-control-v1" ]; then
    rm -rf "$PROMOTION_BACKUP"
  else
    fail "orphan Git promotion backup requires manual recovery: $PROMOTION_BACKUP"
  fi
fi
[ -d "$AGENT_GIT" ] && [ ! -L "$AGENT_GIT" ] || fail 'repo must have a regular Git control directory'
[ -d "$AGENT_GIT/objects" ] && [ ! -L "$AGENT_GIT/objects" ] || fail 'agent object store must be a regular directory'

cleanup() {
  if [ -e "${PROMOTION_MARKER:-}" ]; then
    if ! restore_incomplete_promotion; then
      KEEP_CONTROL_PARENT=1
      echo "finalize-attempt: retained promotion recovery state at $PROMOTION_MARKER" >&2
    fi
  fi
  if [ "${KEEP_CONTROL_PARENT:-0}" -eq 0 ]; then
    [ -z "${CONTROL_PARENT:-}" ] || rm -rf "$CONTROL_PARENT"
  fi
}
trap cleanup EXIT
trap 'exit 130' INT TERM

clean_git_env() {
  env -i \
    PATH="$SAFE_PATH" \
    HOME="$CONTROL_HOME" \
    XDG_CONFIG_HOME="$CONTROL_HOME/xdg" \
    TMPDIR="$CONTROL_PARENT" \
    LC_ALL=C \
    TZ=UTC \
    GIT_CONFIG_NOSYSTEM=1 \
    GIT_CONFIG_GLOBAL=/dev/null \
    GIT_ATTR_NOSYSTEM=1 \
    GIT_NO_REPLACE_OBJECTS=1 \
    GIT_OPTIONAL_LOCKS=0 \
    "$@"
}

trusted_git_init() {
  clean_git_env "$GIT_BIN" "$@"
}

trusted_git() {
  clean_git_env \
    GIT_DIR="$CONTROL_GIT" \
    GIT_WORK_TREE="$REPO" \
    GIT_INDEX_FILE="$CONTROL_INDEX" \
    GIT_LITERAL_PATHSPECS=1 \
    "$GIT_BIN" "$@"
}

trusted_node() {
  env -i PATH="$SAFE_PATH" HOME="$CONTROL_HOME" LC_ALL=C TZ=UTC "$NODE_BIN" "$@"
}

fsync_host_proof() {
  local target=$1
  if [ -n "$PROOF_FSYNC_BIN" ]; then
    "$PROOF_FSYNC_BIN" "$target"
    return
  fi
  trusted_node - "$target" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const target = process.argv[2];
const stat = fs.lstatSync(target);
if (!stat.isFile() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o077) !== 0) process.exit(65);
const file = fs.openSync(target, fs.constants.O_RDONLY);
try { fs.fsyncSync(file); } finally { fs.closeSync(file); }
const directory = fs.openSync(path.dirname(target), fs.constants.O_RDONLY);
try { fs.fsyncSync(directory); } finally { fs.closeSync(directory); }
NODE
}

validate_evidence_path() {
  trusted_node - "$REPO" "$EVIDENCE_REL" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [root, relative] = process.argv.slice(2);
const parts = relative.split('/');
let current = root;
for (const part of parts.slice(0, -1)) {
  current = path.join(current, part);
  const stat = fs.lstatSync(current);
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid() || (stat.mode & 0o022) !== 0) {
    process.exit(65);
  }
}
const evidence = fs.lstatSync(path.join(root, relative));
if (!evidence.isFile() || evidence.isSymbolicLink() || evidence.uid !== process.getuid() || (evidence.mode & 0o077) !== 0) {
  process.exit(65);
}
NODE
}

validate_worktree_ancestors() {
  local relative=$1
  trusted_node - "$REPO" "$relative" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [root, relative] = process.argv.slice(2);
const parts = relative.split('/');
let current = root;
const rootStat = fs.lstatSync(root);
if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) process.exit(65);
for (const part of parts.slice(0, -1)) {
  current = path.join(current, part);
  let stat;
  try { stat = fs.lstatSync(current); } catch (error) {
    if (error?.code === 'ENOENT') process.exit(0);
    throw error;
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) process.exit(65);
}
NODE
}

validate_evidence_path || fail 'attempt evidence or its ancestors are not host-owned and confined'

trusted_git_init init --quiet --bare "$CONTROL_GIT"

read_single_line() {
  local path=$1
  local extra
  READ_LINE=
  {
    IFS= read -r READ_LINE || [ -n "$READ_LINE" ] || return 1
    if IFS= read -r extra; then
      return 1
    fi
  } < "$path"
}

read_agent_head() {
  local head_file="$AGENT_GIT/HEAD"
  local ref
  local ref_file
  local sha=
  local packed_sha
  local packed_ref
  local extra
  [ -f "$head_file" ] && [ ! -L "$head_file" ] || fail 'agent HEAD must be a regular file'
  read_single_line "$head_file" || fail 'agent HEAD must contain exactly one line'
  if [[ "$READ_LINE" =~ ^[0-9a-f]{40}$ ]]; then
    sha=$READ_LINE
  elif [[ "$READ_LINE" == ref:\ refs/heads/* ]]; then
    ref=${READ_LINE#ref: }
    trusted_git check-ref-format "$ref" >/dev/null 2>&1 || fail 'agent HEAD names an invalid branch ref'
    [ -d "$AGENT_GIT/refs" ] && [ ! -L "$AGENT_GIT/refs" ] || fail 'agent refs must be a regular directory'
    if find "$AGENT_GIT/refs" -type l -print -quit | grep -q .; then
      fail 'agent refs contain a symbolic-link escape'
    fi
    ref_file="$AGENT_GIT/$ref"
    if [ -e "$ref_file" ]; then
      [ -f "$ref_file" ] && [ ! -L "$ref_file" ] || fail 'agent HEAD ref must be a regular file'
      read_single_line "$ref_file" || fail 'agent HEAD ref must contain exactly one line'
      sha=$READ_LINE
    else
      [ -f "$AGENT_GIT/packed-refs" ] && [ ! -L "$AGENT_GIT/packed-refs" ] || fail 'agent HEAD ref is absent'
      while IFS=' ' read -r packed_sha packed_ref extra; do
        [ "$packed_ref" = "$ref" ] || continue
        [ -z "$sha" ] || fail 'agent packed refs contain a duplicate HEAD ref'
        [ -z "$extra" ] || fail 'agent packed HEAD ref has trailing fields'
        sha=$packed_sha
      done < "$AGENT_GIT/packed-refs"
    fi
  else
    fail 'agent HEAD is neither a SHA-1 commit nor a local branch ref'
  fi
  [[ "$sha" =~ ^[0-9a-f]{40}$ ]] || fail 'agent HEAD does not resolve to a SHA-1 object'
  START_SHA=$sha
}

copy_native_objects() {
  local source_objects="$AGENT_GIT/objects"
  local source
  local relative
  local destination
  [ ! -e "$source_objects/info/alternates" ] || fail 'agent object alternates are forbidden'
  if find "$source_objects" -type l -print -quit | grep -q .; then
    fail 'agent object store contains a symbolic-link escape'
  fi
  while IFS= read -r -d '' source; do
    relative=${source#"$source_objects"/}
    case "$relative" in
      info/*) continue ;;
    esac
    if [[ "$relative" =~ ^[0-9a-f]{2}/[0-9a-f]{38}$ ]] ||
      [[ "$relative" =~ ^pack/pack-[0-9a-f]{40}\.(pack|idx|rev|bitmap)$ ]]; then
      destination="$CONTROL_GIT/objects/$relative"
      mkdir -p "$(dirname "$destination")"
      cp "$source" "$destination"
      chmod 0600 "$destination"
    fi
  done < <(find "$source_objects" -type f -print0)
}

read_agent_head

attempt_ref_exists() {
  local ref="refs/heads/loop/$ATTEMPT_ID"
  local loose="$AGENT_GIT/$ref"
  local packed_sha
  local packed_ref
  local extra
  if [ -e "$loose" ]; then
    [ -f "$loose" ] && [ ! -L "$loose" ] || fail 'attempt ref path is unsafe'
    return 0
  fi
  if [ -e "$AGENT_GIT/packed-refs" ]; then
    [ -f "$AGENT_GIT/packed-refs" ] && [ ! -L "$AGENT_GIT/packed-refs" ] || fail 'packed refs path is unsafe'
    while IFS=' ' read -r packed_sha packed_ref extra; do
      [ "$packed_ref" = "$ref" ] || continue
      return 0
    done < "$AGENT_GIT/packed-refs"
  fi
  return 1
}

if attempt_ref_exists; then
  fail 'attempt evidence ref already exists'
fi
copy_native_objects
trusted_git cat-file -e "$START_SHA^{commit}" 2>/dev/null || fail 'agent HEAD commit is absent from its native object store'
trusted_git fsck --strict --no-dangling "$START_SHA" >/dev/null 2>&1 || fail 'agent native object graph fails strict validation'

RECORDED_BASE=$(trusted_node -e '
  const fs = require("node:fs");
  const evidence = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  if (evidence.schemaVersion !== 1 || evidence.attemptId !== process.argv[2]) process.exit(65);
  if (!/^[0-9a-f]{40}$/.test(evidence.baseSha ?? "")) process.exit(65);
  if (!/^[0-9a-f]{64}$/.test(evidence.taskSha256 ?? "")) process.exit(65);
  if (!evidence.phases || typeof evidence.phases !== "object" || Array.isArray(evidence.phases)) process.exit(65);
  const required = [
    "bootstrapFirewall", "bootstrapProxy", "install", "browser", "leaseAcquire",
    "agentFirewall", "agentProxy", "agent", "agentDestroy", "leaseRevoke", "gates", "finalize",
  ];
  if (JSON.stringify(Object.keys(evidence.phases).sort()) !== JSON.stringify([...required].sort())) process.exit(65);
  const statuses = new Set(["not-run", "running", "passed", "failed", "interrupted"]);
  for (const phase of Object.values(evidence.phases)) {
    if (!phase || !statuses.has(phase.status)) process.exit(65);
    const terminal = !["not-run", "running"].includes(phase.status);
    if (terminal !== Number.isInteger(phase.exitCode)) process.exit(65);
    if (phase.status === "passed" && phase.exitCode !== 0) process.exit(65);
    if (["failed", "interrupted"].includes(phase.status) && phase.exitCode === 0) process.exit(65);
  }
  const forbidden = /token|secret|credential|authorization/i;
  const scan = (value) => {
    if (Array.isArray(value)) return value.forEach(scan);
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (forbidden.test(key)) process.exit(66);
        scan(child);
      }
    }
  };
  scan(evidence);
  process.stdout.write(evidence.baseSha);
' "$EVIDENCE" "$ATTEMPT_ID") || fail 'invalid or secret-bearing evidence'
trusted_git cat-file -e "$RECORDED_BASE^{commit}" 2>/dev/null || fail 'evidence baseSha is not a native commit in this repository'
trusted_git merge-base --is-ancestor "$RECORDED_BASE" "$START_SHA" 2>/dev/null ||
  fail 'pre-finalization HEAD does not descend from evidence baseSha'

if [ "$RECOVERY_MODE" -eq 1 ]; then
  trusted_node - "$EVIDENCE" <<'NODE'
const fs = require('node:fs');
const path = process.argv[2];
const evidence = JSON.parse(fs.readFileSync(path, 'utf8'));
for (const [name, phase] of Object.entries(evidence.phases)) {
  if (phase.status === 'running') evidence.phases[name] = { status: 'interrupted', exitCode: 130 };
}
evidence.phases.finalize = { status: 'interrupted', exitCode: 130 };
delete evidence.snapshotSha;
delete evidence.evidenceRef;
delete evidence.gateVerdict;
delete evidence.verdict;
const temporary = `${path}.recovering`;
fs.writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
fs.renameSync(temporary, path);
fs.chmodSync(path, 0o600);
NODE
fi

stage_path() {
  local path=$1
  local full="$REPO/$path"
  local mode
  local blob
  case "$path" in
    '' | /* | ../* | */../* | */.. | .git | .git/*) fail 'unsafe worktree path in Git input' ;;
    .kimen/attempts/*)
      trusted_git update-index --force-remove -- "$path" >/dev/null 2>&1 || true
      return
      ;;
  esac
  validate_worktree_ancestors "$path" || fail "worktree path escapes through an unsafe ancestor: $path"
  if [ -L "$full" ]; then
    mode=120000
    blob=$(trusted_node -e 'process.stdout.write(require("node:fs").readlinkSync(process.argv[1]))' "$full" |
      trusted_git hash-object -w --stdin)
  elif [ -f "$full" ]; then
    if [ -x "$full" ]; then mode=100755; else mode=100644; fi
    blob=$(trusted_git hash-object -w --stdin < "$full")
  elif [ -d "$full" ]; then
    # A tracked gitlink is already represented by the trusted starting tree.
    # Ordinary directories are expanded by ls-files and need no index entry.
    return
  elif [ ! -e "$full" ]; then
    trusted_git update-index --force-remove -- "$path" >/dev/null 2>&1 || true
    return
  else
    fail "unsupported worktree file type: $path"
  fi
  trusted_git update-index --add --cacheinfo "$mode" "$blob" "$path"
}

# Build the snapshot from a fresh host index. No agent index, fsmonitor, hook,
# signing configuration or attribute filter participates. hash-object without
# --path deliberately stores raw bytes and never invokes clean filters.
trusted_git read-tree "$START_SHA"
TRACKED_LIST="$CONTROL_PARENT/tracked.zlist"
UNTRACKED_LIST="$CONTROL_PARENT/untracked.zlist"
trusted_git ls-files -z --cached > "$TRACKED_LIST"
while IFS= read -r -d '' path; do
  stage_path "$path"
done < "$TRACKED_LIST"
trusted_git ls-files -z --others --exclude-standard > "$UNTRACKED_LIST"
while IFS= read -r -d '' path; do
  stage_path "$path"
done < "$UNTRACKED_LIST"
trusted_git update-index --force-remove -- "$EVIDENCE_REL" >/dev/null 2>&1 || true
SNAPSHOT_TREE=$(trusted_git write-tree)
COMMIT_DATE=$(/bin/date -u '+%Y-%m-%dT%H:%M:%SZ')

trusted_commit_tree() {
  clean_git_env \
    GIT_DIR="$CONTROL_GIT" \
    GIT_NO_REPLACE_OBJECTS=1 \
    GIT_AUTHOR_NAME=kimen-loop \
    GIT_AUTHOR_EMAIL=loop@kimen.local \
    GIT_AUTHOR_DATE="$COMMIT_DATE" \
    GIT_COMMITTER_NAME=kimen-loop \
    GIT_COMMITTER_EMAIL=loop@kimen.local \
    GIT_COMMITTER_DATE="$COMMIT_DATE" \
    "$GIT_BIN" commit-tree "$@"
}

SNAPSHOT_SHA=$(printf 'wip(loop): product snapshot %s\n' "$ATTEMPT_ID" |
  trusted_commit_tree "$SNAPSHOT_TREE" -p "$START_SHA")

write_final_evidence() {
  local finalize_status=$1
  local finalize_rc=$2
  trusted_node - "$EVIDENCE" "$ATTEMPT_ID" "$RECORDED_BASE" "$SNAPSHOT_SHA" \
    "$finalize_status" "$finalize_rc" "$RECOVERY_MODE" <<'NODE'
const fs = require('node:fs');
const [path, attemptId, baseSha, snapshotSha, finalizeStatus, rawFinalizeRc, rawRecoveryMode] = process.argv.slice(2);
const evidence = JSON.parse(fs.readFileSync(path, 'utf8'));
if (evidence.schemaVersion !== 1 || evidence.attemptId !== attemptId || evidence.baseSha !== baseSha) {
  process.exit(65);
}
const statuses = new Set(['not-run', 'running', 'passed', 'failed', 'interrupted']);
for (const phase of Object.values(evidence.phases ?? {})) {
  if (!phase || !statuses.has(phase.status)) process.exit(65);
  const terminal = !['not-run', 'running'].includes(phase.status);
  if (terminal !== Number.isInteger(phase.exitCode)) process.exit(65);
  if (phase.status === 'passed' && phase.exitCode !== 0) process.exit(65);
  if (['failed', 'interrupted'].includes(phase.status) && phase.exitCode === 0) process.exit(65);
}
const passed = (phase) => phase?.status === 'passed' && phase.exitCode === 0;
const gateGreen = passed(evidence.phases.gates);
const requiredPassed = [
  'bootstrapFirewall', 'bootstrapProxy', 'install', 'browser', 'leaseAcquire',
  'agentFirewall', 'agentProxy', 'agentDestroy', 'leaseRevoke', 'gates',
].every((name) => passed(evidence.phases[name]));
const agentTerminal = ['passed', 'failed', 'interrupted'].includes(evidence.phases.agent?.status)
  && Number.isInteger(evidence.phases.agent?.exitCode);
evidence.snapshotSha = snapshotSha;
evidence.evidenceRef = `loop/${attemptId}`;
evidence.gateVerdict = gateGreen ? 'green' : 'red';
const recoveryMode = rawRecoveryMode === '1';
evidence.verdict = !recoveryMode && gateGreen && requiredPassed && agentTerminal && finalizeStatus === 'passed' ? 'green' : 'red';
evidence.phases.finalize = { status: finalizeStatus, exitCode: Number(rawFinalizeRc) };
const temporary = `${path}.finalizing`;
fs.writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
fs.renameSync(temporary, path);
fs.chmodSync(path, 0o600);
NODE
}

create_evidence_commit() {
  local evidence_blob
  local evidence_tree
  trusted_git read-tree "$SNAPSHOT_SHA"
  evidence_blob=$(trusted_git hash-object -w --stdin < "$EVIDENCE")
  trusted_git update-index --add --cacheinfo 100644 "$evidence_blob" "$EVIDENCE_REL"
  evidence_tree=$(trusted_git write-tree)
  printf 'chore(loop): evidence %s\n' "$ATTEMPT_ID" |
    trusted_commit_tree "$evidence_tree" -p "$SNAPSHOT_SHA"
}

if [ "$RECOVERY_MODE" -eq 1 ]; then
  write_final_evidence interrupted 130
else
  write_final_evidence passed 0
fi
set +e
EVIDENCE_SHA=$(create_evidence_commit)
EVIDENCE_COMMIT_RC=$?
set -e
FINAL_RC=0
if [ "$EVIDENCE_COMMIT_RC" -ne 0 ]; then
  write_final_evidence failed "$EVIDENCE_COMMIT_RC"
  EVIDENCE_SHA=$(create_evidence_commit) || fail 'unable to retain recovered finalizer evidence'
  FINAL_RC=$EVIDENCE_COMMIT_RC
fi

trusted_git update-ref "refs/heads/loop/$ATTEMPT_ID" "$EVIDENCE_SHA"
trusted_git symbolic-ref HEAD "refs/heads/loop/$ATTEMPT_ID"
trusted_git config core.bare false
trusted_git config core.logAllRefUpdates true
printf 'schemaVersion=1\nattemptId=%s\n' "$ATTEMPT_ID" > "$CONTROL_GIT/kimen-host-control-v1"
chmod 0600 "$CONTROL_GIT/kimen-host-control-v1"

# Promote only the clean host control directory. The old Git directory never
# regains authority after a successful finalization.
printf 'schemaVersion=1\ncontrol=%s\n' "$CONTROL_GIT" > "$PROMOTION_MARKER.tmp"
chmod 0600 "$PROMOTION_MARKER.tmp"
"$MV_BIN" "$PROMOTION_MARKER.tmp" "$PROMOTION_MARKER"
set +e
fsync_host_proof "$PROMOTION_MARKER"
PROMOTION_FSYNC_RC=$?
set -e
if [ "$PROMOTION_FSYNC_RC" -ne 0 ]; then
  rm -f "$PROMOTION_MARKER"
  exit "$PROMOTION_FSYNC_RC"
fi
"$MV_BIN" "$AGENT_GIT" "$PROMOTION_BACKUP"
set +e
"$MV_BIN" "$CONTROL_GIT" "$AGENT_GIT"
PROMOTION_RC=$?
set -e
if [ "$PROMOTION_RC" -ne 0 ]; then
  if ! "$MV_BIN" "$PROMOTION_BACKUP" "$AGENT_GIT"; then
    KEEP_CONTROL_PARENT=1
    echo "finalize-attempt: promotion failed; recovery state retained at $PROMOTION_MARKER" >&2
  else
    rm -f "$PROMOTION_MARKER"
  fi
  exit "$PROMOTION_RC"
fi
CONTROL_GIT=
printf 'schemaVersion=1\nrefSha=%s\n' "$EVIDENCE_SHA" > "$FINALIZED_PROOF.tmp"
chmod 0600 "$FINALIZED_PROOF.tmp"
"$MV_BIN" "$FINALIZED_PROOF.tmp" "$FINALIZED_PROOF"
set +e
fsync_host_proof "$FINALIZED_PROOF"
PROOF_FSYNC_RC=$?
set -e
if [ "$PROOF_FSYNC_RC" -ne 0 ]; then
  exit "$PROOF_FSYNC_RC"
fi
rm -f "$PROMOTION_MARKER"
rm -rf "$PROMOTION_BACKUP"

if [ "$FINAL_RC" -ne 0 ]; then
  exit "$FINAL_RC"
fi
VERDICT=$(trusted_node -e '
  const evidence = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
  process.stdout.write(evidence.verdict);
' "$EVIDENCE")
[ "$VERDICT" = green ] && exit 0
exit 1
