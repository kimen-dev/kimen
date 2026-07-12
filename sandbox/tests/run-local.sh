#!/usr/bin/env bash
# Portable S4-S5 contracts. The final containment test skips only when Docker
# is unavailable; CI sets KIMEN_REQUIRE_DOCKER_CONTAINMENT=1 and owns the
# authoritative Linux firewall result.
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

bash sandbox/tests/loop-entry.test.sh
bash sandbox/tests/loop-host.test.sh
node --test sandbox/tests/proxy.test.mjs
bash sandbox/tests/containment.test.sh
