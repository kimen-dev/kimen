# Implementation Plan: [FEATURE]

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI (Constitution
     Check below enumerates all of them) and Art. III's definition of done.
     Kept in sync with constitutional amendments (no-drift rule). -->

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]

**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: [e.g., TypeScript 6 strict or NEEDS CLARIFICATION]

**Primary Dependencies**: [e.g., StencilJS, Style Dictionary, Zod (boundary only) or NEEDS CLARIFICATION]

**Storage**: [if applicable, or N/A]

**Testing**: [e.g., Vitest 4 browser mode via @stencil/vitest, Playwright E2E or NEEDS CLARIFICATION]

**Target Platform**: [e.g., evergreen browsers (current + previous Chromium/Firefox/Safari) or NEEDS CLARIFICATION]

**Project Type**: [e.g., component/tokens/catalog/adapter or NEEDS CLARIFICATION]

**Performance Goals**: [named metric + measurement, e.g., bundle ≤ X KB gzipped or NEEDS CLARIFICATION]

**Constraints**: [domain-specific or NEEDS CLARIFICATION]

**Scale/Scope**: [domain-specific or NEEDS CLARIFICATION]

## Constitution Check

*GATE: must pass before Phase 0 research. Re-check after Phase 1 design.
Verdict per article: PASS, N/A (with justification), or VIOLATION (must be
justified in Complexity Tracking or the plan is rejected). The articles live in
`.specify/memory/constitution.md` (the constitution digest).*

Declare, one line per article, what this plan does about it:

- **Art. I — AI-First, one source of truth**: [generated artifacts touched (CEM, catalog, llms.txt, wrappers, AGENTS.md) and their regeneration step; JSDoc completeness on every public API member — an undocumented member is a build failure]
- **Art. II — Specs before code (NON-NEGOTIABLE)**: [the approved `feature.feature` (S-IDs) this plan implements; scenario families covered or N/A-justified; nothing here exceeds the approved scenarios]
- **Art. III — Test-first, deterministic gates (NON-NEGOTIABLE)**: [RED tests planned before implementation; core-logic surface for the mutation gate (≥70% on changed core code); real-browser suite, deterministic tests through public APIs]
- **Art. IV — Web standards & lightness**: [semantic HTML / ARIA-per-APG approach; KB budget impact (single-digit KB gzipped per component); CSS logical properties; new runtime dependency? written KB justification or "none"]
- **Art. V — Accessibility WCAG 2.2 AA + EN 301 549 (NON-NEGOTIABLE)**: [keyboard path, visible focus, contrast, ≥24x24px targets, reduced motion; new interaction pattern? → manual APG walkthrough planned]
- **Art. VI — Closed tokens, layered customization**: [tokens consumed/introduced and their layer (primitive/semantic/component); zero hardcoded visual values; ::part()/slots surface]
- **Art. VII — Simplicity & anti-abstraction**: [simplest design satisfying the approved scenarios; no speculative props or premature generality; duplication before the wrong abstraction]
- **Art. VIII — Neutral catalog, disposable adapters**: [protocol/adapter surface touched; no protocol type leaks into @kimen/elements; guardrail boundary impact (→ standalone scenario approval) or "none"]
- **Art. IX — Public API stability**: [SemVer impact of the API delta (props, events, parts, slots, tokens); deprecations with migration path; packaging correctness]
- **Art. X — Deterministic static analysis (NON-NEGOTIABLE)**: [which existing gates cover the new surface; any finding a rule could produce that currently isn't ruled → add the rule, never leave it to review]
- **Art. XI — Operational security of agents (NON-NEGOTIABLE)**: [how the implement loop is contained (sandboxed, least-privilege, no permission bypass outside a credential-free sandbox); no new credential surface]

**Definition of done (Art. III)**: done is exclusively the deterministic gates
exiting 0 (`bash scripts/gates/gates-suite.sh`: constitution, traceability,
lint, typecheck, build, tests, and per-surface gates). Never self-assessed,
by agent or human.

### Constitutional Surface (echo from spec.md)

<!-- Copy the "Constitutional Surface" section of spec.md here VERBATIM, then
     confirm each declared obligation maps to a concrete part of this plan
     (and later to a task category in tasks.md). A mismatch between the echo
     and spec.md means the plan is stale: regenerate it. -->

- **Public API delta** (Art. IX): [echo]
- **Bundle budget** (Art. IV): [echo]
- **Accessibility** (Art. V): [echo]
- **Tokens** (Art. VI): [echo]
- **Catalog/agent legibility** (Art. I): [echo]
- **Guardrail/security boundary** (Art. VIII): [echo]

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., packages/elements/src/components/ki-name). The delivered
  plan must not include Option labels.
-->

```text
# [REMOVE IF UNUSED] Option 1: Component (DEFAULT for UI work)
packages/elements/src/components/ki-[name]/   # via Nx generator, never by hand
├── ki-[name].tsx
├── ki-[name].css
└── ki-[name].spec.ts                          # carries @spec:[###-feature-name]

# [REMOVE IF UNUSED] Option 2: Tokens / catalog / adapter
packages/tokens/
packages/catalog/
packages/adapter-[protocol]/
```

**Structure Decision**: [Document the selected structure and reference the real
directories captured above]

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., new runtime dependency] | [current need] | [why zero-dependency insufficient] |
| [e.g., speculative prop] | [specific problem] | [why the approved scenarios require it] |
