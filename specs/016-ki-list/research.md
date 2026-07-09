# Phase 0 Research: ki-list

Decisions that resolve every open technical question in the plan. ki-list is
a simple feature — a render-only composite of two non-interactive elements —
so there are few decisions, and none introduces machinery beyond what the
approved scenarios require (Art. VII). Sources: the spec's design analysis,
the 001 token architecture, the 002 ki-button precedent, the 009 ki-card
plan set (the sibling non-interactive container, whose applicable decisions
are CITED and reused rather than re-derived, Art. VII) and the
007-ki-radio-group plan set (the sibling parent–child composite, for the
two-element file/test conventions only — none of its coordination machinery
applies to a non-interactive list).

Shared decisions inherited from the siblings (cited, not re-derived):

- **Empty-region collapse via `slotchange` state, never `:has()`/`:empty`**
  — 009 D1 (adopted for the item regions in D2 below, including the
  whitespace-filtering emptiness predicate and the always-rendered-wrapper
  rule).
- **Behavioral transparency by construction: no observed attributes, no
  listeners beyond `slotchange`, no tabindex, no focus/event handling** —
  009 D3 (S4, S5, S11 hold because nothing exists to misbehave).
- **`--_ki-*` private CSS indirection over component tokens** — 002 pattern.
- **Two-element composite conventions: one generator invocation per tag,
  the child's scaffolded browser-spec file carries anatomy-only assertions
  and defers every S-ID to the parent suite** — 007 D9.

## D1 — List semantics: structural `list`/`listitem` roles on the hosts via `ElementInternals.role`

**Decision**: `ki-list` sets `internals.role = 'list'` and `ki-list-item`
sets `internals.role = 'listitem'` (Stencil `@AttachInternals()`; neither
element is form-associated — `attachInternals()` does not require it). No
other ARIA of any kind: no names, no states, no `aria-setsize`/`posinset`
by default.

**Rationale**: FR-005 fixes the mechanism family (host roles) and this
decision picks `ElementInternals.role` over a component-written host `role`
attribute:

- **Co-tree, zero re-parenting**: both hosts live in the same light-DOM
  tree — the `list` → `listitem` ancestor chain the roles require holds in
  one tree, with no cross-shadow ownership claim. This is the decisive
  difference from a shadow `<ul>`/`<li>`, which the spec already rules out
  (a `<ul>` wrapping a `<slot>` owns zero items — FR-005).
- **Default semantics, author sovereignty**: internals-provided roles are
  *default* semantics — an author- or agent-set `role` attribute on the
  host still wins (per custom-element semantics precedence). That matches
  the spec's robustness posture: agent markup is not trusted, and the
  component never fights the author.
- **No light-DOM mutation**: the component never writes attributes on its
  own host — no SSR/hydration diff noise, no clobbering author markup.

**One claim to verify, pinned by a test**: ki-list's shadow root renders a
generic wrapper (`<div part="list"><slot/></div>`, D2), which sits between
the `list` host and the `listitem` hosts in the flattened tree. Browsers
compute list ownership through intervening generics (the `ul > div > li`
tolerance), but this is exactly the kind of cross-boundary claim that must
be verified, not assumed: S6's browser test queries the computed
accessibility tree and asserts a list of **exactly three items** with no
interactive role — the accurate-count announcement the spec demands. If a
target engine ever breaks ownership through the generic wrapper, the
recorded contingency is `role="none"` on that internal wrapper (pruning a
presentational div — additive, not an architecture change and not the
"wrong ARIA" Art. V guards against).

**Alternatives considered**: (a) shadow `<ul>`/`<li>` — impossible with
slotted light-DOM children, per FR-005's own analysis; rejected. (b) the
component writing `role="list"`/`role="listitem"` attributes on its hosts —
same computed semantics but mutates author-owned markup and silently
overwrites an author-set role; rejected. (c) `role="list"` on the internal
wrapper + `listitem` on item hosts — splits the pair across trees for no
gain and deviates from FR-005's named mechanism (roles on the hosts);
rejected. (d) group-managed `aria-setsize`/`aria-posinset` — browsers
derive set/position from the DOM for structural lists; adding it is
speculative machinery with an update obligation (Art. VII); recorded only
as contingency data if the S6 walkover ever fails on a target pair.

## D2 — Item anatomy: flex regions with `slotchange` collapse (009 D1 cited); the has-secondary flag doubles as the line-count discriminator

**Decision**: `ki-list-item`'s shadow root renders always-present region
wrappers:

```html
<div part="item">
  <div part="start"><slot name="start" /></div>
  <div part="content">
    <span class="primary"><slot /></span>
    <span class="secondary"><slot name="secondary" /></span>
  </div>
  <div part="end"><slot name="end" /></div>
</div>
```

`part="item"` is a flex row on the logical inline axis with
`gap: var(--_ki-list-item-gap)`; `part="content"` is a column (primary
above secondary — S2's reading order) and takes the flexible remainder so
`start`/`end` hug their content. Emptiness is component state per **009 D1,
cited verbatim**: each slot's `slotchange` plus an initial check sets a
per-region has-content flag; empty `start`, `end` and `secondary` wrappers
get `display: none`. The default-slot and secondary-slot checks filter
`assignedNodes()` to elements and non-whitespace text (009's predicate,
reused). `display: none` regions stop contributing to the flex `gap`, so
collapse is complete by construction (S3) — no reserved space, ever.

**The has-secondary flag is also FR-003's line-count discriminator**: the
same state that collapses the secondary wrapper switches the item's
`min-block-size` between `--ki-list-item-min-height` (one-line) and
`--ki-list-item-min-height-multiline` (secondary present). One mechanism,
two consumers — and by construction it obeys FR-003's rule that the
discriminator is *slotted secondary content*, never rendered wrapping:
wrapped text grows the item past its min-height (S10) without changing
which token applies.

`ki-list`'s shadow root is just `<div part="list"><slot /></div>` — no
emptiness logic at list level (an empty list is documented as an authoring
mistake, not an error state to detect; spec edge case).

**Alternatives considered**: (a) a 3-column grid (`auto 1fr auto`) —
`display: none` children collapse their auto track to zero but `column-gap`
between tracks survives, leaving phantom spacing exactly where S3 forbids
it; flex `gap` disappears with the hidden child by construction; rejected.
(b) conditional JSX rendering of wrappers — removing the `<slot>` drops the
`slotchange` listener (009 D1); rejected. (c) detecting line count from
rendered wrapping (ResizeObserver) — contradicts FR-003 verbatim and adds
an observer no scenario needs; rejected.

## D3 — Separation: divider tokens consumed by the LIST via `::slotted(ki-list-item:not(:last-child))`; no attribute, no divider element

**Decision**: the spec leaves separation entirely to theme token values
(FR-008 — verified: no divider or variant attribute exists anywhere in the
approved surface). Mechanism: `ki-list`'s shadow stylesheet draws the
divider on the slotted items themselves —

```css
::slotted(ki-list-item:not(:last-child)) {
  border-block-end: var(--_ki-list-item-divider-width) solid
    var(--_ki-list-item-divider-color);
}
```

— between items only, never after the last. Token names stay
`--ki-list-item-divider-{width|color}` as the spec's constitutional surface
fixes them. Theme values carry the M3 divider axis: **onmars** sets
`divider-width` to `{ki.space.zero}` and separates through `--ki-list-gap`
(faithful to MarsUI, which ships dividers as standalone `Divider_*`
components and has no list frame — spec design analysis, verified
2026-07-08); **material3** sets a hairline width referencing the semantic
outline ramp with a zero list gap (M3's optional divider, expressed as
values — S7's observable difference). A future `ki-divider` component
remains a separate roadmap item; this mechanism neither uses nor blocks it.

**Rationale**: "between items" is a relationship among siblings that only
the parent can see; `:not(:last-child)` inside `::slotted()` is a supported
compound selector and keeps the whole between-items concern in one rule.
`::slotted()` specificity is low, but nothing competes for the host's
border. This is the 002 Round/Square precedent applied again: a
pure-appearance axis as theme token values, never markup.

**Alternatives considered**: (a) a `divider` attribute — forbidden by
FR-008; rejected. (b) item-owned `border-block-end` reset via
`:host(:last-child)` — equivalent output, but splits a between-items
concern into per-item CSS that must know about siblings; not chosen.
(c) rendered divider elements interleaved in the list's shadow root —
impossible without re-parenting slotted content, breaking D1's co-tree
model; rejected.

## D4 — Token file: one source pair, two flat families (`--ki-list-*`, `--ki-list-item-*`); no density or size axes

**Decision**: new DTCG sources under `packages/tokens/tokens/component/`:

- `list.tokens.json` — theme-neutral schema (onmars values by inheritance),
  one file for the composite: the DTCG group `ki.list.*` emits
  `--ki-list-*` and the nested group `ki.list.item.*` emits
  `--ki-list-item-*` (the kebab-join name transform shipped since 001, as
  `button.tokens.json` proves).
  - `ki.list.{bg,padding,gap}` (3): surface from the `ki.surface.s0–s5`
    ramp (which step is the onmars theme decision recorded in the file);
    `padding` and `gap` from `ki.space.*` (onmars: gap-based separation,
    D3).
  - `ki.list.item.{min-height,min-height-multiline,padding-inline,padding-block,gap,radius,divider-width,divider-color}`
    (8) plus `ki.list.item.{primary|secondary}-{font-size,line-height,font-weight,fg}`
    (8): min-heights from the `ki.space.*` ramp — **exactly two steps**,
    one-line and multi-line, per FR-003's discriminator; text from
    `ki.typography.{size,line-height,weight}.*` roles; `primary-fg` →
    `ki.text.high-em`, `secondary-fg` → `ki.text.med-em` (the 001 text
    emphasis levels the spec's design analysis maps to the two lines);
    `divider-*` per D3.
  - Total: 19 tokens per theme.
- `list.material3.tokens.json` — material3 overrides for the same names:
  M3 surface/container color, one-line vs two/three-line min-heights, M3
  type roles (body-large / body-medium equivalents from the shipped
  vocabulary), hairline divider + zero gap (D3).

**Verified against the spec**: no density axis exists — no `size`
attribute, no xs–xl ramp for lists (the spec's design analysis found no
evidence lists scale through MarsUI's metric ramp, and M3 scales by line
count); the only height vocabulary is the two min-height steps. Anything
more would be speculative (Art. VII).

**One declared addition**: `ki.list.item.padding-block` does not appear in
the constitutional surface's token enumeration (which lists
`padding-inline`). It is needed so S10's wrapped text does not sit flush
against the block edges once content grows past the min-height — min-height
alone centers one-line content but provides no breathing room for grown
items. Folding block padding into min-height fails exactly in the S10
growth case. Flagged for gate-1 ratification as an additive refinement of
the declared surface (plan.md echoes it; batched founder question).

**Contrast gate** (Art. X): the component-layer sweep in
`packages/tokens/scripts/check-contrast.mjs` matches only `--ki-button-*`
pairs today (`COMPONENT_BG_PATTERN`, line ~170). The list's text pairs —
`--ki-list-item-primary-fg` and `--ki-list-item-secondary-fg`, each on
`--ki-list-bg` — join the sweep at the standard **4.5:1 text minimum**
(these are real text inks, unlike 007/008's 3:1 non-text indicators), in
the same change that introduces the tokens: a finding a rule could produce
gets ruled, never left to review. Batch coordination: 009/010/011 extend
the same sweep and the same `LAYERS`/`MATERIAL3_LAYERS` arrays on sibling
branches — extensions are appends; whoever lands second rebases and
re-runs the tokens gates (note carried in tasks.md).

**Alternatives considered**: (a) two source files (`list.tokens.json` +
`list-item.tokens.json`, the 007 radio/radio-group split) — 007 split
because the group file was theme-invariant while the radio matrix had M3
overrides; here both families take material3 overrides, so one pair of
files is the smaller wiring surface; rejected. (b) component CSS
referencing semantic tokens directly — themes could not restyle the list
(divider vs spacing trade-off) without touching component CSS; rejected
(002 D4 / 009 D2 reasoning verbatim).

## D5 — Text behavior: wrap and grow only; zero truncation machinery

**Decision**: primary and secondary text wrap naturally and grow the item
vertically past its min-height (min-block-size, never a fixed block-size).
No `text-overflow`, no line-clamp, no ellipsis tokens, no internal scroll
container — nothing exists to truncate (S10 and the spec's edge case:
consumers manage overflow in v1). M3's three-line item is wrapped secondary
text, not a dedicated region (spec assumption — Art. VII).

**Rationale**: S10 pins wrap-and-grow as the only overflow behavior; any
truncation surface (a `lines` token, a clamp) would be an unapproved
behavior axis and a future compatibility burden (Art. VII/IX). Additive
later if a spec ever approves it.

## D6 — Tests and traceability

**Decision**: all test files marked `// @spec:016-ki-list`, S-IDs on code
lines (test titles), mirroring 009 D4 with the 007 D9 composite file
conventions:

- `ki-list.spec.tsx` + `ki-list-item.spec.tsx` (mock-doc, fast, rendered
  together via `newSpecPage` where composition matters): anatomy — internals
  roles `list`/`listitem`, parts `list` and `item`/`start`/`content`/`end`
  in reading order; S3 emptiness flags collapse regions (whitespace-only
  default and secondary slots count as empty — exhaustive unit cases for
  the emptiness predicate, the 009 D1 mutation-gap compensating control);
  the has-secondary flag switches the min-height class (FR-003
  discriminator, both directions); S4 an unrecognized
  `variant="two-line"` attribute changes nothing observable.
- `ki-list.browser.spec.ts` (real browser, built output — the S-ID
  carrier): S1 three items stack in source order (geometry); S2 avatar
  leads, primary above secondary, meta trails (geometry); S3 a text-only
  item reserves no space for absent regions; S10 long secondary text wraps
  and grows the item past the one-line item's height, no truncation or
  scrolling; S5 Tab lands on the slotted switch, skipping list and items;
  S11 keyboard activation toggles the switch exactly once; S6 the computed
  accessibility tree exposes a list of exactly three items, each named by
  its text, no interactive role (D1's verification point); S7 material3
  theme restyle via injected built stylesheets (001/002 pattern) — spacing,
  separation (divider appears) and text styles resolve to material3 values
  with unchanged markup; S9 RTL document — start content leads, end content
  trails (geometry under `dir="rtl"`); axe zero violations across region
  subsets × themes.
- `ki-list-item.browser.spec.ts` (generator-scaffolded): anatomy-only
  assertions (parts exposed, region collapse geometry on a lone item is NOT
  asserted here — an item outside a list is unsupported, FR-012); defers
  every S-ID scenario to the list suite, recorded in its header comment so
  traceability stays honest (007 D9 convention).
- `ki-list.dark.browser.spec.ts`: S8 forced dark under onmars + axe in dark
  (the ki-button.dark precedent: forced scheme isolated in its own file).

**Rationale**: the traceability gate requires S-IDs on code lines of marked
files; the browser suite asserts what ships (`dist/components/ki-list.js` +
`dist/components/ki-list-item.js`); mock-doc covers the pure predicate
branches. RED first per Art. III. All 11 approved scenarios (S1–S11) map to
test tasks (tasks.md Notes carries the full map).

## Addendum (review round 1): role delivery corrected to reflected attribute

D1 originally set `list`/`listitem` via `ElementInternals.role`. Verification
against the REAL accessibility tree (Playwright `ariaSnapshot`, added as a
reusable browser command) proved the browser did NOT expose those default
roles to the AX tree in the shipped custom-elements build — the list rendered
as bare text, with no `list`/`listitem` nodes. The original S6 test masked
this by reading `ElementInternals.role` back (circular: the getter returns the
value set regardless of AX application) and was additionally backed by an
`Object.defineProperty` fallback that forced the read-back to succeed.

Corrected decision: reflect `role="list"` / `role="listitem"` on the hosts
(rendered via `<Host role=…>`). This is portable and verifiable, and keeps the
`list`→`listitem` ownership co-tree through the internal generic wrapper. S6
now asserts the Playwright `ariaSnapshot` shows a `list` owning exactly the
three named `listitem`s — the component's defining contract (FR-005) is proven
in the accessibility tree, not read back. The gaming fallback and the
`element.internals` test seam were removed.
