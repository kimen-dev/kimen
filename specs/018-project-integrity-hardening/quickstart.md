# Quickstart: validating project integrity hardening

Run from repository root. Commands are deterministic and credential-free unless
explicitly marked as an external smoke test.

## Prerequisites

- Node and pnpm versions from root `package.json`.
- Chromium installed for normal PR gates; Chromium, Firefox and WebKit for the
  prerelease matrix.
- Docker only for sandbox integration tests.
- No publishing token. Real publication uses GitHub OIDC only.

## 1. Contract and approval integrity (S1)

```sh
bash scripts/gates/check-spec-contracts.sh
bash scripts/gates/check-approvals.sh
bash scripts/gates/check-traceability.sh specs/018-project-integrity-hardening
bash scripts/gates/pre-plan-check.sh specs/018-project-integrity-hardening
bash scripts/gates/pre-implement-check.sh specs/018-project-integrity-hardening
```

Expected: every spec/feature pair is identical and lint-green; every approval
marker contains matching spec and feature hashes.

Fixture proof:

```sh
node --test scripts/tests/spec-contracts.test.mjs
```

The suite changes one byte in each contract independently and observes stale
approval. Traceability fixtures also prove multi-root MJS/CJS/JS/shell tests are
seen while scenario IDs present only in comments remain rejected.

## 2. Mutation threshold (S3)

```sh
KIMEN_MUTATION_BASE=HEAD pnpm run test:mutation
node --test scripts/tests/mutation-policy.test.mjs
```

Expected: changed core groups reach at least 70%, or the command reports an
explicit N/A because no core file changed. Policy fixtures prove 69 fails and
70 passes.

For a baseline diagnostic that intentionally ignores cached mutant results:

```sh
pnpm run test:mutation --force
```

## 3. Sandbox containment and recovery (S4–S5)

Credential-free deterministic tests:

```sh
pnpm run test:sandbox
pnpm run test:infra
node --test sandbox/tests/proxy.test.mjs
bash sandbox/tests/loop-host.test.sh
```

Mandatory Linux/Docker containment gate:

```sh
docker build --tag kimen-sandbox sandbox
KIMEN_REQUIRE_DOCKER_CONTAINMENT=1 \
  KIMEN_CONTAINMENT_IMAGE=kimen-sandbox \
  bash sandbox/tests/containment.test.sh
```

CI runs these commands in the mandatory Linux `containment` job. Setting
`KIMEN_REQUIRE_DOCKER_CONTAINMENT=1` converts an unavailable daemon/image from
a local skip into a hard failure; the merge gate therefore cannot silently
omit Docker containment. The disabled-at-rest desired main ruleset names
`containment` as its own required context; activation remains a separate
founder-controlled operation.

Expected:

- bootstrap completes without a model lease;
- expired/excessive fake leases are rejected and valid fake leases revoked;
- the agent UID cannot resolve or connect directly;
- allowlisted proxy CONNECT succeeds while undeclared host/IP attempts fail;
- early/agent/gate failures leave evidence JSON, snapshot commit and local
  `loop/<attempt-id>` ref; the evidence commit points to a distinct parent
  snapshot;
- lease JWT signature/claims/maximum 3,660-second TTL validate against a test
  Ed25519 key, fixed numeric quotas validate, and revocation failure prevents
  authoritative gates and makes the attempt red;
- trailing-dot, case/IDNA, userinfo, suffix, IPv6, port/header-smuggling and
  writable-allowlist proxy bypasses fail; CONNECT authority must equal parsed
  TLS SNI, while plaintext/no-SNI/ECH/shared-IP cross-vhost attempts fail;
- bootstrap has registry/build-only proxy access, the agent alone sees the
  lease, and final gates run in a new networkless container after secret deletion
  and successful revocation.

Real unattended execution additionally requires a user-managed signed gateway
`KIMEN_MODEL_LEASE_HELPER` implementing
[model-lease-v1](contracts/model-lease-v1.md). The helper's real credential
must stay outside this repository and container. The unattended capability
remains disabled until the real helper/key passes its conformance smoke.

## 4. Browser and release policy (S6–S7)

Local browser matrix:

```sh
bash scripts/gates/gates-browser.sh chromium
bash scripts/gates/gates-browser.sh firefox
bash scripts/gates/gates-browser.sh webkit
```

Each command validates every typed browser configuration, verifies the exact
prepared Playwright executable and runs only the selected engine. Prerelease
CI keeps the three outcomes in independent, non-fail-fast jobs.

Static/release-candidate tests:

```sh
pnpm run check:workflows
node --test scripts/tests/release-workflow.test.mjs
node --test scripts/tests/release-candidate.test.mjs
```

Expected: exact three engines with fail-fast disabled; candidate package set is
exactly elements+tokens; validation and `verify-candidate` have no write/OIDC
authority; every engine downloads/verifies the same artifact ID/SHA and installs
those tarballs; publisher alone gets OIDC after independent verification,
reconciles partial retries by registry SRI, consumes the immutable candidate and
runs no repository code. Dry-run accepts current private packages but cannot
publish; release mode requires exact tag/version/private=false metadata. All
actions are full-SHA pinned and release egress is blocked to declared endpoints.

A real publish is not a local validation step. It requires existing npm
packages, configured trusted publishers, preinstalled npm >=11.5.1 and a protected
`npm` environment, then a `vX.Y.Z` tag pointing at a protected-main
commit whose package versions already equal `X.Y.Z`. The scoped packages do
not yet exist and npm requires existence before trust configuration, so first
public publication is deliberately blocked; no token-based CI exception is
allowed. The exact package/workflow/environment setup and integrity-based
partial retry procedure are documented in `docs/releasing.md`.

External conformance status is intentionally fail-closed:

- deterministic lease/proxy/firewall fixtures and the mandatory Docker smoke
  are enabled in CI, but real unattended execution stays disabled until the
  user-managed signed lease broker/key passes `model-lease-v1` conformance;
- dry-run candidate, three-engine and no-OIDC verification are enabled, but
  real npm publication stays disabled until both packages exist and their
  trusted publishers plus the protected `npm` environment are configured;
- neither missing prerequisite permits a durable secret, permissive egress or
  a skipped containment/browser check.

## 5. Packed consumer and machine contracts (S8–S10)

```sh
pnpm run test:consumer-contract
pnpm run check:api
```

Expected:

- packages install from tarballs without workspace links;
- every documented package-manager command actually executes against the
  tarballs, and all JavaScript/TypeScript `llms.txt` examples compile and run;
- `ki-button` registers/renders with documented theme;
- undeclared HTTP/WebSocket requests and unpacked private paths fail closed;
- every CEM module path resolves within the tarball and every public facet has
  a description, including every consumed public semantic/component property;
- API snapshot reports patch/minor/major, binds declaration to baseline and
  candidate digests, rejects stale declarations and blocks removal without a
  deprecation present for at least one prior minor.

## 6. Tokens and generated component factory (S11–S12)

```sh
pnpm run check:tokens
pnpm exec nx test @kimen/nx-plugin
pnpm run test:generator-smoke
```

Expected: all four token compositions resolve without cycles/layer violations;
base sources precede overrides; no published semantic/component leaf lacks a
description; no component consumes primitive/theme names or motion literals;
the disposable `ki-avatar` scaffold is discovered by unit, build, pack, ATTW,
budgets, CEM, llms, token and browser checks with zero hand edits. The frozen
legacy root façade and its auxiliary exports remain unchanged.

## 7. Truthful public status (S13)

```sh
pnpm run generate:capabilities
git diff --exit-code -- README.md site/index.html docs/roadmap.md packages/*/README.md
pnpm run check:capabilities
```

Expected: generated blocks are synchronized across README, site, workshop and
package docs; every available claim references mandatory gates that are green
for the current SHA/worktree evidence record; catalog, renderer, guardrail and
adapters remain planned.

## 8. Full definition of done

```sh
bash scripts/gates/gates-suite.sh
```

Expected locally: exit 0, including changed-core mutation and Chromium. The
wrapper proves it can allocate isolated writable npm/pnpm/Nx/consumer/mutation
caches plus an exact `PLAYWRIGHT_BROWSERS_PATH` even when HOME/global caches are
read-only; a missing prepared browser fails explicitly rather than using a
global install. Protected-main completion additionally requires the independent
`mutation` and mandatory Linux `containment` contexts plus the
prerelease Firefox/WebKit evidence; a local green result cannot impersonate
those checks.

## 9. Remote protected-main smoke (after local gates)

1. Bootstrap a real `clean-context-review` check on a test PR.
   Completion supplies the reviewed packet's exact canonical
   `packet-manifest.json` bytes as standard base64 in
   `packet_manifest_base64`; `packetSha256` in the attestation is the SHA-256
   emitted by `review-package.sh`. The trusted workflow rejects missing,
   non-canonical, stale or digest-mismatched manifests before reading Check
   Runs.
   Observe Check Runs from the current PR head and bind these exact context
   names to their live App IDs: `gates`, `mutation`, `containment`, `analyze`,
   `semgrep`, `osv-scan / osv-scan`, `dependency-review`, `secrets`,
   `Socket Security: Pull Request Alerts`, and `clean-context-review`. GitHub
   rulesets match the Check Run/job name, not the displayed
   `<workflow> / <job>` label. Do not activate while any exact name or App ID
   is absent from the current head.
2. Apply the desired ruleset initially disabled, inspect its returned JSON,
   then activate it.
3. Confirm a stale SHA, failing required check and unresolved conversation each
   block merge.
4. Confirm the current all-green SHA presents squash merge as available without
   invoking it; direct/force updates remain blocked. The actual merge stays
   founder-only human gate 2.

The active-at-rest ruleset has `bypass_actors: []`. For a real emergency, the
founder first creates/keeps open a same-repository restoration issue, completes
the marked PR fields and applies the `break-glass` label. From a trusted host:

```sh
KIMEN_CONFIRM_EXCLUSIVE_RULESET_WRITER=founder-confirms-exclusive-ruleset-writer \
KIMEN_CONFIRM_BREAK_GLASS_SESSION=founder-opens-current-pr-only-bypass \
KIMEN_BREAK_GLASS_TIMEOUT_SECONDS=600 \
KIMEN_CHECK_INTEGRATIONS_JSON='<live context-to-App-ID map>' \
bash scripts/github/apply-main-ruleset.sh --open-break-glass <pr-number>
```

The command blocks while the founder performs the merge in GitHub. It never
calls a merge endpoint. It revalidates the exact request-payload digest and
open issue before accepting GitHub's merged state, and revokes the temporary
`User/pull_request` actor on merge, timeout, `INT`/`TERM`, head/base/body/label/
state change or observation failure. If revocation reports `recovery-ready`,
retry only with the exact emitted evidence:

```sh
KIMEN_CONFIRM_EXCLUSIVE_RULESET_WRITER=founder-confirms-exclusive-ruleset-writer \
bash scripts/github/apply-main-ruleset.sh --close-break-glass \
  reports/rulesets/break-glass-pr-<n>-<timestamp>-<nonce>
```

Residual boundary: GitHub scopes bypass to an actor, not one PR, so the founder
could select another founder PR during the maximum 600-second window. `kill -9`
or host loss is not trappable and leaves a `mutating` lock plus remote grant for
manual inspection/revocation; it is never auto-adopted or reported safe.

This step requires authenticated repository-admin authority. It is never
performed with credentials inside the unattended sandbox.

The controller's durable `.exclusive-writer.lock` is releasable only before a
remote mutation or after an exact success/rollback observation. An ambiguous
POST/PUT/final GET retains it as `recovery-ready`, bound to the canonical path
and SHA-256 of its create journal or rollback backup. Only `--claim-create`
with that exact journal or `--rollback` with that exact backup may adopt it;
foreign evidence and a changed lock device/inode fail closed. A process death
while the marker still says `mutating` is intentionally non-adoptable: inspect
the remote ruleset and evidence, prove no writer remains, and remove the lock
manually before retrying.

The controller also snapshots every `BACKUP_DIR` ancestor from the filesystem
root through the evidence directory and revalidates device, inode, owner and
mode before lock transitions and remote mutations. Ancestors must be real
directories owned by root or the current UID; group/world-writable ancestors
are rejected except for a root-owned sticky directory such as the physical
`/tmp`. Relative paths receive the same checks after lexical resolution.

## 10. Local execution record — 2026-07-10

The checks below ran against clean synthetic commit
`ef6d51202779a0db26b893bd866db9f01521fb37` in an independent clone. Its
candidate file list and byte-content digest matched the allowed real worktree
exactly at gate time:
`3de2b205a1132f0e233578817ab9451363b377c95f87b62d46ac4bdc1f28adfe`.
The comparison excluded only founder-owned `AGENTS.md` and `.agents/`, plus
ignored dependency/cache trees. The real repository index remained empty.

This synthetic SHA is local closure evidence, not a substitute for the future
PR SHA. The full suite and review packet must be regenerated after the intended
files are committed.

### T030 — S1–S3

All commands exited 0:

- contract, approval, feature traceability, pre-plan and pre-implement gates;
- 93/93 focused S1–S3 tests across contract drift, review evidence, desired
  ruleset/break-glass, review-package binding, mutation policy, runner and CI
  wiring;
- `KIMEN_MUTATION_BASE=HEAD pnpm run test:mutation`, which reported explicit
  N/A for both runners because the synthetic worktree exactly equalled `HEAD`.

The forced/current candidate mutation evidence was not N/A: Node scored
72.8761% (11,443 detected of 15,702 valid mutants) and Elements scored 87.9360%
(605 of 688), both above the independent 70% threshold.

### T078 — S11–S13

All commands exited 0:

- focused token/generator/capability contracts: 43/43;
- `@kimen/nx-plugin` component generator: 4/4;
- token gate: four compositions and 1,350 public CSS names;
- disposable real `ki-avatar` smoke: all nine unit, token, CEM, llms, build,
  pack, ATTW, budget and Chromium surfaces passed without manual edits;
- generated token and agent surfaces: 6/6 files each;
- component inventory: 20 components, three composite groups and 32 frozen
  root symbols;
- capability generation/check: five claims synchronized across eight
  destinations, with no documentation diff.

### T082 — complete local definition of done

`KIMEN_CACHE_ROOT=/private/tmp/kimen-suite-cache.NySFZA bash
scripts/gates/gates-suite.sh` exited 0 with 34 green evidence rows, 362/362
infrastructure tests, 190/190 Elements unit tests, 16/16 package Node tests,
337/337 Chromium tests and the mutation scores above. The exact terminal fence
was:

```text
LOCAL GATES GREEN — protected main still requires ci / containment
CURRENT-RUN EVIDENCE: /private/tmp/kimen-suite-cache.NySFZA/gate-evidence/current-run.tsv
```

Evidence digests:

- full log: `e52fe344a2f1f2a2fb4384c4237c4544e887b2c202492dcd2f0e7eb7dcdceee7`;
- `current-run.tsv`: `2659fe052d370dc3561a62d06d421d28e5fffeab1133ad8f6b0080601addf58c`;
- `capabilities-current-run.json`:
  `16d6663ff7dc5aa551b8c4ee46352780d6e9eca1e30a69aa439c217e3e0744b7`.

The TSV and capability JSON were regular non-symlink files with private mode
0600 and the capability evidence named the exact synthetic SHA. This local
result deliberately does not impersonate mandatory Linux `ci / containment`,
independent CI mutation, prerelease remote checks or founder-only repository
administration.
