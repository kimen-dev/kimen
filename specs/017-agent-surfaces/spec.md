# Feature Specification: Agent surfaces

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. I (AI-First:
     One Source of Truth) and Art. II (Specs Before Code). -->

**Feature Branch**: `feat/agent-surfaces` (spec `017-agent-surfaces`)

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Complete the Art. I pipeline beyond docs-json:
generate the standard Custom Elements Manifest, the llms.txt language-model
summary and machine-readable when-to-use / when-NOT-to-use guidance from the
component contract, committed and verified by a sync gate — so the fourteen
Fase 2 components inherit a satisfiable machine-surfaces obligation (the
tasks-template T019 line) instead of an aspirational one. Founder decision
2026-07-08: infrastructure feature now; the Zod catalog remains Fase 3."

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).

## Design-source analysis (Figma)

Not applicable: this feature produces machine-readable artifacts with no
visual surface. The design sources are the component contracts themselves
(TypeScript types + JSDoc) and the ecosystem formats they must feed:
`custom-elements.json` (the community-standard Custom Elements Manifest
consumed by editors, framework tooling and documentation systems) and
`llms.txt` (the emerging convention for language-model-facing summaries).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - An agent wires a component from its manifest (Priority: P1)

A coding or GenUI agent consuming `@kimen/elements` reads the shipped
machine surfaces and correctly wires a component — right tag, right
attributes, right events, right slots — without reading source code or
human docs.

**Why this priority**: agent legibility is a constitutional deliverable
(Art. I): an API a capable agent cannot wire correctly from its description
alone is a defect. This is the story every later component inherits.

**Independent Test**: give an agent only the generated manifest and summary,
ask it to compose a `ki-button` form scenario, and check the produced markup
against the component's public API.

**Acceptance Scenarios**:

1. **Given** the elements package with ki-button, **When** the machine
   surfaces are generated, **Then** the manifest describes ki-button's tag,
   properties, slots and parts (every facet its contract documents).
2. **Given** the elements package with ki-button, **When** the surfaces are
   generated, **Then** the llms.txt summary carries the library name, an
   installation instruction and a ki-button entry with its usage guidance.
3. **Given** a component contract documenting when-to-use guidance, **When**
   the surfaces are generated, **Then** the manifest, the component's own
   document and the complete summary carry it verbatim.

---

### User Story 2 - The pipeline enforces documentation completeness (Priority: P2)

A maintainer (or an unattended agent loop) adding a public API member
without documentation is stopped at build time, not discovered later by a
consumer staring at an empty description.

**Why this priority**: Art. I makes an undocumented public API member a
build failure; without mechanical enforcement the rule is aspiration.

**Independent Test**: strip the JSDoc from one public prop in a scratch
component; generation must fail naming that member.

**Acceptance Scenarios**:

1. **Given** a public property without documentation, **When** the surfaces
   are generated, **Then** generation fails naming the member.

---

### User Story 3 - Committed surfaces never drift (Priority: P2)

A reviewer trusts that the committed `custom-elements.json` and `llms.txt`
match the source contract exactly, because a deterministic gate fails any
change that regenerates differently — the same trust model the token CSS
already has (tokens-sync gate).

**Why this priority**: generated artifacts are committed and diffable
(Art. I); a drifting artifact is worse than none.

**Independent Test**: edit a committed surface by hand; the sync gate must
fail pointing at the stale file. Regenerate from a checkout at a different
filesystem path; both outputs must be byte-identical.

**Acceptance Scenarios**:

1. **Given** stale committed surfaces, **When** the sync gate runs, **Then**
   it fails pointing at the stale files.
2. **Given** freshly generated surfaces, **When** regenerated from a
   checkout at a different filesystem path, **Then** both generated outputs
   are byte-identical.

---

### User Story 4 - An agent reads only the part of the library it needs (Priority: P1)

An agent that has to place one button does not pay for the whole library.
It reads a short `llms.txt` index — what Kimen is, how to install and load
it, one line per component saying when to use it — and follows the link of
the component it chose to a single Markdown document with that component's
complete contract. The whole library in one file remains one link away for
whoever wants it.

**Why this priority**: the first release shipped `llms.txt` as one block of
about 266 KB (roughly 70 thousand tokens) with no links, so reading the
index of the library and reading the library were the same cost. That is
the opposite of the llms.txt convention (https://llmstxt.org/: an H1, a
blockquote summary, and H2 sections holding "file lists" of links to
Markdown documents) and it spends an agent's context before it has chosen
anything.

**Independent Test**: measure `llms.txt` against its declared size budget;
follow every link of the packaged index inside a packed tarball and every
link of the published index inside the assembled site.

**Acceptance Scenarios**:

1. **Given** the published components, **When** the surfaces are generated,
   **Then** `llms.txt` is an index within its size budget that links one
   document per component beside the first sentence of its when-to-use
   guidance.
2. **Given** a component such as ki-indicator, **When** the surfaces are
   generated, **Then** its document carries guidance, attributes (required,
   bounded and URL attributes marked), slots, parts, events, methods,
   styling tokens and examples.
3. **Given** the published components, **When** the surfaces are generated,
   **Then** `llms-full.txt` carries everything in one file.
4. **Given** fresh surfaces, **When** the package is packed, **Then** every
   link of its index is a relative path to a packed file; **When** the site
   is assembled, **Then** every link of the published index is an address
   the site serves.
5. **Given** the theming guidance and the GenUI packages, **When** the
   surfaces are generated, **Then** every index links the theming guide and
   the repository index links one guide per GenUI package.

### Edge Cases

- A component with no when-to-use guidance yet: generation fails (guidance
  is part of the documented-API obligation for components), with a clear
  message naming the component and the missing guidance tags.
- Machine-specific noise (timestamps, absolute paths): explicitly excluded
  from generated output — the current docs.json embeds both and is therefore
  unusable as a committed contract without normalization (S6 exists because
  of this observed defect).
- A future component added by generator: inherits the surfaces automatically
  from the build graph, no per-component wiring.
- A component that is removed or renamed: its document is deleted by the
  next generation, so a stale document can neither ship nor stay linked.
- A when-to-use text that is a single sentence, or whose first sentence
  holds an abbreviation such as "e.g.": the index line ends where the first
  sentence ends (a period followed by a capitalized word) and never in the
  middle of one.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Agent surfaces
  Everything an agent needs to wire a Kimen component correctly is generated
  from the component contract and shipped with the library: a standard
  manifest, a language-model summary, and when-to-use guidance — regenerated,
  committed and verified, never hand-maintained.

  # Family: core behavior
  # S1
  Scenario: The build produces a standard custom-elements manifest
    Given the elements package with the ki-button component
    When the machine surfaces are generated
    Then a custom-elements manifest describes ki-button's tag, properties, slots and parts

  # S2
  Scenario: The build produces a language-model summary
    Given the elements package with the ki-button component
    When the machine surfaces are generated
    Then an llms.txt summary carries the library name, an installation instruction and one entry per published component with its usage guidance

  # S3
  Scenario: When-to-use guidance flows from the component contract
    Given a component whose contract documents when to use it and when not to
    When the machine surfaces are generated
    Then the manifest, the component's own document and the complete summary carry that guidance verbatim

  # S4
  Scenario: An undocumented public API member fails the generation
    Given a component with a public property that carries no documentation
    When the machine surfaces are generated
    Then the generation fails naming the undocumented member

  # S5
  Scenario: Stale committed surfaces fail the sync gate
    Given committed machine surfaces that no longer match the component contract
    When the sync gate runs
    Then the gate fails pointing at the stale files

  # S6
  Scenario: Regeneration is independent of where the checkout lives
    Given machine surfaces freshly generated from the current contract
    When the surfaces are regenerated from a checkout at a different filesystem path
    Then both generated outputs are byte-identical

  # S7
  Scenario: A slot the component fills itself stays out of the agent surfaces
    Given a component that renders a named slot it fills with its own children
    And the slot is declared as managed output with a reason instead of documented as public
    When the machine surfaces are generated
    Then the generation passes and neither the manifest nor the summary lists that slot
    And a rendered named slot that is neither documented nor declared still fails the generation

  # S8
  Scenario: The language-model summary is a brief index of linked documents
    Given the elements package with its published components
    When the machine surfaces are generated
    Then llms.txt names the library, summarizes it, tells how to install and load it, and links one document per published component beside the first sentence of its when-to-use guidance
    And llms.txt stays within its declared size budget

  # S9
  Scenario: Every published component has its own contract document
    Given the elements package with the ki-indicator component
    When the machine surfaces are generated
    Then a ki-indicator document carries its guidance verbatim with its attributes, slots, parts, events, methods, styling tokens and examples
    And the document marks each attribute the contract declares required, numerically bounded or a URL

  # S10
  Scenario: The complete summary stays available as one document
    Given the elements package with its published components
    When the machine surfaces are generated
    Then llms-full.txt carries the installation guidance and the complete entry of every published component in a single file

  # S11
  Scenario: The packaged index links only files shipped in the package
    Given machine surfaces freshly generated from the current contract
    When the elements package is packed
    Then every link in its llms.txt is a relative path to a file inside the packed package

  # S12
  Scenario: The published index links only documents the site serves
    Given machine surfaces freshly generated from the current contract
    When the public site is assembled
    Then the site serves llms.txt and llms-full.txt at its root
    And every link in the served llms.txt is an address of that site whose document the assembled site contains

  # S13
  Scenario: The index links the guides beyond the components
    Given the theming guidance of the preamble and the GenUI packages described in the GenUI source
    When the machine surfaces are generated
    Then every llms.txt links a generated theming guide
    And the repository llms.txt also links one generated guide per GenUI package carrying its usage guidance and entry points
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13 | |
| Keyboard path | | N/A — generated artifacts; no interactive surface exists |
| Assistive-tech outcome | | N/A — no rendered UI; the artifacts serve machine consumers |
| Form participation | | N/A — no form surface; nothing is form-associated |
| Theming | | N/A — the artifacts carry no visual values; tokens are referenced by name only |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The elements build MUST produce a Custom Elements Manifest
  (`custom-elements.json`) covering, for every published component, every
  facet its contract documents: tag, properties (with types and defaults),
  events, methods, slots, CSS shadow parts and CSS custom properties. For
  ki-button today that is tag, properties, slots and parts; facets appear as
  contracts document them.
- **FR-002**: The build MUST produce an `llms.txt` summary containing the
  library name, an installation/consumption instruction and one entry per
  published component with its API and usage guidance. Component entries
  derive from the component contract; the library preamble derives from two
  declared, versioned sources only — package metadata and a committed
  preamble template — preserving Art. I's no-hand-maintained-artifact rule.
- **FR-003**: When-to-use and when-NOT-to-use guidance MUST be expressible
  in the component contract itself as dedicated documentation tags defined
  by this feature, and MUST flow verbatim into both surfaces; a published
  component missing the guidance fails generation. Migrating ki-button's
  existing prose guidance to the tag convention is IN scope of this feature
  (the gate must be born green).
- **FR-004**: A public API member detectable from the contract (property,
  event, method — plus any documentation tag with an empty description) that
  carries no documentation MUST fail generation with a message naming the
  member (Art. I: build failure, not warning). Slots, parts and styling
  tokens exist in the manifest only through their documentation tags, so
  their completeness is enforced as empty-description detection plus the
  review checklist, not contract introspection.
- **FR-005**: Both surfaces MUST be committed, and a deterministic sync gate
  in the gate suite MUST fail when the committed files differ from a fresh
  regeneration (tokens-sync precedent).
- **FR-006**: Generated output MUST be reproducible: byte-identical
  regardless of absolute paths, timestamps, machine names or build
  directory (unlike the current docs.json, which embeds both timestamps and
  absolute paths).
- **FR-008**: The committed `generated/docs.json` intermediate MUST be
  normalized to the same standard (no timestamp, no absolute paths) and
  covered by the same sync gate, so no committed generated artifact can
  drift (Art. I) — the CEM derives from it, and an unnormalized intermediate
  would dirty every CI regeneration.
- **FR-009**: The tasks-template machine-surfaces line (T019) MUST be
  updated in the same change to name the delivered pipeline — docs-json →
  custom-elements manifest → llms.txt, with the Zod catalog explicitly
  annotated as Fase 3 — so the 003–016 stories inherit a satisfiable
  obligation.
- **FR-010**: A named slot that the component fills itself (group-managed
  output such as `ki-tabs`' auto-assigned `tab` slot, non-API per spec 014)
  MUST be declared with a `@managedSlot <name> - <reason>` JSDoc tag and is
  then excluded from every generated surface. A malformed declaration, or one
  naming a slot also documented with `@slot`, MUST fail the generation; any
  other listed slot without documentation still fails it (Stencil ≥ 4.45 lists
  every named `<slot>` that `render()` returns).
- **FR-007**: New components scaffolded by the Nx generator MUST inherit
  the surfaces with zero per-component wiring.
- **FR-011** *(amends FR-002)*: `llms.txt` MUST be an index that follows the
  llms.txt convention (https://llmstxt.org/): an H1 naming the library, a
  blockquote summary, body text without headings explaining how to install
  and load it, then H2 sections that are lists of `[name](url): notes`
  links. It MUST link one document per published component, annotated with
  the first sentence of that component's when-to-use guidance, and MUST stay
  within a declared size budget of 16 384 bytes that a test enforces.
- **FR-012**: The build MUST produce one Markdown document per published
  component carrying, from the component contract alone: description,
  when-to-use and when-NOT-to-use guidance verbatim, examples, attributes,
  slots, parts, events, methods and CSS custom properties. An attribute the
  contract declares required, numerically bounded (`@minimum`/`@maximum`)
  or a URL (`@format url`) MUST say so. A document whose component no
  longer exists MUST be removed by the generation.
- **FR-013**: The build MUST produce `llms-full.txt`, the complete content
  in one file (what `llms.txt` carried before FR-011): the preamble and the
  full entry of every published component, plus the GenUI layer in the
  repository copy.
- **FR-014**: Every link of an index MUST resolve where that index is read.
  The index shipped in `@kimen/elements` links relative paths to files
  inside the package; the repository index, which the site publishes at
  `https://kimen.dev/llms.txt`, links absolute addresses of that site. The
  site assembly MUST publish `llms.txt`, `llms-full.txt` and every linked
  document at those addresses.
- **FR-015**: The repository index MUST also link one generated guide per
  GenUI package (catalog, emitter, protocol adapters), derived from the
  same validated GenUI source that feeds the GenUI layer of
  `llms-full.txt`; every index MUST link a theming guide generated from
  the preamble template.
- **FR-016** *(extends FR-005)*: The sync gate MUST cover every file named
  by FR-011 to FR-015. The package's `llms-full.txt` is generated by the
  elements build before packing. The sync gate verifies that it equals the
  elements portion of the committed site summary. The build cache MUST be
  invalidated by every source those files derive from, including the GenUI
  source and the package metadata and entry modules it is validated against.

### Key Entities

- **Custom Elements Manifest**: the community-standard JSON description of
  custom elements; the machine contract for editors, tooling and agents.
- **llms.txt**: the language-model-facing index of the library: a brief
  summary plus links to the documents below (FR-011).
- **Component document**: one Markdown file per published component with
  its complete contract (FR-012).
- **llms-full.txt**: everything in one self-contained text file (FR-013).
- **Guide**: a generated Markdown document for a topic that is not a
  component: theming, and one per GenUI package (FR-015).
- **Usage guidance**: the when-to-use / when-NOT-to-use documentation tags
  carried by each component's contract.

## Constitutional Surface *(mandatory)*

- **Public API delta** (Art. IX): no runtime API change. Adds two published
  artifacts (`custom-elements.json`, `llms.txt`) that become versioned
  alongside the public API from their first release. FR-011 to FR-014
  change the shape of `llms.txt` (an index instead of the whole library)
  and add `llms-full.txt` and `llms/*.md` to the package. The package is
  unpublished (0.0.0), so no released consumer is affected; from the first
  release these paths are part of the machine contract.
- **Bundle budget** (Art. IV): zero runtime impact — build-time artifacts
  only; no new runtime dependency. Build-time dependencies require the usual
  supply-chain review.
- **Accessibility** (Art. V): not applicable — no rendered surface.
- **Tokens** (Art. VI): none introduced; styling tokens are *described* in
  the manifest by name.
- **Catalog/agent legibility** (Art. I): this feature IS the agent-legibility
  backbone; the Fase 3 Zod catalog will consume the manifest, not replace it.
- **Guardrail/security boundary** (Art. VIII): untouched — no spec
  rendering, no actions, no adapter surface.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An agent given only the generated surfaces (no source, no
  human docs) composes a usage of every published component whose produced
  markup validates deterministically against the manifest (tags exist,
  attributes and slots are declared members). The agent run is a scheduled
  eval per Art. III — never merge-blocking; the markup validation itself is
  the deterministic oracle.
- **SC-002**: 100% of published public API members carry documentation and
  usage guidance, enforced mechanically (a violation cannot reach main).
- **SC-003**: Two independent regenerations of the surfaces from the same
  commit are byte-identical (verified in CI on every PR by the sync gate).
- **SC-004**: A component added via the generator appears in both surfaces
  with no manual step beyond the normal build.

## Assumptions

- The Custom Elements Manifest is derived from the existing Stencil
  docs-json output rather than a second analysis pass; how (converter,
  analyzer, or upstream option) is a plan-phase decision.
- The current committed `generated/docs.json` remains an internal
  intermediate (Storybook consumes it), normalized and sync-gated per
  FR-008.
- Default placement: `llms.txt` at the repository root plus a copy published
  with the elements package; the plan may consolidate to one location.
  Since FR-011 the two are no longer copies: the package index is
  elements-only with relative links, the repository index adds the GenUI
  guides and links the site (FR-014).
- The public site is served from `https://kimen.dev/` (the `site` value of
  the documentation build); the repository index derives its absolute links
  from that origin.
- The Fase 2 component specs (003–016) reference this feature for their
  T019 machine-surfaces obligation; implementation order (before or in
  parallel with the first component) is the founder's call at gate 1.
- Art. I also names generated docs and AGENTS.md; both remain explicitly
  deferred (docs site is Fase 5, AGENTS.md generation was already marked
  "until the Art. I generation pipeline exists" in the file itself). This
  spec covers manifest + llms.txt + guidance tags only — recorded here so
  the remaining pipeline gap stays visible, not implicit.
