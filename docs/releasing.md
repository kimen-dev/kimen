# Releasing Kimen

Kimen publishes `@kimen/elements`, `@kimen/tokens` and `@kimen/mcp-server`
from one immutable `release-candidate-v1` archive. Validation builds the
bytes once. Browser jobs and the publisher consume that artifact.
Versioning and GitHub writes happen in separate jobs before publication.

## v1 publication scope

The first automated release, `v0.1.0`, publishes all three packages at a
single fixed version. The candidate records `@kimen/elements` first,
`@kimen/tokens` second and `@kimen/mcp-server` third.

`@kimen/catalog`, `@kimen/emitter`, `@kimen/adapter-a2ui`,
`@kimen/adapter-mcp-apps` and the framework wrappers `@kimen/react`,
`@kimen/vue` and `@kimen/angular` are implemented in this repository but
remain `private: true`. Their publication and versioning require a founder
decision. A scope change updates the release-candidate contract, workflow
tests and this document together.

**Internal-dependency rewrite (wrappers/adapters).** These packages depend on
`@kimen/elements` or `@kimen/catalog` through the `workspace:*` protocol. The
current pack path is `npm pack`, which — unlike `pnpm publish` — does **not**
rewrite `workspace:` ranges, so a naive publish would ship `workspace:*`
verbatim and fail the consumer install with `EUNSUPPORTEDPROTOCOL` (Angular's
`ng-packagr` `dist/package.json` already carries the range). Before any of
these publish, `build-candidate` must rewrite each `workspace:` range to the
exact candidate version at pack time and the clean-consumer install smoke test
(`scripts/tests/consumer-contract*`) must be extended to the new tarballs. The
`publishable-workspace-protocol` infra test fails closed if a non-`private`
package still carries a `workspace:` runtime range.

## Modes

| Mode | Entry point | Package state | Authority | Result |
|---|---|---|---|---|
| Dry run | Manual `release` workflow dispatch at the revision to validate | Current exact versions; `private: true` is accepted | Read-only repository token; no OIDC publisher runs | Core, candidate, independent verification, Chromium/Firefox/WebKit (four shards each) and the capability binding all execute; nothing is published |
| Release | The release App pushes an annotated `vX.Y.Z` tag after the release PR is merged | All three packages are version `X.Y.Z`, `private: false`, and carry exact repository metadata | Only `publish`, after every validation job, receives `id-token: write` in the protected `npm` environment | Missing versions publish; byte-identical existing versions are skipped |

Dry run never creates tags, changes versions or carries dormant publication
authority. A non-tag dispatch always emits a manifest whose `mode` is
`dry-run` and whose `tag` is `null`.

## Automated release flow

1. On a push to `main`, `release-pr.yml` uses Nx Release to inspect
   conventional commits since the latest reachable `vX.Y.Z` tag. The first
   run uses the versions on disk and the package history. A `feat` raises
   the minor version and a `fix` raises the patch version. A breaking change
   raises the minor version before `1.0.0` and the major version thereafter.
2. For a release-worthy change, the dedicated App opens or refreshes one
   pull request on `release/next`, titled `chore(release): vX.Y.Z`. The PR
   sets all three package versions and flips `private: false` where needed.
   It preserves the required `repository` metadata. It adds a dated workspace changelog
   entry that includes the existing `[Unreleased]` notes on the first
   automated release. The normal generators refresh the API index and the
   catalog's embedded elements version, then rebuild the MCP binary with the
   proposed version. Git ignores the generated MCP version module and bundle.
   The workflow only proposes a PR for release-worthy commits.
3. Once required checks pass, the founder squash-merges the release PR,
   keeping its title as the commit title: `release-tag.yml` only runs for a
   push whose commit title starts with `chore(release): v`.
   `release-tag.yml` verifies that the PR merged at the exact pushed commit
   and that all three package versions match its title. It pushes an annotated
   `vX.Y.Z` tag on that commit and creates the GitHub Release from that
   version's changelog entry. A retry can complete missing GitHub Release
   metadata for a matching tag. A conflicting tag fails the run and keeps
   its original target.
4. The tag push starts `release.yml`, the sole npm publisher. It validates
   the immutable candidate across all three browser engines, each in four
   parallel shards, then publishes
   through npm trusted publishing under the `npm` environment policy.

Both automation workflows require `RELEASE_APP_ID` and
`RELEASE_APP_PRIVATE_KEY`. Their repository tokens have only `contents: read`.
The App writes to `release/next`, the release pull request, the annotated tag
and GitHub Release. Release jobs never push to `main`. GitHub emits the PR
and tag events under the App's identity so the existing checks and publisher
run.

Run `release-pr` manually from `main` to refresh a proposal. If a new push
arrives before the previous release is tagged, retry preparation after
`release-tag` succeeds. Rerun a failed tagging job from its original event
so it still refers to the exact merge commit. For validation without npm
publication, dispatch `release` directly on the revision to test.

Each tarball must include the generated `LICENSE` and `NOTICE`. After editing
root `LICENSE` or `NOTICE`, run
`node scripts/release/write-package-legal-files.mjs` and commit the result.
The publisher runs with `--ignore-scripts` and rejects publication lifecycle
scripts. The publisher runner must provide npm `>=11.5.1`.

## One-time founder setup

Complete these steps before merging the first release PR.

1. Bootstrap all three npm package names. Trusted publishing cannot create a
   package. In a local checkout, keep `0.0.0`, set `private: false` on
   `@kimen/elements`, `@kimen/tokens` and `@kimen/mcp-server`, and
   build and validate their tarballs with the local dry-run candidate CLI.
   Extract the three validated tarballs from `candidate.tar`. Manually publish
   each tarball using your npm account with
   `npm publish <tarball> --access public --tag bootstrap --ignore-scripts`.
   The bootstrap versions reserve the names. The first automated release
   sets `latest` to `0.1.0`. Keep these local manifest
   edits out of `main`.
2. Create and install a dedicated GitHub App on `kimen-dev/kimen` with
   repository permissions **Contents: Read and write** and **Pull requests:
   Read and write**. Store its client ID as the `RELEASE_APP_ID` repository
   secret and its private key as `RELEASE_APP_PRIVATE_KEY`.
3. Create the GitHub environment `npm` and choose its deployment policy.
   Require founder approval to review each publication, or leave approval
   disabled for fully automatic publication after the release PR merges.
4. Configure a separate npm trusted publisher for each of the three names.
   Use repository `kimen-dev/kimen`, workflow `release.yml` and environment
   `npm`. Do this last, when the first release PR is green and ready to merge.
   npm expires a new configuration after two days without a successful
   publication. Delete and recreate an expired configuration.

GitHub Actions uses OIDC for npm. Keep `NPM_TOKEN` and `NODE_AUTH_TOKEN` out
of Actions. For the external steps, see the
[official npm trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/).

## Immutable handoff and authority boundaries

`validate-core` has `contents: read`, runs the frozen deterministic core gates
(`scripts/gates/gates-core.sh`) and the packaging contract, packs the exact
three packages and uploads one non-overwriting artifact. It exports the GitHub
artifact ID/digest plus an independently computed SHA-256 of `candidate.tar`,
and keeps its current-run gate evidence as a separate artifact.

The browser matrix is engine × shard: Chromium, Firefox and WebKit, each in
four shards. A shard checks out the validation harness at the candidate SHA
and runs `scripts/gates/gates-browser.sh <engine>` with
`KIMEN_BROWSER_SHARD=<index>/4`: a quarter of the elements files and, in the
last Chromium shard, the Chromium-only suites. The four shards of an engine
together run its complete browser gate, each file once. Each shard keeps its
gate evidence, then downloads by that artifact ID, recomputes the candidate
SHA, verifies its manifest and checksums, installs the elements and tokens
tarballs in a clean browser consumer and checks them in its engine. With
fail-fast off, the matrix records an outcome for every engine and shard.

`capability-claims` runs after `validate-core` and every browser shard, at the
candidate SHA. `scripts/release/compose-gate-evidence.mjs` joins their
current-run evidence into one record, in which the browser gate
(`test-browser`) is green only when every engine reported every shard green.
`scripts/gates/check-capabilities.mjs` then binds each available capability
claim to that record (018-project-integrity-hardening S13).

`verify-candidate` independently downloads and verifies the same artifact with
no OIDC authority. The candidate builder and verifiers install the packed MCP
tarball offline in a temporary npm project, then launch the installed
`kimen-mcp` bin. A legacy MCP handshake must return the candidate version
and list the five Kimen tools. They also verify that the packed NOTICE covers
the npm code recorded in both the server bundle and its embedded browser
surface. The release builder omits the MCP package's development dependencies
from the packed manifest.

`publish` needs `validate-core`, every browser shard, `verify-candidate` and
`capability-claims`; it runs only for release manifests. The publisher has no
checkout and performs no dependency install, build, versioning or repository
script execution. Its only elevated permission is short-lived OIDC
(`id-token: write`) in the protected `npm` environment.

Every owned job uses a full-SHA-pinned action, explicit job permissions and
blocked egress with a declared endpoint allowlist. The publisher's list is
the registry plus the two Sigstore services that `npm publish --provenance`
signs through, Fulcio and Rekor; a test holds it to exactly that. Run the
global policy gate before changing workflow structure:

```sh
pnpm run check:workflows
node --test scripts/tests/release-workflow.test.mjs
node --test scripts/tests/release-gate-evidence.test.mjs
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

If publication fails partway, re-run only against the same source/tag and
retained immutable artifact. The publisher skips byte-identical versions and
attempts each missing tarball. Never rebuild candidate
bytes or advance the tag to recover a partial release. An integrity conflict
requires investigation and the constitutional roll-forward procedure, not an
overwrite (npm versions are immutable).
