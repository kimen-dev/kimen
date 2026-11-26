# Feature Specification: A page loads only the token CSS its components need

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VI (Closed
     Tokens, Layered Customization) and Art. IX (Public API Stability), with
     Arts. I, II and IV. -->

**Feature Branch**: `docs/spec-166-tokens-split` (spec `166-tokens-core-and-component-sheets`)

**Created**: 2026-11-25

**Status**: Approved. On 2026-11-25 the founder approved S1 to S11 and the
recommended answers ("Aprobado con tus respuestas", relayed by the
coordinating session). The question was whether they approved the contract
as follows: option (c), with the full sheet unchanged and
`@kimen/tokens/css/core` and `@kimen/tokens/css/ki-<tag>` added; F1 for the
foundations; one sheet per tag; the names `css/core` and `css/ki-<tag>`;
material3 kept whole; the full sheet as the documented default, with the
`kimen-components` skill offering the split as the light option; and budgets
of 7,000 B for the core, 8,300 B with `ki-button`, 11,400 B with ten
components and 2,200 B per tag sheet. Q5 was not taken up and is out of
scope. The answers are recorded under *Resolved questions*.

**Amended 2026-11-26**: the founder approved step 2 of the Stencil and Lit
report, relayed by the coordinating session. The core and the tag sheets
become the documented default, and the full sheet stays documented as the
simple alternative. The page-weight gate of `@kimen/elements` measures the
split as its primary figure and keeps a full-sheet line. This reverses D6,
Q6 and the last sentence of FR-010. No export, sheet or value changes, so
S1 to S11 stand as written.

**Input**: The weight report of 2026-11-25 (opportunities 5 and 9). A page
with one `ki-button` downloads the whole onmars token sheet, 20.7 KB brotli,
and reaches about 11 % of its declarations. Component tokens are about two
thirds of the sheet. Measured again for this spec on `origin/main` at
`a64037fc`.

**Constitution check**: Art. II requires this contract. It adds public
exports to `@kimen/tokens` and a second way for component tokens to reach a
page. Art. VI: every override keeps working without `!important`. Art. IX:
the change is additive (MINOR). Art. IV: the metrics and their measurement
come before any code (below). Art. I: an agent must be able to wire the split
from the tag name alone.

## Design-source analysis

Not applicable. No token value, component style or visual result changes.

## The problem, measured

Measured on `a64037fc` with the workspace esbuild 0.28.2 (CSS minify, the
way a consumer bundler ships a sheet), Node's brotli at quality 11 and gzip
at level 9. KB = 1,000 bytes. The prototype sheets were cut from the
published `tokens.css` declaration by declaration, so every value is the
published one. Scripts and outputs live in the session scratchpad
(`tokens-split-166-w9k2/`) and are not part of this change.

- `@kimen/tokens/css` declares 3,714 custom properties: 217.9 KB minified,
  20,702 B brotli. size-limit reports 20,686 B against a 20,724 B budget.
- 2,488 of those declarations (65.7 % of the bytes) come from the 90
  component token sources (`tokens/component/<name>.tokens.json`). Nine
  sources declare names other than their file name (`code-block` declares
  `--ki-code-*`, `conversation` `--ki-message-*`, `top-nav` `--ki-app-*`), so
  the split follows source files, not name prefixes.
- Only six core declarations read a component token, all
  `--ki-foundation-onmars-v1-dialog-*` and `-tooltip-*`. Without the
  foundations, the core never reads a component token.
- 23 component tokens take a preference-mode value (borders, dividers and
  several inks under more contrast; two alert fills under reduced
  transparency). Their `!important` mode rules have to travel with them.
- One component source aliases another: `fab-menu` reads `fab`.
- Of the 107 tags, 63 need tokens from a source other than their own,
  mostly through the tags they render in their shadow tree (34 sheets
  include `ki-icon`'s tokens). Three tags need no component token at all,
  because their parent paints them: `ki-option`, `ki-source` and
  `ki-breadcrumb-item`.
- 268 `--ki-foundation-*` declarations (18.4 KB raw, about 1.85 KB brotli)
  are read by no onmars token. material3 reads 97 of them from the onmars
  sheet; nothing reads the other 171. The public token inventory does not
  list them (it lists the semantic and component layers only), and no
  document names them.

### Weight per page

| Page | Full sheet today | Core and tag sheets (no foundations) | Same, foundations kept in the core |
|---|---:|---:|---:|
| The core alone | | 6,809 B br (56.8 KB min) | 8,661 B br |
| `ki-button` | 20,702 B br | 8,110 B br (−61 %) | 9,917 B br |
| Ten-component page, one deduplicated bundle | 20,702 B br | 11,067 B br (−47 %) | 12,889 B br |
| Ten-component page, self-contained tag sheets | 20,702 B br | 11,186 B br, 153 KB min (−46 %) | |
| All 107 tags, self-contained tag sheets | 20,702 B br | 19,923 B br, 454 KB min | |

The ten-component page is the report's: `ki-button`, `ki-input`,
`ki-select`, `ki-checkbox`, `ki-dialog`, `ki-card`, `ki-tabs`, `ki-alert`,
`ki-toast` and `ki-table`, with the children they need (`ki-option`,
`ki-tab`, `ki-tab-panel`, `ki-toaster`). Together they need 17 component
sources. The largest single tag sheet is `ki-prompt-input`'s, 2.0 KB br
(five sources); the median is 380 B br. A page that uses most of the
catalog is better served by the full sheet.

material3 over the core: inlining the 97 foundation values it reads costs
19 B br (5,493 to 5,512 B). Declaring them in the material3 sheet instead
costs 772 B br.

### Style recalculation (not measured by the report)

A synthetic page in headless Chromium (Playwright 1.65.1, macOS, Apple
silicon): 1,000 shadow hosts modelled on `ki-button` (private aliases on
`:host`, a dozen `var()` reads). Each figure is the median of ten runs, each
averaging 20 changes.

| Root-level change | No tokens | Full sheet | Core and `ki-button` |
|---|---:|---:|---:|
| A token set on `:root`, unthrottled | 0.94 ms | 2.05 ms | 1.32 ms |
| The same, CPU slowed ×4 | 4.09 ms | 12.07 ms | 6.69 ms |
| `data-ki-color-scheme` toggled, ×4 | 0.00 ms | 12.15 ms | 7.08 ms |
| `data-ki-contrast="more"` toggled, ×4 | 0.00 ms | 12.05 ms | 6.48 ms |
| Inserting the 1,000 hosts, ×4 | 21.0 ms | 24.6 ms | 23.2 ms |

A root-level change makes the engine resolve the root's declarations
again; a themed region whose values change should repeat that work on its
own root (not measured). On this page the full sheet's extra 2,400
declarations cost about 5 ms per change at ×4, a third of a frame, and the
split takes 35 to 45 % off each change. This is indicative only: one
machine, one engine, synthetic hosts. Real components, Firefox and WebKit
are not measured.

## Options weighed

| | (a) Tag sheets replace the full sheet | (b) Elements adopt their own token sheet | (c) Full sheet kept; core and tag sheets beside it |
|---|---|---|---|
| One-component page | 8.1 KB br | 6.8 KB br of CSS plus about 1.5 KB br of tokens inside the element's JS | 8.1 KB br once the page opts in |
| Existing pages | Every `@kimen/tokens/css` import must change: a major | CSS unchanged, but each element module grows by its tokens (`ki-button` +18.7 KB min, ≈1.5 KB br), paid twice by every page that keeps the full sheet | Unchanged: the full sheet and the page contract byte-for-byte, material3 value for value (D1) |
| An override on `:root`, no `!important` | Works when loaded after Kimen's sheets | Declared on `:host`, it breaks: the host's own declaration beats the inherited override. Adopted into the document, it works only at zero specificity | Works; for component tokens in any load order (D4) |
| Themes and modes | Same selectors as today | On `:host`, material3's component overrides and `[data-ki-contrast]` on an ancestor no longer reach the host (`:host-context()` is not cross-engine) | Same selectors as today |
| SSR and Declarative Shadow DOM (a deferred bet) | Static CSS ships with the HTML | Component tokens exist only once the script defines the element | Static CSS ships with the HTML |
| CSP | Plain stylesheet files, `style-src 'self'` | Constructable sheets are created by script; a `<style>` fallback would need a nonce | Plain stylesheet files, `style-src 'self'` |
| Caching | The core is cached once across routes, tag sheets per chunk; unbundled pages make one request per sheet | Tokens travel with the element's JS | As (a), and the full sheet stays one file |
| Package coupling | None | `@kimen/elements` embeds `@kimen/tokens` build output: a new build dependency | None |
| Foreign shadow roots and iframes | Load the sheets where needed, as today | A document-level sheet reaches the main document only | As (a) |
| Agent legibility | Every page wires one sheet per tag; a forgotten sheet paints wrong silently | Nothing to wire | The default stays one import; the optimization is one import per tag, named like the element import |

## Recommendation

**Option (c).** It is the only option that keeps every existing import
working with the same tokens and values (the full sheet and the page
contract byte for byte). It works without script, under any CSP and with any
bundler or none, and it leaves `@kimen/elements` untouched. It gives a page that opts in
the full saving of (a): 8.1 KB br for a `ki-button` page instead of
20.7 KB, and 35 to 45 % less root-level recalculation. Option (b) is the best
for agent legibility, but it makes every existing page heavier and couples
the two packages. It could be layered on top of (c), because it would adopt
exactly the sheets (c) publishes; the founder left that out of scope (Q5).

## Design decisions (approved)

- **D1 · Foundations.** The core and the tag sheets declare no
  `--ki-foundation-*`. material3 inlines the 97 foundation values it reads,
  as the build already does for its type scale, motion and shape
  foundations, so it works over the core: +19 B br, and every material3
  token keeps its value. The full sheet keeps all 268 foundations
  unchanged. This saves 1.85 KB br on every split page and removes no name
  from any existing export. Approved as F1 (Q1).

  **Amendment (2026-11-26).** The full sheet keeps the four published
  onmars v1 foundation tokens for the legacy dialog and tooltip under
  spec 062 S4 until 1.0.0. It omits the 264 private foundation declarations.
  material3 drops its private overrides and inlines the two foundation
  shadow expressions it still reads, preserving the resolved theme values.
  This supersedes spec 060's instruction to keep the private declarations.
- **D2 · One self-contained sheet per tag.** `css/ki-pagination` carries
  every component source `ki-pagination` needs: its own, and the button,
  icon-button, icon and counter sources of the components it renders.
  Two sheets that share a source declare it twice with identical selectors
  and values, which is cascade-neutral: about +0.1 KB br on the ten-component
  page. In exchange, a component's internal composition never leaks into
  the page's imports. If a later release makes `ki-alert` render `ki-badge`,
  pages that import `css/ki-alert` keep working.
- **D3 · Names.** `@kimen/tokens/css/core`, and `@kimen/tokens/css/ki-<tag>`
  through one `./css/ki-*` export pattern, mirroring `@kimen/elements/ki-*`.
  The `ki-` prefix keeps tag sheets apart from theme names.
- **D4 · Specificity.** A tag sheet declares its tokens on
  `:where(:root), :where([data-ki-theme])`, at zero specificity. A bundler
  that splits CSS per route inserts a tag sheet late, after the page's own
  overrides; at zero specificity the page's `:root` override still wins.
  The core keeps the full sheet's selectors (`:root, :where([data-ki-theme])`)
  so core tokens behave exactly as they do in the full sheet. Mode rules keep
  their selectors and `!important` in both.
- **D5 · material3 stays whole.** It is opt-in, 5.5 KB br, and the reference
  second theme. Splitting it would double the export matrix for a theme no
  known consumer ships per component. Approved (Q4).
- **D6 · The full sheet stays the documented default.** Guides and the
  `kimen-components` skill keep `import '@kimen/tokens/css'` first and
  present the split as the light option. Approved (Q6). Reversed on
  2026-11-26 (see the amendment under *Status*): guides and both agent
  skills now lead with the core and the tag sheets.
- **D7 · Generated, never hand-written.** The sources each tag sheet carries
  are derived by the build from the compiled component styles (shared field
  styles included) and the tags each component renders, the same inputs that
  already produce each component's CSS custom-property documentation.

## Rejected alternatives

- **(a) alone, retiring the full sheet.** It breaks every consumer, needs a
  major and a deprecation cycle, and gives nothing (c) does not.
- **(b) with component tokens on `:host` inside the shadow root.** The host's
  own declaration beats the inherited value, so `:root` overrides of
  component tokens, material3's component overrides and the declared
  more-contrast activation on an ancestor stop applying. That breaks Art. VI.
- **Defaults in `var()` fallbacks inside component CSS**, with the global
  sheet keeping only reassigned tokens (the report's second form). It moves
  every default into element JS, empties `getPropertyValue()` on the root,
  and has no place for the 23 `!important` mode re-pointings. It also
  rewrites the DTCG layer contract.
- **One public sheet per component source, with the page listing them.** No
  duplicates, but the page must know each component's internal composition
  (63 tags need more than their own source), and a composition change in a
  minor release would break it silently.
- **`@import` chains from tag sheets to source sheets.** Bundlers
  deduplicate them, but unbundled pages get a request waterfall.
- **Cascade layers for the split sheets.** They would give the same order
  independence as `:where()`, but they bring a new cascade concept into the
  published CSS. They also reverse the mode rules' standing: a layered
  `!important` outranks every unlayered one, so a page could no longer
  override a mode rule at all. `:where()` is the idiom the sheet already uses
  for `color-scheme`.
- **Splitting by scheme or by mode.** `light-dark()` is 17.4 KB raw and the
  modes 6.2 KB raw; separating them breaks scheme switching without script
  for little weight.
- **Pruning per page to the tokens a page reaches.** Semantic tokens, scales
  and primitives are API for the application's own CSS.
- **Minifying the published sheet** (studied as a no-contract change).
  Every bundler already minifies it, so a bundled page would receive the
  same bytes; size-limit already measures the minified sheet; and it would
  drop the deprecation comments that spec 041 publishes on purpose.

## Resolved questions

Answered by the founder on 2026-11-25 ("Aprobado con tus respuestas"): each
question takes the recommended answer.

1. **Q1 · Foundations (D1): F1.** The core and the tag sheets carry no
   `--ki-foundation-*`. material3 inlines the 97 foundation values it reads.
   The full sheet keeps all 268. The alternatives were F2, which also
   deprecates the 268 in the full sheet through spec 041's cycle, and F3,
   which keeps them in the core for third-party themes at 1.85 KB br per
   split page.

   **Amendment (2026-11-26).** The founder approved omitting the 264 private
   foundations from the full sheet and retaining the four published onmars
   v1 foundations until 1.0.0 (D1). This supersedes
   spec 060's instruction to keep the private declarations.
2. **Q2 · Granularity (D2): one self-contained sheet per tag.** The
   alternative was one sheet per component source with a generated list per
   tag.
3. **Q3 · Names (D3): `css/core` and `css/ki-<tag>`.** The alternative was
   `css/components/ki-<tag>`.
4. **Q4 · material3 (D5): kept whole.** The alternative was splitting it
   into a core part and per-tag parts too.
5. **Q5 · A later option (b): not taken up; out of scope.** Elements do not
   adopt their own tag sheet, in this feature or as a follow-up it commits
   to.
6. **Q6 · Documented default (D6): the full sheet stays the default.** The
   `kimen-components` skill and the token README offer the core and tag
   sheets as the light option. Reversed on 2026-11-26: the core and the tag
   sheets are the default, the full sheet the simple alternative.
7. **Q7 · Budgets: approved.** The core 7,000 B, the core with `ki-button`
   8,300 B, the ten-component page 11,400 B, and 2,200 B for each tag sheet,
   all brotli. The full sheet keeps its budget.
8. **Q8 · The package's install size: raised.** The contract measured page
   weight, not install size. One sheet per tag repeats shared sources on
   disk, so the implementation took `@kimen/tokens` from 213,013 B packed
   and 504,037 B unpacked to 268,679 B and 1,190,678 B. That was past its
   tarball budget (`scripts/lib/package-contents.mjs`, 220,160 / 519,168 B).
   Even per-source sheets would have added about 220 KB unpacked. On
   2026-11-25 the founder approved raising the budget to 276,736 B packed
   and 1,226,400 B unpacked, the measured size plus 3 % ("Sí, apruebo",
   relayed by the coordinating session).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An application ships only the tokens its page uses (Priority: P1)

An application with a sign-in page imports `@kimen/elements/ki-button` and
`ki-input`. It imports the core and those two tag sheets instead of the full
sheet. The page looks the same and its token CSS is well under half of
what it was (8.6 KB br instead of 20.7).

**Why this priority**: it is the saving the report measured, on every page.

**Independent Test**: render a tag with the core and its sheet, and with the
full sheet, and compare computed styles and the bytes shipped.

**Acceptance Scenarios**: S1, S2, S3, S10.

---

### User Story 2 - Existing applications notice nothing (Priority: P1)

An application that imports `@kimen/tokens/css` upgrades and changes
nothing. Every token keeps its value in every theme, scheme, mode and
density.

**Independent Test**: compare the stylesheet surface of the existing exports
before and after.

**Acceptance Scenarios**: S8, S9.

---

### User Story 3 - Theme authors and overrides keep working (Priority: P1)

A brand overrides a semantic token on `:root`, a component token for one
component, and uses material3 for one region. All of it applies on a split
page as on a full one, with no `!important`, even when a route loads a tag
sheet late.

**Acceptance Scenarios**: S4, S5, S6, S7.

---

### User Story 4 - An agent wires the split from the tag name (Priority: P2)

An agent that imports `@kimen/elements/ki-pagination` finds, in the
generated documentation, the one token sheet to import with it, without
knowing which components `ki-pagination` renders.

**Acceptance Scenarios**: S11.

### Edge Cases

- **A tag rendered without its sheet.** Its component tokens are undefined
  and it paints with initial values, silently. This is the reason the full
  sheet stays the default (D6). A development-time warning is out of scope.
- **A route chunk that inserts a tag sheet after the page's overrides.**
  Zero specificity keeps the page's `:root` override winning (S5). A page
  override of a *core* token still has to come after the core, as it has to
  come after the full sheet today.
- **The full sheet and tag sheets on one page** (an application migrating,
  or a micro-frontend that loads its own tag sheets): identical values, so
  nothing changes (S9).
- **Kimen inside another application's shadow root.** Load the core and the
  tag sheets inside that root, as the full sheet is loaded there today.
- **Script that reads a component token on the root** with
  `getPropertyValue()` gets an empty string when that tag's sheet is not
  loaded. The token reference documents it.
- **Unbundled pages** (`<link>` from a CDN) make one request per sheet. With
  many tags, the full sheet is better.
- **Tags that need no component token** (`ki-option`, `ki-source`,
  `ki-breadcrumb-item`) ship an empty sheet, so "one import per tag" never
  has an exception.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: A page loads only the token CSS its components need
  Beside the full token sheet, @kimen/tokens publishes a core sheet and one
  sheet per component tag. A page that loads the core and the sheets of the
  tags it uses paints those components as the full sheet does, keeps every
  theme, preference mode and override working without !important, and ships
  a fraction of the token CSS.

  Rule: The core plus a tag's sheet paints that tag as the full sheet does

    # S1
    Scenario: A page with one component loads only the core and that component's tokens
      Given a page that loads the core token sheet and the ki-button sheet
      When the page renders a primary ki-button
      Then the button looks as it does with the full token sheet
      And the page declares no token of any other component

    # S2
    Scenario: Every component renders with the core and its own sheet as it does with the full sheet
      Given each registered ki-* tag on a page that loads the core and that tag's sheet
      When the tag renders its default gallery state
      Then its computed styles equal those it has with the full token sheet

    # S3
    Scenario: A component that renders other components brings their tokens in its own sheet
      Given a page that loads the core and the ki-pagination sheet only
      When the page renders a ki-pagination with 12 pages
      Then its buttons and icons look as they do with the full token sheet

  Rule: Themes, preference modes and overrides restyle a split page as they restyle a full one

    # S4
    Scenario: A semantic override on the root restyles a component painted from the split sheets
      Given a page that loads the core and the ki-button sheet
      And a page stylesheet loaded after them that sets --ki-surface-primary-med-em to "#7a1fa2" on :root
      When the page renders a primary ki-button
      Then the button's background is "#7a1fa2"

    # S5
    Scenario: A component override on the root wins even when the component's sheet loads later
      Given a page stylesheet that sets --ki-button-md-height to "3rem" on :root
      And the ki-button sheet loads after that stylesheet
      When the page renders a medium ki-button
      Then the button is 3rem tall

    # S6
    Scenario: A Material 3 region restyles a split-sheet component as it does with the full sheet
      Given a page that loads the core, the ki-button sheet and the material3 sheet
      When a region of the page declares data-ki-theme "material3"
      Then a primary ki-button inside it looks as it does under material3 with the full token sheet

    # S7
    Scenario: More contrast reaches the component tokens of a split sheet
      Given a page that loads the core and the ki-card sheet
      When the person prefers more contrast
      Then the card's border takes its more-contrast colour and width, as with the full token sheet

  Rule: Every existing import keeps working

    # S8
    Scenario: The existing stylesheets keep every token and value they publish today
      Given an application that imports @kimen/tokens/css, @kimen/tokens/css/base and @kimen/tokens/css/material3
      When it is built against the release that adds the split sheets
      Then every token resolves to the value it had before, in every theme, scheme, preference mode and density

    # S9
    Scenario: Loading the full sheet together with split sheets changes nothing
      Given a page that loads the full token sheet and the ki-button sheet
      When the page renders a primary ki-button
      Then the button looks as it does with the full token sheet alone

  Rule: The split stays within its measured budget

    # S10
    Scenario Outline: The token CSS of a page stays within its budget
      Given the published sheets of <page>, minified and brotli-compressed as a bundler ships them
      When the token budgets are measured
      Then they weigh at most <budget> bytes, against the full sheet's budget of 20,724

      Examples:
        | page                                | budget |
        | the core alone                      | 7,000  |
        | the core and ki-button              | 8,300  |
        | the core and the ten-component page | 11,400 |

  Rule: Agents and people can wire the split from the tag name alone

    # S11
    Scenario: A component's documentation names the token sheets it needs
      Given the generated agent and site documentation of ki-pagination
      When a reader looks up how to load the component's tokens
      Then it names @kimen/tokens/css/core, once per page, and @kimen/tokens/css/ki-pagination
```

Scenario vocabulary:

- **The core token sheet** is `@kimen/tokens/css/core`; **the ki-button
  sheet** is `@kimen/tokens/css/ki-button`; **the full token sheet** is
  `@kimen/tokens/css` as published today.
- **Looks as it does** means equal computed styles on the host and on every
  exposed part, and on the tags it renders in its shadow tree.
- **Declares no token of any other component**: on the root,
  `getPropertyValue()` returns an empty string for every token of a
  component source the tag does not need (for example
  `--ki-alert-shell-bg`).
- **Loads after that stylesheet** (S5): the tag sheet is inserted later in
  document order, as a route chunk inserts its CSS.
- **The ten-component page** is the weight report's set, listed under
  *Weight per page*, with the children those tags need.
- **Measured** (S10): size-limit, as the existing token budgets measure.
  The budgets assume D1 = F1, as approved (Q1).

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

This is a token-package feature, not a UI component. The families apply to
the components the split sheets paint.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S8, S9, S10, S11 | |
| Keyboard path | | N/A — token sheets add no interaction; every component keeps its own keyboard contract |
| Assistive-tech outcome | | N/A — token sheets expose nothing to the accessibility tree; the more-contrast preference is S7 |
| Form participation | | N/A — no form-associated behaviour changes |
| Theming | S4, S5, S6, S7 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (existing exports)**: `@kimen/tokens/css` MUST keep declaring every
  token it declares today, with the same expression, in the same rules.
  `@kimen/tokens/css/base` MUST NOT change. `@kimen/tokens/css/material3`
  MUST resolve every token to the value it has today in every context; under
  D1 its expressions may name a literal where they named a foundation. The
  public stylesheet surface recorded for these three exports MUST NOT change.

  **Amendment (2026-11-26).** The declaration requirement for
  `@kimen/tokens/css` applies to the public token surface, including the four
  published onmars v1 foundations until 1.0.0. The full sheet MUST omit the
  264 private foundations, superseding spec 060's instruction to keep their
  declarations. material3 may inline private foundation expressions to
  preserve their resolved values.
- **FR-002 (core)**: `@kimen/tokens/css/core` MUST declare the colour-scheme
  contract and every token whose DTCG source is not a component token source
  (`tokens/component/*.tokens.json`): primitives, the theme, semantic tokens,
  mode values, the document-inherited density tokens and their levels, and
  the private backdrop defaults. It MUST use the full sheet's selectors,
  rules and expressions, with the mode rules limited to those tokens. Under
  D1 = F1 it MUST NOT declare `--ki-foundation-*`. It MUST NOT reference a
  token it does not declare.
- **FR-003 (tag sheets)**: for every tag `@kimen/elements` registers,
  `@kimen/tokens/css/ki-<tag>` MUST declare every token of every component
  source the tag needs, which means:
  - the sources its compiled shadow styles read, shared field styles
    included;
  - followed through token aliases (`fab-menu` reads `fab`);
  - and through the tags it renders in its own shadow tree, transitively.

  The tokens MUST be declared on `:where(:root), :where([data-ki-theme])`.
  The sheet MUST also carry those tokens' preference-mode rules exactly as
  the full sheet writes them, and each deprecated token's deprecation
  comment. A tag that needs no component token MUST ship an empty sheet.
- **FR-004 (no drift)**: every declaration of the core or of a tag sheet MUST
  carry the expression the full sheet gives that token. The core and all tag
  sheets together MUST declare exactly the full sheet's tokens, apart from
  the foundations D1 leaves out. A gate MUST fail on any difference.
- **FR-005 (derivation)**: which sources each tag sheet carries MUST be
  derived by the build from the compiled component styles and the render
  graph, never written by hand (D7). A tag that reads a component token its
  sheet does not declare MUST fail a gate; S2's browser sweep is the
  runtime proof.
- **FR-006 (cascade)**: Kimen's split sheets MUST be order-independent among
  themselves and against `@kimen/tokens/css/material3`. A page's normal
  declaration MUST win over a tag sheet's, in any load order, when made on
  `:root` or on a theme root. It MUST win over the core when it comes after
  the core, as over the full sheet today. No override MAY need `!important`
  (Art. VI).
- **FR-007 (material3 over the core)**: `@kimen/tokens/css/material3` MUST
  NOT read any token that the core and the tag sheets do not declare. Under
  D1 = F1 it inlines the 97 foundation values it reads from the onmars sheet
  today.
- **FR-008 (exports and API)**: the package exports MUST gain `./css/core`
  and the `./css/ki-*` pattern, and every existing key MUST stay. The public
  stylesheet surface MUST describe the new exports, and the additions MUST be
  declared (`pnpm api:declare`).
- **FR-009 (budgets)**: size-limit MUST measure the core, the core with
  `ki-button`, the ten-component page and the largest tag sheet against the
  budgets of S10 and Q7. The full sheet MUST keep its own budget.
- **FR-010 (documentation)**: the token README, the theming and framework
  guides, the token reference and each component's generated site and agent
  documentation MUST name the core and the component's tag sheet. The full
  sheet MUST stay the first, default path (D6). Amended 2026-11-26: the core
  and the tag sheets are the first, default path, and the full sheet MUST
  stay documented as the simple alternative.
- **FR-011 (scope)**: the runtime code and published modules of
  `@kimen/elements`, the framework wrappers, the catalog, the MCP Apps
  document and `kimen-mcp` MUST NOT change in this feature; they keep loading
  or embedding the full sheet. Only the generated documentation of
  `@kimen/elements` gains each tag's sheet (FR-010).

### Key Entities

- **Component token source**: one `tokens/component/<name>.tokens.json` file
  and its material3 overlay; 90 today.
- **Core sheet**: everything in the full sheet that no component source
  declares, foundations aside (D1).
- **Tag sheet**: the tokens of every component source one tag needs, at zero
  specificity, with their mode rules.
- **Tag closure**: the component sources a tag needs, derived from its
  compiled styles and the tags it renders.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): additive. Two new export keys,
  `./css/core` and the `./css/ki-*` pattern; no export, token or value is
  removed or renamed (F2 would deprecate the foundations, removing them only
  at a major). MINOR.
- **Bundle budget** (Art. IV): the full sheet unchanged (20,686 B br
  measured against its 20,724 B budget). The package's tarball budget rises
  to 276,736 / 1,226,400 B (Q8). New
  budgets as in S10 and Q7. material3 +19 B br under D1 = F1, inside its
  352 B of headroom. No runtime dependency.
- **Accessibility** (Art. V): unchanged. The contrast gate sweeps the
  compositions, which do not change; S7 proves a preference mode reaches a
  component painted from a tag sheet.
- **Tokens** (Art. VI): no token added, removed or revalued. The same token
  set reaches a page in smaller pieces. Every override stays
  `!important`-free (FR-006).
- **Catalog/agent legibility** (Art. I): each component's generated
  documentation names its tag sheet (S11); a tag sheet is named after the
  element import.
- **Guardrail/security boundary** (Art. VIII): none.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: a page with one `ki-button` ships at most 8,300 B br of token
  CSS, against 20,724 B for the full sheet (8,110 B measured, 39 %).
- **SC-002**: every one of the 107 tags renders with the core and its own
  sheet with the computed styles it has with the full sheet (S2: no
  exceptions).
- **SC-003**: the stylesheet surface of `./css`, `./css/base` and
  `./css/material3` is unchanged (S8).
- **SC-004** (reported, not gated): with the CPU slowed ×4, the root-level
  recalculation of the synthetic 1,000-host page, measured again on the
  implementation, stays at or below 60 % of the full sheet's (55 % today).

## Assumptions

- **Out of scope:** a development-time warning for a tag rendered without
  its sheet; the MCP Apps document and `kimen-mcp` switching to the core
  (the report's opportunity 4 is the place for that); a page budget for JS
  and CSS together; the elements adopting their own sheet (Q5, not taken
  up).
- **The tag-to-source map** comes from the same compiled styles that already
  produce each component's CSS custom-property documentation. Building it
  needs the elements' styles before the token sheets are written; the plan
  settles the order, for example a generated, committed map that the
  token build reads and the generated-sync gate verifies.
- **Measurements** were taken on macOS with Node's zlib; CI on Linux differs
  by about 1 %. Budgets are re-measured on the implementation branch, and
  any re-base is the founder's decision.
