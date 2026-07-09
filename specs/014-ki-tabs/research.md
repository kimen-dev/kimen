# Phase 0 Research: ki-tabs

Decisions that resolve every open technical question in the plan. Sources:
the spec (M3 documents primary/secondary tab styles; MarsUI verified
2026-07-08 — no tabs component exists, onmars styles from the 001 token
vocabulary), the WAI-ARIA APG Tabs pattern (read with the pattern in hand
for D1/D2/D6 — the "Tabs with Automatic Activation" example is the
normative reference), the 001 token architecture, the 002 ki-button
implementation (`--_ki-*` CSS indirection), and the sibling plan sets under
the same charter, whose applicable decisions are CITED and reused rather
than re-derived (Art. VII): 005 ki-select (the IDREF constraint analysis
and the shadow-mirror alternative), 007 ki-radio-group (THE direct
precedent: composite parent + light-DOM children, slotchange roster,
parent-owned roving tabindex and keyboard model, pure-function keyboard
core), 012 ki-dialog (`ki-*` event with object `detail`; the
`emulateReducedMotion` browser command), 013 ki-tooltip (no-animation-in-v1
posture), 016 ki-list (host roles via `ElementInternals.role`).

Shared decisions inherited from the siblings (cited, not re-derived):

- **Host roles via `ElementInternals.role`** — default semantics, author
  sovereignty, no host-attribute mutation — 016 D1 (applied to `tab` and
  `tabpanel` on the child hosts in D1/D2 below).
- **Option/child discovery via `slotchange` roster + a scoped
  attribute observer for `disabled`**, no subtree observer — 007 D3 (D3).
- **Parent-owned roving tabindex, arrows wrap + skip disabled + follow the
  writing direction resolved per event via `:dir(rtl)`, pure keyboard core
  exhaustively unit-tested** — 007 D6 (D6).
- **Boolean presence normalization** against Stencil's `"false"` coercion —
  006 D2 / 008 D2 (applied to `disabled` on `ki-tab`).
- **`--_ki-*` private CSS indirection over component tokens** — 002
  pattern (D8).
- **Per-component contrast-sweep extension; per-pair minimum ratio (3:1)
  for non-text indicators (WCAG 1.4.11)** — 008 D8 mechanism (D8).
- **`ki-*` event as a composed, bubbling CustomEvent with an object
  `detail`, from a non-form-associated host** — 012 D1/D4 convention
  (`ki-close` with `detail.reason`) (D5).
- **`emulateReducedMotion` browser command**
  (`page.emulateMedia({ reducedMotion })` via `defineBrowserCommand`) —
  012 T007 (D9).
- **No animation in v1; reduced motion satisfied by construction and
  measured under real emulation** — 013 D6 (D10).

## D1 — Composite architecture: APG roles on the light-DOM hosts, tabs auto-assigned into a shadow `role="tablist"` wrapper; the 005-style shadow mirror REJECTED

**The constraint that frames the choice**: the APG Tabs pattern is
IDREF-wired — each `role="tab"` element carries `aria-controls` referencing
its `role="tabpanel"`, and each panel carries `aria-labelledby` referencing
its tab — and role containment matters: the tabs must be owned by the
`tablist`, and the panels must NOT be (a `tabpanel` inside a `tablist` is
an invalid owned child; axe's `aria-required-children` flags it and AT
containment/reading order breaks). ID references resolve only within a
single tree scope. The decisive observation: **both `ki-tab` and
`ki-tab-panel` are light-DOM children of `ki-tabs` — they already share one
tree**, and the focusable element of the pattern is the tab itself, not a
shadow-internal control. So every IDREF the pattern needs is same-tree in
the consumer's document, and no cross-shadow ARIA is required anywhere.
This is the opposite of 005's situation (whose focused trigger lives in the
select's SHADOW and must reference the options by ID, forcing the shadow
mirror); the mirror's justification does not exist here.

**Decision**: the roles live on the light-DOM hosts; `ki-tabs` renders:

```html
<div role="tablist" part="tablist" aria-label={label}>
  <slot name="tab" />   <!-- receives ONLY ki-tab children (auto-assigned) -->
</div>
<slot />                <!-- default: ki-tab-panel children (and any stray
                             content), rendered after the strip -->
```

- `ki-tab` sets `internals.role = 'tab'`; `ki-tab-panel` sets
  `internals.role = 'tabpanel'` (016 D1 mechanism: default semantics an
  author-set `role` still overrides; no host-attribute mutation for the
  static role). The `tablist` role lives on the shadow wrapper attribute,
  co-located with the `tablist` part it styles (007 D2's
  role-on-internal-wrapper precedent).
- **Auto-assignment**: during discovery (D3) the group stamps `slot="tab"`
  on each `ki-tab` child, so tabs — and ONLY tabs — flatten inside the
  tablist wrapper, while panels and any malformed stray content stay in the
  default slot after the strip. The flattened accessibility tree is then
  the APG structure verbatim: a tablist containing exactly the tabs,
  followed by the panels. Authors never write `slot` attributes — the
  public composition surface stays "children in the default slot" exactly
  as the spec froze it; the stamped attribute is group-managed output,
  like the stamped `selected`/`tabindex`/`hidden` (D4/D6/D7), explicitly
  NOT public API.
- **The children are almost behavior-free** (the spec's "children carry
  data and slots; the group orchestrates" model, 007 discipline):
  - `ki-tab` shadow is purely presentational —
    `<span part="tab"><slot name="start"/><slot/><slot name="end"/></span>
    <span part="indicator" aria-hidden="true"></span>` — with NO inner
    button or focusable element: the HOST is the `role="tab"` focusable
    (an inner interactive element would nest a widget inside the tab role,
    an axe `nested-interactive` failure, and would put focus on an element
    AT cannot map to the tab). Its only logic: derive
    `internals.ariaSelected` from the reflected `selected` attribute the
    group writes, and `internals.ariaDisabled` from its own `disabled`
    (D2).
  - `ki-tab-panel` shadow is `<div part="panel"><slot /></div>`; its only
    logic is `internals.role = 'tabpanel'` plus the `:host([hidden])` CSS
    guard (D7).

**Rationale**: with the roles on the hosts, everything the pattern requires
is either platform behavior or plain same-tree attributes: name-from-content
for each tab flows through the flattened tree from the slotted label
(S7), `aria-labelledby` from panel host to tab host is a light-DOM IDREF
(S8), and the roving tabindex targets the hosts the user actually focuses.
The auto-assigned named slot is the narrowest construction that produces
correct tablist containment given the spec's single-default-slot API:
`role="tablist"` on the ki-tabs HOST would make the panels owned children
of the tablist (invalid, axe-flagged, AT-visible); wrapping the whole
default slot in the tablist has the same defect plus stray content inside
the strip.

**Alternatives considered**:

(a) **005-style shadow mirror** (children as declarative data, the group
renders shadow tab rows) — destroys the spec's frozen child surface:
`ki-tab`'s `start`/`end`/default slots and `tab`/`indicator` parts
(FR-012/FR-013) cannot exist on a data carrier; and the mirror's sole
justification (shadow-scoped IDREFs, 005 D1) is absent here. Rejected.

(b) **`role="tablist"` on the ki-tabs host** (`internals.role`) — panels
become owned children of the tablist: invalid ARIA containment, axe
`aria-required-children` violation ("children which are not allowed"),
wrong AT reading structure. Rejected.

(c) **Imperative slot assignment** (`slotAssignment: 'manual'` +
`slot.assign(...)`) — no serialized `slot` attribute at all, but Stencil's
shadow options do not expose `slotAssignment`, and manual mode makes every
unassigned child disappear (worse failure mode for malformed content,
FR-014). Rejected; RECORDED as the future cleanup if Stencil ever exposes
it — the observable contract would not change.

(d) **Re-parenting children into a component-created wrapper** (light or
shadow) — light-DOM surgery breaks framework reconciliation and `part`
cannot exist outside a shadow tree (FR-013's `tablist` part). Rejected.

**Consequences the decision must own honestly**:

1. Serialized markup shows the group-managed attributes on the children
   (`slot="tab"`, `selected`, `tabindex`, `hidden`, generated `id`s,
   `aria-controls`/`aria-labelledby`) — the same class of output as 007's
   pushed input state, just attribute-visible. The contract documents all
   of them as component-managed output, never authored (agents included).
2. A framework that re-renders children and strips the stamps is healed by
   the next `slotchange`/observer pass (D3) — re-stamping is idempotent.
3. Before the first reconciliation pass, un-stamped tabs sit in the
   default slot (after the panels). Discovery runs at first render and on
   every `slotchange`, so the window is sub-frame; no approved scenario
   observes intermediate paint.

## D2 — ARIA wiring, all co-tree: group-managed ids + `aria-controls`/`aria-labelledby`; state exposure derived by the children via internals

**Decision**:

- The group ensures an `id` on every tab and panel host, generating one
  (`ki-tab-…`/`ki-tab-panel-…`, instance-scoped) ONLY when the author has
  not set one — author ids are never overwritten.
- Per resolved pairing (D3): the group writes `aria-controls="<panel id>"`
  on each paired tab host and `aria-labelledby="<tab id>"` on each paired
  panel host — the APG wiring verbatim, both plain same-tree light-DOM
  IDREFs. Orphan tabs get no `aria-controls`; orphan panels get no
  `aria-labelledby` (never a dangling reference).
- `ki-tab` derives `internals.ariaSelected` (`"true"`/`"false"`) from its
  reflected `selected` attribute (which only the group writes, FR-003) and
  `internals.ariaDisabled` from its own `disabled` prop — the states ride
  the host role from D1 with no attribute sprouting.
- The tablist's accessible name is `aria-label={label}` on the shadow
  wrapper, present only when the group's `label` is provided (FR-008
  "when provided"). No visible label is rendered — the tabs themselves are
  the visible labels, the spec's API lists no `label` part, and S7 pins
  name only (deliberate divergence from 007 D2's visible group label,
  which its spec required).
- Each tab's accessible name is name-from-content through the flattened
  tree (the slotted default-slot label, S7); each panel's name resolves
  through `aria-labelledby` to its tab (S8).

**Rationale**: FR-008 verbatim with zero cross-shadow ARIA and zero
hand-managed `aria-selected`/`aria-disabled` attributes in the light DOM
(internals carry them). The generated-id-only-when-absent rule keeps
author sovereignty (016 D1's posture).

**Alternatives considered**: (a) ARIA element reflection
(`internals.ariaControlsElements` etc.) — not baseline across the evergreen
target (005 D1(b): Firefox), and unnecessary when the IDREFs are same-tree;
recorded as a future simplification that would remove the generated ids.
(b) duplicating the tab's text into `aria-label` on the panel — goes stale
when the slotted label changes; rejected. (c) group-written `aria-selected`
attributes on the tab hosts — equivalent semantics but mutates one more
author-visible attribute and splits selection exposure from the element
that owns the role; the internals derivation keeps one writer per surface;
rejected.

## D3 — Discovery, pairing and reconciliation: slotchange rosters; first-in-document-order owns a value; duplicates and orphans are inert, never fatal

**Decision**: discovery is `slotchange`-driven (007 D3):

- The DEFAULT slot's `slotchange` is the intake: any `ki-tab` found there
  (new children carry no `slot` attribute) is stamped `slot="tab"` and
  re-flows to the named slot, whose own `slotchange` rebuilds the tab
  roster (`assignedElements()` filtered by localName — filtering works
  before upgrade). Panels roster from the default slot's
  `assignedElements()` filtered to `ki-tab-panel`. Document order is strip
  order and navigation order.
- One `MutationObserver` watches the tab hosts' `disabled` attribute
  (reflected on `ki-tab`), because a disabled-state change must re-run
  selection fallback and the roving tab stop without a slot change
  (007 D3's exact mechanism). No subtree observer (Art. VII).
- **Pairing** (FR-001/FR-014): a value → {tab, panel} map built in document
  order; the FIRST tab and FIRST panel bearing a value own it. Later
  duplicates render but never pair: a duplicate tab is **unselectable**
  (skipped by pointer, arrows and fallback — forced by FR-014's "a
  duplicate tab is never selected" combined with FR-005's automatic
  activation: if arrows could focus it, focus would select it) and a
  duplicate panel stays hidden. A `ki-tab` with no `value` attribute
  participates with the effective value `""` under the same first-match
  rules (degenerate but deterministic; documented as misuse in the
  catalog). Orphan tabs select with no visible panel; orphan panels stay
  hidden (FR-004's at-most-one invariant).
- Every reconciliation (initial upgrade, slotchange, disabled mutation)
  re-runs the selection resolution (D4) and all stamps, SILENTLY — no
  `ki-change` (FR-004 fires on user-driven changes only). Dynamic mutation
  of the tab set after render is out of v1 scope per the spec's
  assumptions; the reconciliation here is the minimal robustness for
  upgrade timing and malformed markup (FR-014, US4), not a mutation
  feature — re-running the same resolution on a later mutation is safe by
  construction but pinned by no scenario.

**Alternatives considered**: (a) index-based tab↔panel association — the
spec froze pairing by shared `value` (FR-001); rejected. (b) a childList
MutationObserver for discovery — `slotchange` already fires for exactly
the child-list changes that matter, and the default-slot-as-intake makes
one mechanism serve discovery AND auto-assignment; rejected. (c) treating
duplicate tabs as focusable-but-inert (focus moves, selection doesn't) —
violates automatic activation's focus-follows-selection invariant and
creates a focus trap state; rejected.

## D4 — Selection model: group-owned resolution with fallback; `value` is the resolved projection; `selected` is output-only reflection

**Decision**: the single source of truth is the group's resolved selection
(`selectedTab`, an element reference derived by resolution — with
duplicates unselectable, value ↔ selectable tab is one-to-one).
**Resolution** (FR-002, S3/S12/S18), applied at first render, on
programmatic `value` writes, and on every reconciliation:

1. If the requested value (attribute at load; property thereafter) is
   owned by a non-disabled tab → that tab.
2. Else → the first non-disabled owner tab in document order.
3. Else (every tab disabled or no tabs) → none: no `selected` tab, no
   visible panel, no tab stop (S18).

`@Prop({ mutable: true }) value` is a PROJECTION: reading it returns the
resolved selected tab's value, or `""` when none. The attribute is the
initial declaration and is NOT re-reflected (007 D4: serialized markup
keeps the declaration; live state reads from the property). Programmatic
writes re-run resolution silently (native `change` parity — spec
assumption).

On every resolution the group stamps, idempotently: `selected` (reflected
attribute, present on the selected tab only — any author-set `selected` is
overwritten on this first pass, FR-003), roving `tabindex` (D6), `hidden`
on panels (D7), and the pairing wires (D2). `ki-tab` has no public
selection API beyond the output-only reflected `selected`; its selected
presentation renders from `:host([selected])` (CSS state via the managed
attribute — FR-010's one sanctioned reflected managed state).

**Rationale**: FR-002/FR-003 verbatim. Keeping resolution as one pure
function (`resolveSelection(roster, requestedValue)` in
`ki-tabs.selection.ts`) makes the fallback matrix (S3, S12, S18)
exhaustively unit-testable — the mutation-gap compensating control, same
role as 007's `nextEnabledIndex`.

**Alternatives considered**: (a) trusting an author-set `selected` on a
tab as an input — FR-003 forbids it verbatim (value is the single source
of truth); rejected. (b) reflecting the resolved value back to the group's
`value` attribute — makes the attribute fight the author's declaration
and adds a writer for zero observable gain (no CSS keys off it); rejected.
(c) identity-tracked selection surviving duplicates (007's model) —
duplicates are unselectable here by FR-014, so identity beyond the
resolution result models states that cannot occur; rejected (Art. VII).

## D5 — Events: one `ki-change` CustomEvent from the group host, user-driven changes only

**Decision**: on every user-driven selection change (pointer activation,
arrow/Home/End navigation) — and ONLY then — the group dispatches, after
all stamps are current:

```ts
new CustomEvent('ki-change', {
  bubbles: true,
  composed: true,
  detail: { value: this.value },
})
```

Stencil surface: `@Event({ eventName: 'ki-change' }) kiChange`. The object
`detail` follows the batch's `ki-*` event convention (012's `ki-close`
carries `detail.reason`); `detail.value` is the resolved selected value
(S1: "reports 'Notifications'"). Programmatic `value` writes, first-render
fallback and reconciliation are silent by construction — the dispatch is
wired only into the user-driven path, no suppression flags (007 D5's
rationale). Re-selecting the selected tab fires nothing (no state change).
`ki-change` is a post-change notification and is not cancelable.

**Rationale**: FR-004 verbatim. A `ki-*` event is correct here where the
form-control siblings forbade one: tabs are NOT form-associated and no
native `input`/`change` exists to pass through or re-dispatch (007 D5's
mechanism rides a native control that tabs do not have); the spec fixes
the name and payload, and 011/012 set the convention for non-form `ki-*`
notifications.

**Alternatives considered**: (a) re-dispatching a native-named `change` —
fabricates a native event no platform control fired, exactly what 007 D6
refused to do ("the group never fabricates an event it did not receive");
and the spec froze `ki-change`; rejected. (b) bare-string `detail` — reads
identically in S1 but diverges from the batch's object-detail convention
and forecloses additive fields; rejected (flagged for gate-1 confirmation,
plan Complexity Tracking).

## D6 — Keyboard model: group-owned roving tabindex on the tab HOSTS; automatic activation; Home/End; RTL mapping; Tab exits into the visible panel

**Decision**: the group owns the whole APG keyboard contract, adapted from
007 D6 with one structural difference — the focusable elements are the tab
HOSTS themselves (the `role="tab"` elements, D1), not shadow-internal
inputs:

- **Roving tab stop** (FR-006): exactly one tab host has `tabindex="0"` —
  the selected tab; every other tab (and every disabled or duplicate tab,
  always) gets `tabindex="-1"`. Under automatic activation a focusable
  unselected tab stop cannot exist, so "selected" and "tab stop" coincide;
  when nothing is selected (all disabled, S18) no tab has `tabindex="0"`
  and the strip contributes no tab stop. Recomputed on every resolution.
- **Arrow navigation + automatic activation** (FR-005/FR-006): one
  `keydown` listener on the ki-tabs host (key events bubble from the tab
  hosts through the light tree). ArrowRight/ArrowLeft map to next/previous
  in LTR and previous/next in RTL, resolved per event via
  `host.matches(':dir(rtl)')` (S4/S16, 007 D6's mechanism); target = the
  adjacent SELECTABLE tab (non-disabled owner, D3) with wraparound at both
  ends (S13); Home/End jump to the first/last selectable tab (S5/S14).
  The handler calls `preventDefault()`, then ONE code path:
  `this.select(target)` (resolution stamps + `ki-change`, D4/D5) followed
  by `target.focus()` — moving focus selects, selection moves focus:
  automatic activation per the APG and FR-005. NOT implemented (Art. II —
  no approved scenario): ArrowUp/ArrowDown (vertical mapping, v1 is
  horizontal-only per the spec's assumptions) and Enter/Space (redundant
  under automatic activation — the focused tab is already selected; the
  APG assigns them to manual activation, a recorded future opt-in).
- **Pointer** (S1/S2): one `click` listener on the host;
  `composedPath()`-closest `ki-tab` inside the group; disabled or
  duplicate → ignored, else the same `select()` path.
- **Tab exits into the visible panel** (S6/S15): the visible panel host
  carries group-stamped `tabindex="0"` (hidden panels carry none) — the
  APG automatic-activation example puts `tabindex="0"` on the tabpanel
  unconditionally, which satisfies S6 (focus "lands in the panel": the
  panel host IS in the panel) and S15 (a panel with no focusable content
  receives focus itself) with zero content-scanning heuristics. Its focus
  ring renders under `:host(:focus-visible)` from
  `--ki-tab-panel-focus-ring-*`. When no panel is visible (orphan-tab
  selection, all-disabled group) no panel is focusable and Tab proceeds to
  the next focusable element natively (spec edge case — no code).
- **Pure core** (mutation-gap compensating control, 007 D6):
  `nextSelectableIndex(roster, from, direction)` (wrap, skips disabled AND
  non-owner duplicates), `firstSelectable`/`lastSelectable`, the
  arrow→direction map (key × writing direction), and D4's
  `resolveSelection` live in `ki-tabs.keyboard.ts` /
  `ki-tabs.selection.ts` as small pure functions with exhaustive unit
  cases per branch.

**Rationale**: this is the APG Tabs (automatic activation) keyboard
contract transcribed, which the spec approved scenario by scenario
(S4–S6, S13–S16); host-level focus is what makes AT announce "tab, n of
N, selected" on the element that owns the role.

**Alternatives considered**: (a) `delegatesFocus` + an inner focusable in
ki-tab — nested interactive inside `role="tab"`, and focus would land on
an element without the role; rejected (D1). (b) selection NOT following
focus (manual activation) — the spec resolved automatic activation
(FR-005, charter + M3 inventory); manual is a recorded future opt-in;
rejected for v1. (c) `keydown` listeners per tab — N listeners for one
behavior; rejected (007 D6).

## D7 — Panel visibility: the native `hidden` attribute, group-stamped, with the `:host([hidden])` shadow guard

**Decision**: the group stamps `hidden` on every panel except the resolved
selection's paired panel (which gets it removed). Orphan and duplicate
panels are simply never the paired panel, so they stay `hidden` (FR-014).
Native `hidden` removes the panel from layout AND from the accessibility
tree while its content stays in the document (no lazy mounting — spec
assumption; panel content remains findable/measurable by scripts).

One guard is mandatory: any `:host { display: … }` rule in
`ki-tab-panel.css` is an author-origin declaration that beats the UA's
low-priority `[hidden] { display: none }`, silently breaking the
attribute. `ki-tab-panel.css` therefore declares
`:host([hidden]) { display: none !important; }` — the standard
web-component restoration of native `hidden` semantics — pinned by a
browser test (a hidden panel has no box).

**Rationale**: `hidden` is the platform's own mechanism for exactly this
state (the APG examples toggle it), it is observable and author-visible,
and it needs no custom attribute, class or inline style. The guard costs
one declaration.

**Alternatives considered**: (a) inline `style.display` writes — mutates
the author's `style` attribute and loses to author `!important`; rejected.
(b) conditional slot rendering inside the panel's shadow — unslotted
content also stops rendering but the state becomes invisible in the light
DOM and unstylable by authors; rejected. (c) a custom `data-*`/state
attribute + CSS — reinvents `hidden` without its a11y-tree semantics;
rejected.

## D8 — Component token layer: three per-tag families (`--ki-tabs-*`, `--ki-tab-*`, `--ki-tab-panel-*`); contrast sweep extended with text pairs at 4.5:1 and the indicator pair at 3:1

**Decision**: new DTCG sources under `packages/tokens/tokens/component/`,
one file per published tag (spec constitutional surface):

- `tabs.tokens.json` — strip structure (3): `--ki-tabs-gap` (inter-tab
  spacing), `--ki-tabs-divider-width` and `--ki-tabs-divider-color` (the
  block-end rule under the strip — M3's divider; a theme may zero it).
  Theme-neutral semantic references; no material3 override file (the
  divider references the semantic outline family, which each theme already
  values — 007 D8's group-file precedent; an override arrives additively
  only if M3 must remap the semantic role).
- `tab.tokens.json` — per-tab surface (29):
  - structure (7): `--ki-tab-min-block-size` (≥ 24 px, the Art. V target
    floor — inline size is content + `padding-inline`, ≥ 24 px by
    construction), `--ki-tab-padding-inline`, `--ki-tab-gap` (slot gap),
    `--ki-tab-radius`, `--ki-tab-font-size`, `--ki-tab-font-weight`,
    `--ki-tab-line-height`. Single scale — no size axis (spec assumption).
  - selection × interaction ink matrix (16):
    `--ki-tab-{selected|unselected}-{rest|hover|active|disabled}-{fg|bg}`
    — `fg` is the label ink (TEXT), `bg` the tab surface. Convention
    honored from 007/008 D8: **`-bg` names the effective backdrop the
    label renders over** — a visually transparent tab references the
    surface it sits on (translucent values are composited over
    `--ki-surface-s0` by the sweep), keeping every pair measurable. The
    M3 primary/secondary distinction and any emphasis treatment are THEME
    decisions expressed in these cells, never attributes (FR-009).
  - indicator (3): `--ki-tab-indicator-size` (block thickness),
    `--ki-tab-indicator-color`, `--ki-tab-indicator-radius`. The indicator
    is a pure-CSS bar (the `indicator` part), rendered under
    `:host([selected])` — per-tab, so no cross-tab slide machinery exists
    (D10).
  - focus ring (3): `--ki-tab-focus-ring-{color|width|offset}` —
    002/003/007 convention, consumed under `:host(:focus-visible)`.
- `tab-panel.tokens.json` — panel surface (6):
  `--ki-tab-panel-padding-block`, `--ki-tab-panel-padding-inline`,
  `--ki-tab-panel-bg`, and `--ki-tab-panel-focus-ring-{color|width|offset}`
  (the panel is a focus stop — D6). `--ki-tab-panel-bg` MUST reference a
  semantic surface so slotted text (which inherits document inks) stays on
  a swept surface. No material3 override file (structure + one semantic
  surface reference inherit through the base layer).
- `tab.material3.tokens.json` — material3 overrides for the tab ink matrix
  and indicator (M3 primary-tab mapping: selected label + indicator from
  the primary family, unselected label from the on-surface family,
  disabled cells from the disabled ramp), honoring the `-bg`-as-backdrop
  convention.

Totals: 3 + 29 + 6 = **38 tokens per theme**; every value references the
001 semantic layer. Wiring: append the files to `LAYERS` /
`MATERIAL3_LAYERS` in `packages/tokens/style-dictionary.config.mjs`.
Component CSS consumes exclusively through `--_ki-tabs-*` / `--_ki-tab-*`
/ `--_ki-tab-panel-*` indirection swapped per state (base =
unselected-rest; overridden under `:host([selected])`, `:host(:hover)`,
`:host(:active)`, `:host([disabled])` — 002 pattern).

**Contrast gate** (Art. X: extended in the SAME change that ships the
tokens, or the sweep silently ignores the family): extend
`COMPONENT_BG_PATTERN` in `packages/tokens/scripts/check-contrast.mjs`
with `/^--ki-tab-(?:selected|unselected)-(?:rest|hover|active)-bg$/u`,
pairing each `-bg` with its `-fg` **label ink at the 4.5:1 text minimum**
(unlike 007's dot, the tab `fg` IS text — WCAG 1.4.3), plus ONE explicit
non-text pair — `--ki-tab-indicator-color` against
`--ki-tab-selected-rest-bg` — at a **3:1 per-pair minimum** (the indicator
is the non-text selected-state marker, WCAG 1.4.11; 008 D8's per-pair
mechanism). Batch coordination: REUSE the per-pair-minimum +
per-pattern-zero-match-guard mechanism if 008/007 have landed on the
integration branch; otherwise introduce it here identically (008 research
D8 is the normative description — the script currently has a single
global `MIN_RATIO`). Disabled cells exempt (existing gate rule).
`--ki-tab-panel-bg` stays OUT of the component sweep: the panel owns no
text ink token — slotted content inherits document inks already swept at
the semantic layer, and the bg is constrained to a semantic surface
reference (above). Unit cases in `check-contrast.test.mjs`.

**Alternatives considered**: (a) one merged `--ki-tabs-*` family for all
three tags — the spec fixes one family per published tag (FR-009), and
themes must style strip, tab and panel independently; rejected. (b) a
border column in the tab matrix — neither source styles per-state tab
borders (the strip divider and the indicator carry the lines); additive
later; rejected (Art. VII). (c) sweeping the indicator at 4.5:1 — stricter
than 1.4.11 for a non-text indicator with no constitutional basis (008 D8);
rejected.

## D9 — Tests and traceability

**Decision**: all test files marked `// @spec:014-ki-tabs`, S-IDs on code
lines (test titles):

- `ki-tab.spec.tsx`, `ki-tab-panel.spec.tsx`, `ki-tabs.spec.tsx`
  (mock-doc, rendered together via `newSpecPage` where composition
  matters, 016 D6 convention for internals assertions): anatomy — ki-tab's
  presentational shadow (`tab` + `indicator` parts, `aria-hidden`
  indicator, three slots, NO inner interactive element),
  `internals.role`/`ariaSelected`/`ariaDisabled` derivation, reflected
  `selected`/`disabled` with presence normalization; ki-tab-panel's
  `panel` part + `tabpanel` role; ki-tabs' tablist wrapper
  (`role="tablist"`, `part="tablist"`, `aria-label` only when `label`
  provided), auto-assignment stamping, generated-id-only-when-absent,
  pairing wires; exhaustive unit cases for the pure core —
  `resolveSelection` (declared/none/unknown/disabled-owner/duplicate/
  all-disabled × programmatic re-write), `nextSelectableIndex` (wrap,
  disabled runs, duplicate skipping, single-tab self-wrap, none),
  first/last selectable, the arrow→direction map (2 keys × LTR/RTL +
  Home/End), the presence normalizer — the mutation-gap compensating
  control.
- `ki-tabs.browser.spec.ts` (real browser, built
  `dist/components/ki-tabs.js` + `ki-tab.js` + `ki-tab-panel.js`,
  `@kimen/tokens/css` injected — 002/003 pattern): S1–S3, S12, S18 core
  (selection, exactly one `ki-change` with `detail.value`, disabled
  inertness, fallback matrix, all-disabled emptiness, at-most-one visible
  panel incl. orphan/duplicate malformations); S4–S6, S13–S15 keyboard
  (real Arrow/Home/End/Tab presses, panel focus) + S16 in a `dir="rtl"`
  document; S7, S8 assistive-tech (computed accessibility tree: tablist
  named, tabs named + selected exposure, visible panel named after its
  tab) + axe zero violations across selection × disabled × theme states;
  S9 theming; S11 RTL strip order; S17 reduced motion via the
  `emulateReducedMotion` browser command (012 T007 — batch coordination:
  reuse if landed, else add it identically), asserting the panel switch
  applies instantly with no transition/animation computed on panel or
  indicator.
- `ki-tabs.dark.browser.spec.ts`: S10 forced dark under onmars (the
  002/003 dark-instance split — the vitest config already routes
  `*.dark.browser.spec.ts`).
- The generator scaffolds `ki-tab.browser.spec.ts` and
  `ki-tab-panel.browser.spec.ts` too; the composite scenarios need all
  three tags on one page, so those files carry anatomy-only browser
  assertions (parts exposed; tab pointer target ≥ 24 px; hidden panel has
  no box — D7's guard) and defer every S-ID to the group suite, recorded
  in their header comments (007 D9's honesty note).

**Rationale**: the traceability gate requires S-IDs on code lines of
marked files; the browser suite asserts what ships; mock-doc covers the
pure resolution/navigation branches. RED first per Art. III. All 18
approved scenarios (S1–S18) map to test tasks (tasks.md Notes carries the
full map).

## D10 — Accessibility specifics and the MANDATORY APG walkthrough

**Decision**:

- **Focus indication** on the tab HOST via `:host(:focus-visible)` using
  `--ki-tab-focus-ring-*` (host-level focus, unlike 007's inner-input
  selector — there is no inner control); panel focus ring via
  `:host(:focus-visible)` from `--ki-tab-panel-focus-ring-*`.
- **Pointer target** ≥ 24×24 px per tab via `--ki-tab-min-block-size` +
  `padding-inline` (asserted from the rendered box).
- **Disabled exposure**: `internals.ariaDisabled` + permanent
  `tabindex="-1"` — the disabled tab stays perceivable in the tree as
  unavailable (FR-007) but is skipped by every modality.
- **Motion**: v1 ships ZERO transitions and animations — the indicator is
  per-tab (appears/disappears with `selected`, no cross-tab slide) and
  panel switching is instant, so reduced motion is satisfied by
  construction (013 D6) and MEASURED under real emulation (S17). Any
  future motion (an indicator slide is the obvious candidate) must live
  inside `@media (prefers-reduced-motion: no-preference)` — the stylelint
  discipline is declared now (FR-011).
- **Manual APG walkthrough: REQUIRED** — the spec's constitutional surface
  flags the APG Tabs pattern with automatic activation as a NEW
  interaction pattern in the repo (Art. V). Executed against the built
  Storybook/manual page with the APG Tabs pattern in hand and documented
  in the PR: single tab stop in/out (selected tab on entry; strip skipped
  entirely when all tabs are disabled), arrows with wrap + disabled/
  duplicate skipping in LTR AND RTL, Home/End, Tab from strip into the
  visible panel (and into the next focusable when no panel is visible),
  plus the screen-reader outcomes automation cannot fully pin, with three
  NAMED verification points: (1) **"tab, n of N, selected"** — the
  position-in-set computed across the shadow tablist wrapper containing
  slotted hosts (the one cross-boundary claim of D1; recorded contingency:
  group-managed `aria-posinset`/`aria-setsize` on the tab hosts, additive,
  the group already has the roster); (2) the **panel announced as a
  tabpanel named after its tab** on entry (D2's co-tree IDREF wiring);
  (3) **automatic activation announced sanely** while arrowing (selection
  follows focus without double-announcements). axe runs across selection ×
  disabled × theme × scheme as the floor, never the proof (Art. V).

**Rationale**: Art. V's floor-vs-proof language: for the repo's first
tablist composite, the proof is the APG contract holding end to end on
real assistive technology, and the genuinely novel claims (set computation
through the slot; co-tree panel naming) are verified by a human, exactly
as the spec mandates.
