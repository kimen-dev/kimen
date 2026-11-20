# Feature specification: Sources

**Issue** #396

**Branch** `feat/396-ki-sources`

## User outcome

A reader can check what an answer relied on. Inline citations identify claims,
and a collapsed-by-default source list lets the reader browse the evidence by
title, domain, and optional snippet.

## Scenario Family Coverage

| Family | Scenario IDs | Coverage |
| --- | --- | --- |
| Core behavior | S1–S6, S15 | Citation order, disclosure, previews, URL policy, streaming and isolated lists. |
| Keyboard path | S7, S8 | Focus opens the preview, Escape dismisses it, Enter opens the list and focuses the source. |
| Assistive-tech outcome | S9 | Link names, ordered list and axe. |
| Form participation | N/A | The elements display and navigate references. They have no value to submit, validate or reset. |
| Theming | S10–S14 | Semantic overrides, RTL, forced colors, reduced motion and touch density. |

## Interpretations

- **Agent's choice, pending founder confirmation.** Activating a citation opens
  its disclosure and focuses the matching title link, following the fragment
  target in the reference preview. The title link follows the source URL in
  the current context. The citation preserves the source URL for native link
  gestures such as opening in a new tab. The preview contains the title and domain.
- **Agent's choice, pending founder confirmation.** Resolve references within
  the same document or shadow root. Identifiers must be unique in that root.
  Number each list independently, append uncited sources in declaration
  order, and update as an answer streams. Missing references and incomplete
  or disallowed source entries are omitted until they can resolve.
- **Agent's choice, pending founder confirmation.** Trusted markup uses native
  `id` on a source. The catalog also exposes `sourceId` because the guarded
  renderer owns the DOM `id` attribute. `citationRef` is the property behind
  the HTML `ref` attribute so JSX and framework refs remain available.
  Guarded renders scope references to their own surface. This keeps a
  citation from borrowing a URL admitted by another surface’s policy.
- **Agent's choice, pending founder confirmation.** Use the native Popover API
  and Kimen's anchored overlay while the separate Popover element is pending.
  Native anchors supply the link semantics. The link target wraps the smaller
  visible citation pill and scales with list controls under touch density.
- **Agent's choice, pending founder confirmation.** Provide configurable count
  and citation label templates. The components declare no catalog actions.

## Bundle measurements

The comparison uses the merged `origin/main` (`f87e8d8`) and the candidate
with Node 26.5.0 and the same installed dependencies. The baseline is a Git
archive built inside this worktree with the package layout preserved.

| Artifact | Metric | Baseline (bytes) | Candidate (bytes) | Increase (bytes) |
| --- | --- | ---: | ---: | ---: |
| MCP Apps document | Raw | 762207 | 781749 | 19542 |
| MCP Apps document | Gzip level 9 | 179013 | 184243 | 5230 |
| MCP Apps document | Brotli | 143418 | 147120 | 3702 |
| MCP server binary | Raw | 2701229 | 2734395 | 33166 |
| MCP server binary | Gzip level 9 | 514106 | 521978 | 7872 |
| MCP server binary | Brotli | 378389 | 383079 | 4690 |
| Onmars token stylesheet | Size Limit | 13803 | 14073 | 270 |
| Material 3 token stylesheet | Size Limit | 5331 | 5350 | 19 |

The Sources composite measures 5.75 kB marginal and 24.55 kB including the
Stencil runtime. The aggregate allowance in `ki-sources/component.json`
records the measured increases and is pending founder confirmation.

## Gherkin

```gherkin
Feature: Sources
  People can check the evidence behind an answer from the claim itself or
  from an ordered list of named source links.

  # Family: core behavior
  # S1
  Scenario: Repeated citations keep the number of their first occurrence
    Given an answer cites "Methods", "Findings", and then "Methods" again
    And its sources are declared as "Findings", "Methods", and "Appendix"
    When the answer is displayed
    Then its citation markers read 1, 2, and 1
    And opening the list shows "Methods", "Findings", and "Appendix" in that order

  # S2
  Scenario: A source list starts closed and can be expanded
    Given a closed answer cites two sources
    When the person activates "2 sources"
    Then both source links become visible with their domains and any supplied snippets

  # S3
  Scenario: Hover shows a citation preview
    Given a citation refers to "Methods" at "example.org"
    When a mouse pointer rests on the citation
    Then the preview shows "Methods" and "example.org"

  # S4
  Scenario: Unavailable references have no activatable link
    Given one citation refers to a missing source and another refers to a source with a disallowed URL
    When the answer is displayed
    Then neither reference creates a citation link
    And the disallowed source is absent from the list

  # S5
  Scenario: Changes to a streamed answer update its numbering
    Given an answer currently cites "Findings" first
    When an earlier citation to "Methods" is inserted
    Then "Methods" becomes source 1 and "Findings" becomes source 2
    And the list follows the new order

  # S6
  Scenario: An answer's citations do not reorder a different source list
    Given an answer has two source lists with distinct source identifiers
    When citations to the second list are displayed before citations to the first
    Then each list and its citations use their own numbering

  # S15
  Scenario: Guarded answers resolve only the sources in their own surface
    Given two guarded answers in one page use the same reference identifier
    When they are rendered with different permitted source origins
    Then each citation resolves to the source in its own answer
    And a reference without a source on its surface remains unavailable

  # Family: keyboard path
  # S7
  Scenario: Keyboard focus shows and dismisses the citation preview
    Given a citation to "Methods" follows the first focusable control
    When the person tabs to the citation
    Then it has visible focus and shows the preview
    And pressing Escape dismisses the preview while focus stays on the citation

  # S8
  Scenario: Activating the citation takes the person to its named source link
    Given a focused citation to "Methods" belongs to a closed source list
    When the person presses Enter
    Then the list opens and focus moves to the "Methods" source link

  # Family: assistive-tech outcome
  # S9
  Scenario: Citations and the expanded source list expose native semantics
    Given an open list with two sources and a citation to "Methods"
    When assistive technology inspects the answer
    Then the citation is a link named "Source 1: Methods"
    And the open disclosure contains an ordered list of named links
    And the answer has no automated accessibility violations

  # Family: theming
  # S10
  Scenario: A semantic color override repaints a citation marker
    Given an answer whose theme changes the second surface color
    When a citation marker is displayed
    Then its background uses the overridden color

  # S11
  Scenario: Right-to-left reading puts a source number at inline start
    Given an open answer in a right-to-left context
    When its sources are displayed
    Then the number sits to the right of the source title

  # S12
  Scenario: Forced colors preserve the citation link and source card
    Given forced colors mode is active
    When an answer and its open source list are displayed
    Then the citation is visibly underlined and the source card has a visible border

  # S13
  Scenario: Reduced motion preserves immediate access to the preview
    Given the person prefers reduced motion
    When the citation receives keyboard focus
    Then its preview appears without an animation

  # S14
  Scenario: Coarse pointers use the source list without a hover preview
    Given the person uses a coarse pointer with touch density and a closed source list
    When the person taps the citation
    Then the preview stays hidden and the linked source is shown
    And the disclosure and source link provide touch-sized targets
```
