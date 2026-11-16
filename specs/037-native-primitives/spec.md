# Feature Specification: Native primitives

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. VIII (Neutral
     Catalog, Disposable Adapters), with Arts. I, II, III, IV, V, VI, VII and IX. -->

**Feature Branch**: `claude/feat-native-primitives-501285` (spec `037-native-primitives`)

**Created**: 2026-11-16

**Status**: Draft — awaiting founder confirmation of the guardrail scenarios

**Input**: "A generated UI (a catalog `UiSpec`) must be able to carry text,
layout and images as native HTML elements, not only `ki-*` components, from
a closed list and always through the guarded renderer. The founder chose
native HTML over `ki-text`/`ki-stack`/`ki-image` components."

**Constitution check**: behavior enters the system exactly once, here
(Art. II). This feature widens a guardrail surface (Art. VIII): for the
first time a non-custom element reaches `createElement` from spec data.
S2, S3, S4, S6, S7, S9, S10, S16, S17, S19 and S20 are security-boundary
scenarios and require explicit standalone founder confirmation before any
code is written.

## Design-source analysis

Not applicable as a visual design: native primitives have no visual
identity of their own. Text inherits the host page's typography, layout
spacing resolves from the existing `--ki-space-*` tokens, and images are
the agent's content. The design sources are the Art. VIII invariants, the
guarded renderer of `028-guarded-renderer` (its pipeline is reused, never
relaxed), the URL policy of `027`/`028`, the catalog value of
`032-catalog-registration`, the live surface of `035-live-surface`, and the
gaps the A2UI adapter documents today (`Image` unmapped, `Row`/`Column`
flattened, a `ki-card` as forced root container).

## Decisions

Proposed by the agent and pending founder confirmation (D1–D10). The
founder already decided native HTML over `ki-text`/`ki-stack`/`ki-image`.

- **D1 Closed element set**: `h2`, `h3`, `h4`, `p`, `strong`, `em`, `img`
  and one layout container `div`. Nothing else. Out on purpose:
  - `h1`: the page outline belongs to the host.
  - `h5`/`h6`: three heading levels cover a generated panel; more is
    speculative (Art. VII).
  - `ul`/`ol`/`li`: `ki-list`/`ki-list-item` already provide a
    non-interactive list, and native lists would need a second content
    model (`li` only under a list) to stay axe-clean.
  - `a`: no catalog prop navigates today (`ki-avatar src` only loads). A
    link is a navigation side effect outside the declared-action channel:
    the host never sees it. An agent that needs navigation binds a
    `ki-button` to a declared action and the host resolves the URL.
  - Every other element (`script`, `iframe`, `style`, `form`, `input`,
    `object`, `svg`, `template`, `span`, …) and any case variant of a
    listed one (`SCRIPT`, `Img`) is `unknown-component` (S2).
- **D2 Closed attributes per element**:
  - `h2`–`h4`, `p`, `strong`, `em`: no attribute; one default slot.
  - `img`: `src` (required, URL policy), `alt` (required, may be exactly
    empty for a decorative image), `width` and `height` (optional
    intrinsic-size hints, numbers from 1 to 4096 to reserve the aspect ratio).
  - `div`: `direction` (`column` | `row`, default `column`), `gap`
    (D5), `align` (`start` | `center` | `end` | `stretch`, default
    `stretch`), `justify` (`start` | `center` | `end` | `space-between`,
    default `start`), `wrap` (boolean, default false).
  - Everything else is `unknown-prop`: `style`, `class`, `id`, `slot`,
    `role`, `tabindex`, `aria-*`, `on*`, `srcset`, `referrerpolicy`, …
    (S3).
- **D3 Typography is inherited, never written**: the renderer writes no
  font, size, weight or colour on text primitives. They live in the host's
  light DOM and read as part of the page; Kimen typography reaches them
  only through the page contract the host already opts into
  (`@kimen/tokens/css/base`, which sets `font-family` and `color` on
  `:root`). Inline token styles would beat the host's own CSS and force
  `!important`, which Art. VI treats as an API defect (S13).
- **D4 Layout through the CSSOM**: the `div` gets
  `display: flex`, `flex-direction`, `gap`, `align-items`,
  `justify-content` and `flex-wrap` through `style.setProperty`, never
  `setAttribute('style')`. Verified in Chromium 1248 under
  `Content-Security-Policy: style-src 'self'` (2026-11-16): CSSOM writes
  apply and raise no violation; a `style` attribute set with
  `setAttribute` is blocked (`style-src-attr`) and ignored (S10). All
  values are flow-relative (`start`/`end`), so RTL needs nothing extra.
- **D5 Gap scale**: `gap` takes the step names of the existing spacing
  scale, 1:1: `zero`, `xs`, `sm`, `md`, `lg`, `xl`, `3xl`, `7xl`
  (0, 4, 6, 8, 10, 12, 16 and 24 px under Mars), default `md`, written as
  `var(--ki-space-<step>)`. No new token, no second scale, and the
  renderer's mapping is the identity on a validated value (S12).
- **D6 Images**: the renderer pins `referrerpolicy="no-referrer"` (an
  agent-chosen origin never learns the host page URL) and, through the
  CSSOM, `max-inline-size: 100%` and `block-size: auto` (an image never
  overflows its container). The agent cannot set or override any of them
  (S3, S6).
- **D7 Content model**: the phrasing elements (`h2`–`h4`, `p`, `strong`,
  `em`) accept text, `strong` and `em` only; `img` declares no slot;
  the `div` accepts text, every native element and every catalog
  component; catalog component slots accept native elements. A violation
  is `invalid-child` (S8). No native element binds an action
  (`action-not-allowed`, S9): a clickable `div` or `img` is not keyboard
  operable (Art. V).
- **D8 One definition, generated**: the primitives are catalog entries in
  the exact shape of every other entry (description, `whenToUse`,
  `whenNotToUse`, props, slots, no events), defined once in
  `packages/catalog/scripts/primitives.mjs` and merged into
  `src/generated/catalog.ts` by the generator, so validation, the emitter,
  `llms-full.txt` and any catalog consumer see them with no second code
  path (Art. I). The catalog schema version becomes `1.3.0` (additive
  minor: a spec declaring `1.2.0` still validates; a renderer at `1.2.0`
  refuses a `1.3.0` spec fail-closed).
- **D9 Availability**: the built-in catalog carries the primitives, and a
  catalog that `extend`s it inherits them; a standalone consumer catalog
  has none (its closed list is exactly what the consumer declared). A
  consumer definition can never declare a native tag (`invalid-tag`, as
  today), and the renderer renders a native tag only when the entry of the
  catalog in use is exactly Kimen's definition, so a hand-built `Catalog`
  value cannot smuggle `script` or a laxer `img` (S16–S18).
- **D10 Scope**: the protocol adapters do not change in this feature. The
  A2UI mapping (`Text` → `p`/`h2`–`h4`, `Row`/`Column` → `div`,
  `Image` → `img`, no forced `ki-card` root) is a follow-up once this and
  the A2UI 1.0 work (spec 039) are both on `main`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An agent composes readable panels without wrapping text in components (Priority: P1)

An agent answering "how did sales go?" emits a panel with a heading, a
sentence with one emphasised figure, a chart image and a button, laid out
in a column. The host renders it through the guarded renderer and gets
plain semantic HTML next to the `ki-button`.

**Why this priority**: without text, layout and images the catalog cannot
express the most common generated answer; adapters fake it today with a
`ki-card` root and flattened rows.

**Independent Test**: render the S1 spec in Chromium and assert the element
tree, the text, the layout computed styles and the accessibility tree.

**Acceptance Scenarios**: S1, S5, S8, S10, S11, S12, S13, S14, S15.

---

### User Story 2 - Native elements cannot open a hole in the boundary (Priority: P1)

Native HTML is where markup injection, script execution, tracking pixels
and inline-style CSP bypasses live. Every one of those paths stays shut:
the element set is closed, the attributes are closed, URLs pass the URL
policy, text is inert, nothing native binds an action, no style attribute
is ever written, and only Kimen's own definitions reach `createElement`.

**Why this priority**: the guarded renderer's promise (Art. VIII) is that no
code path executes from spec data; widening `createElement` to native tags
must not weaken it.

**Independent Test**: an adversarial spec set, one violation each, against
`validateUiSpec`, `renderUiSpec` and the live surface; nothing attaches and
each diagnostic names its rule.

**Acceptance Scenarios**: S2, S3, S4, S6, S7, S9, S16, S17, S18, S20.

---

### User Story 3 - The live surface and the emitter speak primitives too (Priority: P2)

A live board changes a layout gap or an image in place; an LLM learns the
primitives from the same JSON Schema and prompt that describe the
components.

**Acceptance Scenarios**: S19, S20, S21.

### Edge Cases

- A case variant of a listed tag (`P`, `Img`, `SCRIPT`) is not the listed
  tag: catalog lookup is by exact own key, so it is `unknown-component`.
- A `div` with no layout props still lays out (column, `md` gap,
  stretched); an empty `p` or heading is valid.
- Text directly inside a `div` is allowed; text inside a named slot of a
  catalog component keeps today's `<span slot>` holder.
- A native element in a named slot of a catalog component carries the
  `slot` attribute the renderer writes; the spec can never write `slot`
  itself (S3).
- Node ids (035) work on native elements and are never written to the DOM.
- `alt=""` marks a decorative image; an `alt` of white space only is not
  empty and not a description, so it is rejected (S5).
- Without the tokens stylesheet on the page, `var(--ki-space-*)` does not
  resolve and the gap falls back to zero; the layout still holds.
- Inside an MCP Apps surface the resource declares no resource domains, so
  the host's CSP blocks external images there (as it does for
  `ki-avatar src`); that is the host's policy, untouched here.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Native primitives in generated UI
  A UI spec may carry a closed set of native HTML elements for text, layout
  and images next to catalog components. They cross the same guarded boundary,
  carry only their declared attributes, never bind actions, render text as
  inert text, take the host page's typography and lay out through spacing
  tokens without a single inline style attribute.

  Rule: The closed set renders as native elements

    # S1
    Scenario: A spec mixing native text, layout and an image with catalog components renders native elements
      Given a spec whose layout div holds an h2 "Resumen", a paragraph "Ventas de " with the strong text "marzo", an image of "/img/ventas.png" with alt "Gráfico de ventas" and a ki-button "Ver detalle"
      When the host renders the spec
      Then the surface holds one div whose children are an h2, a p, an img and a ki-button in that order
      And the paragraph reads "Ventas de marzo" with "marzo" inside a strong element

    # S2
    Scenario Outline: An element outside the closed set is rejected
      Given a spec whose ki-card holds a node of the component "<tag>"
      When the host renders the spec
      Then no part of the spec renders
      And the diagnostic names the rule "unknown-component" and the value "<tag>"

      Examples:
        | tag      |
        | script   |
        | SCRIPT   |
        | iframe   |
        | style    |
        | link     |
        | base     |
        | form     |
        | input    |
        | object   |
        | embed    |
        | template |
        | svg      |
        | a        |
        | h1       |
        | ul       |
        | span     |
        | Img      |

  Rule: A native element carries only its declared attributes

    # S3
    Scenario Outline: A native element rejects every attribute it does not declare
      Given a spec whose <element> carries the attribute "<attribute>"
      When the host validates the spec
      Then the spec is rejected with the rule "unknown-prop" naming "<attribute>"

      Examples:
        | element    | attribute      |
        | image      | style          |
        | image      | class          |
        | image      | onerror        |
        | image      | srcset         |
        | image      | referrerpolicy |
        | paragraph  | style          |
        | paragraph  | onclick        |
        | h2         | id             |
        | layout div | class          |
        | layout div | tabindex       |
        | layout div | role           |
        | layout div | slot           |

    # S4
    Scenario Outline: An image source is held to the URL policy
      Given a host that declares <origins> as allowed URL origins
      And a spec with an image whose src is <src>
      When the host validates the spec
      Then the spec is <outcome>

      Examples:
        | origins                   | src                                  | outcome                           |
        | nothing                   | "https://cdn.example.com/ventas.png" | accepted                          |
        | nothing                   | "/img/ventas.png"                    | accepted                          |
        | nothing                   | "javascript:alert(1)"                | rejected as url-scheme            |
        | nothing                   | "data:image/png;base64,iVBORw0KGgo=" | rejected as url-scheme            |
        | nothing                   | "blob:https://example.com/1"         | rejected as url-scheme            |
        | nothing                   | absent                               | rejected as missing-required-prop |
        | "https://cdn.example.com" | "https://cdn.example.com/ventas.png" | accepted                          |
        | "https://cdn.example.com" | "https://tracker.example/p.png"      | rejected as url-origin            |
        | "https://cdn.example.com" | "/img/ventas.png"                    | rejected as url-origin            |

    # S5
    Scenario Outline: An image says what it shows or declares itself decorative
      Given a spec with an image of "/img/ventas.png" whose alt is <alt>
      When the host validates the spec
      Then the spec is <outcome>

      Examples:
        | alt                 | outcome                           |
        | "Gráfico de ventas" | accepted                          |
        | "" (decorative)     | accepted                          |
        | absent              | rejected as missing-required-prop |
        | "   "               | rejected as missing-required-prop |

    # S6
    Scenario: A rendered image withholds the page address and fits its container
      Given a ki-card 240 pixels wide holding an image of "/img/ancho.png" declaring a width of 1200
      When the host renders the spec
      Then the image requests its source with the referrer policy "no-referrer"
      And the image is no wider than the card

  Rule: Text is always inert text

    # S7
    Scenario: Text inside native elements renders as inert text
      Given a spec whose h2 reads "<img src=x onerror=alert(1)>" and whose paragraph reads "<script>alert(2)</script>"
      When the host renders the spec
      Then the heading and the paragraph show those texts verbatim
      And no img or script element exists and no script executes

  Rule: Native elements keep a valid content model and never act

    # S8
    Scenario Outline: Native elements accept only their content model
      Given a spec where <parent> holds <child>
      When the host validates the spec
      Then the spec is <outcome>

      Examples:
        | parent                     | child                         | outcome                   |
        | a paragraph                | a strong holding an em        | accepted                  |
        | a layout div               | a ki-card holding a paragraph | accepted                  |
        | the header slot of ki-card | an h3                         | accepted                  |
        | a layout div               | the text "Hola"               | accepted                  |
        | a paragraph                | a layout div                  | rejected as invalid-child |
        | an h2                      | a paragraph                   | rejected as invalid-child |
        | a paragraph                | a ki-badge                    | rejected as invalid-child |
        | a strong                   | an image                      | rejected as invalid-child |
        | an image                   | the text "x"                  | rejected as unknown-slot  |

    # S9
    Scenario Outline: A native element never binds an action
      Given a spec declaring the action "abrir" bound to <element>
      When the host validates the spec
      Then the spec is rejected with the rule "action-not-allowed"

      Examples:
        | element      |
        | a layout div |
        | an image     |
        | a paragraph  |
        | an h3        |

  Rule: Layout comes from spacing tokens through the CSSOM

    # S10
    Scenario Outline: Layout props lay the children out under a CSP that forbids inline styles
      Given a page whose Content-Security-Policy forbids inline style attributes
      And a spec whose layout div declares <props>
      When the host renders the spec
      Then the div lays its children out as <layout>
      And the page records no Content-Security-Policy violation

      Examples:
        | props                                                                       | layout                                                                                       |
        | no layout props                                                             | a column separated by the "md" spacing token and stretched across the div                    |
        | direction "row", gap "xl", align "center", justify "space-between" and wrap | a wrapping row separated by the "xl" spacing token, centered across it and spaced between it |

    # S11
    Scenario Outline: A layout value outside its closed set is rejected
      Given a spec whose layout div declares <prop> "<value>"
      When the host validates the spec
      Then the spec is rejected with the rule "invalid-prop-type" naming "<value>"

      Examples:
        | prop      | value              |
        | gap       | 13px               |
        | gap       | var(--ki-space-xl) |
        | direction | row-reverse        |
        | align     | baseline           |
        | justify   | space-around       |
        | wrap      | yes                |

    # S12
    Scenario: Reassigning a spacing token restyles the layout gap
      Given a page that sets the spacing token "--ki-space-xl" to "2rem"
      And a spec whose layout div declares gap "xl"
      When the host renders the spec
      Then the gap between the div's children computes to "2rem"

    # S13
    Scenario: Native text takes the host page's typography
      Given a host surface styled with the font family "Georgia" and the color "rgb(10, 20, 30)"
      And a spec holding an h2 "Resumen" and a paragraph "Hola"
      When the host renders the spec
      Then the heading and the paragraph compute the surface's font family and color
      And neither element carries a style attribute

  Rule: Native elements are accessible by construction

    # S14
    Scenario: Headings and images expose their semantics to assistive technology
      Given a spec holding an h3 "Ventas", an image with alt "Gráfico de ventas" and an image with alt ""
      When the host renders the spec
      Then the accessibility tree exposes a level-3 heading "Ventas" and an image named "Gráfico de ventas"
      And the decorative image is absent from the accessibility tree

    # S15
    Scenario: Native elements add no tab stop
      Given a rendered spec whose layout div holds an h2, a paragraph, an image and a ki-button "Ver detalle"
      When the user presses Tab from the start of the surface
      Then focus lands on the "Ver detalle" button

  Rule: Only Kimen's own definitions render native elements

    # S16
    Scenario Outline: A catalog value not built by Kimen cannot widen a native element
      Given a hand-built catalog value whose "<tag>" entry declares <props>
      When the host renders a spec using "<tag>" through that catalog
      Then no part of the spec renders
      And the diagnostic names the rule "invalid-tag" and the value "<tag>"

      Examples:
        | tag    | props                   |
        | script | a src prop              |
        | h1     | no props                |
        | img    | srcset besides src, alt |
        | p      | a style prop            |

    # S17
    Scenario Outline: Catalog registration never defines a native element
      Given a consumer catalog definition <definition>
      When the consumer creates the catalog
      Then the creation <outcome>

      Examples:
        | definition                                                      | outcome                             |
        | declaring the entry "p"                                         | fails with invalid-tag naming "p"   |
        | declaring the entry "img" with a srcset prop                    | fails with invalid-tag naming "img" |
        | extending a base catalog whose "img" entry also declares srcset | fails with invalid-tag naming "img" |
        | declaring "acme-kpi" and extending the built-in catalog         | succeeds with every native element  |

    # S18
    Scenario Outline: Native elements come with the built-in catalog and the catalogs that extend it
      Given the catalog in use is <catalog>
      When the host renders a spec whose layout div holds the paragraph "Hola"
      Then the spec is <outcome>

      Examples:
        | catalog                                           | outcome                                    |
        | the built-in catalog                              | rendered                                   |
        | a consumer catalog extending the built-in catalog | rendered                                   |
        | a standalone consumer catalog of "acme-kpi"       | rejected as unknown-component naming "div" |

  Rule: Live surfaces change native elements in place

    # S19
    Scenario: A live batch changes a native element in place
      Given a page whose Content-Security-Policy forbids inline style attributes
      And a live surface showing the layout div "fila" with gap "md" holding the image "grafico"
      When the agent applies a batch setting gap "xl" on "fila" and a new src and alt on "grafico"
      Then "fila" and "grafico" are the same elements as before, with the "xl" gap and the new src and alt
      And the page records no Content-Security-Policy violation

    # S20
    Scenario Outline: A live batch is held to the native boundary on the resulting state
      Given a live surface showing the layout div "fila" holding the paragraph "nota"
      When the agent applies a batch that <violation>
      Then the surface, its revision and its snapshot are unchanged
      And the diagnostic names the rule "<rule>"

      Examples:
        | violation                                                         | rule               |
        | sets the prop "style" on "fila"                                   | unknown-prop       |
        | inserts into "fila" an image whose src is "javascript:alert(1)"   | url-scheme         |
        | inserts into "fila" a node of the component "script"              | unknown-component  |
        | inserts a layout div into "nota"                                  | invalid-child      |
        | inserts into "fila" an image bound to the declared action "abrir" | action-not-allowed |

  Rule: Agents learn the primitives from the emitter

    # S21
    Scenario: The emitter describes each native element with exactly its attributes
      Given the built-in catalog
      When the host derives the emitter's JSON Schema
      Then the schema offers one branch per native element whose props are exactly the declared ones
      And the image branch requires src and alt and accepts an empty alt
```

### Scenario Family Coverage

The primitives are non-interactive guardrail vocabulary rendered inside the
host's page. Their families are covered as follows.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S16, S17, S18, S19, S20, S21 | |
| Keyboard path | S15 | |
| Assistive-tech outcome | S14, S5 | |
| Form participation | | N/A — no form-associated element is in the closed set; `form`, `input` and every other form control are rejected (S2), and form behavior stays with the catalog's form components |
| Theming | S12, S13 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** (D1, D8): the built-in catalog gains exactly the entries `h2`,
  `h3`, `h4`, `p`, `strong`, `em`, `img` and `div`, each with description,
  `whenToUse` and `whenNotToUse` guidance, defined once in
  `packages/catalog/scripts/primitives.mjs` and merged by the generator
  into `src/generated/catalog.ts`. No other non-custom element is ever a
  catalog entry. Catalog schema version `1.3.0`.
- **FR-002** (D2): each primitive declares exactly the props of D2, with
  their types, closed values, defaults and bounds; any other prop is
  `unknown-prop` through the existing check.
- **FR-003** (D2): a prop constraint gains the optional field
  `allowEmpty: true`, valid only on a required string: the exact empty
  string is accepted, white space only is still `missing-required-prop`.
  `createCatalog` accepts it on a required string constraint and reports
  `malformed-constraint` anywhere else. The emitter marks such a prop
  required without the non-blank pattern. `img.alt` is its only built-in
  use.
- **FR-004** (D7): validation (`validateUiSpec`, both renderers, every live
  batch on its resulting state) enforces the content model of D7 and
  reports `invalid-child` at the child's path, and reports
  `action-not-allowed` for an `action` on any primitive.
- **FR-005** (D4, D6): the builder creates the element by its tag and
  writes `img` `src`, `alt`, `width` and `height` as attributes, pins
  `referrerpolicy="no-referrer"`, and writes the image sizing and every
  `div` layout value through `style.setProperty` only. No code path writes
  a `style` or `class` attribute on a primitive from spec data (consumer
  components keep today's prop-name rules, outside this feature). Text
  primitives get no style. A live `set` rewrites only the attributes or style properties
  whose value changes, on the same element.
- **FR-006** (D3): nothing in the renderer sets typography on any
  primitive; font, size, weight, line height and colour come from the
  host page by inheritance.
- **FR-007** (D9): the renderer's tag guard renders a non-custom tag only
  when it is one of FR-001's tags AND its entry in the catalog in use
  equals Kimen's definition; anything else is `invalid-tag` before any
  element is created. `createCatalog` keeps rejecting a native tag in a
  definition (`invalid-tag`) and rejects an `extend` base whose native
  entry differs from Kimen's definition (`invalid-tag`); a base whose
  native entries equal it carries them into the result.
- **FR-008** (D10): nothing in the feature names a protocol. The adapters
  and the emitter's code paths are unchanged except for FR-003; the
  primitives reach the emitter's schema and prompt as catalog entries.

### Key Entities

- **Primitive**: a catalog entry whose tag is a native element of FR-001,
  defined by Kimen only, never by a consumer.
- **Content model**: which children a primitive accepts (D7).
- **Layout props**: the closed enums of the `div`, mapped to flex layout
  and `--ki-space-*` tokens through the CSSOM.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): additive on `@kimen/catalog` — eight
  catalog entries, the constraint field `allowEmpty`, the validation codes
  `invalid-child` and `action-not-allowed`; catalog schema `1.2.0` →
  `1.3.0`. `@kimen/elements` and `@kimen/tokens` do not change, so the
  public-API snapshot and its `changes/api` declaration do not change.
- **Bundle budget** (Art. IV): a few hundred bytes of renderer code and the
  primitive entries in the generated catalog; no runtime dependency.
- **Accessibility** (Art. V): semantic elements only; `alt` mandatory
  (empty only by explicit choice); no tab stop and no action on any
  primitive (S14, S15, S9).
- **Tokens** (Art. VI): spacing from `--ki-space-*`; typography inherited;
  no hardcoded visual value (the image's `100%`/`auto` are layout
  keywords, not design values).
- **Guardrail/security boundary** (Art. VIII): a new class of element
  reaches `createElement`. Closed tags, closed attributes, URL policy,
  inert text, no actions, CSSOM only and a canonical-definition check on
  every catalog value (S2–S4, S6, S7, S9, S10, S16, S17, S19, S20).

## Success Criteria *(mandatory)*

- **SC-001**: the S1 panel renders in Chromium with the expected element
  tree, computed layout and accessibility tree, and axe reports no
  violation.
- **SC-002**: 100% of the adversarial specs and batches (S2–S4, S7, S9,
  S16, S17, S20) attach nothing and report their rule.
- **SC-003**: under `style-src 'self'` the page records zero CSP violations
  while rendering and live-updating primitives (S10, S19).
- **SC-004**: the S1–S21 traced tests run green inside the deterministic
  gates; the existing 027/028/032/033/035 suites stay green, changed only
  where they pin the catalog schema version or the catalog's entry count.

## Assumptions

- Client-side only, like `028`.
- The host loads the tokens stylesheet when it wants token spacing; the
  layout degrades to zero gap otherwise.
- Image loading, caching and the host's own CSP (`img-src`) are the host's
  concern; the boundary only decides which URLs may be written.
