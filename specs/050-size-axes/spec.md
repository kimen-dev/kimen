# Feature Specification: Size axes for fields, tabs, list rows and choice controls

<!-- KIMEN OVERRIDE of spec-template. Resolved with priority 1 by resolve_template().
     Constitutional basis: .specify/memory/constitution.md Art. II, with Arts. I, IV, V, VI, VII and IX. -->

**Feature Branch**: `feat/issue-316-size-axes` (spec `050-size-axes`)

**Created**: 2026-11-19

**Status**: Intent decided by the founder on 2026-11-19 (D1, D4, D5, D6,
issue #316). D2, D8 and D9 were settled at implementation and await the
founder's confirmation with the change.

**Input**: Issue #316, "Size axes present in Figma but missing in
components". Several Figma masters ship a `Size` axis that the matching
component does not expose; specs 003 and 008 record adding one as an open
decision whose premise (no MarsUI size frames) was refuted on 2026-07-25.

**Constitution check**: a public API addition on nine components (Art. II,
IX): one `size` prop each (one new value on `ki-badge`), new component tokens
(Art. VI) and new catalog values an agent can fill (Art. I, VIII). Medium is
the default everywhere and renders exactly as before, so the change is
additive (MINOR). No new interaction pattern, no change to names, roles,
states or form behavior, no guardrail or security boundary.

## Design-source analysis

Read from the Figma file "Kimen UI" (`.fig` export of 2026-11-19, Regular
radius mode, Default spacing) with the variable bindings of each node, not
only its numbers. Text styles are resolved from the style nodes
(`UI/caption-2` 12/16, `UI/para` 13/20, `UI/body-1` 13/24, `UI/body-2` 15/24,
`UI/title-2` 18/24), because the raw `fontSize` stored on some text nodes is
stale.

| Master | Size | Height | Padding (inline / block) | Radius | Text |
|---|---|---|---|---|---|
| `Input-cell` `8016:286` | xs / sm / md / lg / xl | 24 / 32 / 40 / 48 / 56 | `Space/sm` · `md` · `lg` · `xl` · `2xl`; text wrap `xxs` · `xs` · `xs` · `xs` · `sm` | `Radius/small-component/{size}` | caption-1 · caption-2 · body-1 · body-2 · title-2 |
| `Input-cell` textarea | xs … xl | 56 / 72 / 96 / 104 / 128 | inline `sm` · `md` · `lg` · `xl` · `2xl`; block `md` · `md` · `md` · `lg` · `xl` | `small-component/{size}` | as above |
| `Input-label` `12021:6068`, `Hint-label` `12021:6331` | sm / md / lg | 16 / 20 / 24 | `xxs` inline | — | caption-2 · para · body-2 |
| `Tab-nav` `10048:1249` | xs … xl | 24 … 56 | strip gap `5xl` · `7xl` · `8xl` · `9xl` · `10xl` | — | — |
| `Tab-nav-item` `10048:1068` | xs … xl | 24 … 56 | block end `md` at every size | — | caption-1 · para · body-1 · body-2 · title-2 |
| `List` `10063:2066` | sm / md / lg / xl | 48 / 56 / 64 / 72 (two lines) | inline `md` · `md` · `md` · `xl`; block `sm` · `lg` · `xl` · `2xl`; gap `lg` · `xl` · `xl` · `3xl` | 0 | primary para · para · body-2 · title-2; secondary caption-2 · caption-2 · caption-2 · para |
| `Checkbox` `10030:982` | sm / md / lg | cell 20 / 24 / 28 | box 18 / 20 / 24 | `Radius/sm` | — |
| `Radio` `10053:1943` | sm / md | cell 20 / 24 | circle 18 / 20, dot 8 | round | — |
| `Checkbox-label` `10095:3846`, `Radio-label` `10100:3931`, `Toggle_label` `10101:3995` | sm / md | — | gap `md` · `xl` | — | sm para 13/20, md body-2 15/24 |
| `Toggle` `10023:1125` | sm / md / lg / mobile | cell 40×28 · 48×28 · 56×32 · 64×40 | thumb inset `xxs` · `xxs` · `xxs` · `xs` | track `small-component/xs` · `sm` · `sm` · `md`; thumb `xxs` · `xs` · `xs` · `xs` | track 32×18 · 40×22 · 48×26 · 56×32; thumb 18×14 · 22×18 · 26×20 · 32×24 |
| `Tag` `10106:4651` | xs / sm / md | 20 / 24 / 28 | `Space/xs` + text wrap `xxs` | `small-component/xs` · `sm` · `sm` | caption-1 · caption-2 · caption-2 |

`Input_field` `12022:7132` composes only the md label, cell and hint, so the
file says nothing about how the label follows a smaller or larger cell; D4
settles it. Material 3 has no size axis for any of these components.

## Decisions *(founder, 2026-11-19, unless marked otherwise)*

**D1 — Scope: all nine.** `ki-input`, `ki-textarea`, `ki-select` (xs–xl),
the tab strip (xs–xl), `ki-list-item` (sm–xl), `ki-checkbox` (sm/md/lg),
the radio group (sm/md), `ki-switch` (sm/md/lg/xl) and `ki-badge` (adds xs
to sm/md), in one change.

**D2 — Where the prop lives** *(settled at implementation)*. On the
component the person sees as one control: `ki-input`, `ki-textarea`,
`ki-select`, `ki-list-item`, `ki-checkbox`, `ki-switch`, `ki-badge`. A tab
strip and a radio group take one size for all their members: `size` lives on
`ki-tabs` and on `ki-radio-group`, and their `ki-tab` and `ki-radio`
children take it from there (the `ki-avatar-group` precedent). A strip of
tabs or a group of options in mixed sizes has no design source, and one prop
on the container is one decision for an author or an agent instead of one per
child. Every size is a reflected attribute; an unknown value matches no rule
and renders medium (fallback by CSS construction, the `ki-button` pattern).

**D3 — Values.** Each size takes the Figma metrics above through tokens:
heights from `Space/*`, radii from `Radius/small-component/*`, text styles
from the type scale. Medium keeps the values it ships today, including the
three places where they differ from the master: the textarea's inline
padding (`space-xl`, 12px, against the master's 10px), the tab's icon gap
(`space-xs`) and the switch track radius (`radius-md`, 8px, the same pixel as
`small-component/sm`). What a size changes:

| Component | Changes with the size | Does not change |
|---|---|---|
| `ki-input`, `ki-select` | field height, inline padding, text inset, radius, text, icon / indicator box | border, focus ring, colors, the select's listbox and options |
| `ki-textarea` | inline and block padding, radius, text | `rows`, minimum height |
| `ki-tabs` + `ki-tab` | tab height, text, strip gap | indicator thickness, block-end padding, icon gap |
| `ki-list-item` | minimum height (one and two lines), inline and block padding, gap, primary and secondary text | radius, slotted content |
| `ki-checkbox` | box, minimum target | radius, mark stroke |
| `ki-radio-group` + `ki-radio` | circle, dot, minimum target | the group's own label, help and error |
| `ki-switch` | track, thumb, thumb inset, radii, cell, minimum target | the glyph in the thumb |
| `ki-badge` | height, inline padding, radius, text | weight, colors |

**D4 — The label follows the control in three steps.** Fields: xs and sm use
the `sm` label (caption-2 12/16); md keeps today's label (13/20); lg and xl
use the `lg` label (body-2 15/24). The help and error lines (spec 042) follow
the same steps: they keep today's caption-2 (12/16) up to md and take body-2
(15/24) at lg and xl. The label hint (spec 047) inherits the label's size.
Choice controls follow their label masters: at sm the label is para 13/20,
8px (`space-md`) from the control; md, lg and xl keep today's label (body-2
15/24, 12px away).

**D5 — Density is additive.** The size picks the standard dimension and the
region's density (spec 045) adds its step on top, through the same formulas:
`max(target-min, size + offset)` for field boxes, tabs and rows, so compact
removes 8px from every size, floored at 24px, and touch adds 4px with the
44px target minimum. In touch a field, tab or row is its own target
(045 A1-D3), so sizes under 44px after the step are lifted to 44px: xs, sm
and md fields all measure 44px in touch. Sizes may coincide; they never
invert. Checkbox, radio and switch keep their painted size in every density;
in touch their target extends to 44 × 44 CSS px as A1-D3 already does. Two
consequences settled at implementation: an xs field box (and an sm one in
compact) is 24px with its borders included, so the native control spans the
border rows and its pointer target stays 24px tall; and a checkbox's labelled
row is never shorter than its minimum target, as a radio's already is, so an
sm checkbox row is 24px although its label line is 20px.
Under a coarse primary pointer a field's text is the larger of its size's
text and `--ki-input-font-size-touch` / `--ki-textarea-font-size-touch`
(spec 048), so an xl field keeps its 18px.

**D6 — The switch's `mobile` size ships as `size="xl"`.** `mobile` names a
device, not a size; the touch density (045 A1) covers the touch context.

**D7 — No text under 12px.** Every new xs size uses caption-2 (12/16) where
Figma draws caption-1 (10px), the floor set for `ki-button` xs (spec 002
amendment A1, issue #321).

**D8 — material3** *(settled at implementation)*. Material 3 defines no size
axis. material3 keeps its medium overrides, and the other sizes take the
shared ramp, as `ki-button`'s sizes already do there; like `ki-button`'s,
material3 keeps its own shape at every size (field radius `component-xs`,
badge radius round). Sizes coincide where material3's medium is larger than
the ramp (a material3 field is 48px at md and at lg) and never invert. Two
exceptions, the components M3 specifies at a single size: the M3 switch
(52 × 32 track) is larger than the shared lg switch, and the shared sm tab
would stand taller than the M3 tab, so in material3 every switch size renders
the M3 switch and every strip size renders the M3 tab (contiguous, as M3
tabs are).

**D9 — Token names** *(settled at implementation)*. Medium keeps the unsized
names it ships today (`--ki-input-height`, `--ki-switch-track-width`, …);
the new sizes add `--ki-<component>-<size>-<property>`
(`--ki-input-lg-height`, `--ki-switch-sm-track-width`). Renaming medium to
`-md-` would remove public tokens (a MAJOR change, Art. IX) or deprecate a
hundred names for no behavior; `ki-badge` already has `-sm-`/`-md-` tokens
and only gains `-xs-`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Controls sized to their surroundings (Priority: P1)

A product puts a dense filter bar above a table and a roomy sign-up form on
another page. The team picks `size="sm"` for the filter fields and
`size="lg"` for the sign-up fields; each control takes the height, padding,
radius and text of that size, and its label follows.

**Why this priority**: the issue's reason to exist; the masters already
draw these sizes.

**Independent Test**: measure each component in each size in a real browser.

**Acceptance Scenarios**: S1–S10.

### User Story 2 - Medium never moves (Priority: P1)

Every existing page keeps its layout: without a size, or with an unknown
one, each component renders the medium it ships today.

**Acceptance Scenarios**: S11, S12.

### User Story 3 - Size composes with density and themes (Priority: P2)

A compact region shortens every size by the same step and a touch region
grows it, without breaking the 24px and 44px target minimums; material3
keeps its own medium; a theme can restyle one size alone.

**Acceptance Scenarios**: S13–S18.

### Edge Cases

- An unknown size (`size="huge"`) renders medium.
- `size` on a `ki-tab` or a `ki-radio` is not an API: the strip or the group
  decides. A tab strip nested in another strip's panel takes its own size,
  medium by default, never its ancestor's.
- In compact, xs and sm fields both measure 24px (the floor).
- In touch, xs, sm and md fields, tabs and rows measure 44px.
- A list row with slotted content taller than its minimum grows; the size
  sets a minimum, never a clip.
- A textarea's height is its `rows`; the size changes its padding and text,
  so `rows` lines of a larger text make a taller box.

## Gherkin Scenarios *(mandatory, Art. II)*

```gherkin
Feature: Size axes for fields, tabs, list rows and choice controls
  Text fields, tab strips, list rows, checkboxes, radio groups, switches and
  badges take a size from the design ramp. The size sets the control's
  height, padding, radius and text, the label follows in three steps, the
  region's density adds its step on top, no text drops under 12 pixels, and
  medium renders exactly as it always has.

  # Family: core behavior
  # S1
  Scenario Outline: A text field's size sets its height
    Given an onmars page with a <field> labeled "Email"
    When the field renders with the size "<size>"
    Then its field box measures <height>px tall

    Examples:
      | field     | size | height |
      | ki-input  | xs   | 24     |
      | ki-input  | sm   | 32     |
      | ki-input  | md   | 40     |
      | ki-input  | lg   | 48     |
      | ki-input  | xl   | 56     |
      | ki-select | xs   | 24     |
      | ki-select | sm   | 32     |
      | ki-select | lg   | 48     |
      | ki-select | xl   | 56     |

  # S2
  Scenario Outline: A text field's size sets its text, radius and inline padding
    Given an onmars page with a <field> labeled "Email"
    When the field renders with the size "<size>"
    Then its text measures <text>px, its corner radius <radius>px and its inline padding <padding>px

    Examples:
      | field     | size | text | radius | padding |
      | ki-input  | xs   | 12   | 6      | 6       |
      | ki-input  | sm   | 12   | 8      | 8       |
      | ki-input  | lg   | 15   | 12     | 12      |
      | ki-input  | xl   | 18   | 14     | 14      |
      | ki-select | xs   | 12   | 6      | 6       |
      | ki-select | xl   | 18   | 14     | 14      |

  # S3
  Scenario: A textarea's size sets its padding, radius and text and keeps its rows
    Given an onmars page with a ki-textarea labeled "Notes" with 3 rows
    When the textarea renders with the size "lg"
    Then its text measures 15px, its corner radius 12px and its block padding 10px
    And its box holds exactly 3 lines of text

  # S4
  Scenario Outline: The label and the help text follow the field's size in three steps
    Given an onmars page with a <field> labeled "Email" with the help text "We never share it"
    When the field renders with the size "<size>"
    Then the label text measures <label>px and the help text <help>px

    Examples:
      | field       | size | label | help |
      | ki-input    | xs   | 12    | 12   |
      | ki-input    | sm   | 12    | 12   |
      | ki-input    | md   | 13    | 12   |
      | ki-input    | lg   | 15    | 15   |
      | ki-input    | xl   | 15    | 15   |
      | ki-textarea | sm   | 12    | 12   |
      | ki-select   | lg   | 15    | 15   |

  # S5
  Scenario Outline: A tab strip's size sets every tab
    Given an onmars page with a tab strip holding the tabs "Overview" and "Activity"
    When the strip renders with the size "<size>"
    Then every tab measures <height>px tall with <text>px text
    And the tabs sit <gap>px apart

    Examples:
      | size | height | text | gap |
      | xs   | 24     | 12   | 20  |
      | sm   | 32     | 13   | 24  |
      | md   | 40     | 13   | 26  |
      | lg   | 48     | 15   | 28  |
      | xl   | 56     | 18   | 32  |

  # S6
  Scenario Outline: A list row's size sets its height and its text
    Given an onmars page with a list row "Invoice 42" with the secondary text "Due today"
    When the row renders with the size "<size>"
    Then the row measures <height>px tall with <primary>px primary text and <secondary>px secondary text

    Examples:
      | size | height | primary | secondary |
      | sm   | 48     | 13      | 12        |
      | md   | 56     | 13      | 12        |
      | lg   | 64     | 15      | 12        |
      | xl   | 72     | 18      | 13        |

  # S7
  Scenario Outline: A checkbox's size sets its box and its label
    Given an onmars page with a ki-checkbox labeled "Accept the terms"
    When the checkbox renders with the size "<size>"
    Then its box measures <box>px and its label text <label>px

    Examples:
      | size | box | label |
      | sm   | 18  | 13    |
      | md   | 20  | 15    |
      | lg   | 24  | 15    |

  # S8
  Scenario Outline: A radio group's size sets every radio
    Given an onmars page with a radio group "Plan" holding the radios "Basic" and "Pro"
    When the group renders with the size "<size>"
    Then every radio circle measures <circle>px and every radio label <label>px

    Examples:
      | size | circle | label |
      | sm   | 18     | 13    |
      | md   | 20     | 15    |

  # S9
  Scenario Outline: A switch's size sets its track and its thumb
    Given an onmars page with a ki-switch labeled "Alerts"
    When the switch renders with the size "<size>"
    Then its track measures <track> pixels, its thumb <thumb> pixels and its label text <label>px

    Examples:
      | size | track   | thumb   | label |
      | sm   | 32 x 18 | 18 x 14 | 13    |
      | md   | 40 x 22 | 22 x 18 | 15    |
      | lg   | 48 x 26 | 26 x 20 | 15    |
      | xl   | 56 x 32 | 32 x 24 | 15    |

  # S10
  Scenario: An extra-small badge is 20 pixels tall with 12-pixel text
    Given an onmars page with a ki-badge "New"
    When the badge renders with the size "xs"
    Then it measures 20px tall and its text 12px

  # S11
  Scenario: Without a size every component renders its medium
    Given an onmars page with a field, a textarea, a select, a tab strip, a list row, a checkbox, a radio group, a switch and a badge without a size
    When the page renders
    Then each measures exactly what the same component measures with the size "md"

  # S12
  Scenario: An unknown size renders medium
    Given an onmars page with a ki-input labeled "Email" and the size "huge"
    When the page renders
    Then the field measures exactly what it measures with the size "md"

  # S13
  Scenario Outline: A compact region shortens every field size by one step, floored at 24 pixels
    Given an onmars page with a ki-input labeled "Email" with the size "<size>" inside a region
    When the region declares the density "compact"
    Then its field box measures <height>px tall

    Examples:
      | size | height |
      | xs   | 24     |
      | sm   | 24     |
      | md   | 32     |
      | lg   | 40     |
      | xl   | 48     |

  # S14
  Scenario Outline: A touch region grows every field size by one step and lifts it to 44 pixels
    Given an onmars page with a ki-input labeled "Email" with the size "<size>" inside a region
    When the region declares the density "touch"
    Then its field box measures <height>px tall

    Examples:
      | size | height |
      | xs   | 44     |
      | sm   | 44     |
      | md   | 44     |
      | lg   | 52     |
      | xl   | 60     |

  # S15
  Scenario: Touch extends the targets of small choice controls and keeps their painted size
    Given an onmars page with a ki-checkbox "Accept" and a ki-switch "Alerts" in the size "sm" inside a region
    When the region declares the density "touch"
    Then the checkbox box still measures 18px and the switch track 32 by 18 pixels
    And a pointer anywhere in the 44 by 44 square centred on each control reaches it

  # S16
  Scenario: On a touch screen a small field's text is at least 16 pixels and a large field keeps its own
    Given an onmars page with ki-input fields in the sizes "xs" and "xl" on a device whose primary pointer is coarse
    When the fields render
    Then the text in the xs field measures 16px and the text in the xl field 18px

  # S17
  Scenario: material3 keeps its own medium and takes the shared ramp elsewhere
    Given a material3 page with ki-input fields in the sizes "sm", "md", "lg" and "xl" and ki-switch controls in the sizes "sm" and "lg"
    When the page renders
    Then the fields measure 32px, 48px, 48px and 56px tall
    And both switch tracks measure 52 by 32 pixels

  # Family: theming
  # S18
  Scenario: Reassigning one size's token restyles that size alone
    Given an onmars page whose stylesheet sets --ki-input-lg-height to "52px"
    When ki-input fields render with the sizes "lg" and "md"
    Then the lg field box measures 52px tall
    And the md field box still measures 40px
```

### Scenario Family Coverage *(mandatory for UI components, Art. II)*

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15, S16, S17 | |
| Keyboard path | — | No interaction changes: a size changes dimensions only; every keyboard path and focus indicator is unchanged |
| Assistive-tech outcome | — | No role, name, state or announcement changes; the accessibility obligations of this feature (24px and 44px targets, 12px text floor) are measured by S2, S13, S14 and S15 |
| Form participation | — | No value, validity or reset changes |
| Theming | S18 | |

## Requirements *(mandatory)*

- **FR-001**: The nine components take `size` with the values of D1, as a
  reflected attribute; medium is the default.
- **FR-002**: Each size renders the metrics of D3 in onmars, from tokens only
  (Art. VI), with logical properties only (Art. IV).
- **FR-003**: Without a size, or with an unknown one, each component renders
  exactly its medium (S11, S12).
- **FR-004**: The label, help and error lines follow D4.
- **FR-005**: Density composes per D5; no interactive target drops under
  24 × 24 (default, compact) or 44 × 44 (touch) CSS px.
- **FR-006**: No size renders text under 12px (D7).
- **FR-007**: material3 follows D8.
- **FR-008**: Every new size value is a component token a theme can reassign
  (S18), named per D9.
- **FR-009**: The catalog, manifests, wrappers and llms.txt carry the new
  values (generated, Art. I).

## Success Criteria *(mandatory)*

- **SC-001**: S1–S18 pass in Chromium (PR gate) and in Firefox and WebKit at
  release.
- **SC-002**: The medium visual baselines of the nine components do not
  change.
- **SC-003**: `gates-suite.sh` exits 0.

## Assumptions

- The `Size` axes read on 2026-11-19 are the design source; a later change
  to the masters is a token change, not an API change.
- A list row's start and end content (avatars, buttons) is slotted by the
  author and sized by the author; the row does not resize it.
