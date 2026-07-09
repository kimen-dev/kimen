# Phase 1 Data Model: ki-tooltip

No persistent data. The model is the component's public state surface, its
reveal/dismiss state machine, the description-association model and the
token vocabulary. The normative API contract lives in
[contracts/tooltip-contract.md](./contracts/tooltip-contract.md); this file
models values, defaults and transitions.

## Attribute model

| Attribute | Values | Default | Reflected | Invalid value behavior |
|---|---|---|---|---|
| `label` | string (text-only by construction) | — | no (watched) | empty/whitespace-only = BLANK: no bubble, no description, reveal disabled (S13) |
| `placement` | `top` \| `bottom` \| `start` \| `end` | `top` | yes | normalized to `top` (S3, FR-008) — one tested pure-function branch |

Semantics:

- `label` is the ENTIRE tooltip content (FR-001). An attribute cannot carry
  markup, so text-only holds by construction; the blank predicate is
  `label.trim() === ''`.
- `placement` is a PREFERENCE, not a promise (FR-007): the effective
  placement may flip to the opposite side to stay fully inside the viewport
  (S14, SC-005). `start`/`end` are logical and follow the document writing
  direction (S11).

## Reveal/dismiss state machine (research D3/D5)

Inputs observed at the HOST (never on the trigger):
`pointerenter`/`pointerleave` (composed-tree boundary: bubble included),
composed `focusin`/`focusout`, and — only while visible — one document
CAPTURE `keydown` listener for Escape.

```text
                 pointerenter                    show-delay elapsed
   HIDDEN ────────────────────────▶ PENDING-SHOW ─────────────────▶ VISIBLE
     │  ▲                              │      (timer, token value)     │  ▲
     │  │            pointerleave      │                               │  │
     │  └──────────────────────────────┘         pointerleave          │  │ pointerenter
     │                                 ┌───────────────────────────────┘  │ (cancels timer)
     │        focusin (no delay)       ▼                                  │
     └────────────────────────▶     PENDING-HIDE ──────────────────▶ HIDDEN
                                    (hide-delay, token value)
Immediate transitions (no timer):
  focusin            → VISIBLE          (FR-003: focus reveals without delay)
  focusout, no hover → HIDDEN           (S6)
  Escape             → HIDDEN           (S5/S15: focus untouched; event consumed
                                         via preventDefault + stopPropagation — S16)
  label goes blank   → HIDDEN           (S13; reveal disabled while blank)
Invariants:
  visible ⇒ pointerWithin ∨ focusWithin (until Escape, which needs no re-show
  latch: no new enter/focusin fires while hover/focus persist)
  the tooltip never receives focus and adds no tab stop (FR-006)
```

Positioning is computed ONCE per reveal (before the visibility flip, on the
hidden-but-laid-out bubble): `normalizePlacement` → `resolveTooltipPosition`
→ effective-placement class + `--_ki-tooltip-cross-shift` (research D4).

## Description-association model (research D2)

| Condition | Trigger's `aria-description` | Bubble (`part="tooltip"`, `role="tooltip"`) |
|---|---|---|
| label non-blank, tooltip hidden | = label (STATIC association, S7) | rendered, `visibility: hidden` — absent from the a11y tree |
| label non-blank, tooltip visible | = label | visible; exposed with tooltip role and label content (S8) |
| label blank | attribute absent (S13) | not rendered |
| trigger swapped (slotchange) | removed from old, set on new | open tooltip closes |
| host disconnected | removed | — (timers cleared, document listener removed) |

The trigger's accessible NAME is never touched (S7). The component owns
`aria-description` on its trigger and never touches `aria-describedby`
(consumer-authored `aria-describedby` outranks it per the accname
computation — documented usage constraint). Contingency (recorded, not
built): light-DOM visually-hidden description node + `aria-describedby`,
swapped in only if the walkthrough finds a baseline engine/AT pair that
does not expose `aria-description` — observable outcomes unchanged.

## Token vocabulary (component layer, research D8)

```text
--ki-tooltip-{radius|padding-inline|padding-block|max-inline-size|offset}   structure (5)
--ki-tooltip-{bg|fg}                                                        inverse color pair (2)
--ki-tooltip-{font-size|font-weight|line-height}                            typography (3)
--ki-tooltip-shadow                                                         elevation (1)
--ki-tooltip-{show-delay|hide-delay}                                        timing, DTCG duration (2)
```

- 13 tokens per theme; onmars references the 001 semantic layer — bg/fg
  from the inverse ramp (`ki.surface.inverse-*`, `ki.text.high-em-inverse`;
  first component consumer, no semantic delta needed); material3 overrides
  the same names (M3 plain tooltip: inverse-surface container).
- The two delay tokens carry literal millisecond values (no motion layer
  exists yet in 001); they re-point when one arrives. They extend the
  spec's enumerated family list — flagged for gate-1 sign-off (plan.md
  Art. VI).
- Contrast: `--ki-tooltip-fg` over `--ki-tooltip-bg` CI-gated at 4.5:1
  (label is text, WCAG 1.4.3) in every theme × scheme.
- No state matrix (the tooltip is not interactive), no focus-ring tokens
  (never focusable), no size/tone axes (spec design analysis).

## Slots & parts

| Surface | Name | Purpose |
|---|---|---|
| slot | *(default)* | THE trigger — exactly one interactive element (extra content is outside the contract, documented constraint) |
| part | `tooltip` | the bubble; second rung of the customization ladder (tokens → part → slot) |

No events, no methods, no sub-components in v1 (Art. VII; `ki-show`/
`ki-hide` would be additive MINOR).
