#!/usr/bin/env bash
# Run changed-core mutation under the same isolated cache contract as the full
# gate suite. Re-entry preserves optional diagnostic flags such as --force.
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

if [ "${KIMEN_CACHE_ENV_READY:-}" != '1' ]; then
  exec bash scripts/gates/cache-env.sh -- bash scripts/gates/run-mutation.sh "$@"
fi
bash scripts/gates/cache-env.sh --validate

exec node scripts/gates/mutation-changed.mjs --run "$@"
