<!--
Sync Impact Report
- Version change: template (unfilled) → 1.4.2 (mirrors /kimen-constitution.md v1.4.2)
- Nature: DERIVED ARTIFACT. This file is the operational digest that Spec Kit
  commands load. The normative source is /kimen-constitution.md at the repo
  root. On any conflict, the root document prevails. This digest is
  regenerated as part of every constitutional amendment (no-drift rule,
  Art. I applied to governance). A version-stamp mismatch between this file
  and the root document means this digest is stale and MUST be regenerated
  before running any /speckit.* command.
- Modified principles: all placeholders filled (11 principles, Articles I-XI)
- Added sections: Technology Standards & Declared Bets; Development Workflow,
  Human Gates & Emergency Procedure
- Removed sections: none
- Templates requiring updates:
  ⚠ pending: .specify/templates/plan-template.md (Constitution Check section
    should reference the 11 articles and the deterministic-gates definition
    of done)
  ⚠ pending: .specify/templates/spec-template.md (must require the five
    Gherkin scenario families for UI components, Art. II)
  ⚠ pending: .specify/templates/tasks-template.md (task categories should
    include: failing-test-first, a11y walkthrough, catalog/manifest
    regeneration, budget check)
- Follow-up TODOs: none
-->

# Kimen Constitution

Kimen is an open-source, AI-First generative UI component library: StencilJS
web components, a neutral schema-constrained catalog, and disposable protocol
adapters (A2UI, MCP Apps, AG-UI, json-render). It is built and run as a
one-person, AI-First operation: agents do most implementation; a single
founder is the only human reviewer. Automated gates substitute for a team and
are therefore strict and non-negotiable; the founder's attention is the
scarcest resource and is spent only where leverage is highest.

**Normative source**: `/kimen-constitution.md` (v1.4.2). This digest exists so
Spec Kit commands can perform constitution checks efficiently; the full
articles, rationales and amendment log live in the root document, which
prevails on any conflict.

## Core Principles

### I. AI-First: One Source of Truth
The component contract (TypeScript types + JSDoc) is the single source of
truth. Manifests (docs-json → Custom Elements Manifest), the Zod catalog,
docs, llms.txt and AGENTS.md are GENERATED from it, never hand-maintained.
An undocumented public API member is a build failure. Agent legibility is a
deliverable: every component ships machine-readable when-to-use/when-NOT-to-use
metadata; an API a capable agent cannot wire correctly from its description
alone is a defect. Generated artifacts are committed and diffable.

### II. Specs Before Code (NON-NEGOTIABLE)
New behavior requires an approved Gherkin `.feature` BEFORE implementation:
declarative, business-language scenarios with stable IDs (S1..Sn), one `When`
per scenario, observable outcomes only. UI components cover five scenario
families minimum: core behavior, keyboard path, assistive-tech outcome, form
participation (when applicable), theming. Scenario-to-test traceability is a
CI gate. Escape hatch: typos, dependency bumps, mechanical refactors and docs
need no scenario, but if behavior changes, a scenario exists first.

### III. Test-First and Deterministic Gates (NON-NEGOTIABLE)
Bug fixes start with a failing test. Pure logic is built TDD (red → green →
refactor). "Done" is defined exclusively by gates exiting 0: static analysis
(Art. X), TS-strict typecheck, full suite in a REAL browser (never jsdom-only;
engine matrix per Art. IV), traceability, mutation score ≥70% on changed core
code (Stryker incremental), axe zero violations, bundle budgets. Agent or
human self-assessment never closes work. Coverage is a diagnostic, never a
gate; mutation score IS the gate. Tests are deterministic and assert behavior
through public APIs. LLM output is tested by contract: schema validation
deterministically in CI, golden specs with structural comparison, live evals
scheduled and never merge-blocking; an eval below threshold auto-opens a
prioritized issue for the founder.

### IV. Web Standards and Lightness
Standard web components (Stencil) with generated framework wrappers. Semantic
HTML first; no ARIA is better than wrong ARIA; ARIA only per complete APG
pattern. Baseline: current + previous stable Chromium, Firefox, Safari,
verified (PR gate on Chromium; all three engines at pre-release; dropping an
engine is MAJOR). Direction- and language-agnostic by construction: CSS
logical properties only (lint-enforced), no hardcoded user-visible strings,
default accessible labels are overridable props, RTL showcase in CI.
Per-component budget: single-digit KB gzipped; no barrel files; no runtime
dependency without written KB justification. Form components use
ElementInternals (`formAssociated`); Reference Target is never load-bearing.
Performance work names its metric and measurement before changing code.

### V. Accessibility: WCAG 2.2 AA and EN 301 549 (NON-NEGOTIABLE)
Normative target: WCAG 2.2 AA plus EN 301 549 (EAA harmonized standard).
WCAG 3.0 is tracked, not targeted. Full keyboard operability with visible
focus; contrast ≥4.5:1 text / 3:1 UI; pointer targets ≥24x24px; focus never
fully obscured; `prefers-reduced-motion` respected. axe-core in CI is the
floor, not the proof: new interaction patterns get a manual APG walkthrough
documented in the PR.

### VI. Closed Tokens, Layered Customization
Zero hardcoded visual values, enforced against the token allowlist: every
visual value resolves from a design token (primitive → semantic → component).
Customization surface, in order: tokens, then `::part()`, then slots; if a
consumer would need `!important`, fix the API. Mars is the default theme
(the founder's brand), never a requirement: reassigning the semantic token
layer alone restyles every component, proven in CI by a reference second
theme. Container queries over viewport queries inside components.

### VII. Simplicity and Anti-Abstraction
Duplication is cheaper than the wrong abstraction: extract on the third
occurrence. A web component must earn its registration with real behavior or
encapsulated complexity. The simplest design that satisfies the approved
scenarios wins; speculative props and "we might need it" code are rejected.

### VIII. Neutral Catalog, Disposable Adapters
The component contract and neutral catalog are the durable assets; GenUI
protocols are volatile and live behind isolated adapters. No protocol type
leaks into `@kimen/elements`. Each adapter declares the protocol versions it
supports in a compatibility matrix; a protocol's breaking release is absorbed
inside its adapter, never in core. The declarative pattern (schema-constrained
spec rendered from the catalog) is preferred over open HTML surfaces.
Guardrails are tested as a security boundary: only catalog components render,
only declared actions dispatch, unknown props are rejected, no code-execution
path exists from spec data. WebMCP is tracked; no core API is shaped around
it before it stabilizes.

### IX. Public API Stability
The public API carries its own SemVer, distinct from this constitution's
version; catalog and llms.txt are versioned alongside it. Breaking changes
land only on MAJOR (including removed/renamed props, events, parts, slots,
tokens, and browser-baseline reductions). Deprecations ship ≥1 MINOR before
removal, with migration docs and codemods where feasible. Support policy:
only the latest MAJOR receives fixes and security patches. Packaging
correctness is validated mechanically before publish.

### X. Deterministic Static Analysis (NON-NEGOTIABLE)
Everything a script can decide is decided by a script, never by an agent or
reviewer. The deterministic layer runs before tests and review and blocks
merge: format, lint (type-aware, Stencil rules, static a11y), typecheck,
module boundaries, dead code, packaging, security suite (SAST, dependency CVE
and malicious-package scanning, secret scanning). Style is formatted, not
reviewed. Releases use trusted publishing (OIDC, signed provenance); CI is
hardened (SHA-pinned actions, least privilege, egress control). Every gate is
deterministic and reproducible; a flaky gate is a bug fixed before it is
trusted.

### XI. Operational Security of Agents (NON-NEGOTIABLE)
Article X governs what agents produce; this article governs how agents are
contained. Unattended loops run in sandboxed, disposable environments with
least-privilege credentials: no production tokens, no publishing rights, no
long-lived secrets readable by the agent. Permission-bypass execution is
forbidden outside a credential-free sandbox. Publishing credentials exist
only as short-lived OIDC inside CI. Agent-environment egress is restricted to
declared registries and endpoints.

## Technology Standards & Declared Bets

TypeScript strict on TS 6 (tsc authoritative; tsgo only as optional
accelerator) · StencilJS · Zod at the guardrail/GenUI boundary only ·
Style Dictionary v5 with DTCG 2025.10 (no reliance on features Style
Dictionary does not implement) · Vitest 4 browser mode via `@stencil/vitest`
(Playwright provider) · Playwright E2E · Stryker + fast-check · axe-core ·
size-limit · pnpm + Nx (zero dependency on Nx Cloud). Packages:
`@kimen/tokens`, `@kimen/elements`, `@kimen/catalog`, `@kimen/adapter-*`,
generated wrappers (`@kimen/react`, ...). Components are scaffolded from Nx
generators, never by hand. Replacing a pillar (compiler, token system, test
runner, monorepo tooling) is a constitutional amendment with a written bet;
declared bets and their tripwires (Stencil → Lit exit path; Nx Cloud trigger;
client-side v1 with SSR/DSD deferred) live in the root document. License:
Apache-2.0. External contributions pass the same gates, with DCO sign-off.

## Development Workflow, Human Gates & Emergency Procedure

Per feature: `/speckit.specify` → `/speckit.clarify` → Gherkin `.feature`
(founder approval — human gate 1) → `/speckit.plan` → `/speckit.checklist` →
`/speckit.tasks` → `/speckit.analyze` → `/speckit.implement` under the
onmars-spec loop contract (sandboxed per Art. XI; anchors re-read each
iteration; termination only by gates) → `/speckit.converge` → clean-context
agent review (diff + spec + feature + rendered screenshots for UI changes;
different model vendor preferred; max 2 rounds) → merge (founder — human
gate 2). Single writer per feature; parallel work only across independent
worktrees. Spec and Gherkin phases are never looped.

Emergency: a blocking gate may be waived only by the founder, per PR, with
written justification and an issue restoring the gate; the same gate waived
twice consecutively triggers a fix or an amendment. Broken releases roll
forward (deprecate, patch, post-mortem within a week). Every incident
produces at least one new deterministic gate or test that would have caught
it. Vulnerability reports follow coordinated disclosure per SECURITY.md.

## Governance

This constitution supersedes all other practices and agent instructions;
skills (`gherkin-use-cases`, `frontend-best-practices`, `frontend-qa`) are its
executable elaboration and never drift: an amendment that changes guidance a
skill elaborates updates that skill in the same change. Amendments: a PR
touching `/kimen-constitution.md` (plus any artifacts it makes stale,
including this digest), written rationale, migration notes, founder approval.
Versioning: MAJOR = principle removed/redefined, MINOR = principle added,
PATCH = clarification. Two version lines must never be confused: this
constitution's version and the library's public API SemVer. Every PR review
verifies compliance; deviations are justified in the PR description or
rejected. Complexity must always justify itself.

**Version**: 1.4.2 | **Ratified**: 2026-06-12 | **Last Amended**: 2026-07-04
