#!/usr/bin/env bash
# @spec:018-project-integrity-hardening#S4
# @spec:018-project-integrity-hardening#S5
set -euo pipefail

PHASE=${1:-${KIMEN_LOOP_PHASE:-}}
AGENT_UID=$(id -u node)
PROXY_PID=
CHILD_PID=
PHASE_EVIDENCE_DIR=/run/kimen-phase
PHASE_EVIDENCE_FILE="$PHASE_EVIDENCE_DIR/evidence.json"

cleanup() {
  [ -z "$CHILD_PID" ] || kill "$CHILD_PID" 2>/dev/null || true
  [ -z "$PROXY_PID" ] || kill "$PROXY_PID" 2>/dev/null || true
  rm -f /run/kimen/model-lease.json
}
trap cleanup EXIT
trap 'exit 130' INT TERM

init_phase_evidence() {
  install -d -m 0700 -o root -g root "$PHASE_EVIDENCE_DIR"
  node - "$PHASE_EVIDENCE_FILE" "$PHASE" <<'NODE'
const fs = require('node:fs');
const [path, phase] = process.argv.slice(2);
const notRun = { status: 'not-run', exitCode: null };
const evidence = {
  schemaVersion: 1,
  phase,
  milestones: {
    firewall: notRun,
    proxy: notRun,
    childStarted: notRun,
  },
};
fs.writeFileSync(path, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
fs.chmodSync(path, 0o600);
NODE
}

record_milestone() {
  local name=$1
  local status=$2
  local raw_rc=$3
  node - "$PHASE_EVIDENCE_FILE" "$name" "$status" "$raw_rc" <<'NODE'
const fs = require('node:fs');
const [path, name, status, rawRc] = process.argv.slice(2);
const evidence = JSON.parse(fs.readFileSync(path, 'utf8'));
if (!Object.hasOwn(evidence.milestones, name)) process.exit(65);
evidence.milestones[name] = { status, exitCode: rawRc === 'null' ? null : Number(rawRc) };
const temporary = `${path}.tmp`;
fs.writeFileSync(temporary, `${JSON.stringify(evidence, null, 2)}\n`, { mode: 0o600 });
fs.renameSync(temporary, path);
fs.chmodSync(path, 0o600);
NODE
}

run_as_agent() {
  record_milestone childStarted running null
  sudo -u node --preserve-env=KIMEN_LOOP_PHASE,KIMEN_TASK,KIMEN_AGENT_TIMEOUT_SECONDS,KIMEN_MODEL_LEASE_FILE,KIMEN_FIREWALL_READY,HTTPS_PROXY,HTTP_PROXY,ALL_PROXY,NO_PROXY,https_proxy,http_proxy,all_proxy,no_proxy \
    bash /usr/local/bin/loop-entry.sh "$PHASE" &
  CHILD_PID=$!
  record_milestone childStarted passed 0
  set +e
  wait "$CHILD_PID"
  child_rc=$?
  set -e
  CHILD_PID=
  return "$child_rc"
}

start_contained_proxy() {
  local firewall_rc
  record_milestone firewall running null
  set +e
  /usr/local/bin/init-firewall.sh
  firewall_rc=$?
  set -e
  if [ "$firewall_rc" -ne 0 ]; then
    record_milestone firewall failed "$firewall_rc"
    return "$firewall_rc"
  fi
  record_milestone firewall passed 0
  record_milestone proxy running null
  sudo -u kimen-proxy --preserve-env=NODE_OPTIONS \
    node /usr/local/lib/kimen/proxy.mjs serve \
      --allowlist /etc/kimen/egress-allowlist.txt \
      --phase "$PHASE" \
      --listen 127.0.0.1:8443 \
      --agent-uid "$AGENT_UID" &
  PROXY_PID=$!
  proxy_ready=0
  for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20; do
    if node -e '
      const net = require("node:net");
      const socket = net.createConnection({ host: "127.0.0.1", port: 8443 });
      socket.once("connect", () => { socket.end(); process.exit(0); });
      socket.once("error", () => process.exit(1));
      setTimeout(() => process.exit(1), 100);
    '; then
      proxy_ready=1
      break
    fi
    kill -0 "$PROXY_PID" 2>/dev/null || break
    sleep 0.05
  done
  [ "$proxy_ready" -eq 1 ] || {
    record_milestone proxy failed 70
    echo 'phase-entry: contained proxy did not become ready' >&2
    return 70
  }
  record_milestone proxy passed 0
  export HTTPS_PROXY=http://127.0.0.1:8443
  export HTTP_PROXY=$HTTPS_PROXY
  export ALL_PROXY=$HTTPS_PROXY
  export NO_PROXY=127.0.0.1,localhost
  export https_proxy=$HTTPS_PROXY
  export http_proxy=$HTTPS_PROXY
  export all_proxy=$HTTPS_PROXY
  export no_proxy=$NO_PROXY
}

[ "$(id -u)" -eq 0 ] || {
  echo 'phase-entry: must run as container root' >&2
  exit 64
}
init_phase_evidence

case "$PHASE" in
  bootstrap)
    [ -z "${KIMEN_MODEL_LEASE_FILE:-}${KIMEN_MODEL_LEASE_SOURCE:-}" ] || exit 97
    start_contained_proxy
    export KIMEN_FIREWALL_READY=1
    run_as_agent
    ;;
  agent)
    source_path=${KIMEN_MODEL_LEASE_SOURCE:-}
    [ -n "$source_path" ] && [ -f "$source_path" ] && [ ! -L "$source_path" ] || exit 98
    install -d -m 0700 -o node -g node /run/kimen
    install -m 0400 -o node -g node "$source_path" /run/kimen/model-lease.json
    export KIMEN_MODEL_LEASE_FILE=/run/kimen/model-lease.json
    start_contained_proxy
    run_as_agent
    ;;
  gates)
    [ -z "${KIMEN_MODEL_LEASE_FILE:-}${KIMEN_MODEL_LEASE_SOURCE:-}" ] || exit 97
    run_as_agent
    ;;
  *)
    echo 'usage: phase-entry.sh <bootstrap|agent|gates>' >&2
    exit 64
    ;;
esac
