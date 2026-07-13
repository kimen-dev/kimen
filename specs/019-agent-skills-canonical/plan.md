# Implementation Plan: Canonical agent skills

<!-- KIMEN OVERRIDE of plan-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Articles I-XI. -->

**Branch**: `spec/019-agent-skills-canonical` | **Date**: 2026-07-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/019-agent-skills-canonical/spec.md`

## Summary

Move the validated 27-skill catalog from the Claude-specific directory to the
versioned vendor-neutral `.agents/skills` source, replace `.claude/skills` with
the exact relative symlink `../.agents/skills`, and add dependency-free
validation that rejects copies, broken/unsafe targets, untracked canonical
content, stale guidance and vendor-path references in repository tooling. Seed
all eight current conflicts from the validated `main` versions before
`.agents/skills` becomes the sole editable source, and bind the candidate and
migrated summaries to closed transformations that remain verifiable after a
squash.

## Technical Context

**Language/Version**: Node.js ESM on the repository's pinned Node 22 baseline;
POSIX shell only for existing gate orchestration.

**Primary Dependencies**: Node standard library and Git CLI already required by
the repository; no new package or runtime dependency.

**Storage**: Versioned repository files and one Git symbolic-link entry; no
database or external service.

**Testing**: Node test runner for deterministic fixture and real-repository
tests, existing traceability/infra gates, Stryker node mutation for pure
validation logic, and the full Kimen gate suite.

**Target Platform**: Fresh Git clones on supported macOS and Linux development
and CI environments with symbolic links enabled.

**Project Type**: Repository governance and agent-discovery surface.

**Performance Goals**: Validate the 27-skill catalog in under one second on a
warm local filesystem; zero browser/runtime bundle impact.

**Constraints**: Exact relative link target `../.agents/skills`; no independent
`.claude/skills` directory; preserve all nested artifacts and license notices;
keep `.specify/integrations/claude.manifest.json` compatible; no hand-edited
generated package surfaces.

**Scale/Scope**: 27 skill directories, eight current conflicting paths, one
canonical root, one compatibility link, repository guidance and deterministic
gate integration.

## Constitution Check

- **Art. I — AI-First, one source of truth**: PASS. The feature removes the
  duplicated vendor-specific source, makes `.agents/skills` canonical and
  updates agent guidance/notices to advertise that source. No CEM, catalog,
  wrapper or package-generated surface changes.
- **Art. II — Specs before code (NON-NEGOTIABLE)**: PASS. Approved S1–S9 and
  current dual-hash marker v2 govern the implementation; UI scenario families
  are N/A with written justification.
- **Art. III — Test-first, deterministic gates (NON-NEGOTIABLE)**: PASS. RED
  fixture tests precede migration/validator code; S1–S9 are traceable in Node
  tests; pure validation logic is in the node mutation scope and must meet the
  70% threshold; full gates close the work.
- **Art. IV — Web standards & lightness**: N/A/PASS. No browser component,
  runtime dependency or bundle delta.
- **Art. V — Accessibility WCAG 2.2 AA + EN 301 549 (NON-NEGOTIABLE)**: N/A.
  No interactive or visual surface.
- **Art. VI — Closed tokens, layered customization**: N/A. No CSS or token
  changes.
- **Art. VII — Simplicity & anti-abstraction**: PASS. One canonical directory,
  one native relative symlink and one small validator are the minimum design;
  no sync daemon or copied mirror is introduced.
- **Art. VIII — Neutral catalog, disposable adapters**: N/A/PASS. No GenUI
  catalog or protocol adapter changes. The repository path boundary is covered
  by explicitly approved S4 and S6.
- **Art. IX — Public API stability**: PASS. No npm public API or SemVer delta.
- **Art. X — Deterministic static analysis (NON-NEGOTIABLE)**: PASS. A new
  fail-closed agent-skill gate owns link type/target, containment, tracking,
  catalog shape and guidance invariants and is wired into gates-core.
- **Art. XI — Operational security of agents (NON-NEGOTIABLE)**: PASS. Relative
  target containment is validated without credentials or network access; no
  authority surface is added. Implementation runs in the isolated feature
  worktree with normal sandbox permissions.

**Definition of done (Art. III)**: done is exclusively
`bash scripts/gates/gates-suite.sh` exiting 0, including traceability, infra,
mutation and all existing gates.

### Constitutional Surface (echo from spec.md)

- **Public API delta** (Art. IX): none; repository agent discovery only, with
  no npm package or component API change.
- **Bundle budget** (Art. IV): none; no runtime dependency or shipped browser
  code.
- **Accessibility** (Art. V): not applicable; no interactive or visual UI.
- **Tokens** (Art. VI): none.
- **Catalog/agent legibility** (Art. I): directly affected. Agent guidance must
  advertise one vendor-neutral canonical skill catalog and its compatibility
  view without drift.
- **Guardrail/security boundary** (Arts. VIII, X and XI): repository links and
  skill-loading paths must stay inside the repository and fail closed on
  duplication, escape, cycles or breakage. S4 and S6 require standalone
  founder attention.

Each obligation maps to the migration inventory, topology contract, RED tests,
agent-skill gate, guidance updates and final full-gate task categories.

## Project Structure

### Documentation (this feature)

```text
specs/019-agent-skills-canonical/
├── .approved
├── spec.md
├── feature.feature
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/
│   └── requirements.md
├── contracts/
│   ├── agent-skill-topology-v1.md
│   └── migration-inventory-v1.md
└── tasks.md
```

### Source Code (repository root)

```text
.agents/
└── skills/                         # canonical versioned catalog (27 skills)

.claude/
└── skills -> ../.agents/skills     # compatibility-only Git symlink

scripts/
├── gates/
│   ├── check-agent-skills.mjs      # deterministic CLI gate
│   └── gates-core.sh               # gate integration
├── lib/
│   └── agent-skill-catalog.mjs     # pure validation and inventory logic
├── tests/
│   └── agent-skills.test.mjs       # S1–S9 fixtures + real repository
└── mutation-tests/
    └── agent-skill-catalog.spec.mjs

AGENTS.md
CLAUDE.md
NOTICE
.specify/extensions.yml
.specify/integrations/claude.manifest.json  # retained as compatibility metadata
```

**Structure Decision**: repository-owned skill bytes live only under
`.agents/skills`; `.claude/skills` is a Git symlink, not a generated copy. Pure
validation lives under `scripts/lib` so mutation testing can exercise it;
gate orchestration remains a thin CLI and gates-core entry.

## Phase 0 Research Decisions

See [research.md](research.md). All technical unknowns are resolved; no
`NEEDS CLARIFICATION` remains.

## Phase 1 Design

- [data-model.md](data-model.md) defines catalog, artifact, compatibility view,
  inventory and validation finding states.
- [agent-skill-topology-v1.md](contracts/agent-skill-topology-v1.md) defines the
  exact paths, link target and stable failure codes.
- [migration-inventory-v1.md](contracts/migration-inventory-v1.md) accounts for
  the 27 skills and eight conflict decisions.
- [quickstart.md](quickstart.md) defines clean-clone, negative fixture,
  traceability, mutation and full-gate evidence.

## Post-Design Constitution Re-check

PASS for Articles I–XI with the same verdicts above. The design adds no
dependency, package API, browser behavior, credential, speculative generator
or copied mirror. S4/S6 path-security behavior remains exactly within the
founder-approved contract.

## Complexity Tracking

No constitutional violations or complexity exceptions.
