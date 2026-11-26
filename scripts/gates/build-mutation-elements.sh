#!/usr/bin/env bash
# Stryker invokes buildCommand without a shell. Build both fixture tokens and
# instrumented component outputs before it starts either Vitest project.
set -euo pipefail
pnpm --filter @kimen/tokens build
node packages/elements/scripts/build-surfaces.mjs --prepare-package-summary
node packages/elements/scripts/generate-icons.mjs
pnpm --filter @kimen/elements exec stencil build
node packages/elements/scripts/write-loader.mjs
