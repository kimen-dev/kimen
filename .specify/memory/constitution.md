<!--
Sync Impact Report
- Version change: 1.4.2 → 2.0.0 (mirrors constitution master v2.0.0)
- Nature: DERIVED ARTIFACT. This file is the operational digest that Spec Kit
  commands load, and the operative governance text of this repository. The
  normative source is the constitution master, maintained by the founder
  outside this repository; on any conflict, the master prevails. This digest
  is regenerated as part of every constitutional amendment (no-drift rule,
  Art. I applied to governance). A version-stamp mismatch against the master
  means this digest is stale and MUST be regenerated before running any
  /speckit.* command.
- Modified principles: Art. II risk-proportionate contracts; Art. III fast PR
  quality plus daily mutation; Art. X deterministic 20/80 automation; workflow
  and incident response simplified.
- Added sections: Technology Standards & Declared Bets; Development Workflow,
  Human Gates & Emergency Procedure
- Removed sections: none
- Templates requiring updates:
  ✅ resolved: plan-template.md via .specify/templates/overrides/plan-template.md
    (risk-focused Constitution Check and fast quality definition of done)
  ✅ resolved: spec-template.md via .specify/templates/overrides/spec-template.md
    (mandatory Gherkin section with stable S-IDs and the five scenario
    families table for UI components, Art. II)
  ✅ resolved: tasks-template.md via .specify/templates/overrides/tasks-template.md
    (RED→GREEN→quality structure without per-PR mutation tasks)
- Follow-up TODOs: none
-->

# Kimen Constitution

Kimen is an open-source, AI-First generative UI component library: StencilJS
web components, a neutral schema-constrained catalog, and disposable protocol
adapters (A2UI, MCP Apps, AG-UI, json-render). It is built and run as a
one-person, AI-First operation: agents do most implementation; a single
founder is the only human reviewer. Automated gates substitute for a team and
form a small, risk-focused quality core. Controls stay only while their signal
justifies their runtime and maintenance; the founder's attention is spent only
where leverage is highest.

**Normative source**: the constitution master (v2.0.0), maintained by the
founder outside this repository. This digest is the operative in-repo text:
Spec Kit commands load it, gates check it, and contributions are reviewed
against it. Full rationales and the amendment log live in the master, which
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

### II. Proportionate Behavior Contracts (NON-NEGOTIABLE)
New public component behavior, a public API change, a new interaction pattern,
or a guardrail/security-boundary change requires a concise Gherkin `.feature`
before implementation. UI components retain the five scenario families and
existing contracts retain traceability. Bug fixes need a failing regression
test, not a new spec; refactors, dependency/tooling work, docs and low-risk
maintenance need no Spec Kit artifacts. The founder approves intent in the
working conversation or PR; repository hash markers never substitute for that
judgment. Plans, checklists and task documents are optional complexity tools.

### III. Test-First and Deterministic Gates (NON-NEGOTIABLE)
Bug fixes start with a failing test. Pure logic is built TDD (red → green →
refactor). An ordinary PR is ready when one fast quality workflow exits 0:
format, lint, strict typecheck, build, focused unit/component tests, Chromium
browser tests, accessibility and relevant API/token/budget checks. Release
verification adds packaging and the three-browser matrix. Coverage is
diagnostic. Mutation runs once daily over core logic changed in the preceding
24 hours, never in the ordinary PR or local completion path; a score below 70%
blocks release and creates focused test work. Tests remain deterministic and
assert behavior through public APIs. LLM live evals stay scheduled and
non-blocking.

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

### X. Deterministic 20/80 Automation (NON-NEGOTIABLE)
Automation is selected by risk, signal and maintenance cost. The PR-blocking
core stays small: format, lint/static accessibility, strict typecheck, module
boundaries, build, tests and public API/token integrity. One consolidated
quality result is required on `main`. Containment runs only for sandbox
changes, dependency review only for dependency changes, mutation daily, and
broad SAST/secret/CVE scans on the protected branch and weekly. Security stays
layered without duplicating tools for appearances. Required gates are
deterministic, reproducible and fast enough to run once; flaky, redundant or
chronically low-signal gates are simplified or removed. Releases use trusted
publishing with signed provenance and hardened, least-privilege CI.

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

Default path: clarify → add a concise contract only when Art. II requires it →
implement with appropriate tests → run the fast quality workflow → founder
merge. Spec Kit planning/checklist/task stages are optional and used only when
they materially reduce uncertainty. Clean-context review is one optional,
non-blocking pass for large diffs, public API/security boundaries or unfamiliar
interaction patterns. It reads the PR diff, relevant contract and test results
directly: no packet hashes, attestations, Check Run App or review rounds.
Confirmed Critical defects are fixed; suggestions go to the backlog. UI changes
include rendered evidence when visual behavior matters. Single writer per
feature; parallel work only across independent worktrees.

The founder may override a failing non-security check for an urgent fix with a
brief PR note; repeated overrides mean the check is fixed or removed. Broken
releases roll forward. Every escaped defect gets a focused regression test; a
new repository-wide gate is added only for a repeated or high-impact defect
class whose ongoing cost is lower than the failures it prevents. Vulnerability
reports follow coordinated disclosure per SECURITY.md.

## Governance

This constitution supersedes all other practices and agent instructions;
skills (`gherkin-use-cases`, `frontend-best-practices`, `frontend-qa`) are its
executable elaboration and never drift: an amendment that changes guidance a
skill elaborates updates that skill in the same change. Amendments: the
founder amends the constitution master and regenerates this digest in the
same change (plus any artifacts the amendment makes stale), with written
rationale and migration notes.
Versioning: MAJOR = principle removed/redefined, MINOR = principle added,
PATCH = clarification. Two version lines must never be confused: this
constitution's version and the library's public API SemVer. The founder's merge
decision verifies compliance. Complexity must always justify itself.

**Version**: 2.0.0 | **Ratified**: 2026-06-12 | **Last Amended**: 2026-07-13
