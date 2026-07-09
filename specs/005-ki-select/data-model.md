# Phase 1 Data Model: ki-select

No persistent data. The model is the composite's public state surface and
its token vocabulary. The normative API contract lives in
[contracts/select-contract.md](./contracts/select-contract.md); this file
models values, defaults and transitions for BOTH elements.

## Attribute model — `ki-select`

| Attribute | Values | Default | Reflected | Invalid/absent behavior |
|---|---|---|---|---|
| `label` | string | — | yes | a11y-required: names the combobox via native `<label for>` on the shadow trigger (S11, FR-002); rendered as visible text (`part="label"`) |
| `placeholder` | string | — | yes | rendered in the trigger's `value` part while no selection exists (S2, FR-003); no hardcoded strings — absent placeholder renders an empty value area |
| `name` | string | — | yes (host-level, FACE) | omitted → the select contributes no form entry |
| `value` | string | `""` (projection of "no selection") | **no** — the attribute is the initial declaration; the live property is a projection of the selection (FR-004; research D6) | a value matching no option — declared, assigned, or left dangling by roster mutation — falls back to no selection: placeholder shown, property reads `""` (S5, S25); with duplicates, resolution selects the FIRST match |
| `disabled` | boolean | `false` | yes | presence semantics (006 D2 normalizer); never opens, unreachable by Tab, exposed unavailable, no form entry; ancestor `fieldset[disabled]` identical via FACE (S3, S16); disabling while open closes without committing (edge) |
| `required` | boolean | `false` | yes | presence semantics; invalid exactly when the value it would submit is `""` — no selection OR selected empty-valued option (FR-009); message platform-sourced via the validity donor (research D7); `aria-invalid` appears only after a blocked submission (S14) |

## Attribute model — `ki-option`

| Attribute | Values | Default | Reflected | Invalid/absent behavior |
|---|---|---|---|---|
| `value` | string | its trimmed label text (native `<option>` parity, FR-002) | yes — the select's roster observer watches it (research D3) | duplicate values: first match wins on value→selection resolution; user commits are identity-tracked (007 D4) |
| `disabled` | boolean | `false` | **yes — the select's roster observer watches it** (research D3) | presence semantics; not selectable (S4), skipped by the keyboard highlight (S22), mirror row exposed `aria-disabled` (FR-008) |

`ki-option` has NO `selected` member of any kind (spec assumption — the
selection's single source of truth is ki-select's `value`) and NO
rendering of its own: it is a declarative data carrier, like a native
`<option>` — the select renders the mirror rows (research D1). Its label
is its text content; label or attribute mutations re-mirror silently.

## Selection & highlight model (two separate states — research D5/D6)

```text
                 reset baseline = the live `value` ATTRIBUTE
                 (declared initial selection, 003 D2 — read in
                 formResetCallback)
                          │
first render ─────────────┘ selection resolved from the value attribute:
     │                      first option whose value matches, or none
     │                      (S5 → placeholder)
     │
     ├─ user opens (trigger click / Enter / Space / arrows / Home / End)
     │     → open = true; highlightedIndex := selected option's index,
     │       else first enabled (S7, S23); Home/End variants land on
     │       first/last enabled (FR-007); aria-activedescendant set;
     │       row scrolled into view (instant)
     │
     ├─ user moves the highlight (Arrow Up/Down, Home, End)
     │     → highlightedIndex moves over ENABLED options only, NO wrap
     │       at either end (FR-007, S22, S10); selection UNCHANGED —
     │       highlight is visual focus, never commitment
     │
     ├─ user COMMITS (Enter/Space on highlight, click on enabled option)
     │     → selectedOption := that option (identity); trigger shows its
     │       label; aria-selected moves; setFormValue + validity update;
     │       popup closes; host dispatches composed input THEN change
     │       (S1, S8) — the ONLY event-dispatching path (FR-005)
     │     · committing the already-selected option closes silently
     │       (native parity)
     │
     ├─ user ABANDONS (Escape S9, Tab S21, outside pointerdown S20,
     │  focusout, trigger re-click, disable-while-open)
     │     → popup closes, highlight discarded, selection UNCHANGED,
     │       no events
     │
     ├─ page assigns select.value
     │     → first matching option selected (or none → placeholder);
     │       setFormValue + validity; NO events (FR-004, FR-005)
     │
     ├─ reconciliation (slotchange / roster attribute or label mutation,
     │  research D3) — always silent:
     │     · selected option removed → selection cleared, value "",
     │       placeholder, form value null, NO events (S25)
     │     · no selection + non-empty value + matching option inserted →
     │       selection re-resolved (first match)
     │     · label/value/disabled mutation → mirror rows re-render;
     │       open popup re-derives its highlight like opening
     │
     └─ form reset → selection re-resolved from getAttribute('value'),
                     silent (S15)
```

Invariants:

- at most one option selected at any time; `select.value` always equals
  the selected option's value, or `""` (FR-001, FR-004);
- the highlight exists only while open and is never the selection
  (committed only by D5's commit gestures);
- events report user commits only: composed `input` then `change`,
  synthesized from the HOST (no native control exists — research D6's
  owned deviation); programmatic assignment and reconciliation are silent
  by construction (FR-005).

## Internal state — `ki-select`

| State | Type | Set by | Consumed by |
|---|---|---|---|
| `roster` | `KiOption[]` (document order) | default-slot `slotchange` → `assignedElements()` filtered to `ki-option` (research D3) | mirror rendering, selection resolution, highlight navigation |
| `selectedOption` | element reference or `null` | user commit, programmatic `value` assignment, reconciliation, reset | value projection, trigger value span, `aria-selected`, `setFormValue`, validity |
| `open` | boolean | D5's open/close gestures | listbox `hidden`, `aria-expanded`, `aria-activedescendant` presence, outside-pointerdown listener lifecycle |
| `highlightedIndex` | number (meaningful while open) | opening rules, Arrow/Home/End moves | highlight row state, `aria-activedescendant`, scroll-into-view |
| `formDisabled` | boolean | `formDisabledCallback` (`fieldset[disabled]` ancestry) | effective disabled = `disabled \|\| formDisabled` → trigger `disabled`, close-if-open, FACE exclusion (S3, S16) |
| `userInvalid` | boolean (plain internal — no custom state in v1, research D7) | host `invalid` event (blocked submission, S14); cleared when valid or on reset | `aria-invalid` on the trigger |
| roster observer | `MutationObserver` (`value`/`disabled` attributes + label subtree) | roster changes | mirror fidelity + S25/S5 reconciliation (research D3) |
| validity donor | hidden native `<select required>` (shadow-internal, static) | — | platform-localized `valueMissing` mirrored while `required && submittedValue === ""` (research D7) |

## Keyboard model (FR-007, research D5)

| Context | Key | Outcome |
|---|---|---|
| closed | Enter / Space | open (native button click path); highlight = selected, else first enabled (S23) |
| closed | Arrow Down / Arrow Up | open; highlight = selected, else first enabled (S7, S23) |
| closed | Home / End | open; highlight = first / last enabled (FR-007, no S-ID — unit-covered) |
| open | Arrow Down / Arrow Up | move highlight over enabled options, no wrap (S22; FR-007) |
| open | Home / End | highlight first / last enabled (S10) |
| open | Enter / Space | commit + close (S8); keydown `preventDefault()` suppresses native button re-toggle |
| open | Escape | close, discard (S9) |
| open | Tab | close, discard, focus moves on (S21 — spec default reading, gate-1 pending) |
| any | printable characters | NOTHING — typeahead excluded in v1 (charter; FR-007 exception, gate-1 open question) |
| any | Alt+Arrows, PageUp/PageDown | NOTHING — APG-optional, not in the approved contract (Art. II) |

Pointer: trigger click toggles; enabled-option click commits + closes;
disabled-option click is a no-op (S4); pointerdown outside closes
discarding (S20); focus leaving the component closes discarding.

## State model (CSS states, never attributes/props for interaction — FR-012)

Inks swap via the `--_ki-select-*` / `--_ki-option-*` indirection (002
pattern); all selectors shadow-internal:

| Axis | State | Selector | Token segment |
|---|---|---|---|
| trigger | rest | base | `-rest-` |
| trigger | hover | `button:hover` | `-hover-` |
| trigger | focus | `button:focus-visible` | `-focus-` + `focus-ring-*` |
| trigger | disabled | `button:disabled` | `-disabled-` |
| trigger | open | `[aria-expanded='true']` | (theme hook; no dedicated ink family — open styling composes from focus/rest tokens) |
| option row | rest | base | `--ki-option-rest-*` |
| option row | hover | `[role='option']:hover` | `--ki-option-hover-*` |
| option row | highlight | the `aria-activedescendant` target row | `--ki-option-highlight-*` |
| option row | selected | `[aria-selected='true']` | `--ki-option-selected-*` |
| option row | disabled | `[aria-disabled='true']` | `--ki-option-disabled-*` |

No invalid visual state in v1: S14's "reported invalid" is constraint
validation + `aria-invalid` on the trigger, deliberately without a custom
state or invalid ink tokens (research D7 — additive later, 007
precedent). Any theme-added open/close motion renders only under
`@media (prefers-reduced-motion: no-preference)` (FR-015).

## Form participation model (ElementInternals on ki-select only, 002/003 pattern)

| Interaction | Mechanism | Outcome |
|---|---|---|
| submit, option selected | `setFormValue(selected value)` under host `name` — including `""` for an empty-valued option (placeholder-option parity, FR-009) | `name=value` in FormData (S13) |
| submit, no selection | `setFormValue(null)` | no entry (S24) |
| required, submitted value `""` | mirror `setValidity(donor.validity, donor.validationMessage, trigger)` from the hidden native select donor — platform-computed `valueMissing`, platform-localized message (research D7) | submission blocked, select reported invalid (S14); `aria-invalid` on the trigger after the blocked attempt |
| reset | `formResetCallback` → selection re-resolved from `getAttribute('value') ?? ''` (first match), silent (003 D2) | S15 |
| disabled select / disabled fieldset | native button disabled + FACE machinery + `formDisabledCallback` | never opens, no entry, exposed unavailable (S3, S16) |

Events: no custom events. Composed `input` then composed `change`,
synthesized from the host on user commits ONLY (S1; research D6).

## Token vocabulary (component layer)

```text
--ki-select-{height|min-target|padding-inline|gap|radius|font-size|indicator-size}
--ki-select-border-width
--ki-select-border-{block-start|block-end|inline-start|inline-end}-width   # default: {ki.select.border-width}
--ki-select-label-{gap|font-size|font-weight|line-height}
--ki-select-{rest|hover|focus|disabled}-{bg|fg|border|label-fg}
--ki-select-placeholder-fg
--ki-select-listbox-{bg|radius|elevation|padding|max-block-size|offset}
--ki-select-focus-ring-{color|width|offset}
--ki-option-{min-target|padding-inline|radius|font-size}
--ki-option-{rest|hover|highlight|selected|disabled}-{bg|fg}
```

- trigger structure: 12 (incl. per-logical-side border widths — 003 D8's
  mechanism so both M3 enclosures are token-expressible) + label 4 +
  indicator size folded into structure;
- trigger ink matrix: 4 × 4 = 16 (per-state `label-fg` per 003 D8's
  M3-label argument); placeholder 1;
- listbox surface: 6 (`bg` from `ki.surface.s*`, `elevation` from
  `ki.elevation.*` — the spec's popup-from-surface-roles mapping);
- focus ring: 3; → `--ki-select-*` = 42 (with `height` and `min-target`
  counted in structure);
- option structure 4 + option ink pairs 5 × 2 = 10; → `--ki-option-*` =
  14;
- = 56 tokens per theme; every value references the 001 semantic layer;
  material3 overrides live in `select.material3.tokens.json` +
  `option.material3.tokens.json`; the `-bg`-as-backdrop convention
  (007/008) applies — option `-bg` cells resolve opaque over the listbox
  surface, never `transparent`, keeping the sweep measurable.
- Contrast gate sweeps trigger `{rest|hover|focus}` fg/bg, placeholder on
  rest-bg, label-fg on the page surface, and option
  `{rest|hover|highlight|selected}` fg/bg — all TEXT pairs at the
  existing 4.5:1 minimum; disabled cells exempt; per-pattern zero-match
  guards (research D8).

## Slots & parts

| Element | Surface | Name | Purpose |
|---|---|---|---|
| ki-select | slot | (default) | The `ki-option` children — DATA, never painted (hidden container; research D1). Document order = list order. |
| ki-select | part | `trigger` | The combobox button (enclosure, states, focus ring). |
| ki-select | part | `label` | The rendered visible label (accessible-name source via native `for`/`id`, S11). |
| ki-select | part | `value` | The displayed selection or placeholder inside the trigger. |
| ki-select | part | `indicator` | The component-rendered dropdown indicator (token-drawn, `aria-hidden`). |
| ki-select | part | `listbox` | The popup surface (background, elevation, radius, padding, max size). |
| ki-select | part | `option` | Each MIRROR option row (`role="option"`) — hosted in ki-select's shadow by the D1 architecture, addressed as `ki-select::part(option)`; deviation from FR-013's letter flagged at gate 1 (plan.md Complexity Tracking). |
| ki-option | slot | (default) | The option label (text content in v1) AND default `value` fallback. Never rendered by ki-option itself — mirrored by the select. |

No named slots in v1. Customization ladder: tokens →
`::part(trigger|label|value|indicator|listbox|option)` → option label
content.
