# Table

**Issue** #354 · **Branch** `feat/354-ki-table`

Use `ki-table` when people need to compare, scan or sort records with the same fields. Use CSS grid for layout, `ki-list` for simple lists, and a description list for key–value details.

The author supplies a native table with a caption, column headers and a row header for each record. The component styles that markup in place. It emits sort requests for sortable headers and manages selection for rows with stable keys. See [the API contract](contracts/api.md).

## Scenario Family Coverage

| Family | S-IDs | N/A justification |
|---|---|---|
| Core behavior | S1–S8 (S1, S2, S3, S4, S5, S6, S7, S8) | |
| Keyboard path | S9, S10, S11 | |
| Assistive-tech outcome | S12, S13 | |
| Form participation | | N/A. The table is a data display. Its unnamed selection checkboxes represent table state and contribute no form entries. |
| Theming | S14, S15, S16, S17, S18, S19 | |

## Interpretations

- **Agent's choice, pending founder confirmation.** Use one direct light-DOM table. Use `data-numeric` for numeric alignment and `data-meta` for secondary text, with native caption and scope supplied by the author.
- **Agent's choice, pending founder confirmation.** Enhance plain `th[data-sort]` with a native button and reuse an authored direct button when supplied. The first request is ascending and subsequent requests derive from the application's `aria-sort`. The application sets that attribute on only the sorted header.
- **Agent's choice, pending founder confirmation.** Select the visible records with distinct, nonempty `data-key` values. The table can read initial selection from `aria-selected="true"`, retains it by key across replacement or reordering, and reports checked keys in current row order after user activation. Use `select-all-label` and `row-selection-label` (`{row}` placeholder) to localize generated checkbox labels.
- **Agent's choice, pending founder confirmation.** Append one static skeleton row while loading, as in the reference. Keep existing records and controls available. The author sets a block-size limit to activate vertical scrolling and a sticky header. The frame is keyboard-focusable when it overflows and takes its region name from the caption.
- **Agent's choice, pending founder confirmation.** Coarse pointers and the existing touch density tokens increase control targets while ordinary desktop rows match the reference density. Keep selection and focus cues in forced colors. Use semantic `text.supporting` for the header and secondary ink so standard mode keeps the proposed paint and contrast-more can strengthen it.
- **Agent's choice, pending founder confirmation.** The application composes row actions in a trailing cell using `ki-icon-button` and `ki-menu`. Register the default slot and both action events in the catalog. Native table markup is supplied by the host application because the guarded renderer's native allowlist does not include tables. Guarded action bindings also require one unambiguous event per component.

- **Agent's choice, pending founder confirmation.** With direct imports and framework wrappers, register `ki-checkbox` alongside Table for selection. The full loader registers both. This keeps the checkbox implementation out of the standalone Table bundle.

## Behavior contract

```gherkin
Feature: Table
  People scan and compare records in a native table, request a sort,
  and select records for actions elsewhere on the page.

  # Family: core behavior
  # S1
  Scenario: The whole table fits inside a horizontally scrolling frame
    Given a narrow page with a table wider than its frame
    When the table appears
    Then every column remains available inside the frame
    And the page itself does not scroll horizontally

  # S2
  Scenario Outline: The application receives the next sort direction
    Given a services table sorted by name ascending and an unsorted numeric column
    When the person activates "<header>"
    Then the application receives one ki-sort event for "<key>" with direction "<direction>"
    And the current sort and row order remain as supplied by the application

    Examples:
      | header   | key      | direction  |
      | Name     | name     | descending |
      | Requests | requests | ascending  |

  # S3
  Scenario: Selecting one record makes the bulk selection mixed
    Given a selectable services table with no selected records
    When the person checks "Select Billing API"
    Then Billing API is selected and the bulk checkbox is mixed
    And ki-selection-change reports only "billing"

  # S4
  Scenario Outline: The bulk checkbox changes every keyed record
    Given a selectable services table with <selection>
    When the person activates the bulk checkbox
    Then the result is <result>
    And ki-selection-change reports <keys> in displayed order

    Examples:
      | selection           | result                      | keys                   |
      | some rows selected  | all keyed rows selected      | "billing" and "search" |
      | all rows selected   | all keyed rows unselected    | no keys                |

  # S5
  Scenario: Replacing rows retains selection for keys still present
    Given a selectable table with Billing API and Search index selected
    When the application replaces the rows with Search index and Web app
    Then Search index is selected and Web app is unchecked
    And the bulk checkbox is mixed

  # S6
  Scenario: Loading adds a placeholder after the existing records
    Given a services table displaying existing records
    When the next set of records starts loading
    Then the table is busy and shows a decorative placeholder row
    And its existing records remain visible

  # S7
  Scenario: A sticky header stays visible while records scroll
    Given a services table with a sticky header and a constrained block size
    When the person scrolls past the first record
    Then the column headers remain at the top of the frame

  # S8
  Scenario: Leaving selection mode removes the selection column
    Given a selectable table with Billing API selected
    When the application turns selection off
    Then the table has its original columns
    And Billing API no longer has the selection state added by the table

  # Family: keyboard path
  # S9
  Scenario: A keyboard user requests a sort
    Given keyboard focus on the Name sort button
    When the person presses Enter
    Then ki-sort requests ascending name order
    And visible focus remains on the Name button

  # S10
  Scenario: A keyboard user selects a record
    Given keyboard focus on the unchecked "Select Search index" checkbox
    When the person presses Space
    Then Search index is selected
    And ki-selection-change reports only "search"

  # S11
  Scenario: A keyboard user can scroll a wide table with no interactive cells
    Given a wide static table inside a narrow frame with keyboard focus on the frame
    When the person presses the right arrow
    Then the frame scrolls to show more of the table

  # Family: assistive-tech outcome
  # S12
  Scenario: The native table retains its caption and header relationships
    Given a services table with a caption, column headers and row headers
    When the accessibility tree is queried
    Then it exposes the "Services" table and the column and row headers
    And the active sort direction is exposed on the column header

  # S13
  Scenario: Selection controls can be named in the page language
    Given a selectable services table with localized row and bulk selection labels
    When the accessibility tree is queried
    Then the bulk checkbox and each row checkbox have the supplied names

  # Family: form participation — N/A, justified in spec.md

  # Family: theming
  # S14
  Scenario: Density changes row height while numeric values align at the end
    Given default and compact tables with a numeric column
    When the tables appear in a right-to-left page
    Then the rows measure 48px and 40px respectively
    And numeric cells align at the inline end with tabular figures

  # S15
  Scenario: Sticky headers use the theme's surface and optical effects
    Given a theme with custom table background image and backdrop filter tokens
    When a sticky table appears
    Then its frame paints those effects over the themed surface

  # S16
  Scenario: Forced colors keep the selection and keyboard focus distinct
    Given a selectable table with a selected row in forced colors
    When the keyboard focuses the sort button
    Then focus is visible in the system colors
    And the selected row remains visually distinguishable

  # S17
  Scenario: A loading row is still under reduced motion
    Given a services table in a reduced-motion environment
    When loading starts
    Then the placeholder appears without animation

  # S18
  Scenario: A touch pointer gets a larger activation area in compact tables
    Given a compact selectable table on a device with a coarse pointer
    When the table appears
    Then its sort buttons and checkboxes have targets at least 44 by 44 pixels

  # Family: theming
  # S19
  Scenario: A table themes the background of resting secondary values
    Given a table with a custom resting background for metadata and numeric cells
    When the page renders
    Then the secondary values show their themed background
```
