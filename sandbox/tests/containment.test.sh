#!/usr/bin/env bash
# @spec:018-project-integrity-hardening#S4
# Linux/Docker behavioral fixture: the agent UID must not send direct DNS while
# the dedicated proxy UID retains only its declared resolver path. The Docker
# network is internal, so this test never reaches the Internet or real DNS.
set -euo pipefail

REQUIRE_DOCKER=${KIMEN_REQUIRE_DOCKER_CONTAINMENT:-0}
IMAGE=${KIMEN_CONTAINMENT_IMAGE:-kimen-sandbox}
NETWORK="kimen-s4-containment-$$"
RESOLVER="kimen-s4-resolver-$$"

fail() {
  echo "FAIL: S4 containment: $*" >&2
  exit 1
}

skip_or_fail() {
  if [ "$REQUIRE_DOCKER" = 1 ]; then
    fail "$1 (KIMEN_REQUIRE_DOCKER_CONTAINMENT=1)"
  fi
  echo "SKIP: S4 containment: $1; set KIMEN_REQUIRE_DOCKER_CONTAINMENT=1 in the mandatory Linux gate"
  exit 0
}

cleanup() {
  docker rm -f "$RESOLVER" >/dev/null 2>&1 || true
  docker network rm "$NETWORK" >/dev/null 2>&1 || true
}

case "$REQUIRE_DOCKER" in
  0 | 1) ;;
  *) fail 'KIMEN_REQUIRE_DOCKER_CONTAINMENT must be 0 or 1' ;;
esac

command -v docker >/dev/null 2>&1 || skip_or_fail 'Docker CLI is unavailable'
docker info >/dev/null 2>&1 || skip_or_fail 'Docker daemon is unavailable'
docker image inspect "$IMAGE" >/dev/null 2>&1 || skip_or_fail "image $IMAGE is unavailable"

trap cleanup EXIT INT TERM
docker network create --internal "$NETWORK" >/dev/null

docker run --detach --rm \
  --name "$RESOLVER" \
  --network "$NETWORK" \
  --user 0 \
  "$IMAGE" \
  node -e \
  "const d=require('node:dgram').createSocket('udp4');d.on('message',(m,r)=>d.send(m,r.port,r.address));d.bind(53,'0.0.0.0',()=>console.log('fixture-ready'))" \
  >/dev/null

for _ in 1 2 3 4 5 6 7 8 9 10; do
  docker logs "$RESOLVER" 2>&1 | grep -q '^fixture-ready$' && break
  sleep 0.1
done
docker logs "$RESOLVER" 2>&1 | grep -q '^fixture-ready$' || fail 'isolated DNS fixture did not start'

RESOLVER_IP=$(docker inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "$RESOLVER")
[ -n "$RESOLVER_IP" ] || fail 'isolated DNS fixture has no address'

docker run --rm \
  --network "$NETWORK" \
  --cap-add NET_ADMIN \
  --cap-add NET_RAW \
  --user 0 \
  --env "S4_RESOLVER_IP=$RESOLVER_IP" \
  "$IMAGE" \
  bash -ceu '
    KIMEN_DNS_RESOLVER_IP="$S4_RESOLVER_IP" /usr/local/bin/init-firewall.sh >/tmp/firewall.log

    probe_dns() {
      node -e "
        const d = require(\"node:dgram\").createSocket(\"udp4\");
        const done = (code) => { d.close(); process.exit(code); };
        const timeout = setTimeout(() => done(3), 500);
        d.once(\"error\", () => { clearTimeout(timeout); done(2); });
        d.once(\"message\", (message) => {
          clearTimeout(timeout);
          done(message.toString() === \"S4-direct-dns-probe\" ? 0 : 4);
        });
        d.send(Buffer.from(\"S4-direct-dns-probe\"), 53, process.env.S4_RESOLVER_IP);
      "
    }

    if sudo -u node --preserve-env=S4_RESOLVER_IP bash -c "$(declare -f probe_dns); probe_dns"; then
      echo "FAIL: S4 containment: agent UID reached DNS directly" >&2
      exit 1
    fi

    id kimen-proxy >/dev/null 2>&1 || {
      echo "FAIL: S4 containment: dedicated proxy UID is absent" >&2
      exit 1
    }
    sudo -u kimen-proxy --preserve-env=S4_RESOLVER_IP bash -c "$(declare -f probe_dns); probe_dns" || {
      echo "FAIL: S4 containment: proxy UID cannot reach its declared resolver" >&2
      exit 1
    }
  '

echo 'PASS: S4 agent DNS is denied and the proxy resolver path remains explicit'
