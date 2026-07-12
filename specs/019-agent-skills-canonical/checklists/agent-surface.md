# Agent-Surface Requirements Checklist: Canonical agent skills

**Purpose**: Unit-test the completeness, clarity, consistency and security of
the canonical-skill requirements before tasks and implementation

**Created**: 2026-07-12

**Feature**: [spec.md](../spec.md)

**Audience/timing**: formal author/reviewer checklist before tasks and again
before clean-context review.

## Requirement Completeness

- [x] CHK001 Are the canonical path, compatibility path, exact relative target and ownership roles all specified? [Completeness, Spec §FR-001–FR-003]
- [x] CHK002 Are all artifact classes—entrypoints, helpers, references, assets, templates and license notices—covered by migration requirements? [Completeness, Spec §FR-004, Data Model §SkillArtifact]
- [x] CHK003 Are every current catalog count and conflict class represented, including the 27 skills and eight byte conflicts? [Completeness, Spec §FR-005–FR-006, Contract migration-inventory-v1]
- [x] CHK004 Are requirements present for missing, copied, broken, absolute, escaping, cyclic and wrong-target compatibility states? [Completeness, Spec §FR-007–FR-008, S4/S6]
- [x] CHK005 Are future repository-tool writes and vendor-tool writes both covered without requiring a second catalog? [Completeness, Spec §FR-009, S8, Research §5]
- [x] CHK006 Are all guidance/provenance surfaces that currently name `.claude/skills` included in the migration scope? [Completeness, Spec §FR-010, Plan §Project Structure]
- [x] CHK007 Are tracking, ignore visibility, clean-clone and supported-environment requirements stated? [Completeness, Spec §FR-011–FR-013]

## Requirement Clarity

- [x] CHK008 Is “canonical” defined as the sole real versioned directory rather than merely the preferred documentation path? [Clarity, Spec §FR-001–FR-002]
- [x] CHK009 Is the symbolic-link target exact enough to reject equivalent-looking absolute or alternate relative spellings? [Clarity, Spec §FR-002, Contract topology v1]
- [x] CHK010 Is “validated committed behavior” tied to `main` and distinguished from local timestamps or older `.agents` bytes? [Clarity, Spec §FR-005, Research §2]
- [x] CHK011 Is an “independent copy” unambiguously invalid even when every byte currently matches? [Clarity, S4, Spec Edge Cases]
- [x] CHK012 Are validation findings required to identify code, path, expected invariant, observed fact and remediation? [Clarity, Spec §FR-014, Data Model §ValidationFinding]
- [x] CHK013 Is the supported-platform assumption bounded to link-preserving macOS/Linux clones rather than claiming unspecified Windows behavior? [Clarity, Spec Assumptions, Research §6]

## Requirement Consistency

- [x] CHK014 Does retaining Claude integration metadata remain consistent with `.agents/skills` being the sole content owner? [Consistency, Research §4, Spec §FR-001–FR-003]
- [x] CHK015 Do S2/S3 compatibility outcomes align with S4’s prohibition on a writable vendor copy? [Consistency, S2–S4]
- [x] CHK016 Does the migration seed policy preserve spec 018 hardening while transferring all future ownership to `.agents/skills`? [Consistency, Spec §FR-005, Contract migration-inventory-v1]
- [x] CHK017 Are the no-runtime/no-public-API promises consistent across spec, plan and success criteria? [Consistency, Spec §FR-015/Constitutional Surface, Plan §Technical Context]

## Acceptance Criteria Quality

- [x] CHK018 Can skill parity be objectively decided by exact names, bytes, counts and link facts? [Measurability, Spec §SC-001–SC-003]
- [x] CHK019 Can every unsafe compatibility condition be mapped to one stable finding code? [Acceptance Criteria, S4/S6, Contract topology v1]
- [x] CHK020 Is one-edit propagation measurable without relying on a manual synchronization step? [Measurability, S3/S8, Spec §SC-005]
- [x] CHK021 Does clean-clone success require zero missing, broken, escaping and unaccounted artifacts? [Acceptance Criteria, Spec §SC-006]

## Exception, Recovery and Edge-Case Coverage

- [x] CHK022 Are migration conflicts prohibited from silent auto-merge and given an explicit founder-exception path? [Recovery, Spec §FR-005–FR-006]
- [x] CHK023 Is unrelated `.claude` configuration explicitly preserved when only its skills child changes? [Edge Case, Spec §FR-012]
- [x] CHK024 Are new unexpected conflicts or omissions required to stop implementation rather than expanding scope implicitly? [Coverage, Contract migration-inventory-v1]
- [x] CHK025 Is failure behavior defined when a clone materializes links as directories? [Exception Flow, Spec Assumptions, Research §6]

## Non-Functional Requirements and Dependencies

- [x] CHK026 Are validation timing, dependency and bundle constraints quantified? [Non-Functional, Plan §Technical Context, Spec §SC-007]
- [x] CHK027 Are path-containment and no-network/no-credential security requirements specified? [Security, Contract topology v1, Plan Art. XI]
- [x] CHK028 Are licensing/provenance retention obligations explicit for all vendored skill classes? [Dependency/Compliance, Spec §FR-004, Contract migration-inventory-v1]
- [x] CHK029 Is Nx generator non-use justified rather than leaving an ambiguous scaffolding dependency? [Dependency, Research §5]

## Notes

- All 29 requirements-quality checks pass against the approved spec and current
  plan. Implementation verification belongs to S1–S9 tests and deterministic
  gates, not this checklist.
