#!/usr/bin/env bash
# Run a command with TMPDIR on a filesystem other than the repository's.
#
# The cross-device regressions (site-publication, cache-env-reentry) need the
# caller to designate such a TMPDIR, and report a blocked prerequisite when it
# does not. CI designates one in the workflow: a private tmpfs
# (.github/workflows/ci.yml). A macOS checkout has none: its TMPDIR, under
# /var/folders, shares the repository's APFS volume. There this wrapper is the
# local counterpart of that CI step: it creates a sparse APFS disk image in a
# private directory under the caller's TMPDIR, mounts it out of Finder's sight,
# runs the command with TMPDIR on it, and detaches and removes it when the
# command ends, however it ends. No sudo, nothing outside that directory.
#
# Anywhere else, and whenever the caller's TMPDIR already crosses a filesystem
# boundary (CI, or a nested run of this wrapper), the command runs untouched.
# If the image cannot be made, the command still runs with the caller's
# TMPDIR, and the cross-device cases report their blocked prerequisite.
set -uo pipefail
umask 077

note() {
  printf 'cross-device-tmpdir: %s\n' "$1" >&2
}

[ "${1:-}" = '--' ] || {
  note 'usage: cross-device-tmpdir.sh -- command...'
  exit 2
}
shift
[ "$#" -gt 0 ] || {
  note 'usage: cross-device-tmpdir.sh -- command...'
  exit 2
}

[ "$(uname -s)" = 'Darwin' ] || exec "$@"

repository_root="$(CDPATH='' cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd -P)"
base="${TMPDIR:-/tmp}"
base="${base%/}"
repository_device="$(stat -f %d "$repository_root")" || exec "$@"
base_device="$(stat -f %d "$base" 2>/dev/null)" || {
  note "the caller's TMPDIR $base could not be read; running with it unchanged"
  exec "$@"
}
[ "$base_device" != "$repository_device" ] && exec "$@"

command -v hdiutil >/dev/null 2>&1 || {
  note 'hdiutil is unavailable; running with the caller TMPDIR, which shares the repository volume'
  exec "$@"
}

scratch="$(mktemp -d "$base/kimen-cross-device.XXXXXX")" || {
  note "no private directory could be made under $base; running with it unchanged"
  exec "$@"
}
image="$scratch/tmp.sparseimage"
mountpoint="$scratch/mnt"
mounted=0

cleanup() {
  if [ "$mounted" -eq 1 ]; then
    hdiutil detach -quiet "$mountpoint" 2>/dev/null ||
      hdiutil detach -quiet -force "$mountpoint" 2>/dev/null ||
      note "could not detach $mountpoint; detach it with: hdiutil detach -force '$mountpoint'"
  fi
  rm -rf "$scratch"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if mkdir "$mountpoint" &&
  hdiutil create -quiet -size 4g -type SPARSE -fs APFS -volname kimen-tmp "$image" &&
  hdiutil attach -quiet -nobrowse -noautoopen -owners on -mountpoint "$mountpoint" "$image"; then
  mounted=1
fi

if [ "$mounted" -eq 1 ] && [ "$(stat -f %d "$mountpoint")" != "$repository_device" ]; then
  TMPDIR="$mountpoint" "$@"
else
  note "no separate volume could be mounted; running with the caller's TMPDIR $base, which shares the repository volume"
  "$@"
fi
