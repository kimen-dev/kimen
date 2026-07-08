# Phase 1 Data Model: ki-textarea

No persistent data. The model is the component's public state surface and
its token vocabulary. The normative API contract lives in
[contracts/textarea-contract.md](./contracts/textarea-contract.md); this
file models values, defaults and transitions. Wherever a row matches
ki-input (003), that is by design — the spec aligns the state vocabulary
across the batch; the deltas are `rows`, the absence of slots, and the
Enter/height semantics.

## Attribute model

| Attribute | Values | Default | Reflected | Invalid/absent behavior |
|---|---|---|---|---|
| `label` | string | — | yes | mandatory for valid usage; absence is misuse and fails the a11y gate, not a supported mode |
| `placeholder` | string | — | yes (forwarded) | hint shown only while empty (S19); never the accessible name |
| `value` | string | `''` | **no** — attribute declares the DEFAULT; property reads/writes the LIVE value | see value model below; light-DOM text content is IGNORED (no slot renders it — research D1) |
| `name` | string | — | yes (host-level, FACE) | omitted → the field contributes no form entry |
| `rows` | positive integer | `2` (native parity; gate-1 marker on the default) | yes | non-numeric/`NaN`/`< 1` → normalized to the default (S6, `normalizeKiTextareaRows`) |
| `required` | boolean | `false` | yes (forwarded) | readonly exempts from it (FR-006) |
| `readonly` | boolean | `false` | yes (forwarded) | — |
| `disabled` | boolean | `false` | yes (forwarded) | — |
| `autocomplete` | string (autofill detail tokens, e.g. `street-address`) | — | yes (forwarded verbatim) | omitted → no declared entry purpose |

## Value model (native dirty-value semantics — ADOPTED from 003 D2)

```text
                     declared default = value ATTRIBUTE (live)
                              │
   first render ──────────────┘  value property = attribute ?? ''   dirty=false
        │
        ├─ user types      → property updates per keystroke,  dirty=true,
        │                    composed input events; change on commit (S1, S20)
        │                    Enter inserts "\n" INTO the value (S2, S8)
        ├─ page assigns
        │  el.value = x    → display replaced, NO events,     dirty=true
        └─ form reset      → property := attribute ?? '',     dirty=false,
                             user edits and programmatic
                             assignments discarded (S13)
```

Invariants:

- typing NEVER rewrites the `value` attribute (FR-002);
- line breaks are ordinary value characters: preserved in the property, in
  FormData and through paste (S2, S12; FR-004);
- `internals.setFormValue(value)` runs on every value change, so submission
  always carries the live text (S12);
- events report user actions only: the composed `input` passes through
  natively; `change` is re-dispatched composed from the host on internal
  commit (003 D5); programmatic assignment is silent by construction;
- the internal textarea's display is driven by its `value` PROPERTY (ref +
  watcher), never by element children (research D2).

## Internal state

| State | Type | Set by | Consumed by |
|---|---|---|---|
| `dirty` | boolean | first user edit or programmatic value assignment | reset semantics (cleared by `formResetCallback`) |
| `formDisabled` | boolean | `formDisabledCallback` (`fieldset[disabled]`, `form[disabled]` ancestry) | effective-disabled = `disabled \|\| formDisabled` → internal textarea `disabled`, exclusion from form data (S15, S16) |
| `user-invalid` | custom state (`internals.states`) | host `invalid` event (blocked submission attempt) or user commit while invalid | CSS `:host(:state(user-invalid))`; cleared when valid again or on reset (003 D7 pattern) |

## Height model (fixed in v1 — research D7, founder-approved 2026-07-08)

```text
field block size = padding-block×2 + normalizeKiTextareaRows(rows) × line-height
                   (floored at --ki-textarea-min-target)
```

- `rows` forwarded normalized to the internal textarea → native height
  arithmetic; `--ki-textarea-line-height` makes the line unit a token
  (S3: a 6-row field is four line-heights taller than a 2-row one);
- `resize: none` on the internal textarea — no user resize handle;
- overflow beyond the visible rows scrolls INSIDE the field (native
  textarea behavior); page layout never shifts — no auto-grow.

## State model (CSS states, never attributes — FR-012)

| State | Selector | Token suffix (inks swapped via `--_ki-textarea-*`) |
|---|---|---|
| rest | base `:host` | `-rest` |
| hover | `:host(:hover)` | `-hover` |
| focus | `:host(:focus-within)` + focus-ring tokens | `-focus` |
| disabled | `:host([disabled])` / formDisabled | `-disabled` |
| readonly | `:host([readonly])` | `-readonly` |
| invalid | `:host(:state(user-invalid))` | `-invalid` |

user-invalid transitions (003 D7, adopted):

```text
untouched (never invalid-looking, even empty+required — FR-012)
   │ submission attempt fails (invalid event)      ┐
   │ or user commits an edit that is invalid       ├──▶ user-invalid
   └───────────────────────────────────────────────┘        │
        value becomes valid, or form reset ◀────────────────┘  (state cleared)
```

## Form participation model (ElementInternals, 002/003 pattern)

| Interaction | Mechanism | Outcome |
|---|---|---|
| submit | `setFormValue` entry under host `name` | `name=text` in FormData, line breaks intact (S12); readonly still submits (S23) |
| Enter in field | NO forward — deliberate absence (research D4) | a new line is inserted; the form does NOT submit (S8) — inverse of ki-input |
| empty + required | mirrored `valueMissing` via `setValidity` | submission blocked, field reports missing value (S14) |
| readonly + required + empty | native textarea barred from validation → mirror is valid | submission proceeds (FR-006, asserted alongside S23) |
| reset | `formResetCallback` → attribute default restored | S13 |
| disabled host | FACE machinery | excluded from FormData (S16) |
| disabled fieldset | `formDisabledCallback` | field inert, text unchanged (S15) |

Events: no custom events. Composed `input` (native pass-through) and
composed re-dispatched `change` are the only signals (S1, S20).

## Token vocabulary (component layer)

```text
--ki-textarea-{padding-inline|padding-block|label-gap|radius|min-target}
--ki-textarea-{font-size|font-weight|line-height}
--ki-textarea-label-{font-size|font-weight|line-height}
--ki-textarea-border-width
--ki-textarea-border-{block-start|block-end|inline-start|inline-end}-width
--ki-textarea-{rest|hover|focus|disabled|readonly|invalid}-{bg|fg|border|label-fg|placeholder-fg}
--ki-textarea-focus-ring-{color|width|offset}
```

- structure: 11 tokens, single scale (no size axis in v1). Deltas vs
  `--ki-input-*`: `padding-block` replaces `height` (multiline vertical
  rhythm = padding + rows × line-height, research D7/D9); no `gap`, no
  `icon-size` (no slots).
- border widths: 5 (per-side logical overrides defaulting to the
  shorthand — the filled vs outlined enclosure lever, 003 D8 adopted)
- state colors: 6 states × 5 inks = 30
- focus ring: 3
- ≈ 49 tokens per theme; every value references the 001 semantic layer;
  material3 overrides the same names in `textarea.material3.tokens.json`.
- gate note: the contrast sweep in `check-contrast.mjs` is extended to
  this matrix — `{state}-fg` and `{state}-placeholder-fg` on `{state}-bg`,
  `{state}-label-fg` on `--ki-surface-s0`, disabled exempt (research D10).

## Slots & parts

| Surface | Name | Purpose |
|---|---|---|
| slot | — | NONE in v1 (spec assumption: affix slots deliberately excluded; additive MINOR later). Light-DOM children never render. |
| part | `field` | the enclosure wrapper (bg, border, radius, focus ring, min-block-size) |
| part | `textarea` | the internal native textarea (entered text, caret, scrolling; `resize: none`) |
| part | `label` | the rendered visible label |

No default slot: the label is an attribute (accessible-name wiring by
construction) and the initial value is the `value` attribute (uniform
authoring contract for agents across the batch, spec Assumptions).
