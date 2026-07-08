# Public contract: `<ki-dialog>`

The behavior contract is `specs/012-ki-dialog/feature.feature` (S1–S15).
This document freezes the public API surface the scenarios observe. Any
deviation discovered during implementation re-enters through the spec, not
through code (Art. II).

## Element

`<ki-dialog>` — modal dialog (modal only in v1; the full-screen dialog is a
deferred additive variant). Not form-associated: forms compose inside its
slots and keep their native behavior untouched. Registered by
`@kimen/elements`; per-component export `dist/components/ki-dialog.js`
(tree-shakable custom element build). Built on the native `<dialog>` +
`showModal()` inside the shadow root (research D1): top layer, backdrop,
background inertness, Escape and focus restore are platform behavior, not
component code.

## Attributes / properties

TypeScript exposes them as typed properties with complete JSDoc (Art. I: an
undocumented member is a build failure). All reflect.

| Attribute | Type | Default | Contract |
|---|---|---|---|
| `open` | `boolean` | `false` | Reflected live state (FR-001): present shows the dialog modally (page behind inert — S1), absent hides it; every close path removes it. May be declared in initial markup (opens on load; close then falls back to the body — Edge Cases). Setting/removing it is observably identical to `show()`/`close()`. |
| `heading` | `string` | — | The dialog title, rendered as an `<h2>` in the `heading` part and wired as the accessible name via same-root `aria-labelledby` (S9, FR-008). A heading is expected on every dialog; absent/empty renders no title and leaves the dialog UNNAMED — documented invalid usage (APG requires a name), never a crash. No `heading-level` attribute in v1 (recorded additive candidate). |
| `close-on-backdrop` | `boolean` | `false` | Opt-in backdrop dismissal (FR-007). Absent: backdrop clicks never close (S3 — a stray click must not destroy a critical confirmation). Present: a completed click on the backdrop closes with reason `backdrop` (S4). HTML boolean semantics: `close-on-backdrop="false"` still opts in — omit the attribute instead (Edge Cases; catalog guidance for agents). |

No `variant`, `tone`, `size`, full-screen mode, built-in close ("X")
button, default user-visible strings, auto-close timer or dialog–form
coupling in v1 (spec Assumptions, Art. VII). Deferred additive candidates
recorded by the spec: full-screen variant, cancelable before-close event,
heading-level attribute, emphasis/intent axis, exit motion.

## Methods

| Method | Contract |
|---|---|
| `show(): Promise<void>` | Opens the dialog modally; observably identical to adding `open`. No-op while already open — no state change, no event (FR-002). |
| `close(): Promise<void>` | Closes the dialog; observably identical to removing `open`; the resulting `ki-close` reports `reason: 'method'`. No-op while already closed (FR-002, S15). Footer actions never close the dialog by themselves — the application wires them to this method (FR-009). |

## Slots

| Slot | Contract |
|---|---|
| default | The dialog body: the message, brief critical input, or a composed hero icon (spec anatomy). When taller than the viewport, the body region scrolls INSIDE the dialog; the dialog itself never exceeds the viewport (FR-015). |
| `footer` | The actions row, aligned to the end of the writing direction (RTL mirrors by construction — S13). Slotted actions do NOT close the dialog by themselves: wire each one to `close()` (FR-009). An empty footer collapses completely (no phantom spacing). Named `footer` for batch consistency with ki-card (spec Assumptions). |

## Parts

| Part | Contract |
|---|---|
| `dialog` | The dialog surface: background/ink, border, elevation, radius, padding, width bounds. Carries the visible focus ring when the surface itself takes focus (no focusable content — FR-005). First restyling hook after tokens. |
| `heading` | The `<h2>` title (rendered only when `heading` is non-empty). Source of the accessible name. |
| `body` | Wrapper around the default slot; the scroll container (FR-015). |
| `footer` | Wrapper around the `footer` slot; the end-aligned actions row. |

The backdrop is NOT a part: it is a `::backdrop` pseudo-element, which
`::part()` cannot address; its single customization surface is the
`--ki-dialog-backdrop-bg` token (research D7). Exactly these four parts
(spec API delta).

## Events

| Event | Semantics |
|---|---|
| `ki-close` | `CustomEvent<{ reason: 'method' \| 'escape' \| 'backdrop' }>` — `bubbles: true`, `composed: true`, `cancelable: false`. Dispatched exactly once per close, whatever the path (S2, S4, S8, S15): `method` for `close()`/`open` removal (including footer actions wired per FR-009), `escape` for the Escape close request, `backdrop` for the opt-in backdrop click. Post-close notification: when it fires the dialog is closed and focus has already returned to the invoker. Never fired for redundant `show()`/`close()` calls. Not cancelable in v1; a cancelable before-close event (dirty-form veto) is a recorded additive candidate. |

## Keyboard

- **Escape** closes the dialog — always on, never opt-out (FR-006, S8).
- **Tab / Shift+Tab** move focus only within the dialog while it is open:
  the page behind is natively inert, so focus can never reach it (S7) —
  zero focus-trap code.
- The component defines no other key handling; slotted controls keep their
  native behavior.

## Focus contract (FR-005)

- On open, focus moves into the dialog: slotted `autofocus` element → first
  focusable slotted element → the dialog surface itself (visible ring from
  `--ki-dialog-focus-ring-*`; Escape still works). In destructive
  confirmations, place `autofocus` on the least destructive action (APG
  guidance, carried in the catalog metadata).
- On close, focus returns to the invoking element (the element focused when
  the dialog opened) in 100% of close paths; when no invoker was recorded
  or it is gone/unfocusable, focus moves to the document body without
  scrolling — the documented fallback that fulfills SC-003. The mechanism
  is the native previously-focused-element restore; the component tracks
  nothing itself (research D3).

## Assistive-technology exposure

- Role `dialog` and modal state come from the native element — the
  component writes no `role`/`aria-modal` (S9).
- The accessible name is the `heading` text via same-root
  `aria-labelledby` (S9); a heading-less dialog is unnamed (documented
  invalid usage).
- While open, everything outside the dialog leaves the accessibility tree —
  native modal inertness (S10, SC-002).

## CSS custom properties (component token layer)

The full vocabulary (18 tokens per theme) in
[data-model.md](../data-model.md#token-vocabulary-component-layer--18-per-theme).
Guarantees:

- Every visual property — surface, backdrop, border, elevation, radius,
  padding, gap, width bounds, heading typography, focus ring, motion —
  resolves from `--ki-dialog-*` (FR-010); both shipped themes (onmars,
  material3) resolve the full set. The M3 look (surface-container, shape,
  elevation-without-border, scrim, entrance motion) lives entirely in
  material3 token values.
- The backdrop is themed through `--ki-dialog-backdrop-bg`, resolving from
  the 001 semantic overlay family — the first themed overlay surface in the
  library.
- Any open/close motion resolves from `--ki-dialog-motion-{duration|easing}`
  and is suppressed under `prefers-reduced-motion` (FR-011, S14): the
  entrance transition simply does not exist under reduced motion. onmars
  ships no motion (`0ms` — design-source-honest); material3 ships an M3
  entrance fade.
- Layout uses logical properties only (FR-014); footer actions follow the
  writing direction (S13).
- Text contrast `--ki-dialog-fg`/`--ki-dialog-bg` ≥ 4.5:1 and focus-ring
  non-text contrast ≥ 3:1 hold in every theme × scheme — CI-gated by the
  extended component sweep (research D9).
- Missing theme values fall back through the cascade to onmars defaults
  (001 contract).

## Agent-facing metadata (Art. I, carried as JSDoc → generated docs/catalog)

- **When to use**: an interrupting decision or short focused task that must
  be resolved before returning to the page — destructive confirmations,
  blocking choices, brief critical input. Always give it a `heading`; wire
  every footer action to `close()`; in destructive confirmations put
  `autofocus` on the least destructive action.
- **When NOT to use**: non-blocking feedback (ki-alert, future ki-toast),
  supplementary hints (ki-tooltip), long forms or multi-step flows
  (navigate, or the future full-screen variant), menus and pickers (future
  components). Robustness notes: unrecognized attributes leave the dialog
  closed with defaults (S5); omit `close-on-backdrop` entirely rather than
  setting it to `"false"`.

## Compatibility

First release of the element (pre-1.0 line); purely additive — no existing
API changes. Removing or renaming anything above after first publish is
MAJOR per Art. IX. Deferred additive candidates recorded by the spec:
full-screen variant, cancelable before-close event, heading-level
attribute, emphasis/intent/size axes, exit motion, `closedby`-based
light dismiss (platform simplification of the backdrop path).
