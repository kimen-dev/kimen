#!/usr/bin/env bash
# Compatibility entrypoint: all unattended execution now flows through the
# host-authoritative split-phase loop. Static API keys and interactive mutable
# images are intentionally unsupported.
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd -P)
exec bash "$ROOT/sandbox/loop.sh" "$@"
