#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# The token build also writes the reference. Stencil emits the wrappers while
# building elements; its surface build writes the manifest and agent docs.
# Catalog generation consumes the freshly generated Custom Elements Manifest.
pnpm --filter @kimen/tokens build
pnpm --filter @kimen/elements build
pnpm --filter @kimen/catalog build
