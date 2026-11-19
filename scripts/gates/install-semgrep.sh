#!/usr/bin/env bash
# Install the pinned Semgrep engine for a workflow job, from the hash-locked
# requirements in .semgrep/requirements.txt.
#
# `pipx install semgrep==X` pins one package and lets pip choose its seventy
# dependencies when the job runs. One of those jobs builds the tarballs a
# release publishes, so nothing unvouched may run beside them: this installs
# only what the lock names, checks every file against its hash, resolves no
# dependency and builds nothing from source.
#
# Usage: install-semgrep.sh <absolute directory>
#   Creates <directory>/venv and a <directory>/bin holding only the `semgrep`
#   launcher, and adds that bin to the job's PATH. The environment's own
#   python and pip stay off PATH, so later steps keep the runner's.
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

fail() {
  printf 'install-semgrep: %s\n' "$1" >&2
  exit 1
}

[ "$#" -eq 1 ] || fail 'usage: install-semgrep.sh <absolute directory>'
target="$1"
case "$target" in
  /*) ;;
  *) fail 'the directory must be an absolute path' ;;
esac
[ ! -e "$target" ] || fail "refusing to install into an existing path: $target"

lock='.semgrep/requirements.txt'
expected="$(sed -n "s/^SEMGREP_VERSION='\(.*\)'$/\1/p" scripts/gates/semgrep-scan.sh)"
[ -n "$expected" ] || fail 'scripts/gates/semgrep-scan.sh pins no SEMGREP_VERSION'
grep -q "^semgrep==${expected} " "$lock" ||
  fail "$lock does not pin semgrep==${expected}; regenerate it (see .semgrep/README.md)"

python3 -m venv "$target/venv"
"$target/venv/bin/python" -m pip install --disable-pip-version-check --quiet --require-hashes --no-deps --only-binary :all: -r "$lock"

mkdir "$target/bin"
printf '#!/usr/bin/env bash\nexec %q "$@"\n' "$target/venv/bin/semgrep" >"$target/bin/semgrep"
chmod +x "$target/bin/semgrep"

# `--version` asks semgrep.dev for the latest release unless told not to; a
# runner with blocked egress waits about 100 seconds for that answer.
installed="$(SEMGREP_ENABLE_VERSION_CHECK=0 "$target/bin/semgrep" --version 2>/dev/null | head -1 | tr -d '[:space:]')"
[ "$installed" = "$expected" ] ||
  fail "installed semgrep reports '${installed}', expected ${expected}"

if [ -n "${GITHUB_PATH:-}" ]; then
  printf '%s\n' "$target/bin" >>"$GITHUB_PATH"
fi
printf 'install-semgrep: semgrep %s ready in %s\n' "$installed" "$target/bin"
