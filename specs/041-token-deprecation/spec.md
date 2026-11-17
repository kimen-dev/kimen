# Feature Specification: Deprecated tokens are announced before they are removed

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. IX (Public API
     Stability), Art. II (Proportionate Behavior Contracts), Art. I (AI-First:
     One Source of Truth) and Art. VI (Closed Tokens). -->

**Feature Branch**: `claude/feat-041-token-deprecation` (spec `041-token-deprecation`)

**Created**: 2026-11-17

**Status**: Draft — awaiting founder confirmation of the scenarios, the token
list and decisions D1–D7. No token source changes before that.

**Input**: Founder request (2026-11-17), following the 2026-11-14 audit: about
95 published tokens are consumed by no component, no other token and no
public document. Seven were deleted during the refactor; the public API gate
blocks deleting the rest because baseline `0.0.0` publishes them. Recompute
the exact list on `main`, propose a deprecation cycle with DTCG
`$deprecated`, the reason and the replacement, reflect it in the docs and in
the generated CSS, and fix when the tokens are removed.

**Constitution check**: this spec is not approvable until the Gherkin section
below is complete. Behavior enters the system exactly once, here (Art. II).
Deprecating a published token is a public API change (Art. IX: "Deprecations
ship ≥1 MINOR before removal, with migration docs"). It changes no rendered
pixel: every deprecated token keeps its value until it is removed.

## The list *(recomputed on `main` 692cbb2, 2026-11-17)*

Method, reproducible from the repository: take the public token inventory
(`scripts/lib/token-inventory.mjs`, the four theme × scheme compositions,
1173 semantic and component tokens), and subtract every token that is

1. read by a component stylesheet through `var()` (the rule the Custom
   Elements Manifest `cssProperties` already uses, including sheets a
   component loads from another directory);
2. referenced by any token source (`{ki.…}` in any `$value`, every theme and
   mode file);
3. named by non-test source outside the token sources (for example
   `ki-tooltip.tsx` reads `--ki-tooltip-show-delay` and `-hide-delay` through
   `getComputedStyle`);
4. named by a hand-written public document or by the site (`docs/`,
   `site/`, package READMEs, `packages/elements/docs/theming.mdx`). The
   generated reference, `llms*.txt`, `changes/api/` and generated manifests
   do not count, and neither do tests.

What remains is **226** tokens: **85 component tokens** and **141 semantic
tokens**. A further 28 semantic tokens are used only by the docs site and the
landing page, so they are live by rule 4.

The 85 component tokens are the dead set this spec deprecates (D1). Together
with the seven the refactor already deleted they are the audit's "about 95".
Each has a live replacement that a component reads today; Appendix A lists
all 85. They fall into five groups:

| Reason | Tokens | Replacement |
|---|---|---|
| **R-P** Pressed paints the resting cell under the variant's pressed overlay (`--ki-button-primary-active-overlay` for primary, `--ki-button-secondary-active-overlay` for the others) since #71; no stylesheet reads an `-active-` fill, border, ink or shadow | `--ki-button-{variant}-{neutral,danger,success}-active-{bg,border,fg}` (45) and `--ki-button-{variant}-active-shadow` (5) | the same cell with `rest`: `--ki-button-{variant}-{tone}-rest-{bg,border,fg}`, `--ki-button-{variant}-rest-shadow` |
| **R-D** Disabled is tone-independent: every tone paints the neutral disabled cell | `--ki-button-{variant}-{danger,success}-disabled-{bg,border,fg}` (30) | `--ki-button-{variant}-neutral-disabled-{bg,border,fg}` |
| **R-F** A focused field keeps its resting border and is marked by its focus ring (MarsUI Input_field active, 12022:7132) | `--ki-input-focus-border`, `--ki-textarea-focus-border` | `--ki-input-focus-ring-color`, `--ki-textarea-focus-ring-color` |
| **R-H** The field's minimum block size is its height token | `--ki-input-min-target` | `--ki-input-height` |
| **R-S** Hover keeps the trigger's resting fill and washes it with the inverse hover overlay | `--ki-select-hover-bg` | `--ki-surface-hover-overlay-inverse` |
| **R-L** Legacy of the hand-composed listbox shadow, already described as superseded | `--ki-select-listbox-elevation` | `--ki-select-listbox-shadow` |

`{variant}` is each of `primary`, `secondary`, `tertiary`, `quaternary` and
`ghost`.

## Decisions *(proposed, awaiting the founder)*

**D1 — Scope: the 85 component tokens; the semantic layer stays.** The
semantic layer is the published theming palette: the tokens guide tells
consumers to reassign and use it ("Reassign this layer and an entire product
restyles"), our own site paints with 28 of its otherwise unused tokens, and
it transcribes the MarsUI variables, which are authoritative. A semantic
token no component reads today is not dead for a consumer building their own
UI on the theme. The 141 unused semantic tokens are listed in the proposal
for a separate founder decision; this spec does not touch them.

**D2 — Source form: standard `$deprecated` plus a Kimen extension.** On the
token's base definition (never in a material3 or dark overlay, which inherit
it), next to `$description`:

```json
"focus-border": {
  "$value": "{ki.outline.primary-high-em}",
  "$description": "color used by the input component for focus border.",
  "$deprecated": "A focused field keeps its resting border and is marked by its focus ring.",
  "$extensions": {
    "dev.kimen.deprecation": {
      "since": "0.1.0",
      "removal": "1.0.0",
      "replacement": "--ki-input-focus-ring-color"
    }
  }
}
```

`$deprecated` is the DTCG 2025.10 property (a string explains the
deprecation); `$extensions` uses the reverse domain of `kimen.dev`. Style
Dictionary 5.8 implements neither: it passes both through untouched, and only
Kimen's own inventory and emitters read them (the constitution forbids relying
on Style Dictionary features it does not implement, not carrying metadata it
ignores). `$deprecated: true` without the extension, an extension without
`$deprecated`, a deprecation declared on a group, or one redeclared by an
overlay fails the build.

**D3 — Schedule: deprecated since 0.1.0, removed in 1.0.0.** Nothing has been
released yet (every package is at `0.0.0`), so `since` is the first release
that carries the marks; this assumes it is `0.1.0`. The public API gate
already allows a removal only when the previous release's baseline carries the
deprecation and is at least one minor newer than `since`: removing in `1.0.0`
therefore needs a `0.2.0` (or later minor) released with the marks in
between, which is the Art. IX minor. A token still present when
`@kimen/tokens` reaches its `removal` version fails the build (S9), so the
date cannot be forgotten.

**D4 — Where a consumer sees it.**

- *Stylesheets*: each deprecated declaration in `tokens.css` and
  `tokens.material3.css` is followed by
  `/* deprecated since 0.1.0, removed in 1.0.0: use --ki-x */`. Comments are
  outside the published value contract (the CSS surface parser already
  strips them) and minifiers drop them, so the size budget is unaffected.
- *Public API snapshot*: the token facet carries `deprecatedSince` and
  `replacement`, so the gate classifies the deprecation as MINOR and can later
  prove it before allowing the removal.
- *Generated token reference*: the deprecated token's row starts
  "Deprecated since 0.1.0, removed in 1.0.0. Use `--ki-x`.", and a
  "Deprecated tokens" section lists every deprecated token with its
  replacement — the migration table, generated from the sources.
- *Migration guide*: `docs/migrations/deprecated-tokens.md`, hand-written,
  explains the cycle and the five rename rules above and links the generated
  table instead of copying it (Art. I). The rename is mechanical, so a
  search-and-replace over the table is the codemod; no tool is added.

**D5 — No runtime warning.** A custom property cannot warn, and detecting a
consumer's override from component code would cost bytes in every component
for 85 tokens that paint nothing (Art. IV budgets).

**D6 — A component may not read a deprecated token.** The elements build
fails if a component stylesheet reads one (S6). A deprecated token is dead by
definition; re-adopting it would silently extend its life.

**D7 — Declaration.** `changes/api/041-token-deprecation.json`, cumulative
since baseline `0.0.0` (packages `@kimen/elements` and `@kimen/tokens`,
release `major` because the declarations it supersedes already are),
superseding `036-field-validation-api`. `check:api` and the public API tests
point at it. If another feature lands a declaration first, this one is rebound
to the new candidate digest and supersedes that one instead.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A consumer learns a token is going before it goes (Priority: P1)

A team that themed Kimen by overriding `--ki-button-primary-danger-active-bg`
sees, in the stylesheet, the token reference and the public API snapshot,
that the token is deprecated, why, and that `--ki-button-primary-danger-rest-bg`
replaces it; their override keeps working until 1.0.0.

**Why this priority**: removing published tokens without warning breaks
consumers silently; it is the whole point of Art. IX.

**Independent Test**: build the tokens package and inspect the stylesheets,
the generated reference and the public API snapshot (S1–S3).

**Acceptance Scenarios**: S1, S2, S3.

### User Story 2 - The maintainer cannot ship a half-done or false deprecation (Priority: P1)

**Why this priority**: a deprecation without a replacement cannot be removed
by the gate, and a deprecated token a component still reads is not dead.

**Independent Test**: build fixtures with incomplete or contradictory
deprecations (S4–S6).

**Acceptance Scenarios**: S4, S5, S6.

### User Story 3 - The tokens are removed on schedule (Priority: P2)

**Why this priority**: the cycle only closes if removal happens, and never
before a minor has shipped the warning.

**Independent Test**: public API gate fixtures with baselines 0.1.0 and 0.2.0,
and a tokens build at version 1.0.0 (S7–S9).

**Acceptance Scenarios**: S7, S8, S9.

### Edge Cases

- A material3 or dark overlay reassigns a deprecated token's value: allowed
  (the value is themeable until removal); redeclaring the deprecation there is
  not.
- A replacement that is itself deprecated, or not a published token: rejected
  (S5).
- A deprecated token referenced by another token: rejected like a component
  read (it would not be dead). None of the 85 is referenced today.
- The contrast gate keeps measuring the deprecated pairs it measures today
  (for example the danger disabled cells) until they are removed: they are
  still published values.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Deprecated tokens are announced before they are removed
  A published token that nothing paints stays available for at least one
  minor release. Wherever a consumer reads it, it says that it is
  deprecated, since when, when it goes and which token replaces it. It is
  removed on that schedule and never earlier.

  Rule: A deprecated token stays published and names its replacement

    # S1
    Scenario: A deprecated token keeps its value and is marked in the stylesheets
      Given "--ki-input-focus-border" is deprecated since 0.1.0, to be removed in 1.0.0, in favour of "--ki-input-focus-ring-color"
      When the tokens package is built
      Then "--ki-input-focus-border" keeps its value in onmars and material3, light and dark
      And its declaration is annotated "deprecated since 0.1.0, removed in 1.0.0: use --ki-input-focus-ring-color"

    # S2
    Scenario: The public API records a deprecation as a minor change
      Given "--ki-input-focus-border" is deprecated since 0.1.0 in favour of "--ki-input-focus-ring-color"
      When the public API gate compares the candidate with a baseline where it was not deprecated
      Then the token's entry carries deprecatedSince "0.1.0" and replacement "--ki-input-focus-ring-color"
      And the deprecation is classified as a minor change

    # S3
    Scenario: The token reference shows the deprecation next to the token
      Given "--ki-input-focus-border" is deprecated since 0.1.0, to be removed in 1.0.0, in favour of "--ki-input-focus-ring-color"
      When the token reference is generated
      Then the "--ki-input-focus-border" row reads "Deprecated since 0.1.0, removed in 1.0.0. Use --ki-input-focus-ring-color."

  Rule: A deprecation is complete and true, or the build fails

    # S4
    Scenario Outline: A deprecation that leaves out part of its schedule is rejected
      Given "--ki-input-focus-border" is deprecated without a <missing part>
      When the tokens package is built
      Then the build fails naming "--ki-input-focus-border" and its missing <missing part>

      Examples:
        | missing part     |
        | replacement      |
        | deprecation date |
        | removal version  |

    # S5
    Scenario: A replacement that is not a live published token is rejected
      Given "--ki-input-focus-border" is deprecated in favour of "--ki-button-primary-active-shadow"
      And "--ki-button-primary-active-shadow" is itself deprecated
      When the tokens package is built
      Then the build fails naming both tokens

    # S6
    Scenario: A component that reads a deprecated token fails the build
      Given "--ki-input-focus-border" is deprecated
      And the ki-input stylesheet reads "--ki-input-focus-border"
      When the elements package is built
      Then the build fails naming ki-input and "--ki-input-focus-border"

  Rule: A deprecated token is removed on schedule and never earlier

    # S7
    Scenario: Removing a deprecated token before a later minor has shipped it is blocked
      Given baseline 0.1.0 publishes "--ki-input-focus-border" deprecated since 0.1.0
      When a candidate declared major removes "--ki-input-focus-border"
      Then the public API gate blocks the removal because no later minor has shipped the deprecation

    # S8
    Scenario: Removing a deprecated token after a later minor has shipped it passes
      Given baseline 0.2.0 publishes "--ki-input-focus-border" deprecated since 0.1.0 in favour of "--ki-input-focus-ring-color"
      When a candidate declared major removes "--ki-input-focus-border"
      Then the public API gate passes

    # S9
    Scenario: A deprecated token still present at its removal version fails the build
      Given "--ki-input-focus-border" is to be removed in 1.0.0
      When the tokens package is built at version 1.0.0
      Then the build fails naming "--ki-input-focus-border" as due for removal
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

This is a token-contract feature, not a UI component: no element gains or
changes behavior, and every deprecated token keeps its value.

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7, S8, S9 | |
| Keyboard path | | N/A — no interaction changes; the deprecated tokens are painted by nothing |
| Assistive-tech outcome | | N/A — nothing rendered changes |
| Form participation | | N/A — no form-associated behavior changes |
| Theming | | N/A — every deprecated token keeps its value and stays reassignable until removal (S1); no live token changes |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The 85 tokens of Appendix A MUST carry `$deprecated` and
  `$extensions["dev.kimen.deprecation"]` with `since` `0.1.0`, `removal`
  `1.0.0` and the replacement of Appendix A, on their base definition only.
- **FR-002**: Every deprecated token MUST keep its effective value in the four
  theme × scheme compositions (S1).
- **FR-003**: The token inventory MUST reject a deprecation that lacks
  `$deprecated`, `since`, `removal` or `replacement`; whose `since` or
  `removal` is not a SemVer version; whose `removal` is not a later major than
  `since` (or a later minor while `since` is `0.y.z`); that is declared on a
  group; or that an overlay redeclares (S4).
- **FR-004**: A replacement MUST name a published, non-deprecated semantic or
  component token (S5).
- **FR-005**: The elements build MUST fail when a component stylesheet reads a
  deprecated token; the token inventory MUST fail when a token source
  references one (S6).
- **FR-006**: The emitted stylesheets MUST follow each deprecated declaration
  with `/* deprecated since <since>, removed in <removal>: use <replacement> */`
  and MUST NOT change any published value or the closed stylesheet grammar
  (S1).
- **FR-007**: The public API snapshot MUST record `deprecatedSince` and
  `replacement` on each deprecated token facet (S2).
- **FR-008**: The generated token reference MUST open each deprecated row's
  description with "Deprecated since <since>, removed in <removal>. Use
  <replacement>." and list every deprecated token in a "Deprecated tokens"
  section (S3).
- **FR-009**: The tokens build MUST fail when its package version is at or
  beyond a deprecated token's `removal` version (S9).
- **FR-010**: The public API gate's existing removal rule MUST hold for token
  facets: a removal is blocked unless the baseline carries `deprecatedSince`
  and `replacement` and is at least one minor newer than `deprecatedSince`
  (S7, S8).
- **FR-011**: `docs/migrations/deprecated-tokens.md` MUST explain the cycle and
  the rename rules and link the generated table.

### Key Entities

- **Deprecation**: `since` (SemVer), `removal` (SemVer), `replacement`
  (published token name), reason (`$deprecated` text).

## Constitutional Surface *(mandatory)*

- **Art. IX**: the cycle is the article's rule: deprecated in a minor,
  shipped for at least one more minor, removed in the next major, with
  migration docs.
- **Art. I**: the deprecation is declared once, in the DTCG source; the
  stylesheet comment, the snapshot facet and the reference row are generated
  from it.
- **Art. VI**: no value changes; tokens remain the only visual source.
- **Art. VII**: no runtime mechanism, no codemod tool, no new export.
- **Art. X**: the checks are deterministic build failures and the existing
  public API gate; no new workflow.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `packages/elements/generated/public-api.json` carries
  `deprecatedSince` on exactly 85 token facets, and the public API gate passes
  with declaration `041-token-deprecation`.
- **SC-002**: the effective values of all 1173 public tokens in both exported
  stylesheets are byte-identical to `main` before the change.
- **SC-003**: `tokens.css` and `tokens.material3.css` stay within their size
  budgets.
- **SC-004**: recomputing the list with the method above returns no component
  token that is neither consumed nor deprecated.

## Assumptions

- The first published release is `0.1.0`. If the founder picks another
  version, `since` follows it and `removal` stays the next major.
- The 7 tokens deleted during the refactor were not in baseline `0.0.0` or
  were otherwise outside the gate; this spec does not revisit them.
- Tests that pin the deprecated tokens by name (for example contrast pairs)
  stay until removal; the separate token-assertion refactor does not depend on
  this spec.

## Appendix A — the 85 deprecated tokens

Reasons as in the table under "The list".

| # | Deprecated token | Replacement | Reason |
|---|---|---|---|
| 1 | `--ki-button-ghost-active-shadow` | `--ki-button-ghost-rest-shadow` | R-P |
| 2 | `--ki-button-ghost-danger-active-bg` | `--ki-button-ghost-danger-rest-bg` | R-P |
| 3 | `--ki-button-ghost-danger-active-border` | `--ki-button-ghost-danger-rest-border` | R-P |
| 4 | `--ki-button-ghost-danger-active-fg` | `--ki-button-ghost-danger-rest-fg` | R-P |
| 5 | `--ki-button-ghost-danger-disabled-bg` | `--ki-button-ghost-neutral-disabled-bg` | R-D |
| 6 | `--ki-button-ghost-danger-disabled-border` | `--ki-button-ghost-neutral-disabled-border` | R-D |
| 7 | `--ki-button-ghost-danger-disabled-fg` | `--ki-button-ghost-neutral-disabled-fg` | R-D |
| 8 | `--ki-button-ghost-neutral-active-bg` | `--ki-button-ghost-neutral-rest-bg` | R-P |
| 9 | `--ki-button-ghost-neutral-active-border` | `--ki-button-ghost-neutral-rest-border` | R-P |
| 10 | `--ki-button-ghost-neutral-active-fg` | `--ki-button-ghost-neutral-rest-fg` | R-P |
| 11 | `--ki-button-ghost-success-active-bg` | `--ki-button-ghost-success-rest-bg` | R-P |
| 12 | `--ki-button-ghost-success-active-border` | `--ki-button-ghost-success-rest-border` | R-P |
| 13 | `--ki-button-ghost-success-active-fg` | `--ki-button-ghost-success-rest-fg` | R-P |
| 14 | `--ki-button-ghost-success-disabled-bg` | `--ki-button-ghost-neutral-disabled-bg` | R-D |
| 15 | `--ki-button-ghost-success-disabled-border` | `--ki-button-ghost-neutral-disabled-border` | R-D |
| 16 | `--ki-button-ghost-success-disabled-fg` | `--ki-button-ghost-neutral-disabled-fg` | R-D |
| 17 | `--ki-button-primary-active-shadow` | `--ki-button-primary-rest-shadow` | R-P |
| 18 | `--ki-button-primary-danger-active-bg` | `--ki-button-primary-danger-rest-bg` | R-P |
| 19 | `--ki-button-primary-danger-active-border` | `--ki-button-primary-danger-rest-border` | R-P |
| 20 | `--ki-button-primary-danger-active-fg` | `--ki-button-primary-danger-rest-fg` | R-P |
| 21 | `--ki-button-primary-danger-disabled-bg` | `--ki-button-primary-neutral-disabled-bg` | R-D |
| 22 | `--ki-button-primary-danger-disabled-border` | `--ki-button-primary-neutral-disabled-border` | R-D |
| 23 | `--ki-button-primary-danger-disabled-fg` | `--ki-button-primary-neutral-disabled-fg` | R-D |
| 24 | `--ki-button-primary-neutral-active-bg` | `--ki-button-primary-neutral-rest-bg` | R-P |
| 25 | `--ki-button-primary-neutral-active-border` | `--ki-button-primary-neutral-rest-border` | R-P |
| 26 | `--ki-button-primary-neutral-active-fg` | `--ki-button-primary-neutral-rest-fg` | R-P |
| 27 | `--ki-button-primary-success-active-bg` | `--ki-button-primary-success-rest-bg` | R-P |
| 28 | `--ki-button-primary-success-active-border` | `--ki-button-primary-success-rest-border` | R-P |
| 29 | `--ki-button-primary-success-active-fg` | `--ki-button-primary-success-rest-fg` | R-P |
| 30 | `--ki-button-primary-success-disabled-bg` | `--ki-button-primary-neutral-disabled-bg` | R-D |
| 31 | `--ki-button-primary-success-disabled-border` | `--ki-button-primary-neutral-disabled-border` | R-D |
| 32 | `--ki-button-primary-success-disabled-fg` | `--ki-button-primary-neutral-disabled-fg` | R-D |
| 33 | `--ki-button-quaternary-active-shadow` | `--ki-button-quaternary-rest-shadow` | R-P |
| 34 | `--ki-button-quaternary-danger-active-bg` | `--ki-button-quaternary-danger-rest-bg` | R-P |
| 35 | `--ki-button-quaternary-danger-active-border` | `--ki-button-quaternary-danger-rest-border` | R-P |
| 36 | `--ki-button-quaternary-danger-active-fg` | `--ki-button-quaternary-danger-rest-fg` | R-P |
| 37 | `--ki-button-quaternary-danger-disabled-bg` | `--ki-button-quaternary-neutral-disabled-bg` | R-D |
| 38 | `--ki-button-quaternary-danger-disabled-border` | `--ki-button-quaternary-neutral-disabled-border` | R-D |
| 39 | `--ki-button-quaternary-danger-disabled-fg` | `--ki-button-quaternary-neutral-disabled-fg` | R-D |
| 40 | `--ki-button-quaternary-neutral-active-bg` | `--ki-button-quaternary-neutral-rest-bg` | R-P |
| 41 | `--ki-button-quaternary-neutral-active-border` | `--ki-button-quaternary-neutral-rest-border` | R-P |
| 42 | `--ki-button-quaternary-neutral-active-fg` | `--ki-button-quaternary-neutral-rest-fg` | R-P |
| 43 | `--ki-button-quaternary-success-active-bg` | `--ki-button-quaternary-success-rest-bg` | R-P |
| 44 | `--ki-button-quaternary-success-active-border` | `--ki-button-quaternary-success-rest-border` | R-P |
| 45 | `--ki-button-quaternary-success-active-fg` | `--ki-button-quaternary-success-rest-fg` | R-P |
| 46 | `--ki-button-quaternary-success-disabled-bg` | `--ki-button-quaternary-neutral-disabled-bg` | R-D |
| 47 | `--ki-button-quaternary-success-disabled-border` | `--ki-button-quaternary-neutral-disabled-border` | R-D |
| 48 | `--ki-button-quaternary-success-disabled-fg` | `--ki-button-quaternary-neutral-disabled-fg` | R-D |
| 49 | `--ki-button-secondary-active-shadow` | `--ki-button-secondary-rest-shadow` | R-P |
| 50 | `--ki-button-secondary-danger-active-bg` | `--ki-button-secondary-danger-rest-bg` | R-P |
| 51 | `--ki-button-secondary-danger-active-border` | `--ki-button-secondary-danger-rest-border` | R-P |
| 52 | `--ki-button-secondary-danger-active-fg` | `--ki-button-secondary-danger-rest-fg` | R-P |
| 53 | `--ki-button-secondary-danger-disabled-bg` | `--ki-button-secondary-neutral-disabled-bg` | R-D |
| 54 | `--ki-button-secondary-danger-disabled-border` | `--ki-button-secondary-neutral-disabled-border` | R-D |
| 55 | `--ki-button-secondary-danger-disabled-fg` | `--ki-button-secondary-neutral-disabled-fg` | R-D |
| 56 | `--ki-button-secondary-neutral-active-bg` | `--ki-button-secondary-neutral-rest-bg` | R-P |
| 57 | `--ki-button-secondary-neutral-active-border` | `--ki-button-secondary-neutral-rest-border` | R-P |
| 58 | `--ki-button-secondary-neutral-active-fg` | `--ki-button-secondary-neutral-rest-fg` | R-P |
| 59 | `--ki-button-secondary-success-active-bg` | `--ki-button-secondary-success-rest-bg` | R-P |
| 60 | `--ki-button-secondary-success-active-border` | `--ki-button-secondary-success-rest-border` | R-P |
| 61 | `--ki-button-secondary-success-active-fg` | `--ki-button-secondary-success-rest-fg` | R-P |
| 62 | `--ki-button-secondary-success-disabled-bg` | `--ki-button-secondary-neutral-disabled-bg` | R-D |
| 63 | `--ki-button-secondary-success-disabled-border` | `--ki-button-secondary-neutral-disabled-border` | R-D |
| 64 | `--ki-button-secondary-success-disabled-fg` | `--ki-button-secondary-neutral-disabled-fg` | R-D |
| 65 | `--ki-button-tertiary-active-shadow` | `--ki-button-tertiary-rest-shadow` | R-P |
| 66 | `--ki-button-tertiary-danger-active-bg` | `--ki-button-tertiary-danger-rest-bg` | R-P |
| 67 | `--ki-button-tertiary-danger-active-border` | `--ki-button-tertiary-danger-rest-border` | R-P |
| 68 | `--ki-button-tertiary-danger-active-fg` | `--ki-button-tertiary-danger-rest-fg` | R-P |
| 69 | `--ki-button-tertiary-danger-disabled-bg` | `--ki-button-tertiary-neutral-disabled-bg` | R-D |
| 70 | `--ki-button-tertiary-danger-disabled-border` | `--ki-button-tertiary-neutral-disabled-border` | R-D |
| 71 | `--ki-button-tertiary-danger-disabled-fg` | `--ki-button-tertiary-neutral-disabled-fg` | R-D |
| 72 | `--ki-button-tertiary-neutral-active-bg` | `--ki-button-tertiary-neutral-rest-bg` | R-P |
| 73 | `--ki-button-tertiary-neutral-active-border` | `--ki-button-tertiary-neutral-rest-border` | R-P |
| 74 | `--ki-button-tertiary-neutral-active-fg` | `--ki-button-tertiary-neutral-rest-fg` | R-P |
| 75 | `--ki-button-tertiary-success-active-bg` | `--ki-button-tertiary-success-rest-bg` | R-P |
| 76 | `--ki-button-tertiary-success-active-border` | `--ki-button-tertiary-success-rest-border` | R-P |
| 77 | `--ki-button-tertiary-success-active-fg` | `--ki-button-tertiary-success-rest-fg` | R-P |
| 78 | `--ki-button-tertiary-success-disabled-bg` | `--ki-button-tertiary-neutral-disabled-bg` | R-D |
| 79 | `--ki-button-tertiary-success-disabled-border` | `--ki-button-tertiary-neutral-disabled-border` | R-D |
| 80 | `--ki-button-tertiary-success-disabled-fg` | `--ki-button-tertiary-neutral-disabled-fg` | R-D |
| 81 | `--ki-input-focus-border` | `--ki-input-focus-ring-color` | R-F |
| 82 | `--ki-input-min-target` | `--ki-input-height` | R-H |
| 83 | `--ki-select-hover-bg` | `--ki-surface-hover-overlay-inverse` | R-S |
| 84 | `--ki-select-listbox-elevation` | `--ki-select-listbox-shadow` | R-L |
| 85 | `--ki-textarea-focus-border` | `--ki-textarea-focus-ring-color` | R-F |
