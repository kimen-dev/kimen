# Implementation Plan: Project integrity hardening

> Historical plan. Constitution 2.0.0 supersedes its approval-marker,
> review-evidence and per-PR mutation wiring.

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI. -->

**Branch**: `018-project-integrity-hardening` | **Date**: 2026-07-09 | **Spec**: [spec.md](./spec.md)

**Input**: Approved feature specification from
`specs/018-project-integrity-hardening/spec.md` (S1–S13; founder explicitly
approved security scenarios S2, S4, S5 and S7 on 2026-07-09).

## Summary

Make Kimen's constitutional claims mechanically true from behavior approval to
published bytes. The implementation adds paired contract hashes, global spec
and approval checks, changed-core mutation analysis, revision-bound review
evidence and protected-main policy; replaces durable unattended credentials
with an external short-lived lease and domain-enforcing proxy; separates
validation from OIDC publication through one immutable package artifact; and
unifies token, CEM, API, component-inventory and capability evidence so clean
consumers can execute everything Kimen advertises.

The design is build/test infrastructure only. It introduces no runtime
dependency or new UI interaction. The runtime GenUI catalog, renderer,
guardrail and protocol adapters remain separate future features.

## Technical Context

**Language/Version**: TypeScript 6 strict, JavaScript ESM on Node 22, Bash,
GitHub Actions YAML, DTCG JSON and CSS

**Primary Dependencies**: existing StencilJS 4.43.5, Vitest 4.1.9, Playwright
1.61.1, Style Dictionary 5.5.0, Nx 23.0.1, size-limit, publint and ATTW; new
development-only StrykerJS 9.6.1 core/Vitest runner

**Storage**: repository files and Git history; temporary test/pack directories;
Stryker incremental reports; GitHub Check Runs, rulesets and immutable Actions
artifacts. No application database.

**Testing**: Node built-in test runner for infrastructure/policy, Vitest node
and Stencil unit suites, Vitest Browser Mode/Playwright for real browser and
packed-consumer validation, shell integration fixtures, Docker containment
smoke and workflow-structure tests

**Target Platform**: macOS/Linux developer hosts, GitHub-hosted Ubuntu runners,
Docker Linux sandbox, current Chromium/Firefox/WebKit prerelease matrix

**Project Type**: pnpm/Nx monorepo; build/governance/security feature spanning
components, tokens, generators, CI and release infrastructure

**Performance Goals**: existing non-mutation PR gates remain within the current
20-minute CI timeout; changed-core mutation has its own 20-minute job timeout,
uses file-set incremental caches and reports elapsed time; each prerelease
browser job has a 20-minute timeout and all three run in parallel with
`fail-fast: false`; per-component runtime budgets stay unchanged

**Constraints**: no behavior beyond approved S1–S13; zero new runtime
dependency; no durable credential in unattended containers; publisher executes
no repository code; generated artifacts are regenerated, never hand-edited;
current user changes in `AGENTS.md` and untracked `.agents/` remain untouched

**Scale/Scope**: 18 approved feature pairs, 20 custom-element tags, four token
compositions, 1,213 currently emitted token names (694 component leaves), three
browser engines, exactly two current release candidates (`@kimen/elements` and
`@kimen/tokens`), one planned/private catalog package and one protected default
branch

## Constitution Check

*Pre-research verdict and post-design verdict are both PASS. No violation is
carried into Complexity Tracking.*

- **Art. I — AI-First, one source of truth — PASS**: Gherkin is extracted from
  specs; component inventory derives from source; token inventory feeds CEM/API;
  capability blocks and all committed machine surfaces have sync gates. No
  generated `llms.txt`, CEM, token CSS or docs block is hand-edited.
- **Art. II — Specs before code — PASS**: founder approved S1–S13 including the
  four named security boundaries; 002 S14 was explicitly reapproved and
  synchronized. All UI-only families are N/A-justified because 018 adds no UI.
  No implementation task exceeds those scenarios.
- **Art. III — Test-first, deterministic gates — PASS**: each behavioral change
  begins with its S-ID regression/contract test; Stryker break threshold is 70
  per changed-core group; browser and pack-consumer outcomes use real browsers;
  completion remains full gate-suite exit 0.
- **Art. IV — Web standards & lightness — PASS**: no component runtime code or
  dependency is added. Chromium remains the PR baseline and all three engines
  are independent prerelease checks. New components use direct package
  subpaths; the pre-existing root compatibility façade is deprecated in place,
  frozen rather than extended, and retained for at least one MINOR before any
  explicitly approved MAJOR removal. Existing per-component budgets remain.
- **Art. V — Accessibility — PASS**: no new interaction pattern. Reapproved
  `ki-button` S14 remains browser-tested; clean-consumer smoke checks the real
  focusable component rather than adding ARIA or changing semantics.
- **Art. VI — Closed tokens — PASS**: structural validation covers references,
  cycles, ordered base/override compositions, same-layer aliases, downward
  layer direction, public leaf descriptions and CSS consumers; existing
  motion/reset defects are fixed through described semantic/component tokens
  or grammatical zero. No token is silently removed in this additive feature.
- **Art. VII — Simplicity — PASS**: use small standard-library validators and a
  standard-library CONNECT proxy; derive inventory from existing source instead
  of introducing a manual registry; defer actual token-surface reduction.
- **Art. VIII — Neutral catalog/adapters — PASS/N/A**: no runtime catalog,
  renderer, guardrail or protocol adapter is implemented. Public docs continue
  to label them planned.
- **Art. IX — Public API stability — PASS**: canonical API snapshots include
  exports, CEM facets, tokens and browser baseline; conservative SemVer diff
  binds declarations to baseline/candidate digests and blocks removal without
  at least one prior MINOR of deprecation metadata. New motion tokens and
  descriptions are additive.
- **Art. X — Deterministic static analysis — PASS**: every review finding that a
  script can decide becomes a gate: contract/approval, mutation, token/API,
  package consumer, component inventory, capability claims and release policy.
  A global workflow policy requires SHA-pinned actions, least privilege and
  declared blocked egress. Required GitHub contexts are bound to trusted
  integrations.
- **Art. XI — Agent security — PASS**: bootstrap is credential-free; unattended
  agent execution requires a signed gateway JWT whose signature, claims and
  maximum 3,660-second lifetime are host-verified; agent UID has no direct
  DNS/network; publication credentials exist only as OIDC in the publisher
  after independent artifact verification; permission bypass remains confined
  to the sandbox.

**Definition of done (Art. III)**: only
`bash scripts/gates/gates-suite.sh` exiting 0 closes local work. The wrapper
creates and validates isolated writable caches, including an explicit
`PLAYWRIGHT_BROWSERS_PATH`, itself. Remote completion additionally requires the
review check and effective ruleset smoke on the current SHA.

### Constitutional Surface (echo from spec.md)

- **Public API delta** (Art. IX): additive motion/component tokens and richer
  CEM descriptions become public; package/API diffing is added. No existing
  component behavior is intentionally removed. SemVer classification is part
  of the feature rather than an afterthought.
- **Bundle budget** (Art. IV): zero intended runtime JavaScript cost. Stryker,
  pack-consumer fixtures and policy tooling are development-only; any runtime
  dependency is out of scope without a new written budget decision.
- **Accessibility** (Art. V): no new interaction. The known `ki-button` S14
  accessibility behavior is preserved only through explicit reapproval, not
  by silently tolerating spec drift.
- **Tokens** (Art. VI): introduces the minimum motion/component aliases needed
  to remove undefined/literal/primitive consumption; validates references and
  layer direction; requires public leaf descriptions.
- **Catalog/agent legibility** (Art. I): packed `llms.txt` and CEM become
  consumer-executable contracts. Runtime catalog/renderer behavior remains
  planned and out of scope.
- **Guardrail/security boundary** (Arts. VIII/X/XI): S2, S4, S5 and S7 touch
  merge authority, agent containment and publishing identity and therefore
  require explicit scenario approval. This feature does not implement the
  runtime UI-spec guardrail of Art. VIII.

Mapping: API/CEM/consumer tasks cover public API and legibility; Stryker and
gate tasks cover budget-free development tooling; 002 sync/browser verification
covers accessibility; token validator/migration covers Art. VI; sandbox,
review/ruleset and release tasks cover the security boundary.

## Project Structure

### Documentation (this feature)

```text
specs/018-project-integrity-hardening/
├── .approved
├── spec.md
├── feature.feature
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── approval-marker-v2.md
│   ├── attempt-evidence-v1.md
│   ├── capability-claims-v1.md
│   ├── model-lease-v1.md
│   ├── public-api-snapshot-v1.md
│   ├── release-candidate-v1.md
│   └── review-evidence-v1.md
├── checklists/
│   ├── requirements.md
│   └── integrity.md
└── tasks.md
```

### Source Code (repository root)

```text
scripts/
├── gates/
│   ├── check-spec-contracts.sh
│   ├── check-approvals.sh
│   ├── check-traceability.sh
│   ├── check-workflows.mjs
│   ├── mutation-changed.mjs
│   ├── check-tokens.mjs
│   ├── check-public-api.mjs
│   ├── check-component-inventory.mjs
│   ├── check-capabilities.mjs
│   ├── gates-core.sh
│   ├── gates-browser.sh
│   └── gates-suite.sh
├── lib/
│   ├── canonical-json.mjs
│   ├── component-inventory.mjs
│   ├── token-inventory.mjs
│   ├── public-api.mjs
│   └── capability-claims.mjs
├── release/
│   └── build-candidate.mjs
├── consumer-contract.mjs
└── tests/
    ├── spec-contracts.test.mjs
    ├── traceability.test.mjs
    ├── workflow-policy.test.mjs
    ├── mutation-policy.test.mjs
    ├── token-contract.test.mjs
    ├── public-api.test.mjs
    ├── component-inventory.test.mjs
    ├── capability-claims.test.mjs
    ├── consumer-contract.test.mjs
    ├── release-candidate.test.mjs
    └── release-workflow.test.mjs

sandbox/
├── Dockerfile
├── package.json
├── package-lock.json
├── egress-allowlist.txt
├── proxy.mjs
├── init-firewall.sh
├── loop.sh
├── loop-entry.sh
├── finalize-attempt.sh
├── model-lease.sh
├── README.md
└── tests/
    ├── loop-entry.test.sh
    ├── loop-host.test.sh
    ├── proxy.test.mjs
    └── containment.test.sh

packages/elements/
├── scripts/agent-surfaces.mjs
├── scripts/build-surfaces.mjs
├── scripts/*.spec.ts
├── generated/custom-elements.json
├── generated/public-api.json
├── src/index.ts                         # deprecated/frozen legacy root façade
├── package.json                         # direct export pattern, not per-tag list
└── vitest.browser.config.ts

packages/tokens/
├── tokens/**/*.tokens.json
├── style-dictionary.config.mjs          # sorted discovery, no component list
├── build.mjs
└── dist/css/*.css

tools/kimen-plugin/
├── src/generators/component/generator.js
├── src/generators/component/files*/
└── src/generators/component/*.spec.*

docs/
├── capabilities.json
├── migrations/root-imports.md
└── releasing.md

.github/
├── workflows/ci.yml
├── workflows/release.yml
├── workflows/review-evidence.yml
├── workflows/break-glass.yml
├── scripts/review-evidence.cjs
├── PULL_REQUEST_TEMPLATE.md
└── rulesets/main.json

changes/api/
├── baselines/<version>.json
└── *.json

stryker.node.config.mjs
stryker.elements.config.mjs
```

**Structure Decision**: infrastructure remains near the boundary it governs;
shared deterministic transforms live in `scripts/lib`, thin gate entrypoints in
`scripts/gates`, sandbox containment in `sandbox`, package generation beside
the package, and external policy under `.github`. Component directories remain
the sole discoverable inventory authority.

## Implementation Strategy

1. **Trust root**: RED fixtures, multi-root scenario traceability, paired
   approval format/global contract gates, 017 regeneration, safe marker
   migration and updated tracked Kimen gate skills.
2. **Quality policy**: Stryker dependencies/config/classifier with 69/70 tests,
   isolated cache and CI base SHA.
3. **Closed contracts**: token inventory/validator and current CSS fixes; add
   public descriptions before CEM closes; use every consumed public property to
   enrich CEM and the digest-bound canonical public API; add pack-consumer proof.
4. **Factory derivation**: component inventory, direct subpath exports, dynamic
   checks/budgets, token discovery and complete generator contract/smoke. The
   legacy root façade keeps its symbol set, receives deprecation/replacement
   metadata and no new component.
5. **Containment**: signed lease, CONNECT+TLS-SNI proxy/firewall, immutable
   image ID, credential-free bootstrap, leased agent, mandatory revoke/delete,
   fresh networkless gate container, mandatory Docker CI and two-commit
   host-authoritative attempt evidence.
6. **Release**: core/candidate split, exact two-package immutable candidate,
   all three browsers installing those same tarballs, no-OIDC verification,
   idempotent OIDC-only publisher and fail-closed first-release docs/tests.
7. **Truth and review**: capability inventory/generated blocks, review Check Run
   controller and desired ruleset file.
8. **Closure**: full gates, clean-context review, bootstrap real review check,
   activate/probe ruleset, then founder merge gate.

Each numbered stage has a RED→GREEN cycle and can land only after all earlier
shared contracts are green. Generated artifacts are regenerated at their
source-producing stage.

## Post-Design Constitution Re-check

PASS for the approved change under Arts. I–XI. Research resolved all local
unknowns. External prerequisites are a signed ephemeral model-lease broker for
a real unattended smoke, npm package existence plus trusted-publisher/
environment configuration for a real publish, and authenticated
repository-admin authority for ruleset application. npm currently requires a
package to exist before trust can be configured, so first public publication
remains explicitly blocked rather than introducing a token exception. All local
interfaces are fixture-tested and fail closed when prerequisites are absent.

The upstream agent-context update helper is not present in `.specify/scripts`;
therefore this plan intentionally does not modify generated/user-owned
`AGENTS.md` or the pre-existing untracked `.agents/` mirror.

## Complexity Tracking

No new constitutional violation. The repository already exposes a root barrel;
removing it here would contradict Art. IX's deprecation window. This feature
deprecates it, freezes/verifies its symbol set, routes every new component
through direct subpaths, and requires at least one intervening MINOR plus a
separate approved MAJOR for removal. This temporary compatibility surface is
the narrowest path that satisfies both Arts. IV and IX. The feature is broad
because the approved contract spans the complete
approval-to-publication chain, but each subsystem is isolated behind a small
versioned contract and no runtime abstraction is introduced.
