#!/usr/bin/env bash
# Stryker invokes buildCommand without a shell. Build both fixture tokens and
# instrumented component outputs before it starts either Vitest project.
set -euo pipefail
pnpm --filter @kimen/tokens build
pnpm --filter @kimen/elements exec stencil build
