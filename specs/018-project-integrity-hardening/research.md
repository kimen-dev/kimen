# Research: Project integrity hardening

This document resolves the technical decisions behind the approved S1–S13
contract. Each decision prefers a deterministic local rule over reviewer
memory and adds no runtime dependency to `@kimen/*` packages.

## 1. Approved contract pairs and marker migration

**Decision**: split the policy into two deterministic checks:

- `check-spec-contracts.sh [feature-dir]` extracts the first Gherkin block to a
  temporary file, byte-compares it with `feature.feature`, runs feature lint and
  scenario-family validation; without an argument it checks every spec.
- `check-approvals.sh [feature-dir]` accepts only approval marker v2 containing
  `approval-version`, `approved-at`, `spec-sha256` and `feature-sha256`, plus
  only the migration-only optional key, recalculating both hashes.

`record-approval.sh` first requires a synchronized, lint-green pair and then
writes marker v2. Both pre-plan and pre-implement invoke contract plus approval
checks, because FR-002 explicitly blocks both phases after either approved file
changes. The full gate suite validates all features globally.

Legacy markers are migrated only when their recorded spec hash still matches,
the extracted feature is byte-identical to the spec block, and all lints pass.
The original approval timestamp is retained and the migration is annotated.
Real drift is never auto-migrated. The known 002 S14 drift was explicitly
reapproved by the founder before this plan; 017's leading-only comments are
removed by deterministic re-extraction.

**Rationale**: one canonical behavior block plus two approval hashes makes
tampering observable without asking the founder to reapprove byte-identical
derived files.

**Alternatives considered**:

- Hash only `spec.md`: rejected because an independently edited feature file
  could remain approved.
- Hash a concatenated file: rejected because individual diagnostics and safe
  marker migration are less clear.
- Auto-rewrite feature files inside the gate: rejected because validation must
  never mutate the worktree.

## 2. Mutation analysis on changed core logic

**Decision**: add exact dev dependencies
`@stryker-mutator/core@9.6.1`,
`@stryker-mutator/vitest-runner@9.6.1` and the TypeScript checker only if its
measured cost is acceptable. Stryker uses the Vitest runner, native
`thresholds: { high: 70, low: 70, break: 70 }`, JSON plus clear-text reports,
and incremental mode.

A deterministic classifier compares the working tree/PR with
`KIMEN_MUTATION_BASE`, sorts changed executable files and assigns every file to
one of:

- changed core logic, with a named Stryker runner/config;
- excluded glue/generated/presentation code with a checked-in reason; or
- unclassified, which fails the gate.

The exact mutate set and the lock/config/policy hashes produce a distinct
incremental report filename. This prevents a historic full-project score from
masking a changed-file score while preserving reuse for repeated runs of the
same PR. Each runner group must independently reach 70%. An empty core set is a
loud N/A result, not a silent pass.

The Vitest runner cannot run Browser Mode, so mutation covers pure Node logic,
Stencil unit/mock-doc logic and extracted component helpers. Real-browser
behavior remains enforced by the browser gate. A changed component behavior
file cannot be casually excluded: it either gains mutation-capable tests or
moves its pure state logic to an explicit helper.

**Rationale**: Stryker's official Vitest runner provides per-test coverage and
the native break threshold. Its official incremental mode reuses results, but
Vitest reports test changes at file granularity and Browser Mode is unsupported;
the file-set-specific cache makes those limitations explicit.

**Alternatives considered**:

- Coverage percentage: rejected by the constitution; coverage is diagnostic.
- One global incremental report: rejected because changing `mutate` scope can
  retain unrelated results.
- `--force` on every PR: rejected because it nullifies incremental performance;
  retained as a diagnostic/baseline command.
- Command-runner browser mutation: rejected as prohibitively slow and unable to
  provide useful coverage selection.

Sources: [Stryker Vitest runner](https://stryker-mutator.io/docs/stryker-js/vitest-runner/),
[incremental mode](https://stryker-mutator.io/docs/stryker-js/incremental/),
[threshold configuration](https://stryker-mutator.io/docs/stryker-js/configuration/).

## 3. Protected main and revision-bound review evidence

**Decision**: create a new branch ruleset disabled, validate it, then activate
it. It targets only `refs/heads/main` and requires:

- pull request, squash only, linear history and resolved conversations;
- strict, current required checks bound to their actual GitHub App IDs;
- no deletion or non-fast-forward update;
- zero human approvals, appropriate for one founder; and
- founder break-glass only through a PR (`bypass_mode: pull_request`), never an
  unconditional/exempt bypass.

A `break-glass` PR uses a founder-only label and required template fields for
written justification plus a restoration issue. A deterministic workflow
checks actor, PR mode, fields and audit linkage. GitHub's ultimate founder
bypass remains a human constitutional control, but no desired-policy payload
grants `always`/`exempt` authority and remote smoke verifies the audit record.

The required check inventory is taken from successful recent PRs immediately
before activation. The initial set covers deterministic gates, Semgrep,
CodeQL, OSV, dependency review, secret scanning and Socket. A context is added
only after it has produced a real check run in the repository.

`clean-context-review` is a Check Run on the exact PR head SHA. A PR open or
synchronize event creates it pending. A founder-only workflow records success
only after validating a review URL/report digest whose review commit matches
the current PR head. A later commit creates new pending evidence. Once the
first real check has been validated, the ruleset is updated to require it.

**Rationale**: GitHub documents that strict checks require the branch to be
current and that an expected GitHub App can be bound to a check, preventing a
same-name status from satisfying the rule. A review comment alone is not a
required check and cannot safely be configured as one.

**Alternatives considered**:

- Require one human approval: rejected because GitHub cannot make the sole
  founder approve their own PR and this would deadlock the repository.
- Require a `Codex` context immediately: rejected because the current connector
  emits comments/reviews, not a reliable Check Run.
- A committed `.reviewed` marker: rejected because PR code could forge it.

Sources: [GitHub ruleset rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets),
[ruleset API](https://docs.github.com/en/rest/repos/rules).

## 4. Ephemeral model identity and two-phase unattended execution

**Decision**: remove the persistent Codex OAuth volume and all static API-key
fallbacks from the unattended loop. The host requires an external executable
implementing a signed gateway-lease contract:

```text
helper acquire --ttl <seconds>  -> endpoint, signed JWT, claims, lease_id
helper revoke <lease_id>        -> zero on successful revocation/idempotent expiry
```

The host validates the JWT with a pinned root-owned public key: algorithm/key,
issuer, `kimen-sandbox` audience, lease ID, project/model/cost scope and signed
times must match the envelope. Only EdDSA with a known current/next `kid` is
accepted; numeric scope is capped at USD 25 and 1,000 requests. Timeout is at
most 3,600 seconds with exactly 60 seconds of grace. Dependency/browser install
runs first in a credential-free bootstrap container behind a registry/build
proxy. Only then is the lease acquired and mounted into a separate agent
container. On agent exit, the container and secret are destroyed and the lease
must be revoked. Authoritative gates start only afterward in a fresh container
with no secret and no external network. A static provider key, opaque
self-asserted token or ChatGPT subscription refresh token is not compliant.

**Rationale**: Kimen cannot manufacture short-lived provider credentials. A
small external broker/gateway contract makes that dependency explicit and
testable while ensuring its privileged minting credential never enters the
container.

**Alternatives considered**:

- Keep the named OAuth volume read-only: rejected; the agent can still read and
  exfiltrate a durable refresh credential.
- Copy OAuth state only after install: rejected; it remains durable during agent
  execution.
- Environment API key: rejected; environment placement does not shorten its
  lifetime or scope.

## 5. Domain-enforcing egress without a new proxy dependency

**Decision**: add a minimal root-owned Node CONNECT proxy whose allowlist is a
versioned file. The agent UID may connect only to loopback; it cannot use DNS or
reach the network directly. A separate proxy UID may resolve names and connect
to port 443. The proxy accepts only exact allowlisted hostnames on port 443,
rejects IP literals and undeclared hosts, and is the sole value of
`HTTPS_PROXY`/`ALL_PROXY`. Before opening an upstream socket it buffers a bounded
TLS ClientHello, rejects plaintext/no-SNI/ECH/malformed input, and requires the
normalized SNI to equal the CONNECT authority exactly. A shared CDN IP or a
client with certificate checks disabled therefore cannot tunnel to another
virtual host. Proxy startup, parse timeout, DNS resolution or upstream failure
is a red containment phase. CDN address rotation is tolerated only by resolving
an already allowlisted exact hostname; it never widens hostname/port policy or
falls back to direct IP/network access.

**Rationale**: an IP allowlist cannot distinguish virtual hosts on shared
addresses, and unrestricted DNS is an exfiltration channel. A small standard
library CONNECT proxy provides the required L7 hostname decision without
introducing Squid/tinyproxy packages.

**Alternatives considered**:

- Current ipset plus unrestricted DNS: rejected as bypassable.
- `/etc/hosts` snapshot and no DNS: simpler, but CDN rotation makes hour-long
  gate runs unnecessarily fragile.
- Squid/tinyproxy: rejected initially because it expands the sandbox package
  and patch surface; reconsider only if the minimal proxy proves unreliable.

## 6. Reproducible sandbox image inputs

**Decision**: pin the base image by digest, switch Debian sources to a dated
snapshot with exact package versions, move agent CLIs into
`sandbox/package.json` plus `package-lock.json`, install with `npm ci`, retain
exact pnpm/Playwright versions and add a static image-contract test. Renovation
updates digest, snapshot, versions and locks together. Runtime uses only the
already-built image digest without pulling mutable tags.

**Rationale**: exact package names without lockfile integrity and a mutable base
tag leave executable bytes able to change between builds.

**Alternatives considered**:

- Tarball URLs in Dockerfile: rejected; a lockfile provides standard integrity
  metadata and transitive coverage.
- Leave `apt-get` on rolling mirrors: rejected because a pinned `FROM` does not
  freeze packages downloaded by later layers.

## 7. Attempt evidence and host-authoritative snapshots

**Decision**: the host assigns an attempt ID and base SHA, creates a local
`loop/<attempt-id>` branch and owns finalization. The container writes a
progressive non-secret JSON record for lease acquisition, firewall, install,
browser, proxy, agent, gates, revocation and finalization. A host trap fills
missing `not-run` outcomes, creates an allow-empty product snapshot commit,
then commits final evidence whose `snapshotSha` points to that parent.
`loop/<attempt-id>` points to the second commit, avoiding a self-referential
hash and retaining every exit including early failure or interruption.
The next host launch first recovers any durable `running` attempt without a
final ref as red, covering host-process death after restart; loss of the clone's
storage itself remains an explicit external failure boundary.

Gates determine `gateVerdict`: an agent interruption followed by later green
gates stays observable without overriding them. Overall attempt verdict is red
when gates are non-green or any required containment, revocation or finalization
phase fails. A failed revoke prevents an authoritative green gate phase.

**Rationale**: container-only cleanup cannot run after every Docker/host
failure. The durable clone and host trap are the reliable boundary.

**Alternatives considered**:

- Commit only dirty trees inside the container: rejected; it loses clean
  attempts, early failures and some interruptions.
- Store full logs/environment: rejected to avoid persisting secrets; only phase
  names, timestamps and exit codes are evidence.

## 8. Three independent browser prerelease checks

**Decision**: split the deterministic suite into a reusable core gate and one
browser gate parameterized by a validated engine. Release validation runs a
matrix of Chromium, Firefox and WebKit with `fail-fast: false`; publication
needs all three plus core validation. Local `gates-suite.sh` still runs core and
Chromium, while prerelease supplies all engines explicitly.

**Rationale**: a single Vitest invocation proves the matrix but hides individual
evidence and may stop before all engines report. Separate checks make a
WebKit-only failure visible while blocking publication.

**Alternatives considered**:

- One matrix-enabled job: rejected because it does not provide three durable
  check outcomes.
- Three browser runs on every PR: rejected as unnecessary cost; Art. IV requires
  Chromium on PR and all three at prerelease.

## 9. Immutable release candidate and least-privilege publication

**Decision**: version and changelog changes arrive through an ordinary release
PR. A tag `vX.Y.Z` must point to a commit reachable from protected `main` and
match every fixed-version package. The release workflow has:

1. `validate-core`: read-only checkout, frozen install, deterministic core
   gates, exact `elements+tokens` candidate creation and immutable upload;
2. `browser`: each engine downloads that artifact ID, verifies the out-of-band
   candidate SHA, installs the tarballs in an isolated consumer and tests those
   exact bytes (the source checkout supplies only the harness);
3. `verify-candidate`: no OIDC, downloads by artifact ID and fails on explicit
   candidate SHA, manifest, tarball or exact-package-set mismatch;
4. `publish`: starts only after all validation, has `contents: read` plus
   `id-token: write`, uses the protected npm environment, downloads the same
   artifact ID, repeats all digest checks and publishes with lifecycle scripts
   disabled.

All jobs bind evidence to the same artifact ID/candidate SHA and use SHA-pinned
actions, least permissions and blocked, declared egress.
The publisher performs no checkout, dependency install, build, versioning or
repository script execution. No release job has `contents: write`; the
preinstalled npm must be >=11.5.1. npm trusted publishing is scoped to the exact
workflow/environment and supplies provenance.

Dry-run mode keeps the current versions/private flags, has null tag, validates
the complete candidate/browser handoff and receives no OIDC. Release mode
requires the release PR to set exact versions, `private: false` and repository
metadata. The scoped packages do not yet exist on npm, while npm requires a
package to exist before trusted publishing can be configured. Real first publication is
therefore a declared external blocker; the workflow fails closed and never
introduces a long-lived token exception. Dry-run candidate validation remains
fully executable.

Candidate SHA-256 is the authoritative transport check; the Actions artifact
digest is retained for audit but warning parsing is not treated as a gate.
Manifest SHA-512 SRI supports idempotent registry reconciliation: absent
versions publish, identical versions skip, conflicting integrity fails. A
partial two-package attempt can therefore retry only the missing identical
tarball without rebuilding or republishing an immutable npm version.

**Rationale**: GitHub artifact v4+ objects are immutable and expose a digest;
npm trusted publishing issues OIDC credentials only to the publishing job.
Verifying an internal candidate digest protects the handoff independently of
download warnings.

**Alternatives considered**:

- Existing all-in-one job: rejected because write and OIDC authority exist
  during untrusted install/test execution.
- Rebuild after browser validation: rejected because published bytes would not
  be the bytes validated.
- Let Nx push a version commit directly: rejected because it conflicts with
  protected main. Nx's publish-only subcommand remains an option, but direct
  `npm publish <tarball>` better proves exact-byte handoff.

Sources: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/),
[GitHub artifacts](https://github.com/actions/upload-artifact),
[Nx release phases](https://nx.dev/docs/features/manage-releases).

## 10. Clean-consumer package contract

**Decision**: build and pack `@kimen/elements` and `@kimen/tokens`, install
their tarballs plus Stencil into a temporary consumer with workspace linking
disabled, compile every executable `llms.txt` snippet, and use Playwright to
verify `ki-button` registration, rendering and documented theme resolution.

**Rationale**: string matching cannot prove package exports, dependency
installation or browser behavior from published bytes.

**Alternatives considered**:

- Import directly from the monorepo: rejected because workspace resolution can
  hide missing exports/dependencies.
- Only run `publint`: retained, but it does not execute the documented examples.

## 11. CEM, token inventory and API compatibility

**Decision**: generate a canonical token inventory and give it, package exports
and normalized Stencil docs to the surface builder. CEM module/declaration paths
resolve to published JavaScript export targets; attributes copy property
descriptions; CSS properties include every documented public semantic or
component custom property actually consumed by the component. Public token
descriptions land before CEM closes. A tarball validator rejects missing,
absolute or escaping paths and empty public facet descriptions.

Generate a digest-bearing `public-api.json` envelope from package exports, CEM,
public tokens and browser baseline. Compare it with the checked-in immutable
`changes/api/baselines/<version>.json` baseline (authoritative in shallow and
offline checkouts):

- removals, narrowing, optional-to-required, changed defaults and browser
  reductions → MAJOR;
- additive optional facets/exports/tokens → MINOR;
- documentation-only changes → PATCH;
- unknown deltas → MAJOR (fail closed).

A checked-in `changes/api/*.json` declaration names the packages, expected
release class, baseline version/hash, candidate hash and rationale. Removal is
blocked even with MAJOR unless the baseline proves deprecation and replacement
metadata shipped for at least one intervening MINOR. Stale declarations,
missing baselines and the explicit first-release case have fail-closed fixtures.
The 0.0.0 baseline is produced from the pre-018 git base; the final candidate
snapshot and 018 declaration are sealed only after token migration and every
legacy-root deprecation has landed, never from an intermediate US3 surface.

**Rationale**: CEM is designed to describe importable JavaScript modules and
all relevant custom-element facets. A unified snapshot prevents separate
TypeScript, token and package checks from disagreeing.

**Alternatives considered**:

- Keep `src/*.tsx` paths: rejected because `src` is absent from the tarball.
- TypeScript-only diff: rejected because tokens, exports, CEM facets and browser
  baseline are also public API.
- Add Changesets alongside Nx Release: rejected as overlapping release systems;
  the small API declaration is sufficient.

Sources: [Custom Elements Manifest schema](https://www.npmjs.com/package/custom-elements-manifest),
[Node package exports](https://nodejs.org/api/packages.html#subpath-patterns).

## 12. Closed-token validator and description scope

**Decision**: a Node validator parses every DTCG source in four explicit,
ordered compositions: base layers first and material/dark overrides last. It
validates references and cycles; allows aliases within one layer; permits only
same-or-lower references across primitive → theme → semantic → component;
requires every non-primitive visual leaf/composite member to resolve through
same/lower aliases to primitives; and scans component CSS for unresolved
`--ki-*`, direct primitive/theme consumption and visual literals including
motion values. Only versioned non-visual grammar resets (`none`, unitless zero)
are exempt; colors, lengths, motion, typography and shadows are not.

Composition precedence is exact and never plain filename sort:

1. onmars/light: primitive → onmars theme → base semantic → base component;
2. onmars/dark: onmars/light → onmars dark mode overrides;
3. material3/light: primitive → onmars/base fallback → material3 theme →
   base semantic → material3 semantic → base component → material3
   component overrides; and
4. material3/dark: material3/light → material3 dark mode overrides.

Existing resets use grammatical `0`; radio, checkbox and switch motion receives
described semantic/component aliases. Existing literal theme/semantic/component
leaves and CSS-var shadow strings migrate to primitive-backed typed aliases or
composites in the same task; none is silently grandfathered.

Every currently published semantic/component token leaf, consumed or not,
gains and retains a non-empty description. The CEM exposes every public
semantic/component property consumed by each component. The validator
complements rather than replaces Stylelint.

**Rationale**: Stylelint currently accepts any `--ki-*` spelling and cannot
know DTCG source layer or reference existence. Structural validation closes
that gap.

**Alternatives considered**:

- Regex-only shell checks: rejected because they cannot resolve DTCG aliases or
  cycles.
- Silently relabel the 694 component tokens internal: rejected because current
  docs treat `--ki-*` as public and 018 declares an additive API delta.
- Reduce the token matrix now: deferred to a separately approved pre-v1/MAJOR
  migration; it would remove public names rather than harden them.

## 13. Derived component inventory and evidence-backed status

**Decision**: component source directories are the authority. A pure sorted
inventory module derives tag, class, source, unit/browser tests, direct dist
module/package subpath, adjacent public module exports and token files.
Consumers use that derivation:

- direct source-module and wildcard package export validation. The existing
  root façade is deprecated in place at this MINOR, its exact symbol set is
  API-snapshotted/frozen, each symbol points to a direct subpath replacement,
  and no generator extends it; removal waits at least one MINOR and a separately
  approved MAJOR;
- ATTW entrypoints;
- default per-component size budgets with exactly three initial composite
  groups in the explicit exception file: `ki-radio-group + ki-radio`,
  `ki-tabs + ki-tab + ki-tab-panel`, and `ki-select + ki-option`;
- Style Dictionary's sorted component token discovery;
- machine surfaces and generator contract tests.

The generator creates source, unit/browser tests and component token sources;
the normal sync/build discovers everything else. A temporary-tree test plus a
clean generated-component smoke runs unit, build, pack, ATTW, budgets and real
browser checks and asserts the disposable tag in CEM/llms/tokens with zero
follow-up edits. Existing auxiliary root types remain protected by the API
snapshot.

Public status is driven by `docs/capabilities.json` with states `available`,
`hardening` and `planned` plus named mandatory gate evidence. Marked blocks in
README/site/workshop/package docs are generated. A claim can be `available`
only when all evidence IDs exist as mandatory gates and a final validator sees
them green for the current SHA/worktree digest. Unknown/stale evidence or
present-tense planned claims fail.

**Rationale**: deriving from the existing source contract avoids replacing
several manual lists with one more manual registry. A capability inventory
makes truthful language deterministic without generating different docs from
transient CI state.

**Alternatives considered**:

- Hand-maintained `components.json`: rejected as another source of drift.
- Generate prose from the last CI run: rejected because identical source would
  build different documentation depending on external state. Prose remains
  source-deterministic; only its final eligibility is checked against current
  run evidence.
- Remove public tokens while deriving the inventory: rejected as an undeclared
  breaking change; handled separately as described above.

## 14. Cross-cutting deterministic enforcement

**Decision**: traceability searches only declared repository roots
(`packages`, `scripts`, `.github`, `sandbox`, `tools`) and known test
extensions, requires `@spec:<feature>` and an S-ID on executable/non-comment
test code, and has adversarial fixtures for comment-only anchors. It never
scans dependencies or generated output.

All TypeScript build/test/browser/mutation configs enter an explicit `tsc`
project, with a negative fixture proving failure before browser launch. Gate
wrappers allocate isolated writable npm/pnpm/Nx/consumer/mutation caches and an
explicit `PLAYWRIGHT_BROWSERS_PATH` when the caller supplies none; browser gates
require the exact prepared binaries and never fall back to global HOME. CI
installs into the same isolated path. A global workflow-policy gate checks every
`uses:` at a full commit SHA, least-privilege job permissions and declared
blocked egress for every owned job. A pinned reusable workflow may use only a
versioned, reasoned exception because its internal runner is not controlled by
this repository; silent `audit` mode is never accepted.

**Rationale**: a requirement expressed only in a quickstart prefix or reviewer
convention is not deterministic enforcement under Art. X.

## Resolved unknowns

- No `NEEDS CLARIFICATION` remains.
- New dependencies are development/build tooling only; no runtime package gains
  a dependency.
- The signed model-lease broker and npm package/trusted-publisher/environment
  configuration are explicit external prerequisites. Local deterministic tests
  use a test signing key and never require real credentials; unattended model
  execution and public publish stay disabled until real conformance succeeds.
- The Spec Kit agent-context update helper referenced by the upstream plan
  workflow is absent in this repository; no generated agent file is edited by
  this plan.
