# Phase 1 Data Model: ki-alert

No persistent data. The model is the component's public state surface, its
assistive-technology exposure and its token vocabulary. The normative API
contract lives in [contracts/alert-contract.md](./contracts/alert-contract.md);
this file models values, defaults and transitions.

## Attribute model

| Attribute | Values | Default | Reflected | Invalid/absent behavior |
|---|---|---|---|---|
| `tone` | `neutral` \| `success` \| `danger` \| `info` \| `warning` | `neutral` | yes — CSS selects the tone matrix on `:host([tone=…])` | any unrecognized value renders the neutral matrix (no override selector matches) and is exposed politely (`liveExposureForTone` returns `status`); rendering never breaks (S5, FR-007) |
| `heading` | string | — (no heading) | yes (string attribute) | absent OR empty string → no heading element is rendered at all (FR-002, Edge Cases) |
| `dismissible` | boolean (presence) | `false` | yes | absent → no dismiss control rendered, no tab stop contributed (S4, S8) |
| `dismiss-label` | string | `"Dismiss"` | yes | the dismiss control's accessible name; overridable for localization (S11, S12, FR-004) — the component's only default user-facing string |
| `dismissed` | boolean (presence) | `false` | **yes** — reflected live state; the page re-shows the alert by removing it (S19) | set → host stays in the document, renders nothing, leaves the accessibility tree entirely (FR-003) |

No `variant`, `size`, tone icons, `start`/`end` slots, auto-dismiss timer
or `heading-level` — the spec's Assumptions exclude each explicitly
(Art. VII; all recorded as possible additive MINOR changes post-v1).

## Live-exposure model (FR-005, research D1)

The tone maps to the `role` of an inner shadow wrapper containing exactly
the heading and the message slot — the dismiss control sits OUTSIDE the
live-region boundary. Implicit role semantics only; no `aria-live`,
`aria-atomic` or `aria-relevant` anywhere.

| Tone | Role | Live semantics (implicit) | Scenario |
|---|---|---|---|
| `danger` | `alert` | assertive, atomic — announced immediately | S9 |
| `warning` | `alert` | assertive, atomic — announced immediately | S17 |
| `success` | `status` | polite, atomic — announced without interrupting | S10 |
| `info` | `status` | polite, atomic | S18 |
| `neutral` | `status` | polite, atomic | S18 |
| *unknown/absent* | `status` | polite (degrades with its neutral appearance) | S5 |

Mapping is one pure function: `liveExposureForTone(tone)` in
`ki-alert.tone.ts` (`danger`/`warning` → `'alert'`, else `'status'`) —
the gate-1 urgency decision (warning = assertive) is encoded exactly once.

Announcement invariants (verified manually per the spec's Art. V surface;
exposure asserted in tests):

- a DYNAMICALLY appearing alert (inserted, or `dismissed` cleared) enters
  the accessibility tree as a populated live region → announced with the
  tone's urgency class, focus untouched (S9, S10, S17, S18);
- an alert present at initial page load is exposed with its role; a live
  announcement is not guaranteed by platforms (spec Edge Cases — catalog
  documents it);
- an empty alert (no heading, no message) renders an empty live wrapper —
  nothing to announce, no phantom announcements;
- the announcement contains only the heading and message, never the
  dismiss control's accessible name (boundary invariant).

## Dismissal lifecycle (FR-003, FR-013, research D2–D4)

```text
   visible (default)
        │
        ├─ user activates dismiss control (pointer / Enter / Space, native button)
        │     1. focus inside the alert? → resolve handoff target
        │        (next focusable after host in document order; else previous;
        │         else document.body — pure resolveDismissFocusTarget, FR-013)
        │     2. dismissed := true  → attribute reflects (S3, S7)
        │     3. focus moves to the resolved target (S16); never stranded
        │     4. exactly ONE ki-dismiss dispatched
        │        (bubbles, composed, cancelable: false, detail: null)
        ▼
   dismissed — host in document, empty shadow render + :host([dismissed]) display:none
        │      (out of layout, out of the accessibility tree; FR-003)
        │
        └─ page removes the dismissed attribute (or sets el.dismissed = false)
              → full subtree re-created: a FRESH populated live region is
                inserted → re-announces as a dynamic appearance (S19, FR-005)
```

Invariants:

- exactly one `ki-dismiss` per dismissal, none on programmatic
  `dismissed` mutation (the event reports the user action, not the state);
- dismissal via the page (setting `dismissed` programmatically) hides the
  alert without an event and without touching focus;
- the alert itself is never focusable and never traps focus (FR-006); the
  dismiss button is the only interactive part;
- non-dismissible alerts render no button — no tab stop by construction
  (S8), not `tabindex` suppression.

## Internal state

| State | Type | Set by | Consumed by |
|---|---|---|---|
| — | — | — | — |

No internal state beyond the reflected props: the live exposure derives
from `tone`, the render tree derives from
`dismissible`/`dismissed`/`heading`, and the focus handoff is computed at
dismissal time. (Contrast with 008's form snapshot — ki-alert is not
form-associated and holds nothing the attributes don't already express.)

## State model (CSS states, never attributes/props for interaction)

Base = neutral matrix on `:host`, swapped via the `--_ki-alert-*`
indirection (002 pattern):

| State | Selector | Token segment |
|---|---|---|
| neutral (base + unknown-tone fallback) | `:host` | `neutral-*` |
| success / danger / info / warning | `:host([tone='…'])` | `{tone}-*` |
| dismissed | `:host([dismissed])` | `display: none` (belt over the empty render) |
| dismiss rest | `[part='dismiss']` | `dismiss-rest-fg` |
| dismiss hover / active | `[part='dismiss']:hover` / `:active` | `dismiss-{hover|active}-fg` |
| dismiss focus | `[part='dismiss']:focus-visible` | `focus-ring-*` |

Layout: one inline flow — live content (heading over message) leads, the
dismiss control trails — expressed with logical properties only, so RTL
mirrors by construction (S15, FR-010). No transitions or animations are
declared: v1 ships no motion, so FR-011's reduced-motion clause is
satisfied by construction.

## Event model

| Event | Type | Timing | Contract |
|---|---|---|---|
| `ki-dismiss` | `CustomEvent<null>` — `bubbles: true`, `composed: true`, `cancelable: false` | after `dismissed` reflects and focus is handed off | exactly one per user dismissal (S3, S7); never fired for programmatic `dismissed` changes; `detail: null` in v1 — any payload is additive MINOR (FR-003) |

No other events. The component listens only to the internal button's
native activation.

## Token vocabulary (component layer)

```text
--ki-alert-{padding-inline|padding-block|gap|radius|border-width}
--ki-alert-{font-size|line-height|heading-font-size|heading-font-weight}
--ki-alert-{dismiss-size|dismiss-icon-size}
--ki-alert-{neutral|success|danger|info|warning}-{bg|fg|border}
--ki-alert-dismiss-{rest|hover|active}-fg
--ki-alert-focus-ring-{color|width|offset}
```

- structure: 11 tokens, single scale (no size/variant axis in v1);
  geometry references `ki.space.*`/`ki.radius.*`, typography references
  `ki.font.*`; `dismiss-size` ≥ 24 px (Art. V pointer target)
- tone colors: 5 tones × 3 inks = 15, referencing
  `ki.surface.{tone}-base-em` / `ki.text.{tone}-high-em` /
  `ki.outline.{tone}-*` (neutral column from the neutral families) — the
  001 info/warning ramps consumed by a component for the first time
- dismiss state inks: 3 (one family across tones, applied via
  `currentColor` on the glyph)
- focus ring: 3
- = 32 tokens per theme; every value references the 001 semantic layer;
  material3 overrides the same names in `alert.material3.tokens.json`
  (M3 container/on-container mapping; its info/warning ramps inherit base
  values through the 001 cascade — research D7 finding, measured as built)
- gate note: the five `{tone}-bg` cells feed the extended contrast sweep —
  paired against `{tone}-fg` at the 4.5:1 text minimum, and against each
  `dismiss-{rest|hover|active}-fg` at the WCAG 1.4.11 non-text 3:1 minimum
  (research D8)
- no motion tokens, no tone-icon tokens, no per-tone dismiss inks in v1
  (Art. VII; additive later if the sweep or a theme demands them)

## Slots & parts

| Surface | Name | Purpose |
|---|---|---|
| slot | default | the message body; lives inside the live-region boundary; empty slot + no heading = nothing announced |
| part | `alert` | the outer surface (tone bg/border, radius, padding) |
| part | `heading` | the optional emphasized title (`<strong>`, never a document heading); rendered only when `heading` is non-empty |
| part | `message` | wrapper around the slotted message content |
| part | `dismiss` | the native dismiss button (state inks, focus ring, ≥ 24 px target); exists only when `dismissible` |

The inner live wrapper carries no part: the live-region boundary is a
correctness surface, not a customization surface (the ladder is tokens →
these four parts → the slot).
