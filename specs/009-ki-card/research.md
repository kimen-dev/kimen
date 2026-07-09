# Phase 0 Research: ki-card

Decisions that resolve every open technical question in the plan. ki-card is
deliberately the simplest component of the Fase 2 batch — a render-only
container — so there are few decisions, and none introduces machinery beyond
what the approved scenarios require (Art. VII). Sources: the spec's design
analysis, the 001 token architecture and the 002 component precedent.

## D1 — Empty-region collapse: `slotchange` state, not `:has()`

**Decision**: the shadow root renders the surface
(`<div part="card">`) containing four always-present region wrappers, each
holding its slot:
`<div part="media"><slot name="media"/></div>` … `<div part="body"><slot/></div>` …
Emptiness is component state: each slot's `slotchange` (plus an initial
check) sets a per-region has-content flag; a region without content gets a
marker the CSS collapses with `display: none`. The default-slot check
filters `assignedNodes()` to elements and non-whitespace text, so
`<ki-card>\n</ki-card>` counts as empty.

**Rationale**: FR-003/S2 demand that absent regions reserve no space, and
FR-009 puts padding **on the regions** — so an empty padded wrapper would
visibly reserve space unless removed from layout. Pure CSS cannot do it:
slotted content lives in the light DOM, and shadow-tree selector matching
never sees assigned nodes, so `:has()` / `:empty` on the wrapper or the slot
observe only fallback content and always report "empty". `slotchange` is the
platform's designed signal for exactly this. Keeping the wrappers and slots
always rendered (hidden via CSS rather than conditionally removed) means the
`slotchange` listener survives content being added later. `display: none`
regions also stop contributing to the container's `gap`, so collapse is
complete by construction.

**Alternatives considered**: (a) `:has(slot:empty)`-style pure CSS —
impossible, per above; rejected. (b) padding on `::slotted(*)` instead of
the wrapper — breaks with more than one slotted element per region (doubled
padding) and moves the token off the region, violating FR-009; rejected.
(c) conditional JSX rendering of wrappers — removing the `<slot>` drops the
`slotchange` listener and the assigned content with it; rejected.

## D2 — Token file: flat `--ki-card-*` family, style axis in theme values

**Decision**: new DTCG sources under `packages/tokens/tokens/component/`:

- `card.tokens.json` — the theme-neutral schema (onmars values by
  inheritance): `ki.card.{bg,fg,border-color,border-width,radius,elevation,gap}`
  plus per-region `ki.card.{media|header|body|footer}-padding`
  (~11 tokens). Color/surface values reference the semantic layer
  (`ki.surface.s0–s5`/`ki.surface.raised`, `ki.text.*`, `ki.outline.*`);
  geometry references `ki.radius.*`/`ki.space.*` primitives; `elevation` is
  a composed box-shadow string whose colors reference `ki.elevation.*`
  (the `--ki-button-*-shadow` precedent). `media-padding` is
  `{ki.space.zero}` (full-bleed, both shipped themes).
- `card.material3.tokens.json` — material3 overrides for the same names.
  The M3 elevated/filled/outlined axis lives **here**: the theme picks its
  card style by what it assigns to `border-*` and `elevation` (e.g.
  elevated = shadow + transparent border; outlined = visible border +
  `none` shadow; filled = neither) plus its surface-container color and M3
  shape radius. No component attribute exists (FR-008).

**Rationale**: FR-007 mandates `--ki-card-*` for every visual value. Unlike
the button there is no variant × tone × state matrix — the card is static —
so the family stays flat and small. Expressing the M3 style axis as plain
token values is the whole point of the spec's "no variant attribute"
decision: a future theme change of card style is a token diff, never a
markup or component diff (S6).

**Alternatives considered**: component CSS referencing semantic tokens
directly — themes could not restyle the card (border vs shadow trade-off)
without touching component CSS; rejected (same reasoning as 002 D4).

## D3 — Behavioral transparency by construction: zero logic beyond D1

**Decision**: no props, no event listeners (beyond `slotchange`), no
`tabindex`, no ARIA, no `delegatesFocus`, not form-associated. Plain
`shadow: true`; host `display: block`. The wrappers are generic `<div>`s.

**Rationale**: S3 (unknown attributes ignored) is satisfied because the
component observes no attributes — there is nothing to validate. S4/S8
(no stolen focus, no intercepted events) hold because no code touches focus
or events. S5 (no role/name/state) holds because generic divs contribute
none and we add none — FR-006 explicitly forbids `article`/`group`/`region`;
no ARIA is better than wrong ARIA (Art. V). The only JavaScript in the
component is D1's emptiness tracking; that predicate (whitespace filtering)
gets exhaustive unit cases as the mutation-gap compensating control
(plan.md Art. III).

**Alternatives considered**: `role="group"` or `<article>` for "semantics" —
adds noise for AT users on every card and contradicts FR-006; rejected.

## D4 — Tests and traceability

**Decision**: three test files, each marked `// @spec:009-ki-card`, S-IDs on
code lines (test titles), mirroring the 002 file layout:

- `ki-card.spec.tsx` (mock-doc, fast): S1 shadow anatomy renders the region
  parts in reading order; S2 emptiness flags collapse regions (including the
  whitespace-only default slot edge); S3 an unrecognized `variant` attribute
  changes nothing observable. Plus unit cases for the D1 predicate.
- `ki-card.browser.spec.ts` (real browser, built output): S1 visual reading
  order via geometry; S2 a body-only card reserves no space for absent
  regions (computed geometry); S4 Tab lands on the slotted button, never the
  card; S5 accessibility tree exposes the heading/text and the card
  contributes no role, name or state; S8 one click → exactly one activation;
  S6 material3 theme restyle via injected built stylesheets (001/002
  pattern); axe zero violations across region subsets × themes.
- `ki-card.dark.browser.spec.ts`: S7 forced dark under onmars + axe in dark
  (the `ki-button.dark.browser.spec.ts` precedent: forced scheme isolated in
  its own file).

**Rationale**: the traceability gate requires S-IDs on code lines of marked
files; the browser suite asserts what ships. RED first per Art. III. axe
across the 16 region subsets is cheap (static renders) and is what SC-003
promises.
