# Phase 1 Data Model: ki-dialog

No persistent data. The model is the component's public state surface, its
open/close lifecycle, its focus contract and its token vocabulary. The
normative API contract lives in
[contracts/dialog-contract.md](./contracts/dialog-contract.md); this file
models values, defaults and transitions.

## Attribute / method model

| Surface | Values | Default | Reflected | Invalid/absent behavior |
|---|---|---|---|---|
| `open` | boolean (presence) | `false` (closed) | **yes** — reflected live state; every close path removes it (FR-001) | absent → closed. Present in initial markup → the dialog opens modally on load (focus enters per FR-005; the recorded previously-focused element is the body, so close falls back to the body — Edge Cases). The internal native `<dialog>` NEVER carries its own `open` content attribute (research D1: that would render non-modally) |
| `heading` | string | — (no heading) | yes (string attribute) | absent OR empty string → no `<h2>` rendered, no `aria-labelledby` set, dialog has NO accessible name — documented invalid usage in the catalog (FR-008, Edge Cases), never a crash |
| `close-on-backdrop` | boolean (presence) | `false` | yes | absent → backdrop clicks never close (S3). Present — including `close-on-backdrop="false"` (HTML boolean semantics, Edge Cases) → backdrop click closes with reason `backdrop` (S4); catalog tells agents to omit the attribute rather than set `"false"` |
| `show()` | `Promise<void>` (Stencil `@Method`) | — | — | same observable result as adding `open`; no-op while already open — no state change, no event (FR-002) |
| `close()` | `Promise<void>` (Stencil `@Method`) | — | — | same observable result as removing `open`; reports reason `method`; no-op while already closed (FR-002, S15) |

No `variant`, `tone`, `size`, full-screen mode, built-in close button,
`label` strings, cancelable before-close event or dedicated form coupling —
the spec's Assumptions exclude each explicitly (Art. VII; all recorded as
possible additive changes post-v1).

## Open/close lifecycle (FR-001..003, FR-006..007, research D1/D4)

```text
   closed (default: no open attribute; internal dialog not in top layer)
        │
        ├─ page adds `open` / calls show()  [no-op if already open]
        │     1. internal dialog.showModal() — top layer, ::backdrop,
        │        background inert; platform stores the previously
        │        focused element (= the invoker)
        │     2. entry assist: resolveEntryFocusTarget(host) —
        │        slotted [autofocus] → first focusable → null (native
        │        keeps the dialog surface focused)                (D2)
        ▼
   open (host reflects `open`; page behind inert for pointer/keyboard/AT)
        │
        ├─ Escape (always on, FR-006)
        │     internal `cancel` (never prevented) → pendingReason = 'escape'
        │     → platform closes the dialog
        ├─ backdrop click WITH close-on-backdrop (D4)
        │     pointerdown outside rect arms → click outside rect →
        │     pendingReason = 'backdrop' → internal close()
        ├─ backdrop click WITHOUT opt-in → nothing (stays open, S3)
        ├─ close() / page removes `open`  [no-op if already closed]
        │     pendingReason stays 'method' → internal close()
        ▼
   closing (single internal `close` event per closing — platform-fired)
        1. platform restores focus to the previously focused element
           (only if focus is inside the dialog; without scrolling);
           invoker gone or never existed → document body (D3, SC-003)
        2. handler syncs this.open = false (guarded no-op) — attribute
           removed (FR-001)
        3. exactly ONE ki-close dispatched
           (bubbles, composed, cancelable: false,
            detail: { reason: 'method' | 'escape' | 'backdrop' })
        4. pendingReason resets to 'method'
        ▼
   closed
```

Invariants:

- exactly one `ki-close` per close, whatever the path (S15) — one internal
  `close` event per closing, one dispatch site;
- no `ki-close` on redundant calls (`show()` while open, `close()` while
  closed — FR-002) and none when the host is removed from the document
  while open (top-layer teardown is not a close; platform behavior);
- Escape always closes — the `cancel` event is never prevented (FR-006);
- `ki-close` is a post-close notification: when it fires, the dialog is
  closed and focus has already returned (native `close` fires from a queued
  task after the close steps) — not cancelable (spec Assumptions);
- the component never moves focus on close: the platform restore is the
  only mechanism (research D3 — single source of truth).

## Focus model (FR-005, research D2/D3)

| Moment | Behavior | Source |
|---|---|---|
| open — entry | slotted `[autofocus]` → first focusable slotted element (composed order) → dialog surface (with visible ring from `--ki-dialog-focus-ring-*`) | native dialog focusing steps + deterministic entry assist (D2) |
| while open | focus cannot reach the page behind: everything outside the dialog is inert (Tab, Shift+Tab, pointer, AT) | native modal inertness — zero trap code (S7) |
| close — return | invoker (the element focused when the dialog opened) → if gone/unfocusable or never recorded: document body, without scrolling | native previously-focused-element restore (D3; S8, SC-003) |
| close with focus outside the dialog | focus untouched (never stolen) | native restore condition |

## Assistive-technology exposure (FR-004, FR-008)

- role `dialog` + modal state: exposed by the native element — no
  hand-written `role`/`aria-modal` anywhere (S9);
- accessible name: `aria-labelledby` → the shadow `<h2 part="heading">`,
  same-root ID reference (S9); no heading → no name (documented invalid);
- while open, the page behind leaves the accessibility tree entirely —
  native modal inertness (S10);
- the component ships no interactive controls of its own: the only shadow
  element that can take focus is the dialog surface (fallback case).

## Internal state

| State | Type | Set by | Consumed by |
|---|---|---|---|
| `pendingReason` | `'method' \| 'escape' \| 'backdrop'` (default `'method'`) | `cancel` listener (escape); backdrop click handler (backdrop) | the internal `close` handler → `ki-close.detail.reason`; reset after dispatch |
| `backdropArmed` | boolean | `pointerdown` on the internal dialog (outside rect = arm, inside = disarm) | the backdrop `click` handler (D4 — kills the press-inside-drag-out misfire) |
| `footerHasContent` | boolean | `slotchange` on the `footer` slot (+ initial check) | render/CSS — collapses `part="footer"` when empty (research D6, 009 D1 pattern) |

## State model (CSS states, never attributes/props for interaction)

| State | Selector | Token segment |
|---|---|---|
| surface | `dialog[part='dialog']` | `bg`, `fg`, `border` (shorthand), `shadow`, `radius`, `padding`, `min-width`/`max-width` |
| backdrop | `dialog::backdrop` | `backdrop-bg` (NOT a part — research D7) |
| heading | `[part='heading']` | `heading-{font-size\|font-weight\|line-height}` |
| regions | column flow, `gap`; footer row aligned to `inline-end` | `gap` |
| body overflow | `[part='body']` block-axis scroll | — (FR-015) |
| dialog-surface focus | `dialog:focus-visible` | `focus-ring-{color\|width\|offset}` |
| entrance motion | `dialog[open]` + `::backdrop` via `@starting-style`, inside `@media (prefers-reduced-motion: no-preference)` | `motion-{duration\|easing}` (D8) |
| footer empty | `display: none` on `[part='footer']` | — (no phantom gap) |

Layout uses logical properties only; footer action order/alignment follow
the writing direction by construction (S13, FR-014). Under reduced motion
no transition declaration exists at all (S14, FR-011).

## Event model

| Event | Type | Timing | Contract |
|---|---|---|---|
| `ki-close` | `CustomEvent<{ reason: 'method' \| 'escape' \| 'backdrop' }>` — `bubbles: true`, `composed: true`, `cancelable: false` | after the dialog has closed and focus has returned | exactly one per close, every path (S2, S4, S8, S15); `method` = `close()` or `open` removal (incl. footer actions wired to `close()`, FR-009); `escape` = close request; `backdrop` = opt-in backdrop click. Not cancelable; a cancelable before-close event is a recorded additive candidate (spec Assumptions) |

No other events. The component listens only to the internal dialog's
`cancel`/`close` (neither bubbles — listened directly) and the D4
pointer events on the internal dialog.

## Token vocabulary (component layer — 18 per theme)

```text
--ki-dialog-{radius|padding|gap|min-width|max-width}
--ki-dialog-{bg|fg|border|shadow}
--ki-dialog-backdrop-bg
--ki-dialog-heading-{font-size|font-weight|line-height}
--ki-dialog-focus-ring-{color|width|offset}
--ki-dialog-motion-{duration|easing}
```

- structure: 5 — geometry from `ki.radius.*`/`ki.space.*`; width bounds are
  the per-theme expression of M3's min/max constraints (no `size`
  attribute, spec Assumptions);
- color: 4 — `bg` from the 001 surface ramp (raised step; exact step chosen
  under the extended sweep), `fg` from `ki.text.*`, `border` a full border
  shorthand value (color from `ki.outline.*`; material3 assigns `none` —
  research D9), `shadow` a composed box-shadow referencing
  `ki.elevation.*` (002/009 precedent);
- backdrop: 1 — references the 001 semantic `ki.overlay.*` family (first
  component consumer; dark scheme via overlay-inverse) — the first themed
  overlay surface;
- heading typography: 3 — semantic typography scale;
- focus ring: 3 — charter's exact shape, 002 convention; exercised when the
  dialog surface itself takes focus;
- motion: 2 — LITERAL component-layer values (no motion layer exists in
  001 — research D8's declared deviation; onmars `0ms`, material3 M3
  entrance values); consumed by the entrance transition, suppressed under
  `prefers-reduced-motion`;
- flat naming is the spec's justified deviation from the charter shape (no
  size/variant/tone axes and no interactive states of its own);
- gate note: `--ki-dialog-fg` on `--ki-dialog-bg` feeds the extended
  contrast sweep at 4.5:1 (text) and `--ki-dialog-focus-ring-color` on
  `--ki-dialog-bg` at 3:1 (non-text, WCAG 1.4.11); the backdrop is not
  swept (no text or control is drawn on it — research D9).

## Slots & parts

| Surface | Name | Purpose |
|---|---|---|
| slot | default | the dialog body (message, brief critical input, a hero icon if the design wants one — spec anatomy row); scrolls inside the dialog when taller than the viewport (FR-015) |
| slot | `footer` | the actions row, end-aligned, following the writing direction; slotted actions never close the dialog by themselves — the application wires them to `close()` (FR-009); collapses when empty |
| part | `dialog` | the dialog surface (bg/fg, border, shadow, radius, padding, width bounds; focus ring in the surface-fallback case) |
| part | `heading` | the `<h2>` title (rendered only when `heading` is non-empty); names the dialog via same-root `aria-labelledby` |
| part | `body` | wrapper around the default slot; the scroll container |
| part | `footer` | wrapper around the `footer` slot; the end-aligned actions row |

The backdrop is NOT a part (pseudo-element — unreachable by `::part()`;
styled through `--ki-dialog-backdrop-bg` only, research D7). The ladder is
tokens → these four parts → the two slots.
