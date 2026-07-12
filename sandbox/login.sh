#!/usr/bin/env bash
set -euo pipefail

echo 'sandbox/login.sh is retired: unattended Kimen runs accept only a host-verified ephemeral model lease.' >&2
echo 'Configure KIMEN_MODEL_LEASE_HELPER and the pinned public keyring described in sandbox/README.md.' >&2
exit 64
