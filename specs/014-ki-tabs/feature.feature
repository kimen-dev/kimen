Feature: Tabs
  A tab group lets a person switch between peer content views — one visible
  at a time — with full input-modality parity, and lets any brand restyle it
  through tokens alone.

  # Family: core behavior
  # S1
  Scenario: Selecting a tab reveals its panel
    Given a tab group with tabs "Email" and "Notifications" where "Email" is selected
    When the user selects the "Notifications" tab
    Then the "Notifications" panel is shown and the "Email" panel is hidden
    And a ki-change event reports "Notifications" as the selected tab

  # S2
  Scenario: A disabled tab cannot be selected
    Given a tab group where the "Billing" tab is disabled
    When the user attempts to select the "Billing" tab
    Then the selection does not change and the "Billing" panel stays hidden

  # S3
  Scenario: A selection value matching no tab falls back to the first non-disabled tab
    Given a tab group declared with a selected value that matches none of its tabs
    When the page renders
    Then the first non-disabled tab is selected and its panel is shown

  # S12
  Scenario: The fallback never lands on a disabled tab
    Given a tab group whose first tab "Email" is disabled and whose declared value is "Email"
    When the page renders
    Then the second tab "Notifications" is selected and its panel is shown

  # S18
  Scenario: A group whose every tab is disabled selects nothing
    Given a tab group whose every tab is disabled
    When the page renders
    Then no tab is selected and no panel is visible

  # Family: keyboard path
  # S4
  Scenario: The arrow key moves selection to the next tab
    Given a left-to-right document where the selected "Email" tab is focused and "Notifications" is the next tab
    When the user presses the right arrow key
    Then the "Notifications" tab is selected with visible focus
    And the "Notifications" panel is shown

  # S13
  Scenario: Arrow navigation wraps past a disabled tab
    Given a tab group "Email", "Notifications", "Security" where "Email" is disabled and the last tab "Security" is focused
    When the user presses the right arrow key
    Then the selection wraps past the disabled "Email" tab to the "Notifications" tab with visible focus

  # S5
  Scenario: End jumps to the last tab
    Given the selected "Email" tab is focused in a tab group ending with "Security"
    When the user presses End
    Then the "Security" tab is selected with visible focus

  # S14
  Scenario: Home jumps to the first tab
    Given the selected "Security" tab is focused in a tab group beginning with "Email"
    When the user presses Home
    Then the "Email" tab is selected with visible focus

  # S6
  Scenario: The tab key leaves the tab list into the visible panel
    Given the selected "Email" tab is focused in a tab group of three tabs
    When the user presses Tab
    Then focus skips the remaining tabs and lands in the "Email" panel

  # S15
  Scenario: A panel without focusable content receives focus itself
    Given the selected "Email" tab is focused and the "Email" panel contains no focusable content
    When the user presses Tab
    Then the "Email" panel itself receives focus

  # S16
  Scenario: Arrow keys follow a right-to-left reading direction
    Given a right-to-left document where the selected "Email" tab is focused and "Notifications" is the next tab
    When the user presses the left arrow key
    Then the "Notifications" tab is selected with visible focus

  # Family: assistive-tech outcome
  # S7
  Scenario: The tab group exposes roles, names and the selected state
    Given a tab group labeled "Settings" with tabs "Email" and "Notifications"
    When the accessibility tree is queried
    Then it exposes a tab list named "Settings" containing tabs "Email" and "Notifications"
    And the selected "Email" tab is exposed as selected

  # S8
  Scenario: The visible panel is exposed as a tab panel named after its tab
    Given a tab group where the "Email" tab is selected
    When the accessibility tree is queried
    Then the visible panel is exposed as a tab panel whose accessible name is "Email"

  # Family: form participation — N/A, justified in spec.md (tabs switch views,
  # they never contribute form data; not in the charter's form-associated list)

  # Family: theming
  # S9
  Scenario: A second theme restyles the tabs through tokens alone
    Given a page declaring the material3 theme over the default stylesheet
    When the page renders
    Then the tab group's appearance resolves from material3 token values

  # S10
  Scenario: The tabs honor a forced dark scheme
    Given a page forcing the dark color scheme under the onmars theme
    When the page renders
    Then the tab group's appearance resolves from the dark token values

  # S11
  Scenario: Tab order follows the document's writing direction
    Given a right-to-left document with tabs "Email" and "Notifications"
    When the page renders
    Then the "Email" tab leads from the right and the tab order flows right to left

  # S17
  Scenario: Reduced motion suppresses the panel-switch animation
    Given a page where the user prefers reduced motion and the "Email" tab is selected
    When the user selects the "Notifications" tab
    Then the "Notifications" panel is shown without transition or animation
