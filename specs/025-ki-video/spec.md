# Feature Specification: ki-video

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-video` (spec `025-ki-video`)

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "Fase N batch component: a `<ki-video>` web
component — a themed video surface that frames a slotted native `<video>`
element behind a branded poster facade with exactly one accessible play
control. Playback, scrubbing, volume, fullscreen and captions remain the
native player's job once the viewer starts the video. Custom playback
chrome, playlists, streaming-platform integrations, background/decorative
autoplay video and audio-only presentation are explicitly out of v1 scope,
following the API charter for the ki-* batch (precedent: 002-ki-button,
016-ki-list)."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

The API below is the union of patterns found in both reference designs, so
that neither theme lacks expressive power (and future themes inherit the same
guarantee):

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-video |
|---|---|---|---|
| Component & anatomy | `Video` component set on the Media page (node 12089:6569, verified 2026-07-17): poster imagery filling a rounded 16:9 frame with a single centered play affordance; nothing else | No video or media-player component exists in the M3 component catalog (verified 2026-07-17); video appears only as media imagery inside card and carousel guidance | `ki-video` = themed frame + poster facade + one play control over a slotted native `<video>` element that owns sources, poster, tracks and native attributes |
| Size axis | Two variants, 📐 Size=sm (256×144 px) and Size=md (640×360 px) — both exactly 16:9 with identical anatomy: a scale demonstration, not a distinct anatomy per size | No size guidance (no component) | No `size` attribute: the frame fills its container's inline size and preserves the media's intrinsic aspect ratio; the sm/md frames document canvas presentation sizes, which on the web are the consumer's layout concern |
| Play affordance | Dark rounded-square container with a light play glyph, centered over the poster in both variants | Closest M3 pattern is the icon button with play iconography; no media-specific affordance is specified | The play control is a real button rendered by ki-video, styled through `--ki-video-play-*` tokens (container surface, glyph foreground, size, radius); it carries its own surface so glyph contrast never depends on the poster imagery |
| Playback chrome | No scrub bar, timeline, volume, captions toggle or fullscreen chrome in either variant (verified 2026-07-17) | None (no component) | After first activation the native player controls own playback; Kimen ships no custom chrome in v1 (Art. V native semantics first, Art. VII simplest design that satisfies the scenarios) |
| Surface & shape | Rounded frame corners over the media in both variants | Card media rounds through the card container's shape tokens | Frame radius and overlay scrim are `--ki-video-*` component tokens; shape is a theme decision, never a prop (002 Round/Square precedent, charter rule on pure-appearance axes) |
| Interactivity & states | Only the static poster-facade state is demonstrated; no hover/pressed/playing states in the set | n/a (no component) | v1 states: facade (before first play) and native playback (after). Hover/focus styling of the play control resolves from tokens; playing-state chrome belongs to the native player |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Watch a video deliberately (Priority: P1)

A person reading a page encounters a video presented as a calm poster with a
single, clearly visible play control — no chrome, no movement, no sound. When
(and only when) they activate that control, playback starts and the familiar
native player takes over: scrubbing, pausing, volume, captions and fullscreen
all work exactly as the platform's player provides them.

**Why this priority**: presenting media without hijacking attention, and then
playing it reliably, is the component's entire reason to exist; every other
behavior layers on top of it.

**Independent Test**: render one ki-video with a poster; observe that nothing
plays and no audio is heard until the play control is activated; activate it
and observe playback start exactly once with the native controls available.

**Acceptance Scenarios**:

1. **Given** a video with a poster image, **When** the page renders, **Then**
   the poster fills the themed frame and one centered play control is the
   only interactive element.
2. **Given** a rendered video showing its poster facade, **When** the user
   activates the play control, **Then** playback starts exactly once and the
   native player controls take over the surface.
3. **Given** a page containing a video, **When** the page finishes loading,
   **Then** no playback has started and no audio is heard.
4. **Given** a 16:9 video in a container narrower than the media's natural
   width, **When** the page renders, **Then** the frame fills the container's
   inline size and the media keeps its proportions undistorted.

---

### User Story 2 - Operate playback with keyboard and assistive technology (Priority: P2)

A keyboard user tabs straight to the play control — the facade's only Tab
stop — sees a visible focus indicator, and starts playback with Enter or
Space; from then on the native player's own keyboard support carries the
session. A screen reader user hears exactly one button whose name says which
video it plays, and the captions the author shipped on the media element stay
available in the native player.

**Why this priority**: the facade inserts itself between the person and the
native player; if the facade's single control is not perfectly reachable,
nameable and operable, the component makes media less accessible than a bare
`<video controls>` (Art. V).

**Independent Test**: tab through a page whose only interactive element is
the video and count exactly one stop; press Enter and observe playback start;
query the accessibility tree for one button named from `label`; check the
slotted captions track is still listed by the playing media; force reduced
motion, activate the play control and observe the facade dismiss with no
transition.

**Acceptance Scenarios**:

1. **Given** a page whose only interactive element is the video's play
   control, **When** the user presses Tab, **Then** focus lands on the play
   control with a visible focus indicator.
2. **Given** the focused play control, **When** the user presses Enter,
   **Then** playback starts exactly once.
3. **Given** a video labeled "Play the product tour", **When** the
   accessibility tree is queried, **Then** it exposes exactly one button
   named "Play the product tour" and the frame contributes no role, name or
   state of its own.
4. **Given** a video whose slotted media carries a Spanish captions track,
   **When** playback starts, **Then** the captions track remains available
   to enable from the native player.
5. **Given** a user whose system requests reduced motion and a rendered
   video showing its poster facade, **When** the user activates the play
   control, **Then** the facade is dismissed without transitional motion.

---

### User Story 3 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every video restyles from the token layer alone — frame radius,
overlay scrim, play control surface, glyph and size. No markup change, no
component change. The same holds under a forced dark scheme.

**Why this priority**: one-step re-theming is Kimen's visible differentiator,
proven in CI since 001; the video carries its whole appearance in component
tokens exactly as 002 carried shape.

**Independent Test**: render a video under onmars, declare the material3
theme, assert frame and play control resolve from material3 token values;
repeat under the forced dark scheme.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** the frame radius and the play control's surface
   and glyph resolve from material3 token values with unchanged markup.
2. **Given** the onmars theme with a forced dark scheme, **When** the page
   renders, **Then** the frame and play control resolve from the dark token
   values.

---

### User Story 4 - An agent composes a valid video (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
picks ki-video for playable content the person chooses to watch, slots one
native `<video>` element with poster and captions, names the play control
through `label`, and knows when NOT to reach for it (decorative background
loops, audio-only content, streaming-platform embeds). Malformed attributes —
for example vocabulary copied from another design system — do not break
rendering.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render a video with an unrecognized variant attribute and
observe default rendering with an operable play control.

**Acceptance Scenarios**:

1. **Given** a video declared with an unrecognized variant attribute,
   **When** the page renders, **Then** the video renders with the default
   appearance and its play control remains operable.

### Edge Cases

- Unknown attributes or attribute values (e.g. `variant="hero"` copied from
  another design system's vocabulary) are ignored: the video renders with
  the default appearance and the play control stays operable
  (agent-generated markup is not trusted to be valid).
- A slotted media element without a `poster` shows whatever the native
  element paints (first frame or empty frame) behind the play control; the
  component does not synthesize a poster.
- A missing `label` is an authoring mistake, not an error state: the
  component still renders, and the unnamed control is surfaced by
  accessibility auditing. No baked-in default string exists (the component
  ships no hardcoded human language).
- `autoplay` on the slotted media is documented as unsupported
  (when-NOT-to-use): the facade's contract is that playback begins only by
  explicit user activation. The component never initiates playback on
  scroll, hover or visibility.
- Children other than exactly one native `<video>` element are documented as
  unsupported; the component does not attempt to repair foreign markup.
- When the media ends, the native player's own end state shows; the facade
  does not reappear. Replay happens through the native controls.
- Media with an aspect ratio other than 16:9 keeps its own intrinsic ratio;
  16:9 is the design-source demonstration, not a constraint.
- Facade dismissal is an instant visibility change under
  `prefers-reduced-motion`; any transition a theme adds must respect it
  (S12, FR-013).
- RTL documents: the play control is centered and unaffected; all internal
  layout uses logical properties (Art. IV).
- A theme that omits a component token must still render: component tokens
  resolve through the semantic layer cascade (missing theme stylesheet falls
  back to onmars, per the 001 contract).

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Video
  A video presents playable media behind a calm poster facade — one
  accessible play control before playback, the native player afterwards —
  inside a frame any brand restyles through tokens alone.

  # Family: core behavior
  # S1
  Scenario: A video presents its poster behind a single play control
    Given a video labeled "Play the product tour" holding media with a poster image
    When the page renders
    Then the poster fills the themed frame and one centered play control is the only interactive element

  # S2
  Scenario: Activating the play control hands the surface to the native player
    Given a rendered video labeled "Play the product tour" showing its poster facade
    When the user activates the play control
    Then playback starts exactly once and the native player controls take over the surface

  # S3
  Scenario: The video never plays on its own
    Given a page containing a video labeled "Play the product tour"
    When the page finishes loading
    Then no playback has started and no audio is heard

  # S4
  Scenario: The frame follows its container and keeps the media's proportions
    Given a 16:9 video placed in a container narrower than the media's natural width
    When the page renders
    Then the frame fills the container's inline size and the media keeps its 16:9 proportions undistorted

  # S5
  Scenario: Unknown attribute values fall back to the default appearance
    Given a video declared with an unrecognized variant attribute copied from another design system
    When the page renders
    Then the video renders with the default appearance and its play control remains operable

  # Family: keyboard path
  # S6
  Scenario: Tab reaches the play control directly
    Given a page whose only interactive element is the video's play control
    When the user presses Tab
    Then focus lands on the play control with a visible focus indicator

  # S7
  Scenario: Enter starts playback from the keyboard
    Given the play control of the "Play the product tour" video is focused
    When the user presses Enter
    Then playback starts exactly once

  # Family: assistive-tech outcome
  # S8
  Scenario: The play control announces its purpose
    Given a video labeled "Play the product tour" showing its poster facade
    When the accessibility tree is queried
    Then it exposes exactly one button named "Play the product tour"
    And the frame contributes no role, name or state of its own

  # S9
  Scenario: Captions on the slotted media stay available
    Given a video whose slotted media carries a Spanish captions track
    When playback starts
    Then the captions track remains available to enable from the native player

  # Family: form participation — N/A for ki-video: a media playback surface
  # is not a form control, holds no value and contributes no entry to
  # submitted form data (justified in spec.md's Scenario Family Coverage
  # table).

  # Family: theming
  # S10
  Scenario: A second theme restyles the video through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the frame radius and the play control's surface and glyph resolve from material3 token values

  # S11
  Scenario: The video honors a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the frame and play control resolve from the dark token values

  # Family: core behavior (appended)
  # S12
  Scenario: Reduced motion dismisses the facade without animation
    Given a user whose system requests reduced motion
    And a rendered video labeled "Play the product tour" showing its poster facade
    When the user activates the play control
    Then the facade is dismissed without transitional motion
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S12 | |
| Keyboard path | S6, S7 | |
| Assistive-tech outcome | S8, S9 | |
| Form participation | | N/A — ki-video is a media playback surface: it is not a form control, holds no value and contributes no entry to submitted form data (charter-listed valid N/A). The slotted native media element does not participate in forms either. |
| Theming | S10, S11 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The component MUST render exactly one slotted native `<video>`
  element inside a themed frame. Before first playback it MUST present the
  facade: the media's own poster (or whatever the native element paints)
  behind exactly one centered play control — the component's only
  interactive element and only Tab stop.
- **FR-002**: Activating the play control (pointer, or Enter/Space from the
  keyboard) MUST start playback exactly once, dismiss the facade, and yield
  the surface to the native player controls, which MUST be available from
  then on. The facade MUST NOT reappear during the session; replay happens
  through the native controls.
- **FR-003**: The component MUST NOT initiate playback on its own: no
  autoplay, no playback on scroll, hover or visibility. Playback begins only
  from user activation of the play control or, afterwards, of the native
  player (WCAG 1.4.2 / 2.2.2 posture by construction).
- **FR-004**: The play control MUST expose role button with an accessible
  name taken from the `label` attribute. No default human-language string is
  baked in; a missing `label` is an authoring mistake surfaced by
  accessibility auditing, not an error state.
- **FR-005**: The frame MUST contribute no role, name or state of its own to
  the accessibility tree. The slotted media's native semantics — including
  text tracks/captions — MUST pass through untouched: the component never
  intercepts, duplicates or re-targets the media element's focus or events.
- **FR-006**: The frame MUST fill its container's inline size and preserve
  the media's intrinsic aspect ratio with no distortion or cropping. All
  internal layout MUST use logical properties so the component behaves
  identically in RTL documents (Art. IV).
- **FR-007**: Every visual property (frame radius, overlay scrim, play
  control size, surface, glyph foreground and radius) MUST resolve from
  `--ki-video-*` component tokens layered over the semantic token layer;
  zero hardcoded visual values.
- **FR-008**: The play control MUST carry its own token-defined surface so
  that the glyph-to-container contrast meets the 3:1 non-text minimum
  regardless of the poster imagery behind it (Art. V; the control never
  depends on unknown media for its visibility).
- **FR-009**: Unrecognized attributes or attribute values MUST NOT break
  rendering; the video renders with the default appearance and the play
  control remains operable.
- **FR-010**: The component MUST expose parts for the customization ladder
  (tokens first, then parts, then slots): `frame` (the media frame) and
  `play` (the play control).
- **FR-011**: The component MUST emit no component events of its own in v1;
  native media events (`play`, `pause`, `ended`, `timeupdate`, …) remain
  observable on the slotted element the consumer already owns.
- **FR-012**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance (never for decorative background
  loops or ambient video, audio-only content, streaming-platform embeds
  with their own chrome, or image display).
- **FR-013**: Facade dismissal MUST complete without transitional motion
  when the user requests reduced motion: the dismissal is an instant
  visibility change, and any transition a theme adds MUST be disabled under
  reduced motion (Art. V; 024 FR-008 precedent). The component requires no
  motion to be functional.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): one new element. `ki-video` (attributes:
  `label` — accessible name of the play control; events: none in v1 — native
  media events stay on the slotted element; slots: default, restricted to
  exactly one native `<video>` element carrying sources, `poster`, `<track>`
  captions and native attributes; parts: `frame`, `play`; component tokens:
  `--ki-video-*`). Additive MINOR; catalog and llms.txt regenerate with the
  entry.
- **Bundle budget** (Art. IV): low single-digit KB gzipped marginal cost — a
  facade, one button and a slot; no player runtime, no custom chrome, no new
  runtime dependency ("none").
- **Accessibility** (Art. V): no APG widget pattern applies — the facade's
  only widget is a plain button, and playback accessibility (transport,
  volume, captions toggle, fullscreen) is delegated to the platform's native
  player, the most tested media UI available. Obligations here: the play
  control is a real button named via `label` (FR-004) with a visible focus
  indicator; its glyph/container pairing self-guarantees ≥3:1 non-text
  contrast independent of poster imagery (FR-008); slotted captions tracks
  pass through (FR-005); the component never autoplays (FR-003), avoiding
  WCAG 1.4.2 (audio control) and 2.2.2 (pause, stop, hide) failure modes by
  construction; facade dismissal completes without transitional motion
  under reduced motion (FR-013). axe zero violations in the facade state
  across themes × schemes × directions.
- **Tokens** (Art. VI): new component token family `--ki-video-*` (frame
  radius, overlay scrim color, play control size, container surface, glyph
  foreground, control radius) resolving from the semantic layer shipped in
  001; focus ring from the global focus tokens. No variant, tone, size or
  state axes: the sm/md Figma frames are scale demos, not an API axis, and
  shape is a theme decision (002 precedent). Both shipped themes (onmars,
  material3) get component token files. No semantic-layer deltas expected.
- **Catalog/agent legibility** (Art. I): when-to-use — playable content the
  person deliberately chooses to watch (product tours, talks, tutorials,
  announcements) presented as a poster with one play control. When NOT to
  use — decorative or background/ambient video loops (plain CSS/`<video>`
  is the tool), audio-only content (future audio component), embeds from
  streaming platforms that ship their own player chrome (use their embed),
  or static imagery (use an image, not a video).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched. The component never fetches
  or interprets media URLs itself; the native element does.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: zero renders in which playback or audio starts without user
  activation — 100% of ki-video instances stay silent and still until the
  play control (or, later, the native player) is operated.
- **SC-002**: the play control is reachable and operable by keyboard alone in
  100% of cases; keyboard activation and pointer activation produce the
  identical outcome (playback starts exactly once, native controls
  available).
- **SC-003**: switching the document theme (onmars ↔ material3) restyles
  every video — frame radius, scrim, play control — with zero markup or
  component changes; only the theme declaration differs. The same holds for
  the forced dark scheme.
- **SC-004**: zero accessibility violations in automated auditing of the
  facade state across themes, schemes and directions; the play control's
  accessible name equals the `label` value in 100% of cases; glyph-to-
  container contrast ≥3:1 in every theme and scheme.
- **SC-005**: 100% of captions tracks declared on the slotted media remain
  listed and enableable after playback starts.
- **SC-006**: the marginal cost of ki-video stays in low single-digit KB
  (gzipped) and within the declared budget gate.
- **SC-007**: with reduced motion requested, facade dismissal completes
  with zero transitional animation (computed transition and animation
  durations of the affected parts are 0).

## Assumptions

- Slotted native `<video>` (rather than `src`/`poster` attributes and an
  internal media element) is the chosen architecture: it keeps sources,
  `<track>` captions and native media events on an element the consumer
  owns, and is the semantic-HTML-first posture of Art. V. An attribute-driven
  convenience layer could land later as additive MINOR without breaking this
  contract.
- No `size` attribute: the Figma set's Size=sm/md variants (256×144,
  640×360) show identical 16:9 anatomy at two canvas scales — a presentation
  demo, not a metric ramp like 002's xs–xl button heights. On the web the
  frame fills its container; consumers size via layout. If founder review
  reads sm/md as a genuine API axis it lands as additive MINOR.
- No custom playback chrome in v1: neither design source demonstrates any
  (MarsUI shows none; M3 has no player component), and the native player is
  the accessible baseline. A branded transport bar would be a new feature
  entering through its own spec.
- No component events in v1: native media events already fire on the slotted
  element the consumer owns; re-emitting them would duplicate the platform.
- The facade never reappears after first activation; end-of-media and replay
  are the native player's states. A "return to poster on end" behavior, if
  ever wanted, is additive.
- `label` is the accessible-name mechanism and ships no default string: the
  component contains no hardcoded human language (i18n neutrality); catalog
  guidance documents `label` as required.
- Material 3 verification 2026-07-17: the M3 component catalog contains no
  video/media-player component; the nearest guidance is media imagery in
  cards and carousels, which informed the frame-shape row only. There is
  no M3 anatomy for ki-video to diverge from.
- The play control's own surface (dark container in the design source) is
  what guarantees non-text contrast over arbitrary posters; themes MUST keep
  a compliant glyph/container pairing (checked by the contrast gate).
- Poster-less media is supported but undocumented visually: the component
  does not synthesize a poster and catalog guidance recommends always
  shipping one.
- No motion of its own: facade dismissal is a visibility change; any
  transition a theme introduces must respect `prefers-reduced-motion` — a
  testable contract per the 024 template (FR-013, S12).
