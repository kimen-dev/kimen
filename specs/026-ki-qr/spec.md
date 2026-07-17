# Feature Specification: ki-qr

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II (Specs Before Code).
     Kept in sync with constitutional amendments (no-drift rule). -->

**Feature Branch**: `feat/ki-qr` (spec `026-ki-qr`)

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "Next-phase batch component: a `<ki-qr>` web
component that renders a machine-scannable QR code from a declared value — a
URL, a pairing payload, any short text — abstracting the MarsUI Miscellaneous
`QR_code` set (Type square/round) per the API charter established for the
003–016 batch (precedent: 002-ki-button). The component is a non-interactive,
non-form-associated graphic that restyles entirely through the token layer.
Scanning/decoding UI, camera access and logo overlays are explicitly out of
v1 scope."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

The API below is the union of patterns found in both reference designs, so
that neither theme lacks expressive power (and future themes inherit the same
guarantee):

| Pattern | MarsUI (onmars) | Material 3 (material3) | Abstraction in ki-qr |
|---|---|---|---|
| Component inventory | `QR_code` component set on the Miscellaneous page (node 16158:27561, verified 2026-07-17): exactly one variant axis `Type` with two values, `square` (12019:6059) and `round` (16158:27560) | No QR-code component exists in the Material 3 component catalog (same absence class as avatar) | one element `ki-qr`; with no M3 artifact to extract, material3's component token values are theme design decisions, not extraction |
| Module & finder shape | `Type=square` renders square modules with square concentric finder patterns; `Type=round` renders circular dot modules with rounded finder rings (screenshot verified 2026-07-17) | no evidence | pure-appearance axis carried entirely in `--ki-qr-*` shape token values (module radius, finder radius) — never an attribute (002 Round/Square precedent, charter rule on pure-appearance axes) |
| Size | both variants ship at a single 128×128 px frame; no size axis in the set | no evidence | no `size` attribute: one per-theme `--ki-qr-size` token; the code always stays square (1:1) and consumers scale through the token/CSS |
| Color & surface | dark modules on a light tile in both variants | no evidence | module and tile colors resolve from `--ki-qr-*` color tokens over the semantic layer; themes must keep scanner-safe dark-on-light module contrast in both schemes |
| Code content | the Figma variants carry a decorative sample matrix; no data axis exists | no evidence | the matrix derives at runtime from a `value` attribute — the single source of encoded content, encoded locally |
| Interactivity | static graphic; the set exposes no interactive states | no evidence | non-interactive: never focusable, no events; a `label` attribute names the graphic for assistive technology |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Hand a value from the screen to a nearby camera (Priority: P1)

A person points a phone camera at a QR code shown by the application — a
login-pairing screen, a ticket, a "continue on mobile" link — and the scan
resolves to exactly the value the application declared. When the application
changes the value, the rendered code follows; when no value is declared,
nothing broken appears.

**Why this priority**: a QR code that does not decode to its declared value
is worse than no component at all; the encode–render–decode round trip is
the component's entire reason to exist.

**Independent Test**: render a ki-qr with a known URL, decode the rendered
code with an independent QR decoder and compare byte-for-byte; change the
value and decode again; remove the value and observe a clean, silent
non-render.

**Acceptance Scenarios**:

1. **Given** a QR code with the value "https://onmars.dev", **When** the page
   renders, **Then** the rendered code decodes back to exactly
   "https://onmars.dev".
2. **Given** a rendered QR code encoding "https://onmars.dev", **When** the
   value changes to "https://onmars.dev/pricing", **Then** the rendered code
   decodes back to exactly the new value.
3. **Given** a QR code with no value, **When** the page renders, **Then** no
   code is rendered and the page renders without error.
4. **Given** a QR code whose value contains non-ASCII text, **When** the page
   renders, **Then** the rendered code decodes back to exactly that text.
5. **Given** a QR code whose value exceeds the byte capacity of the densest
   QR symbol, **When** the page renders, **Then** no partial or corrupt code
   is rendered and the page renders without error.

---

### User Story 2 - Understand the code through assistive technology (Priority: P2)

A person using a screen reader encounters the QR code and hears an image
whose name states what the code is for ("Open onmars.dev on your phone") —
never an anonymous graphic and never a fake button; a keyboard user tabs
straight past it because the code adds no focus stop. The surrounding page —
per catalog guidance — offers the same payload through an accessible
alternative, since a QR code is only useful to someone who can point a second
device's camera at the screen.

**Why this priority**: an unnamed or focus-trapping graphic is an
accessibility hazard (Art. V); naming the code's purpose is what lets
assistive-technology users know to look for the accessible alternative.

**Independent Test**: query the accessibility tree of a labeled ki-qr and
verify exactly one image with the given name and no interactive role; remove
the label and verify the encoded value serves as the name; tab across the
page and count zero stops contributed by the component.

**Acceptance Scenarios**:

1. **Given** a QR code encoding "https://onmars.dev" labeled "Open onmars.dev
   on your phone", **When** the accessibility tree is queried, **Then** it
   exposes an image named "Open onmars.dev on your phone" with no interactive
   role or state.
2. **Given** a QR code encoding "https://onmars.dev" with no label, **When**
   the accessibility tree is queried, **Then** it exposes an image named
   "https://onmars.dev".
3. **Given** a focused button, then a QR code, then a second button, **When**
   the user presses Tab, **Then** focus lands on the second button, never on
   the QR code.

---

### User Story 3 - Re-theme without touching markup (Priority: P2)

A brand owner switches the document theme (onmars → material3, or a future
theme) and every QR code restyles from the token layer alone — size, module
and tile colors, and whether modules are square or round dots (the MarsUI
Type axis). The code keeps decoding to its value under every theme, scheme
and writing direction: restyling never costs scannability.

**Why this priority**: one-step re-theming is Kimen's visible differentiator;
ki-qr carries the MarsUI square/round axis entirely in the token layer,
exactly as 002 carried shape — and adds the twist that a theme mistake here
breaks function, not just looks.

**Independent Test**: render a ki-qr under onmars, declare the material3
theme and assert appearance resolves from material3 token values; reassign
the module shape tokens to the round values and assert round modules plus a
successful decode; repeat under the forced dark scheme and in a
right-to-left document.

**Acceptance Scenarios**:

1. **Given** the material3 stylesheet and theme declaration, **When** the
   page renders, **Then** the code's size, colors and module shape resolve
   from material3 token values and the code still decodes to its value.
2. **Given** a page reassigning the QR module shape tokens to the round
   values, **When** the page renders, **Then** the modules render round and
   the code still decodes to its value.
3. **Given** the onmars theme with a forced dark scheme, **When** the page
   renders, **Then** the code's appearance resolves from the dark token
   values and still decodes to its value.
4. **Given** a right-to-left document, **When** the page renders, **Then**
   the code renders unmirrored and decodes back to exactly its value.

---

### User Story 4 - An agent composes a valid QR code (Priority: P3)

A GenUI agent reading only the generated contract (docs, catalog metadata)
picks ki-qr to hand a URL or machine-readable payload to a nearby device,
declares `value` and a purpose-stating `label`, and knows when NOT to reach
for it (data the user must read, secrets, interactive affordances).
Malformed attributes — for example a shape attribute copied from another
design system — do not break rendering or decoding.

**Why this priority**: agent legibility is a deliverable (Art. I), but it
builds on the human-facing behavior above.

**Independent Test**: feed the generated contract to the documented
when-to-use rules; render a ki-qr with an unrecognized shape attribute and
observe default rendering plus a successful decode.

**Acceptance Scenarios**:

1. **Given** a QR code declared with an unrecognized shape attribute,
   **When** the page renders, **Then** the code renders with the default
   appearance and still decodes to its value.

### Edge Cases

- No `value` (absent or empty): no code is rendered, nothing is exposed to
  assistive technology and the page renders without error — the empty state
  mirrors ki-badge's fail-soft contract. An always-empty ki-qr is catalog
  when-NOT-to-use guidance, not an error state.
- A value exceeding QR capacity (~2,331 bytes in the densest byte-mode
  symbol at the fixed error-correction level M — see Assumptions) fails
  soft the same way: no partial or corrupt code is ever rendered, the page
  renders without error, and the overflow is documented as an authoring
  mistake in catalog guidance (S12, FR-003).
- Non-ASCII values (accents, CJK, emoji) round-trip exactly (S1 exercises
  them as Examples rows); the encoding segments and modes used internally
  are implementation details — the contract is the byte-exact decode.
- The value is data, never behavior: the component encodes it verbatim and
  never interprets, resolves, navigates to or fetches it.
- Unknown attributes or attribute values (e.g. a `shape` or `type` attribute
  copied from another design system's vocabulary) are ignored: the code
  renders with the default appearance and still decodes (agent-generated
  markup is not trusted to be valid).
- Scaling: the code preserves its 1:1 aspect ratio and its quiet zone at any
  token-driven size and remains decodable when scaled; below-minimum sizes
  that defeat physical scanners are a consumer/theme responsibility
  documented in catalog guidance.
- Forced dark scheme: an inverted (light-on-dark) code scans unreliably on
  common devices, so shipped themes keep dark modules on a light tile in
  both schemes; the component renders whatever the tokens declare — the
  constraint is a documented theme obligation, not component logic.
- RTL documents: the QR matrix is orientation-fixed and never mirrors; any
  surrounding spacing uses logical properties (Art. IV).
- No slots exist in v1: there is no fallback content and no logo overlay;
  interactive alternatives (a plain link with the same payload) live next to
  the component, never inside it.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: QR code
  A QR code hands a declared value — a link, a pairing payload — from the
  screen to a nearby camera as a machine-scannable graphic that any brand
  restyles through tokens alone without losing scannability.

  # Family: core behavior
  # S1
  Scenario Outline: The QR code renders its value as a scannable code
    Given a QR code with the value "<value>"
    When the page renders
    Then the rendered code decodes back to exactly "<value>"

    Examples:
      | value                   |
      | https://onmars.dev      |
      | Reunión mañana — Zúrich |
      | こんにちは世界          |
      | Ticket 🎫 №42           |

  # S2
  Scenario: Changing the value re-encodes the code
    Given a rendered QR code encoding "https://onmars.dev"
    When the value changes to "https://onmars.dev/pricing"
    Then the rendered code decodes back to exactly "https://onmars.dev/pricing"

  # S3
  Scenario: An empty QR code exposes nothing and breaks nothing
    Given a QR code with no value
    When the page renders
    Then no code is rendered, the accessibility tree exposes no content for it and the page renders without error

  # S4
  Scenario: Unknown appearance attributes fall back to the default appearance
    Given a QR code declared with an unrecognized shape attribute copied from another design system
    When the page renders
    Then the code renders with the default appearance and still decodes to its value

  # Family: keyboard path
  # S5
  Scenario: The QR code never takes keyboard focus
    Given a focused button, then a QR code encoding "https://onmars.dev", then a second button
    When the user presses Tab
    Then focus lands on the second button, never on the QR code

  # Family: assistive-tech outcome
  # S6
  Scenario: The QR code exposes an image whose name states its purpose
    Given a QR code encoding "https://onmars.dev" labeled "Open onmars.dev on your phone"
    When the accessibility tree is queried
    Then it exposes an image named "Open onmars.dev on your phone" with no interactive role or state

  # S7
  Scenario: Without a label the encoded value names the image
    Given a QR code encoding "https://onmars.dev" with no label
    When the accessibility tree is queried
    Then it exposes an image named "https://onmars.dev"

  # Family: form participation — N/A for ki-qr: a non-interactive graphic
  # that displays a machine-readable code is not a form control, carries no
  # user input and contributes no entry to submitted form data (justified in
  # spec.md's Scenario Family Coverage table).

  # Family: theming
  # S8
  Scenario: A second theme restyles the QR code through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the code's size, colors and module shape resolve from material3 token values
    And the rendered code still decodes to its value

  # S9
  Scenario: Reassigning the module shape tokens rounds the modules
    Given a page reassigning the QR module shape tokens to the round values
    And a QR code encoding "https://onmars.dev"
    When the page renders
    Then the modules render round and the code still decodes to "https://onmars.dev"

  # S10
  Scenario: The QR code honors a forced dark scheme without losing scannability
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the QR code's appearance resolves from the dark token values
    And the rendered code still decodes to its value

  # S11
  Scenario: The code never mirrors in a right-to-left document
    Given a right-to-left document with a QR code encoding "https://onmars.dev"
    When the page renders
    Then the code renders unmirrored and decodes back to exactly "https://onmars.dev"

  # Family: core behavior (appended)
  # S12
  Scenario: A value beyond QR capacity fails soft
    Given a QR code whose value exceeds the byte capacity of the densest QR symbol
    When the page renders
    Then no partial or corrupt code is rendered and the page renders without error
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S12 | |
| Keyboard path | S5 | |
| Assistive-tech outcome | S6, S7 | |
| Form participation | | N/A — ki-qr is a non-interactive graphic that displays a machine-readable code: it is not a form control, carries no user input and contributes no entry to submitted form data (charter-listed valid N/A, same class as ki-badge and ki-list). |
| Theming | S8, S9, S10, S11 | |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The component MUST render a machine-scannable QR code encoding
  exactly its `value` attribute: an independent decoder reading the rendered
  code MUST recover the declared value byte-for-byte, including non-ASCII
  text. When the value changes, the rendered code MUST re-encode to the new
  value.
- **FR-002**: Encoding MUST happen locally: the component performs no network
  request and never interprets, resolves, navigates to or fetches the value
  it encodes — the value is data, not behavior.
- **FR-003**: With no value (absent or empty), the component MUST render no
  code, expose no content to assistive technology and raise no error. A
  value exceeding QR capacity MUST fail soft the same way — no partial or
  corrupt code is ever rendered; the overflow is a documented authoring
  mistake in catalog guidance.
- **FR-004**: The component MUST be non-interactive: never focusable, never
  in the tab order, no pointer affordance, no events emitted.
- **FR-005**: Assistive technology MUST receive exactly one image whose
  accessible name is the `label` attribute when provided, falling back to
  the encoded value otherwise — never an unnamed graphic, never an
  interactive role or state. Image semantics are document-structure
  graphics semantics, not an APG interactive widget pattern, so "no ARIA is
  better than wrong ARIA" (Art. V) is not contradicted.
- **FR-006**: Every visual property (code size, module color, tile
  background, module shape/radius, finder shape/radius, quiet zone, tile
  corner radius) MUST resolve from `--ki-qr-*` component tokens layered over
  the semantic token layer; zero hardcoded visual values.
- **FR-007**: Module and finder shape (the MarsUI `Type` square|round axis)
  is a pure-appearance axis and MUST be expressed exclusively through theme
  token values; no `shape`, `type` or `variant` attribute exists (002
  Round/Square precedent, charter rule on pure-appearance axes).
- **FR-008**: The rendered code MUST preserve a 1:1 aspect ratio and its
  quiet zone at any token-driven size, and MUST remain decodable when
  scaled (resolution-independent rendering).
- **FR-009**: The QR matrix MUST never mirror or flip in right-to-left
  documents; any surrounding spacing MUST use logical properties (Art. IV).
- **FR-010**: Module-to-tile contrast MUST meet the non-text 3:1 minimum
  (WCAG 1.4.11) in all theme × scheme contexts; shipped themes keep dark
  modules on a light tile in both schemes for scanner compatibility (a
  documented theme obligation, not component logic).
- **FR-011**: Unrecognized attributes or attribute values MUST NOT break
  rendering or decoding; the code renders with the default appearance.
- **FR-012**: The component MUST expose a `code` part for the customization
  ladder (tokens first, then parts, then slots).
- **FR-013**: The public contract MUST carry agent-readable
  when-to-use/when-NOT-to-use guidance, including the accessible-alternative
  obligation (the QR code never travels alone) and the secrets warning
  (encoding a secret displays it to anyone who can photograph the screen).

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): one new element `ki-qr` (attributes:
  `value`, `label`; events: none; methods: none; slots: none; part: `code`;
  component tokens: `--ki-qr-*`). Additive MINOR; catalog and llms.txt
  regenerate with the new entry.
- **Bundle budget** (Art. IV): the first ki-* component with an algorithmic
  core — a QR encoder must ship inside the component. Marginal cost target
  stays in single-digit KB gzipped including the encoder; zero network
  requests (FR-002). Whether the encoder is vendored/in-house or the
  library's first runtime micro-dependency is a plan-phase decision that
  requires explicit founder sign-off either way (a new runtime dependency
  would be the library's first).
- **Accessibility** (Art. V): no APG pattern applies — a QR code is a
  non-interactive graphic, so no manual APG walkthrough is required. The
  obligations are: exactly one image exposed with an accurate, purpose-
  stating accessible name (`label`, falling back to `value`, per FR-005);
  zero tab stops and zero interactive roles (FR-004); and the catalog-level
  accessible-alternative rule — a QR code is only useful to someone who can
  point a second device's camera at the screen, so the same payload must be
  reachable through an accessible alternative (visible link, copyable text)
  next to the component; the component's name states purpose but never
  replaces that alternative. axe zero violations across shapes × themes ×
  schemes × directions. No motion, so `prefers-reduced-motion` is not
  applicable.
- **Tokens** (Art. VI): new component token family `--ki-qr-*` — `size`,
  `color` (modules), `background` (tile), `module-radius`, `finder-radius`,
  `quiet-zone`, `radius` (tile corners) — resolving from the semantic layer.
  The MarsUI `Type` square|round axis lives entirely in the shape token
  values (`module-radius`/`finder-radius`); onmars picks its default shape
  in its component token file, and material3 — with no M3 QR artifact —
  picks values as a theme design decision. Scannability constraint on every
  theme: dark modules on a light tile with ≥3:1 non-text contrast in both
  schemes (FR-010; the non-text contrast gate applies). No variant, tone,
  size or state axes: the component is static and non-interactive. No
  semantic-layer deltas expected.
- **Catalog/agent legibility** (Art. I): when-to-use — handing a URL or
  machine-readable payload from the screen to a nearby camera device: login
  pairing, tickets and passes, "continue on mobile" links, Wi-Fi sharing.
  When NOT to use — data the user must read on the same screen (render text
  or a link), one-dimensional barcodes (out of scope), anything interactive
  (a QR code is not a button), secret values (anyone who can photograph the
  screen can decode them), or as the sole carrier of the payload (the
  accessible alternative is mandatory guidance).
- **Guardrail/security boundary** (Art. VIII): none — no spec rendering,
  declared actions or adapter surface touched. The component's own
  security posture is FR-002 (the value is encoded verbatim, never
  interpreted or fetched) plus the catalog secrets warning in FR-013.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of rendered codes decode back to exactly the declared
  value — across representative payloads (URL, non-ASCII text, long
  alphanumeric), both module shapes, both themes, both schemes and both
  writing directions.
- **SC-002**: switching the document theme (onmars ↔ material3) restyles
  every QR code — size, colors, module shape — with zero markup or component
  changes; reassigning the shape tokens alone flips square ↔ round while the
  code keeps decoding.
- **SC-003**: zero accessibility violations in automated auditing across the
  matrix; the accessibility tree exposes exactly one image with the accurate
  name in 100% of labeled and unlabeled cases; the component contributes
  zero tab stops and zero interactive roles.
- **SC-004**: the component's marginal cost — encoder included — stays in
  single-digit KB (gzipped) within the declared budget gate, with zero
  network requests at any point of its lifecycle.
- **SC-005**: markup with absent, oversized or unrecognized inputs never
  renders a broken or partial code: empty and overflow render nothing
  cleanly, unknown attributes render the default appearance and still
  decode.

## Assumptions

- Error-correction level is fixed to a sensible default (level M) in v1: no
  design source demonstrates an error-correction axis, and no v1 scenario
  needs one. An `error-correction` attribute — useful the day a logo
  overlay lands — would be additive MINOR.
- No logo/center-image overlay and no slots in v1 (Art. VII — simplest
  design that satisfies the scenarios); an overlay slot would require
  raising error correction and lands later as additive MINOR, if ever.
- No `size` attribute: the Figma set ships a single 128×128 px frame with no
  size axis; size is the per-theme `--ki-qr-size` token and consumer CSS.
- Module/finder shape as theme tokens rather than an author-facing attribute
  is the charter's pure-appearance rule (002 Round/Square precedent) applied
  to the MarsUI `Type` axis. Note for gate-1 review: MarsUI does expose
  `Type` as a component property, which could argue for an attribute; this
  spec follows the charter and flags the divergence explicitly.
- Material 3 has no QR-code component, so the material3 component token file
  is a theme design decision (same class as avatar's M3 absence), not an
  extraction; no M3 anatomy constrains the API.
- Shipped themes keep dark modules on a light tile in both color schemes:
  inverted codes scan unreliably on common devices. A future theme choosing
  otherwise owns that risk; the component renders whatever the tokens
  declare.
- Capacity overflow (value larger than the densest QR symbol) is an
  authoring mistake handled fail-soft (FR-003), not a supported use case;
  consumers needing multi-kilobyte payloads should ship a link instead.
- Internal encoding choices (byte/alphanumeric segments, mask selection, QR
  version) are implementation details; the contract is the byte-exact
  round-trip decode (FR-001).
- The rendering primitive (SVG, canvas or otherwise) is an implementation
  detail, constrained only by FR-005 (one named image in the accessibility
  tree), FR-006 (token-driven shape/color) and FR-008
  (resolution-independent decode).
- No motion: the component is static in v1, so `prefers-reduced-motion` is
  not applicable.
- MarsUI verification 2026-07-17 (get_metadata + screenshot of node
  16158:27561 in the MarsUI file): the `QR_code` set contains exactly the
  two `Type` variants at 128×128 px described in the design-source table;
  no size, color or state axes exist. Pixel-level extraction
  (get_design_context) is deliberately deferred to the implementation
  phase.
