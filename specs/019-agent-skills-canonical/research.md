# Research: Canonical agent skills

## Decision 1 — Canonical ownership and compatibility

**Decision**: Version all repository-owned skills under `.agents/skills` and
store `.claude/skills` as the exact relative symbolic link
`../.agents/skills`.

**Rationale**: A symlink preserves Claude's conventional path while every
agent and maintainer sees one vendor-neutral source. Relative repository links
survive clone relocation and expose no machine-specific absolute path.

**Alternatives considered**:

- Keep `.claude/skills` canonical: rejected because it remains vendor-first.
- Copy or periodically synchronize directories: rejected because two writable
  owners inevitably drift and violate Art. I.
- Generate the Claude directory during setup: rejected because a fresh clone
  would be incomplete until an implicit local step runs.

## Decision 2 — Conflict resolution during migration

**Decision**: Seed the canonical catalog from the version already committed and
validated on `main` for all eight byte conflicts; preserve the union of all
non-conflicting artifacts and require an explicit founder-approved exception
for any alternative.

**Rationale**: The local `.agents` catalog contains older versions of security,
review and Spec Kit skills. Preferring it blindly would remove validated
hardening. The committed catalog is reproducible and already passed spec 018.

**Alternatives considered**:

- Local `.agents` always wins: rejected due demonstrated regression risk.
- Newest filesystem timestamp wins: rejected because timestamps are not
  provenance or validation evidence.
- Merge textual conflicts automatically: rejected because skill instructions
  are operational policy, not safely mergeable prose.

## Decision 3 — Deterministic validation boundary

**Decision**: Add dependency-free Node logic that inspects filesystem facts and
Git facts supplied by a thin gate CLI. Validate canonical directory type,
compatibility symlink type and exact target, resolved containment, tracked
catalog contents, per-skill entrypoints and canonical guidance.

**Rationale**: Pure validation is deterministic, unit/mutation-testable and
portable across supported macOS/Linux environments. Separating fact collection
from decisions keeps fixtures fast and avoids shell parsing as core logic.

**Alternatives considered**:

- Review-only convention: rejected because Art. X requires a script-decidable
  invariant to be scripted.
- Shell-only validator: rejected because path normalization and structured
  findings are safer and more mutation-testable in existing Node tooling.
- Runtime dependency for link inspection: rejected; the Node standard library
  already exposes all required facts.

## Decision 4 — Spec Kit Claude manifest

**Decision**: Retain `.specify/integrations/claude.manifest.json` as
Claude-compatibility metadata. Its `.claude/skills/...` paths resolve through
the symlink to canonical files. Update repository-owned documentation and
commands to name `.agents/skills` as the editable source.

**Rationale**: Rewriting an upstream integration manifest by hand would make
Spec Kit upgrades drift. Keeping compatibility paths is truthful while the
filesystem has one content owner.

**Alternatives considered**:

- Rewrite manifest paths to `.agents`: rejected because it no longer describes
  the installed Claude integration and may be overwritten upstream.
- Delete the manifest: rejected because it records installed integration
  provenance and hashes.

## Decision 5 — Tool writes through compatibility

**Decision**: Do not add a speculative skill generator. Existing Claude/Spec
Kit writers that create files below `.claude/skills` traverse the directory
symlink and therefore persist bytes under `.agents/skills`; repository-owned
docs and scripts write canonical paths directly. Fixtures prove both cases.

**Rationale**: Nx discovery found only component, component-feature and adapter
generators. A new generator is unnecessary to satisfy the approved scenarios
and would expand surface area without a current user journey.

**Alternatives considered**:

- Add `@kimen/nx-plugin:agent-skill`: rejected as premature abstraction.
- Maintain a post-install copy step: rejected because it recreates drift.

## Decision 6 — Supported environments

**Decision**: Support repository clones on macOS and Linux with Git symbolic
links enabled. Fail closed when a platform materializes `.claude/skills` as a
directory or cannot preserve the link.

**Rationale**: These are the current local and CI environments. Pretending a
copied directory satisfies single-source behavior would weaken the contract.

**Alternatives considered**:

- Windows copy fallback: rejected because it creates a second source of truth.
- Platform-specific junction management: deferred until a supported Windows
  workflow is approved and tested.
