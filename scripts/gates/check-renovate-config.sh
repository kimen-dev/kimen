#!/usr/bin/env bash
# Gate: renovate.json is valid for the bot that has to read it.
#
# It exists because a linter said one thing and the tool said another. The
# semgrep rule `renovate-missing-minimum-release-age` recommends
# `"minimumReleaseAge": false` as the way to declare an exception; Renovate
# rejects that outright — `should be a string` — and stops opening pull
# requests until the config is fixed. The gate suite was green throughout.
# A satisfied linter is not a validated configuration, so the tool's own
# validator is the only thing that settles it.
#
# The version is pinned rather than `@latest` (Art. X): the verdict has to be
# a function of the tree, not of whatever npm resolved this morning. Pinning is
# safe for this class of error — the config Renovate rejected is refused with
# the identical message by validators several majors older, so schema checking
# does not drift the way rule registries do. Bump it when Renovate majors.
#
# It cannot simply track the newest release: `.npmrc` sets `min-release-age=7`,
# so npm will not resolve anything published in the last week. The pin has to
# be a version that has already cleared that quarantine — which is the same
# supply-chain rule the rest of the tree lives under, applied to the validator.
#
# Usage: check-renovate-config.sh
set -uo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

RENOVATE_VERSION='43.280.4'

command -v npx >/dev/null 2>&1 || {
  echo "GATE renovate-config: FAIL (npx not on PATH)" >&2
  exit 1
}

# No filename argument on purpose. Handed an explicit path the validator says
# "Validating renovate.json as global config" and checks it in the wrong mode;
# left to discover the file itself it validates repository config, which is
# what the bot actually reads.
npx --yes --package "renovate@${RENOVATE_VERSION}" renovate-config-validator
status=$?

if [ "$status" -ne 0 ]; then
  echo "GATE renovate-config: FAIL"
  exit "$status"
fi

echo "GATE renovate-config: PASS (renovate@${RENOVATE_VERSION} validator)"
