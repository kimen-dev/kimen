# Phase 1 Data Model: ki-tabs

No persistent data. The model is the composite's public state surface and
its token vocabulary. The normative API contract lives in
[contracts/tabs-contract.md](./contracts/tabs-contract.md); this file
models values, defaults and transitions for ALL THREE elements.

## Attribute model — `ki-tabs`

| Attribute | Values | Default | Reflected | Invalid/absent behavior |
|---|---|---|---|---|
| `value` | string | `""` (projection of "no selection") | **no** — the attribute is the initial declaration; the live property is the RESOLVED selection (FR-002; research D4) | a value matching no tab, matching a disabled tab, or absent → resolution falls back to the first non-disabled owner tab (S3, S12); every tab disabled → no selection, no visible panel, no tab stop (S18); programmatic writes re-run the same resolution, silently |
| `label` | string | — | yes | names the tablist via `aria-label` on the shadow wrapper, only when provided (S7, FR-008); an unlabeled strip has no accessible name (documented guidance: always label) |

## Attribute model — `ki-tab`

| Attribute | Values | Default | Reflected | Invalid/absent behavior |
|---|---|---|---|---|
| `value` | string | `""` (effective when unset) | yes | the pairing identifier (FR-001); the FIRST tab in document order bearing a value owns it — later duplicates render but are never selectable (FR-014, research D3); an unset value participates as `""` under the same rules (documented misuse, never fatal) |
| `disabled` | boolean | `false` | **yes — the group's MutationObserver watches this attribute** (research D3) | not selectable by any modality (S2), skipped by arrows and fallback (S12, S13), `tabindex="-1"` always, exposed unavailable via `internals.ariaDisabled` (FR-007); presence semantics (`disabled="false"` still disables — 006 D2 normalizer) |
| `selected` | boolean | `false` | **yes — OUTPUT-ONLY** | written exclusively by the group's resolution; any author-set `selected` is ignored and overwritten on first render (FR-003); drives `:host([selected])` styling, the indicator, and `internals.ariaSelected` |

## Attribute model — `ki-tab-panel`

| Attribute | Values | Default | Reflected | Invalid/absent behavior |
|---|---|---|---|---|
| `value` | string | `""` (effective when unset) | yes | pairs the panel to the tab bearing the same value (first-in-document-order owns it); an orphan or duplicate panel stays `hidden` and never breaks rendering (FR-014) |

Group-managed attributes on the child hosts — component OUTPUT, never
authored (research D1/D2): `slot="tab"` (ki-tab auto-assignment into the
shadow tablist), `id` (generated only when absent), `aria-controls` (tab →
paired panel), `aria-labelledby` (panel → paired tab), `tabindex` (roving
on tabs; `0` on the visible panel), `hidden` (every non-selected panel).

## Selection model (group-owned resolution; `value` is the resolved projection)

```text
first render / slotchange / disabled mutation / programmatic value write
     │
     ▼
resolveSelection(roster, requestedValue)   — pure, research D4:
     1. requested value owned by a non-disabled tab  → that tab
     2. else first non-disabled owner tab (doc order) → fallback (S3, S12)
     3. else (all disabled / no tabs)                 → none (S18)
     │
     ▼
stamps (idempotent, silent):
     · `selected` present on the resolved tab only (author-set selected
       overwritten — FR-003)
     · roving tabindex: resolved tab 0, all others −1 (none when no
       selection — S18)
     · `hidden` on every panel except the resolved tab's paired panel
       (orphan selection → all panels hidden; at most one visible, FR-004)
     · pairing wires: ids + aria-controls/aria-labelledby (research D2)
     │
     ├─ user selects a tab (pointer click, or arrow/Home/End navigation —
     │  automatic activation, one code path, research D6)
     │      → resolution stamps as above, focus moves to the tab host
     │      → ki-change dispatched from the group host
     │        (bubbles, composed, detail.value — S1)
     │        · exactly one per selection change
     │        · re-selecting the selected tab: no state change, no event
     │        · disabled/duplicate tab: ignored, no event (S2)
     │
     ├─ page assigns tabs.value
     │      → same resolution + stamps, NO ki-change (FR-004, assumption:
     │        native change parity)
     │
     └─ reconciliation (slotchange / disabled mutation) — always silent:
            · selected tab becomes disabled → resolution re-runs, falls
              back per rule 2
            · malformed content (orphans, duplicates, strays) → inert,
              never fatal (FR-014)
```

Invariants:

- at most one `ki-tab` carries `selected` at any time; `tabs.value` always
  equals the selected tab's value, or `""` (FR-002/FR-003, SC-001);
- at most one panel is visible at any time — exactly one whenever the
  selected tab has a paired panel (FR-004, SC-001);
- `ki-change` reports user actions only; resolution, programmatic writes
  and reconciliation are silent by construction (FR-004; research D5);
- duplicates are unselectable, orphans are inert: a duplicate tab is never
  selected, a duplicate/orphan panel is never visible (FR-014).

## Internal state — `ki-tabs`

| State | Type | Set by | Consumed by |
|---|---|---|---|
| `tabRoster` | `KiTab[]` (document order) | named-slot `slotchange` (after auto-assignment from the default-slot intake — research D3) | pairing, resolution, roving, arrow navigation |
| `panelRoster` | `KiTabPanel[]` (document order) | default-slot `slotchange`, filtered to `ki-tab-panel` | pairing, `hidden` stamping |
| `pairing` | value → {tab?, panel?} map | rebuilt on every roster change (first-in-document-order owns a value — research D3) | resolution, ARIA wiring, panel visibility |
| `selectedTab` | element reference or `null` | `resolveSelection` output (research D4) | `value` projection, stamps, `ki-change` payload |
| disabled observer | `MutationObserver` on tab hosts' `disabled` | roster changes | re-resolution + roving recompute (S12-class repair) |

## Roving tabindex model (FR-006, research D6)

| Group state | Tab stop (`tabindex="0"` on that tab HOST; all others `-1`) |
|---|---|
| a tab is selected | the selected tab (automatic activation makes "selected" and "tab stop" coincide) |
| every tab disabled (no selection) | none — the strip is skipped by Tab (S18) |
| disabled or duplicate tab | always `-1`, in every state |

Keyboard (group-level `keydown` on the host, `preventDefault()`):
ArrowRight/ArrowLeft = next/previous in LTR, previous/next in RTL,
resolved per event via `host.matches(':dir(rtl)')` (S4, S16); target =
adjacent SELECTABLE tab (non-disabled owner) with wrap at both ends (S13);
Home/End = first/last selectable tab (S5, S14). Navigation executes
`select(target); target.focus()` — automatic activation: selection follows
focus through the same path as pointer activation (one code path,
research D6). Tab from the strip lands on the visible panel, whose host
carries group-stamped `tabindex="0"` (S6) — including when it has no
focusable content (S15); with no visible panel, no panel is focusable and
Tab proceeds natively (edge case). NOT in the v1 contract (Art. II):
ArrowUp/ArrowDown (horizontal-only v1), Enter/Space (redundant under
automatic activation).

## State model (CSS states, never attributes/props for interaction — FR-010)

Inks swap via the `--_ki-tab-*` indirection (002 pattern):

| Axis | State | Selector | Token segment |
|---|---|---|---|
| selection | unselected | base | `unselected-*` |
| selection | selected | `:host([selected])` (the one reflected managed state, FR-003/FR-010) | `selected-*` |
| interaction | rest | base | `-rest-` |
| interaction | hover | `:host(:hover)` | `-hover-` |
| interaction | active | `:host(:active)` | `-active-` |
| interaction | disabled | `:host([disabled])` | `-disabled-` |
| focus | focus-visible | `:host(:focus-visible)` (tab) / `:host(:focus-visible)` (panel) | `focus-ring-*` / `panel-focus-ring-*` |
| indicator | selected only | `:host([selected]) [part='indicator']` | `indicator-*` |

Zero transitions/animations in v1 (research D10, 013 D6 posture): the
indicator is per-tab (no cross-tab slide), panel switching is instant —
reduced motion satisfied by construction and measured under emulation
(S17). Any future motion must live inside
`@media (prefers-reduced-motion: no-preference)` (FR-011).

## Accessibility wiring model (all co-tree, research D1/D2)

| Surface | Element | Mechanism |
|---|---|---|
| `tablist` role + name | shadow wrapper in ki-tabs (`part="tablist"`) | `role="tablist"` + `aria-label={label}` when provided (S7) |
| tablist owns the tabs (and nothing else) | named `slot="tab"` inside the wrapper | group auto-assigns ki-tab children (research D1) |
| `tab` role | ki-tab HOST | `internals.role = 'tab'` (016 D1) |
| selected exposure | ki-tab | `internals.ariaSelected` derived from the reflected `selected` (S7) |
| unavailable exposure | ki-tab | `internals.ariaDisabled` from `disabled` (S2, FR-007) |
| tab accessible name | ki-tab | name-from-content through the flattened tree (slotted label, S7) |
| `tabpanel` role | ki-tab-panel HOST | `internals.role = 'tabpanel'` |
| panel name | ki-tab-panel | `aria-labelledby` → paired tab host id (S8) |
| tab → panel | ki-tab | `aria-controls` → paired panel host id (APG) |
| panel visibility | ki-tab-panel | native `hidden` (group-stamped) + `:host([hidden]) { display: none !important; }` guard (research D7) |
| panel reachability | ki-tab-panel | group-stamped `tabindex="0"` on the visible panel (S6, S15) |

## Token vocabulary (component layer)

```text
--ki-tabs-{gap|divider-width|divider-color}
--ki-tab-{min-block-size|padding-inline|gap|radius|font-size|font-weight|line-height}
--ki-tab-{selected|unselected}-{rest|hover|active|disabled}-{fg|bg}
--ki-tab-indicator-{size|color|radius}
--ki-tab-focus-ring-{color|width|offset}
--ki-tab-panel-{padding-block|padding-inline|bg}
--ki-tab-panel-focus-ring-{color|width|offset}
```

- strip structure: 3; tab structure: 7 (single scale — no size axis, spec
  assumption); tab ink matrix: 2 × 4 × 2 = 16 (`fg` = label text ink,
  `-bg` names the effective backdrop — 007/008 convention); indicator: 3
  (pure CSS bar, no SVG); tab focus ring: 3; panel: 6 (padding + one
  semantic-surface bg + focus ring);
- = 38 tokens per theme; every value references the 001 semantic layer;
  material3 overrides the tab ink matrix + indicator in
  `tab.material3.tokens.json` (M3 primary-tab mapping); the strip and
  panel files have no material3 override (structure and semantic surface
  references inherit — research D8; the M3 primary/secondary distinction
  is expressed entirely in these cells, never as an attribute, FR-009).
- Contrast gate sweeps the `{selected|unselected}-{rest|hover|active}`
  fg-on-bg label pairs at the 4.5:1 TEXT minimum plus the
  indicator-on-selected-bg pair at the 3:1 non-text minimum (WCAG 1.4.11,
  008 D8 mechanism); disabled cells exempt; `--ki-tab-panel-bg` excluded
  (no component-owned text ink; constrained to a semantic surface
  reference — research D8).

## Slots & parts

| Element | Surface | Name | Purpose |
|---|---|---|---|
| ki-tabs | slot | (default) | The `ki-tab` and `ki-tab-panel` children (document order = strip order = navigation order). Children are valid only inside a group. Internally the group auto-assigns tabs to a private named slot — managed output, not authoring surface (research D1). |
| ki-tabs | part | `tablist` | The strip wrapper (gap, divider; carries the tablist role). |
| ki-tab | slot | (default) | The tab label: accessible-name source (S7). Mandatory for valid usage. |
| ki-tab | slot | `start` / `end` | Leading/trailing icons or media; order follows the writing direction (S11, logical properties). |
| ki-tab | part | `tab` | The tab surface (padding, typography, per-state inks). |
| ki-tab | part | `indicator` | The active-tab marker (size, color, radius); rendered only while `selected`. |
| ki-tab-panel | slot | (default) | Arbitrary panel content; stays in the document while hidden (no lazy mounting — spec assumption). |
| ki-tab-panel | part | `panel` | The panel surface (padding, background, focus ring). |

Customization ladder: tokens → `::part(tablist)` / `::part(tab)` /
`::part(indicator)` / `::part(panel)` → slotted content.
