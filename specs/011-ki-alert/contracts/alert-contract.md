# Public contract: `<ki-alert>`

The behavior contract is `specs/011-ki-alert/feature.feature` (S1–S19).
This document freezes the public API surface the scenarios observe. Any
deviation discovered during implementation re-enters through the spec, not
through code (Art. II).

## Element

`<ki-alert>` — persistent inline message (live region). Not
form-associated. Registered by `@kimen/elements`; per-component export
`dist/components/ki-alert.js` (tree-shakable custom element build).

## Attributes / properties

TypeScript exposes them as typed properties with complete JSDoc (Art. I: an
undocumented member is a build failure). All reflect.

| Attribute | Type | Default | Contract |
|---|---|---|---|
| `tone` | `'neutral' \| 'success' \| 'danger' \| 'info' \| 'warning'` | `'neutral'` | Semantic intent, never appearance (FR-001). Drives BOTH the token-resolved tone matrix and the live exposure: `danger`/`warning` are exposed with alert (assertive) semantics, the rest with status (polite) semantics (S9, S10, S17, S18; FR-005). Unrecognized values render the neutral matrix with polite exposure; rendering never breaks (S5, FR-007). No `variant`: filled-vs-outlined is a theme/token decision. |
| `heading` | `string` | — | Optional title, rendered as emphasized text before the message inside the live region, exposed through the `heading` part — never as a document heading element (S2, FR-002). Absent or empty string → no heading is rendered at all. No heading-level attribute in v1 (recorded additive candidate). |
| `dismissible` | `boolean` | `false` | Opt-in dismissal (FR-003). When set, exactly one dismiss control renders after the message, outside the live-region boundary. When not set: no control, no tab stop (S4, S8). |
| `dismiss-label` | `string` | `"Dismiss"` | The dismiss control's accessible name (S11); overridable for localization (S12, FR-004). The component's only default user-facing string — nothing else is hardcoded (Art. IV). |
| `dismissed` | `boolean` | `false` | Reflected dismissed state (FR-003). Set by the component on user dismissal, or by the page. While set: the host stays in the document, renders nothing and leaves the accessibility tree entirely. Removing it re-shows the alert, which re-announces as a dynamic appearance (S19). |

No `variant`, `size`, tone icons, `start`/`end` slots, auto-dismiss timer,
or `heading-level` in v1 (spec Assumptions, Art. VII). Deferred additive
candidates recorded by the spec: tone icon (theme token or slot),
`start`/`end` slots, heading-level attribute, `ki-dismiss` payload or
cancelability.

## Slots

| Slot | Contract |
|---|---|
| default | The message body (FR-002). Lives inside the live-region boundary, so it is part of every announcement. An alert with no message and no heading announces nothing (empty live region — no phantom announcements). Long content wraps; the alert grows vertically (no truncation). |

## Parts

| Part | Contract |
|---|---|
| `alert` | The outer surface: tone background/border, radius, padding. First restyling hook after tokens. |
| `heading` | The emphasized title text (rendered only when `heading` is non-empty). Never a document heading. |
| `message` | Wrapper around the slotted message content. |
| `dismiss` | The native dismiss button (present only when `dismissible`): state inks, visible focus ring, ≥ 24×24 px pointer target. |

The inner live wrapper is not a part: the live-region boundary (heading +
message in, dismiss out) is a correctness guarantee, not a customization
surface (spec API delta: exactly these four parts).

## Events

| Event | Semantics |
|---|---|
| `ki-dismiss` | `CustomEvent<null>` — `bubbles: true`, `composed: true`, `cancelable: false`, `detail: null` in v1 (any future payload is additive MINOR). Dispatched exactly once per user dismissal (pointer, Enter or Space on the dismiss control — S3, S7), after the alert hides itself and focus is handed off. Never dispatched for programmatic `dismissed` changes. Applications that prefer to control removal listen and remove the element themselves (spec Assumptions). |

Keyboard: Tab reaches the dismiss control when present (S6) — the alert
itself is never focusable and adds no other tab stop (S8, FR-006);
Enter and Space activate it (native button, no key handlers). Dismissal
never strands focus: it moves to the next focusable element after the
alert in document order, else the previous one, else the document body
(S16, FR-013).

## Assistive-technology exposure

- The heading and message are wrapped in a live region whose role follows
  the tone: `alert` (assertive) for `danger`/`warning`, `status` (polite)
  for `neutral`/`success`/`info` and unrecognized values (FR-005).
  Implicit role semantics only — no explicit `aria-live`/`aria-atomic`
  (double-announcement avoidance, research D1).
- The dismiss control sits OUTSIDE the live-region boundary: its
  accessible name is never announced as part of the message (FR-005).
- A dynamically appearing (or re-shown) alert is announced with the
  tone's urgency without moving focus; an alert present at initial page
  load is exposed with its role but a live announcement is not guaranteed
  by platforms — authors who need a guaranteed announcement insert the
  alert (or clear `dismissed`) dynamically (spec Edge Cases; documented
  in the catalog).
- A dismissed alert is exposed to no one (out of the accessibility tree).

## CSS custom properties (component token layer)

The full vocabulary in
[data-model.md](../data-model.md#token-vocabulary-component-layer).
Guarantees:

- Every visual property of every tone and every dismiss-control state
  resolves from `--ki-alert-*`; those resolve from the semantic layer
  (Art. VI, FR-008). Both shipped themes (onmars, material3) fill the
  full five-tone matrix — material3 styles the alert from its
  container/on-container roles even though M3 ships no alert (the spec's
  documented loose mapping).
- Interaction states of the dismiss control (hover, focus-visible,
  active) are CSS states styled through tokens; states are never
  attributes/props.
- Layout uses logical properties only: the message leads and the dismiss
  control trails the writing direction in LTR and RTL alike (S15,
  FR-010).
- v1 declares no motion; any appear/dismiss transition a theme adds later
  through tokens must be disabled under `prefers-reduced-motion` (FR-011).
- Tone text contrast (fg on bg, 4.5:1) and dismiss-glyph non-text
  contrast (3:1, WCAG 1.4.11) hold in every theme × scheme — CI-gated by
  the extended component sweep (research D8).
- Missing theme values fall back through the cascade to onmars defaults
  (001 contract).

## Agent-facing metadata (Art. I, carried as JSDoc → generated docs/catalog)

- **When to use**: a persistent inline message about the state of a page
  or section — a failed save, a completed operation the user should
  notice, a service notice — that remains until the condition is resolved
  or the person dismisses it; express severity with `tone`, never with
  custom styling.
- **When NOT to use**: transient action confirmations that expire on
  their own — future ki-toast (the Material 3 snackbar's territory); tiny
  status descriptors attached to another element — ki-badge; messages
  requiring a blocking decision — ki-dialog; inline field-level
  validation text — belongs to the form control. Robustness note: an
  unrecognized `tone` renders as `neutral`; alerts meant to be announced
  must be inserted dynamically (initial-load alerts are exposed but not
  guaranteed an announcement).

## Compatibility

First release of the element (pre-1.0 line); purely additive — no existing
API changes. Removing or renaming anything above after first publish is
MAJOR per Art. IX. Deferred additive candidates recorded by the spec: tone
icons / `start`+`end` slots, a heading-level attribute, `ki-dismiss`
payload or cancelability, motion tokens.
