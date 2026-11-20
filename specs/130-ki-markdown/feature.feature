Feature: ki-markdown renders readable Markdown inside the Kimen trust boundary
  A reader can follow a formatted answer while it is arriving.

  # S1
  Scenario: Read the current Markdown source
    Given the element contains the Markdown heading "# Workspace"
    When the author supplies "# Release" through src-text
    Then "Release" is the level-three heading and the source heading is replaced

  # S2
  Scenario: Keep HTML and disallowed links inert
    Given the source contains raw markup, a disallowed destination and a relative link
    When the reader views the Markdown
    Then the markup and rejected link label remain visible as text
    And the relative link can be followed

  # S3
  Scenario: Respect the host's URL origins
    Given a guarded surface permits only "https://docs.example"
    When it renders Markdown links and enabled images for that origin and other destinations
    Then only absolute URLs for "https://docs.example" become links or images

  # S4
  Scenario: Keep streamed code and tables readable
    Given a streamed answer contains an open TypeScript fence and an incomplete table row
    When more code and table cells arrive
    Then the known code and table content keep their presentation
    And the received content appears without replacing the existing code block and table

  # S5
  Scenario: Read A2UI content text as Markdown
    Given an A2UI content Text supplies "## Workspace" and an A2UI button has a Markdown-looking label
    When the surface is converted
    Then content Text goes through the Markdown element
    And the button label stays literal text

  # S6
  Scenario: Control when images can load
    Given the source has an allowed image and a disallowed image
    When the author enables image loading
    Then the allowed image appears with its alternative text
    And the other image is still represented by its alternative text only

  # S7
  Scenario: Reach Markdown controls by keyboard
    Given an answer has a link next to a copyable code sample
    When the reader navigates with Tab
    Then the link and code controls receive visible focus in document order

  # S8
  Scenario: Read the structure through assistive technology
    Given an answer has headings, a task list, a table, an external link and a TypeScript sample
    When assistive technology reads the answer
    Then it exposes the heading levels, list state and table headers
    And it names the external link with the new-tab announcement and the sample by language

  # S9
  Scenario: Restyle inline code
    Given the page assigns a custom Markdown inline-code fill
    When the reader views an inline command
    Then the inline command uses the assigned fill

  # S10
  Scenario: Read under system accessibility preferences
    Given forced colors and reduced motion are active
    When the reader reads the answer and focuses its link
    Then the link has visible focus and the answer updates without animation

  # S11
  Scenario: Read a quote in a right-to-left layout
    Given the answer is in a right-to-left interface
    When the reader views a quote
    Then the quote indents from the right and its marker is on the right

  # S12
  Scenario: Copy a snippet on a coarse pointer
    Given touch density is active on a coarse pointer
    When the reader reaches for the sample's Copy code button
    Then its hit area spans at least 44 CSS pixels in each direction

  # S13
  Scenario: Read Markdown emphasis and notes
    Given an answer uses strong emphasis, strikethrough, inline code and a NOTE marker
    When the reader views the answer
    Then the emphasis and code retain their distinct formatting
    And the note text is presented in a Kimen Note
