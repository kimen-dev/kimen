# Checklist: ki-button requirements quality (pre-tasks constitutional gate)

**Purpose**: unit-test the ki-button requirements (spec + plan + design
artifacts) for completeness, clarity and constitutional alignment before
`/speckit-tasks`. Validates what is WRITTEN, not what will be built.
**Created**: 2026-07-06
**Feature**: [spec.md](../spec.md) · [plan.md](../plan.md) ·
[research.md](../research.md) · [contracts/button-contract.md](../contracts/button-contract.md)

## Token-layer completeness (Art. VI)

- [x] CHK001 - Is the full component-token vocabulary enumerable from the
      requirements (names, dimensions, counts) without reading code?
      [Completeness, Spec §FR-008, research.md §D4, data-model.md]
- [x] CHK002 - Do the requirements state how BOTH shipped themes resolve the
      variant × tone × size × state matrix (onmars by inheritance, material3
      by override), including where shape lands? [Coverage, Spec §Design
      table, research.md §D4]
- [x] CHK003 - Is fallback behavior specified for a theme that omits
      component-token values (cascade to onmars per the 001 contract)?
      [Edge Case, contracts §CSS custom properties]
- [x] CHK004 - Is the mapping from variant/tone to the existing semantic
      vocabulary (family × emphasis grades) documented so token review is
      mechanical? [Clarity, research.md §D4]
- [x] CHK005 - Are the state suffixes (rest/hover/active/disabled) and the
      focus-ring token source defined unambiguously? [Clarity,
      data-model.md §State model, research.md §D7]

## Form participation contract (Art. IV)

- [x] CHK006 - Are all three `type` behaviors specified with observable
      outcomes, including name/value contribution rules? [Completeness,
      Spec §FR-006, data-model.md §Form participation]
- [x] CHK007 - Is the default `type` decision (submit, native parity)
      recorded with its rationale and its agent-facing guidance?
      [Clarity, Spec §Assumptions, contracts §Attributes]
- [x] CHK008 - Is `fieldset[disabled]`/form-disabled propagation addressed
      in the requirements? [Coverage, research.md §D2, contracts §disabled]
- [x] CHK009 - Is the "no custom events" decision explicit so consumers
      know `click` is the only activation signal? [Clarity,
      contracts §Events]

## Accessibility obligations (Art. V)

- [x] CHK010 - Are keyboard requirements complete (reach, visible focus,
      Enter AND Space activation) and mapped to scenarios? [Coverage,
      S3/S4, Spec §FR-011]
- [x] CHK011 - Is the ≥24×24 px target requirement stated for EVERY size
      including the xs=24px boundary and the empty-label edge case?
      [Edge Case, Spec §Edge Cases, research.md §D7]
- [x] CHK012 - Is reduced-motion behavior specified? [Completeness,
      research.md §D7]
- [x] CHK013 - Is the manual APG walkthrough obligation (first interaction
      pattern in the repo) recorded with where it is documented (PR)?
      [Traceability, plan.md Art. V, Spec §Constitutional Surface]
- [x] CHK014 - Do the requirements state that the accessible name derives
      from slotted content and what happens without a label? [Clarity,
      contracts §Slots, Spec §Edge Cases]

## Traceability readiness (Art. II/III)

- [x] CHK015 - Does every scenario S1–S11 appear in exactly one family row
      of the coverage table, and does each FR trace to at least one
      scenario or constitutional article? [Traceability, Spec §Scenario
      Family Coverage]
- [x] CHK016 - Are the test-file locations and the `@spec:002-ki-button`
      marker convention specified before implementation (RED-first
      enforceable)? [Completeness, research.md §D6, plan.md §Structure]
- [x] CHK017 - Is the RED-before-GREEN ordering an explicit requirement the
      task list must encode? [Consistency, plan.md Art. III]

## Budget wiring (Art. IV)

- [x] CHK018 - Are budget numbers stated with their measurement method
      (size-limit entries, runtime-excluded marginal + worst case) and do
      they match the spec's single-digit KB promise? [Measurability,
      Spec §SC-004, plan.md §Technical Context]
- [x] CHK019 - Do the requirements state what happens to ki-hello's budget
      entries (replaced by ki-button, same caps)? [Consistency,
      research.md §D5]

## ki-hello removal (FR-014)

- [x] CHK020 - Is the removal scope enumerated (component dir, browser
      test, export, budget entries, regenerated artifacts) so no orphan
      survives? [Completeness, research.md §D5, plan.md §Structure]
- [x] CHK021 - Is the API-stability impact of the removal justified
      (pre-1.0, roadmap-scheduled, no deprecation cycle)? [Consistency,
      Spec §Constitutional Surface, plan.md Art. IX]

## Ambiguities & assumptions surfaced

- [x] CHK022 - Are all founder decisions from specify (5-level variant,
      tone in scope) recorded in the spec Input so they cannot be
      re-litigated silently? [Traceability, Spec §Input]
- [x] CHK023 - Are deliberate exclusions (toggle, icon-only, loading,
      shape attribute) marked as decisions with their future path, not
      gaps? [Boundary, Spec §Assumptions, research.md]
- [x] CHK024 - Is the mutation-gate factory gap declared (inherited, not
      introduced) with its compensating control? [Assumption,
      plan.md Art. III]

## Notes

- All 24 items PASS against the current artifacts; no spec/plan updates
  required before `/speckit-tasks`.
- CHK024 tracks a factory-level debt (Stryker wiring) that belongs to a
  chore outside this feature.
