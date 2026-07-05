#!/usr/bin/env bash
# ONE-TIME setup: sign Codex in with your ChatGPT subscription.
# The auth token persists in a docker volume (kimen-codex-auth) that only
# sandbox containers mount. Revoke anytime from your ChatGPT account.
#
# Usage: bash sandbox/login.sh
set -euo pipefail
cd "$(dirname "$0")/.."

docker build -t kimen-sandbox sandbox/
echo ""
echo "Se abrirá un enlace de login: cópialo en tu navegador si no se abre solo."
echo ""
exec docker run --rm -it \
  --cap-add=NET_ADMIN --cap-add=NET_RAW \
  -p 1455:1455 \
  -v kimen-codex-auth:/home/node/.codex \
  kimen-sandbox \
  bash -lc 'sudo /usr/local/bin/init-firewall.sh >/dev/null && codex login'
