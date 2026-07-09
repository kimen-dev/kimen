# Public contract: `<ki-tabs>` + `<ki-tab>` + `<ki-tab-panel>`

The behavior contract is `specs/014-ki-tabs/feature.feature` (S1–S18).
This document freezes the public API surface the scenarios observe — for
ALL THREE elements of the composite (the sub-components belong to the
parent's spec per the batch charter, 007 precedent). Any deviation
discovered during implementation re-enters through the spec, not through
code (Art. II).

## Elements

`<ki-tabs>` — the tab group and single orchestrator: owns the selection
(`value`), the tablist's accessible name (`label`), the pairing, the
keyboard model and the `ki-change` notification. NOT form-associated
(tabs switch views; they never contribute form data — spec family N/A).
Registered by `@kimen/elements`; per-component export
`dist/components/ki-tabs.js`.

`<ki-tab>` — one selectable tab. NOT valid standalone: documented as
usable only inside a `ki-tabs` (when-NOT-to-use). Its host is the
`role="tab"` focusable element. Per-component export
`dist/components/ki-tab.js`.

`<ki-tab-panel>` — one content view, tied to its tab by the shared
`value`. NOT valid standalone. Its host is the `role="tabpanel"` element.
Per-component export `dist/components/ki-tab-panel.js`; consumers
importing the group must import all three.

## Attributes / properties — `ki-tabs`

TypeScript exposes them as typed properties with complete JSDoc (Art. I:
an undocumented member is a build failure).

| Attribute | Type | Default | Contract |
|---|---|---|---|
| `value` | `string` | `""` | PROJECTION of the RESOLVED selection: always equals the selected tab's value, or `""` when none is selected (FR-002). The attribute declares the initial selection. Resolution: the requested value's owner tab when it exists and is enabled; else the first non-disabled owner tab in document order (S3, S12); else none — no selection, no visible panel, no tab stop (S18). Assigning the property re-runs the same resolution, SILENTLY (no `ki-change`; FR-004, native-`change` parity). Not reflected: serialized markup keeps the initial declaration; live state is read from the property. Duplicate values resolve first-in-document-order (FR-014). |
| `label` | `string` | — | The tablist's accessible name (S7, FR-008), applied as `aria-label` on the internal tablist wrapper when provided. Not rendered as visible text (the tabs are the visible labels). Documented guidance: always label a tab group. |

## Attributes / properties — `ki-tab`

| Attribute | Type | Default | Contract |
|---|---|---|---|
| `value` | `string` | `""` (effective when unset) | The pairing identifier shared with the matching `ki-tab-panel` (FR-001). The first tab in document order bearing a value owns it; a later duplicate renders but is never selectable — skipped by pointer, arrows and fallback (FR-014). |
| `disabled` | `boolean` | `false` | Not selectable by any modality (S2), skipped by arrow navigation and by the fallback (S12, S13), never the tab stop, exposed as unavailable to AT (FR-007). Boolean presence semantics; reflected (the group observes this attribute). |
| `selected` | `boolean` | `false` | **OUTPUT-ONLY reflected managed state** (FR-003): written exclusively by the group's resolution so pages and CSS can observe the selected tab; any author-set `selected` is ignored and overwritten on first render. An agent or app that wants a pre-selected tab sets the GROUP's `value`. |

## Attributes / properties — `ki-tab-panel`

| Attribute | Type | Default | Contract |
|---|---|---|---|
| `value` | `string` | `""` (effective when unset) | Pairs the panel to the tab bearing the same value (first-in-document-order owns it). The panel is visible only while its tab is selected; orphan and duplicate panels stay hidden and never break rendering (FR-004, FR-014). |

Group-managed attributes on the child hosts (`slot`, `id` when absent,
`aria-controls`, `aria-labelledby`, `tabindex`, `hidden`, `selected`) are
component OUTPUT — an internal coordination channel made
attribute-visible, explicitly outside this contract and never authored
(by humans or agents).

## Slots

| Element | Slot | Contract |
|---|---|---|
| `ki-tabs` | (default) | The `ki-tab` and `ki-tab-panel` children, as slotted children; document order is strip order and navigation order (S11: the order follows the writing direction). Malformed composition (orphans, duplicates, stray content) never breaks rendering (FR-014). |
| `ki-tab` | (default) | The tab label: accessible-name source (S7). Mandatory for valid usage. |
| `ki-tab` | `start` / `end` | Leading/trailing icons or media; positions follow the writing direction (FR-012). M3's stacked icon-above-label primary layout is a theme-layer presentation concern (spec assumption). |
| `ki-tab-panel` | (default) | Arbitrary panel content. Panels stay in the document while hidden — no lazy mounting (spec assumption). |

## Parts

| Element | Part | Contract |
|---|---|---|
| `ki-tabs` | `tablist` | The strip wrapper (gap and divider from `--ki-tabs-*`; carries the tablist role). |
| `ki-tab` | `tab` | The tab surface: padding, typography, per-state label inks. Second rung of the customization ladder. |
| `ki-tab` | `indicator` | The active-tab marker (`--ki-tab-indicator-*`), rendered only while the tab is selected; decorative (`aria-hidden`). |
| `ki-tab-panel` | `panel` | The panel surface (padding, background from `--ki-tab-panel-*`). |

## Events

One custom event, observed on `ki-tabs` (the orchestrator). Tabs are not
form-associated and no native `change` exists to pass through, so the
spec fixes a `ki-*` notification (FR-004; 011/012 batch convention):

| Event | Semantics |
|---|---|
| `ki-change` | `CustomEvent` — `bubbles: true`, `composed: true`, `detail: { value: string }` carrying the resolved selected value (S1). Fired exactly once per USER-DRIVEN selection change (pointer activation, arrow/Home/End navigation), after the group's state is current — a listener reads the new `value` from the group when the event is observed. Never fired for programmatic `value` assignment, first-render fallback or reconciliation (FR-004); never fired when the activation targets a disabled or duplicate tab (S2); re-selecting the selected tab fires nothing. Post-change notification, not cancelable. |

Keyboard (all group-owned, FR-005/FR-006 — automatic activation per the
APG): the strip is ONE tab stop — Tab enters on the selected tab and
leaves in a single step into the visible panel (S6), which is reachable
even with no focusable content (the panel itself receives focus, S15);
when no panel is visible, Tab proceeds to the next focusable element
after the strip. ArrowRight/ArrowLeft move through the tabs following the
writing direction (S4; inverted in RTL, S16), wrapping at the ends and
skipping disabled tabs (S13), and SELECT as they focus (automatic
activation, FR-005). Home/End jump to the first/last non-disabled tab
(S5, S14). A strip whose every tab is disabled contributes no tab stop
(S18). Not part of the v1 contract: ArrowUp/ArrowDown (horizontal-only
v1) and Enter/Space (redundant under automatic activation).

## CSS custom properties (component token layer)

The full vocabulary in
[data-model.md](../data-model.md#token-vocabulary-component-layer).
Guarantees:

- Every visual property of strip, tabs, indicator and panels — every
  selection × interaction state — resolves from `--ki-tabs-*` /
  `--ki-tab-*` / `--ki-tab-panel-*`; those resolve from the semantic
  layer (Art. VI, FR-009). Zero hardcoded visual values; the M3
  primary/secondary tab styles are THEME token decisions, never
  attributes.
- Interaction states (hover, focus-visible, active, disabled) are CSS
  states styled through tokens, never attributes/props (FR-010);
  `selected` is the only reflected managed state, and it is output-only.
- The indicator is pure CSS drawn from token inks (no SVG, no icon font).
  v1 ships zero transitions/animations — reduced motion is satisfied by
  construction (S17); any future motion must live inside
  `@media (prefers-reduced-motion: no-preference)` (FR-011).
- Focus is clearly visible in every theme via `--ki-tab-focus-ring-*`
  (tabs) and `--ki-tab-panel-focus-ring-*` (the focusable panel); each
  tab's pointer target is ≥ 24×24 px via `--ki-tab-min-block-size` +
  padding (Art. V).
- Layout uses logical properties only: strip order, `start`/`end` slots
  and the indicator follow the writing direction (S11, FR-012).
- Missing theme values fall back through the cascade to onmars defaults
  (001 contract). Switching the theme declaration restyles every state
  with zero markup changes (S9, S10).

## Agent-facing metadata (Art. I, carried as JSDoc → generated docs/catalog)

- **When to use**: switching between peer content views inside the same
  page context, where exactly one view is visible at a time and switching
  loses no data. Always with a group `label`, a slotted label per tab,
  and one `ki-tab-panel` per `ki-tab` sharing its `value`. Keep tab sets
  small enough to fit — overflow/scrolling is out of v1 scope.
- **When NOT to use**: choosing a value inside a form (use
  ki-radio-group, or a future segmented control); navigating between
  pages or routes (use links); sequential step-by-step flows (a future
  stepper); `ki-tab`/`ki-tab-panel` outside a `ki-tabs` (unsupported);
  authoring `selected` on a tab — it is output-only; set the group's
  `value` instead.

## Compatibility

First release of all three elements (pre-1.0 line); purely additive — no
existing API changes. Removing or renaming anything above after first
publish is MAJOR per Art. IX. The group→children coordination mechanism
(including the auto-assigned internal slot) is an implementation detail,
explicitly outside this contract. Deferred additive candidates recorded
by the spec: vertical orientation (attribute + APG vertical keyboard
mapping), a manual-activation opt-in, scrollable/overflowing strips, lazy
panel mounting, dynamic tab-set mutation with selection repair,
dismissible tabs and badge overlays, a per-state border column in the
`--ki-tab-*` matrix, and an indicator transition (with motion tokens,
gated behind reduced-motion).
