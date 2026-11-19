#!/usr/bin/env bash
# Local Nx feedback for changes whose scope is described by the project graph.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if [ -n "${CI:-}" ] || [ "${KIMEN_SANDBOX:-}" = '1' ]; then
  echo 'gates-affected: --affected is local-only; run the full suite here' >&2
  exit 1
fi

echo 'AFFECTED CHECKS — limited verification; use the full suite before a PR and CI for release evidence.'
base_ref="${NX_BASE:-origin/main}"
if ! base="$(git merge-base "$base_ref" HEAD)"; then
  echo "gates-affected: cannot determine a merge base with $base_ref; running the full suite"
  exec bash scripts/gates/gates-suite.sh
fi

# Git quotes unusual paths. Anything outside known Nx roots takes the full
# path, including an untracked root file or a rename out of an Nx project.
changes="$(git -c core.quotePath=true diff --no-renames --name-only "$base" -- &&
  git -c core.quotePath=true ls-files --others --exclude-standard)"
if [ -z "$changes" ]; then
  echo 'AFFECTED CHECKS — no changed files'
  exit 0
fi
while IFS= read -r file; do
  case "$file" in
    packages/*/* | site/docs/* | tools/kimen-plugin/*) ;;
    *)
      echo "gates-affected: shared input $file; running the full suite"
      exec bash scripts/gates/gates-suite.sh
      ;;
  esac
done <<< "$changes"

export NX_TUI=false KIMEN_BROWSER_ENGINE=chromium
# Keep the index, working tree and untracked files in Nx's default base-only scope.
unset NX_HEAD
bash scripts/gates/cache-env.sh -- pnpm exec nx affected -t build test size --base="$base" --nxBail=true
bash scripts/gates/cache-env.sh -- pnpm exec nx affected -t test-browser test-browser-wrapper --base="$base" --skipNxCache --excludeTaskDependencies --outputStyle=stream --nxBail=true
echo 'AFFECTED CHECKS PASS'
