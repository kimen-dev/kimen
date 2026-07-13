---
description: "Dependency-ordered implementation tasks for project integrity hardening"
---

# Tasks: Project integrity hardening

> Historical completion record. Tasks that created approval hashes or custom
> review evidence were deliberately retired by Constitution 2.0.0.

**Input**: Approved design documents from
`/specs/018-project-integrity-hardening/`

**Tests**: Mandatory RED→GREEN. Every S1–S13 appears in a marked test file and
the failing run is observed before its implementation task.

**Traceability marker**: `// @spec:018-project-integrity-hardening` (or shell
equivalent comment) in every scenario test file; each covered S-ID also appears
on executable test code, never only in a comment anchor.

## Phase 1: Approved baseline and completed restorations

**Purpose**: Preserve the mechanical/existing-contract corrections completed
before new 018 behavior was allowed.

- [x] T001 Synchronize and reapprove S14 in `specs/002-ki-button/spec.md`, `specs/002-ki-button/feature.feature`, and `specs/002-ki-button/.approved`
- [x] T002 Add the failing public-export regression and fix/regenerate `packages/elements/scripts/agent-surfaces.spec.ts`, `packages/elements/scripts/llms-preamble.txt`, `packages/elements/llms.txt`, and `llms.txt`
- [x] T003 Add the failing loop result-capture regression and fix `sandbox/tests/loop-entry.test.sh` and `sandbox/loop-entry.sh`
- [x] T004 Put browser config under TypeScript and remove duplicate `ariaSnapshot` in `packages/elements/scripts/tsconfig.json` and `packages/elements/vitest.browser.config.ts`
- [x] T005 Add infrastructure regressions for three-engine prerelease, exact agent CLI pins and loopback login in `scripts/tests/*.test.mjs`, `.github/workflows/release.yml`, `sandbox/Dockerfile`, and `sandbox/login.sh`
- [x] T006 Correct premature catalog/guardrail/mutation claims in `README.md`, `site/index.html`, `docs/roadmap.md`, `packages/elements/docs/introduction.mdx`, and `packages/kimen/README.md`

---

## Phase 2: Foundational test and policy scaffolding

**Purpose**: Shared deterministic infrastructure required by all stories.

- [x] T007 RED then GREEN reusable temporary-repository builders and multi-root/extension/executable-line traceability in `scripts/tests/helpers/fixture-repo.mjs`, `scripts/tests/fixtures/`, `scripts/tests/traceability.test.mjs`, and `scripts/gates/check-traceability.sh`
- [x] T008 [P] Add canonical JSON/hash/file utilities with unit tests in `scripts/lib/canonical-json.mjs` and `scripts/tests/canonical-json.test.mjs`
- [x] T009 [P] RED then GREEN sorted component/direct-subpath discovery and frozen legacy-root export characterization in `scripts/tests/component-inventory.test.mjs` and `scripts/lib/component-inventory.mjs`
- [x] T010 [P] RED then GREEN DTCG composition-order/reference/non-primitive-literal/public-description fixture parsing in `scripts/tests/token-inventory.test.mjs` and `scripts/lib/token-inventory.mjs`
- [x] T011 Audit and record Stryker 9.6.1 plus sandbox/release executable input risk and required later policy fixtures in `.supply-chain-risk-auditor/results.md`
- [x] T012 Install exact Stryker development dependencies and scripts in `package.json` and `pnpm-lock.yaml`
- [x] T013 Add reports, mutation caches, fixture output and ordinary attempt-evidence ignore policy with a fixture asserting the later exact-path force-add exception in `.gitignore` and `scripts/tests/fixtures/`

**Checkpoint**: Each shared helper completed its own observed RED→GREEN cycle;
the audit is recorded and no story checkpoint is claimed early.

---

## Phase 3: User Story 1 — The founder can trust what reaches main (Priority: P1) 🎯 MVP

**Goal**: Contracts, mutation evidence, review evidence and main policy are
bound to the exact current revision.

**Independent Test**: A one-byte contract change, failing/stale check, stale
review and 69% mutation score are rejected; synchronized/current evidence and
70% pass.

### RED: failing tests first

- [x] T014 [P] [US1] Write S1 contract/marker/migration fixtures and observe failures in `scripts/tests/spec-contracts.test.mjs`
- [x] T015 [P] [US1] Write S3 changed-file classifier and 69/70 policy fixtures and observe failures in `scripts/tests/mutation-policy.test.mjs`
- [x] T016 [P] [US1] Write S2 review attestation/current-SHA fixtures and observe failures in `.github/scripts/review-evidence.test.cjs`
- [x] T017 [P] [US1] Write S2 desired-ruleset/trusted-integration and founder-only PR break-glass actor/mode/justification/restoration fixtures and observe failures in `scripts/tests/main-ruleset.test.mjs`

### GREEN: synchronized approvals and gates

- [x] T018 [US1] Implement non-mutating global contract validation in `scripts/gates/check-spec-contracts.sh` and `scripts/gates/lib.sh`
- [x] T019 [US1] Implement strict approval-marker v2 parsing/writing in `scripts/gates/check-approvals.sh` and `scripts/gates/record-approval.sh`
- [x] T020 [US1] Re-extract 017 and implement safe legacy marker migration in `scripts/gates/migrate-approvals.sh` and `specs/*/.approved`
- [x] T021 [US1] Require synchronized approved pairs from both pre-gates in `scripts/gates/pre-plan-check.sh` and `scripts/gates/pre-implement-check.sh`
- [x] T022 [US1] Update tracked hook/workflow/skill contracts in `.specify/extensions.yml`, `.specify/workflows/kimen/workflow.yml`, `.claude/skills/kimen-gates-pre-plan/SKILL.md`, and `.claude/skills/kimen-gates-pre-implement/SKILL.md`
- [x] T023 [US1] Create the reusable core gate and order global contract/approval checks before the already-green multi-root traceability gate in `scripts/gates/gates-core.sh` and `scripts/gates/gates-suite.sh`

### GREEN: mutation gate

- [x] T024 [P] [US1] Implement mutation policy/classification and scope hashing in `scripts/gates/mutation-changed.mjs` and `scripts/lib/mutation-policy.mjs`
- [x] T025 [P] [US1] Add node/elements Stryker configuration in `stryker.node.config.mjs`, `stryker.elements.config.mjs`, and `vitest.mutation.config.ts`
- [x] T026 [US1] Wire changed-core mutation/base inputs and self-isolating writable npm/pnpm/Nx/Playwright/mutation cache enforcement with a read-only-HOME fixture in `package.json`, `scripts/gates/gates-core.sh`, `scripts/gates/cache-env.sh`, and `.github/workflows/ci.yml`

### GREEN: current-SHA review and desired ruleset

- [x] T027 [P] [US1] Implement review evidence validator/check-run controller in `.github/scripts/review-evidence.cjs`
- [x] T028 [US1] Add pending-on-update and founder-controlled completion workflow in `.github/workflows/review-evidence.yml`
- [x] T029 [P] [US1] Encode disabled-first protected main, founder-only PR break-glass template/check, and safe apply/rollback in `.github/rulesets/main.json`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/workflows/break-glass.yml`, and `scripts/github/apply-main-ruleset.sh`
- [x] T030 [US1] Run S1–S3 tests plus contract, approval and mutation dry-run gates and record outputs in `specs/018-project-integrity-hardening/quickstart.md`

**Checkpoint**: US1 is locally complete. Ruleset remains disabled until a real
review check has been bootstrapped and final gates are green.

---

## Phase 4: User Story 2 — Automation fails safely (Priority: P1)

**Goal**: Unattended agents and releases fail closed without durable authority,
and every candidate/attempt retains exact evidence.

**Independent Test**: Fake leases and denied network targets fail closed;
agent/gate/host failures leave snapshots; one browser failure blocks publish;
only the publisher gets OIDC and it consumes unchanged bytes.

### RED: failing tests first

- [x] T031 [P] [US2] Write S4 EdDSA-only known/rotated-key, algorithm-confusion, issuer/audience/numeric-scope/3,660-second-TTL/revocation fixtures in `scripts/tests/model-lease.test.mjs`
- [x] T032 [P] [US2] Write S4 proxy exact-host plus CONNECT/SNI shared-IP mismatch, no-SNI/ECH/plaintext, trailing-dot/case/IDNA/userinfo/suffix/IPv6/port/header-smuggling/config-ownership and direct-DNS fixtures in `sandbox/tests/proxy.test.mjs` and `sandbox/tests/containment.test.sh`
- [x] T033 [P] [US2] Write S5 ordered bootstrap/agent/revoke/secretless-gate, container/host interruption, clean/dirty/already-committed, two-commit snapshot and finalizer-failure fixtures in `sandbox/tests/loop-entry.test.sh` and `sandbox/tests/loop-host.test.sh`
- [x] T034 [P] [US2] Write S6 exact-matrix/fail-fast/needs plus full config-typecheck and global action-SHA/least-permission/blocked-egress fixtures in `scripts/tests/release-workflow.test.mjs`, `scripts/tests/workflow-policy.test.mjs`, and `scripts/tests/config-typecheck.test.mjs`
- [x] T035 [P] [US2] Write S7 dry-run/release modes, canonical candidate/tag/exact-elements+tokens/SHA256+SRI/lifecycle/same-artifact-browser/no-OIDC-verifier/npm/private/first-release/partial-retry fixtures in `scripts/tests/release-candidate.test.mjs`

### GREEN: contained unattended loop

- [x] T036 [P] [US2] Pin the base image digest and dated Debian snapshot/package versions, move agent CLIs to an integrity-locked install, and test runtime uses the immutable build image ID rather than a mutable tag in `sandbox/package.json`, `sandbox/package-lock.json`, and `sandbox/Dockerfile`
- [x] T037 [P] [US2] Add bounded TLS-ClientHello/SNI-enforcing exact-host CONNECT proxy and versioned phase-specific allowlists in `sandbox/proxy.mjs` and `sandbox/egress-allowlist.txt`
- [x] T038 [US2] Restrict the agent UID to loopback and proxy UID to declared HTTPS/DNS in `sandbox/init-firewall.sh` and `sandbox/Dockerfile`
- [x] T039 [P] [US2] Implement host-side EdDSA keyring/signature+claim+quota acquire/validate/revoke and real-broker conformance handling in `sandbox/model-lease.sh`
- [x] T040 [US2] Split registry-only bootstrap, leased agent, revoke/delete, and fresh networkless secretless gate containers; remove persistent auth mounts and run the immutable image ID in `sandbox/loop.sh`, `sandbox/loop-entry.sh`, and `sandbox/run.sh`
- [x] T041 [US2] Implement all containment phases, separate gate/overall verdicts, exact evidence force-add, stale-running recovery, and host-authoritative snapshot-parent plus evidence-ref commits in `sandbox/finalize-attempt.sh`, `sandbox/loop.sh`, and `sandbox/loop-entry.sh`
- [x] T042 [US2] Document the external broker contract and retire login from unattended use in `sandbox/README.md` and `sandbox/login.sh`

### GREEN: three-engine immutable release

- [x] T043 [P] [US2] Parameterize one browser engine per run, require exact binaries under isolated `PLAYWRIGHT_BROWSERS_PATH` with a clear missing-binary failure, and put Stencil/Vitest/browser/mutation configs under TypeScript validation before launch in `packages/elements/scripts/tsconfig.json`, `packages/elements/vitest.browser.config.ts`, and `scripts/gates/gates-browser.sh`
- [x] T044 [US2] Complete local core plus Chromium wrappers and current-run evidence recording in `scripts/gates/gates-core.sh`, `scripts/gates/gates-browser.sh`, and `scripts/gates/gates-suite.sh`
- [x] T045 [P] [US2] Implement dry-run/release canonical exact-two-package archive, repository metadata, SHA-256/SHA-512 manifest and strict validation in `scripts/release/build-candidate.mjs`, `packages/elements/package.json`, and `packages/tokens/package.json`
- [x] T046 [US2] Implement global full-SHA/permission/blocked-egress policy, migrate owned CI/security/CodeQL/docs/review workflows to explicit allowlists (or a pinned documented reusable-workflow exception), and replace release with validate/upload, same-artifact browsers, no-OIDC verification and idempotent minimal publishing in `scripts/gates/check-workflows.mjs` and `.github/workflows/*.yml`
- [x] T047 [US2] Document dry-run versus release PR/tag/private/version/environment, npm >=11.5.1, exact metadata, trusted publisher, integrity-based partial retry and fail-closed first publication in `docs/releasing.md`
- [x] T048 [US2] Wire mandatory Linux Docker containment into CI, run all S4–S7 fixtures/smoke, and record disabled-until-conformant external broker/npm prerequisites in `.github/workflows/ci.yml` and `specs/018-project-integrity-hardening/quickstart.md`

**Checkpoint**: US2 is complete locally; no real credential or publication is
needed for deterministic proof.

---

## Phase 5: User Story 3 — A clean consumer can use what Kimen advertises (Priority: P1)

**Goal**: Tarball consumers can execute llms guidance, resolve CEM paths and
receive a conservative SemVer decision.

**Independent Test**: A temporary non-workspace consumer installs tarballs,
compiles snippets and renders a themed button; every CEM path/facet validates;
API fixtures classify additive/removal/docs deltas.

### RED: failing tests first

- [x] T049 [P] [US3] Write S8 exported/non-exported snippet and clean-consumer fixtures and observe failures in `scripts/tests/consumer-contract.test.mjs`
- [x] T050 [P] [US3] Write S9 published-path/attribute/all-consumed-public-semantic+component-CSS-property description fixtures and observe failures in `packages/elements/scripts/agent-surfaces.spec.ts`
- [x] T051 [P] [US3] Write S10 patch/minor/major/unknown, baseline/candidate digest, first-release, stale declaration, deprecation-before-removal and every-root-symbol replacement fixtures in `scripts/tests/public-api.test.mjs`

### GREEN: package and manifest contracts

- [x] T052 [P] [US3] Implement clean tarball install/snippet compile/browser smoke in `scripts/consumer-contract.mjs`
- [x] T053 [US3] Add non-empty descriptions to every published semantic/component token leaf before CEM closes, resolve modules through public exports, and add attribute descriptions in `packages/tokens/tokens/**/*.tokens.json` and `packages/elements/scripts/agent-surfaces.mjs`
- [x] T054 [US3] Implement ordered token inventory and derive every documented consumed public semantic/component CSS property in `scripts/lib/token-inventory.mjs` and `packages/elements/scripts/build-surfaces.mjs`
- [x] T055 [US3] Validate every CEM facet/path inside the packed elements package in `scripts/gates/check-packed-manifest.mjs`
- [x] T056 [US3] Regenerate `packages/elements/generated/docs.json`, `packages/elements/generated/custom-elements.json`, `packages/elements/llms.txt`, and `llms.txt` from their sources

### GREEN: API snapshot and SemVer

- [x] T057 [P] [US3] Implement canonical surface-only digest, per-export/root-symbol deprecation metadata, versioned baseline, deprecation-age and conservative classifier in `scripts/lib/public-api.mjs`
- [x] T058 [US3] Implement digest-bound declaration/baseline comparison and create immutable 0.0.0 baseline from the pre-018 git base without yet sealing the changing candidate in `scripts/gates/check-public-api.mjs`, `changes/api/README.md`, and `changes/api/baselines/0.0.0.json`
- [x] T059 [US3] Wire packed-consumer/manifest gates and expose the API fixture command without sealing or gating the still-changing repository candidate in `package.json` and `scripts/gates/gates-core.sh`
- [x] T060 [US3] Run S8–S10 tests and clean-consumer smoke from an isolated npm cache per `specs/018-project-integrity-hardening/quickstart.md`

**Checkpoint**: US3 proves packed consumer/CEM plus the API classifier and
baseline contract; T079 seals the real candidate only after all public deltas
have landed.

---

## Phase 6: User Story 4 — New work inherits integrity by construction (Priority: P2)

**Goal**: Token violations, incomplete scaffolds and unsupported public claims
cannot enter the repository.

**Independent Test**: The three invalid token fixtures fail by file/value;
`ki-avatar` needs no post-generation wiring; a planned capability cannot be
rendered as available without mandatory evidence.

### RED: failing tests first

- [x] T061 [P] [US4] Write S11 unresolved/CSS-motion/non-primitive-token-literal/primitive/layer/cycle/missing-public-description and base-before-override fixtures in `scripts/tests/token-contract.test.mjs`
- [x] T062 [P] [US4] Write S12 generator Tree plus disposable ki-avatar unit/token/CEM/llms/build/pack/ATTW/budget/browser discovery and duplicate-name fixtures in `tools/kimen-plugin/src/generators/component/generator.spec.js` and `scripts/tests/generator-smoke.test.mjs`
- [x] T063 [P] [US4] Write S13 unavailable-evidence/manual-drift fixtures and observe failures in `scripts/tests/capability-claims.test.mjs`

### GREEN: closed token contract

- [x] T064 [P] [US4] Implement four ordered compositions, eventual-lower aliases, non-primitive visual-literal rejection, cycle, all-public-description and CSS-literal validation in `scripts/gates/check-tokens.mjs` and `scripts/lib/token-inventory.mjs`
- [x] T065 [US4] Migrate every theme/semantic/component visual literal or CSS-var composite to primitive-backed typed aliases, add minimum motion aliases, and preserve T053 descriptions in `packages/tokens/tokens/**/*.tokens.json`
- [x] T066 [US4] Replace current undefined motion, 120ms/easing literals and primitive zero consumption in `packages/elements/src/components/**/*.css`
- [x] T067 [US4] Discover component token sources as deterministic base groups followed by theme overrides instead of one lexicographic/manual list in `packages/tokens/style-dictionary.config.mjs`
- [x] T068 [US4] Regenerate `packages/tokens/dist/css/*.css` and prove all four contracts plus contrast in `packages/tokens/scripts/*.test.mjs`

### GREEN: derived factory

- [x] T069 [P] [US4] Complete source-derived direct-module/subpath/token/test inventory and freeze-check legacy root plus auxiliary exports in `scripts/lib/component-inventory.mjs` and `scripts/gates/check-component-inventory.mjs`
- [x] T070 [US4] Replace per-component package export lists with a safe direct-subpath pattern, deprecate every legacy root symbol with its replacement while freezing the symbol set, document migration, and sync derived consumers in `packages/elements/package.json`, `packages/elements/src/index.ts`, `docs/migrations/root-imports.md`, and `packages/elements/scripts/sync-components.mjs`
- [x] T071 [US4] Derive ATTW entrypoints and default/composite budgets after inventory is green in `scripts/gates/check-packaging.mjs`, `packages/elements/scripts/run-size-limit.mjs`, and `packages/elements/size-limit/groups.json`
- [x] T072 [US4] Extend component generator to create token sources and rely on derived consumers in `tools/kimen-plugin/src/generators/component/generator.js` and `tools/kimen-plugin/src/generators/component/files*/`
- [x] T073 [US4] Add Nx plugin test target and run disposable ki-avatar unit/token/CEM/llms/build/pack/ATTW/budget/real-browser smoke in `tools/kimen-plugin/package.json`, `package.json`, and `scripts/generator-smoke.mjs`

### GREEN: evidence-backed public status

- [x] T074 [P] [US4] Define one `availableText` capability schema, mandatory evidence IDs, current-run eligibility and every README/site/workshop/package destination in `docs/capabilities.json`
- [x] T075 [P] [US4] Implement deterministic marked-block generation plus static and current-SHA/worktree green-evidence validation in `scripts/lib/capability-claims.mjs` and `scripts/gates/check-capabilities.mjs`
- [x] T076 [US4] Generate synchronized capability blocks in `README.md`, `site/index.html`, `docs/roadmap.md`, `packages/elements/docs/introduction.mdx`, `packages/catalog/package.json`, `packages/catalog/README.md`, `packages/kimen/package.json`, and `packages/kimen/README.md`
- [x] T077 [US4] Wire token/inventory/generator/static capability checks into core and current-run capability evidence after browser gates in `package.json`, `scripts/gates/gates-core.sh`, and `scripts/gates/gates-suite.sh`
- [x] T078 [US4] Run S11–S13 tests, generated-component smoke and sync checks per `specs/018-project-integrity-hardening/quickstart.md`

**Checkpoint**: US4 makes the factory and public status fail closed.

---

## Phase 7: Polish, deterministic closure and remote enforcement

- [x] T079 After token and root-deprecation work, generate final `packages/elements/generated/public-api.json` plus digest-bound `changes/api/018-project-integrity-hardening.json`, wire the real API gate, re-run tracked surfaces, and ensure only declared generated files change via `scripts/gates/gates-core.sh`
- [x] T080 Run formatting, ESLint, Stylelint, all-config typecheck, dead-code, workflow policy, packaging and budget gates from `scripts/gates/gates-core.sh`
- [x] T081 Run the full Chromium component suite then the explicit Firefox/WebKit prerelease matrix through `scripts/gates/gates-browser.sh`
- [x] T082 Run changed-core Stryker to ≥70% and the entire local definition of done with isolated npm cache via `scripts/gates/gates-suite.sh`
- [x] T083 Run `/speckit-converge` against `spec.md`, `plan.md`, and this `tasks.md`, appending any remaining work to `specs/018-project-integrity-hardening/tasks.md`
- [ ] T084 Build the clean-context review packet and dispatch the reviewer through `.claude/skills/requesting-code-review/scripts/review-package.sh`
- [ ] T085 Address at most two actionable review rounds and re-run full gates on the reviewed SHA
- [ ] T086 Bootstrap one real `clean-context-review` Check Run using `.github/workflows/review-evidence.yml`
- [ ] T087 Apply `.github/rulesets/main.json` disabled, validate live checks/App IDs, activate it, then add `clean-context-review` only after its real check exists
- [ ] T088 Exercise remote negative stale/check/thread/break-glass cases and confirm without invoking that the positive current-SHA case exposes squash-only merge; record evidence in `specs/018-project-integrity-hardening/quickstart.md`
- [ ] T089 Present final diff, gate evidence, external prerequisite status and unresolved founder-only merge action without staging unrelated `AGENTS.md` or `.agents/`

---

## Dependencies & Execution Order

```text
Phase 1 completed baseline
  → Phase 2 shared helpers
  → US1 trust root
      → US2 automation boundary
      → US3 packaged consumer
      → US4 closed factory/status
  → Phase 7 convergence/review/ruleset
```

- US1 is the MVP and blocks implementation trust for every later story.
- T007/T023 make infrastructure tests visible to traceability before any story
  can claim scenario coverage.
- After US1, US2 sandbox/release and the RED portions of US3/US4 can be
  researched in parallel, but this feature retains one writer.
- T010 supplies the token RED contract; T053 adds every public description
  before US3 CEM closes, and T061/T064 later prove the full S11 validator.
- US4 component inventory drives its packaging/budget/generator tasks.
- Remote ruleset activation is last so it cannot require a review context that
  has never existed.

## Parallel Execution Examples

- **US1 RED**: T014–T017 touch independent fixture files.
- **US1 GREEN**: T024/T025 can proceed alongside T027/T029 after contract gates.
- **US2 RED**: T031–T035 are independent; T036/T037/T039 can begin after their
  corresponding red fixture.
- **US3 RED**: T049–T051 are independent; public API logic T057 can proceed
  after its red fixture while consumer/CEM work remains separate.
- **US4 RED**: T061–T063 are independent; token validator, derived inventory and
  capability generator occupy different files. T071 is intentionally serial
  after T069 because it consumes that inventory.
- Cross-story parallelism requires independent worktrees; this execution keeps
  a single writer and uses subagents only for read-only research/review.

## Implementation Strategy

1. Deliver US1 first: paired approvals, mutation and current-SHA merge evidence.
2. Deliver US2 without real credentials using fake lease/proxy/release fixtures.
3. Deliver US3 from actual tarballs, not workspace imports.
4. Deliver US4 by deriving from source and making token/status claims closed.
5. Run all local gates before any remote policy mutation.
6. Bootstrap review evidence, then activate/probe protected main; founder retains
   final merge gate.

## Notes

- `[P]` means different files and no dependency on an unfinished task.
- New behavior tests must be observed red for the approved reason before GREEN.
- Generated artifacts are regenerated from source, never patched directly.
- Full gate-suite exit 0 is the only local done verdict.

---

## Phase 8: Convergence

- [x] T090 Implement and fixture-test a deterministic initial-to-review-required ruleset transition that refuses `clean-context-review` before a real Check Run is observed, binds its trusted App ID, verifies the live final payload and preserves rollback per FR-005, SC-002, S2 and Constitution X (partial)
- [x] T091 Add the real S5 sequence `initial evidence → agent commit → failure/interruption → red two-commit snapshot/ref`, then fix finalizer lineage so `baseSha` remains the attempt starting point while the pre-finalization HEAD descends from it per FR-010, SC-005 and S5 (partial)
- [x] T092 Make `review-package.sh` deterministically classify UI-affecting diffs and fail closed unless a non-empty regular rendered-evidence directory is included, with positive and negative fixtures, per the constitutional Workflow and `review-evidence-v1` (partial)

---

## Phase 9: Convergence

- [x] T093 **CRITICAL** Eliminate every host execution path through agent-controlled Git metadata by cloning without hardlinks and finalizing with trusted Git metadata/index/plumbing that cannot consume planted hooks, filters, fsmonitor, signing, `core.worktree` or local config, with real escape fixtures, per Constitution XI, FR-010 and S5 (contradicts)
- [x] T094 **CRITICAL** Produce host-verifiable root-only agent-container phase evidence and require every operational/containment phase other than the terminal agent result to pass before the overall verdict can be green, including firewall/proxy/Docker pre-agent failures, per Constitution XI, S5 and `attempt-evidence-v1` (contradicts)
- [x] T095 Preserve and validate stale-attempt identity and ancestry, recover only absent refs atomically, accept only a verified red finalization, and block a new attempt on corrupt metadata, unrelated history or operational finalizer failure, with real recovery fixtures, per FR-010, SC-005 and S5 (partial)
- [x] T096 Assemble review packets only in a process-owned confined destination from one frozen base/head SHA pair, revalidate revision binding, make production-path UI classification take precedence and require an integrity-bound evidence manifest covering affected rendered states, per the constitutional Workflow and `review-evidence-v1` (partial)
- [x] T097 Bind ruleset rollback evidence to a validated schema, repository, ruleset name and ID; reject symlink/tampered backups; and verify the exact live state after both restoration and deletion, with mocked remote negatives, per FR-005, SC-002 and S2 (partial)
