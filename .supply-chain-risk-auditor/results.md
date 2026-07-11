# Supply Chain Risk Audit — Results

## Executive Summary

This scoped audit covers four npm packages and two executable-input surfaces:
`@anthropic-ai/claude-code@2.1.205`, `@openai/codex@0.144.0`,
`@stryker-mutator/core@9.6.1`, `@stryker-mutator/vitest-runner@9.6.1`, the
sandbox image build and the release workflow. The broader workspace dependency
inventory remains outside this report.

All six entries are high-risk by function. The agent CLIs execute commands from
repository context; Stryker rewrites source, loads plugins and launches build or
test processes; the sandbox build executes downloaded artifacts as root; and
the release workflow executes third-party and repository code in a job that
also has write and OIDC authority. Exact versions and full-SHA action references
reduce drift, but they do not make those execution boundaries safe by
themselves. The Stryker packages are development-only and share an active
upstream, but that repository has no published security contact.

GitHub lists published high-severity advisories for both Claude Code and Codex.
Those advisories establish upstream security history, not that the exact pinned
versions in this audit are vulnerable; affected-version ranges must be checked
before every pin change. The previous report's Claude advisory claim and zero
advisory count were therefore inconsistent and are corrected below.

## High-Risk Dependencies

| Dependency | Repository | Risk Factor(s) | Evidence (stars / last release / issues / CVEs) | Suggested Alternative |
|------------|-----------|----------------|-------------------------------------------------|-----------------------|
| `@anthropic-ai/claude-code@2.1.205` | [anthropics/claude-code](https://github.com/anthropics/claude-code) | High-risk feature: agentic command and third-party code execution; past high-severity advisories | npm registry SRI verified 2026-07-09: `sha512-riShT8jUKjYFupfYtFJF8JelKmJzAm+fHDvqUadfEAjzRAJ3AatZm5gtzWT3pEBmSXPIjoIjOHOXBGzo5wpuCw==`. The upstream [security page](https://github.com/anthropics/claude-code/security) publishes multiple `High` advisories, including `GHSA-q5hj-mxqh-vv77`; this does not assert that 2.1.205 is in an affected range. | No lower-risk drop-in. Keep an integrity-locked exact pin, use an attempt-scoped model lease, deny durable credentials and run authoritative gates in a fresh networkless container. |
| `@openai/codex@0.144.0` | [openai/codex](https://github.com/openai/codex) | High-risk feature: agentic command and third-party code execution; past high-severity advisory | npm registry SRI verified 2026-07-09: `sha512-QFh6f+v5QUx/Vg0HjIl9HB94p7aDLBDkZjc4IXX5RXUcXHPVCZNb6Hl2R49Og/fqW7orgZkeDcgWfRANUa1WoQ==`. The upstream [security page](https://github.com/openai/codex/security) publishes `GHSA-w5fx-fh39-j5rw` as `High`; this does not assert that 0.144.0 is in the affected range. | No lower-risk drop-in. Keep an integrity-locked exact pin, use an attempt-scoped model lease, deny durable credentials and run authoritative gates in a fresh networkless container. |
| `@stryker-mutator/core@9.6.1` | [stryker-mutator/stryker-js](https://github.com/stryker-mutator/stryker-js) | High-risk feature: source mutation, dynamic plugin loading and child-process execution; no security contact | npm registry metadata verified 2026-07-09: SRI `sha512-WMgnvf+Wyh/yiruhNZwc8w8DlzmmjXhPjSn5MR8RhAXzlnWji8TQrUYgBUkHk9bEgSaIlB3KZHm37iiU5Q2cLQ==`, release `2026-04-10T20:25:04.648Z`, CLI `bin/stryker.js`, and dependency on `execa`. The official [configuration reference](https://stryker-mutator.io/docs/stryker-js/configuration/) documents plugin imports, build/command execution and writable temporary copies. GitHub reports [no security policy](https://github.com/stryker-mutator/stryker-js/security). | No suitable lower-risk drop-in preserves the approved JavaScript mutation gate. Keep it development-only, exactly pinned and lockfile-integrity checked; allow only the explicit Vitest plugin/config and run offline with isolated writable caches. |
| `@stryker-mutator/vitest-runner@9.6.1` | [stryker-mutator/stryker-js](https://github.com/stryker-mutator/stryker-js) | High-risk feature: loads and executes the project's Vitest suite against mutated code; no security contact | npm registry metadata verified 2026-07-09: SRI `sha512-eyUHTCf3Ui+SUn/tpFJwzw6MV391kyBLZk/cDHFUfKFELqKMLbvd7e81axArlApKqO6cOnLfrxlwED+2SRN0ow==`, release `2026-04-10T20:25:14.040Z`, and exact peer on `@stryker-mutator/core@9.6.1`. It inherits the upstream repository's missing security policy. | No lower-risk compatible runner meets the approved Vitest mutation design. Pin it exactly with core, reject version skew and constrain its test/config inputs to the checked-in mutation policy. |
| Sandbox build executable inputs | [`sandbox/Dockerfile`](../sandbox/Dockerfile) | High-risk feature: third-party code executes as root during image construction; mutable or insufficiently integrity-locked resolution | Audit snapshot 2026-07-09 uses mutable `node:22-bookworm`, unversioned Debian package resolution, `npx -y playwright@1.61.1`, global npm installs for both agent CLIs and Corepack preparation of `pnpm@10.34.4`. Versions alone do not enforce registry SRI, and neither the base image nor APT inputs are digest/snapshot locked. | Replace online ad-hoc installation with the later checked-in lockfile/integrity fixture, pin the base digest and dated Debian snapshot/package versions, and prove runtime uses the immutable image ID. |
| Release workflow executable inputs | [`.github/workflows/release.yml`](../.github/workflows/release.yml) | High-risk feature: dependency/repository code executes inside a release-authorized job | Audit snapshot 2026-07-09 uses mutable `ubuntu-latest` and Node major `22`; installs dependencies, browsers, gates and Nx release code in one job with `contents: write` plus `id-token: write`. Harden Runner is only `egress-policy: audit`, so it records rather than blocks undeclared egress. | Split read-only candidate construction/verification from the minimal publisher; grant OIDC only after independent digest verification, execute no repository lifecycle code in the publisher and block all undeclared egress. |

## Counts by Risk Factor

| Risk Factor | Count |
|-------------|-------|
| Single maintainer / small team | 0 |
| Unmaintained / deprecated / archived | 0 |
| Low popularity | 0 |
| High-risk features (FFI / deserialization / code exec) | 6 |
| Past high/critical CVEs or published advisories | 2 |
| No security contact | 2 |

## Recommendations

- Install both Stryker packages only as exact development dependencies and make
  a deterministic fixture compare their lockfile versions and SRIs to the two
  values above. Reject missing integrity, version skew, unexpected plugins,
  command/build runners and network reporters. Mutation policy fixtures must
  prove that unclassified executable changes fail, score 69 fails, score 70
  passes, and writable caches are isolated even with a read-only `HOME`.
- Ignore ordinary mutation reports, caches and unfinished attempt output, but
  retain a fixture proving that only the finalizer's declared exact evidence
  path can be force-added. A broad ignored-directory or force-add exception is
  not acceptable evidence retention.
- Add sandbox fixtures that fail on an unpinned base image, undated APT input,
  non-lockfile CLI install, registry-integrity mismatch or runtime use of a
  mutable image tag. Network fixtures must prove phase-specific exact-host DNS
  and HTTPS/SNI allowlists, denied direct agent networking, lease revocation and
  a fresh secretless/networkless gate container.
- Add workflow fixtures covering every owned workflow: full commit SHAs for
  `uses:`, least-privilege per-job permissions and blocked—not audit-only—egress.
  Release-candidate fixtures must prove exact `elements` plus `tokens` tarballs,
  SHA-256 and SHA-512/SRI binding, identical bytes across all browser jobs,
  lifecycle-script rejection, no OIDC in verification and integrity-based
  idempotent partial retry in the minimal publisher.
- Monitor the upstream GitHub security pages before each exact-pin update and
  record the advisory's affected and patched ranges. Do not infer that a pin is
  safe merely because it is newer, or vulnerable merely because the upstream
  project has a historical advisory.
