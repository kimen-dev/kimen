# Public contract: `<ki-badge>`

The behavior contract is `specs/010-ki-badge/feature.feature` (S1–S8). This
document freezes the public API surface the scenarios observe. Any deviation
discovered during implementation re-enters through the spec, not through code
(Art. II).

## Element

`<ki-badge>` — static, non-interactive status pill. Not form-associated,
never focusable, no activation behavior, no live-region semantics (feedback
that must be announced belongs to ki-alert). Registered by `@kimen/elements`;
per-component export `dist/components/ki-badge.js` (tree-shakable custom
element build).

## Attributes / properties

| Attribute | Type | Default | Contract |
|---|---|---|---|
| `tone` | `neutral \| success \| danger \| info \| warning` | `neutral` | Semantic intent, never appearance (FR-001). Each tone resolves its colors from `--ki-badge-{tone}-{bg\|fg\|border}`. An unrecognized value matches no style selector, so the badge renders with the neutral appearance (S3, FR-007 — fallback by CSS construction, no validation code). Tone reinforces the label text; it never replaces it (FR-003, WCAG 1.4.1). |
| `size` | `sm \| md` | `md` | Token-backed metrics per size (`--ki-badge-{size}-*`), never hardcoded (FR-002). An unrecognized value falls back to the `md` metrics the same way. |

Both props reflect. No other attribute is observed: anything else — including
vocabulary copied from other design systems — is ignored.

## Slots

| Slot | Contract |
|---|---|
| *(default)* | The label: short status text, the sole carrier of meaning (FR-003). A long label stays on one line and grows the pill; truncation/wrapping is the consumer's layout concern in v1 (spec Assumptions). An empty slot renders without error and exposes nothing to assistive technology (S8, FR-012) — empty usage is documented misuse (when-NOT-to-use, FR-011). |

## Parts

Customization ladder: tokens first, then parts, then slots.

| Part | Contract |
|---|---|
| `badge` | The pill itself (background, foreground, border, radius, metrics, typography). |

## Events

None. The badge emits nothing and intercepts nothing (FR-004).

## Accessibility contract

The badge contributes **no role, name or state of its own** and adds zero
keyboard stops (S4, FR-004): the slotted label reaches assistive technology
as plain static text (S5, FR-005). No ARIA role is added — no APG pattern
exists for a static badge, so none is claimed (semantic HTML first, Art. V).
Runtime label changes are NOT announced (no live region — spec-approved);
meaning lives in the text, tone color only reinforces it (WCAG 1.4.1), and
every tone's fg/bg pair meets WCAG 1.4.3 in all four theme × scheme contexts
(FR-008, contrast-gated per research D4).

## CSS custom properties (component token layer)

```text
# Per size (sm, md)
--ki-badge-sm-height            pill block-size, sm
--ki-badge-sm-padding-inline    inline padding, sm
--ki-badge-sm-radius            corner radius, sm (pill shape is a token, never a prop)
--ki-badge-sm-font-size         label font size, sm
--ki-badge-sm-line-height       label line height, sm
--ki-badge-md-height            pill block-size, md
--ki-badge-md-padding-inline    inline padding, md
--ki-badge-md-radius            corner radius, md
--ki-badge-md-font-size         label font size, md
--ki-badge-md-line-height       label line height, md

# Family-level
--ki-badge-font-family          label font family
--ki-badge-font-weight          label font weight
--ki-badge-border-width         stroke width (what makes filled-vs-outlined a token decision)

# Per tone (neutral, success, danger, info, warning)
--ki-badge-neutral-bg           --ki-badge-neutral-fg           --ki-badge-neutral-border
--ki-badge-success-bg           --ki-badge-success-fg           --ki-badge-success-border
--ki-badge-danger-bg            --ki-badge-danger-fg            --ki-badge-danger-border
--ki-badge-info-bg              --ki-badge-info-fg              --ki-badge-info-border
--ki-badge-warning-bg           --ki-badge-warning-fg           --ki-badge-warning-border
```

Guarantees:

- Every visual property resolves from `--ki-badge-*`; those resolve from the
  001 semantic layer (Art. VI). Zero hardcoded visual values.
- **No state segments and no focus-ring tokens exist** — the badge is static
  and never focusable; this is the documented deviation from the 002 button
  naming template (spec Art. VI echo).
- The filled-vs-outlined pill treatment is a **theme decision** carried
  entirely by `border-width` and the per-tone `border` values — no attribute
  exists (002 Round/Square precedent).
- Under material3, `info` and `warning` resolve through the shared
  info/warning ramps inherited via the semantic cascade — material3 defines
  no info/warning color roles (001 contract; verified in the built CSS
  2026-07-08, research D2).
- Missing theme values fall back through the cascade to onmars defaults
  (001 contract).

## Agent-facing metadata (Art. I, carried as JSDoc → generated docs)

- **When to use**: a short textual status ("Active", "Beta",
  "Payment failed") labeling an adjacent item in a list, table row or card
  header, with `tone` matching the intent — success for healthy/complete,
  danger for failed/blocking, info for informational, warning for caution,
  neutral for no particular intent.
- **When NOT to use**: notification counts or dots overlaid on navigation
  items (future overlay nav badge), removable or interactive chips (future
  component), messages that need attention, announcement or dismissal
  (ki-alert), long sentences, or empty/icon-only pills — the text IS the
  meaning.

## Compatibility

First release of the element (pre-1.0 line): additive MINOR. Removing or
renaming anything above after first publish is MAJOR per Art. IX.
