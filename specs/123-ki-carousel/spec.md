# Feature specification for Carousel

- **Branch** `feat/413-ki-carousel`
- **Issue** #413
- **Design source** Kimen design system, Components → Proposed → Carousel

A carousel presents ordered highlights, onboarding or media. The reader can
move through slides with buttons or native scrolling and see their current
position. Rotation requires an explicit interval.

## Requirements

- Provide the region name, slide count and movement controls described in the
  [public contract](contracts/api.md). Synchronize the current position,
  indicator and event across buttons, scrolling and scripts.
- Support the single layout and the four Material 3 layouts. Keep the visible
  slide readable and keep reduced-size preview copy out of the accessibility
  tree. Keep the controls available across layouts when enabled.
- Follow the APG carousel pattern. Keep offscreen slide content inert, announce
  manual changes politely and silence announcements during rotation. Allow a
  person to pause rotation with a visible control and respect motion preferences.
- *(Amendment A1.)* Never rotate automatically more than once per
  5,000 ms, whatever `autoplay` value the carousel receives.
- Keep direction, colors, density and motion theme-controlled. Ship the two tags
  in the neutral catalog and framework wrappers.

## Interpretations

- **Agent's choice, pending founder confirmation.** Indices are one-based.
  `current` represents the leading slide. Uniform multi-slide views stop at
  the last full view, and loop wraps between range endpoints. Movement counts
  apply to navigation, while a swipe can land on any snap point. An invalid
  requested position is normalized and an unchanged position emits no event.
- **Agent's choice, pending founder confirmation.** Material 3 layouts own
  their sizing. Multi-browse and hero show smaller previews, uncontained
  lets the next item run to the edge, and full-screen snaps vertically inside
  a configurable-height viewport. Preview surfaces can take an optional
  decorative `preview` slot. Reduced preview copy is hidden until active,
  and offscreen or partly shown content is inert. Width changes take effect
  at the selected snap point.
- **Agent's choice, pending founder confirmation.** Rotation stops at the end
  without loop. Hover suspends it temporarily, focus stops it until explicit
  Play, and reduced motion suppresses it. Controls, position labels and slide
  naming defaults are overridable for localization.
- **Agent's choice, pending founder confirmation.** Indicators use the shipped
  20-position limit. Longer carousels keep the dots in a window and expose the
  actual slide number in a numeric position label.
- **Agent's choice, pending founder confirmation.** The discovery registry
  generates the slide tag from a sibling folder. Catalog authors place slide
  items in the carousel's default slot and can bind `ki-slide-change` as its
  sole action.
- **Agent's choice, pending founder confirmation.** Use the repository's explicit
  touch-density setting for 44 px targets and the API gate's classification
  for additions to the existing Stencil type namespaces.

## Scenario family coverage

| Family | Scenarios | Justification when N/A |
| --- | --- | --- |
| Core behavior | S1–S4, S9–S12, S18, S20, S21–S24 | |
| Keyboard path | S5, S19 | |
| Assistive-tech outcome | S6–S8, S12 | |
| Form participation | | N/A. The carousel presents content and has no form value. |
| Theming | S13–S17 | |

## Amendment A1: a floor for automatic rotation *(decided 2026-11-24)*

**Status**: Decided by the founder on 2026-11-24, who adopted the
recommendations below: a fixed 5,000 ms floor, clamped in the component,
with the development warning (see *Decisions on the open questions*).

**Path**: in place, through the Art. II amendment path. One component, so
S21–S24 are appended and none is retired or renumbered. S8–S10 and S15 keep
their wording; the S8–S10 tests change only the interval they mount with
(see *Implementation notes*).

**Merge sequencing**: as in spec 011 A1, the amendment reaches `main`
together with the implementation that traces S21–S24.

### Why

`autoplay` accepts any interval from 1 ms: `@minimum 1` on the prop and
`"minimum": 1` in the generated catalog. The `interval` getter honors that
value, capped only at the timer maximum. On 2026-11-24 a catalog spec with
`autoplay: 1` and `loop: true` rotated about 200 times a second, held back
only by the browser's clamp on chained timers (draft spec 162, commit
`ccf58548`). Any short interval, not only 1 ms, raises two accessibility
problems.

- **Flashing.** WCAG 2.2 SC 2.3.1, Three Flashes or Below Threshold (Level
  A), forbids anything that flashes more than three times in any one-second
  period unless it stays below the general and red flash thresholds. A
  general flash is a pair of opposing changes in relative luminance of 10%
  or more of the maximum, where the darker state is below 0.80. It counts
  once the flashing area exceeds 25% of a 10° visual field. WCAG estimates
  that field as a 341 × 256 px rectangle at 1024 × 768, so a quarter of it
  is far smaller than most slides. A change between a dark and a light
  slide is one such change. Counted
  strictly, a flash is two opposing changes, so alternating slides need
  about six changes a second, an interval near 167 ms, to fail. The
  component cannot measure its slides' luminance or their order, so it must
  hold to the conservative count, where every change may be a flash. Only
  an interval of 334 ms or more keeps every one-second window to three
  changes.
- **Reading.** The APG carousel pattern asks for a rotation control,
  rotation that stops on keyboard focus and on hover, and a live region that
  is `off` while rotating. `ki-carousel` does all of this (S8–S10). The
  pattern names no interval. Its auto-rotating example rotates every
  5,000 ms. WCAG sets no reading time either: the Pause control meets SC
  2.2.2, Pause, Stop, Hide, at any interval. Yet a control helps only a
  person with time to find it, and a slide shown for a few hundred
  milliseconds cannot be read at all.

### Where the floor lives

| Option | Who it protects | Specs valid today | Art. IX |
| --- | --- | --- | --- |
| **Clamp in the component** (recommended). The catalog range stays 1 to 2,147,483,647 and the component rotates no faster than the floor | Every path: HTML authors, framework wrappers, catalog surfaces and A2UI | All stay valid. `autoplay: 1` renders and rotates at the floor | Narrows no API. A timing fix with a patch-level description change |
| **Raise the catalog `minimum`** to the floor | Catalog emitters only. HTML and wrapper consumers still rotate at 1 ms unless the component also clamps | Rejected with `prop-out-of-range` (spec 027 FR-017). Every spec below the floor stops validating | Breaking for emitters. Lands only on a MAJOR, after a deprecating MINOR |

Design by Contract favors the second option: "be strict in what you will
accept" (*The Pragmatic Programmer*, 20th anniversary edition, Tip 37). Two
facts outweigh it here. First, an HTML attribute has no error channel. Only
a clamp lets the component keep the guarantee on its own, so the clamp is
needed even if the catalog narrows later. Second, the catalog already rules
on bounds. Spec 027 FR-017 declares a catalog bound "only where the
component spends work in proportion to the value", and a prop the
component "already clamps at constant cost ... needs none". A rotation
interval costs constant work. `ki-progress` and `ki-indicator` already
clamp out-of-range values instead of rejecting them.

### Choosing the floor

| Floor | SC 2.3.1, conservative count | Time to read one slide | Intervals it changes |
| --- | --- | --- | --- |
| 334 ms | Met, with no margin | None | Below 334 ms |
| 1,000 ms | Met, with a 3× margin | A glance at an image, not a sentence | Below 1 s |
| **5,000 ms** (recommended) | Met, with a 15× margin | A heading and one sentence, about 17 words, at 238 words a minute, plus a moment to notice the change | Below 5 s, including 3 s rotations some authors choose |

The reading rate is the average adult silent rate for non-fiction in a
meta-analysis of 190 studies (Brysbaert, *Journal of Memory and Language*,
2019). Seventeen words at that rate take about 4.3 s.

5,000 ms is recommended for four reasons. It is the interval of the APG
example, the one implementation the pattern ships. It is the first value
at which an average reader can read a short highlight once. Slower readers,
people using magnification and screen-reader users still rely on Pause,
focus and hover, which do not change. An emitter that sends `autoplay: 1`
probably means "on", reading the number as a boolean. The floor gives it
the rotation it probably meant instead of one nobody can read. Slower rotation
harms no one's access, while a 334 ms floor solves only the flashing half.
It costs authors who chose 1 to 4.999 s, who now get 5 s. Spec 002 A1 set
a similar readability floor of 12 px where WCAG sets none.

### Decisions

- **A1-D1 Clamp, keep the catalog range.** The component moves
  automatically no more than once per 5,000 ms. `autoplay` keeps the value
  its author set, neither reflected nor mutated. Only rotation timing uses
  the floor. The catalog `minimum` (1), `maximum` and schema version stay
  as they are (S21, S22, S24).
- **A1-D2 A fixed floor of 5,000 ms.** No token, prop or attribute lowers
  it: an escape hatch would reopen the SC 2.3.1 failure (Art. VII).
  Intervals of 5,000 ms or more are honored unchanged (S23).
- **A1-D3 The description tells emitters.** The `autoplay` JSDoc says
  "Values below 5000 rotate every 5000 ms", and so do the generated
  catalog, `llms` files and API reference. `scripts/lib/public-api.mjs`
  classifies a description change as a documentation patch.
- **A1-D4 A development-only warning.** When `autoplay` is set below the
  floor, the component logs `[Kimen] ki-carousel autoplay=<n> is below the
  5000 ms floor and rotates every 5000 ms.` It uses the `NODE_ENV ===
  'development'` guard of the `ki-button` deprecation warning, so
  production bundles carry no warning.

- **FR-A1-001**: Automatic rotation MUST NOT move the carousel more than
  once per 5,000 ms, whatever `autoplay` value it receives (S21, S22).
- **FR-A1-002**: An `autoplay` of 5,000 ms or more MUST be honored as set
  (S23).
- **FR-A1-003**: The catalog MUST keep accepting every `autoplay` from 1 to
  2,147,483,647, so a spec valid before this amendment stays valid (S24,
  Art. IX).

### Relation to spec 162

Draft spec 162 (`specs/162-action-rate-budget/`, branch
`claude/unruffled-hawking-2a5537`) budgets actions on every render path.
The floor does not replace it. It takes the measured hidden carousel from
about 200 moves a second to one every five seconds, but it covers only this
one event source. Either change can land first.

### Out of scope

- Flashing content inside a slide, such as video or animated images. SC
  2.3.1 for that content stays with its author.
- Manual navigation. A held arrow key moves once per key repeat, and each
  move is instant under reduced motion. The reader controls it, and this
  amendment leaves it unchanged.
- Rotation while the carousel is hidden or offscreen. The floor bounds its
  cost. Whether it should rotate when nobody sees it is a separate question.
- Raising the catalog `minimum` at a future MAJOR.

### Implementation notes

These notes are not part of the contract.

- `ki-carousel.tsx`: the `interval` getter clamps to 5,000 ms and
  `MAX_INTERVAL`, plus the JSDoc and the warning.
- Tests: S8–S10 mount with `autoplay: '1000'` and fast-forward 1,000 to
  1,200 ms. They move to 5,000 ms. S15 (100 ms under reduced motion) is
  unaffected. S21–S23 go in `ki-carousel.browser.spec.ts` with the
  Playwright clock. S24 goes where catalog tests render real components,
  `packages/adapter-mcp-apps/browser-tests`, in a file of its own marked
  `// @spec:123-ki-carousel` so the traceability gate finds it.
- Regenerate the catalog, manifests, public API, `llms` files and wrappers.
  Add a `changes/api` declaration. Name the floor in `docs/site.mdx` and
  `docs/components/carousel.mdx`.

### Decisions on the open questions

Decided by the founder on 2026-11-24, adopting both recommendations.

1. The floor is 5,000 ms, not the SC 2.3.1 minimum of 334 ms or 1,000 ms
   (A1-D2).
2. The development warning stays (A1-D4); the component does not clamp
   silently as `ki-progress` does.

## Gherkin scenarios

```gherkin
Feature: ki-carousel presents a sequence of slides
  People can move through slide content and keep their place.

  # S1
  Scenario: Navigation advances by the configured step
    Given five highlights showing two at a time and moving two at a time
    When the reader activates Next slide from position one
    Then position three leads the visible slides
    And a slide change reports index 3

  # S2
  Scenario: Looping wraps the sequence
    Given a looping carousel at the last of three highlights
    When the reader activates Next slide
    Then the first highlight becomes current

  # S3
  Scenario: A swipe updates the position
    Given a carousel showing the first of three highlights
    When the reader swipes toward the next slide
    Then the viewport snaps to the second highlight
    And the position indicator highlights two

  # S4
  Scenario: The public API selects a slide
    Given a carousel showing the first of three highlights
    When its consumer requests position three
    Then position three becomes current
    And a slide change reports index 3

  # S5
  Scenario: The reader navigates without a pointer
    Given the Next slide control has keyboard focus
    When the reader presses Space
    Then the second highlight becomes current
    And focus remains on Next slide

  # S6
  Scenario: Slide names and visibility follow the visible range
    Given a carousel named "Highlights" showing the first of three slides
    When assistive technology reads the carousel
    Then it exposes a region named "Highlights" described as a carousel
    And only the slide group named "1 of 3" is available

  # S7
  Scenario: A manual slide change is announced
    Given a three-slide carousel with rotation off
    When the reader moves to the second highlight
    Then a polite announcement reports "2 of 3"

  # S8
  Scenario: Focus stops automatic rotation
    Given three highlights rotating automatically without announcements
    When keyboard focus enters the carousel
    Then rotation stops until the reader activates Play
    And slide changes can be announced politely

  # S9
  Scenario: The reader pauses automatic rotation
    Given three highlights rotate automatically
    When the reader activates Pause
    Then the current slide stays in place
    And a Play control is available

  # S10
  Scenario: Hover temporarily pauses rotation
    Given a three-slide carousel rotates automatically
    When the pointer hovers over the carousel
    Then the current slide stays in place while the pointer remains there

  # S11
  Scenario Outline: The layout keeps its controls and slides readable
    Given a carousel with five highlights using the <layout> layout
    When the reader moves one position forward
    Then the second highlight is readable in full
    And navigation and the position indicator remain available

    Examples:
      | layout       |
      | multi-browse |
      | uncontained  |
      | hero         |
      | full-screen  |

  # S12
  Scenario: A narrow preview keeps its text hidden until it leads
    Given a multi-browse carousel with a small preview
    When the reader reaches the small preview
    Then its full text is visible and available to assistive technology

  # S13
  Scenario: A theme supplies the navigation surface
    Given a carousel theme with a yellow navigation surface
    When the carousel appears
    Then its navigation buttons paint yellow

  # S14
  Scenario: Forced colors preserve navigation
    Given a user-selected forced-color palette
    When the carousel appears
    Then its navigation controls retain visible outlines and glyphs

  # S15
  Scenario: Reduced motion keeps the carousel still until navigated
    Given a multi-browse carousel configured to rotate and a reader who requests reduced motion
    When the reader activates Next slide
    Then the next slide reaches its full size and position immediately
    And automatic rotation remains off

  # S16
  Scenario: Right-to-left navigation follows reading order
    Given a right-to-left carousel showing the first of three slides
    When the reader activates Next slide
    Then the next slide approaches from the left and becomes current

  # S17
  Scenario: Coarse pointers have comfortable targets
    Given a carousel with touch density on a coarse-pointer device
    When the carousel appears
    Then both navigation controls have at least 44 by 44 CSS pixel targets

  # S18
  Scenario: Navigation and pagination can be independently hidden
    Given a carousel configured with no navigation controls
    When the carousel appears
    Then its indicator remains visible
    And the slide viewport can receive keyboard focus

  # S19
  Scenario: Offscreen slide links are skipped
    Given the first two slides each contain a link and only the first slide is visible
    When the reader presses Tab from the first slide link
    Then focus moves to the carousel navigation

  # S20
  Scenario: An item projects its own slide content
    Given a carousel item with a link titled "Learn more"
    When that item is the visible slide
    Then the link is available to the reader

  # Amendment A1 (decided 2026-11-24): a floor for automatic rotation

  # S21
  Scenario Outline: An interval below the floor waits the full five seconds
    Given a looping carousel of three highlights set to rotate every <interval> milliseconds
    When 4999 milliseconds pass without interaction
    Then no slide change has been reported
    And the first highlight is still current

    Examples:
      | interval |
      | 1        |
      | 334      |
      | 4999     |

  # S22
  Scenario: Rotation below the floor moves once per five seconds
    Given a looping carousel of three highlights set to rotate every 1 millisecond
    When 6 seconds pass without interaction
    Then the second highlight is current
    And exactly one slide change has been reported

  # S23
  Scenario: An interval above the floor is kept as set
    Given a looping carousel of three highlights set to rotate every 8000 milliseconds
    When 12 seconds pass without interaction
    Then the second highlight is current
    And exactly one slide change has been reported

  # S24
  Scenario: An agent spec with a one-millisecond interval stays valid
    Given an agent spec with a looping three-slide carousel whose autoplay is 1
    When a surface renders the spec
    Then the carousel appears with no validation issue
    And its Pause control is available
```
