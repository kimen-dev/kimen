# Feature Specification: ki-toast and ki-toaster

**2026-11-27 founder decision (F4).** The gate-driven.dev integrator report led to one boolean attribute rule. An absent attribute uses the property default. A present attribute is true unless its value is exactly `"false"`.

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II
     (Proportionate Behavior Contracts).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `claude/objective-cray-c7defd` (spec `049-ki-toast`)

**Created**: 2026-11-19

**Status**: Draft. Intent decided by the founder on 2026-11-19 (see
*Decisions*); the readings marked *interpretation* await review in the PR.

**Input**: Issue kimen-dev/kimen#353, "Add `<ki-toast>` (Toast) — P1"
(document 2 of the onmars v2 programme, issue 3): "`<ki-toast>` shows a
short, transient message about something the person just did, without
blocking the page; `<ki-toaster>` is the one region that stacks them."
It also answers issue #322, whose first item is the Toast.

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Sources

1. **Issue #353** (document 2, issue 3) is the contract source: anatomy, API,
   tokens, accessibility and the definition of done.
2. **Document 2's rules for all components** (theme-ready from the start):
   surfaces paint `background-color` from a `-bg` token plus an optional
   `-bg-image` token that defaults to `none`; `backdrop-filter` comes whole
   from a token that defaults to `none`; a heading the component renders
   reads `--ki-typography-family-heading` through a component token; buttons
   inside a component are never `tertiary`; no two theme-controlled shadow
   tokens share one `box-shadow` list; colour pairs are `…-bg` / `…-fg`.
3. **Founder answers in the working session** (below).

The Figma master `Toast` `12071:5771` (glass shell, tinted wash, tertiary
close chip, countdown line) was the first reference; onmars v2 ("Calma")
replaces it, and document 2 forbids copying geometry from those masters, so
none of its values ship.

## Decisions *(founder, 2026-11-19)*

A first round of four questions (one element or a region; timing; live-region
semantics per tone; dismiss, action and countdown affordances) was answered
before document 2 was shared. Asked again once it was, the founder ruled:

1. **Issue #353 prevails** wherever it differs from the first round. So:
   `dismissible` (default `true`) instead of an always-present dismiss
   button; 5000 ms by default; a toast holding an action, or in the danger
   tone, never leaves on its own, whatever its `duration`; warning is polite
   (only danger is `role="alert"`); one action, whose activation also makes
   the toast leave; `ki-dismiss` reasons `timeout`, `button`, `escape` and
   `action`; no countdown line; the region is `ki-toaster` with `show()`,
   `max` and four placements; Escape and F6.
2. **The toaster is a named group, not a landmark.** #353 asks for "a
   landmark-free region with `aria-label="Notifications"`", and `aria-label`
   on an element without a role is not valid ARIA: the toaster exposes
   `role="group"` named by `label`.
3. **Build now, link the v2 tokens when they land.** `--ki-typography-family-heading`
   (issue #347) landed while this was built, and `--ki-toast-heading-font-family`
   reads it. #342 landed too: its `--ki-effect-component-backdrop-filter` is
   the glass filter of glass components, while the toast is flat, so
   `--ki-toast-backdrop-filter` is the toast's own whole filter, `none` by
   default as document 2's rule 6 asks.

What the first round settled and #353 does not contradict stays: the time
also holds while the page is hidden; the pointer or focus on any toast of
the toaster holds every toast in it.

### Interpretations *(for review in the PR)*

- **I-1 Which toasts wait.** #353: "`max` — visible toasts; older ones
  queue". The toaster shows its newest `max` toasts that have not left;
  older ones wait, render nothing, are absent from the accessibility tree,
  and their time does not run. When a shown toast leaves, the newest waiting
  toast comes back with its full time (S18, S19).
- **I-2 Mobile placement.** "Mobile (coarse pointer, narrow) always uses
  `bottom-center`": a coarse pointer on a viewport narrower than 40rem
  (`size.surface.lg`, the stack never fits beside content there).
- **I-3 F6** moves focus to the first control of the newest shown toast,
  remembering where it was; Escape on a focused toast makes it leave and
  returns focus there. Without a remembered place, focus follows D-8.
- **I-4 `show()`** creates a `ki-toast` (title → `heading`, message → text,
  action → a `ki-button size="sm" variant="ghost"` in the `action` slot that
  calls `onClick`), appends it to the toaster, and removes it from the page
  once it has left. Toasts written in markup are never removed: the page
  owns them, and they keep a reflected `dismissed` state. The toaster does
  not bundle `ki-toast` or `ki-button` (each element keeps its own size
  budget): the page defines them, as it must for toasts in markup.
- **I-5 Stack order.** Toasts stack from the top down in arrival order
  whatever the placement, so the visual, reading and Tab orders agree
  (WCAG technique C27).
- **I-6 Icons.** "Tone icon" is drawn by the component, one glyph per tone,
  in `--ki-toast-<tone>-icon` and hidden from assistive technology; the
  message carries the meaning.
- **I-7 Leaving.** Toasts leave without an exit animation in every motion
  preference; they enter with a short rise only under
  `prefers-reduced-motion: no-preference`.
- **I-8 Focus hand-off (D-8).** When a toast leaves with focus inside it
  through its dismiss button or an action, focus moves to the first control
  of the next shown toast, else of the previous one, else back to where it
  came from into the toaster, else to the next focusable element after the
  toast, as `ki-alert` does.
- **I-9 Width.** `--ki-toast-width` is 22.5rem as #353 states; no surface
  step equals it, so it rests on a primitive of its own, `ki.size.toast`
  (the `ki.size.qr` precedent).
- **I-10 Fill.** #353 names `surface-raised`, the deprecated alias of
  `surface.s1` (spec 041): `--ki-toast-bg` aliases `surface.s1` itself.
- **I-12 Focus keeps its toast.** A newer toast never pushes the toast the
  person is working in into the queue: moving their focus because a
  notification arrived would be a change of context they did not ask for.
  While a toast holds focus it stays shown and the oldest other shown toast
  waits; once focus leaves the toaster the newest toasts show again (S44,
  S45; found by review on PR #426).
- **I-11 Budget.** These 22 tokens add about 120 B to the onmars tokens
  stylesheet; the founder approved a 12 kB limit for them on 2026-11-19, and
  #316 has since raised it to 12.4 kB, which holds them.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Know that something happened (Priority: P1)

A person saves, copies or exports, and a toast says so in a corner of the
screen, with urgency that reaches eyes and assistive technology alike,
without taking focus from what they were doing.

**Why this priority**: telling the person is the reason the component
exists; a toast nobody hears, or one that steals focus, fails outright
(Art. V).

**Independent Test**: S1, S2, S13, S27–S29.

---

### User Story 2 - The toast leaves when it is no longer needed, never under the reader (Priority: P1)

The toast leaves after its time, which stops while the person points at the
toaster, works inside it or is away from the page. A toast that offers an
action or reports an error waits for the person (WCAG 2.2.1).

**Independent Test**: S3–S8, S12, S23.

---

### User Story 3 - Act on the toast or dismiss it, from any input (Priority: P2)

The person activates "Undo", closes the toast, presses Escape, or jumps to
the toaster with F6; focus is never left on a toast that went away.

**Independent Test**: S9–S11, S22, S24–S26, S30.

---

### User Story 4 - Several toasts share one place (Priority: P2)

The application raises toasts from different places, in markup or through
`show()`; the toaster stacks them in arrival order in one corner, shows a
few at a time and queues the older ones, without covering the page beside
them.

**Independent Test**: S14–S21, S31–S34.

---

### User Story 5 - Re-theme and localize without touching markup (Priority: P2)

A theme switches, a scheme flips, the document turns right-to-left, the
user asks for less motion, less transparency or forced colours, or the page
declares touch density; the toasts follow through tokens alone, and every
built-in word is a property.

**Independent Test**: S31, S35–S43.

---

### User Story 6 - An agent picks the right feedback component (Priority: P3)

A GenUI agent reading only the generated contract chooses `ki-toast` inside
`ki-toaster` for transient confirmations, and NOT for lasting conditions
(`ki-alert`), decisions (`ki-dialog`) or field validation.

**Independent Test**: the catalog entries and their when-to-use metadata;
S13 and S16 for malformed values.

### Edge Cases

- A toast outside any toaster renders where it is placed, with the same
  timer, pause (itself only), dismissal and live region.
- A toast present at initial page load is exposed with its role, but only a
  toast that appears dynamically is reliably announced.
- A toast raised while a modal `ki-dialog` is open sits outside the dialog
  and is inert; such a toast belongs in a toaster inside the dialog.
- Invalid `duration` values (negative, not a number, not finite) behave as
  if `duration` were not set. Changing `duration`, `tone` or the action
  while a toast runs restarts its time under the new rule.
- Unknown `tone` values render neutral; unknown `placement` values place the
  stack at the bottom end; a `max` below 1 or not a whole number shows 3.
- More than one element in the `action` slot: they all render, in source
  order; the guidance asks for one.
- Children of the toaster that are not `ki-toast` are not counted, queued or
  placed.
- Removing a toast element from the page stops its time; the toaster brings
  back the newest waiting toast.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Toast
  A toast confirms something the person just did, out of the flow of the
  page and only for as long as it is useful: its urgency reaches eyes and
  assistive technology alike, it never closes under a person who is reading
  or reaching for it, a toaster stacks and queues the toasts in one place,
  and any theme restyles both through tokens alone.

  # Family: core behavior
  # S1
  Scenario: The tone lives in the icon alone
    Given an onmars page with a success toast "Changes saved" and the message "Workspace settings are up to date."
    When the toast appears
    Then the heading and the message are visible beside an icon in the success ink
    And the toast's surface, heading and message look as they do on a neutral toast

  # S2
  Scenario: The toast is a flat raised surface with a hairline edge
    Given an onmars page with an info toast "Export ready"
    When the toast appears
    Then the toast has 12px of padding, 16px corners, a hairline border and the level-4 elevation
    And nothing behind it is blurred and it is no wider than 360px

  # S3
  Scenario: A toast leaves when its time runs out
    Given a toast "Draft saved" with a duration of 4 seconds
    When 4 seconds pass without the pointer or the focus on it
    Then the toast is no longer displayed
    And the page observes exactly one ki-dismiss event whose reason is "timeout"

  # S4
  Scenario: A toast without a duration leaves after five seconds
    Given an info toast "Sync complete" with no duration
    When 5 seconds pass
    Then the toast is no longer displayed

  # S5
  Scenario Outline: A toast that needs the person never leaves on its own
    Given a toast "Upload finished" <waiting reason>
    When 30 seconds pass
    Then the toast is still displayed

    Examples:
      | waiting reason                                     |
      | holding the action "Undo"                          |
      | in the danger tone                                 |
      | with a duration of 0                               |
      | holding the action "Undo" with a duration of 4000  |
      | in the danger tone with a duration of 4000         |

  # S6
  Scenario: Pointing at any toast holds every toast of the toaster
    Given a toaster showing "Draft saved" and "Photo uploaded", each with a duration of 4 seconds, and the pointer resting on "Photo uploaded"
    When 6 seconds pass
    Then both toasts are still displayed

  # S7
  Scenario: The remaining time runs again when the pointer leaves
    Given a toast "Draft saved" with a duration of 4 seconds that the pointer held after 3 seconds and has just left
    When 1 more second passes
    Then the toast is no longer displayed

  # S8
  Scenario: A hidden page holds the time
    Given a toast "Draft saved" with a duration of 4 seconds on a page that went to the background after 1 second
    When 10 seconds pass while the page is hidden
    Then the toast is still displayed

  # S9
  Scenario: The dismiss button removes the toast and says so
    Given a toast "Backup completed"
    When the user activates the dismiss button
    Then the toast is no longer displayed
    And the page observes exactly one ki-dismiss event whose reason is "button"

  # S10
  Scenario: Activating the action runs it and the toast leaves
    Given a toast "Message archived" holding the action "Undo"
    When the user activates "Undo"
    Then the page's undo runs once and the toast is no longer displayed
    And the page observes exactly one ki-dismiss event whose reason is "action"

  # S11
  Scenario: A toast that is not dismissible has no dismiss button
    Given a toast "Connected" that is not dismissible
    When the toast appears
    Then no dismiss button is present

  # S12
  Scenario: Clearing the dismissed state shows the toast again with its full time
    Given a toast "Draft saved" with a duration of 4 seconds that left when its time ran out
    When the page clears the toast's dismissed state
    Then the toast is displayed again and stays for another 4 seconds

  # S13
  Scenario: Unknown tone values fall back to the neutral appearance
    Given a toast declared with an unrecognized tone value
    When the toast appears
    Then the toast renders with the neutral tone appearance

  # S14
  Scenario: The toaster stacks toasts in arrival order in its corner
    Given a left-to-right page with a toaster placed "bottom-end"
    When the toasts "First" and "Second" arrive in that order
    Then both are displayed in the bottom right corner of the viewport, "First" above "Second"

  # S15
  Scenario Outline: The placement chooses the edge and the side of the stack
    Given a left-to-right page with a toaster placed "<placement>"
    When the toast "Draft saved" arrives
    Then the toast sits at the <edge> of the viewport, <side>

    Examples:
      | placement     | edge   | side         |
      | top-center    | top    | centered     |
      | top-end       | top    | on the right |
      | bottom-center | bottom | centered     |
      | bottom-end    | bottom | on the right |

  # S16
  Scenario: Unknown placement values fall back to the bottom end
    Given a left-to-right page with a toaster declared with an unrecognized placement value
    When the toast "Draft saved" arrives
    Then the toast sits at the bottom of the viewport, on the right

  # S17
  Scenario: On a narrow touch screen the stack sits at the bottom center
    Given a 414-pixel-wide touch screen with a toaster placed "top-end"
    When the toast "Draft saved" arrives
    Then the toast sits at the bottom of the viewport, centered

  # S18
  Scenario: The toaster shows its newest toasts and queues the older ones
    Given a toaster with a maximum of 2 showing the toasts "One" and "Two"
    When the toast "Three" arrives
    Then "Two" and "Three" are displayed and "One" is not

  # S19
  Scenario: A queued toast comes back when a place frees, with its full time
    Given a toaster with a maximum of 2 showing "Two" and "Three" while "One", with a duration of 4 seconds, waits
    When the user dismisses "Three"
    Then "One" and "Two" are displayed
    And "One" stays for its full 4 seconds

  # S20
  Scenario: The page raises a toast through the toaster
    Given a toaster on the page
    When the page shows a success toast titled "Changes saved" with the message "Workspace settings are up to date." and the action "Undo"
    Then a success toast with that heading, message and an "Undo" button is displayed
    And once it leaves, the toast is removed from the page

  # S21
  Scenario: The toaster never covers the page beside its toasts
    Given a toaster placed "bottom-end" showing the toast "Draft saved" and a button "Help" at the bottom of the page beside it
    When the user clicks "Help"
    Then the "Help" button is activated

  # S46
  Scenario: Removing a boolean override restores its default on state
    Given a toast with dismissible set to "false"
    When the application removes the attribute
    Then the corresponding property reads true

  # Family: keyboard path
  # S22
  Scenario: Tab reaches the action and then the dismiss button, with visible focus
    Given a page whose only interactive content is a toast holding the action "Undo"
    When the user tabs through the toast
    Then focus visits "Undo" and then the dismiss button, each with visible focus indication

  # S23
  Scenario: Keyboard focus inside a toast holds its time
    Given a toast "Draft saved" with a duration of 4 seconds whose dismiss button has keyboard focus
    When 6 seconds pass
    Then the toast is still displayed

  # S24
  Scenario: F6 moves focus into the toaster
    Given a page where the button "Save" has focus and a toaster shows a toast holding the action "Undo"
    When the user presses F6
    Then focus lands on "Undo"

  # S25
  Scenario: Escape dismisses the focused toast and returns focus to where it was
    Given a page where focus moved from the button "Save" into the only toast of a toaster
    When the user presses Escape
    Then the toast is no longer displayed and focus lands on "Save"
    And the page observes exactly one ki-dismiss event whose reason is "escape"

  # S26
  Scenario: Keyboard dismissal hands focus to the next toast
    Given a toaster showing "Draft saved" and "Photo uploaded", with focus on the dismiss button of "Draft saved"
    When the user activates that dismiss button from the keyboard
    Then focus lands on the dismiss button of "Photo uploaded"

  # S44
  Scenario: A toast holding keyboard focus keeps its place while a newer toast waits
    Given a toaster with a maximum of 1 whose toast "Draft saved" has keyboard focus on its dismiss button
    When the toast "Photo uploaded" arrives
    Then "Draft saved" stays displayed with focus on its dismiss button
    And "Photo uploaded" waits

  # S45
  Scenario: The newer toast takes the place once focus leaves the toaster
    Given a toaster with a maximum of 1 where "Draft saved" kept its place under keyboard focus while "Photo uploaded" waits
    When focus moves to the button "Save" outside the toaster
    Then "Photo uploaded" is displayed and "Draft saved" waits

  # Family: assistive-tech outcome
  # S27
  Scenario Outline: Calm tones are exposed as polite status updates without moving focus
    Given a page where the person is working in a form
    When a <tone> toast "Changes saved" appears
    Then the toast is exposed to assistive technology with status (polite) semantics
    And focus stays where it was

    Examples:
      | tone    |
      | neutral |
      | info    |
      | success |
      | warning |

  # S28
  Scenario: A danger toast is exposed assertively without moving focus
    Given a page where the person is working in a form
    When a danger toast "Upload failed" appears
    Then the toast is exposed to assistive technology with alert (assertive) semantics
    And focus stays where it was

  # S29
  Scenario: Only the heading and the message are announced
    Given a page where the storage is filling up
    When a warning toast appears with the heading "Storage almost full", the message "1 GB left" and the action "Upgrade"
    Then the toast's live region exposes only "Storage almost full" and "1 GB left"
    And the tone icon is hidden from assistive technology

  # S30
  Scenario: The dismiss button is named Dismiss
    Given a toast using the default dismiss label
    When the accessibility tree is queried
    Then it exposes a button whose accessible name is "Dismiss"

  # S31
  Scenario: The built-in words are overridable for localization
    Given a toaster labeled "Avisos" holding a toast whose dismiss label is "Descartar"
    When the accessibility tree is queried
    Then the toaster is named "Avisos" and the dismiss button "Descartar"

  # S32
  Scenario: The toaster is a named group, not a landmark
    Given a toaster with the default label showing the toast "Draft saved"
    When the accessibility tree is queried
    Then it exposes a group named "Notifications" that contains the toast
    And no landmark is added to the page

  # S33
  Scenario: An empty toaster exposes nothing
    Given a toaster whose toasts have all left
    When the accessibility tree is queried
    Then no "Notifications" group is exposed

  # S34
  Scenario: A queued toast is not exposed until its turn
    Given a toaster with a maximum of 1 showing "Two" while "One" waits
    When the accessibility tree is queried
    Then "Two" is exposed and "One" is not

  # Family: form participation — N/A, justified in spec.md (neither element is a form control)

  # Family: theming
  # S35
  Scenario: A second theme restyles the toast through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When a toast appears
    Then the toast's appearance resolves from material3 token values

  # S36
  Scenario: The toast honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When a toast appears
    Then the toast's appearance resolves from the dark token values

  # S37
  Scenario: Toasts follow a right-to-left document
    Given a right-to-left page with a toaster placed "bottom-end"
    When a toast holding the action "Undo" arrives
    Then the stack sits at the bottom left of the viewport
    And the icon leads at the right of the toast and the dismiss button trails at its left

  # S38
  Scenario: The toaster's distance from the viewport edges comes from tokens
    Given a page whose theme sets the toaster's edge distance to 32px
    When a toast arrives in a toaster placed "bottom-end"
    Then the stack sits 32px from the bottom and from the end of the viewport

  # S39
  Scenario: A theme paints the surface, the backdrop and the heading typeface through tokens
    Given a page whose theme gives the toast a background image, a backdrop blur and a serif heading typeface
    When a toast "Changes saved" appears
    Then the toast paints that background image over its color, blurs what is behind it and sets its heading in the serif typeface

  # S40
  Scenario: A toast appears without sliding under a reduced-motion preference
    Given a page under a "reduce" motion system preference
    When a toast arrives
    Then the toast is displayed at its final place without animating

  # S41
  Scenario: Reduced transparency keeps the toast opaque and raised
    Given an onmars dark page with a success toast
    When the toast appears under a "reduce" transparency system preference
    Then the toast paints an opaque surface without blurring what is behind it
    And it keeps its elevation

  # S42
  Scenario: Under forced colors the toast keeps its edge and a visible icon
    Given forced colors are active and an info toast
    When the toast appears
    Then the toast's edge is drawn in the forced text color
    And the icon is painted in the forced text color

  # S43
  Scenario: Touch density gives the toast's controls touch-sized targets
    Given a page declaring the touch density with a toast holding the action "Undo"
    When the toast appears
    Then the dismiss button and "Undo" each offer a target of at least 44 by 44 pixels

  # S47
  Scenario: The onmars toast and alert share neutral dismiss ink
    Given an onmars page with a dismissible alert and toast in either color scheme
    When the page changes only the toast's dismiss ink
    Then before the change both dismiss glyphs use the same ink
    And after the change only the toast's dismiss glyph uses the new ink
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15, S16, S17, S18, S19, S20, S21, S46 | |
| Keyboard path | S22, S23, S24, S25, S26, S44, S45 | |
| Assistive-tech outcome | S27, S28, S29, S30, S31, S32, S33, S34 | |
| Form participation | N/A | Neither element is a form control: a toast reports an event and holds no value, and its action is the application's own button, which takes part in forms on its own terms. |
| Theming | S35, S36, S37, S38, S39, S40, S41, S42, S43, S47 | |

## Requirements *(mandatory)*

### Functional Requirements

**ki-toast**

- **FR-001**: `tone` MUST accept `neutral` (default), `info`, `success`,
  `warning` and `danger`; it picks the icon and its ink and nothing else;
  unknown values render neutral (S1, S13).
- **FR-002**: The toast MUST render one flat surface holding, in document
  order, the tone icon, the text (optional `heading`, then the message), the
  `action` slot and the dismiss button; colours, border, radius, padding,
  elevation, background image, backdrop filter and heading typeface come
  from `--ki-toast-*` tokens (S2, S39).
- **FR-003**: The effective duration MUST be: none (the toast waits) when it
  holds an action or its tone is `danger`; otherwise `duration` when it is a
  finite number ≥ 0, where 0 waits; otherwise 5000 ms (S3–S5).
- **FR-004**: When the effective duration runs out the toast MUST leave: set
  `dismissed`, render nothing, and fire one `ki-dismiss` with
  `detail.reason = "timeout"` (S3).
- **FR-005**: The time MUST stop while the pointer rests on the toast's
  toaster (or the toast itself outside one), while focus is inside it, or
  while the document is hidden, and continue with what was left (S6–S8, S23).
- **FR-006**: With `dismissible` (default `true`) the toast MUST render a
  `ki-icon-button` (`size="xs"`, `variant="ghost"`) named by `dismiss-label`
  ("Dismiss" by default); activating it makes the toast leave with
  `reason = "button"` (S9, S11, S30).
- **FR-007**: Activating an element in the `action` slot MUST let the
  element's own handler run, then make the toast leave with
  `reason = "action"`; the action sits outside the live region (S10).
- **FR-008**: Escape pressed while focus is inside the toast MUST make it
  leave with `reason = "escape"` and return focus to where it was before it
  entered the toaster (S25).
- **FR-009**: `dismissed` MUST reflect; while true the toast renders nothing
  and leaves the accessibility tree; clearing it shows the toast again with
  its full time. A programmatic change fires no event (S12).
- **FR-010**: The heading and the message MUST live inside one live region:
  `role="alert"` for `danger`, `role="status"` for every other value. The
  tone icon is hidden from assistive technology. No toast moves focus when
  it appears (S27–S29).
- **FR-011**: When the toast leaves with focus inside it, focus MUST move
  per I-8 before its subtree goes (S26).
- **FR-012**: `queued` is output-only, written by the toaster: while true
  the toast renders nothing, its time does not run and it is absent from the
  accessibility tree (S18, S34).

**ki-toaster**

- **FR-013**: `placement` MUST accept `top-center`, `top-end`,
  `bottom-center` and `bottom-end` (default); `end` follows the writing
  direction; unknown values behave as `bottom-end`; on a coarse pointer and a
  viewport narrower than 40rem the stack sits at the bottom center
  (S14–S17, S37).
- **FR-014**: The toaster MUST paint its stack in the top layer as a manual
  popover, `--ki-toaster-inset-block` / `--ki-toaster-inset-inline` from the
  viewport edges, toasts `--ki-toaster-gap` apart, as wide as
  `--ki-toast-width` and never wider than the viewport minus both insets
  (S14, S38).
- **FR-015**: The toaster MUST stack its `ki-toast` children from the top
  down in document order (I-5) and show the newest `max` (3 by default) that
  have not left, writing `queued` on the older ones (I-1, S18, S19). A toast
  holding focus keeps its place: the oldest other shown toast waits instead,
  until focus leaves the toaster (I-12, S44, S45).
- **FR-016**: The toaster MUST cover nothing but its stack and paint and
  expose nothing while it shows no toast (S21, S33).
- **FR-017**: While it shows toasts the toaster MUST expose `role="group"`
  named by `label` ("Notifications" by default), never a landmark (S31, S32).
- **FR-018**: `show(options)` MUST create, append and return a toast from
  `tone`, `title`, `message`, `duration`, `dismissible` and
  `action: { label, onClick }`, and remove it from the page once it has left
  (I-4, S20).
- **FR-019**: F6 MUST move focus to the first control of the newest shown
  toast of the toaster, remembering where focus was (I-3, S24).
- **FR-020**: The toaster MUST remember where focus was before it entered
  the toaster, for FR-008 and FR-011.

**Both**

- **FR-021**: Every visual value MUST resolve from tokens: compact density
  scales padding and gaps (045); touch density gives the dismiss button and
  a `ki-button` action 44px targets (S43); reduced transparency keeps the
  surface opaque (S41); forced colors draw the edge and the icon in the
  forced text color (S42); the entrance rise runs only under
  `prefers-reduced-motion: no-preference` (S40).

### Key Entities

- **Toast**: one transient message — tone, heading, message, optional
  action, its effective duration, remaining time and pause reasons.
- **Toaster**: one placement, a visible maximum, the toasts it shows and
  queues, and the element focus came from.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): two new elements, additive. `ki-toast`:
  props `tone`, `heading`, `duration`, `dismissible`, `dismiss-label`,
  `dismissed`, `queued` (output-only); event `ki-dismiss`
  (`{ reason: 'timeout' | 'button' | 'escape' | 'action' }`); slots default
  and `action`; parts `toast`, `icon`, `heading`, `message`, `action`,
  `dismiss`. `ki-toaster`: props `placement`, `max`, `label`; method
  `show()`; default slot; part `stack`. New `--ki-toast-*` and
  `--ki-toaster-*` tokens. The public-API gate classifies every surface
  change as MAJOR; a `changes/api/` declaration records it.
- **Bundle budget** (Art. IV): each element within the single-digit KB
  budget; `ki-toast` composes `ki-icon-button`; no runtime dependency.
- **Accessibility** (Art. V): no APG pattern exists for toasts; the contract
  rests on WCAG 2.2.1, 2.2.2, 4.1.3, 2.4.3 and C27 and on the `ki-alert`
  live-region rules. New interaction pattern → manual walkthrough
  (keyboard, VoiceOver) documented in the PR.
- **Tokens** (Art. VI): component tokens in
  `packages/tokens/tokens/component/toast.tokens.json` and
  `toaster.tokens.json`, a material3 override, aliases of semantic tokens
  only (the width and the `none` defaults aside).
- **Catalog/agent legibility** (Art. I): when to use — confirm an action
  that happened elsewhere on screen, report a background result, offer a
  quick undo; when NOT to use — anything the person must read or act on to
  continue (`ki-dialog`), form validation, a lasting condition of the page
  (`ki-alert`).
- **Guardrail/security boundary** (Art. VIII): two catalog entries; `show()`
  is a page method, never reachable from spec data; the catalog renders
  toasts declaratively, and `ki-dismiss` is an event like any other.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 45 scenarios trace to passing Chromium browser tests;
  `scripts/gates/gates-suite.sh` exits 0 (local macOS visual references
  aside).
- **SC-002**: Zero axe violations for every tone, with and without heading,
  action and dismiss button, inside and outside a toaster.
- **SC-003**: No toast leaves while the pointer or focus is on its toaster,
  or while the page is hidden; none leaves on its own with an action or in
  the danger tone.
- **SC-004**: An agent reading only the generated catalog picks `ki-toast`
  for "tell the user the link was copied" and `ki-alert` for "the payment
  method has expired".

## Assumptions

- The 5000 ms default is a behavior constant documented on the property,
  not a token: timing is an accessibility and application decision.
- One toaster per page (or per modal dialog); several are independent.
- Swipe to dismiss and a pause control beyond hover, focus and a hidden page
  are out of scope (Art. VII).
