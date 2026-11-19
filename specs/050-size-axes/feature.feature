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
    And a pointer anywhere in the 44 by 44 square centred on each control's target reaches it

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
