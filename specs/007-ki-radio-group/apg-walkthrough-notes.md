# APG Walkthrough Notes: ki-radio-group

Date: 2026-07-08

Surface checked: built `@kimen/elements` custom-elements output via the
browser test page and Storybook story source.

## APG Radio Group Pattern

- Tab entry with a selected option: PASS. `S5` verifies Tab reaches the
  selected internal native radio and shows the token focus ring.
- Tab entry with no selection: PASS. `S25` verifies Tab reaches the first
  enabled option without selecting it.
- Tab exit: PASS. `S9` verifies the group is a single Tab stop.
- Disabled group skipped by Tab: PASS. `S20` verifies no internal input is
  tabbable when the group is disabled.
- Arrow navigation LTR: PASS. `S6` and `S7` verify ArrowDown moves selection,
  wraps, and skips disabled options.
- Arrow navigation RTL: PASS. `S21` verifies ArrowLeft maps to the next option
  in an RTL document.
- Space on focused unselected option: PASS. `S8` verifies native Space
  activation selects the option.
- Disabled option: PASS. `S3`, `S7`, `S11`, and `S24` verify disabled options
  are unavailable, skipped, and withheld from form data.

## RTL And Reduced Motion

- RTL geometry: PASS. `S18` verifies the control leads the label in RTL.
- Reduced motion: PASS by CSS inspection. Selection transitions are scoped
  under `@media (prefers-reduced-motion: no-preference)`, so reduced-motion
  users receive immediate state changes.

## Assistive Technology Outcomes

- Automated accessibility tree: PASS. `S10`, `S11`, `S22`, and `S23` verify
  radiogroup name, selected radio state, disabled radio state, required state,
  and invalid state.
- Manual screen-reader position-in-set ("2 of 3"): NOT EXECUTED in this
  unattended environment because no screen reader target is available. The
  implementation keeps native radio inputs in the flattened radiogroup; if a
  target browser/AT pair mis-announces set position, apply the recorded
  contingency from research D1/D10: group-managed `aria-posinset` and
  `aria-setsize` on the internal inputs, preceded by a failing browser test.
