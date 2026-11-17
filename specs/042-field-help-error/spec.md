# Feature Specification: Field help and error text

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, with Arts. I, IV, V, VI, VIII and IX. -->

**Feature Branch**: `claude/feat-field-help-error-3c8733` (spec `042-field-help-error`)

**Created**: 2026-11-17

**Status**: Draft, waiting for founder confirmation of D1–D9

**Input**: No Kimen form control can show help text or an error message.
`ki-input` exposes only its `start` and `end` slots; a blocked submission
paints the invalid ring (`:state(user-invalid)`) and the browser's bubble,
and nothing else. WCAG 2.2 3.3.1 asks that a detected input error be
described in text, and 3.3.2 that the expected input be explained. The
MarsUI masters already carry the missing piece: `Input_field` `12022:7132`
composes `Hint_label` `12021:6331`, one line under the field that turns to
the danger ink in the danger state. Spec 036 (`checkValidity`,
`setCustomValidity` and the rest) is on `main` and is the validity source
this feature displays.

**Constitution check**: a public API addition on six existing components
(Art. II, IX), a new accessible pattern for describing and announcing
errors (Art. V), and new catalog props an agent can fill (Art. I, VIII). No
guardrail or security boundary changes: the renderer already passes string
props through its existing checks.

## Evidence gathered *(2026-11-17)*

Measured in Chromium 156 (Playwright's `chromium-1248`) with CDP
`Accessibility.getFullAXTree`, on plain custom elements and on the built
Kimen controls. Scripts in the session scratchpad; results summarized here.

| # | Setup | Description exposed | Invalid exposed |
|---|---|---|---|
| E1 | inner input → `aria-describedby` → shadow `div` that wraps a named `<slot>` with light-DOM text | slotted text (flat tree) | — |
| E2 | inner input → `aria-describedby` → shadow `div` holding prop text | prop text | — |
| E3 | `aria-describedby="error help"`, both in shadow | `error help`, in IDREF order | `aria-invalid` honored |
| E4 | `aria-describedby` → shadow `div` with `hidden` and stale text | **the stale text** (a hidden node is still read when referenced) | — |
| E5 | `aria-describedby` → wrapper of a slot with nothing assigned | none | — |
| E6 | `aria-errormessage` | relation exposed, **not** part of the description | — |
| E7 | `role=radiogroup` in shadow → `aria-describedby` → shadow text | text | `aria-invalid` honored |
| E8 | inner input `ariaDescribedByElements = [light-DOM node]` | works when the node is slotted; nothing when unslotted | — |
| E9 | native checkbox `required`, untouched | — | **invalid**, before any interaction |
| E10 | native input with a custom error or a type mismatch, untouched | — | **invalid**, before any interaction |
| E11 | any of E9/E10 with `aria-invalid="false"` | — | not invalid (the attribute wins) |
| E12 | Kimen `main` (692cbb2): blocked submission of a required, empty `ki-input` / `ki-textarea` | none | **not invalid** (ring painted, tree silent) |
| E13 | Kimen `main`: `ki-select`, `ki-radio-group` after a blocked submission | none | invalid (they set `aria-invalid`) |

Token contrast, measured with `packages/tokens/scripts/check-contrast.mjs`
helpers against `--ki-surface-s0/s1/s2` in the four theme × scheme pairs:

| Ink | onmars light | onmars dark | material3 light | material3 dark |
|---|---|---|---|---|
| `--ki-text-med-em` (help) | 6.22 / 5.91 / 5.56 | 10.2 / 9.72 / 9.46 | 8.88 / 8.47 / 8.13 | 10.91 / 10.02 / 9.56 |
| `--ki-text-danger-high-em` (error) | 5.49 / 5.22 / 4.91 | 9.19 / 8.47 / 8.08 | 8.66 / 8.26 / 7.93 | 10.89 / 10.0 / 9.54 |
| `--ki-text-danger` (rejected) | **3.51 / 3.34 / 3.14** | 6.59 / 6.07 / 5.79 | 6.21 / 5.93 / 5.69 | 10.89 / 10.0 / 9.54 |

`software-rag` was consulted twice (inline-error timing, slots versus props)
and returned nothing on topic; the decisions below rest on the platform,
WCAG 2.2, the APG and the shipped practice of other web-component systems.

## Decisions *(proposed; founder confirmation pending)*

- **D1 API shape: two text props, no slots.** `help-text` on all six
  controls; `error-text` on the five that have constraints of their own
  (`ki-switch` has none, see D7). Reasons: the GenUI catalog and every
  framework wrapper pass a string prop with no `<span slot>` holder; the
  catalog validates it like `label`; the text renders inside the shadow root,
  so the description does not depend on each engine computing names through
  slots (E1 works in Chromium, but E2 is engine-independent and avoids the
  WebKit/Gecko flat-tree risk until the release matrix proves otherwise);
  and Art. VII rejects building both surfaces before anyone needs rich help
  content. A `help` slot can be added later as a MINOR change (E1 shows the
  wiring works). Material Web (`supporting-text`, `error-text`) and Ionic
  (`helper-text`, `error-text`) ship props; Shoelace and Carbon ship both.
- **D2 Accessible wiring.** The element that carries the role (inner input,
  textarea, combobox trigger, checkbox, switch, or the `radiogroup`) points
  `aria-describedby` at the help or error node in the same shadow root, and
  only while that node has text and is shown (E4: a hidden node keeps being
  read). No `aria-errormessage` (E6: not in the description, and screen
  reader support is uneven), no element reflection, no Reference Target
  (Art. IV).
- **D3 When the error shows.** Exactly while the control is in its
  existing `user-invalid` state: after the user commits an invalid answer
  (leaving the field, toggling), after a blocked submission, or after
  `checkValidity()`/`reportValidity()`. It disappears in the same task the
  answer becomes valid, on reset and on disable. An untouched control shows
  nothing, matching the `:user-invalid` timing the invalid ring already
  follows.
- **D4 Which message.** The line shows the control's `validationMessage`,
  which becomes, in order: the application's error (`setCustomValidity`),
  else `error-text`, else the browser's message. `error-text` therefore also
  replaces the browser's text in its bubble and in `validationMessage`, while
  the validity flags stay native (`valueMissing`, `typeMismatch`). This
  fixes the language mismatch of browser messages (a Spanish page under an
  English browser) without a hardcoded string (Art. IV).
- **D5 The error takes the help text's place.** One line under the control,
  as in `Hint_label`: help in `--ki-text-med-em`, replaced by the error in
  `--ki-text-danger-high-em` while the error shows; the description follows
  what is visible. Guidance tells authors to write `error-text` that says
  how to fix the answer (WCAG 3.3.3), since the help is hidden meanwhile.
  Material 3, Carbon and Spectrum replace; GOV.UK and USWDS stack both.
- **D6 Invalid exposure and announcement.** While the error shows, the
  control sets `aria-invalid="true"`; otherwise `aria-invalid="false"`, which
  also stops Chromium flagging untouched controls as invalid (E9–E11) and
  fixes E12. The error node is a polite live region, so an error that appears
  when the user leaves a field reaches a screen reader without moving focus
  (WCAG 4.1.3; technique ARIA19 without the assertive `alert`). A blocked
  submission keeps the platform behavior: the first invalid control gets
  focus and the browser bubble, and its description carries the error.
- **D7 `ki-switch`.** `help-text` only. Its error line shows an error the
  application sets; it has no constraint whose message `error-text` could
  replace.
- **D8 Non-color cue.** The error line starts with a decorative error glyph
  (`aria-hidden`, `currentColor`), so the error stays distinct from help text
  under forced colors and for people who do not perceive the red (WCAG
  1.4.1). Help text carries no glyph.
- **D9 Styling.** Semantic tokens only, no new tokens: `--ki-text-med-em`
  (help), `--ki-text-danger-high-em` (error, glyph), the existing typography
  and space scale. The MarsUI hint red (danger-500, `--ki-text-danger`) reads
  3.51:1 on the onmars light page, so the error uses the high-emphasis danger
  ink, a declared a11y deviation like the placeholder one. Help under a
  disabled control follows that control's disabled ink. New parts `help` and
  `error` join `label` and `field` in each control's anatomy (Art. VI order:
  tokens, then parts).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Learn what to enter (Priority: P1)

A person filling a form reads, and hears, a short line that explains what a
field expects before answering it.

**Independent Test**: S1, S2, S16.

### User Story 2 - Learn what went wrong and how to fix it (Priority: P1)

When an answer fails, the person sees and hears a message in the control's
own line, and it goes away as soon as the answer is right.

**Independent Test**: S3–S8, S11–S15, S17.

### User Story 3 - Write the text from the application or an agent (Priority: P2)

An application sets server-side errors that win over the field's own text;
an agent writes help and error text through the catalog.

**Independent Test**: S9, S10, S18.

### Edge Cases

- A control with both a constraint failure and an application error shows
  the application's message (S10), like `validationMessage` in spec 036.
- `help-text=""` or whitespace-only text renders nothing and adds nothing to
  the description.
- A control whose error is showing and whose `error-text` changes shows the
  new text at once.
- A disabled fieldset disables the control: no error, help in the disabled
  ink.
- A readonly required `ki-input` is barred from validation (003 S27) and
  never shows an error.
- `ki-radio-group` describes the `radiogroup`, not each radio; the error
  anchor for the bubble stays the tab-stop radio (036).
- The lazy loader limitation of spec 036 (D2) does not apply: props exist on
  loader hosts.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Field help and error text
  Every form control can carry a line of help text and shows an error message
  in its place once the user's answer fails. Both are read out with the
  control by assistive technology, so people learn what to enter and how to
  fix it, and an application or an agent writes both through plain text props.

  Rule: Help text guides the answer

    # S1
    Scenario Outline: A control's help text is shown with it and describes it
      Given a <control> labeled "Answer" with the help text "You can change this later"
      When the control receives focus
      Then "You can change this later" is shown with the control
      And the accessibility tree exposes the control with the description "You can change this later"

      Examples:
        | control        |
        | ki-input       |
        | ki-textarea    |
        | ki-select      |
        | ki-checkbox    |
        | ki-switch      |
        | ki-radio-group |

    # S2
    Scenario: Removing the help text removes it from the description
      Given a ki-input labeled "Email" with the help text "We never share your email"
      When the application removes the help text
      Then no help text is shown with the field
      And the accessibility tree exposes the field with no description

  Rule: The error message takes the help text's place once the answer fails

    # S3
    Scenario: Tabbing away from an invalid answer shows the error message
      Given a ki-input labeled "Email" of kind email with the error text "Enter an email address like name@example.com"
      And the user has typed "ana@" into the field
      When the user presses Tab
      Then "Enter an email address like name@example.com" is shown with the field
      And the field is exposed to assistive technology as invalid

    # S4
    Scenario Outline: A blocked submission shows the error of each unanswered required control
      Given a form with a required <control> labeled "Answer" left unanswered, with the error text "Answer this question"
      When the user submits the form
      Then the form is not submitted
      And "Answer this question" is shown with the control

      Examples:
        | control        |
        | ki-input       |
        | ki-textarea    |
        | ki-select      |
        | ki-checkbox    |
        | ki-radio-group |

    # S5
    Scenario Outline: A control the user has not answered yet shows no error
      Given a required <control> labeled "Answer" with the error text "Answer this question" that the user has not answered
      When the user tabs past the control
      Then no error is shown with the control
      And the control is not exposed to assistive technology as invalid

      Examples:
        | control     |
        | ki-input    |
        | ki-checkbox |

    # S6
    Scenario: Correcting the answer brings the help text back at once
      Given the "Email" field shows the error "Enter an email address like name@example.com" in place of its help text "We never share your email"
      When the user completes the answer to "ana@example.com"
      Then "We never share your email" is shown with the field
      And no error is shown with the field
      And the field is not exposed to assistive technology as invalid

    # S7
    Scenario: Without error text a control shows its own validation message
      Given a form with a required ki-input labeled "Email" left empty and no error text
      When the user submits the form
      Then the message shown with the field is the field's validation message

    # S8
    Scenario: The error text becomes the control's validation message
      Given a required ki-input labeled "Email" left empty, with the error text "Enter your email"
      When the application checks the control's validity
      Then the control reports "Enter your email" as its validation message
      And the control still reports the reason "value missing"

    # S9
    Scenario Outline: An error set by the application is shown when the form is submitted
      Given a form with a <control> labeled "Answer" holding an otherwise valid answer
      And the application sets the error "Choose another answer" on the control
      When the user submits the form
      Then "Choose another answer" is shown with the control

      Examples:
        | control        |
        | ki-input       |
        | ki-textarea    |
        | ki-select      |
        | ki-checkbox    |
        | ki-switch      |
        | ki-radio-group |

    # S10
    Scenario: An error set by the application outranks the error text
      Given a form whose ki-input "Email" holds "ana@example.com" and carries the error text "Enter your email"
      And the application sets the error "Already registered" on the control
      When the application reports the control's validity
      Then "Already registered" is shown with the field
      And the control reports "Already registered" as its validation message

    # S11
    Scenario: Disabling a control clears its error
      Given a form whose required ki-input "Email" shows the error "Enter your email"
      When the application disables the control
      Then no error is shown with the field
      And the field is not exposed to assistive technology as invalid

  Rule: Assistive technology learns of the error

    # S12
    Scenario: The error is announced politely when it appears
      Given a ki-input labeled "Email" of kind email with the error text "Enter an email address like name@example.com"
      And the user has typed "ana@" into the field
      When the user leaves the field
      Then "Enter an email address like name@example.com" is announced as a polite status message

    # S13
    Scenario: A blocked submission lands on the first invalid control with its error as description
      Given a form whose first field "Email" is required, left empty and carries the error text "Enter your email"
      When the user submits the form
      Then focus is on the "Email" field
      And the accessibility tree exposes it as invalid with the description "Enter your email"

  Rule: Resetting the form clears the error

    # S14
    Scenario: Resetting the form clears the error and restores the help text
      Given a form whose "Email" field shows the error "Enter your email" in place of its help text "We never share your email"
      When the user resets the form
      Then "We never share your email" is shown with the field
      And no error is shown with the field

  Rule: Help and error restyle through semantic tokens alone

    # S15
    Scenario: Reassigning the semantic danger ink restyles the error message
      Given a page themed with --ki-text-danger-high-em set to "#7a1fa2"
      And a form with a required ki-input labeled "Email" left empty, with the error text "Enter your email"
      When the user submits the form
      Then the error message renders in "#7a1fa2"

    # S16
    Scenario: Reassigning the semantic medium-emphasis ink restyles the help text
      Given a page themed with --ki-text-med-em set to "#7a1fa2"
      And a ki-input labeled "Email" with the help text "We never share your email"
      When the user types "ana" into the field
      Then the help text renders in "#7a1fa2"

    # S17
    Scenario: Under forced colors the error is marked by a symbol, not by color alone
      Given forced colors are active
      And a form with a required ki-input labeled "Email" left empty, with the error text "Enter your email"
      When the user submits the form
      Then the error message is preceded by an error symbol painted in the forced text color

  Rule: An agent writes help and error text through the catalog

    # S18
    Scenario: A generated field carries its help and error text
      Given a generated UI spec with a ki-input labeled "Email" carrying the help text "We never share your email" and the error text "Enter your email"
      When the guarded renderer renders the spec
      Then the spec is accepted
      And the rendered field is described by "We never share your email"
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S6, S7, S8, S9, S10, S11, S18 | |
| Keyboard path | S3, S5 | |
| Assistive-tech outcome | S1, S5, S12, S13 | |
| Form participation | S4, S14 | |
| Theming | S15, S16, S17 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `ki-input`, `ki-textarea`, `ki-select`, `ki-checkbox`,
  `ki-switch` and `ki-radio-group` MUST accept a `help-text` string prop and
  render it as one line with the control.
- **FR-002**: The same controls except `ki-switch` MUST accept an
  `error-text` string prop.
- **FR-003**: Each control MUST show an error line exactly while it is in
  its `user-invalid` state, with the text of `validationMessage`, and hide
  the help line meanwhile.
- **FR-004**: `validationMessage` MUST resolve to the application's error,
  else `error-text`, else the browser's message; the validity flags MUST stay
  those of the failing native constraint.
- **FR-005**: The element that carries the control's role MUST reference
  the visible help or error line through `aria-describedby` and MUST NOT
  reference a hidden or empty line.
- **FR-006**: The control MUST expose `aria-invalid="true"` while its error
  shows and `aria-invalid="false"` otherwise.
- **FR-007**: The error line MUST be a polite live region that exists before
  its text is inserted.
- **FR-008**: The error line MUST start with a decorative error glyph painted
  in `currentColor`.
- **FR-009**: Help and error MUST be styled from semantic tokens only
  (`--ki-text-med-em`, `--ki-text-danger-high-em`), with logical properties,
  and expose the parts `help` and `error`.
- **FR-010**: The props MUST be documented with when-to-use and
  when-NOT-to-use guidance, and the generated catalog, `llms.txt` and
  framework wrappers MUST carry them (Art. I).
- **FR-011**: The token contrast gate MUST check `--ki-text-danger-high-em`
  and `--ki-text-med-em` against `--ki-surface-s1` as well as `s0`.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): 11 props (`help-text` × 6, `error-text` × 5)
  and 12 parts (`help`, `error` × 6); behavior change in `validationMessage`
  when `error-text` is set, and in `aria-invalid` on untouched controls
  (E9–E12). Additive, MINOR. Declared in `changes/api/`.
- **Bundle budget** (Art. IV): one text node, one glyph and a few lines of
  wiring per control; no runtime dependency.
- **Accessibility** (Art. V): new pattern (described and announced field
  errors); the PR documents a manual walkthrough with VoiceOver and the
  Chromium accessibility tree.
- **Tokens** (Art. VI): no new tokens; two semantic inks, existing type and
  space scale; one declared deviation from the MarsUI danger-500 hint ink.
- **Catalog/agent legibility** (Art. I, VIII): the generated catalog gains
  the props; no protocol type enters `@kimen/elements`; the guardrail is
  unchanged.
- **Guardrail/security boundary** (Art. VIII): none. Strings render as text
  nodes, never as markup.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every scenario S1–S18 passes in Chromium for every control it
  names.
- **SC-002**: axe-core reports no new violation on the controls with help
  and error showing, in the four theme × scheme pairs and under forced
  colors.
- **SC-003**: The contrast gate passes with the two inks on `s0` and `s1` in
  the four theme × scheme pairs.

## Assumptions

- `ki-option`, `ki-radio` and `ki-button` get no help or error line.
- A declarative way for an agent to mark a field invalid with a server
  message (no `setCustomValidity` call) is out of scope; see the founder
  questions in the PR.
- Density and `prefers-contrast` treatment of the new lines belong to specs
  043–045, which restyle these same components.
