# Feature Specification: A loading state for ki-button and ki-icon-button

**Feature Branch**: `feat/issue-317-button-loading` (spec `046-button-loading`)

**Created**: 2026-11-19

**Status**: Confirmed — decisions D1–D9 accepted by the founder on 2026-11-19 (issue #317)

**Input**: Issue #317. The `disabled` documentation of `ki-button` and
`ki-icon-button` says not to use it for pending or loading semantics, but the
library offers no alternative. Consumers fall back to `disabled`, which takes
the button out of the Tab order, drops focus from it and announces nothing,
or they build their own spinners. The issue asks for a boolean that keeps
the button's width and focus, blocks activation and form submission through
`aria-disabled="true"` rather than `disabled`, draws a token-sized spinner
with the circular `ki-progress` geometry, tells assistive technology the
action is in progress with a visually hidden status message (`aria-busy`
alone has weak support on buttons) and respects `prefers-reduced-motion`.

**Constitution check**: a public API addition on two existing components
(Art. II, IX) and a new state of an existing interaction pattern (Art. V).
No guardrail or security boundary changes: the catalog passes the new props
through its existing checks.

## Design-source analysis

The Figma `Button` master (`8003:300`) and the `Icon_button` set have no
loading state; the only loading state in the Kimen UI file is `Table-cell`
(`16115:25252`), which is not a control. The issue verified this against the `.fig` export
of 2026-11-19 (Regular radius mode, Default spacing) and `main` at `fb2755b`.
So this state has no design source to transcribe: its visuals are kept
minimal and resolve entirely from tokens (D5, D9).

What the code base already offers:

- `ki-progress` draws its circular shape as an SVG ring on a 40-unit grid:
  radius 18, `pathLength="100"`, a non-scaling stroke whose width is a
  token, round caps, an indeterminate arc of 25 units and a continuous
  rotation over `ki.progress.indeterminate.duration`, all gated behind
  `prefers-reduced-motion: no-preference`.
- The button icon sizes per size are `space.2xl … 7xl` (14, 16, 18, 20,
  24px) for `ki-button` and `space.3xl … 9xl` (16, 18, 20, 24, 28px) for
  `ki-icon-button`; material3 does not override them.
- Every `--ki-button-*-fg` / `-bg` cell except the disabled ones is held at
  4.5:1 by the token contrast gate (`check-contrast.mjs`, component sweep) in
  both themes and both schemes, so an ink equal to the button's foreground
  clears the 3:1 that WCAG 1.4.11 asks of a non-text graphic by
  construction.
- `ki-alert` sets the precedent for a built-in accessible string:
  `dismiss-label`, default "Dismiss", overridable for localization.
- Spec 042 established that a polite live region must exist, empty, before
  its text arrives: a region created together with its text is not
  announced.

## Decisions *(founder, 2026-11-19, issue #317)*

- **D1 API shape.** A `loading` boolean property, attribute `loading`,
  reflected, on both `ki-button` and `ki-icon-button`; and a `loading-label`
  attribute (property `loadingLabel`), default `"Loading"`, the text of the
  status message, overridable for localization. It follows `ki-alert`'s
  `dismiss-label`; Art. VI forbids any other built-in user-visible string.
  Rejected: the name `pending` (the issue's alternative), and `aria-busy`
  alone (weak support on buttons).
- **D2 Exposure.** While loading, the inner native button carries
  `aria-disabled="true"`, never the `disabled` attribute: it stays
  focusable, in the Tab order, and keeps the name it has at rest.
- **D3 Activation is blocked.** No click activation reaches the application,
  whether from a pointer or from Enter or Space, and a `ki-button` of type
  `submit` or `reset` neither submits nor resets its form. Hover paint is
  kept; the pressed feedback is withdrawn and the pointer shows the progress
  cursor, because nothing happens when the button is pressed.
- **D4 The width does not change.** The label, icons and slotted content stay
  laid out and become transparent (they stay in the accessibility tree, so
  the name does not change); a spinner is drawn at the center of the button,
  over them.
- **D5 The spinner.** The circular `ki-progress` geometry (40-unit grid,
  radius 18, `pathLength` 100, a 25-unit arc with round caps, a non-scaling
  stroke), without a track. Sized per button size from new component tokens
  that default to the icon size of that size; stroke width and rotation
  period from new component tokens that default to `space.xxs` and the
  `ki-progress` indeterminate duration. The ink is the button's own
  foreground (`currentColor`), so the spinner always contrasts with the fill
  as much as the label does (≥ 4.5:1 by the token gate, ≥ 3:1 required).
- **D6 Motion.** The spinner turns continuously only under
  `prefers-reduced-motion: no-preference`; under `reduce` it is drawn still.
- **D7 Announcement.** A visually hidden polite status region
  (`role="status"`) is rendered next to the inner button, always, and is
  empty until the button is loading; then it holds the `loading-label` text,
  and it empties again when loading ends. It sits outside the native button,
  so its text never joins the button's name.
- **D8 Precedence.** `disabled` wins over `loading` when both are set,
  including a `ki-button` disabled by its fieldset: the button shows and
  behaves as disabled, with its label, no spinner and no status message.
- **D9 Composition.** `loading` composes with every variant, tone and size,
  both themes and both schemes, forced colors, density (spec 045) and RTL.
  No Figma design exists, so nothing beyond the spinner, the transparent
  content, the withdrawn pressed feedback and the progress cursor changes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The action I started cannot run twice (Priority: P1)

A person presses "Save changes"; while the application saves, the button
shows that the action is in progress, stays where it was, and pressing it
again (by pointer or keyboard) does nothing, so the save cannot run twice.

**Independent Test**: S1–S10.

### User Story 2 - Assistive technology learns the action is in progress (Priority: P1)

A screen reader user presses the button and hears that the action is in
progress without losing focus; the button keeps its name and is exposed as
unavailable until the application clears the state.

**Independent Test**: S4, S11–S13.

### User Story 3 - The loading state belongs to the design system (Priority: P2)

The spinner follows the size, ink and motion rules of the theme the button
is in, and a theme restyles it through tokens alone.

**Independent Test**: S2, S14–S19.

### Edge Cases

- A button that is already loading when it is inserted renders its status
  region together with its text; as for `ki-alert` (011), the announcement
  is then not guaranteed. Setting `loading` on a button already in the
  document always announces.
- An empty `loading-label` announces nothing; leave the default or provide
  a translation.
- Changing `loading-label` while loading replaces the status text, which is
  announced again.
- Slotted content that is a bare text node in the `start` or `end` slot of a
  `ki-button` cannot be styled from the shadow root and stays visible under
  the spinner; icons and other elements are hidden.
- A `ki-button` inside a disabled fieldset is disabled, so `loading` has no
  effect there (D8); re-enabling the fieldset shows the loading state.
- Density does not scale the spinner: it is an icon-size content box, like
  the icons spec 045 D3 leaves unscaled.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: A loading state for ki-button and ki-icon-button
  While the action a button started is in progress, the button keeps its
  place, its focus and its name, blocks every activation, draws a spinner in
  place of its content and tells assistive technology the action is in
  progress through a polite status message whose text the application can
  translate.

  Rule: A loading button holds its place

    # S1
    Scenario Outline: A loading button keeps its size and draws a spinner in place of its content
      Given a <component> "<name>" at rest
      When the application sets the button loading
      Then the button keeps the width and height it had at rest
      And a spinner is drawn at the center of the button in place of its <content>

      Examples:
        | component      | name         | content |
        | ki-button      | Save changes | label   |
        | ki-icon-button | Refresh      | icon    |

    # S2
    Scenario Outline: The spinner is sized for the button size
      Given a <size> ki-button "Save changes" and a <size> ki-icon-button "Refresh"
      When the application sets both buttons loading
      Then the spinner of the ki-button measures <button>px
      And the spinner of the ki-icon-button measures <icon>px

      Examples:
        | size | button | icon |
        | xs   | 14     | 16   |
        | sm   | 16     | 18   |
        | md   | 18     | 20   |
        | lg   | 20     | 24   |
        | xl   | 24     | 28   |

    # S3
    Scenario Outline: A loading button keeps its place in a right-to-left or compact region
      Given a ki-button "Save changes" inside a region with <context>
      When the application sets the button loading
      Then the button keeps the width and height it had at rest
      And the spinner is drawn at the center of the button

      Examples:
        | context                   |
        | a right-to-left direction |
        | the compact density       |

    # S4
    Scenario: Clearing the loading state brings the label back and makes the button usable
      Given a ki-button "Save changes" that is loading
      When the application clears the loading state
      Then the label "Save changes" is shown and no spinner is drawn
      And no loading status message remains
      And a click on the button reaches the application

    # S5
    Scenario: A disabled button stays disabled when it is also set loading
      Given a disabled ki-button "Save changes"
      When the application sets the button loading
      Then the button keeps its disabled appearance with its label and no spinner
      And the button is out of the Tab order
      And no loading status message is announced

  Rule: A loading button blocks activation

    # S6
    Scenario Outline: A click on a loading button reaches no application listener
      Given a <component> "<name>" that is loading
      When the user clicks the button
      Then the application observes no activation

      Examples:
        | component      | name         |
        | ki-button      | Save changes |
        | ki-icon-button | Refresh      |

    # S7
    Scenario Outline: Enter and Space on a focused loading button do nothing
      Given a <component> "<name>" that is loading and has focus
      When the user presses <key>
      Then the application observes no activation

      Examples:
        | component      | name         | key   |
        | ki-button      | Save changes | Enter |
        | ki-button      | Save changes | Space |
        | ki-icon-button | Refresh      | Enter |
        | ki-icon-button | Refresh      | Space |

    # S8
    Scenario Outline: A loading button stays in the Tab order with a visible focus indicator
      Given a text field followed by a <component> "<name>" that is loading
      And the text field has focus
      When the user presses Tab
      Then focus is on the button "<name>"
      And the button shows a visible focus indicator

      Examples:
        | component      | name         |
        | ki-button      | Save changes |
        | ki-icon-button | Refresh      |

  Rule: A loading button does not touch its form

    # S9
    Scenario: A loading submit button does not submit its form
      Given a form with the field "title" holding "Mars" and a loading ki-button "Publish" of type submit
      When the user clicks the button
      Then the form is not submitted

    # S10
    Scenario: A loading reset button does not reset its form
      Given a form whose field "title" was changed from "Mars" to "Venus"
      And a loading ki-button "Reset" of type reset in the form
      When the user clicks the button
      Then the field "title" still holds "Venus"

  Rule: Assistive technology learns the action is in progress

    # S11
    Scenario Outline: A loading button keeps its name and is exposed as unavailable
      Given a <component> "<name>"
      When the application sets the button loading
      Then the accessibility tree exposes a focusable button named "<name>" that is unavailable

      Examples:
        | component      | name         |
        | ki-button      | Save changes |
        | ki-icon-button | Refresh      |

    # S12
    Scenario Outline: A polite status message says the action is in progress
      Given a <component> "<name>" that has focus
      When the application sets the button loading
      Then "Loading" is announced as a polite status message
      And the button keeps focus

      Examples:
        | component      | name         |
        | ki-button      | Save changes |
        | ki-icon-button | Refresh      |

    # S13
    Scenario Outline: The status message speaks the page's language
      Given a <component> "<name>" with the loading label "<status>"
      When the application sets the button loading
      Then "<status>" is announced as a polite status message

      Examples:
        | component      | name       | status       |
        | ki-button      | Guardar    | Guardando    |
        | ki-icon-button | Actualizar | Actualizando |

  Rule: The spinner follows the user's motion preference

    # S14
    Scenario: The spinner turns while motion is allowed
      Given a ki-button "Save changes" on a page without a reduced-motion preference
      When the application sets the button loading
      Then the spinner turns continuously

    # S15
    Scenario Outline: Under reduced motion the spinner holds still
      Given the user prefers reduced motion
      And a <component> "<name>"
      When the application sets the button loading
      Then the spinner is drawn and does not turn

      Examples:
        | component      | name         |
        | ki-button      | Save changes |
        | ki-icon-button | Refresh      |

  Rule: The loading state restyles through tokens

    # S16
    Scenario Outline: Every variant, tone and size shows a legible loading state in every theme and scheme
      Given every variant, tone and size of ki-button and ki-icon-button on a <theme> page in the <scheme> scheme
      When the application sets every button loading
      Then every button keeps the size it had at rest
      And every spinner contrasts with its button's fill at least 3 to 1
      And the accessibility audit reports no violation

      Examples:
        | theme     | scheme |
        | onmars    | light  |
        | onmars    | dark   |
        | material3 | light  |
        | material3 | dark   |

    # S17
    Scenario: The spinner takes the button's foreground ink
      Given a page themed with --ki-button-primary-neutral-rest-fg set to "#7a1fa2"
      And a primary ki-button "Save changes"
      When the application sets the button loading
      Then the spinner renders in "#7a1fa2"

    # S18
    Scenario Outline: Reassigning the spinner size token resizes the spinner
      Given a page whose stylesheet sets <token> to "32px"
      And a medium <component> "<name>"
      When the application sets the button loading
      Then the spinner measures 32px

      Examples:
        | token                            | component      | name         |
        | --ki-button-md-spinner-size      | ki-button      | Save changes |
        | --ki-icon-button-md-spinner-size | ki-icon-button | Refresh      |

    # S19
    Scenario: Under forced colors the spinner is painted in the forced text color
      Given forced colors are active
      And a primary ki-button "Save changes"
      When the application sets the button loading
      Then the spinner is painted in the button's forced text color
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6 | |
| Keyboard path | S7, S8 | |
| Assistive-tech outcome | S4, S5, S11, S12, S13 | |
| Form participation | S9, S10 | |
| Theming | S14, S15, S16, S17, S18, S19 | |

`ki-icon-button` is not form-associated (spec 022 FR-008): S9 and S10 name
`ki-button` alone, the one form participant of the two.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: `ki-button` and `ki-icon-button` MUST accept a reflected
  `loading` boolean and a reflected `loading-label` string (property
  `loadingLabel`) whose default is `"Loading"`.
- **FR-002**: While loading and not disabled, the inner native button MUST
  carry `aria-disabled="true"`, MUST NOT carry `disabled`, and MUST stay
  focusable and in the Tab order with its visible focus indicator.
- **FR-003**: While loading, no click event from the inner button (pointer,
  Enter or Space) MAY reach a listener on the host or its ancestors, and a
  `ki-button` MUST NOT submit or reset its form.
- **FR-004**: While loading, the button's border box MUST keep the size it
  has at rest; its content MUST stay laid out, transparent and in the
  accessibility tree; a spinner MUST be drawn at its center.
- **FR-005**: The spinner MUST use the circular `ki-progress` geometry, MUST
  be sized by `--ki-button-<size>-spinner-size` (`ki-button`) or
  `--ki-icon-button-<size>-spinner-size` (`ki-icon-button`), stroked at
  `--ki-button-spinner-stroke-width` in the button's foreground ink, and
  MUST turn over `--ki-button-spinner-duration` only under
  `prefers-reduced-motion: no-preference`.
- **FR-006**: Each button MUST render a visually hidden polite status region
  outside its native button, empty while not loading and holding the
  `loading-label` text while loading.
- **FR-007**: `disabled`, and for `ki-button` a disabled fieldset, MUST win
  over `loading`: native `disabled`, no `aria-disabled`, no spinner, empty
  status.
- **FR-008**: The pressed feedback MUST NOT show while loading.
- **FR-009**: The props and the `spinner` part MUST be documented with
  when-to-use and when-NOT-to-use guidance, so the generated docs, catalog,
  `llms.txt` and framework wrappers carry them (Art. I).

### Key Entities

- **Loading state**: the pending phase of the action a button started,
  between the activation the application handled and the moment it clears
  `loading`.
- **Status message**: the polite live text that tells assistive technology
  the action is in progress.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): additive, MINOR. Props `loading` and
  `loadingLabel` (attributes `loading`, `loading-label`) on `ki-button` and
  `ki-icon-button`; part `spinner` on both; 12 component tokens:
  `--ki-button-{xs,sm,md,lg,xl}-spinner-size`,
  `--ki-button-spinner-stroke-width`, `--ki-button-spinner-duration` and
  `--ki-icon-button-{xs,sm,md,lg,xl}-spinner-size`. Declared in
  `changes/api/` with the release that ships it.
- **Bundle budget** (Art. IV): one SVG and one status `span` per component,
  a few lines of wiring and one shared block of CSS; no runtime dependency.
- **Accessibility** (Art. V): a new state of the button pattern, not a new
  pattern; the PR documents a manual walkthrough with VoiceOver and the
  Chromium accessibility tree. `prefers-reduced-motion` respected (S15).
- **Tokens** (Art. VI): 12 new component tokens, all aliases of existing
  primitives; no new colour token (the ink is the button's foreground); no
  material3 overlay or contrast-more change is needed, because material3
  does not override the icon sizes these default to and the ink follows the
  foreground those modes already restyle.
- **Catalog/agent legibility** (Art. I, VIII): the generated catalog gains
  the props; no protocol type enters `@kimen/elements`.
- **Guardrail/security boundary** (Art. VIII): none. The label renders as a
  text node, never as markup.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every scenario S1–S19 passes in Chromium, Firefox and WebKit,
  with the accessibility-tree assertions on Chromium.
- **SC-002**: A loading button measures within 0.5px of its resting width and
  height in every variant × tone × size × theme × scheme (S16).
- **SC-003**: axe-core reports no violation on loading buttons in the four
  theme × scheme pairs.
- **SC-004**: Without `loading`, 0 visual baseline changes.

## Assumptions

- The application sets and clears `loading`; the button never sets it on
  its own (no automatic pending state on click), so a click handler that
  runs synchronously and a promise-based one are both the application's to
  wire.
- A single loading level is enough; determinate progress inside a button
  (a percentage) is out of scope and belongs to `ki-progress`.
- Visual baselines for the loading state are new captures added later by
  the founder on CI Linux; this feature changes no existing baseline.
