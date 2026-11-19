# Feature Specification: ki-alert

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-alert` (spec `011-ki-alert`)

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Persistent inline message component `<ki-alert>`
for the Kimen library: it keeps a person informed about the state of a page or
section (a failed save, a completed backup, a service notice) until the
condition is resolved or the person dismisses it. Five semantic tones
(neutral, success, danger, info, warning) resolved through tokens, an optional
heading, opt-in dismissal with an overridable dismiss label, and live-region
exposure matched to the tone's urgency. Part of the Fase 2 batch (003–016)
under the shared API charter. Material 3 has no direct alert equivalent — its
snackbar is transient and maps to the future ki-toast."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

> **Correction (2026-07-25) — the "full-file sweep verified 2026-07-08" is a
> false negative.** That sweep enumerated the MarsUI file
> (`vbD864Afs8lTSXUgtABFSs`) with the Figma MCP `get_metadata` tool called
> without a `nodeId`, which returns only 10 of the file's 54 pages while
> presenting them as the complete page list. Re-enumeration with `use_figma`
> (`figma.root.children`, the only reliable enumerator) shows that **MarsUI
> does ship an alert master**: page `Alerts` `12074:6200` → component `Alert`
> `12074:6202` (5 variants, 10 properties). Two further message masters sit
> beside it and are conflated with it below: page `Info Notes` `12126:4668` →
> `Info_note` `12126:4670` (15 variants), and page `Toasts` `12051:292` →
> `12071:5771` (the `Toast` this section cites). Every claim of the form "no
> alert frame in MarsUI" in the table and in Assumptions is therefore false,
> and the reasoning that depends on it is unsound as argued: it is superseded
> by a design extraction against `Alert 12074:6202`, which has not been
> performed yet. This correction changes no functional requirement and no
> Gherkin scenario — the decisions built on the refuted premise are marked in
> place and are the founder's to re-derive.

Unlike ki-button, this API was not abstracted from a matched pair of reference
components: Material 3 simply has no persistent inline alert, and the MarsUI
master that does exist (`Alert 12074:6202`) was missed by the refuted sweep
above. The API below therefore leans on the shared charter vocabulary (tones,
tokens, slots) and on what the token layer already guarantees, so both shipped
themes — and future ones — style the same contract from their own color roles:

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-alert |
|---|---|---|---|
| Component existence | **Corrected 2026-07-25**: MarsUI ships a dedicated alert master — page `Alerts` `12074:6200` → `Alert` `12074:6202` (5 variants, 10 properties). Nor is it the file's only message artifact: `Info_note` `12126:4670` (page `Info Notes` `12126:4668`, 15 variants) and the transient `Toast` `12071:5771` (page `Toasts` `12051:292`) are separate masters, and only the last of the three maps to the future ki-toast. The 2026-07-08 full-file sweep that reported no alert frame is a false negative (correction note above) | No alert in M3: the snackbar is transient with a single action (it maps to the future ki-toast); the banner was an M2 component and did not carry into M3 | A persistent inline message; each theme styles it from its own container/on-color roles through `--ki-alert-*` tokens — no 1:1 M3 component is required, and the loose mapping is documented in the catalog's when-to-use. **[the onmars side of this abstraction was derived without the master — re-derive against `Alert 12074:6202`]** |
| Semantic intent | Tone ramps already exist in the extracted onmars token vocabulary: success, danger, info and warning alongside neutral (001 extraction) | Error color roles plus container/on-container pairs; no per-tone message component | `tone`: five values — `neutral` (default), `success`, `danger`, `info`, `warning` — the charter's full feedback vocabulary, token-resolved |
| Content anatomy | **Corrected 2026-07-25**: the alert anatomy lives in `Alert 12074:6202` (5 variants, 10 properties) and has not been extracted. What this row records is the anatomy of the separate `Toast` `12071:5771` — leading tone icon + heading + supporting text + action buttons + close — which stays valid for the future ki-toast but was never evidence about this component | Snackbar anatomy (label + optional action + optional close icon) is transient and not 1:1 | Optional `heading` attribute + default slot for the message + opt-in dismiss control. **[rests on a refuted premise: derived without `Alert 12074:6202` — needs re-derivation]** Re-derived in Amendment A1 (decided 2026-11-19). |
| Dismissal | **Corrected 2026-07-25**: the alert master `Alert 12074:6202` exists and its dismissal affordances are unextracted. The visible countdown and close control recorded here belong to the separate `Toast` `12071:5771` — evidence about toast behavior, which never spoke to the alert either way | Snackbar dismisses on a timer or via its close affordance | Explicit user dismissal only, opt-in via `dismissible`, notified as `ki-dismiss`; no auto-timeout (that is toast behavior). **[the opt-in half rests on a refuted premise — check the master's 10 properties for a close/dismissible axis before it stands]** |
| Surface style (filled / outlined) | onmars surfaces s0–s5 exist in the token vocabulary; **corrected 2026-07-25** — there IS a frame to pin a surface to, `Alert 12074:6202`, whose 5 variants and 10 properties are unextracted | Container vs outlined surfaces are color-role decisions | No `variant`: filled-vs-outlined is a theme decision expressed in component tokens (002 precedent), never a prop. **[premise refuted — whether the master exposes an emphasis axis must be checked before this stands]** |
| Size | onmars metrics xs–xl exist as tokens; **corrected 2026-07-25** — `Alert 12074:6202` exists, so "no alert scale exists" was never verified: whether its 10 properties carry a size axis is unknown until extraction | No equivalent to scale against | No `size` in v1; alert metrics are per-theme component tokens. **[rests on a refuted premise — needs re-derivation]** |

## Amendment A1: the Alert master anatomy *(decided 2026-11-19)*

**Status**: Intent decided by the founder on 2026-11-19, who adopted the
recommendations below (see *Decisions on the open questions*); the anatomy
was re-checked against all five variants of the master the same day.
Contract only: no component, token or test change ships with this amendment.

**Merge sequencing**: S20–S35 have no traced test yet, so
`check-traceability.sh` is red for this spec on this branch. Like the
spec-only contracts 019–030 (see the merge-sequencing assumption in
`027-runtime-catalog`), the amendment reaches `main` only together with the
implementation that traces it.

**Path**: in place, through the Art. II amendment path: one component, so
new S-IDs are appended (S20–S35) and none is retired, as in 030 and in
002 S14. Specs 042–045 opened folders of their own because each one spans
many components.

### Master facts against what ships

Verified from the founder's `.fig` export (set `12074:6202`, all five
variants: `default` `12074:6203`, `info` `12075:6685`, `success`
`12075:6742`, `warning` `12075:6799`, `danger` `12075:6866`; Regular radius
mode, Default spacing), reading each layer's variable bindings and
positions.

| Layer | `Alert` master | `ki-alert` today | Delta |
|---|---|---|---|
| Variants | `State`: default, info, success, warning, danger | `tone`: neutral (default), info, success, warning, danger | None. `State` is the tone axis; Figma `default` is Kimen `neutral` |
| Shell | padding `Space/xl` 12px, radius `Radius/big-component/lg` 28px, background blur 24 (12px in CSS: `ki.blur.24`, served as `--ki-effect-component-backdrop-blur`), vertical stack gap 12px | absent: one box | New outer layer |
| Card (`List_wrap`) | vertical stack, padding 12px, gap 12px, radius `Radius/big-component/xs` 16px, fill `Surface/special/light-s0-dark-s2`, elevation e5 (0 56 56 −28, 0 32 32 −16, 0 20 20 −12, 0 3 3 −1.5, 0 1 1 −0.5; `--ki-elevation-e5` already matches). It stacks the icon, the text and the actions row, in that order | the single box: padding 12px, gap 12px, radius `component.md` 10px, no elevation | Radius 10 → 16px, gains e5, becomes the inner layer |
| `Feature-icon` | 32px, round (radius 1000), at the top of the card, above the text (y 12, text at y 56) | none | New `icon` slot in a round frame, stacked above the text |
| `Text_wrap` | gap 4px; heading body-2 15/24 in `Text/high-em`; message 13/20 in `Text/low-em` (2.8–3.1:1 on the light surfaces) | matches the type; the message ink reaches 4.5:1 | None; Kimen keeps its accessible message ink (A1-D8) |
| `CTAs` | inside the card, after the text (y 120); row gap 12px: start group (tertiary sm button + secondary sm link, gap 12px), end group (secondary sm button + primary-light sm button, gap 8px); 32px buttons | none | New `actions` slot, last in the card |
| Dismiss | tertiary xs icon button, 24px, round, absolutely positioned in the card's top inline-end corner, 12px from both edges | matches the control | Placed in the corner, outside the stack |
| Tone | identical shell, card, text and dismiss in all five variants. Only the `Feature-icon` changes: frame `Surface/<tone>-base-em-alpha` at 12% (`primary` in `default`), glyph `Text/<tone>-high-em`. The primary-light action button takes `success` / `danger` in those two variants only | the whole box is tinted (`--ki-surface-<tone>-tint`) and the text is set in `--ki-text-<tone>-high-em` | The tone moves from the surface to the icon (A1-D6) |

### Proposed decisions

- **A1-D1 Anatomy.** The shell holds the card. The card stacks, 12px
  apart, the icon frame, the text (heading, then message) and the actions
  row, and holds the dismiss control in its top inline-end corner, 12px from
  both edges, outside the stack. The `alert` part stays the outermost
  element, now the shell; `card`, `icon` and `actions` are new parts. Every
  dimension, fill, blur and elevation comes from tokens, so a theme can
  flatten the alert into one box (S20, S31).
- **A1-D2 `icon` slot.** Optional and always presentational, like the
  default slot of `ki-icon-button`: hidden from assistive technology, never
  part of the announcement or of any accessible name. Meaning belongs in the
  heading and the message. With nothing slotted the frame is not rendered
  and takes no space (S21, S22, S29).
- **A1-D3 `actions` slot.** Optional. The row is the last item of the
  card, 12px after the message, outside the live region, in source order
  from the inline start. The alert never
  activates or interprets what is slotted there: an action does not dismiss
  the alert, and when the application dismisses it from an action by setting
  `dismissed`, no `ki-dismiss` fires, as for any programmatic change today.
  With nothing slotted the row is not rendered and takes no space (S23–S25,
  S28, S30).
- **A1-D4 Focus order.** Tab order follows the visual reading order: the
  dismiss control, in the card's top corner, before the actions, at its
  bottom, so DOM order and visual order agree (S27, WCAG technique C27).
- **A1-D5 Focus hand-off.** FR-013 extends to any focus inside the alert:
  when the alert stops displaying while a slotted action holds focus, focus
  moves exactly as it does from the dismiss control (S28).
- **A1-D6 Tones.** All five tones share one anatomy, and the tone is drawn
  on the icon alone, as in the master: the icon frame takes the tone's
  base-em alpha fill and the glyph its high-em ink; shell, card, heading,
  message and dismiss control look the same in every tone. The surface tint
  `ki-alert` paints today goes. Live-region urgency stays as FR-005 sets it.
  An alert without an icon therefore shows no tone colour, so the guidance
  asks for an icon on every non-neutral alert (FR-021). The alert never
  restyles slotted actions: a consumer gives a primary action its own
  `tone`, as the master does for success and danger (S26).
- **A1-D7 Preferences.** The layout follows the writing direction (S32).
  Forced colors keep the outer edge and the icon (S33). Reduced transparency
  (044) drops the shell blur and makes shell and card opaque while the card
  keeps its elevation, as 044 D2 does for floating surfaces (S34). Compact
  density (045) scales shell and card padding and gaps like every other
  container (045 D3).
- **A1-D8 Message ink.** The message keeps an ink of 4.5:1 or more on the
  card in every tone, theme and scheme; the master's `Text/low-em` (2.8–3.1:1
  on the light surfaces) is not adopted.
- **A1-D9 Room for the dismiss control.** Without an icon the heading takes
  the card's first line, which the dismiss control shares: the text then
  leaves the control's size plus the card gap at its inline end, so the two
  never overlap (S35). With an icon, the control shares the icon's row.

### Decisions on the open questions *(founder, 2026-11-19)*

The founder adopted the recommendation on each question.

1. **Which layers carry the tone?** The icon alone (A1-D6), read from the
   five variants: frame `Surface/<tone>-base-em-alpha` at 12%, glyph
   `Text/<tone>-high-em`; everything else is identical across tones.
   Iconless non-neutral alerts are guided to carry an icon (FR-021).
2. **Is the icon always decorative?** Yes (A1-D2, S29). Meaning belongs in
   the heading and the message.
3. **May actions dismiss the alert?** Not by themselves. The application
   dismisses by setting `dismissed`, focus is handed on (S28), and
   `ki-dismiss` keeps meaning "the person used the dismiss control". No
   reason payload and no declarative marker.
4. **Dismiss before or after the actions in Tab order?** Before (A1-D4,
   S27). Verified: the master places the dismiss control in the card's top
   inline-end corner and the actions at the bottom of the card.
5. **Elevation and blur of an inline alert in the flow.** The master's
   values, through tokens (S20), so a page or theme can lower them; the
   reduced-transparency mode drops the blur (S34).
6. **One `actions` slot or two?** One, in source order from the inline start
   (Art. VII). Authors who need the master's split wrap their own groups; an
   `actions-end` slot can come later as an additive change. The guidance asks
   for `size="sm"` buttons, as in the master.
7. **Does material3 keep both layers?** No: it flattens the alert to one box
   through its own token overrides (S31), keeping its 12dp container (S13).
8. **Names.** `icon` and `actions`; the `alert` part stays on the shell
   (A1-D1).

### Edge cases

- A slot that holds only whitespace counts as empty: no frame, no row.
- Adding or removing an icon or actions after the alert appears announces
  nothing; neither one is inside the live region.
- Actions are not announced. An author whose action matters to the message
  says so in the message ("Choose Stay signed in to keep working").
- An alert whose response is mandatory is a decision, not a message: it
  belongs in `ki-dialog`, never in `actions`.
- A dismissed alert hides its actions with everything else (FR-003).
- Long action labels wrap the row onto another line; the row never
  overflows the card.
- A long heading without an icon wraps before the dismiss control, never
  under it (A1-D9).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand a persistent status message (Priority: P1)

A person using an application built with Kimen encounters an important
condition — a failed save, a completed backup, a scheduled maintenance
notice — and the alert tells them what happened, where the work happens, with
a tone whose urgency is conveyed both visually and to assistive technology.
The message stays until the condition is resolved or the person acts on it.

**Why this priority**: communicating state is the entire reason the component
exists; a message a screen-reader user never hears, or whose severity is
invisible, fails the component's contract outright (Art. V).

**Independent Test**: render one alert per tone with a real message, observe
the message and the tone's appearance; make an alert appear dynamically and
observe that assistive technology announces it with the urgency matching its
tone, without focus moving.

**Acceptance Scenarios**:

1. **Given** an alert with tone `danger` and the message "We could not save
   your changes", **When** the page renders, **Then** the message is visible
   with the danger tone appearance.
2. **Given** a page where saving fails, **When** a danger alert appears,
   **Then** the message is announced immediately and focus stays where it was.
3. **Given** a page where the profile was saved, **When** a success alert
   appears, **Then** the message is announced without interrupting the
   current task.

---

### User Story 2 - Dismiss an acknowledged message (Priority: P2)

A person has read the message and clears it — with a pointer, a keyboard, or
assistive technology — through the alert's dismiss control. The alert
disappears and the page is notified exactly once, so the application can
react (persist the acknowledgement, free the space).

**Why this priority**: dismissal is the alert's only interactive behavior and
must land with full input-modality parity, but it layers on top of the
message being perceivable in the first place.

**Independent Test**: render a dismissible alert, dismiss it through each
input modality, observe the alert disappear and exactly one `ki-dismiss`
event per dismissal; clear the dismissed state and observe the alert return;
render a non-dismissible alert and observe no dismiss control and no tab
stop.

**Acceptance Scenarios**:

1. **Given** a dismissible alert, **When** the user activates the dismiss
   control, **Then** the alert is no longer displayed and the page observes
   exactly one `ki-dismiss` event.
2. **Given** a dismissible alert whose dismiss control is focused, **When**
   the user activates it from the keyboard, **Then** the same outcome is
   observed and focus moves to the next focusable element after the alert.
3. **Given** a non-dismissible alert before a "Save" button, **When** the
   user presses Tab, **Then** focus lands on the "Save" button.
4. **Given** a dismissed alert still on the page, **When** the application
   clears its dismissed state, **Then** the alert is displayed again.

---

### User Story 3 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every alert — all five tones, light and dark — restyles from the
token layer alone. No markup change, no component change, even though
Material 3 never shipped an alert of its own.

**Why this priority**: one-step re-theming is Kimen's visible differentiator,
proven in CI since 001; ki-alert is the first component whose Material 3
styling has no reference component to copy, so the token contract carries the
full weight.

**Independent Test**: render the five-tone set under onmars, declare the
material3 theme, assert every alert resolves its appearance from theme
tokens; repeat for the forced dark scheme and for a right-to-left document.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** alerts take material3 appearance with unchanged
   markup.
2. **Given** the onmars theme with a forced dark scheme, **When** the page
   renders, **Then** alerts use the dark token values.

---

### User Story 4 - An agent picks the right messaging component (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
chooses ki-alert for persistent inline messages — and NOT for transient
confirmations (future ki-toast), tiny status descriptors (ki-badge) or
blocking decisions (ki-dialog). Malformed values do not break rendering.

**Why this priority**: agent legibility is a deliverable (Art. I) and the
alert/toast/badge boundary is a known confusion point, but it builds on the
human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render an alert with an unknown tone value and observe
neutral rendering.

**Acceptance Scenarios**:

1. **Given** an alert with an unrecognized tone value, **When** the page
   renders, **Then** the alert renders with the neutral tone appearance.

---

### User Story 5 - Recognize the message and respond to it in place (Priority: P2, Amendment A1)

A person sees the alert in the MarsUI anatomy: an elevated card inside a
glass shell, an icon at its top that marks the kind of message at a glance,
and the responses the message offers ("Stay signed in", "Retry") right below
the message.
They respond with pointer or keyboard without leaving the alert; assistive
technology announces the message alone, and the icon and the actions never
pad an alert that has neither.

**Why this priority**: it brings the component to its design master and
adds the alert's one missing ability, responding in place; it builds on the
message and dismissal behavior above.

**Independent Test**: S20–S35.

### Edge Cases

- Unknown `tone` values fall back to `neutral` (agent-generated markup is not
  trusted to be valid).
- An alert present at initial page load is exposed in the accessibility tree
  with its role, but platforms only guarantee a live announcement for alerts
  that appear dynamically; the catalog documents this for authors.
- Dismissal while the dismiss control has focus: focus is never stranded on
  removed or hidden content; it moves to the next focusable element after
  the alert in document order (the previous one when none follows, the
  document body as a last resort — FR-013).
- A dismissed alert stays in the document but renders nothing and is exposed
  to no one (it leaves the accessibility tree); the page re-shows it by
  clearing the reflected dismissed state, and a re-shown alert announces as
  a dynamic appearance (FR-003).
- An empty alert (no message, no heading) announces nothing — an empty live
  region must not produce phantom announcements.
- A `heading` provided as an empty string renders no heading at all.
- Long messages wrap and the alert grows vertically; no truncation or
  ellipsis by default.
- Multiple alerts on one page are independent; each announces its own
  appearance.
- RTL documents: the message leads and the dismiss control trails the writing
  direction (logical properties only, Art. IV).
- A theme that omits an alert token must still render: component tokens
  resolve through the semantic layer cascade (missing theme stylesheet falls
  back to onmars, per the 001 contract).
- `prefers-reduced-motion`: v1 requires no motion of its own; any appear or
  dismiss transition a theme adds is disabled under reduced motion (FR-011).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Alert
  An alert keeps a person informed with a persistent inline message whose
  tone conveys urgency to eyes and assistive technology alike, and lets any
  brand restyle it through tokens alone.

  # Family: core behavior
  # S1
  Scenario: The alert presents its message with the tone's appearance
    Given an alert with tone "danger" and the message "We could not save your changes"
    When the page renders
    Then the message is visible with the danger tone appearance

  # S2
  Scenario: An optional heading introduces the message
    Given an alert with the heading "Update available" and a message body
    When the page renders
    Then the heading "Update available" is displayed before the message
    And the heading is not exposed as a document heading

  # S3
  Scenario: Dismissing the alert removes it and notifies the page
    Given a dismissible alert with the message "Backup completed"
    When the user activates the dismiss control
    Then the alert is no longer displayed
    And the page observes exactly one ki-dismiss event

  # S4
  Scenario: A non-dismissible alert offers no dismiss control
    Given an alert that is not dismissible
    When the page renders
    Then no dismiss control is present

  # S5
  Scenario: Unknown tone values fall back to the default
    Given an alert declared with an unrecognized tone value
    When the page renders
    Then the alert renders with the neutral tone appearance

  # S19
  Scenario: Clearing the dismissed state shows the alert again
    Given a dismissed alert that remains on the page
    When the page clears the alert's dismissed state
    Then the alert is displayed again with its message

  # Family: keyboard path
  # S6
  Scenario: The keyboard reaches the dismiss control with visible focus
    Given a page whose first interactive element is a dismissible alert
    When the user presses Tab
    Then the dismiss control is focused and its focus indication is visible

  # S7
  Scenario: The keyboard dismisses the focused alert
    Given a dismissible alert whose dismiss control is focused
    When the user activates it from the keyboard
    Then the alert is no longer displayed
    And the page observes exactly one ki-dismiss event

  # S8
  Scenario: A non-dismissible alert adds no tab stop
    Given a non-dismissible alert placed before a button labeled "Save"
    When the user presses Tab
    Then focus lands on the "Save" button

  # S16
  Scenario: Keyboard dismissal hands focus to the next focusable element
    Given a dismissible alert whose dismiss control is focused, placed before a button labeled "Save"
    When the user activates the dismiss control from the keyboard
    Then focus lands on the "Save" button
    And focus is not left inside the dismissed alert

  # Family: assistive-tech outcome
  # S9
  Scenario: An urgent alert is exposed assertively without moving focus
    Given a page where saving preferences fails
    When a danger alert "We could not save your changes" appears
    Then the alert is exposed to assistive technology with alert (assertive) semantics
    And focus stays where it was

  # S10
  Scenario: A calm alert is exposed as a polite status update
    Given a page where the profile was saved
    When a success alert "Profile saved" appears
    Then the alert is exposed to assistive technology with status (polite) semantics
    And focus stays where it was

  # S17
  Scenario: A warning alert is exposed with urgent semantics
    Given a page where the session is about to expire
    When a warning alert "Your session expires in one minute" appears
    Then the alert is exposed to assistive technology with alert (assertive) semantics
    And focus stays where it was

  # S18
  Scenario Outline: Calm tones are exposed as polite status updates
    Given a page publishing a service notice
    When a <tone> alert "Maintenance starts at midnight" appears
    Then the alert is exposed to assistive technology with status (polite) semantics

    Examples:
      | tone    |
      | info    |
      | neutral |

  # S11
  Scenario: The dismiss control is exposed as a named button
    Given a dismissible alert using the default dismiss label
    When the accessibility tree is queried
    Then it exposes a button whose accessible name is "Dismiss"

  # S12
  Scenario: The dismiss label is overridable for localization
    Given a dismissible alert whose dismiss label is set to "Descartar"
    When the accessibility tree is queried
    Then the dismiss control's accessible name is "Descartar"

  # Family: form participation — N/A, justified in spec.md (ki-alert is not a form control)

  # Family: theming
  # S13
  Scenario: A second theme restyles the alert through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the alert's appearance resolves from material3 token values

  # S14
  Scenario: The alert honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the alert's appearance resolves from the dark token values

  # S15
  Scenario: Alert content follows the document's writing direction
    Given a right-to-left document with a dismissible alert
    When the page renders
    Then the message leads and the dismiss control trails the writing direction

  # Amendment A1 (decided 2026-11-19): the Alert master anatomy, icon and actions
  # Family: core behavior
  # S20
  Scenario: The alert holds its content in an elevated card inside a padded shell
    Given an onmars page with an info alert "Backup completed"
    When the page renders
    Then the alert's shell has 12px of padding and 28px corners around its card
    And the card has 12px of padding, 16px corners and the level-5 elevation

  # S21
  Scenario: A slotted icon heads the card in a round 32px frame
    Given an onmars page with an alert holding an icon, the heading "Backup completed" and a message
    When the page renders
    Then the icon sits at the top of the card in a round 32px frame, above the heading
    And the heading starts 12px below the icon

  # S22
  Scenario: An alert without an icon reserves no space for one
    Given an onmars page with an alert holding the heading "Backup completed" and no icon
    When the page renders
    Then the heading starts at the top of the card, 12px from its edge

  # S23
  Scenario: Slotted actions sit in a row after the message
    Given an onmars page with an alert "Your session expires in one minute" holding the actions "Sign out" and "Stay signed in"
    When the page renders
    Then "Sign out" and "Stay signed in" are displayed in that order in one row at the bottom of the card
    And the row starts 12px below the message

  # S24
  Scenario: An alert without actions reserves no space for them
    Given an onmars page with an alert "Profile saved" holding no actions
    When the page renders
    Then the card ends 12px below the message

  # S25
  Scenario: Activating an action leaves the alert in place
    Given a dismissible alert holding the action "Retry"
    When the user activates the "Retry" action
    Then the alert is still displayed
    And the page observes no ki-dismiss event

  # S26
  Scenario Outline: Every tone keeps the same anatomy
    Given an onmars page with a <tone> alert holding an icon, the heading "Heads up", a message and the action "Review"
    When the page renders
    Then the shell, the card, the heading, the message and the dismiss control look as they do under the neutral tone
    And the icon frame and its glyph take the <tone> tone's colors

    Examples:
      | tone    |
      | info    |
      | success |
      | warning |
      | danger  |

  # S35
  Scenario: Without an icon the heading leaves room for the dismiss control
    Given an onmars page with a dismissible alert holding no icon and a heading long enough to fill its line
    When the page renders
    Then the heading wraps before it reaches the dismiss control
    And no part of the heading sits under the dismiss control

  # Family: keyboard path
  # S27
  Scenario: Tab reaches the dismiss control and then the actions, in reading order
    Given a page whose first interactive element is a dismissible alert holding the actions "Sign out" and "Stay signed in"
    When the user tabs through the alert
    Then focus visits the dismiss control, "Sign out" and "Stay signed in", in that order

  # S28
  Scenario: Dismissing the alert from a focused action hands focus to the next element
    Given an alert whose focused action "Undo" makes the application dismiss it, placed before a button labeled "Save"
    When the user activates "Undo" from the keyboard
    Then the alert is no longer displayed
    And focus lands on the "Save" button
    And the page observes no ki-dismiss event

  # Family: assistive-tech outcome
  # S29
  Scenario: The icon is never part of the announcement
    Given a page where a payment fails
    When a danger alert appears holding an icon labeled "Error", the heading "Payment failed" and the message "Your card was declined"
    Then the alert's live region exposes only "Payment failed" and "Your card was declined"
    And the icon is hidden from assistive technology

  # S30
  Scenario: Actions are reachable buttons outside the announcement
    Given a page where the session is about to expire
    When a warning alert "Your session expires in one minute" appears holding the action "Stay signed in"
    Then the alert's live region exposes only "Your session expires in one minute"
    And a button named "Stay signed in" is exposed after the live region

  # Family: theming
  # S31
  Scenario: A theme flattens the shell and the card into one box through tokens alone
    Given a page whose theme gives the alert shell no padding, fill or blur and the card no elevation
    When the page renders
    Then the alert paints as one box with the card's corners and no frame around it

  # S32
  Scenario: Icon, dismiss control and actions follow a right-to-left document
    Given a right-to-left document with a dismissible alert holding an icon and the actions "Sign out" and "Stay signed in"
    When the page renders
    Then the icon sits at the top right of the card and the dismiss control in its top left corner
    And "Sign out" is the rightmost action

  # S33
  Scenario: Under forced colors the alert keeps its edge and a visible icon
    Given forced colors are active and an info alert holding an icon drawn in the current text color and the action "Review"
    When the page renders
    Then the alert's outer edge is drawn in the forced text color
    And the icon is painted in the forced text color

  # S34
  Scenario: Reduced transparency makes the shell opaque and keeps the card raised
    Given an onmars dark page with an info alert holding an icon
    When the page renders under a "reduce" transparency system preference
    Then the shell and the card paint opaque surfaces without blurring what is behind them
    And the card keeps its elevation
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S19, S20, S21, S22, S23, S24, S25, S26, S35 | |
| Keyboard path | S6, S7, S8, S16, S27, S28 | |
| Assistive-tech outcome | S9, S10, S11, S12, S17, S18, S29, S30 | |
| Form participation | | N/A — ki-alert is a feedback message, not a form control: it holds no user-entered value, submits nothing and is not form-associated (the charter's form-associated set for this batch is input, textarea, select, checkbox, radio-group, switch). |
| Theming | S13, S14, S15, S31, S32, S33, S34 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The alert MUST expose a `tone` attribute with exactly five
  semantic values — `neutral` (default), `success`, `danger`, `info`,
  `warning` — describing the message's intent, never its appearance. There
  is no `variant`: the alert has no emphasis scale, and filled-vs-outlined
  surface styling is a theme/token decision, never an attribute.
- **FR-002**: The message MUST compose through the default slot. An optional
  `heading` attribute renders a title for the message as emphasized text
  exposed through the `heading` part — never as a document heading element,
  because from inside its own shadow tree the component cannot know the
  correct outline level for the host page (an opt-in heading-level
  attribute is a possible future additive change). When absent or empty, no
  heading is rendered.
- **FR-003**: Dismissal MUST be opt-in via a boolean `dismissible`
  attribute. When set, the alert renders a single dismiss control;
  activating it (pointer, Enter or Space) dismisses the alert and dispatches
  exactly one `ki-dismiss` event (bubbling, composed) per dismissal.
  `ki-dismiss` carries no detail payload (`detail: null`) in v1; any future
  payload is an additive MINOR change. A dismissed alert reflects a
  `dismissed` attribute on its host, stays in the document, renders nothing
  and is exposed to no one — it leaves the accessibility tree entirely.
  Removing the `dismissed` attribute displays the alert again; a re-shown
  alert behaves as a dynamically appearing alert (FR-005). When
  `dismissible` is not set, no dismiss control exists and the alert
  contributes nothing to the tab order.
- **FR-004**: The dismiss control's accessible name MUST come from a
  `dismiss-label` attribute defaulting to the English "Dismiss"; no
  user-visible or accessible string is hardcoded (Art. IV).
- **FR-005**: Live-region exposure MUST match tone urgency: `danger` and
  `warning` alerts are exposed assertively (alert semantics, announced
  immediately); `neutral`, `success` and `info` alerts are exposed politely
  (status semantics, announced without interrupting). The live region
  scopes the heading and message only — the dismiss control (when present)
  sits outside its boundary, so the control's accessible name is never
  announced as part of the message. An appearing alert never moves focus.
- **FR-006**: The alert itself MUST NOT be focusable and MUST NOT trap
  focus; the dismiss control (when present) is its only interactive part and
  shows clearly visible focus in every theme.
- **FR-007**: Unrecognized `tone` values MUST fall back to `neutral` without
  breaking rendering.
- **FR-008**: Every visual property (color per tone, spacing, radius,
  typography, dismiss-control states) MUST resolve from `--ki-alert-*`
  component tokens layered over the semantic token layer; zero hardcoded
  visual values.
- **FR-009**: The component MUST expose `alert`, `heading`, `message` and
  `dismiss` parts for the customization ladder (tokens first, then parts,
  then slots).
- **FR-010**: Layout MUST follow the document's writing direction using
  logical properties only: the message leads and the dismiss control trails
  in both LTR and RTL (Art. IV).
- **FR-011**: v1 ships no required motion; any appear/dismiss transition a
  theme adds through tokens MUST be disabled under `prefers-reduced-motion`.
- **FR-012**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance distinguishing ki-alert from the
  future ki-toast (transient), ki-badge (tiny status descriptor) and
  ki-dialog (blocking decision).
- **FR-013**: Dismissing an alert whose dismiss control holds focus MUST NOT
  strand focus on removed or hidden content: focus moves to the next
  focusable element after the alert in document order; when none follows,
  to the previous focusable element; when the document offers neither, to
  the document body.

Amendment A1 (decided 2026-11-19):

- **FR-014** *(amends FR-002, FR-009)*: The alert MUST render a shell that
  holds a card; the card MUST stack, 12px apart, the icon frame, the heading
  and message, and the actions row, and MUST hold the dismiss control in its
  top inline-end corner outside that stack. The `alert` part names the
  shell; `card`, `icon` and `actions` are new parts.
- **FR-015** *(amends FR-008)*: Every dimension, fill, blur and elevation of
  the shell, the card, the icon frame and the actions row MUST resolve from
  `--ki-alert-*` tokens, so a theme flattens the alert into one box without
  markup changes. The onmars values are the master's (Amendment A1 table).
  No existing `--ki-alert-*` token is removed or renamed.
- **FR-016**: An optional `icon` slot MUST render its content in a round
  frame at the top of the card, above the text. The content is presentational: hidden from
  assistive technology, never part of the live region or of any accessible
  name. With nothing slotted, the frame MUST NOT render or take space.
- **FR-017** *(amends FR-005)*: An optional `actions` slot MUST render its
  content in source order in a row at the bottom of the card, after the
  message and outside the live region. The alert MUST NOT activate, intercept or
  interpret that content. With nothing slotted, the row MUST NOT render or
  take space, gap included.
- **FR-018** *(amends FR-006)*: Tab order MUST follow the visual reading
  order: the dismiss control, then the actions in source order. The alert
  itself stays unfocusable.
- **FR-019** *(amends FR-013)*: When the alert stops displaying while focus
  is anywhere inside it, on the dismiss control or on a slotted action, by
  user dismissal or by the application setting `dismissed`, focus MUST move
  as FR-013 describes. `ki-dismiss` still fires only when the person
  activates the dismiss control.
- **FR-020** *(amends FR-010, FR-011)*: The icon MUST sit at the inline
  start of its row, the dismiss control in the top inline-end corner, and
  the actions MUST run from the inline start. Under forced colors the outer edge MUST be drawn in
  the forced text color and the icon MUST stay visible. Under reduced
  transparency (044) the shell MUST drop its blur and the shell and card
  MUST paint opaque while the card keeps its elevation. Under compact
  density (045) shell and card padding and gaps MUST scale like any other
  container.
- **FR-021** *(amends FR-012)*: The public contract MUST say when to use the
  two slots and when not: the icon never carries meaning the text lacks;
  actions are responses to this message, slotted as `size="sm"` buttons, and
  a response the person cannot skip belongs in `ki-dialog`. Every
  non-neutral alert should carry an icon: it is where the tone is drawn.
- **FR-022** *(amends FR-001, FR-008)*: The tone MUST be drawn on the icon
  alone: its frame takes the tone's base-em alpha fill and its glyph the
  tone's high-em ink, while shell, card, heading, message and dismiss
  control resolve to the same values in every tone. The alert MUST NOT
  restyle slotted actions.
- **FR-023**: The message MUST keep an ink of 4.5:1 or more against the card
  in every tone, theme and scheme. Without an icon, the heading MUST leave
  room at its inline end for the dismiss control and never sit under it.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): new element `ki-alert` (attributes:
  `tone`, `heading`, `dismissible`, `dismiss-label`, plus the reflected
  dismissed-state attribute `dismissed`; slot: default; event: `ki-dismiss`
  — bubbling, composed, no detail payload (`detail: null`) in v1; parts:
  `alert`, `heading`, `message`, `dismiss`; component tokens:
  `--ki-alert-*`). No sub-components. Additive change; catalog and
  llms.txt regenerate with the new entry.
- **Bundle budget** (Art. IV): single-digit KB gzipped marginal cost; no new
  runtime dependency ("none").
- **Accessibility** (Art. V): APG Alert pattern (live region). The live
  region scopes the heading and message only, with the dismiss control
  outside its boundary (FR-005) — precisely the point where the APG Alert
  pattern is most commonly implemented wrong. The dismiss control reuses
  the button pattern established in 002, so no new keyboard interaction
  pattern is introduced and no full APG walkthrough is required. HOWEVER,
  live-region announcement behavior (assertive vs polite per tone,
  announce-on-appear, no focus steal) cannot be observed by automated
  audits: the Gherkin (S9, S10, S17, S18) asserts the accessibility-tree
  exposure, and a manual screen-reader verification of the actual
  announcements is documented in the PR — checking that each announcement
  contains only the heading and message, never the dismiss control's name.
  axe zero violations across tone × dismissible × theme × scheme.
- **Tokens** (Art. VI): new component token family `--ki-alert-*` in the
  component layer, both themes (onmars, material3): structural tokens
  (`--ki-alert-{padding-inline|padding-block|gap|radius|font-size|...}` plus
  heading typography), per-tone color tokens
  (`--ki-alert-{tone}-{bg|fg|border}`), dismiss-control state tokens
  (`--ki-alert-dismiss-{rest|hover|active}-fg`) and
  `--ki-alert-focus-ring-{color|width|offset}`. All resolve from the
  semantic layer — the info and warning ramps shipped in 001 are consumed by
  a component for the first time. No semantic-layer deltas are anticipated;
  if the contrast gate forces any (002 precedent), they will be declared for
  founder sign-off at the merge gate.
- **Catalog/agent legibility** (Art. I): when-to-use — a persistent inline
  message about the state of a page or section (failed save, completed
  operation the user should notice, service notice) that remains until
  resolved or dismissed; severity is expressed by `tone`. When NOT to use —
  transient action confirmations that expire on their own (future ki-toast,
  the Material 3 snackbar's territory), tiny status descriptors attached to
  another element (ki-badge), messages requiring a blocking decision
  (ki-dialog), inline field-level validation text (belongs to the form
  control).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched.

Amendment A1 (decided 2026-11-19):

- **Public API delta** (Art. IX): additive. Slots `icon` and `actions`;
  parts `card`, `icon`, `actions`; new component tokens for the shell
  (padding, gap, radius, fill, blur), the card (fill, elevation), the icon
  frame (size, radius, and fill and ink per tone) and the actions row (gap),
  final names fixed at implementation; the per-tone surface tints of the
  box stop painting and follow the deprecation path of spec 041. The existing structural tokens keep describing
  the card, whose values their descriptions already cite; `--ki-alert-radius`
  changes value from 10px to 16px. Declared in `changes/api/` with the
  implementation.
- **Bundle budget** (Art. IV): two slots, two wrappers and their styles; no
  runtime dependency.
- **Accessibility** (Art. V): the APG Alert pattern is unchanged; content
  outside the live region is new. A manual screen-reader pass, documented in
  the implementation PR, checks that announcements carry only the heading
  and the message (S29, S30). The actions are the author's own controls; no
  new interaction pattern.
- **Tokens** (Art. VI): component layer only, onmars and material3; the
  shell and card reuse the semantic `--ki-elevation-e5` and
  `--ki-effect-component-backdrop-blur`. No semantic-layer delta expected.
- **Catalog/agent legibility** (Art. I): the generated catalog and
  `llms.txt` gain the two slots and the guidance of FR-021.
- **Guardrail/security boundary** (Art. VIII): none; slotted children pass
  the renderer's existing slot checks.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: a person can perceive the message and its severity in 100% of
  the tone × theme × scheme matrix (5 tones, 2 themes, light and dark), with
  zero hardcoded visual values.
- **SC-002**: a dismissible alert can be dismissed via pointer and keyboard,
  each dismissal producing exactly one `ki-dismiss` notification; keyboard-only
  operation covers 100% of the behavior available to pointer users.
- **SC-003**: dynamically appearing alerts are announced by assistive
  technology with the urgency class matching their tone in 100% of tones,
  with zero focus moves; the exposure class is asserted per tone in the
  accessibility tree, and the announcements themselves are verified by a
  documented manual screen-reader pass.
- **SC-004**: switching the document theme (onmars ↔ material3) restyles
  every alert with zero markup or component changes — only the theme
  declaration differs.
- **SC-005**: zero accessibility violations across the full matrix in
  automated auditing.
- **SC-006**: the component's marginal cost stays in single-digit KB
  (gzipped) and within the declared budget gate.
- **SC-007**: an alert with an unknown tone renders as neutral in 100% of
  cases; rendering never breaks on malformed input.
- **SC-008** *(A1)*: across tone × theme × scheme, every alert renders the
  shell and card anatomy from tokens alone, and an absent icon or actions
  slot adds 0px.
- **SC-009** *(A1)*: in 100% of tones, the announcement of an alert holding
  an icon and actions contains only its heading and message.
- **SC-010** *(A1)*: zero accessibility violations across tone × {icon,
  actions, both, neither} × theme × scheme in automated auditing.

## Assumptions

- Urgency mapping (FR-005): `danger` and `warning` are assertive; `neutral`,
  `success` and `info` are polite. This is the common industry mapping, but
  whether `warning` should interrupt is a product call — flagged for the
  founder at gate 1. The mapping is encoded tone by tone in the contract
  (S9, S10, S17, S18), so the gate-1 decision lands in the Gherkin: if the
  founder flips `warning` to polite, S17 is amended before approval.
- On dismissal the component hides itself AND emits `ki-dismiss`; the event
  is not cancelable in v1. The dismissed state is reflected as a `dismissed`
  attribute (FR-003): the host stays in the document, renders nothing and
  leaves the accessibility tree; the application re-shows the alert by
  removing the attribute (or by re-inserting a fresh element), and a
  re-shown alert re-announces as a dynamic appearance. Applications that
  prefer to control removal can listen and remove the element themselves —
  flagged for the founder at gate 1 as the main API-semantics decision.
- The heading is emphasized text, not a document heading element (FR-002):
  from inside its shadow tree the component cannot know which outline level
  fits the host page, so v1 injects none. An opt-in heading-level attribute
  is a possible future additive MINOR change — flagged for the founder at
  gate 1.
- No `variant` and no `size` in v1 (charter deviation justified): Material 3
  lacks the component entirely, and MarsUI verification 2026-07-08 reported
  no alert frame at all. **The MarsUI half of that justification is refuted
  (correction 2026-07-25): the master `Alert 12074:6202` exists with 5
  variants and 10 properties, which may themselves establish an emphasis or
  size scale. The decision stands as written but rests on a refuted premise
  and must be re-derived from an extraction of that master — a founder
  call.** Both axes would be additive MINOR changes later.
- No tone icon and no `start`/`end` slots in v1: MarsUI verification
  2026-07-08 reported no alert frame, and the icon evidence recorded here
  comes from the separate transient `Toast` `12071:5771`. **That
  verification is refuted (correction 2026-07-25) — `Alert 12074:6202` is
  the master, and whether it carries a leading tone icon or leading/trailing
  content is unextracted, so this exclusion rests on a refuted premise and
  needs re-derivation.** If that anatomy is ever inherited by the persistent
  alert it lands as a theme token or an additive slot — per the recorded
  assumption this is additive MINOR post-v1. **Superseded by Amendment A1
  (decided 2026-11-19): the master carries a `Feature-icon` at the top of
  the card and a `CTAs` row at its bottom, and A1 adds them as the `icon`
  and `actions` slots.**
- No auto-dismiss timer: time-based disappearance is toast behavior and
  explicitly out of scope (charter: M3 snackbar maps to the future
  ki-toast).
- Default `dismiss-label` is the English "Dismiss", overridable per Art. IV;
  the component never hardcodes user-facing strings.
- Alerts present at initial page load are exposed in the accessibility tree
  but not guaranteed a live announcement (platform live-region behavior);
  the catalog documents that dynamic insertion is what triggers
  announcements.
- The Material 3 theme styles ki-alert from its container/on-container color
  roles even though M3 ships no alert component; this loose mapping is a
  deliberate scope decision documented in the catalog, not an omission.
