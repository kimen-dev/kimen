# Feature Specification: ki-dialog

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-dialog` (spec `012-ki-dialog`)

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Modal dialog for the Fase 2 batch: a
`<ki-dialog>` web component that interrupts the page for one focused decision,
abstracting the Material 3 basic dialog and the MarsUI dialog patterns so any
theme maps through tokens alone. Charter scope for v1: modal only; `open`
attribute plus `show()`/`close()` methods; `ki-close` event; Escape closes;
backdrop click closes only with an opt-in attribute; focus moves into the
dialog and returns to the invoker on close. First dialog-type interaction
pattern in the repo — manual APG walkthrough required. The full-screen dialog
is deferred as a future additive variant."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

The API below is the union of patterns found in both reference designs, so
that neither theme lacks expressive power (and future themes inherit the same
guarantee). The MarsUI dialog frames could not be re-verified while writing
this spec; cells below carry the pending marker rather than invented facts.

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-dialog |
|---|---|---|---|
| Anatomy | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Basic dialog: container, headline, supporting text, end-aligned text-button actions; optional hero icon | `heading` attribute (title and accessible name) + default slot (body) + `footer` slot (actions). A hero icon composes inside the body; a dedicated slot can arrive later as additive MINOR |
| Modality and scrim | onmars ships surface levels s0–s5 in its token vocabulary; the dialog frame's surface/scrim treatment is (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Modal: a scrim covers the page and blocks interaction until the dialog is resolved | Modal-only v1: while open, everything behind the dialog is inert; the backdrop is styled through `--ki-dialog-backdrop-*` tokens |
| Dismissal | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Resolved through its actions; scrim/back dismissal follows platform convention | Escape always closes; backdrop click closes only with the opt-in `close-on-backdrop` attribute (a stray click must not destroy a critical confirmation); `close()` / removing `open` close programmatically; every path reports `ki-close` |
| Sizing | onmars metrics xs–xl exist in the token vocabulary; dialog-specific sizing is (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Width bounded between min and max constraints; no size scale on the basic dialog | No `size` attribute in v1; width bounds, padding, gap and radius are per-theme component tokens |
| Emphasis / intent | onmars tone ramps (incl. info/warning) exist at the semantic layer; no dialog-level emphasis axis verified (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | No color-variant or emphasis axis on dialogs | No `variant`, no `tone` in v1: Material 3 shows no emphasis or intent axis on the basic dialog; the MarsUI frames are pending — if they reveal such an axis at gate 1, it is evaluated as an additive MINOR change (Art. VII) |
| Full-screen | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Separate full-screen dialog for compact screens, with a header close affordance | Out of scope for v1; future additive variant |
| Motion | (pending verification against the MarsUI frames — Figma connector unavailable 2026-07-08; to confirm at gate 1) | Entrance/exit transitions | Open/close motion is a theme decision expressed through `--ki-dialog-motion-*` tokens and is disabled under `prefers-reduced-motion` |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Confirm a critical decision without losing it (Priority: P1)

A person triggers a consequential action ("Delete account") and the
application interrupts them with a modal dialog. The page behind is blocked
until they resolve it through one of the dialog's actions or dismiss it with
Escape. A stray click outside the dialog does not throw the decision away
unless the application explicitly opted into backdrop dismissal.

**Why this priority**: interrupting the page safely — modal, above everything,
impossible to interact past — is the component's entire reason to exist.

**Independent Test**: open a dialog from a button; verify the page behind is
inert; dismiss it via a footer action wired to `close()` and observe the
close event reporting a programmatic dismissal; click the backdrop with and
without the opt-in and observe stay-open vs close.

**Acceptance Scenarios**:

1. **Given** a page with a "Delete account" button wired to a confirmation
   dialog, **When** the user activates the button, **Then** the dialog appears
   above the page and the content behind it is inert.
2. **Given** an open dialog without backdrop dismissal enabled, **When** the
   user clicks the backdrop, **Then** the dialog stays open.

---

### User Story 2 - Operate the dialog with keyboard and assistive technology (Priority: P2)

A keyboard or screen-reader user opens the dialog, lands inside it, moves
through its content without ever escaping into the blocked page, hears it
announced as a named modal dialog, closes it with Escape, and finds their
focus back on the element that opened it.

**Why this priority**: a modal that leaks focus or hides its name is a broken
modal (Art. V); the focus contract is what distinguishes a dialog from a
styled box. It layers directly on the P1 behavior.

**Independent Test**: keyboard-only session — open, Tab through and past the
last focusable element, press Escape; query the accessibility tree for role,
name and modal state, and for the invisibility of the page behind.

**Acceptance Scenarios**:

1. **Given** a dialog opened from the "Delete account" button, **When** the
   user presses Escape, **Then** the dialog closes and focus returns to the
   "Delete account" button.
2. **Given** an open dialog with heading "Delete account?", **When** the
   accessibility tree is queried, **Then** it exposes a modal dialog named
   "Delete account?" and none of the page content behind it.

---

### User Story 3 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and the dialog — surface, backdrop, heading typography, spacing,
radius, elevation — restyles from the token layer alone. No markup change,
no component change.

**Why this priority**: one-step re-theming is Kimen's visible differentiator,
proven in CI since 001; the dialog adds the first themed backdrop/overlay
surface.

**Independent Test**: render an open dialog under onmars, declare the
material3 theme, assert its appearance resolves from material3 tokens; repeat
under the forced dark scheme and in a right-to-left document.

**Acceptance Scenarios**:

1. **Given** a page declaring the material3 theme with an open dialog,
   **When** the page renders, **Then** the dialog's appearance resolves from
   material3 token values.
2. **Given** an open dialog under the onmars theme with a forced dark scheme,
   **When** the page renders, **Then** the dialog uses the dark token values.

---

### User Story 4 - An agent composes a valid dialog (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
knows a dialog is for an interrupting decision — not for passive feedback or
long flows — always gives it a heading, and wires its actions into the footer
slot. Malformed markup does not break rendering.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render a dialog with unrecognized markup and observe the
documented defaults (closed, default appearance).

**Acceptance Scenarios**:

1. **Given** a dialog declared with an unrecognized attribute and value,
   **When** the page renders, **Then** the dialog renders closed with its
   default appearance.

### Edge Cases

- `show()` on an already-open dialog and `close()` on an already-closed one
  are no-ops: no state change, no duplicate `ki-close`.
- The opener is removed from the document while the dialog is open: on close,
  focus falls back to the document body without scrolling the page (FR-005)
  instead of being lost.
- A dialog declared `open` in the initial markup (no invoker ever held
  focus): focus moves into it per FR-005 on load, and close uses the same
  document-body fallback.
- Body content taller than the viewport: the body region scrolls inside the
  dialog; the dialog itself never exceeds the viewport.
- No focusable content inside the dialog: focus lands on the dialog surface
  itself, so Escape still works.
- Boolean attribute semantics: `close-on-backdrop="false"` still enables
  backdrop dismissal (HTML boolean attributes); catalog guidance tells agents
  to omit the attribute entirely instead.
- A second dialog opened from inside an open dialog stacks above it and
  Escape closes the topmost first; stacking is platform behavior, not an
  advertised v1 pattern.
- `prefers-reduced-motion`: any open/close transition a theme defines is
  suppressed; the dialog appears and disappears without motion.
- Missing `heading`: the dialog still renders but has no accessible name —
  documented as invalid usage in the catalog (the APG dialog pattern requires
  a name), never a crash.
- RTL documents: layout and footer action order/alignment follow the writing
  direction (logical properties only, Art. IV).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Dialog
  A modal dialog interrupts the page for one focused decision, holds the
  person's attention until it is resolved, and restyles through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Opening the dialog presents it above an inert page
    Given a page with a "Delete account" button that opens a confirmation dialog
    When the user activates the button
    Then the dialog appears above the page and the content behind it is inert

  # S2
  Scenario: A footer action dismisses the dialog
    Given an open dialog whose footer holds a "Cancel" action wired to close it
    When the user activates "Cancel"
    Then the dialog closes and a ki-close event reports a programmatic dismissal

  # S3
  Scenario: Clicking the backdrop does not close the dialog by default
    Given an open dialog without backdrop dismissal enabled
    When the user clicks the backdrop behind the dialog
    Then the dialog stays open

  # S4
  Scenario: Opt-in backdrop dismissal closes the dialog
    Given an open dialog with backdrop dismissal enabled
    When the user clicks the backdrop behind the dialog
    Then the dialog closes and a ki-close event reports a backdrop dismissal

  # S5
  Scenario: Unrecognized markup leaves the dialog at its documented defaults
    Given a dialog declared with an unrecognized attribute and value
    When the page renders
    Then the dialog renders closed with its default appearance

  # S15
  Scenario: Programmatic close reports exactly one close event
    Given an open dialog on a page that counts close events
    When the application closes it programmatically
    Then the dialog closes and exactly one ki-close event reports a programmatic dismissal

  # Family: keyboard path
  # S6
  Scenario: Opening the dialog moves focus into it
    Given a page with a "Delete account" button that opens a confirmation dialog
    When the user activates the button from the keyboard
    Then focus lands inside the dialog with visible focus indication

  # S7
  Scenario: Tab keeps focus inside the open dialog
    Given an open dialog whose last focusable action is "Delete"
    When the user presses Tab from "Delete"
    Then focus stays inside the dialog and never reaches the page behind

  # S8
  Scenario: Escape closes the dialog and returns focus to the opener
    Given a dialog opened from the "Delete account" button
    When the user presses Escape
    Then the dialog closes, the ki-close event reports an Escape dismissal, and focus returns to the "Delete account" button

  # Family: assistive-tech outcome
  # S9
  Scenario: The dialog is exposed as a named modal dialog
    Given an open dialog with heading "Delete account?"
    When the accessibility tree is queried
    Then it exposes a modal dialog whose accessible name is "Delete account?"

  # S10
  Scenario: Content behind the open dialog is hidden from assistive technology
    Given an open dialog over a page with a "Settings" navigation link
    When the accessibility tree is queried
    Then the "Settings" link is not exposed while the dialog is open

  # Family: theming
  # S11
  Scenario: A second theme restyles the dialog through tokens alone
    Given a page declaring the material3 theme with an open dialog
    When the page renders
    Then the dialog's appearance resolves from material3 token values

  # S12
  Scenario: The dialog honors a forced dark scheme
    Given an open dialog on a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the dialog's appearance resolves from the dark token values

  # S13
  Scenario: Dialog actions follow the document's writing direction
    Given a right-to-left document with an open dialog holding "Cancel" and "Delete" actions
    When the page renders
    Then the action order and alignment follow the right-to-left direction

  # S14
  Scenario: Reduced motion suppresses open and close transitions
    Given a person whose system requests reduced motion and a theme defining open and close transitions
    When the dialog opens
    Then the dialog appears without motion
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S15 | |
| Keyboard path | S6, S7, S8 | |
| Assistive-tech outcome | S9, S10 | |
| Form participation | | N/A — ki-dialog is not a form control and carries no name/value; the charter's form-associated set for this batch is input, textarea, select, checkbox, radio-group and switch. Forms compose inside the dialog's slots and keep their native behavior untouched. |
| Theming | S11, S12, S13, S14 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dialog MUST expose an `open` boolean attribute, reflected
  at all times: present shows the dialog modally, absent hides it. The
  default state is closed; closing through any path removes the attribute.
- **FR-002**: The dialog MUST expose `show()` and `close()` methods with the
  same observable results as adding/removing `open`; redundant calls
  (`show()` while open, `close()` while closed) are no-ops.
- **FR-003**: Closing through any path — programmatic (`close()` / removing
  `open`), Escape, or opt-in backdrop click — MUST emit exactly one
  `ki-close` event (bubbling, composed) whose detail documents the close
  reason (`method`, `escape`, `backdrop`).
- **FR-004**: While the dialog is open, all page content outside it MUST be
  inert: unreachable by pointer, by keyboard, and by assistive technology.
- **FR-005**: Focus MUST move inside the dialog when it opens: to the
  slotted element carrying `autofocus` if one exists (native `<dialog>`
  parity), else to the dialog's first focusable element, else to the dialog
  surface. Focus MUST remain inside while the dialog is open and MUST return
  to the invoking element on close. The invoking element is the element that
  held focus at the moment the dialog opened. When no invoker was recorded
  (e.g. a dialog declared `open` in the initial markup) or the invoker is no
  longer in the document or focusable at close time, focus moves to the
  document body without scrolling the page; this documented fallback counts
  as fulfilling the focus-return contract (SC-003).
- **FR-006**: Escape MUST close the dialog; this behavior is always on, not
  opt-in.
- **FR-007**: Clicking the backdrop MUST NOT close the dialog by default; a
  `close-on-backdrop` boolean attribute opts in to backdrop dismissal.
- **FR-008**: A `heading` attribute MUST render the dialog title and provide
  its accessible name; the dialog exposes the dialog role and its modal state
  per the APG dialog (modal) pattern.
- **FR-009**: Content MUST compose through slots: default slot for the body,
  `footer` slot for the actions. Slotted footer actions do NOT close the
  dialog by themselves: the application wires them to `close()`, which
  reports the `method` close reason.
- **FR-010**: Every visual property (surface color, backdrop color, radius,
  padding, gap, width bounds, elevation, heading typography, focus-ring
  styling, open/close motion) MUST resolve from `--ki-dialog-*` component
  tokens layered over the semantic token layer; zero hardcoded visual
  values; both shipped themes (onmars, material3) resolve the full set.
- **FR-011**: Any open/close motion a theme defines MUST be suppressed under
  `prefers-reduced-motion`.
- **FR-012**: Unrecognized attributes or attribute values MUST NOT break
  rendering: the dialog ignores them and keeps its documented defaults
  (agent-generated markup is not trusted to be valid). Boolean attributes
  follow platform semantics: presence means true.
- **FR-013**: The component MUST expose `dialog`, `heading`, `body` and
  `footer` parts for the customization ladder (tokens first, then parts,
  then slots).
- **FR-014**: Layout MUST use logical properties only; footer action order
  and alignment follow the document's writing direction.
- **FR-015**: When body content exceeds the viewport, the body region MUST
  scroll inside the dialog; the dialog itself never exceeds the viewport.
- **FR-016**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance (a heading is always required;
  non-blocking feedback and long flows are documented as when-NOT-to-use).

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): new element `ki-dialog` (attributes:
  `open`, `heading`, `close-on-backdrop`; methods: `show()`, `close()`;
  event: `ki-close`, bubbling, composed, `detail.reason` ∈ `method` |
  `escape` | `backdrop`; slots: default, `footer`; parts: `dialog`,
  `heading`, `body`, `footer`; component tokens: `--ki-dialog-*`). No
  sub-components. Additive MINOR. Catalog and llms.txt regenerate with the
  new entry.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost; no new
  runtime dependency ("none").
- **Accessibility** (Art. V): APG dialog (modal) pattern; NEW interaction
  pattern in the repo → manual APG walkthrough required and documented in the
  PR (focus entry, containment, Escape, focus return, inert background). axe
  zero violations in open and closed states under both themes and schemes.
- **Tokens** (Art. VI): new component token family `--ki-dialog-*`
  (structure: `radius`, `padding`, `gap`, `min-width`, `max-width`; color:
  `bg`, `fg`, `border`, `shadow`; backdrop: `--ki-dialog-backdrop-bg`;
  heading typography: `--ki-dialog-heading-{font-size|font-weight|line-height}`;
  focus ring: `--ki-dialog-focus-ring-{color|width|offset}`, exercised when
  the dialog surface itself takes focus; motion:
  `--ki-dialog-motion-{duration|easing}`, from which any open/close
  transition a theme defines resolves, suppressed under
  `prefers-reduced-motion`) resolving from the semantic layer; both shipped
  themes get component token files. No semantic-layer deltas anticipated; the contrast gate arbitrates
  at implementation and any delta requires founder sign-off at the merge
  gate (002 precedent).
- **Catalog/agent legibility** (Art. I): when-to-use — an interrupting
  decision or short focused task that must be resolved before returning to
  the page: destructive confirmations, blocking choices, brief critical
  input. When NOT to use — non-blocking feedback (ki-alert, future
  ki-toast), supplementary hints (ki-tooltip), long forms or multi-step
  flows (navigate, or the future full-screen variant), menus and pickers
  (future components). Composition guidance: footer actions never close the
  dialog by themselves — wire each one to `close()` (FR-009); in destructive
  confirmations, place `autofocus` on the least destructive action so
  initial focus follows the APG dialog (modal) guidance (FR-005).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: a person can open, operate and dismiss the dialog with pointer
  alone and with keyboard alone; each modality completes the full journey in
  100% of the documented close paths.
- **SC-002**: while the dialog is open, zero elements behind it are reachable
  by pointer, keyboard or assistive technology.
- **SC-003**: focus returns to the invoking element — or, when no invoker
  exists or it is gone, to the documented document-body fallback (FR-005) —
  in 100% of close paths (footer action, Escape, opt-in backdrop,
  programmatic).
- **SC-004**: switching the document theme (onmars ↔ material3) restyles the
  dialog — surface, backdrop, typography, spacing — with zero markup or
  component changes; the forced dark scheme resolves the dark token values.
- **SC-005**: zero accessibility violations in automated auditing across
  open/closed states, both themes and both schemes, plus a documented manual
  walkthrough of the APG dialog pattern.
- **SC-006**: the component's marginal cost stays in single-digit KB
  (gzipped) and within the declared budget gate.

## Assumptions

- Modal only in v1 (charter scope); a non-modal/modeless presentation is
  excluded, not forgotten.
- No built-in close ("X") button in v1: the M3 basic dialog resolves through
  its footer actions, and applications compose their own buttons in the
  `footer` slot. Consequently the component ships no default user-visible
  strings and needs no overridable label prop; the future full-screen
  variant may introduce one as an additive change.
- `heading` is the accessible-name source and is expected on every dialog; a
  heading-less dialog is documented as invalid usage in the catalog rather
  than auto-named or blocked at runtime.
- `ki-close` is a post-close notification and is not cancelable; a
  cancelable before-close event (e.g. dirty-form veto) would be an additive
  future enhancement.
- No `variant`, `tone` or `size` axes in v1: Material 3 does not scale the
  basic dialog on an emphasis, intent or size axis, and no such axis is
  verified in MarsUI (frames pending, see the last bullet); if the MarsUI
  frames reveal one at gate 1, it is evaluated as an additive MINOR change.
  Width bounds, spacing and radius are per-theme component tokens (002
  precedent: appearance axes a theme can decide are tokens, not props).
- Component token naming is flat (`--ki-dialog-bg`, not the charter's
  `--ki-dialog-{size}-...` / `--ki-dialog-{variant}-{tone}-{state}-...`
  shape): the dialog has no size, variant or tone axes (see above) and no
  hover/active interactive states of its own, so those name segments would
  be empty. This is a deliberate, justified deviation from the charter's
  token naming; the focus-ring tokens keep the charter's exact shape
  (`--ki-dialog-focus-ring-{color|width|offset}`).
- The actions slot is named `footer` for batch consistency with ki-card
  (009); the charter allows both `footer` and `actions` as structural slot
  names.
- A form slotted into the dialog behaves natively; a dedicated
  dialog–form coupling (close-on-submit) is not part of the v1 contract.
- Stacked dialogs rely on platform top-layer ordering (Escape closes the
  topmost); stacking is not an advertised v1 pattern.
- The MarsUI dialog frames were not re-verifiable while writing this spec
  (Figma connector unavailable 2026-07-08); every MarsUI cell so marked is
  confirmed or corrected at gate 1 before approval. Resolving every pending
  cell is an explicit BLOCKING item of the gate 1 approval checklist: the
  spec is not approvable while a pending marker remains. If verification
  reveals a different anatomy the affected sections are amended before
  approval; a newly revealed emphasis/intent or size axis is evaluated as an
  additive MINOR change (it does not retract this v1 surface).
