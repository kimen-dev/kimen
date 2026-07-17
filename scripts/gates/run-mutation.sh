#!/usr/bin/env bash
# Run mutation testing under the same isolated cache contract as the full
# gate suite. Two modes, both dedicated cadences and never per PR (Art. III):
#   (default)              changed-core mutation over the discovered diff —
#                          the daily cron in .github/workflows/mutation.yml.
#   --scope full-elements  full mutation of every component implementation in
#                          packages/elements/src/components — the weekly cron.
#                          Optional positional args narrow to named component
#                          directories (diagnostics), e.g.:
#                            run-mutation.sh --scope full-elements ki-badge
# Re-entry preserves optional diagnostic flags such as --force.
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

if [ "${KIMEN_CACHE_ENV_READY:-}" != '1' ]; then
  exec bash scripts/gates/cache-env.sh -- bash scripts/gates/run-mutation.sh "$@"
fi
bash scripts/gates/cache-env.sh --validate

exec node scripts/gates/mutation-changed.mjs --run "$@"
