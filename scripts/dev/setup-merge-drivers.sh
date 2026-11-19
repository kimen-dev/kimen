#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

git config --local merge.kimen-generated.name 'Use incoming generated files and regenerate'
git config --local merge.kimen-generated.driver 'cp -- %B %A'
echo 'Installed the Kimen generated-file merge driver. Merge main into your branch, then run pnpm regen.'
