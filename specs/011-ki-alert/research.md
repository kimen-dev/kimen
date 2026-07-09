# Phase 0 Research: ki-alert

Decisions that resolve every open technical question in the plan. Sources:
the spec (design-source analysis: no MarsUI alert frame, no M3 alert — the
transient Toast/snackbar maps to the future ki-toast; verified 2026-07-08),
the WAI-ARIA APG Alert pattern and the ARIA `alert`/`status` role
definitions, the 001 token architecture, the 002 ki-button implementation
(native shadow button, `--_ki-*` CSS indirection, focus-ring tokens,
`:host([tone=…])` override pattern) and the 008/009 sibling plans
(contrast-sweep extension design, test layout — decisions cited rather than
re-derived, Art. VII).

## D1 — Live-region exposure: tone-mapped `role` on an inner shadow wrapper

**Decision**: the shadow root renders (non-dismissed state)

```html
<div part="alert">
  <div class="live" role="status|alert">      <!-- tone-mapped, D5 -->
    <strong part="heading">…</strong>          <!-- only when heading non-empty, D6 -->
    <div part="message"><slot /></div>
  </div>
  <button part="dismiss" type="button" aria-label={dismissLabel}>…</button>
  <!-- only when dismissible, D3 — OUTSIDE the live wrapper -->
</div>
```

The `role` lives on an **inner wrapper that contains exactly the heading
and the message slot** — never on the host, never on `part="alert"` — so
the dismiss control sits outside the live-region boundary and its
accessible name is never announced as part of the message (FR-005, the
point where the spec says the APG Alert pattern is most commonly
implemented wrong). The mapping is `danger`/`warning` → `role="alert"`
(implicit `aria-live="assertive"`, `aria-atomic="true"`); `neutral`,
`success`, `info` and any unrecognized tone → `role="status"` (implicit
`aria-live="polite"`, `aria-atomic="true"`). **No explicit `aria-live`,
`aria-atomic` or `aria-relevant` attributes are set anywhere**: the
implicit semantics of the role are the whole wiring.

**Rationale**:

- **Announcement mechanics**: platforms announce a live region when
  populated content ENTERS the accessibility tree after the page has been
  processed — inserting `<ki-alert>` dynamically inserts a populated
  `role="alert|status"` subtree and is announced; an alert present in the
  initial HTML is exposed with its role but gets no guaranteed
  announcement. That is exactly the observable behavior the spec approved
  (S9/S10/S17/S18 assert exposure; the Edge Cases and Assumptions document
  the initial-load caveat for the catalog). No focus is ever moved — the
  component contains zero focus-management code on appearance (S9–S10
  "focus stays where it was" holds by construction).
- **Double-announcement avoidance**: the classic failure is redundant
  wiring — `role="alert"` PLUS an explicit `aria-live` on the same or an
  ancestor node makes several screen reader/browser pairs announce twice.
  Implicit-only semantics, one live node, and the dismiss control outside
  the boundary make a double or polluted announcement impossible by
  construction. Stencil's vdom patches only changed nodes, so re-renders
  that do not touch the heading/message text (e.g. a `tone` change
  swapping the `role` value) do not create text-node churn inside the
  region.
- **Shadow DOM correctness**: live-region processing operates on the
  flattened accessibility tree, so the slotted light-DOM message
  participates in the shadow wrapper's region; the wrapper is not a part
  (the customization surface stays exactly `alert`, `heading`, `message`,
  `dismiss`).
- **Test surface**: what is deterministically observable is the exposure —
  the computed role of the wrapper, its containment (heading+message in,
  dismiss out) and `document.activeElement` stability. The RED
  assistive-tech tests assert exactly that (S9, S10, S17, S18); the actual
  spoken announcements are verified by the manual screen-reader pass the
  spec's Constitutional Surface mandates (documented in the PR — D10).

**Alternatives considered**: (a) `role` on the host — the dismiss control
would sit inside the live region and its name would be announced with
every message; rejected (FR-005 verbatim). (b) explicit
`aria-live="assertive"` alongside `role="alert"` — the documented
double-announcement source; rejected. (c) a visually hidden mirror
region that re-injects the message text on appearance (toast-style
announcer) — duplicated content, phantom announcements on re-render, and
machinery the approved scenarios never asked for (Art. VII); rejected.
(d) `aria-atomic="true"` set explicitly "for safety" — already implicit
in both roles; redundancy invites engine quirks; rejected.

## D2 — Dismissed lifecycle: reflected `dismissed`, conditional render + `display: none`

**Decision**: `@Prop({ mutable: true, reflect: true }) dismissed = false`.
When `dismissed` is set (by the dismiss control or by the page), the
component renders **no shadow content** (the `part="alert"` subtree,
including the live wrapper and the slot, is conditionally omitted) and the
CSS adds the belt `:host([dismissed]) { display: none; }`. The host stays
in the document; removing the attribute re-renders the full subtree.

**Rationale**: FR-003 verbatim — a dismissed alert "stays in the document,
renders nothing and is exposed to no one — it leaves the accessibility
tree entirely". `display: none` alone satisfies exposure removal, but the
conditional render is what makes S19's re-show deterministic: removing
`dismissed` re-creates and inserts a **fresh, populated** live-region
subtree, which is the canonical dynamic-appearance trigger — the spec
requires a re-shown alert to "behave as a dynamically appearing alert"
(FR-003 → FR-005). Un-hiding a persistent `display: none` region is the
unreliable path across engines; fresh insertion is the reliable one.
Emptying/removing content is never announced (default
`aria-relevant: additions text`), so dismissal itself produces no phantom
announcement. An empty alert (no heading, no message) renders an empty
live wrapper with nothing to announce — the empty-live-region edge case
holds by construction.

**Alternatives considered**: (a) `display: none` only, subtree kept — re-
show becomes an engine-dependent un-hide instead of an insertion;
rejected. (b) removing the host from the DOM on dismiss — the spec fixes
attribute semantics precisely so the page can re-show by clearing state
(S19), and applications that prefer removal listen to `ki-dismiss` and
remove the element themselves (spec Assumptions); rejected.

## D3 — Dismiss control: native shadow `<button>`, SVG glyph, `ki-dismiss` contract

**Decision**: when `dismissible` is set, the shadow renders a single
native `<button type="button" part="dismiss">` after (outside) the live
wrapper, with `aria-label` bound to the `dismissLabel` prop
(attribute `dismiss-label`, default `"Dismiss"` — the only default string
in the component, overridable per FR-004, so no user-facing string is
hardcoded without an override path, Art. IV). Its visible content is an
inline SVG cross glyph with `aria-hidden="true"` and `fill="currentColor"`
(no text node, no font icon, no external asset), sized by
`--ki-alert-dismiss-icon-size` and colored by the dismiss state tokens
(D7). Activation (pointer, Enter, Space — all native button behavior, no
key handlers) runs one handler that: (1) resolves the focus handoff
target if focus is inside the alert (D4), (2) sets `dismissed = true`
(D2), (3) moves focus to the resolved target, and (4) dispatches exactly
one `ki-dismiss` — `new CustomEvent('ki-dismiss', { bubbles: true,
composed: true, cancelable: false, detail: null })`. When `dismissible`
is not set, the button is not rendered at all: no dismiss control, no tab
stop (S4, S8) — conditional rendering, not `hidden`/`tabindex`
suppression.

**Rationale**: FR-003/FR-004 verbatim. A native button gives focusability,
Enter/Space activation, and button role/name semantics with zero ARIA
beyond the `aria-label` (Art. IV; the 002 precedent — no new interaction
pattern is introduced, the control is a plain button). The SVG glyph is
not a string (nothing to localize, nothing hardcoded against Art. IV) and
inherits ink through `currentColor`, so the dismiss state tokens style it
without touching the markup. The event is not cancelable in v1 and the
component both hides itself AND notifies — the spec's Assumptions record
this as the gate-1 API-semantics decision; `detail: null` keeps any future
payload an additive MINOR change.

**Alternatives considered**: (a) a `<ki-button>` instance inside the
shadow — cross-component coupling, double shadow boundary for the
accessible name, heavier bundle; rejected (Art. VII; 008 D1's "platform
first" reasoning). (b) a text `×` character as the glyph — announced by
some AT as "multiplication sign" when labels are misconfigured, and it IS
a hardcoded user-visible string; rejected. (c) `cancelable: true` with
`preventDefault()` keeping the alert visible — an API surface the
approved scenarios never exercise; rejected for v1 (additive later).

## D4 — Focus handoff on dismissal: pure helper, document-order search

**Decision**: a pure helper `resolveDismissFocusTarget(host, doc)` in
`ki-alert.focus.ts`: collect the document's focusable elements (visible,
enabled, not `tabindex="-1"`, excluding the alert's own subtree), order
them in document order (`compareDocumentPosition`), and return the first
one AFTER the host; when none follows, the last one BEFORE the host; when
neither exists, `doc.body`. The dismiss handler calls it **only when
`document.activeElement` (composed) is inside the alert** — a dismissal
triggered while focus is elsewhere never steals focus. The helper is
side-effect-free (returns the target; the caller focuses it) and gets
exhaustive unit cases per branch — together with `liveExposureForTone`
(D5) it is the mutation-gap compensating control (plan.md Art. III).

**Rationale**: FR-013 verbatim (next → previous → body), S16 pins the
observable outcome (focus lands on the following "Save" button, never
stranded on hidden content). Ordering by document position keeps the rule
predictable and testable without modeling browser tab-order internals
(positive `tabindex` reordering is out of scope — the repo's own a11y
rules forbid positive tabindex anyway).

**Alternatives considered**: (a) do nothing and let the browser drop focus
to `<body>` — WCAG focus-visibility regression and exactly what FR-013
forbids; rejected. (b) always restoring focus to the previously focused
element — history tracking machinery for a behavior the spec did not
approve; rejected.

## D5 — Tone: fallback by construction, pure urgency mapping

**Decision**: `@Prop({ reflect: true }) tone: KiAlertTone = 'neutral'`
(002's exact prop pattern). CSS defines the **neutral matrix as the base**
on `:host`/`part="alert"` and overrides it under `:host([tone='success'])`,
`:host([tone='danger'])`, `:host([tone='info'])`, `:host([tone='warning'])`
— an unrecognized tone matches no override and renders neutral with zero
validation code (S5, FR-007; the 002 `:host([variant=…][tone=…])`
precedent). The live-region mapping is a pure helper in
`ki-alert.tone.ts`: `liveExposureForTone(tone)` returns `'alert'` for
`danger`/`warning` and `'status'` for everything else — including
unknown/absent values, so a malformed tone degrades to the polite
exposure, consistent with its neutral appearance. Exhaustively
unit-tested (mutation-gap compensating control). The urgency mapping
(warning = assertive) is the one the founder gates at spec approval; it
is encoded once, in this helper, so a gate-1 flip of S17 is a one-line
change.

**Rationale**: FR-001/FR-007 verbatim; agent-generated markup is not
trusted to be valid, and by-construction fallback (no observer, no
sanitizer) is the simplest design that satisfies the scenarios (Art. VII).

**Alternatives considered**: attribute rewriting/normalization on load —
mutating author markup, more code, no observable gain; rejected.

## D6 — Heading: `<strong part="heading">`, rendered only when non-empty

**Decision**: the `heading` attribute renders
`<strong part="heading">{heading}</strong>` as the first child of the
live wrapper, before the message — only when the value is a non-empty
string; absent OR empty string renders no heading element at all
(FR-002, Edge Cases). `<strong>` is emphasized text, not a document
heading: it contributes no heading level to the host page's outline (S2's
"not exposed as a document heading"), and heading typography comes from
`--ki-alert-heading-*` tokens. No `heading-level` attribute in v1 (spec
Assumptions: possible future additive change).

**Rationale**: FR-002 verbatim — from inside its shadow tree the component
cannot know the correct outline level, so it injects none; `<strong>` is
the semantic-HTML expression of "emphasized text" (Art. IV) and needs
zero ARIA. Being inside the live wrapper, the heading is announced with
the message (FR-005 scopes the region to "the heading and message only").

**Alternatives considered**: (a) `<div role="heading" aria-level=…>` — an
arbitrary level would be wrong on someone's page; rejected by the spec
itself. (b) rendering an empty `<strong>` when `heading=""` — a phantom
part and phantom AT noise; rejected (Edge Cases pin empty-string = no
heading).

## D7 — Component token layer: 5-tone color matrix, one geometry, dismiss inks

**Decision**: new DTCG sources under `packages/tokens/tokens/component/`:

- `alert.tokens.json` — theme-neutral schema (onmars values by
  inheritance):
  - structure, single scale — no size/variant axis (spec):
    `padding-inline`, `padding-block`, `gap` (live-content ↔ dismiss
    column and heading ↔ message), `radius`, `border-width`, `font-size`,
    `line-height`, `heading-font-size`, `heading-font-weight`,
    `dismiss-size` (≥ 24 px — the dismiss control's minimum pointer
    target, Art. V), `dismiss-icon-size` (11 tokens) → geometry references
    `ki.space.*` / `ki.radius.*`, typography references `ki.font.*`.
  - color per tone: `--ki-alert-{neutral|success|danger|info|warning}-{bg|fg|border}`
    (5 × 3 = 15 tokens). Onmars references: tone backgrounds from
    `ki.surface.{tone}-base-em` (the 50-level tints), tone inks from
    `ki.text.{tone}-high-em`, tone borders from
    `ki.outline.{tone}-{low|med}-em`; the neutral column from the neutral
    families (`ki.surface.s*`, `ki.text.high-em`, `ki.outline.*`). The
    exact ramp steps are the token-authoring decision, made under the
    extended contrast sweep (D8) — **this is the first component to
    consume the info and warning ramps shipped in 001** (spec
    Constitutional Surface).
  - dismiss-control state inks: `--ki-alert-dismiss-{rest|hover|active}-fg`
    (3 tokens) — one ink family across tones, consumed by the glyph via
    `currentColor` (D3); hover/active modulate emphasis, no background.
  - focus ring: `--ki-alert-focus-ring-{color|width|offset}` (3 tokens),
    002 convention, drawn on the dismiss button under `:focus-visible`.
- `alert.material3.tokens.json` — material3 overrides for the same names,
  styled from M3 container/on-container color roles even though M3 ships
  no alert (the spec's documented loose mapping): error-container ramp
  for danger, tertiary/secondary containers or the inherited ramps for
  the rest, M3 shape radius.

Total = 32 tokens per theme. Wiring: append both files to `LAYERS` /
`MATERIAL3_LAYERS` in `packages/tokens/style-dictionary.config.mjs`.
Component CSS consumes them exclusively through the private indirection
`--_ki-alert-*` set on `:host` (base = neutral) and swapped per
`:host([tone=…])` — the 002 pattern.

**Ramp-coverage finding (verified 2026-07-08 against the token sources)**:
the onmars semantic layer ships full `info`/`warning`/`success`/`danger`
ramps for surface/text/outline in BOTH schemes
(`tokens/semantic.tokens.json`, `tokens/modes/dark.tokens.json`). The
material3 semantic layer overrides ONLY `danger` in light
(`tokens/semantic/material3.tokens.json`) and `danger`+`success` in dark
(`tokens/modes/material3.dark.tokens.json`); **material3 `info` and
`warning` ramps inherit the base (onmars-derived) values through the
layer cascade**. That is legitimate under the 001 fallback contract, and
the extended sweep (D8) measures the BUILT material3 CSS as-is, so every
tone × scheme cell is verified regardless of where its value comes from.
If any inherited cell fails the sweep, the fix is a material3 override
at the component layer first; only if that is impossible does a
semantic-layer delta get declared for founder sign-off at the merge gate
(002 precedent, echoed in the spec's token surface).

**Alternatives considered**: (a) component CSS referencing semantic tokens
directly — themes could not restyle the alert without touching component
CSS (002 D4's rejected failure mode); rejected. (b) per-tone dismiss
inks (`--ki-alert-{tone}-dismiss-fg`) — 15 extra tokens the spec's
declared surface does not include; the sweep verifies the single ink
family against all five tone backgrounds first, and per-tone inks arrive
only if a theme cannot satisfy that (additive, declared at the merge
gate); rejected for v1 (Art. VII). (c) tone icons + their tokens — the
spec's Assumptions explicitly exclude tone icons and `start`/`end` slots
in v1 (additive MINOR post-v1, recorded from the MarsUI Toast anatomy);
rejected.

## D8 — Contrast gate: extend the component sweep to `--ki-alert-*`

**Decision**: extend `packages/tokens/scripts/check-contrast.mjs` — whose
own comment mandates per-component extension — with two alert patterns:

- **text pairs**: `^--ki-alert-(?:neutral|success|danger|info|warning)-bg$`,
  pairing each `…-fg` over its `…-bg` at the existing text minimum
  (4.5:1, WCAG 1.4.3) — 5 pairs × theme × scheme (the "×5 tones" sweep
  the spec's SC-001/SC-005 presuppose);
- **non-text pairs**: `--ki-alert-dismiss-{rest|hover|active}-fg` over
  EACH of the five tone `…-bg` values at the WCAG 1.4.11 non-text minimum
  (3:1) — the dismiss glyph is a graphical control indicator, not text;
- mechanism: the per-pair `min` field and the per-pattern zero-match
  guard are the same extension design 008 D8 specifies for the switch —
  whichever feature merges first lands the mechanism, the second rebases
  onto it and only adds its pattern (both are in the same gate-1 batch;
  the scripts change is additive either way);
- unit cases added to `packages/tokens/scripts/check-contrast.test.mjs`
  (pattern matching, cross-pairing of dismiss inks over tone backgrounds,
  per-pair minimum, zero-match guard).

**Rationale**: Art. X — a finding a rule could produce must become a rule.
The sweep currently matches only `--ki-button-*` (verified: the
`COMPONENT_BG_PATTERN` regex in `check-contrast.mjs`), so without this
extension every alert tone pair would ship unmeasured. The
warning-in-light-scheme cell is the classic industry contrast failure
(yellow ramps), and material3's inherited info/warning cells (D7) are
exactly the kind of unreviewed value only a gate catches. Border-on-bg
pairs are not swept: the border is never the sole tone indicator (bg+fg
carry it), matching the button sweep's scope.

**Alternatives considered**: (a) not extending — the gate silently ignores
ki-alert (forbidden by the script's contract); rejected. (b) sweeping the
dismiss ink at 4.5:1 — stricter than WCAG 1.4.11 for a non-text glyph
with no constitutional basis (008 D8's identical reasoning); rejected.

## D9 — Tests and traceability

**Decision**: three test surfaces, each marked `// @spec:011-ki-alert`,
S-IDs on code lines (test titles), mirroring the 002/008 layout:

- `ki-alert.spec.tsx` (mock-doc, fast): S2 heading rendering (before the
  message, `<strong>`, no document-heading semantics, empty string → no
  heading), S5 unknown tone renders the neutral matrix and polite
  exposure, anatomy assertions (parts `alert`/`heading`/`message`/
  `dismiss`; the live wrapper carries the tone-mapped role and contains
  exactly heading+message; NO part on the live wrapper; no dismiss button
  by default), dismissed → empty shadow render; exhaustive unit cases for
  the pure helpers `liveExposureForTone` (five tones + unknown + absent)
  and `resolveDismissFocusTarget` (next/previous/body branches, focus
  outside the alert) — the mutation-gap compensating control.
- `ki-alert.browser.spec.ts` (real browser, built output +
  `@kimen/tokens/css`, 002/008 pattern): S1 danger message visible with
  the danger tone appearance (resolved `--ki-alert-danger-*` inks) and
  the five-tone matrix rendered; S9/S17 dynamically appended danger and
  warning alerts exposed with `role="alert"` and `document.activeElement`
  unchanged; S10/S18 success, info and neutral exposed with
  `role="status"`, focus unchanged; S3 pointer dismissal hides the alert
  and the page observes exactly one `ki-dismiss` (bubbles, composed,
  `detail: null`, not cancelable); S4/S8 non-dismissible renders no
  dismiss control and adds no tab stop; S19 clearing `dismissed` re-shows
  message and re-inserts the live subtree; S6 Tab reaches the dismiss
  control with a visible focus ring; S7 keyboard activation dismisses
  with exactly one event; S16 focus lands on the following button, never
  inside the dismissed alert; S11/S12 dismiss button accessible name
  (default "Dismiss", overridden "Descartar"); S13 material3 restyle
  across all five tones; S15 RTL — message leads, dismiss trails
  (bounding-box comparison); axe zero violations across
  tone × dismissible × theme.
- `ki-alert.dark.browser.spec.ts`: S14 forced dark under onmars + axe in
  dark (the 002/008 dark-instance split).

**Rationale**: the traceability gate requires S-IDs on code lines of
marked files; the browser suite asserts what ships. RED first per
Art. III. All 19 approved scenarios (S1–S19) map to test tasks (tasks.md
Notes carries the full map). No `emulateReducedMotion` command is needed:
v1 declares no motion at all (FR-011 is satisfied by construction — there
is no transition/animation declaration in `ki-alert.css` to gate).

## D10 — Accessibility specifics

**Decision**: the dismiss button is the only interactive part; the host
and the live wrapper are never focusable (no `tabindex`, no
`delegatesFocus` — nothing to delegate to when non-dismissible, and
delegation would put a non-interactive host in the reading order's way);
focus indication on the dismiss button via `:focus-visible` +
`--ki-alert-focus-ring-*` tokens (002 pattern, S6); its pointer target
keeps ≥ 24×24 px via `--ki-alert-dismiss-size` (Art. V); **no manual APG
walkthrough** — the dismiss control reuses the 002 button pattern and the
batch charter scopes walkthroughs to dialog/tooltip/tabs/select; INSTEAD,
the spec's Constitutional Surface mandates a **documented manual
screen-reader verification** of the live announcements (the part no
automated audit can observe): each tone's dynamic appearance announces
with the right urgency class, the announcement contains only the heading
and message (never the dismiss control's name), initial-load alerts are
exposed without a required announcement, and a re-shown alert
re-announces. Recorded in the PR alongside the axe matrix
(tone × dismissible × theme × scheme, zero violations).

**Rationale**: Art. V floor-vs-proof — axe and the role assertions are the
floor; for a live-region component the proof is the announcement behavior
itself, which only a human with a screen reader can hear. The spec wrote
this obligation into its Accessibility surface verbatim; the plan carries
it as a Polish-phase task so the PR cannot close without it.
