# Phase 0 Research: ki-select

Decisions that resolve every open technical question in the plan. Sources:
the spec (M3 exposed dropdown menu — a menu anchored to a text field;
MarsUI verified 2026-07-08 — no select frame exists, onmars styles from the
001 token vocabulary alone), the WAI-ARIA APG Combobox pattern in its
**select-only** variant (read with the pattern and its select-only example
in hand for D1/D2/D5/D10), the HTML constraint-validation and
form-associated custom elements (FACE) specs, the 001 token architecture,
the 002 ki-button implementation (ElementInternals pattern, `--_ki-*` CSS
indirection), the 003 ki-input plan set (the value-carrying form-control
sibling) and the 007 ki-radio-group plan set (the composite sibling) —
sibling decisions under the same charter are CITED and reused rather than
re-derived (Art. VII).

Shared decisions inherited from the siblings (cited, not re-derived):

- **Component-rendered visible label as the accessible-name source, wired
  with native `<label for>` inside the shadow tree** — 003 D1 (adapted to
  a trigger button in D2 below; a `<button>` is labelable, so name AND
  click-to-focus come free).
- **`value` attribute = initial declaration; property = live projection of
  the selection; programmatic assignment selects the FIRST match,
  silently; not reflected** — 003 D2 + 007 D4 (D6 below).
- **Composed `change` dispatched from the form-associated host, wired only
  to the user-driven path so programmatic mutation is silent BY
  CONSTRUCTION, no suppression flags** — 003 D5 / 006 D6 / 008 D4 / 007 D5
  (extended in D6: here BOTH events are synthesized, see the owned
  deviation).
- **Boolean presence normalization** against Stencil's `"false"` coercion
  via a tiny pure helper — 006 D2 / 008 D2 (applied to `disabled` and
  `required` on ki-select and `disabled` on ki-option).
- **Option discovery via default-slot `slotchange` roster + scoped
  MutationObserver, no general subtree observer** — 007 D3 (extended in D3
  below: the mirror architecture turns label re-rendering into a
  correctness obligation).
- **Reset re-derives from the live `value` attribute in
  `formResetCallback`** — 003 D2's native-default semantics (D7 below;
  deliberate divergence from 007's association-time snapshot, justified
  there).
- **`--_ki-*` private CSS indirection over component tokens** — 002
  pattern (D8).
- **Per-component contrast-sweep extension in the same change that ships
  the tokens** — 002 incident-to-gate rule; per-pattern zero-match guard
  and per-pair minimums per 008 D8's mechanism (D8 below; batch
  coordination note in tasks.md).

## D1 — Composite architecture: `ki-option` children are declarative DATA; the select renders MIRROR options inside its own shadow, co-scoped with the listbox

**The constraint that frames the choice**: the APG select-only combobox is
an IDREF-wired pattern — the focused element (`role="combobox"`) must
carry `aria-controls` referencing the listbox and, while open,
`aria-activedescendant` referencing the currently highlighted
`role="option"` element. ID references resolve ONLY within a single tree
scope: they cannot cross a shadow boundary in either direction. The
trigger must live in ki-select's shadow root (parts, token encapsulation,
FR-013). Therefore every element the trigger references by ID — the
listbox AND every option — must be co-shadow with it. That single platform
constraint fixes the architecture: the light-DOM `ki-option` children
CANNOT be the `role="option"` elements.

**Decision**: `ki-option` is a declarative data carrier — `value`,
`disabled`, and its text content as the label — and never renders
(`:host { display: none }`; the select's shadow keeps the default slot
inside a hidden container purely for discovery). `ki-select` projects the
roster into MIRROR option rows inside its shadow listbox:

```html
<div part="listbox" role="listbox" id="listbox" aria-labelledby="label">
  <div role="option" part="option" id="option-0"
       aria-selected={selected} aria-disabled={disabled}>
    {label text mirrored from the ki-option}
  </div>
  …
</div>
<div hidden><slot /></div>   <!-- ki-option data children, never painted -->
```

Because rows, listbox and trigger share one shadow scope,
`aria-activedescendant` and `aria-controls` are plain same-tree IDREFs —
no cross-shadow ARIA is attempted anywhere. That is the entire point of
the mirror. This is the same composite discipline as 007 (the parent owns
everything the platform cannot provide across shadow boundaries; children
are discovered by `slotchange` and coordinated by the parent), taken one
step further because this pattern is IDREF-bound where the radio group was
not: 007 could leave its children rendering in the light DOM (no IDREF
links them to the group's shadow); ki-select cannot. The model is exactly
the native `<option>` relationship: the child markup is data; the select
owns the rendering.

**Alternatives considered**:

(a) **Slotted ki-options with managed roles** (the literal 007 layout:
`role="option"` + self-assigned ids on the ki-option hosts, slotted into a
shadow `role="listbox"` wrapper) — the flattened accessibility tree DOES
place the slotted options inside the listbox (007 D2's precedent), but
`aria-activedescendant` on the shadow trigger cannot reference light-DOM
ids: the highlight becomes invisible to assistive technology, gutting the
pattern's keyboard contract (S7, S22, S12). Rejected on the IDREF
constraint alone.

(b) **Cross-root ARIA element reflection**
(`trigger.ariaActiveDescendantElement = optionHost` — element reflection
may legally point outward into an ancestor tree) — not baseline across the
evergreen target (current + previous Chromium/Firefox/Safari; Firefox
lacks ARIA element reflection), and `aria-controls` would still dangle.
Rejected; RECORDED as the future simplification path: when element
reflection is baseline, the mirror could collapse to slotted options
without any public API change.

(c) **`role="combobox"` on the ki-select host itself**
(`internals.role`), so host and option children share the light tree scope
— structurally wrong per the APG: the listbox (shadow content) would live
INSIDE the combobox element, and a select-only combobox's AT **value** is
computed from its contents, so the option labels would pollute the
reported value; it also demands sprouting `aria-activedescendant` onto the
host element the component does not own. Rejected.

(d) **No shadow root** (light-DOM rendering) — abandons parts, token
encapsulation, delegated styling and the factory pattern (Art. VI/X).
Rejected.

**Consequences the decision must own honestly**:

1. **FR-013's `option` part is hosted on the mirror rows inside
   KI-SELECT's shadow** — addressable as `ki-select::part(option)` — not
   on `ki-option`, which renders nothing. The `--ki-option-*` token family
   keeps its spec-fixed name and semantics (the option surface owns it;
   the CSS consuming it lives in ki-select.css). This is a deviation from
   FR-013's letter ("`option` on `ki-option`") forced by the IDREF
   constraint; it is flagged for the founder at gate 1 (plan.md Complexity
   Tracking) — the alternatives that keep the part on ki-option all break
   `aria-activedescendant` (above).
2. **Label fidelity is a correctness obligation**: the mirror must
   re-render when an option's text or attributes mutate, or the rendered
   popup silently lies about the light DOM (which agents mutate — US5,
   spec edge cases). D3's observers are scoped to exactly this.
3. **v1 option labels are TEXT** (`textContent`, trimmed). Rich slotted
   option content (icons, markup) would need per-option slot projection
   into the mirror rows — additive later; no approved scenario renders
   anything but text (Art. VII).

## D2 — Trigger anatomy and ARIA wiring: native `<button role="combobox">`, all IDREFs same-scope

**Decision**: the shadow root renders

```html
<label part="label" id="label" htmlFor="trigger">{label}</label>
<button part="trigger" id="trigger" type="button" role="combobox"
        aria-expanded={open} aria-controls="listbox"
        aria-activedescendant={open ? activeOptionId : null}
        aria-required={required} disabled={effectiveDisabled}>
  <span part="value">{selectedLabel ?? placeholder}</span>
  <span part="indicator" aria-hidden="true"></span>
</button>
<div part="listbox" role="listbox" id="listbox" aria-labelledby="label"
     hidden={!open}>{mirror rows (D1)}</div>
<div hidden><slot /></div>
```

The APG select-only example uses a `<div tabindex="0">`; Kimen uses a
native `<button>` with the (ARIA-in-HTML-permitted) `combobox` role
instead: focusability, `disabled` semantics (unfocusable, unclickable —
S3/S16 free), `:focus-visible` heuristics, and Enter/Space activation
synthesizing `click` all come from the platform — 002 D1's
don't-rewire-what-the-element-gives rationale. A `<button>` is labelable,
so the native `<label for>` association provides the accessible name
"Country" AND label-click-focuses-trigger (003 D1 verbatim). The rendered
value span is deliberately NOT in the labelling chain: for a select-only
combobox, assistive technology reports the element's text content as its
VALUE ("France") separately from its name — the S11 contract — verified in
the manual walkthrough (D10). `aria-haspopup` is omitted: `listbox` is the
combobox role's default popup type. The listbox is labelled by the same
label element (APG example parity). The dropdown indicator is a
component-rendered, `aria-hidden` part drawn from tokens (spec
assumption — not a slot).

**Alternatives considered**: (a) `<div tabindex="0">` (APG literal) —
re-implements focus, disabled and activation by hand; rejected. (b)
`<input readonly role="combobox">` — implies editability, triggers mobile
text-entry affordances, wrong element for a select-only trigger; rejected.
(c) `aria-labelledby="label value"` (name includes the value, a pattern
some widget sets use) — conflates name and value, contradicts S11's
"named Country whose value is France"; rejected pending walkthrough
evidence (recorded as the D10 contingency if a target AT pair fails to
report the content as value).

## D3 — Option discovery and mirror reconciliation: slotchange roster + roster-scoped observers; every reconciliation silent

**Decision**: the roster derives from the default slot's `slotchange`
(`assignedElements()` filtered to `ki-option`, document order) — 007 D3's
mechanism verbatim. One MutationObserver observes each roster element with
`{ attributeFilter: ['value', 'disabled'], childList: true,
characterData: true, subtree: true }` — attributes because `value` and
`disabled` participate in selection resolution and highlight skipping
(FR-004, S22), and label subtree/text because of D1's consequence 2: the
mirror re-renders from the observed truth or it lies. 007 D3 rejected a
subtree observer as speculative generality; that rejection does not
transfer — 007's labels render live via slot projection, ki-select's
labels are COPIES, so observation is the minimal mechanism that keeps the
copy honest, not a speculative feature.

Reconciliation rules (spec edge cases + FR-004/FR-005 — all silent, no
`input`/`change`):

- roster or value mutation with an existing selection: the selection
  survives while its option is still assigned and still matches by
  identity; if the selected option left the roster, selection clears —
  trigger shows the placeholder, `value` reads `""`, form value → `null`,
  validity recomputed (S25, S5's dangling-value family);
- roster change with NO selection and a non-empty declared/assigned
  `value`: selection re-resolves first-match against the current roster
  (an inserted matching option becomes selected);
- duplicate option values: first match wins on any value→selection
  resolution; a user commit is tracked by option IDENTITY (007 D4's
  duplicate-values rule);
- while open: the mirror re-renders and the highlight re-derives exactly
  as on opening (selected option, else first enabled — no approved
  scenario pins mid-open mutation further; simplest consistent rule,
  Art. VII);
- disabling the select (attribute mutation or `formDisabledCallback`)
  while open closes the popup without committing (spec edge case).

**Alternatives considered**: (a) re-mirroring only on `slotchange` —
leaves renamed/re-valued options stale in the popup (the mirror lies);
rejected. (b) full host-subtree observer — wider than the roster for no
approved scenario; rejected (007 D3). (c) a `ki-option`-side render with
per-option named slots assigned by the select (`slot="option-N"` sprouted
on children) — keeps rich content but mutates consumer-owned attributes
and adds distribution machinery no scenario needs; rejected for v1
(recorded as the additive path to rich option content, D1 consequence 3).

## D4 — Popup positioning: CSS-only anchoring inside the component; popover/top-layer and positioning libraries rejected for v1

**Decision**: the listbox positions with pure CSS inside the component's
own box: `:host { position: relative }` (shadow-internal wrapper), listbox
`position: absolute; inset-block-start: calc(100% +
var(--_ki-select-listbox-offset)); inset-inline-start: 0;
min-inline-size: 100%; max-block-size:
var(--_ki-select-listbox-max-block-size)` with block-axis scrolling, all
logical properties (S19/FR-014). Elevation, radius, padding and background
come from the `--ki-select-listbox-*` tokens (D8). Opening never moves
DOM focus (the activedescendant model, D5); the highlighted row is kept
visible with `scrollIntoView({ block: 'nearest' })` using instant
behavior (no smooth scrolling to suppress under reduced motion — FR-015
holds by construction).

**Alternatives considered, with the written justification Art. IV
demands**:

(a) **floating-ui or any positioning dependency** — a new runtime
dependency for viewport collision handling that the spec explicitly
deferred ("Popup placement in v1 is below the trigger with CSS-only
positioning; viewport collision handling (flipping) is a post-v1
concern"); rejected — the dependency line in plan.md stays "none".

(b) **`popover` attribute + top layer** — solves the ONE real limitation
of in-component absolute positioning (an ancestor with clipping overflow
can cut the open popup off) and brings built-in light dismiss. But a
top-layer element positions against the viewport, so anchoring it to the
trigger requires either CSS anchor positioning — NOT baseline across the
evergreen target (no Firefox support as of this plan) — or hand-rolled
`getBoundingClientRect` repositioning on open/scroll/resize, i.e. the
positioning engine (a) just rejected, written by hand. Its light dismiss
also closes on outside interaction through its own event model, which
would duplicate and race the S20 handler. Rejected for v1; RECORDED
upgrade path: when CSS anchor positioning is baseline across
current + previous evergreen engines, `popover` + anchor is the additive
route out of ancestor clipping — a rendering implementation detail with
zero public API impact (Art. IX-safe).

(c) **Portal/teleport to `document.body`** — breaks shadow encapsulation,
part/token scoping and accessibility containment; rejected.

**Documented v1 limitation** (from the spec assumption, surfaced in JSDoc
and quickstart): an ancestor that clips overflow can clip the open popup,
and the popup does not flip at the viewport edge. Closed state is
`hidden` (display none) — S2's "options are hidden" is literal.

## D5 — Open/close and highlight: one state machine, APG select-only keyboard transcribed to the approved contract

**Decision**: two pieces of internal state — `open` (boolean) and
`highlightedIndex` (the visual focus, meaningful only while open;
NEVER the committed selection, which is D6's). DOM focus stays on the
trigger the whole time (the APG activedescendant model); the highlight is
communicated visually (option state tokens) and via
`aria-activedescendant` (D1/D2).

Gestures, transcribed from the APG select-only combobox against FR-007
(the spec's contract wins where the APG offers options):

| Context | Gesture | Outcome |
|---|---|---|
| closed | trigger click (pointer, or native Enter/Space button activation — ONE code path, the platform synthesizes `click` for both) | open; highlight = selected option, else first enabled (S7, S23) |
| closed | Arrow Down / Arrow Up | open; highlight = selected option, else first enabled (S7, S23, FR-007) |
| closed | Home / End | open; highlight = first / last enabled option (FR-007 — contract without S-ID, unit-covered) |
| open | Arrow Down / Arrow Up | move highlight to next/previous ENABLED option, NO wrap at either end (FR-007), skipping disabled runs (S22) |
| open | Home / End | highlight first / last enabled option (S10) |
| open | Enter / Space | COMMIT the highlight (D6) and close (S8); `preventDefault()` on keydown so the native button activation cannot re-toggle |
| open | Escape | close, discard the highlight (S9) |
| open | Tab | close, discard the highlight, do NOT `preventDefault()` — focus moves on naturally (S21; the spec's default discard-on-Tab reading, pending founder confirmation at gate 1 — the APG select-only example commits on Tab; if gate 1 flips it, the commit routine is one call away and S21 is updated first, per the spec's Assumption) |
| open | option click (enabled) | commit and close (FR-006) |
| open | option click (disabled) | nothing (S4) |
| open | trigger click | close, discard (toggle, FR-006) |
| open | pointerdown outside the component | close, discard (S20 — document-level listener attached on open, detached on close; containment tested via `composedPath()`) |
| open | focus leaves the component (`focusout` to an outside target) | close, discard (light-dismiss family; keyboard exit is S21's Tab) |
| open | select becomes disabled (attribute or fieldset) | close, discard (spec edge case, D3) |

**Excluded with the pattern in hand** (each recorded, none silently
dropped): printable-character type-ahead — APG-required for the pattern
but read under the charter's "NO typeahead" exclusion; FR-007 states the
exception explicitly and the spec flags it as a gate-1 open question (if
included, a new appended scenario lands before implementation).
`Alt+Arrow Down` (open without moving highlight) and `Alt+Arrow Up`
(commit and close) — APG-optional, in no approved scenario (Art. II);
additive later. `PageUp`/`PageDown` ±10 — APG-optional; same treatment.

The pure core — `moveHighlight(roster, from, delta)` (clamped, no wrap,
disabled-skipping), `firstEnabled`/`lastEnabled`, `openHighlight(roster,
selectedIndex)` and the keydown→intent map (closed/open × key) — lives in
`ki-select.keyboard.ts` as small pure functions with exhaustive unit
cases per branch (the mutation-gap compensating control, same role as 007
D6's `nextEnabledIndex`).

**Alternatives considered**: (a) roving DOM focus into the listbox rows —
the APG admits it for some combobox popups, but the select-only variant
is specified around activedescendant, focus-on-trigger keeps blur/Tab
semantics trivial (one focusable), and the mirror makes activedescendant
same-scope; kept as D10's recorded contingency if a target AT pair
mis-announces. (b) wrapping arrows — FR-007 says "without wrapping at
either end"; APG's select-only listbox does not wrap either; no decision
needed, noted for the walkthrough script. (c) a `keyup`-based Space
commit to dodge the native button interplay — fragile ordering; the
keydown `preventDefault()` is the platform-documented cancellation of
button activation; rejected.

## D6 — Selection model and events: identity-tracked selection, `value` projection; a user commit synthesizes composed `input` then `change` from the host

**Decision**: the single source of truth is `selectedOption` — a
reference to the selected `ki-option` (identity, not value — duplicate
values, 007 D4). `@Prop({ mutable: true }) value` is a PROJECTION:
reading returns the selected option's value or `""`; assigning selects
the first matching option or none, SILENTLY; the attribute is the initial
declaration and is never reflected back (003 D2 + 007 D4). An option
without an explicit `value` uses its trimmed label text as its value
(FR-002, native `<option>` parity) — one pure helper
(`optionValue(option)`).

The COMMIT routine (reached only from D5's user gestures: option click,
Enter/Space on the highlight) is the ONLY event source: it sets
`selectedOption` to the committed option, updates the trigger value span
and the mirror rows' `aria-selected`, recomputes `setFormValue` and
validity (D7), closes the popup, and dispatches
`new InputEvent('input', { bubbles: true, composed: true })` followed by
`new Event('change', { bubbles: true, composed: true })` from the HOST —
native-select event order. Committing the ALREADY selected option closes
without dispatching (native parity: a native select fires nothing when
the selected option is re-picked; 007 D5's exactly-one-change rule).

**Owned deviation from the sibling event rule**: 003/006/007/008 pass a
NATIVE composed `input` through and re-dispatch only `change`; ki-select
renders NO native value control, so there is no native event to pass
through — BOTH events are synthesized. The sibling convergence that
matters is preserved: events fire from the form-associated host, only on
user commits, with `input` before `change`, and programmatic writes and
reconciliation are silent BY CONSTRUCTION because only the commit routine
dispatches (no suppression flags — 003 D5's rationale intact). No `ki-*`
events (charter; FR-005).

**Alternatives considered**: (a) `ki-*` events — charter forbids;
rejected. (b) dispatching from the mirror row or a shadow element and
letting retargeting handle it — the host is the form control and the
public surface; sibling convergence says the form-associated host is the
dispatcher; rejected. (c) `selected` attribute on ki-option as the
declaration channel — the spec's Assumptions exclude it (dual source of
truth); rejected.

## D7 — Form participation: ElementInternals on ki-select only; a hidden native `<select>` donor sources the platform-localized `valueMissing`

**Decision**: `ki-select` is the only form-associated element
(`formAssociated: true` + `@AttachInternals()`, 002 pattern); `ki-option`
never touches FACE.

- **Form value** (S13, S24): on every selection change,
  `internals.setFormValue(selectFormValue(selectedOption))` — a pure
  function returning `null` when there is NO selection (the select
  contributes no entry, S24) and the selected option's value otherwise —
  INCLUDING the empty string when the selected option carries `value=""`
  (native placeholder-option parity: the entry submits with an empty
  value; FR-009).
- **Constraint validation** (S14): `required` makes the control invalid
  exactly when the value it would submit is `""` — no selection, or a
  selected empty-valued option (FR-009 verbatim). The localized message
  MUST come from the platform (no hardcoded user-visible strings, Art.
  IV). 003 mirrored its internal native input and 007 forwarded
  `required` to its constituent native radios; ki-select renders no
  native control, so the minimal platform source is a **validity donor**:
  a permanently empty native
  `<select required hidden tabindex="-1" aria-hidden="true">` (one empty
  option) in the shadow root — `display: none` removes it from focus,
  pointer and the accessibility tree but does NOT bar constraint
  validation, so its ValidityState is real and its `validationMessage` is
  the platform's own select-specific localized string. While
  `required && submittedValue === ""`, the component mirrors
  `internals.setValidity(donor.validity, donor.validationMessage,
  trigger)` (the third argument anchors `reportValidity()` focus on the
  trigger); otherwise `internals.setValidity({})`. 007 D7 rejected a
  donor because its options already contained real native radios — that
  rejection reason does not transfer: here the donor is the ONLY native
  element that can speak the right message.
- **Invalid exposure** (S14's "reported invalid"): on the host's
  `invalid` event (fired by the FACE machinery when submission is
  blocked), set `aria-invalid="true"` on the trigger; clear when validity
  turns valid or on form reset — 007 D7's trigger machinery with the same
  declared narrowing: NO `:state(user-invalid)` custom state and NO
  invalid ink tokens in v1 (the spec's FR-012 state list and token
  surface contain no invalid family; 003 has the custom state because ITS
  spec approved an invalid appearance). Additive later (Art. VII/IX).
- **Reset** (S15): `formResetCallback` re-resolves
  `host.getAttribute('value') ?? ''` through the same first-match routine
  as programmatic assignment, silently — 003 D2's live-attribute
  native-default semantics (the `value` attribute is the declared initial
  selection; `ki-option` has no `selected` attribute by spec assumption).
  Deliberate divergence from 007's association-time snapshot, recorded:
  003's model is the one that matches "initially declared selection"
  (FR-009) for an attribute-declared default.
- **Disabled** (S3, S16): native button `disabled` + FACE machinery;
  `formDisabledCallback` folds into
  `effectiveDisabled = disabled || formDisabled` → trigger disabled,
  popup closed if open (D5), exposed unavailable; a disabled
  form-associated element is excluded from form data and constraint
  validation by the platform itself (003 D3's free ride).

**Alternatives considered**: (a) hand-written
`setValidity({ valueMissing: true }, 'Please select an option')` —
hardcodes a user-visible English string, skips platform localization
(Art. IV; 007 D7 rejected identically); rejected. (b) a generic
`<input required>` donor — its platform message is the text-field one
("Please fill out this field"), semantically wrong for a select; the
select donor costs the same and speaks the select message; rejected.
(c) toggling the donor's `required` instead of gating the mirror — the
donor is permanently required and permanently empty; gating WHICH
validity gets mirrored (donor's vs `{}`) keeps the donor static and the
logic in one pure predicate (`selectValueMissing(required,
submittedValue)`), unit-tested; chosen over donor mutation for
testability.

## D8 — Component token layer: `--ki-select-*` + `--ki-option-*`; contrast sweep extended

**Decision**: four new DTCG sources under
`packages/tokens/tokens/component/` (each published tag owns its own
family — spec constitutional surface; the `--ki-option-*` family lives in
its own file, reusable if `ki-option` ever serves other hosts):

- `select.tokens.json` — theme-neutral schema resolving from the 001
  semantic layer (onmars by inheritance):
  - trigger structure (12): `height`, `min-target` (≥ 24 px, FR-016),
    `padding-inline`, `gap`, `radius`, `font-size`, `indicator-size`,
    `border-width` PLUS per-logical-side widths
    (`border-block-start-width`, `border-block-end-width`,
    `border-inline-start-width`, `border-inline-end-width`, each
    defaulting by reference to `{ki.select.border-width}`) — 003 D8's
    mechanism verbatim, and for the same reason: the M3 reference maps
    the trigger to a text field, so BOTH M3 enclosures must be
    token-expressible (outlined = uniform width, filled = block-end
    only); FR-011 makes filled-vs-outlined a token decision, never a
    prop;
  - label (4): `label-gap`, `label-font-size`, `label-font-weight`,
    `label-line-height`;
  - trigger ink matrix (16):
    `--ki-select-{rest|hover|focus|disabled}-{bg|fg|border|label-fg}` —
    the label gets a per-state ink because the M3 text field colors its
    label on focus and disabled; with a single label token material3
    could not express that from the token layer (003 D8's exact
    argument);
  - placeholder (1): `--ki-select-placeholder-fg` (single ink; the
    disabled state dims through `disabled-fg`);
  - listbox surface (6):
    `--ki-select-listbox-{bg|radius|elevation|padding|max-block-size|offset}`
    — `elevation` references `ki.elevation.shadow*`, `bg` the
    `ki.surface.s*` levels (the spec's popup-from-surface-roles mapping);
  - focus ring (3): `--ki-select-focus-ring-{color|width|offset}` —
    002/003 convention. Subtotal 42.
- `option.tokens.json` — option structure (4): `min-target` (≥ 24 px per
  row, FR-016), `padding-inline`, `radius`, `font-size`; option state
  inks (10): `--ki-option-{rest|hover|highlight|selected|disabled}-{bg|fg}`
  (the spec's five option states, FR-012 — `highlight` is the visual
  focus, `selected` the committed choice). Subtotal 14.
- `select.material3.tokens.json` + `option.material3.tokens.json` —
  material3 overrides (M3 text-field enclosure via the per-side widths,
  menu surface for the listbox, menu-item state inks for options).

Totals: 56 tokens per theme. The vocabulary COMPLETES the spec's
abbreviated constitutional-surface list (which fixes the families and
names the core groups) with the per-side border widths, label typography
and per-state label ink, placeholder ink, listbox max-block-size/offset
and option structure — all inside the two declared families, mandated by
FR-011's "every visual property (… typography, spacing)"; the completion
is declared in plan.md's surface echo. Wiring: append the files to
`LAYERS` / `MATERIAL3_LAYERS` in
`packages/tokens/style-dictionary.config.mjs`. Component CSS consumes
exclusively through `--_ki-select-*` / `--_ki-option-*` indirection (002
pattern): trigger base = rest, swapped under `:hover`, `:focus-visible`,
effective-disabled; option rows swapped per mirror-row state
(`[aria-selected='true']`, highlight class from `highlightedIndex`,
`[aria-disabled='true']`, `:hover`).

**The `-bg`-as-backdrop convention** (007/008): every swept `-bg` cell
names the EFFECTIVE, opaque backdrop its `-fg` renders over — option
cells resolve over the listbox surface (never `transparent`), so the
sweep stays measurable even where a theme wants a "transparent" row at
rest (it references the listbox surface value instead).

**Contrast gate**: extend the per-component pattern list in
`packages/tokens/scripts/check-contrast.mjs` (its own comment mandates
extension per component or the gate silently ignores the family) with
text pairs at the existing 4.5:1 `MIN_RATIO` (all swept select surfaces
carry TEXT, so no 3:1 non-text pair is needed — the indicator inherits
the trigger `-fg`, already swept stricter than its 1.4.11 floor):

- `/^--ki-select-(?:rest|hover|focus)-bg$/u` paired with the `-fg` inks;
- explicit pairs: `--ki-select-placeholder-fg` on `--ki-select-rest-bg`;
  `--ki-select-{rest|hover|focus}-label-fg` on `--ki-surface-s0` (the
  label renders outside the enclosure, on the page surface);
- `/^--ki-option-(?:rest|hover|highlight|selected)-bg$/u` paired with the
  `-fg` inks.

Disabled cells exempt (WCAG 1.4.3 exception, existing gate rule).
Per-pattern zero-match guard. **Batch coordination**: 007 T007 and 008
T005 introduce the per-pattern-guard/per-pair-minimum mechanism —
whichever lands first on the integration branch owns it; this feature
REUSES it if present, otherwise introduces the per-pattern guard
identically (008 research D8 is the normative description); ki-select
itself needs no per-pair minimum override (everything sweeps at the 4.5
default). Unit cases in `check-contrast.test.mjs`.

**Alternatives considered**: (a) one shared option-state family with
future list-like components — themes must style each control
independently (003 D8/007 D8's rejected failure mode); rejected. (b)
uniform `border-width` only — material3 cannot express the filled
enclosure; rejected (003 D8). (c) sweeping the option highlight pair at
3:1 — the highlight cell carries the option LABEL (text), so 4.5:1
applies; no basis for relaxing; rejected.

## D9 — Tests and traceability

**Decision**: all test files marked `// @spec:005-ki-select`, S-IDs on
code lines (test titles):

- `ki-option.spec.tsx` + `ki-select.spec.tsx` (mock-doc, rendered
  together via `newSpecPage` where the composite is needed): anatomy —
  ki-option is a non-rendering data element (host computes to
  display:none, no parts rendered, no checked/selected member); ki-select
  renders label-`for`-trigger wiring, `role="combobox"` button with
  `aria-expanded="false"`, hidden listbox, mirror rows carrying
  `role="option"`, `part="option"`, ids, `aria-selected`/`aria-disabled`,
  labels mirrored from children, hidden donor select (D7), all declared
  parts; exhaustive unit cases for the pure helpers — `moveHighlight`
  (clamp at both ends, disabled runs, all-disabled → none),
  `firstEnabled`/`lastEnabled`, `openHighlight` (selected / no selection
  / selected-disabled), the keydown→intent map (closed/open × key,
  including the excluded keys mapping to nothing), `resolveSelection`
  (first-match, no-match → none, duplicate values), `optionValue` (label
  fallback), `selectFormValue` (none → null, empty-valued option → ""),
  `selectValueMissing` (required × submitted-value cases) and the boolean
  presence normalizer — the mutation-gap compensating control (D5/D6/D7).
- `ki-select.browser.spec.ts` (real browser, built
  `dist/components/ki-select.js` + `dist/components/ki-option.js` +
  `@kimen/tokens/css` — 002/003/007 pattern): S1–S5, S20, S25 core
  (pointer open/commit, composed `input`-before-`change` from the host,
  placeholder rendering, disabled select/option inertness, dangling
  value fallback, outside-click light dismiss, silent removal fallback);
  S6–S10, S21–S23 keyboard (real key presses: Tab focus visibility with
  computed focus-ring styles, open-on-arrows with highlight landing,
  commit, Escape, Home/End, Tab-discard, disabled skipping,
  no-selection opening); S11–S12 accessibility tree (collapsed combobox
  named "Country" with value "France"; expanded combobox + listbox with
  the selected option marked) + axe zero violations across
  closed/open/disabled/required-invalid states; S13–S16, S24 real
  `<form>` (FormData, blocked submission with a non-empty
  platform-sourced message — asserted non-equal to any literal in our
  source, D7 —, reset, fieldset, no-entry submission); S17, S19 theming
  + RTL (value leads, indicator trails).
- `ki-select.dark.browser.spec.ts`: S18 forced dark under onmars (the
  002/003/007 dark-instance split; vitest config already routes
  `*.dark.browser.spec.ts`).
- `ki-option.browser.spec.ts` (scaffolded by the generator): data-element
  assertions only (the host paints nothing standalone; option ROW
  assertions — ≥ 24 px target, parts — live in the select suite because
  rows are select-shadow elements, D1); header note defers every S-ID to
  the select suite so traceability stays honest (007 D9's mechanism).

**Rationale**: the traceability gate requires S-IDs on code lines of
marked files; the browser suite asserts what ships; mock-doc covers the
pure keyboard/selection/form logic branches. RED first per Art. III. All
25 approved scenarios (S1–S25) map to test tasks (tasks.md Notes carries
the full map).

## D10 — Accessibility specifics and the MANDATORY manual APG walkthrough

**Decision**: focus indication via `:focus-visible` on the native trigger
button styled from `--ki-select-focus-ring-*` (native heuristics — 002
precedent; S6); pointer targets: trigger `min-block-size:
max(var(--_ki-select-height), var(--_ki-select-min-target))` and option
rows `min-block-size: var(--_ki-option-min-target)` ≥ 24 px (FR-016);
disabled exposure native on the trigger button and `aria-disabled` on
disabled mirror rows (S3, S4, FR-008); the component ships NO intrinsic
motion — any theme-added open/close transition must sit inside
`@media (prefers-reduced-motion: no-preference)` (FR-015, edge-case
contract, style-level rule verified manually) and the highlight scroll is
instant (D4); logical properties only, value leads / indicator trails in
RTL (S19).

**Manual APG walkthrough: REQUIRED** — ki-select is the repo's first
popup control and first combobox; the charter flags the select's listbox
explicitly and the spec's constitutional surface mandates the walkthrough
(Art. V). Executed against the built Storybook/manual page with the APG
select-only combobox pattern in hand, documented in the PR, covering the
full keyboard script (D5's table, including the recorded exclusions) AND
the screen-reader outcomes automation cannot fully pin, with **named
verification points**:

1. **Highlight announcements while DOM focus stays on the trigger** — the
   `aria-activedescendant` co-shadow claim at the heart of D1: every
   arrow/Home/End move announces the newly highlighted option (name,
   selected state, position in the list) on each target browser/AT pair.
2. **Collapsed announcement** — name "Country" (native label
   association), role combobox, VALUE "France" from the trigger contents,
   collapsed state (S11; D2's naming model).
3. **Expanded announcement** — expanded state, listbox exposure, the
   selected option reported selected (S12).
4. Disabled select and disabled options announced unavailable.
5. Required exposure and the invalid announcement after a blocked
   submission, with the platform-localized message (D7).

**Recorded contingencies** (each re-enters through a failing test first,
Art. III): if a target pair does not report the trigger contents as the
combobox VALUE → extend the naming/description composition (D2
alternative c). If a target pair does not announce activedescendant
changes → fall back to roving DOM focus into the mirror rows (the
APG-admitted alternative focus model) — an internal change with zero
public API impact. axe runs across closed/open/disabled/required-invalid
× theme × scheme as the floor, never the proof (Art. V).
