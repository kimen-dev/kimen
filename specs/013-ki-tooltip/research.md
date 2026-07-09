# Phase 0 Research: ki-tooltip

Decisions that resolve every open technical question in the plan. Sources:
the spec (M3 plain-tooltip guidance; MarsUI verified 2026-07-08 — no tooltip
frame exists, onmars styles from the 001 token vocabulary), the WAI-ARIA APG
Tooltip pattern (read with the pattern in hand for D2/D3/D10), WCAG 1.4.13
(content on hover or focus), the ARIA 1.3 `aria-description` draft and the
cross-root ARIA / Reference Target explainers (D2), the 001 token
architecture, the 002 ki-button implementation (`--_ki-*` CSS indirection,
fallback-by-construction), the 007 ki-radio-group plan set (the repo's
precedent for a contract that crosses the shadow boundary: what the platform
cannot provide across shadow roots, the component provides — and every
cross-shadow claim is VERIFIED, never assumed) and the 011 ki-alert plan set
(non-form component conventions, no-motion-by-construction, contrast-sweep
extension design).

Shared decisions inherited from the siblings (cited, not re-derived):

- **`--_ki-*` private CSS indirection over component tokens** — 002 pattern
  (D8).
- **Unknown-value fallback by construction, not validation code** — 002 D3
  (applied to `placement` in D4; here the normalization also feeds the
  positioning logic, so a tiny pure normalizer exists and is unit-tested).
- **Per-component contrast-sweep extension in the same change that ships the
  tokens** — mandated by `check-contrast.mjs`'s own contract; per-pair
  minimum mechanism shared with 008 D8 / 011 D8 (D8 below).
- **No motion in v1 — reduced-motion satisfied by construction** — 011's
  precedent, adapted (D6): the tooltip's temporal behavior lives in
  tokenized show/hide DELAYS, not in animation.
- **Pure logic extracted to small exhaustively-tested modules as the
  mutation-gap compensating control** — 006/007/011 convention (D9).
- **Cross-shadow AT claims are verified by the mandatory manual walkthrough,
  with a recorded contingency** — 007 D1/D10's discipline (D2, D10).

## D1 — Shadow anatomy: slot-wrapped trigger + one conditional shadow bubble

**Decision**: the shadow root renders

```html
<slot />                                          <!-- the trigger (light DOM) -->
<div part="tooltip" role="tooltip">{label}</div>  <!-- only when label is non-blank -->
```

with plain `shadow: true` (no `delegatesFocus` — the host is never focusable
and the tooltip must never add a tab stop, FR-006). The host styles as
`display: inline-block; position: relative`, making it the containing block
for the absolutely positioned bubble (D4). The bubble is rendered ONLY when
`label` has non-whitespace content (S13's no-empty-bubble half is true by
construction); when rendered, it is kept in layout with
`visibility: hidden` until shown, so it is measurable for positioning
BEFORE it becomes visible and it leaves the accessibility tree entirely
while hidden (S8 asserts the tooltip role only on the VISIBLE tooltip).
`role="tooltip"` satisfies S8; the bubble's content is the `label` text —
text-only by construction (FR-001), never focusable, never interactive
(FR-006): no `tabindex`, no focusable descendants exist.

**Rationale**: the APG tooltip pattern needs exactly one ARIA role
(`tooltip`) and one association (D2); everything else is CSS and a small
state machine (D3). A visibility-based hidden state (instead of
`display: none` or conditional rendering of the open state) is what makes
one-shot measurement (D4) possible without a double render pass.

**Alternatives considered**: (a) conditional-render the bubble only while
open — forces measure-after-render juggling (show, wait a frame, measure,
reposition) and flashes unpositioned content; rejected. (b) `popover`
attribute on the bubble (top-layer) — escapes ancestor clipping but forfeits
host-anchored positioning: coordinates must be recomputed in viewport space
on every scroll/resize while open; without CSS anchor positioning (not in
the Art. IV engine baseline yet, D4) that is strictly more JS for no
approved scenario; recorded as the tracked upgrade path together with
anchor positioning; rejected for v1. (c) arrow/caret element — the spec
excludes an arrow part in v1; rejected.

## D2 — Description association across the shadow boundary: reflect `label` to `aria-description` on the slotted trigger

**The constraint that frames the choice**: the trigger lives in the light
DOM (default slot); the tooltip text renders inside the component's shadow
root. `aria-describedby` is an IDREF attribute and IDREFs do not resolve
across shadow boundaries, so the canonical APG association
(`aria-describedby` on the trigger pointing at the tooltip element) is
impossible in ANY architecture that keeps the tooltip content encapsulated
— which FR-001/FR-009/FR-011 require (component-rendered, token-styled,
part-exposed content). The spec resolved the contractual question already:
FR-002 states that annotating the slotted trigger with description-related
ARIA attributes is part of attaching the semantics, not an alteration of
behavior; the concrete technique is this plan-time decision, verified only
against observable accessibility-tree outcomes (S7, S8, S13).

**Decision**: the component reflects the `label` string to the
**`aria-description` attribute of the slotted trigger element**:

- Trigger discovery: the default slot's `slotchange` →
  `assignedElements()[0]` (the contract targets exactly one trigger; extra
  elements are a documented usage constraint, spec edge case).
- Lifecycle: label non-blank → `trigger.setAttribute('aria-description',
  label)`; label blank/removed, trigger swapped out, or host disconnected →
  the attribute is removed from the (previous) trigger (S13's
  no-dangling-description half). `@Watch('label')` keeps it current.
- The association is STATIC — present whenever a non-blank label exists,
  independent of tooltip visibility. This is deliberate APG behavior (the
  description exists; showing the bubble is a visual affordance) and it is
  exactly what S7 asserts (no visibility precondition in its Given).
- The trigger's accessible NAME is never touched (S7: name stays "Send") —
  `aria-description` participates only in description computation.

**State of the art, stated honestly (2026)**: `aria-description` is ARIA
1.3, still a Working Draft — but it is implemented in the engines of the
Art. IV baseline (Chromium since 101, Firefox and WebKit both expose it in
description computation in current and previous stable). The repo does not
take that on faith: S7 is a real-browser accessibility-tree assertion, so
engine support is MEASURED by the PR gate on Chromium and by the
pre-release engine matrix on all three engines — and the announcement
behavior on real AT (which no automated audit observes) is a named
verification point of the mandatory APG walkthrough (D10), with the
contingency below recorded in advance. On the AT side, once the string
enters the accessibility tree as the description, it flows through the same
platform description property that `aria-describedby` feeds, so
screen-reader verbosity treatment is identical.

**Two nuances the decision must own**:

1. **Composite triggers**: with a native interactive element slotted (the
   fixture in every approved scenario — a "Send" `<button>`), the attribute
   sits directly on the element that owns the accessible node: exact APG
   semantics. With a Kimen composite slotted (e.g. `ki-tooltip` wrapping
   `ki-button`), the attribute lands on the composite HOST while the role
   lives on its shadow-internal native element — whether the platform
   associates a host's description with the focused inner control is a
   cross-shadow claim that must be VERIFIED, not assumed (007's rule). The
   walkthrough checks it explicitly (D10); if a target pair drops the
   description, the recorded remedy is a one-line forward inside the
   affected Kimen component (host `aria-description` → its internal
   control), an additive sibling fix — not an architecture change here.
2. **Precedence**: per the accessible name and description computation,
   `aria-describedby` outranks `aria-description`. A consumer-authored
   `aria-describedby` on the trigger therefore masks the tooltip's
   description; the component OWNS `aria-description` on its trigger and
   never touches `aria-describedby`. Documented as a usage constraint
   (don't wrap a trigger that already carries its own description
   machinery); no approved scenario exercises the collision.

**Alternatives considered**: (a) `ariaDescribedByElements` element
reflection — doubly rejected: cross-root element references may only point
to the same scope or a shadow-INCLUDING-ANCESTOR scope, never INTO a
descendant shadow root (encapsulation rule), so the trigger cannot
reference the bubble inside the component's shadow root at all; making that
resolvable is precisely the Reference Target proposal, and the constitution
rules Reference Target is never load-bearing (Art. IV). When Reference
Target matures, adopting it is a mechanism-only swap with zero contract
change — tracked, not used. (b) copying the label into a component-generated
visually-hidden light-DOM node next to the trigger +
`aria-describedby` — works on ARIA 1.2 everywhere, but mutates the
consumer's light DOM: the host's children are consumer-owned markup, and
framework reconcilers (React/Vue re-renders) can strip or duplicate the
injected node, plus idref bookkeeping. NOT the principal path — but it is
the RECORDED CONTINGENCY if the walkthrough finds a baseline engine/AT pair
that does not expose `aria-description`: the swap changes mechanism only;
S7/S8/S13's observable outcomes are unchanged. (c) native `title` on the
trigger — rejected even as a degraded fallback: `title` never reveals on
keyboard focus (violating the parity the component exists for) and would
render the browser's OWN hover bubble next to ours (double tooltip).

## D3 — Reveal/dismiss state machine on the HOST; delays resolved from tokens

**Decision**: the component never attaches listeners to the slotted trigger.
All interaction is observed at the host (and, while visible, one document
listener for Escape — D5):

- **Pointer path**: `pointerenter`/`pointerleave` on the host. Because the
  bubble is a shadow descendant of the host in the composed tree, pointer
  events over the bubble retarget to the host: `pointerenter` fires when
  entering trigger OR bubble; `pointerleave` fires only when leaving both.
  Crossing the offset gap between trigger and bubble briefly fires
  `pointerleave` — the hide delay (below) keeps the tooltip visible during
  the traversal, and re-entry cancels the pending hide. That single
  mechanism yields S2 (leave → hidden), S12 (move onto the tooltip → stays)
  and WCAG 1.4.13 *hoverable* at once.
- **Keyboard path**: `focusin`/`focusout` on the host (both are composed
  and bubble from the slotted trigger). `focusin` shows with NO delay
  (FR-003); `focusout` hides immediately (S6). Plain focus, not
  `:focus-visible`-gated: no approved scenario distinguishes click-focus
  from Tab-focus, and hover already reveals for pointer users (Art. VII).
- **State**: two booleans (`pointerWithin`, `focusWithin`) plus one timer.
  Desired visibility = `pointerWithin || focusWithin` (and label non-blank,
  D7). closed→open caused by pointer alone waits `show-delay`
  (hover-intent); caused by focus it is immediate. open→closed caused by
  pointer leave waits `hide-delay`; caused by focus loss (with no hover) or
  Escape (D5) it is immediate. Escape needs no re-show latch: while
  hover/focus persist no new `pointerenter`/`focusin` fires, so the tooltip
  stays dismissed until a fresh interaction — APG behavior for free.
- **Delays are tokens**: `--ki-tooltip-show-delay` and
  `--ki-tooltip-hide-delay`, read at interaction time via
  `getComputedStyle(host)` and parsed by a pure `parseDelay` helper
  (`ms`/`s`/blank/garbage → milliseconds, invalid → 0). Timing is a design
  value like any other: hardcoding milliseconds in TS would be a visual
  value outside the token graph (Art. VI). JS `setTimeout` drives them —
  deterministic under fake timers, and fixtures can pin the tokens to
  explicit values (D9).

**Rationale**: FR-003/FR-004/FR-005 verbatim with the fewest moving parts:
two host listeners per modality, one timer, zero trigger mutation beyond
D2's single attribute. Listening on the host is what makes the slotted
trigger arbitrary — the component works with any interactive element
without knowing its type.

**Alternatives considered**: (a) CSS-only delays via `transition-delay` on
`visibility` — elegant, but Escape/focus need instant transitions on the
same property, forcing per-cause delay overrides through extra state
classes, and test determinism would hang on real transition timing instead
of fakeable timers; rejected. (b) listeners on the slotted trigger element
— requires attach/detach bookkeeping per slotchange and touches consumer
markup beyond the one contracted attribute; the host sees everything the
trigger sees; rejected. (c) a `mouseover`-based hover bridge pseudo-element
spanning the gap — solves traversal spatially instead of temporally, adds
hit-testing surface for zero scenarios the hide delay does not already
satisfy; rejected.

## D4 — Positioning: CSS logical placements + one measured flip/clamp pass; no floating-ui, no anchor positioning yet

**Decision**: in-house, two layers:

- **CSS (structural)**: the bubble is absolutely positioned against the
  host with LOGICAL properties only. The effective placement (a shadow
  class on the bubble, never a public attribute) selects the main-axis
  rule: `top` → `inset-block-end: calc(100% + var(--_ki-tooltip-offset))`,
  `bottom` → mirrored with `inset-block-start`; `start` →
  `inset-inline-end: calc(100% + offset)`, `end` → mirrored. Logical
  properties make `start`/`end` follow the writing direction by
  construction (S11, FR-007, Art. IV). `inline-size: max-content` +
  `max-inline-size: var(--_ki-tooltip-max-inline-size)` size the bubble.
- **JS (one pass per reveal)**: before flipping to visible, the component
  measures `host.getBoundingClientRect()` and the hidden-but-laid-out
  bubble's rect (D1) and calls the pure function
  `resolveTooltipPosition({ placement, dir, triggerRect, tooltipRect,
  viewport })` → `{ effectivePlacement, crossAxisShift }`:
  - `placement` arrives through the pure normalizer `normalizePlacement`
    (unknown → `top`: S3/FR-008 fallback in one tested branch);
  - `dir` comes from `host.matches(':dir(rtl)')` (007 D6 precedent);
  - main axis: if the preferred side lacks viewport room and the opposite
    side has more, flip to the opposite placement (S14: top at the top
    edge → below); otherwise keep the preference;
  - cross axis: center on the trigger, then clamp the shift so the bubble
    stays fully inside the viewport (SC-005 for all four placements).
  The component applies the result as the effective-placement class plus
  one private custom property (`--_ki-tooltip-cross-shift`) consumed by the
  CSS. Position is computed once per reveal (and re-computed if `label` or
  `placement` changes while visible); v1 does NOT track scroll/resize while
  open — a tooltip is transient, no approved scenario observes mid-reveal
  scrolling, and the host-anchored bubble moves with the trigger for free
  on normal document scroll (documented usage note).

**Constraint declared honestly**: a clipping ancestor
(`overflow: hidden/clip`, `contain: paint`) between host and viewport can
clip the bubble — the cost of host-anchored positioning without the top
layer. No approved scenario exercises it; documented as a usage constraint.
The erased-cost upgrade path is `popover` + CSS anchor positioning
(`position-try-fallbacks` replaces the flip/clamp function wholesale), NOT
adoptable yet: anchor positioning is missing from Firefox current+previous,
below the Art. IV baseline. Tracked as a mechanism-only future change.

**Alternatives considered**: (a) floating-ui — Art. IV demands written KB
justification for any runtime dependency and the spec pre-declared
"in-house is the default": the approved scenarios need exactly one flip and
one clamp (~a screen of pure code, exhaustively unit-tested) versus ~10 KB
of dependency; rejected. (b) CSS anchor positioning now — baseline fails on
Firefox; rejected (tracked). (c) pure-CSS cross-axis centering
(`inset-inline: 0` + `margin-inline: auto`, or `50%` + `translate`) — the
auto-margin trick breaks when the bubble is wider than the host
(overconstrained margins), and percentage+translate needs
direction-dependent sign flips; the JS pass already exists for the
flip/clamp, so centering rides it; rejected. (d) `position: fixed` +
viewport coordinates — decouples the bubble from the trigger on scroll,
requiring live tracking v1 does not need; rejected.

## D5 — Escape: consumed at the document capture phase; dialog precedence by construction

**Decision**: while (and only while) the tooltip is visible, the component
registers ONE `keydown` listener on `document` in the CAPTURE phase; it is
removed on hide and on disconnect (zero idle cost, no always-on document
listeners). On `Escape`: hide immediately (cancel timers), call
`event.preventDefault()` AND `event.stopPropagation()`, and never touch
focus (S5: trigger keeps focus; S15: focus stays wherever it was — the
listener works regardless of where focus rests because `keydown` targets
the focused element but capture at the document sees every composed
keydown first).

**Why this yields FR-013/S16 (tooltip-in-dialog precedence)**:
`stopPropagation()` in capture prevents ANY ancestor or document-level
bubble listener (including a future `ki-dialog`'s Escape handling) from
observing the event; `preventDefault()` cancels the platform close-request
behavior, so a native `<dialog>` (open via `showModal()`) does not fire
`cancel`/close on that press. S16's browser test exercises exactly this
against a real native `<dialog>` — the precedence is measured, not assumed.
**Cross-spec note for 012-ki-dialog** (recorded here because 012 is not yet
planned): the dialog's own Escape behavior must ride the platform close
request or a non-capture listener that respects `event.defaultPrevented` —
never a document CAPTURE listener, or the two components would race. The
012 plan inherits this as an input.

**Alternatives considered**: (a) `keydown` on the host — misses S15
entirely (focus, and therefore the event path, is on another element while
the tooltip is hover-shown); rejected. (b) bubble-phase document listener —
runs AFTER a modal dialog's capture-or-target handling could act; capture
is the only phase that guarantees the innermost transient surface wins;
rejected. (c) a shared "escape stack" service coordinating tooltip/dialog —
speculative infrastructure for exactly one interaction that
capture+preventDefault already resolves (Art. VII); rejected.

## D6 — No animation in v1: reduced motion satisfied by construction; the delays carry the temporal design

**Decision**: `ki-tooltip.css` declares NO `transition`/`animation`. Show
and hide are instant visibility flips; the perceived pacing comes from the
tokenized show/hide delays (D3), which are input-intent timing, not motion
— `prefers-reduced-motion` does not ask for their removal. S17 ("appears
without animated movement") and FR-010 ("instant or a non-moving fade")
hold by construction, exactly like 011's no-motion decision; the S17 test
still runs under real reduced-motion emulation and asserts the absence of
transition/animation on the revealed bubble, so the guarantee is measured
and survives a future fade.

**Rationale**: Art. VII — a fade satisfies no approved scenario. Adding one
later (opacity-only, inside `@media (prefers-reduced-motion:
no-preference)`, duration from a new token) is additive.

**Alternatives considered**: opacity fade now — pulls in a duration token
and a reduced-motion media block for zero scenario coverage; rejected.

## D7 — Blank label and lifecycle hygiene

**Decision**: `label` is blank when empty or whitespace-only
(`label.trim() === ''`). Blank label (S13, FR-001): no bubble rendered
(D1), no `aria-description` on the trigger (D2), and the state machine
refuses to open (guard at the show transition — hover/focus become
no-ops). Label transitions: blank→non-blank re-arms everything;
non-blank→blank while visible hides immediately and strips the attribute.
Disconnect: clear timers, remove the document Escape listener (D5), remove
`aria-description` from the trigger. Trigger swap via `slotchange`: strip
the old trigger, annotate the new one; a pending/open tooltip closes (the
anchor changed).

**Rationale**: S13 asserts BOTH observable halves (no bubble, no
description); making them fall out of one `isBlank` predicate keeps the
invariant unbreakable. Cleanup on disconnect is what keeps the document
listener claim in D5 ("zero idle cost") honest.

## D8 — Component token layer: `--ki-tooltip-*` (13 per theme) + contrast sweep extension

**Decision**: new DTCG sources under `packages/tokens/tokens/component/`:

- `tooltip.tokens.json` — theme-neutral schema resolving from the 001
  semantic layer (onmars by inheritance):
  - structure (5): `radius`, `padding-inline`, `padding-block`,
    `max-inline-size`, `offset` (trigger↔bubble gap) — referencing
    `ki.radius.*`/`ki.space.*` primitives and `ki.corner.*`;
  - color (2): `bg`, `fg` — the inverse pairing. Plan-time finding: the 001
    semantic layer ALREADY ships the inverse vocabulary
    (`ki.surface.inverse-white`/`ki.surface.inverse-black`,
    `ki.text.high-em-inverse`) — the spec's anticipated semantic-layer
    delta is NOT needed; the tooltip is the first component consumer of
    the inverse ramp. Exact refs chosen under the extended sweep at
    implementation (011 convention);
  - typography (3): `font-size`, `font-weight`, `line-height` —
    referencing `ki.font.*`;
  - elevation (1): `shadow` — referencing `ki.elevation.*`;
  - timing (2): `show-delay`, `hide-delay` — DTCG duration type. No
    semantic/primitive motion layer exists yet (verified: 001 ships no
    duration tokens), so these carry literal millisecond values at the
    component layer; when a motion layer arrives they re-point (additive).
    These two names extend the family enumeration in the spec's
    constitutional surface — declared in plan.md's Art. VI line and flagged
    for the founder at gate 1.
- `tooltip.material3.tokens.json` — material3 overrides for the same names
  (M3 plain tooltip: inverse-surface container, inverse-on-surface label,
  extra-small corner), mirroring `button.material3.tokens.json`.

Wiring: append both files to `LAYERS`/`MATERIAL3_LAYERS` in
`packages/tokens/style-dictionary.config.mjs`. Component CSS consumes
exclusively through `--_ki-tooltip-*` indirection on `:host` (002 pattern —
here with no state matrix: the tooltip has no hover/active states of its
own, spec design-analysis row "not interactive").

Contrast gate: extend the per-component pattern list in
`packages/tokens/scripts/check-contrast.mjs` (its own comment mandates the
extension or the gate silently ignores the family) with
`--ki-tooltip-bg` paired to `--ki-tooltip-fg` at **4.5:1** — the label is
TEXT (WCAG 1.4.3), unlike 008/011's 3:1 non-text pairs. Per-pattern
zero-match guard; unit cases in `check-contrast.test.mjs`. Mechanism note:
if a sibling (008/011) lands the per-pair-minimum refactor first, rebase
onto it and add only the tooltip pair; otherwise a single 4.5 pair rides
the existing `MIN_RATIO` unchanged.

**Rationale**: the spec's constitutional surface fixes this vocabulary
(structure, color, typography, shadow; no size/variant/tone axes, no state
matrix, no focus ring — the tooltip is never focusable). 13 tokens is the
full appearance plus the two timing values Art. VI keeps out of the code.

**Alternatives considered**: (a) hardcoded delays in TS — visual values
outside the token graph (Art. VI); rejected. (b) a shared
`--ki-overlay-*` family anticipating popover/toast — wrong-abstraction bait
before a third occurrence (Art. VII); rejected. (c) state/tone axes — no
scenario, no M3 basis; rejected.

## D9 — Tests, determinism and traceability

**Decision**: all test files marked `// @spec:013-ki-tooltip`, S-IDs on
code lines (test titles):

- `ki-tooltip.spec.tsx` (mock-doc, fast): anatomy (slot + conditional
  `part="tooltip"` bubble with `role="tooltip"`; no bubble when label is
  blank — S13's markup half; no tabindex anywhere); exhaustive unit cases
  for the pure helpers in `ki-tooltip.position.ts` and
  `ki-tooltip.delay.ts` — `normalizePlacement` (4 valid + unknown/empty →
  `top`, S3), `resolveTooltipPosition` (placement × dir × fits/overflows
  matrix: flip at each edge S14, cross-axis clamp SC-005, `start`/`end`
  under LTR and RTL S11-mapping), `parseDelay` (`ms`, `s`, blank, garbage
  → 0) — the mutation-gap compensating control (007/011 convention).
- `ki-tooltip.browser.spec.ts` (real browser, built output +
  `@kimen/tokens/css`, 002/011 pattern; REAL pointer hover and REAL Tab
  focus, never synthetic dispatch): S1, S2, S12 pointer path; S3 unknown
  placement renders above; S13 hover on blank label shows nothing and the
  trigger exposes no accessible description; S14 top-edge flip; S4 Tab
  reveals; S5 Escape hides, focus retained, zero trigger activations
  (SC-002); S6 focus moves on → hidden; S15 hover-shown + focus elsewhere
  + Escape; S16 native `<dialog>` (`showModal()`) + visible tooltip +
  Escape → tooltip hidden, dialog open; S7 accessible description equals
  the label AND accessible name unchanged; S8 visible bubble exposes the
  tooltip role with the label as content; S9 material3 restyle; S11 RTL
  `placement="start"` renders on the right (bounding boxes); axe zero
  violations across the four placements, shown and hidden.
- `ki-tooltip.dark.browser.spec.ts`: S10 forced dark under onmars (the
  002 dark-instance split — vitest config routes `*.dark.browser.spec.ts`
  to the dark-emulating instance).
- `ki-tooltip.motion.browser.spec.ts`: S17 under REAL
  `prefers-reduced-motion: reduce` emulation — a new
  reduced-motion-emulating instance added to the elements vitest browser
  config, mirroring the dark-instance mechanism (test-infra addition,
  declared in plan.md).

**Determinism**: the delays are the component's own `setTimeout`s (D3), so
they are fully controllable: flow tests pin the tokens on the fixture
(`style="--ki-tooltip-show-delay: 0ms; --ki-tooltip-hide-delay: 0ms"`); the
delay behavior itself gets dedicated tests with non-zero pinned values
driven by fake timers (hover-intent wait, linger-across-gap for S12). No
real-time sleeps anywhere (Art. III).

**Rationale**: the traceability gate requires S-IDs on code lines of marked
files; the browser suite asserts what ships. All 17 approved scenarios
(S1–S17) map to test tasks (tasks.md Notes carries the full map).

## D10 — Accessibility specifics and the mandatory APG walkthrough

**Decision**: **manual APG tooltip walkthrough REQUIRED** — the spec's
constitutional surface and the batch charter both flag the tooltip pattern
as new to the repo (Art. V). Executed against the built Storybook/manual
page with the APG Tooltip pattern and WCAG 1.4.13 in hand, documented in
the PR:

- reveal parity: hover AND Tab-focus each reveal; focus reveal is
  immediate; no pointer-only path (SC-001);
- WCAG 1.4.13 trio: dismissible (Escape, focus untouched), hoverable
  (pointer onto the bubble), persistent (stays until hover/focus ends or
  dismissed);
- Escape inside an open modal dialog dismisses only the tooltip (S16);
- screen-reader outcomes automation cannot fully pin: the trigger
  announces its own NAME unchanged, followed by the tooltip text as its
  DESCRIPTION (NVDA + VoiceOver at minimum) — the named verification point
  for D2's `aria-description` decision, with the light-DOM description-node
  fallback as the recorded contingency, and the composite-trigger check
  (ki-button as trigger) with the one-line-forward remedy noted in D2;
- the tooltip is never reachable by Tab and contains nothing interactive;
- touch note: v1 defines no touch gesture (spec open question for gate 1);
  content is never essential, so nothing is lost — recorded in the
  walkthrough for the founder's placement decision.

axe runs across placements × themes × schemes as the floor, never the
proof (Art. V). No focus-ring tokens exist on purpose: the tooltip is
never focusable; the trigger's own focus indication belongs to the trigger.

**Rationale**: Art. V's floor-vs-proof language — for a pattern whose
central risk is a cross-shadow description claim, the proof is a human
hearing the description announced on real AT, exactly as 007 verified its
cross-shadow position-in-set claim.
