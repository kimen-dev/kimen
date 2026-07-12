# Feature Specification: Canonical agent skills

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Arts. I–III, VII, X and XI. -->

**Feature Branch**: `spec/019-agent-skills-canonical`

**Created**: 2026-07-12

**Status**: Draft — requires founder approval of the synchronized specification
and Gherkin contract before planning or implementation.

**Input**: User description: "Make `.agents/skills` the primary, intuitive,
versioned home for repository agent skills. `.claude/skills` should be a
compatibility link to that canonical catalog so Claude and non-Claude agents
see the same skills without duplicated copies."

**Constitution check**: this spec is not approvable until the Gherkin section
below is approved verbatim. Behavior enters the system exactly once here
(Art. II). S4 and S6 exercise a repository trust boundary and require explicit
standalone founder attention.

## Design-source analysis

Not applicable. This feature changes repository agent-discovery and governance
surfaces, not visual components. The governing sources are the constitution,
the committed skill catalog and the observable behavior of a fresh clone.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Any agent discovers the canonical skills (Priority: P1)

As a contributor using any capable coding agent, I can find every repository
skill in one vendor-neutral location without knowing Claude-specific
conventions.

**Why this priority**: agent legibility is a product requirement in an
AI-first repository; a vendor-specific source of truth excludes other agents
and encourages divergent copies.

**Independent Test**: clone the repository into a clean directory and verify
that every versioned skill is discoverable through the canonical agent catalog
without consulting a vendor-specific path.

**Acceptance Scenarios**: S1 and S7.

---

### User Story 2 - Claude remains fully compatible (Priority: P1)

As a Claude user, I continue to discover the same skills through Claude's
conventional repository path, while maintainers edit only one catalog.

**Why this priority**: vendor neutrality must not break the existing Claude
workflow or create a second source of truth.

**Independent Test**: resolve both discovery paths in a clean clone and prove
that every skill name and byte is shared, with no independent writable copy.

**Acceptance Scenarios**: S2 and S3.

---

### User Story 3 - Migration preserves validated knowledge (Priority: P1)

As the founder, I can migrate the existing catalogs without silently losing a
skill, helper script, reference, license notice or Kimen-specific hardening.

**Why this priority**: the current catalogs contain 27 skills and eight file
conflicts; blindly preferring the older local catalog would regress validated
security and review behavior.

**Independent Test**: inventory both pre-migration catalogs, execute the
migration and account for every source path and every conflict in the final
canonical catalog.

**Acceptance Scenarios**: S5.

---

### User Story 4 - Deterministic gates prevent future drift (Priority: P2)

As a maintainer, I receive a precise gate failure if the compatibility view is
copied, broken, cyclic, redirected outside the repository or if tooling writes
new skills to a vendor-specific location.

**Why this priority**: a one-time migration without an invariant would drift
back into multiple sources of truth.

**Independent Test**: exercise fixtures for an independent copy, a broken
target, an escaping target and a vendor-specific write; each must fail with a
specific remediation.

**Acceptance Scenarios**: S4, S6, S8 and S9.

### Edge Cases

- A skill exists in only one pre-migration catalog.
- The same relative path exists in both catalogs with different bytes.
- A nested helper, asset, reference or license exists without its own
  `SKILL.md`.
- The compatibility path is a real directory containing byte-identical files;
  it still violates the single-source invariant.
- The compatibility target is absolute, broken, cyclic or resolves outside
  the repository.
- A fresh clone is created on a supported environment that preserves
  repository links but has no prior local skill installation.
- A tool attempts to install or update a repository-owned skill through the
  compatibility path.
- `.claude` contains unrelated vendor configuration; only its skill view may
  be replaced.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Repository skills have one vendor-neutral source of truth
  Every supported coding agent discovers the same versioned skills while
  vendor compatibility remains available without duplicated content.

  Rule: Skills are discoverable without vendor knowledge

    # S1
    Scenario: A generic agent discovers every repository skill canonically
      Given a fresh clone contains the versioned repository skill catalog
      When a generic coding agent discovers repository-owned skills
      Then every skill is available from the vendor-neutral agent catalog
      And no vendor-specific directory is required for discovery

    # S2
    Scenario: Claude discovers the canonical skill catalog through its conventional path
      Given a fresh clone contains the canonical repository skill catalog
      When Claude discovers repository-owned skills through its conventional path
      Then Claude sees the same skill names and content as a generic agent
      And no second writable skill copy exists

    # S3
    Scenario: One canonical edit reaches every supported agent
      Given a repository skill is available to generic agents and Claude
      When a maintainer updates that skill in the canonical catalog
      Then both discovery paths expose the updated bytes
      And no vendor-specific copy requires an edit

  Rule: Migration preserves validated repository knowledge

    # S4
    Scenario: A copied compatibility catalog fails the single-source invariant
      Given the vendor compatibility path is an independent directory
      When deterministic agent-surface validation evaluates the repository
      Then validation fails before merge
      And the report identifies the compatibility path as a duplicate source

    # S5
    Scenario: Migration accounts for every existing skill artifact
      Given the existing catalogs contain shared unique and conflicting skill files
      When the catalogs are migrated to one canonical source
      Then every skill helper reference asset and license is accounted for
      And each conflict retains the currently validated committed behavior unless explicitly approved otherwise

  Rule: The compatibility boundary fails closed

    # S6
    Scenario Outline: An unsafe compatibility target is rejected
      Given the vendor compatibility path is <condition>
      When deterministic agent-surface validation evaluates the repository
      Then validation fails and reports <reason>

      Examples:
        | condition                              | reason                    |
        | missing                                | missing compatibility     |
        | a broken link                          | unresolved target          |
        | a link outside the repository          | escaping target            |
        | part of a link cycle                   | cyclic target              |
        | linked to a non-canonical skill folder | incorrect canonical target |

    # S7
    Scenario: A fresh clone exposes both supported discovery paths
      Given no user-level skill installation exists
      When a contributor clones the repository on a supported environment
      Then generic agents and Claude resolve every versioned repository skill
      And neither discovery path is broken

  Rule: Future tooling respects the canonical catalog

    # S8
    Scenario: Repository tooling writes new skills only to the canonical catalog
      Given repository tooling is asked to add a repository-owned skill
      When the tool persists the new skill
      Then the skill is versioned in the vendor-neutral catalog
      And Claude discovers it without a vendor-specific copy

    # S9
    Scenario: Repository guidance names the canonical and compatibility roles
      Given an agent reads the repository's generated operating guidance
      When the agent looks for the skill source of truth
      Then the vendor-neutral catalog is identified as canonical
      And the Claude path is identified only as a compatibility view
```

### Scenario Family Coverage

This is a repository-governance feature, not a UI component. The five UI
scenario families are not applicable.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1–S9 | Repository discovery, migration and validation behavior is covered directly. |
| Keyboard path | — | No interactive UI or pointer behavior. |
| Assistive-tech outcome | — | No rendered accessibility tree. |
| Form participation | — | No form control. |
| Theming | — | No visual surface or tokens. |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The repository MUST version one vendor-neutral canonical skill
  catalog at `.agents/skills`.
- **FR-002**: `.claude/skills` MUST be a versioned relative symbolic link with
  the exact target `../.agents/skills` and MUST NOT remain an independent
  directory or copied catalog.
- **FR-003**: Both paths MUST expose the same skill names and bytes from a
  fresh clone without a user-level installation.
- **FR-004**: The initial migration MUST preserve the union of all skills,
  nested helpers, references, assets and license notices present in either
  pre-migration catalog.
- **FR-005**: For the eight currently conflicting paths, the version already
  committed and validated on `main` MUST seed the canonical catalog unless the
  founder explicitly approves a documented exception.
- **FR-006**: Migration evidence MUST account for every pre-migration path and
  record the resolution of every byte conflict.
- **FR-007**: Deterministic validation MUST reject a missing, broken, cyclic,
  absolute, escaping or incorrectly targeted compatibility view.
- **FR-008**: Deterministic validation MUST reject `.claude/skills` when it is
  an independent directory even if its contents are currently identical.
- **FR-009**: Repository tooling that creates or updates repository-owned
  skills MUST write only through the canonical catalog.
- **FR-010**: Repository operating guidance MUST identify `.agents/skills` as
  canonical and `.claude/skills` as compatibility-only.
- **FR-011**: The repository MUST NOT ignore `.agents/skills`; additions,
  removals and modifications MUST remain visible to version control and
  review.
- **FR-012**: The migration MUST leave unrelated `.claude` configuration and
  repository surfaces unchanged.
- **FR-013**: A clean-clone verification MUST prove both discovery paths on the
  supported local and CI environments.
- **FR-014**: Validation failures MUST name the violated path, invariant and
  expected canonical target.
- **FR-015**: The change MUST introduce no runtime package dependency and MUST
  not alter the public npm package surface.

### Key Entities

- **Canonical skill catalog**: the versioned, vendor-neutral source containing
  every repository-owned skill and its complete nested resources.
- **Compatibility view**: a vendor-conventional discovery path that resolves
  the canonical catalog without owning independent content.
- **Skill artifact**: any skill definition, helper, reference, asset, template
  or license notice below a skill directory.
- **Migration inventory**: the complete mapping from both pre-migration
  catalogs to the final canonical paths, including conflict decisions.
- **Agent-surface invariant**: the deterministic rule that proves one source
  of truth and safe in-repository compatibility resolution.

## Constitutional Surface *(mandatory)*

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

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the 27 current skills are discoverable through both
  supported paths in a fresh clone.
- **SC-002**: 100% of skill artifacts have exactly one versioned content owner;
  the number of independent vendor-specific skill copies is zero.
- **SC-003**: All eight current byte conflicts have an explicit, auditable
  migration resolution and retain validated behavior.
- **SC-004**: Every unsafe compatibility fixture in S4 and S6 is rejected with
  a specific reason before merge.
- **SC-005**: Adding or updating one canonical skill requires one content edit
  and becomes visible through both discovery paths.
- **SC-006**: Clean-clone verification reports zero missing skills, broken
  paths, escaping targets or unaccounted migration artifacts.
- **SC-007**: Existing deterministic gates remain green and no public package
  or runtime bundle changes.

## Assumptions

- The final committed `.claude/skills` catalog on `main` is the validated
  migration seed for conflicting files; the local `.agents/skills` catalog is
  older in those eight paths.
- The current 27 skill directory names are the intended initial catalog; skill
  retirement or addition is out of scope unless separately approved.
- Supported repository environments preserve versioned relative links. Any
  platform that materializes links as copied files is unsupported until it can
  satisfy the single-source invariant.
- `.agents/skills` is repository source, not disposable tool cache.
- Deleting stale remote branches and cleaning the old local checkout are
  operational follow-ups, not part of this feature's behavior.
