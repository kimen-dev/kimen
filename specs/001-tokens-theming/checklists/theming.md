# Checklist: Theming requirements quality — 001-tokens-theming

**Purpose**: Unit tests for the requirements (PR-review depth) before task
breakdown and implementation
**Created**: 2026-07-05
**Feature**: [spec.md](../spec.md)

## Requirement Completeness

- [x] CHK001 - Are activation requirements defined for every supported theme × scheme combination? [Completeness, Spec §FR-001..FR-004] — yes; see CHK017 for the one implicit composition.
- [x] CHK002 - Are fallback requirements specified for all theme-activation failure modes (unknown name, stylesheet not loaded)? [Completeness, Spec §FR-007, §Edge Cases]
- [x] CHK003 - Are requirements defined for live system-preference changes while a page is open? [Completeness, Spec §Edge Cases]
- [x] CHK004 - Are font-fallback requirements specified when brand fonts are unavailable? [Completeness, Spec §Edge Cases]
- [x] CHK005 - Is the design-source traceability requirement documented per layer? [Completeness, Spec §FR-008]

## Requirement Clarity

- [x] CHK006 - Is "single document-level declaration" unambiguous about where it applies? [Clarity, Spec §FR-003/FR-004] — root-only, stated in Assumptions.
- [x] CHK007 - Is "token contract" precisely defined (names, layers, both schemes participate in equality)? [Clarity, Spec §FR-005/SC-002; contracts/theming-contract.md §3]
- [x] CHK008 - Are the "default text-on-surface pairs" enumerated so contrast checking is objective? [Clarity, Spec §FR-009] — enumerated in data-model.md validation rule 3 (4 pairs); spec intentionally stays technology-agnostic.
- [x] CHK009 - Is "single-digit KB compressed" bound to a concrete limit per artifact? [Clarity, Spec §SC-004] — 9 KB gz per stylesheet in plan.md/research.md D6.

## Requirement Consistency

- [x] CHK010 - Do automatic-scheme (FR-002) and forced-scheme (FR-003) requirements define precedence without conflict? [Consistency] — override wins; S3/S4 encode both directions.
- [x] CHK011 - Are the Gherkin value anchors consistent with the committed sources and the M3 kit? [Consistency, Spec §Gherkin] — #845abe/# ffffff/#0a0a0a match onmars sources; #6750a4 verified against the kit (research.md).
- [x] CHK012 - Is the material3 layer restriction (FR-005, no primitive fork) consistent with the fallback requirement (FR-007)? [Consistency] — shared primitives make the fallback safe by construction.

## Acceptance Criteria Quality

- [x] CHK013 - Can SC-001 (0 component-file changes) be objectively verified from the change set? [Measurability, Spec §SC-001]
- [x] CHK014 - Is SC-002's equality bidirectional (no extra names in either theme)? [Measurability, Spec §SC-002] — "identical/exact" set equality.
- [x] CHK015 - Is SC-005 verifiable without human judgment (pairs + threshold + schemes enumerated)? [Measurability, Spec §SC-005; data-model.md]

## Scenario & Edge Case Coverage

- [x] CHK016 - Are both directions of the forced-scheme override covered? [Coverage, Spec §S3/S4]
- [x] CHK017 - Is the material3 × dark composition explicitly covered by a scenario, or intentionally left to FR-002+FR-004 composition plus S6 (name equality includes dark blocks)? [Coverage] — founder disposition 2026-07-05: composition coverage accepted (S6 spans dark blocks; material3-dark contrast gated by T018); no S8 amendment.
- [x] CHK018 - Is zero-configuration behavior covered? [Coverage, Spec §S1]

## Non-Functional Requirements

- [x] CHK019 - Are performance requirements intentionally limited to stylesheet size (no render-time metric)? [NFR, Spec §SC-004] — yes: static CSS, no runtime; Art. IV names the metric.
- [x] CHK020 - Are accessibility exclusions (forced-colors/high-contrast) explicit and tracked? [NFR, Spec §Assumptions]

## Dependencies & Assumptions

- [x] CHK021 - Is the M3 Design Kit baseline dependency documented and validated against the kit? [Assumption, Spec §Assumptions; research.md D2/D3]
- [x] CHK022 - Is the subtree-theming exclusion documented for consumers? [Assumption, Spec §Assumptions; contracts/theming-contract.md §2]

## Notes

- 22/22 pass. CHK017 resolved by founder disposition (2026-07-05):
  material3 × dark stays covered by composition — FR-002 applies to any
  active theme, S6's equality spans dark blocks, and T018 gates
  material3-dark contrast. The browser suite may assert it beyond the
  scenario minimum without a spec amendment.
