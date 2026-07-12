# Releasing Kimen

Kimen publishes exactly `@kimen/elements` and `@kimen/tokens` from one
immutable `release-candidate-v1` archive. Validation builds the bytes once;
browser jobs and the publisher only consume that artifact. No release job
versions packages or writes to the repository.

## Modes

| Mode | Entry point | Package state | Authority | Result |
|---|---|---|---|---|
| Dry run | Manual `release` workflow dispatch at the revision to validate | Current exact versions; `private: true` is accepted | Read-only repository token; no OIDC publisher runs | Core, candidate, independent verification and Chromium/Firefox/WebKit all execute; nothing is published |
| Release | Push an exact `vX.Y.Z` tag after the release PR is merged | Both packages are version `X.Y.Z`, `private: false`, and carry exact repository metadata | Only `publish`, after every validation job, receives `id-token: write` in the protected `npm` environment | Missing versions publish; byte-identical existing versions are skipped |

Dry run never creates tags, changes versions or carries dormant publication
authority. A non-tag dispatch always emits a manifest whose `mode` is
`dry-run` and whose `tag` is `null`.

## Prepare the release PR

1. Choose one SemVer for the fixed release line and set that exact version in
   `packages/elements/package.json` and `packages/tokens/package.json`.
2. Set `private: false` in both package manifests.
3. Preserve the exact repository metadata required by the candidate gate:
   `type: git`, `url: git+https://github.com/kimen-dev/kimen.git`, and the
   corresponding `packages/elements` or `packages/tokens` directory.
4. Do not add `prepack`, `postpack`, `prepare`, `prepublish`,
   `prepublishOnly`, `publish` or `postpublish` scripts. Publication always
   uses `--ignore-scripts`.
5. Let the ordinary protected-main PR run all required checks and merge it by
   squash. The release workflow never pushes a version or changelog commit.
6. Run a manual dry run against the merged revision. It must validate the
   exact two-package candidate and all three browser engines.
7. Create and push `vX.Y.Z` at that protected-main commit. Candidate validation
   rejects a tag/version mismatch, a tag pointing elsewhere, or a source SHA
   not reachable from `refs/heads/main`.

## One-time external publication prerequisites

These settings are deliberately outside the repository and are not automated
with a durable token:

- Both scoped package names must already exist on npm. npm requires an
  existing package before a trusted publisher can be configured, so the CI
  workflow fails closed on a first publication. The founder must bootstrap
  each name through a separately controlled npm procedure; no `NPM_TOKEN` or
  `NODE_AUTH_TOKEN` exception may be added to GitHub Actions.
- Each package's npm settings must register the GitHub Actions trusted
  publisher for repository `kimen-dev/kimen`, workflow
  `.github/workflows/release.yml`, and environment `npm`.
- The repository must have a protected GitHub environment named `npm`. Its
  deployment policy is the release boundary and should require the founder's
  approval.
- The publisher runner must already provide npm `>=11.5.1`. The publisher
  checks this before registry access and does not upgrade npm or install any
  tool after receiving OIDC authority.

Until every prerequisite is conformant, tag releases are expected to fail
red while dry-run validation remains usable. Do not weaken that failure into
a token-based bootstrap path.

See the official [npm trusted publishing
documentation](https://docs.npmjs.com/trusted-publishers/) for the external
package configuration.

## Immutable handoff and authority boundaries

`validate-core` has `contents: read`, runs frozen deterministic gates, packs
the exact two packages and uploads one non-overwriting artifact. It exports
the GitHub artifact ID/digest plus an independently computed SHA-256 of
`candidate.tar`.

Each browser matrix job downloads by that artifact ID, recomputes the candidate
SHA, verifies its manifest and checksums, installs the tarballs in a clean
consumer and runs exactly one of Chromium, Firefox or WebKit. Matrix
`fail-fast` is disabled so every engine leaves an outcome.

`verify-candidate` independently downloads and verifies the same artifact with
no OIDC authority. `publish` needs `validate-core`, all browser jobs and
`verify-candidate`; it runs only for release manifests. The publisher has no
checkout and performs no dependency install, build, versioning or repository
script execution. Its only elevated permission is short-lived OIDC
(`id-token: write`) in the protected `npm` environment.

Every owned job uses a full-SHA-pinned action, explicit job permissions and
blocked egress with a declared endpoint allowlist. Run the global policy gate
before changing workflow structure:

```sh
pnpm run check:workflows
node --test scripts/tests/release-workflow.test.mjs
node --test scripts/tests/release-candidate.test.mjs
```

## Idempotent retry after a partial publication

The manifest records SHA-512 SRI for each tarball. For each package/version,
the publisher follows this closed decision table:

| Registry state | Action |
|---|---|
| Package name does not exist | Fail: first-publication prerequisite is absent |
| Version does not exist | Publish that exact tarball with provenance and lifecycle scripts disabled |
| Version exists with the same `dist.integrity` | Skip it as already complete |
| Version exists with different or missing integrity | Fail as a security conflict |

If one of two packages publishes and the other fails, re-run only against the
same source/tag and retained immutable artifact. The identical package is
skipped and only the missing tarball is attempted. Never rebuild candidate
bytes or advance the tag to recover a partial release. An integrity conflict
requires investigation and the constitutional roll-forward procedure, not an
overwrite (npm versions are immutable).
