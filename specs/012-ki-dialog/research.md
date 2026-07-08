# Phase 0 Research: ki-dialog

Decisions that resolve every open technical question in the plan. Sources:
the spec (design-source analysis: no MarsUI dialog frame — only the
`Modal_overlay` scrim symbol; Material 3 basic dialog; verified 2026-07-08),
the WAI-ARIA APG Dialog (Modal) pattern, the WHATWG HTML `<dialog>`
algorithms (show-modal, dialog focusing steps, close-the-dialog, close
requests), the 001 token architecture, the 002 ki-button implementation
(`--_ki-*` CSS indirection, focus-ring tokens, browser-suite layout) and the
008/009/011 sibling plans (contrast-sweep extension mechanism, slot-emptiness
tracking, test layout — decisions cited rather than re-derived, Art. VII).

## D1 — Base: native `<dialog>` + `showModal()` inside the shadow root; the host `open` attribute drives it through methods only

**Decision**: the shadow root renders

```html
<dialog part="dialog" aria-labelledby="heading">  <!-- labelledby only when heading exists, D5 -->
  <h2 part="heading" id="heading">…</h2>          <!-- only when heading non-empty, D5 -->
  <div part="body"><slot /></div>                  <!-- scrolls when too tall, D6 -->
  <div part="footer"><slot name="footer" /></div>  <!-- collapses when empty, D6 -->
</dialog>
```

The host prop `@Prop({ reflect: true, mutable: true }) open = false` is the
single public source of truth. A `@Watch('open')` plus the initial
`componentDidLoad` sync drive the INTERNAL dialog exclusively through
`showModal()` / `close()`. The internal element **never receives the native
`open` content attribute from the component**: a `<dialog open>` renders
non-modally — no top layer, no `::backdrop`, no background inertness — which
is exactly the wrong half of the platform. The sync is idempotent: it acts
only when `internalDialog.open !== this.open`, which yields FR-002's no-ops
(`show()` while open, `close()` while closed — no state change, no duplicate
event) and prevents watcher re-entrancy when the dialog closes itself.

**What the platform gives for free** (Art. IV/VII — the reason this is the
base): top-layer rendering above every stacking context (S1 "above the
page"), the `::backdrop` pseudo-element (D7), background inertness for
pointer, keyboard AND assistive technology (S1, S7, S10 — the a11y tree
drops everything outside an open modal dialog), Escape as a platform close
request (`cancel` → close, FR-006), the dialog focusing steps on open (D2)
and the previously-focused-element restore on close (D3). Zero focus-trap
code, zero `aria-modal`/`role` attributes, zero scrim element ship in the
component.

**Close-reason and event wiring** (FR-003, S2, S4, S8, S15): a private
`pendingReason` defaults to `'method'`. The internal `cancel` event (fires
on a close request — Escape; it does not bubble, listened directly on the
internal dialog; **never prevented** — Escape always closes, FR-006) sets it
to `'escape'`. The opt-in backdrop path (D4) sets `'backdrop'` and then
calls the internal `close()`. Every close path — `close()` method, removing
`open`, Escape, backdrop — funnels into the internal `close` event, which
fires exactly once per closing; the handler syncs `this.open = false`
(guarded no-op when already false), emits exactly one
`new CustomEvent('ki-close', { bubbles: true, composed: true,
cancelable: false, detail: { reason } })` and resets `pendingReason` to
`'method'`. Exactly-one (S15) holds by construction: one internal close
event per closing, one dispatch site. Platform note: the native `close`
event is fired from a queued task, after the close steps have already
restored focus — so `ki-close` is a post-close notification dispatched when
focus is already back on the invoker (the spec's Assumptions record it as
not cancelable).

**Out of scope, declared**: `showModal()` does not lock background page
scrolling in current engines, and no approved scenario asserts scroll
locking — the component ships no body-scroll-lock machinery (Art. II/VII;
S1's inertness contract is pointer/keyboard/AT reachability, all covered
natively). Stacked dialogs ride platform top-layer ordering (spec
Assumptions; not an advertised v1 pattern, no code). Removing the host from
the document while open tears down its top-layer presence per platform
rules without a `close` event — no `ki-close` fires because no close
happened.

**Alternatives considered**: (a) `<div role="dialog" aria-modal="true">` +
hand-rolled focus trap + scrim element + key handlers — reimplements what
the platform ships, is the historically buggy path (focus leaks to browser
chrome, AT inertness requires `aria-hidden` bookkeeping on the whole page),
and violates Art. IV's platform-first mandate; rejected. (b) reflecting the
host `open` onto the internal dialog's native attribute — non-modal
rendering, loses top layer/backdrop/inertness; rejected. (c) the `closedby`
attribute (`closedby="any"` = platform light-dismiss, `closedby="none"`) —
the platform's own future for D4's problem, but not shipped in the
current + previous versions of all three engines at planning time; recorded
as the natural post-v1 simplification, rejected for v1 (Art. IV engine
baseline). (d) observing the internal dialog's `open` attribute mutations as
a second sync source — two sources of truth for one state; rejected (the
internal `close` event is the only feedback channel needed).

## D2 — Focus entry: native placement plus a deterministic entry assist for slotted content

**Decision**: after `showModal()` returns, the open path runs a pure helper
`resolveEntryFocusTarget(host)` (in `ki-dialog.focus.ts`): first slotted
element carrying `autofocus` (light-DOM query on the host — slotted nodes
are children of the HOST, not of the internal dialog) → else first focusable
slotted element in composed order (visible, enabled, not `tabindex="-1"` —
the 011 D4 focusable heuristic, re-stated locally, not shared; extraction
waits for the third occurrence, Art. VII) → else `null`, in which case the
native choice stands: the dialog focusing steps focus the dialog surface
itself. If the helper returns an element that is not already the composed
active element, the component focuses it.

**Rationale**: FR-005's entry priority (slotted `autofocus` → first
focusable → dialog surface) must hold deterministically, and the native
dialog focusing steps are exactly where engines have historically diverged
for shadow hosts: the `autofocus` lookup was long specified over node-tree
descendants of the dialog — which slotted light-DOM content is NOT — and the
focus-delegate rewrite that fixed it landed unevenly. The assist makes the
contract engine-independent: when the native steps already picked the right
element (the common case in current engines) the assist is a no-op, and the
whole open sequence is synchronous, so there is no visible double focus
move. When no focusable content exists, native focuses the internal dialog
element itself (spec-mandated `control = subject` fallback) — Escape still
works from there (close requests target the top-layer dialog regardless of
focus) and the visible ring comes from `dialog:focus-visible` +
`--ki-dialog-focus-ring-*` (the spec's "exercised when the dialog surface
itself takes focus"). The helper is exhaustively unit-tested per branch —
together with D4's `isOutsideRect` it is the mutation-gap compensating
control (plan.md Art. III).

**Alternatives considered**: (a) native placement only — S6's outcome would
depend on per-engine focus-delegate behavior over slotted content; rejected
(deterministic gates, Art. III). (b) `delegatesFocus` on the shadow root —
addresses host `.focus()` calls, not dialog opening, and would make the
non-focusable host swallow clicks into focus moves; rejected. (c) a full
tab-order model (positive tabindex ordering) — the repo's a11y rules forbid
positive tabindex and no scenario needs it; rejected (011 D4 reasoning).

## D3 — Focus return: the native previously-focused-element mechanism, declared and pinned; no component-side invoker tracking

**Decision**: rely entirely on the platform. `showModal()` stores the
element focused AT CALL TIME as the dialog's *previously focused element* —
an element reference, so shadow boundaries do not sever it (the invoker
outside the shadow root is stored as-is). The close-the-dialog steps run the
focusing steps for that stored element **only when focus is currently inside
the dialog**, and without scrolling the viewport. The component adds no
invoker bookkeeping of its own — one source of truth (Art. VII).

This native mechanism satisfies every FR-005 return clause, including the
fallbacks:

- footer action / Escape / backdrop / programmatic close with focus inside →
  focus returns to the invoker (S8; SC-003);
- invoker removed or unfocusable at close time → the focusing steps for it
  do nothing and the UA's focus fixup lands on the document body, unscrolled
  (spec Edge Cases; the documented fallback);
- dialog declared `open` in the initial markup → the stored element is the
  body (nothing else held focus), so close lands on the body — again the
  documented fallback;
- close while focus is OUTSIDE the dialog (programmatic close from an
  unrelated handler) → native skips the restore, which is correct: focus is
  not stolen from wherever the application put it.

**Verification, declared**: the through-shadow restore is asserted by S8's
browser test plus the opener-removed and initial-markup-open edge tests, and
runs in all three engines under `KIMEN_BROWSER_MATRIX=1`. **Contingency,
declared**: if the matrix run exposes an engine deviation, the amendment is
snapshotting the composed `document.activeElement` in the open path and
focusing it from the close handler — a few spec-shaped lines that enter
through the failing test, never speculatively (Art. III/VII).

**Alternatives considered**: (a) always tracking the invoker in the
component — duplicates the platform mechanism and can disagree with it (two
sources of truth for one focus move); rejected unless a test forces it.
(b) restoring focus manually on every close regardless of where focus is —
steals focus from applications that legitimately moved it; rejected (native
semantics are the correct ones).

## D4 — Backdrop dismissal: opt-in coordinate detection, armed by pointerdown

**Decision**: only when the `close-on-backdrop` boolean attribute is present
(FR-007; presence-only semantics — `close-on-backdrop="false"` still opts
in, and the catalog tells agents to omit the attribute instead, spec Edge
Cases). Clicks on `::backdrop` are retargeted by the platform to the
originating `<dialog>` element (pseudo-elements never appear as event
targets; the inert page behind never receives the hit), so backdrop clicks
arrive at the internal dialog with coordinates OUTSIDE its bounding rect.
Detection is two-step to kill the classic misfire:

1. `pointerdown` on the internal dialog with `event.target` being the
   dialog itself AND `isOutsideRect(clientX, clientY,
   dialog.getBoundingClientRect())` → arm; any pointerdown inside → disarm.
2. `click` under the same two conditions while armed → set `pendingReason =
   'backdrop'`, call the internal `close()`; always disarm after.

Pressing inside the dialog (text selection), dragging out and releasing on
the backdrop produces a `click` whose coordinates are outside — but the
pointerdown was inside, so nothing was armed and the dialog stays open (a
critical confirmation is never destroyed by a selection gesture — the same
protective intent as S3's default). `isOutsideRect` is a pure predicate in
`ki-dialog.backdrop.ts` with exhaustive unit cases (edges inclusive:
a point ON the rect boundary is inside — clicking the dialog's own edge
never dismisses).

Without the opt-in, no backdrop listener logic closes anything: S3 holds by
construction (the handlers check the prop first).

**Alternatives considered**: (a) `click`-only detection — the
selection-drag misfire documented above; rejected. (b) a dedicated scrim
`<div>` inside the shadow as the click target — duplicates `::backdrop`,
cannot sit in the top layer behind the dialog, reintroduces z-index
management; rejected (Art. IV/VII). (c) `closedby="any"` — the platform
light-dismiss; engine baseline not met at planning time (D1); recorded as
the post-v1 simplification. (d) listening on `pointerdown` alone — dismisses
on press rather than completed click, diverging from S3/S4's "clicks the
backdrop" language and from every shipped dialog's behavior; rejected.

## D5 — Accessible name: `heading` attribute → `<h2 part="heading">` + same-root `aria-labelledby`

**Decision**: when `heading` is a non-empty string, the shadow renders
`<h2 part="heading" id="heading">{heading}</h2>` as the dialog's first
child and the internal dialog carries `aria-labelledby="heading"`. Both
ends of the ID reference live in the SAME shadow root, so the reference is
valid (no cross-root ARIA limitation applies). Absent or empty `heading`:
no `<h2>` is rendered at all AND no `aria-labelledby` is set (no dangling
reference) — the dialog exposes its role and modal state with no accessible
name, which the spec documents as invalid usage in the catalog (FR-008,
Edge Cases), never a crash. No `role` or `aria-modal` is ever hand-written:
the native modal dialog exposes both (S9's "modal dialog" comes from the
platform).

**Rationale**: the APG Dialog (Modal) pattern names the dialog from its
visible title via `aria-labelledby`, and both render from the same prop so
name and visible text cannot drift. `<h2>` deliberately diverges from 011
D6's `<strong>`: the alert sits inline in the host page's outline (where an
uncontrollable heading level would be wrong), while the dialog is a
top-layer context whose content hierarchy starts fresh — APG modal dialog
examples title with `h2`, and screen-reader users navigate dialog content
by headings. The divergence is deliberate and recorded here. A
`heading-level` attribute stays a possible future additive change (011
precedent).

**Alternatives considered**: (a) `aria-label={heading}` on the dialog —
loses in-dialog heading navigation and the APG-preferred visible-text
binding; rejected. (b) `<strong>` per 011 — gives up heading navigation
inside a context where a fresh hierarchy is correct; rejected with the
justification above. (c) auto-generating a name when `heading` is missing —
the spec explicitly chose "documented invalid usage" over auto-naming;
rejected (Art. II).

## D6 — Anatomy: heading + scrollable body + collapsing footer, logical properties only

**Decision**:

- **Body** (`part="body"`, default slot): always rendered;
  `overflow-block: auto` behavior (logical overflow on the block axis) so
  content taller than the viewport scrolls INSIDE the dialog (FR-015). The
  internal dialog keeps a viewport-bounded max block size (the UA stylesheet
  already caps `<dialog>` within the viewport; component CSS restates the
  bound with logical units so the body region — not the dialog — is the
  scroll container). Padding lives on the dialog surface per the spec's
  single `--ki-dialog-padding` token; the scrollbar therefore sits inset
  from the surface edge, which is acceptable and keeps the approved
  token family unchanged.
- **Footer** (`part="footer"`, `footer` slot): a row aligned to
  `inline-end` (M3 end-aligned actions), mirroring in RTL by construction —
  logical properties only, no physical left/right anywhere (FR-014, S13).
  The wrapper collapses (`display: none`) when the slot has no assigned
  nodes, tracked via `slotchange` exactly as 009 D1 established (cited, not
  re-derived): CSS cannot observe assigned nodes, and an empty footer must
  not contribute the column `gap` as phantom spacing below the body. The
  collapse is rendering correctness, not new API surface.
- **No built-in close ("X") control, no default strings** (spec
  Assumptions): the component ships zero user-visible text; footer actions
  are application content wired to `close()` (FR-009 — slotted actions never
  close the dialog by themselves), and destructive-confirmation guidance
  (autofocus on the least destructive action) is catalog metadata, not code.
- Column layout: heading, body, footer separated by `--ki-dialog-gap`;
  width bounded by `--ki-dialog-min-width`/`--ki-dialog-max-width` with
  `max-inline-size` also capped to the viewport.

**Alternatives considered**: (a) per-region padding tokens (009's shape) —
the approved token family has a single `padding` (spec Constitutional
Surface); adding per-region tokens would exceed the approved surface;
rejected (Art. II). (b) always-rendered footer without collapse — phantom
gap under body-only dialogs; rejected. (c) making the whole dialog the
scroll container — the heading and footer would scroll away, contradicting
the M3 anatomy (pinned headline/actions) and FR-015's "the body region
scrolls"; rejected.

## D7 — `::backdrop` theming: styled from `--ki-dialog-backdrop-bg` in shadow CSS; the backdrop is NOT a part

**Decision**: component CSS declares
`dialog::backdrop { background: var(--ki-dialog-backdrop-bg); }` (plus the
D8 entrance fade). The token resolves through the normal inheritance chain:
theme stylesheet at `:root` → host → shadow tree → internal dialog →
`::backdrop`.

**Honest compatibility note (the known trap)**: historically `::backdrop`
did NOT inherit from its originating element — it inherited nothing, so
custom properties were unreachable and this exact pattern silently produced
a transparent scrim. The CSSWG re-specified `::backdrop` to inherit from
its originating element and all three engines shipped the change during
2024 (Chromium 122, Firefox 121, Safari 17.4). Kimen's declared baseline —
current + previous evergreen versions, mid-2026 — is far past all three, so
the pattern is safe **by target policy, not by hope**: S11's theming test
resolves the backdrop's computed background under material3 and the
engine-matrix run (`KIMEN_BROWSER_MATRIX=1`) executes it in Chromium,
Firefox and WebKit. If an engine ever regressed, that gate — not a code
review — catches it. No speculative fallback ships (a fallback scrim
element is D4-rejected machinery).

**Backdrop is not a part** (spec API delta: parts are exactly `dialog`,
`heading`, `body`, `footer`): `::part()` cannot address pseudo-elements of
shadow content at all, so the customization surface for the scrim is
exactly the token — `--ki-dialog-backdrop-bg` referencing the 001 semantic
`ki.overlay.*` family (first component consumption of the overlay ramp;
dark values via the overlay inverse entries). This is the "first themed
backdrop/overlay surface" User Story 3 announces.

## D8 — Motion: entrance-only fade via `@starting-style`; the repo's first motion tokens; reduced motion suppresses by construction

**Decision**: component CSS declares, wrapped ENTIRELY in
`@media (prefers-reduced-motion: no-preference)`:

```css
dialog[open], dialog[open]::backdrop {
  transition: opacity var(--ki-dialog-motion-duration) var(--ki-dialog-motion-easing);
}
@starting-style {
  dialog[open], dialog[open]::backdrop { opacity: 0; }
}
```

- **Entrance only**: `@starting-style` supplies first-render starting
  values, which is all an entry transition needs. An EXIT transition would
  additionally require `transition-behavior: allow-discrete` orchestration
  over `display`/`overlay` plus close-delay handling — machinery no approved
  scenario demands; exit motion is a recorded additive candidate (spec
  motion row: "entrance/exit" is the M3 reference, the approved S14 asserts
  opening). `@starting-style` itself is inside the evergreen baseline
  (shipped in all three engines during 2024).
- **Reduced motion** (FR-011, S14): under `prefers-reduced-motion: reduce`
  the media query removes the transition DECLARATION entirely — computed
  `transition-duration` is `0s`, the dialog and backdrop appear at full
  opacity immediately. Suppression by construction, deterministic to
  assert.
- **Token values — declared deviation**: NO motion primitives or semantic
  motion tokens exist anywhere in 001 (verified against
  `packages/tokens/tokens/` on 2026-07-08: no duration/easing token in any
  layer). `--ki-dialog-motion-{duration|easing}` therefore carry LITERAL
  values at the component layer: onmars `0ms` / `linear` (MarsUI shows no
  dialog motion artifacts — spec design analysis; the dialog appears
  instantly under the default theme) and material3 ~`200ms` / an M3
  decelerate cubic-bezier (M3 declares entrance transitions). This deviates
  from "every component value references the semantic layer" because there
  is no semantic motion layer to reference, and inventing `ki.motion.*` for
  a single consumer is the wrong abstraction (Art. VII; 011's
  duplication-before-abstraction reasoning). The extraction point is
  recorded: when a second motion-bearing component lands (ki-tooltip and
  ki-tabs are candidates in this same batch), the semantic motion family is
  created and both reference it. No semantic-layer delta ships now —
  consistent with the spec's token surface.
- **Test determinism** (Art. III): a new `emulateReducedMotion` browser
  command joins the existing `emulateColorScheme` in
  `packages/elements/vitest.browser.config.ts`
  (`page.emulateMedia({ reducedMotion })` — same `defineBrowserCommand`
  mechanism). S14 runs under a motion-defining theme (material3, matching
  the scenario's Given verbatim), emulates reduce, opens, and asserts
  computed `transition-duration === '0s'` and immediate full opacity —
  computed style only, never animation-frame races. Conversely, any
  material3 assertion that could race the 200ms fade (axe, geometry) either
  awaits the settled state or runs under reduced-motion emulation —
  declared in the test tasks so no assertion is timing-dependent.

**Alternatives considered**: (a) no motion at all in v1 (011's position) —
the spec's Constitutional Surface MANDATES the motion tokens and FR-011/S14
assert their suppression, so the tokens must exist and be consumed;
rejected. (b) a Web Animations API open animation — JavaScript motion is
harder to suppress declaratively and heavier than one CSS transition;
rejected (Art. IV). (c) adding `ki.motion.*` semantic tokens now — semantic
delta requiring founder sign-off for a single consumer; rejected (recorded
extraction point instead).

## D9 — Token family: 18 flat `--ki-dialog-*` tokens per theme; contrast sweep extended with the dialog pairs

**Decision**: new DTCG sources under `packages/tokens/tokens/component/`:

- `dialog.tokens.json` — theme-neutral schema (onmars values by
  inheritance), 18 tokens (the spec's exact family; flat naming per the
  spec's justified deviation from the charter shape):
  - structure (5): `radius`, `padding`, `gap`, `min-width`, `max-width` —
    geometry referencing `ki.radius.*` / `ki.space.*` primitives; width
    bounds are the per-theme expression of M3's min/max constraints (spec
    sizing row).
  - color (4): `bg` (surface — the raised/elevated step of the 001 surface
    ramp; exact step is the token-authoring decision under the sweep), `fg`
    (from `ki.text.*`), `border` — a FULL border shorthand VALUE
    (`<width> <style> <color>` with the color referencing `ki.outline.*`;
    the composite-value precedent is 002/009's elevation shadow strings).
    Shorthand because the approved family has no `border-width` slot and a
    hardcoded width in component CSS would break FR-010; a theme disables
    the border by assigning `none` — exactly what material3 does (M3
    dialogs carry elevation, not strokes). `shadow` — composed box-shadow
    referencing `ki.elevation.*` colors.
  - backdrop (1): `backdrop-bg` referencing the 001 semantic `ki.overlay.*`
    family (first component consumer; dark scheme via the overlay-inverse
    entries) — the first themed overlay surface (D7).
  - heading typography (3): `heading-{font-size|font-weight|line-height}`
    from the semantic typography scale.
  - focus ring (3): `focus-ring-{color|width|offset}` — charter's exact
    shape, 002 convention; drawn on the dialog surface under
    `dialog:focus-visible` (D2's no-focusable-content case).
  - motion (2): `motion-{duration|easing}` — literal component-layer values
    per D8's declared deviation.
- `dialog.material3.tokens.json` — material3 overrides for the same names:
  M3 surface-container-high color role, M3 shape radius (28dp-class),
  `border: none`, M3 elevation level-3 shadow, scrim value per M3 (≈32%
  black), M3 entrance motion values.

Wiring: append both files to `LAYERS` / `MATERIAL3_LAYERS` in
`packages/tokens/style-dictionary.config.mjs`. Component CSS consumes them
exclusively through the private `--_ki-dialog-*` indirection on `:host`
(002 pattern).

**Contrast sweep extension** (Art. X — the script's own comment mandates
per-component extension; verified: `COMPONENT_BG_PATTERN` in
`packages/tokens/scripts/check-contrast.mjs` matches only `--ki-button-*`
today, so without this change every dialog pair ships unmeasured):

- **text pair**: `--ki-dialog-fg` over `--ki-dialog-bg` at 4.5:1
  (WCAG 1.4.3) — covers the heading and the slotted body text, which
  inherit fg over bg;
- **non-text pair**: `--ki-dialog-focus-ring-color` over `--ki-dialog-bg`
  at 3:1 (WCAG 1.4.11) — the ring is the only focus indicator the component
  itself draws (011 D8's non-text precedent);
- **mechanism**: the per-pair `min` field and per-pattern zero-match guard
  are the same extension design as 008 D8 / 011 D8 — the Fase 2 batch
  shares it; whichever sibling merges first lands the mechanism, the others
  rebase and add only their patterns. Unit cases join
  `packages/tokens/scripts/check-contrast.test.mjs`.
- **NOT swept, justified**: the backdrop — no text or control is ever drawn
  on the scrim (it sits behind the dialog; content over it is the page's,
  which is inert and dimmed by design); border-on-bg — the border is never
  the sole indicator of anything (the button/card sweeps set the same
  scope).

**Alternatives considered**: component CSS referencing semantic tokens
directly — themes could not restyle the dialog without touching component
CSS (002 D4's rejected failure mode); per-region padding or a
`border-width` token — exceed the approved family (Art. II); rejected.

## D10 — Tests, the mock-doc boundary, and the mandatory APG walkthrough

**Decision**: three test surfaces, each marked `// @spec:012-ki-dialog`,
S-IDs on code lines (test titles), mirroring the 002/011 layout — with one
boundary DECLARED UP FRONT: **Stencil's mock-doc implements no
`HTMLDialogElement` — `showModal()`/`close()`, the top layer, `::backdrop`
and background inertness do not exist there.** Consequence: the mock-doc
spec covers only closed-state anatomy, wiring and pure logic; EVERY
open-state behavior (modality, focus entry/containment/return, Escape,
backdrop, AT exposure, theming of the open dialog, motion) is asserted
exclusively in the real-browser suite — which Art. III requires for
components anyway, so nothing is lost, but no one should expect mock-doc
RED coverage of S1/S6–S10.

- `ki-dialog.spec.tsx` (mock-doc, fast): S5 unrecognized attribute → renders
  closed with default appearance (no `open`, nothing visible); closed-state
  anatomy (parts `dialog`/`heading`/`body`/`footer`; internal dialog never
  carries the native `open` attribute at rest; heading `<h2>` +
  `aria-labelledby` present exactly when `heading` is non-empty, no dangling
  reference when absent); exhaustive unit cases for the pure helpers —
  `resolveEntryFocusTarget` (autofocus → first-focusable → null branches,
  non-focusable filtering) and `isOutsideRect` (inside/outside/boundary
  points) — the mutation-gap compensating control.
- `ki-dialog.browser.spec.ts` (real browser, built
  `../dist/components/ki-dialog.js` + injected `@kimen/tokens/css`, 002/008
  pattern): S1 open-from-button → dialog visible above the page, background
  inert (pointer hit and `focus()` attempts on background elements fail);
  S2 footer Cancel wired to `close()` → closes, one `ki-close` with
  `reason: 'method'`; S3 backdrop click without opt-in → stays open; S4
  backdrop click with `close-on-backdrop` → closes, `reason: 'backdrop'`;
  S15 programmatic close → exactly one `ki-close`, plus the no-op guards
  (`show()` while open, `close()` while closed, removing `open`) and the
  press-inside-release-outside non-dismissal; FR-015 body taller than the
  viewport scrolls inside `part="body"`; S6 keyboard open → focus inside
  with visible indication, autofocus priority, dialog-surface fallback +
  focus ring; S7 Tab from the last focusable stays inside; S8 Escape →
  closes, `reason: 'escape'`, focus back on the invoker; S9 role dialog +
  modal state + accessible name from heading; S10 background link not
  exposed while open; focus-return edges (opener removed → body, unscolled;
  initial-markup `open` → body on close); S11 material3 restyle including
  the resolved backdrop background; S13 RTL footer order/alignment; S14
  reduced motion (material3 + `emulateReducedMotion`); axe zero violations
  in open and closed states, both themes.
- `ki-dialog.dark.browser.spec.ts`: S12 forced dark under onmars + axe in
  dark (the 002/008/011 dark-instance split; the vitest config routes
  `*.dark.browser.spec.ts` to the dark-emulating instance).

**Manual APG walkthrough — MANDATORY** (Art. V; spec Constitutional
Surface): the dialog is the FIRST dialog-type interaction pattern in the
repo and the batch charter flags dialog explicitly. The walkthrough follows
the APG Dialog (Modal) pattern checklist and is documented in the PR:
focus entry per the FR-005 priority (including the autofocus and
no-focusable-content cases), containment under Tab AND Shift+Tab in both
directions, Escape from every focus position, focus return on every close
path (footer action, Escape, backdrop opt-in, programmatic), backdrop
behavior with and without the opt-in, role/name/modal announcement by a
real screen reader on open, and background unreachability via the SR
virtual cursor. Carried as an explicit Polish task so the PR cannot close
without it (011 D10's structure, applied to the walkthrough this time).

**Rationale**: the traceability gate requires S-IDs on code lines of marked
files; the browser suite asserts what ships; RED first per Art. III. All 15
approved scenarios (S1–S15) map to test tasks (tasks.md Notes carries the
full map).
