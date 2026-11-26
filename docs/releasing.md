# Releasing Kimen

Kimen publishes ten packages from one immutable `release-candidate-v1`
archive. Validation builds the bytes once. Browser jobs and the publisher
consume that artifact. Versioning and GitHub writes happen in separate jobs
before publication.

## Publication scope

Every release publishes the ten packages at a single fixed version, in this
order, which is also the order the candidate records them in:

1. `@kimen/elements`
2. `@kimen/tokens`
3. `@kimen/mcp-server`
4. `@kimen/catalog`
5. `@kimen/emitter`
6. `@kimen/adapter-a2ui`
7. `@kimen/adapter-mcp-apps`
8. `@kimen/react`
9. `@kimen/vue`
10. `@kimen/angular`

`scripts/release/release-plan.mjs` (`releasePackages`) and `nx.json`
(`release.projects`) declare the set. A package comes after every release
package it needs at runtime, so a publication that stops partway never
leaves a published package pointing at a missing one. The first three
first reached npm at `0.1.1`; the generative UI packages (catalog, emitter
and both adapters) and the framework wrappers joined at `0.2.1`. A scope
change updates the release-candidate contract, workflow tests and this
document together. Every workspace package outside the set is
`private: true`. That includes the unscoped `kimen` placeholder, because
npm refuses that name (E403, "Package name too similar to existing package
mime") and it can never be published under it.

**Internal-dependency rewrite.** The emitter and both adapters depend on
`@kimen/catalog`, and the three framework wrappers on `@kimen/elements`,
through `workspace:*`. `npm pack`, unlike `pnpm publish`, does not rewrite
`workspace:` ranges, so the candidate builder does it:

- A release package may name another release package in `dependencies`,
  `optionalDependencies` or `peerDependencies` only as exactly
  `workspace:*`, and only one published before it. Any other `workspace:`
  range, or one on a package outside the set, fails closed before anything
  is packed (`releaseWorkspaceDependencies`).
- Such a package is packed from a staged copy
  (`scripts/release/stage-package.mjs`): what its `files` lists plus
  `LICENSE` and `README.md`, with each `workspace:*` set to the exact
  candidate version and `devDependencies` removed. A glob, an
  out-of-package path or a symbolic link stops the build.
- `@kimen/angular` is an Angular Package Format library: `ng-packagr`
  writes the publishable package, with its own `package.json`, to
  `packages/angular/dist`. The candidate is staged from that directory,
  plus `LICENSE`, `NOTICE` and `README.md` from `packages/angular`. Its
  name, version, `private`, licence, repository and runtime dependency
  fields must equal the source manifest's, so a stale build stops the
  release. The `workspace:*` range is rewritten as above.
- A package without such a range (elements, tokens, the catalog) is packed
  straight from its directory, so its bytes are what `npm pack` produces
  there. The MCP server keeps its own staging.
- After packing, the builder and every independent verifier re-read each
  packed manifest: no runtime field may hold a `workspace:` string, and
  every `@kimen/*` runtime dependency must be a package of the candidate at
  exactly its version. The publisher repeats the `workspace:` check on the
  bytes it is about to publish.
- A tarball holds what a consumer uses, and the builder and every verifier
  refuse it otherwise (`scripts/lib/package-contents.mjs`). The package
  must not contain any of these:
  - TypeScript build info (`*.tsbuildinfo`)
  - Stencil's `.stencil` cache
  - stories, tests, fixtures, galleries or size-limit entries
  - a path, a declaration or a source map that names an absolute build
    path (`/home/`, `/Users/`, `C:\`)
  - a source map that does not embed its sources (`sourcesContent`), or a
    `sourceMappingURL` that names a map the tarball does not ship
  - in a package whose build maps every module (the six `tsc -b` packages
    and Angular), a module without its map. The only exceptions are the
    generated modules named in `unmappedModules`: the catalog's
    `dist/generated/catalog.js` and the MCP Apps adapter's
    `dist/generated/surface-document.js`. Their maps would embed the whole
    generated catalog and surface document. They ship with neither a map nor
    a link to one, and `scripts/lib/generated-source-maps.mjs` removes both
    after the build.
  - a file that nothing reaches. Reachable files are `package.json`, the
    licence, NOTICE and README, the package's declared metadata assets
    (such as the llms files and `custom-elements.json` of elements), every
    path its manifest fields and `exports` name, and what those import, link
    or reference. A module and its declaration file count as one.

  Each package also has a budget for its tarball and its unpacked size: the
  size measured when it was set plus about 3 %. Raising a budget needs the
  founder's approval; `scripts/tests/packaging-budget.test.mjs` pins the
  numbers.
- The packages built with `tsc -b` write their build info next to their
  `tsconfig.json`, outside what they pack, and Nx caches it with `dist`.
  Delete both together (`tsc -b --clean`): with the build info left behind,
  `tsc -b` reports the project up to date and writes no `dist`. tsc also
  leaves behind files it no longer emits, so remove a stale `dist` after
  pulling a change that drops an output.
- `@kimen/elements` publishes its ESM entry points only: the per-component
  modules, the lazy build behind `./loader`, the declarations, the icons and
  the agent docs. Stencil writes no collection. The CommonJS build and the
  browser build in `dist/kimen` are still written but not published; the
  site serves `dist/kimen`. Its per-component modules carry Stencil's client
  runtime, compiled for Kimen's components, as
  `dist/components/stencil-client.js`, so the package declares no runtime
  dependency: `@stencil/core` is a build tool. After the build,
  `packages/elements/scripts/prune-package-outputs.mjs` removes the
  declarations of internal helpers, which no public declaration imports, and
  the source maps that map no source.

`scripts/tests/publishable-workspace-protocol.test.mjs` fails closed when a
release package carries any other `workspace:` runtime range, or a package
outside the set that is not `private` carries one at all.

**Clean-consumer smoke.** Right after it builds the candidate,
`validate-core` installs the generative UI packages, with elements and
tokens, from their tarballs into a fresh npm project: third-party
dependencies such as `zod` come from the registry and lifecycle scripts stay
off. Each `@kimen/*` package must be installed
exactly once, from its tarball. Then each package answers one DOM-free call
in Node: `validateUiSpec` on a one-node spec, `catalogPrompt` and
`uiSpecJsonSchema`, an A2UI adapter refusing an unsupported version, and the
MCP Apps surface resource and the version it announces.

The smoke then gives each framework wrapper a consumer of its own: the
wrapper and elements from their tarballs, the framework from the registry
at the exact versions the wrapper develops against (React and its types,
Vue without the optional `vue-router`, Angular core, common, forms,
platform-browser and RxJS). The React consumer must not install
`@stencil/react-output-target` or `ts-morph`. The workspace TypeScript compiler type-checks a
one-component consumer that passes a typed prop and must reject a wrong
one, and the workspace esbuild bundles it through the installed packages.
The React and Vue wrappers are also imported in Node; Angular's partially
compiled output needs the Angular compiler there, so it stops at the type
check and the bundle. Run the smoke locally on a built candidate with:

```sh
node scripts/release/candidate-cli.mjs smoke --archive <candidate.tar> --sha256 <digest>
```

The browser consumer contract (`scripts/consumer-contract.mjs`) still covers
elements and tokens in every engine. It also bundles an application that
registers `@kimen/elements/loader` with the workspace's esbuild and Vite,
serves each bundle alone and requires a `ki-button` rendered from its own
lazy chunk with no request outside the bundle
(`scripts/consumer-loader-bundles.mjs`).

Each wrapper's `NOTICE` follows what its build contains. The Vue wrapper
imports its Stencil output target's runtime as an installed dependency and
carries the header alone. Stencil generates the React wrappers during the
elements build. That build points the generated sources at Kimen's runtime.
After `tsc`, `packages/react/scripts/check-runtime-imports.mjs` checks that
every external import in the published modules and types names a declared
dependency or peer. The React `NOTICE` carries the output target's MIT notice
for the generated wrapper code and compatible declarations. The
Angular bundle compiles in the component helpers and value accessors that
`@stencil/angular-output-target` copies into its sources, so its `NOTICE`
carries that MIT notice.

**Versioned adapter files.** Each protocol adapter states its release in
its `COMPAT.md` matrix, and the MCP Apps surface announces it as
`KIMEN_APP_INFO.version`. The release pull request rewrites the adapter
version in `packages/adapter-a2ui/COMPAT.md`,
`packages/adapter-mcp-apps/COMPAT.md` and
`packages/adapter-mcp-apps/src/bridge.ts` to the package version, and
tagging verifies them (`adapterVersionPaths`).

## Modes

| Mode | Entry point | Package state | Authority | Result |
|---|---|---|---|---|
| Dry run | Manual `release` workflow dispatch at the revision to validate | Current exact versions; `private: true` is accepted | Read-only repository token; no OIDC publisher runs | Core, candidate, independent verification, Chromium/Firefox/WebKit (four shards each) and the capability binding all execute; nothing is published |
| Nightly dry run | The `release` schedule, 05:41 UTC, on the latest commit of `main` | As for a dry run | As for a dry run; `publish` also requires a tag ref, and GitHub runs a schedule on the default branch only | The same jobs as a dry run; nothing is published |
| Release | The release App pushes an annotated `vX.Y.Z` tag after the release PR is merged | All ten packages are version `X.Y.Z`, `private: false`, and carry exact repository metadata | Only `publish`, after every validation job, receives `id-token: write` in the protected `npm` environment | Missing versions publish; byte-identical existing versions are skipped |

Dry run never creates tags, changes versions or carries dormant publication
authority. A non-tag dispatch always emits a manifest whose `mode` is
`dry-run` and whose `tag` is `null`.

### Reading the nightly dry run

Pull request and merge-queue CI run Chromium only. The nightly dry run tests
`main` in Firefox and WebKit every day, together with packaging and the clean
consumer install. A regression then shows up the morning after it lands, not
when a release tag is validated. The run is not a required check, so a red
night blocks no pull request and no merge group.

- Find the runs under Actions → release, filtered by the `schedule` event, or
  with `gh run list --workflow release.yml --event schedule`.
- In a green run every validation job passed. `publish` shows as skipped, as
  it always does outside a tag.
- When a run fails, GitHub notifies the user who last changed its `cron` line,
  according to that user's Actions notification settings.
- The failing job names the failing part. `browser (webkit 3/4)` is the third
  WebKit shard of the browser gate or its consumer check. `validate-core`
  covers the core gates, packaging, the candidate build and its
  clean-consumer smoke. A failed browser
  shard skips `capability-claims`, because it needs every shard.
  `gh run view <run-id> --log-failed` prints the failing steps.
- The `ci` nightly tests the same `main` in Chromium at 04:23 UTC. If it
  failed too, the regression is not specific to one engine.
- A failure that passes on "Re-run failed jobs" is a flake. One that repeats
  is a regression; fix it in a pull request before the next release tag.
- To reproduce a shard, run
  `KIMEN_BROWSER_SHARD=3/4 bash scripts/gates/gates-browser.sh webkit`. Linux
  matches the hosted runner; WebKit on macOS behaves differently.
- GitHub disables the schedules of a public repository after 60 days without
  activity. Re-enable the workflow from its Actions page.

## Automated release flow

1. On a push to `main`, `release-pr.yml` uses Nx Release to inspect
   conventional commits since the latest reachable `vX.Y.Z` tag. The first
   run uses the versions on disk and the package history. A commit counts
   when it changes a file of a released package. A `feat` raises the minor
   version and a `fix` raises the patch version, whatever the commit's scope:
   `nx.json` turns off Nx's `useCommitScope`, under which a scope that names
   no package (`feat(release)`) only raised the patch. A breaking change
   raises the minor version before `1.0.0` and the major version thereafter.
2. For a release-worthy change, the dedicated App opens or refreshes one
   pull request on `release/next`, titled `chore(release): vX.Y.Z`. The PR
   sets all ten package versions and flips `private: false` where needed.
   It writes the same version into the three agent plugin manifests under
   `plugins/kimen/`, because an installed plugin refreshes only when its
   version moves, and into the adapter versioned files. It preserves the required `repository` metadata. It adds a dated workspace changelog
   entry that includes the existing `[Unreleased]` notes on the first
   automated release. The normal generators refresh the API index and the
   catalog's embedded elements version, then rebuild the MCP binary with the
   proposed version. Git ignores the generated MCP version module and bundle.
   The workflow only proposes a PR for release-worthy commits.
3. Once required checks pass, the founder squash-merges the release PR,
   keeping its title as the commit title: `release-tag.yml` only runs for a
   push whose commit title starts with `chore(release): v`.
   `release-tag.yml` verifies that the PR merged at the exact pushed commit
   and that all ten package versions, the plugin manifests and the
   adapter versioned files match its
   title. It pushes an annotated `vX.Y.Z` tag on that commit and creates the
   GitHub Release from that version's changelog entry. A retry can complete missing GitHub Release
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

These steps were completed for all ten packages before `v0.2.1`. Repeat
steps 1 and 4 for a package that joins the release set, before merging the
first release PR that includes it.

1. Bootstrap every npm package name. Trusted publishing cannot create a
   package. For a name that does not exist yet, publish a name-reservation
   placeholder from your npm account: version `0.0.0`, a `package.json`
   with the package name, the repository metadata and
   `"publishConfig": { "tag": "bootstrap" }`, plus a README saying it
   reserves the name (what `@kimen/elements@0.0.0` is: three files).
   Publish it with
   `npm publish <directory> --access public --tag bootstrap --ignore-scripts`.
   `@kimen/elements`, `@kimen/tokens` and `@kimen/mcp-server` were reserved
   before `v0.1.0`. `@kimen/catalog`, `@kimen/emitter`,
   `@kimen/adapter-a2ui`, `@kimen/adapter-mcp-apps`, `@kimen/react`,
   `@kimen/vue` and `@kimen/angular` were reserved by 2026-11-25. The
   first automated release that includes a package sets its `latest` tag
   (`0.2.1` did so for those seven). The publisher refuses a package whose
   name does not exist yet.
2. Create and install a dedicated GitHub App on `kimen-dev/kimen` with
   repository permissions **Contents: Read and write** and **Pull requests:
   Read and write**. Store its client ID as the `RELEASE_APP_ID` repository
   secret and its private key as `RELEASE_APP_PRIVATE_KEY`.
3. Create the GitHub environment `npm` and choose its deployment policy.
   Require founder approval to review each publication, or leave approval
   disabled for fully automatic publication after the release PR merges.
4. Configure a separate npm trusted publisher for each of the ten names.
   Use repository `kimen-dev/kimen`, workflow `release.yml` and environment
   `npm`. Do this last, when the first release PR that includes the name is
   green and ready to merge. npm expires a new configuration after two
   days without a successful publication. Delete and recreate an expired
   configuration.

GitHub Actions uses OIDC for npm. Keep `NPM_TOKEN` and `NODE_AUTH_TOKEN` out
of Actions. For the external steps, see the
[official npm trusted publishing documentation](https://docs.npmjs.com/trusted-publishers/).

## Immutable handoff and authority boundaries

`validate-core` has `contents: read`, runs the frozen deterministic core gates
(`scripts/gates/gates-core.sh`) and the packaging contract, packs the exact
ten packages, smokes them in clean consumers and uploads one
non-overwriting artifact. It exports the GitHub
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
surface. The release builder omits the development dependencies of the MCP package
and of every staged package from the packed manifest.

`publish` needs `validate-core`, every browser shard, `verify-candidate` and
`capability-claims`; it runs only on a tag ref, for release manifests. The
publisher has no checkout and performs no dependency install, build,
versioning or repository script execution. Before each publication it checks
the packed manifest's name, version, `private: false` and repository, and
refuses publish lifecycle scripts and any `workspace:` runtime range. Its
only elevated permission is short-lived OIDC (`id-token: write`) in the
protected `npm` environment.

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
