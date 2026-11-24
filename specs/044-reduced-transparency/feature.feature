Feature: Opaque surfaces when the person asks for less transparency
  Under a "reduce" transparency preference, a "more" contrast preference, or
  when the page declares it, glass and translucent surfaces that hold content
  become opaque equivalents that keep their tone, contrast and hierarchy,
  through tokens alone.

  # S1
  Scenario: Glass surfaces become opaque under the system preference
    Given an onmars light page with an open "Country" select, a tooltip "Copy link" and a secondary button "Cancel"
    When the page renders under a "reduce" transparency system preference
    Then the listbox, the tooltip and the button paint opaque surfaces
    And none of them blurs what is behind it

  # S2
  Scenario: Tinted alerts and badges keep their tone on an opaque surface
    Given an onmars dark page with an info alert "Saved" and a success badge "Paid"
    When the page renders under a "reduce" transparency system preference
    Then the alert and the badge paint opaque surfaces of their own tone
    And their text measures at least 4.5:1 against those surfaces

  # S3
  Scenario: A floating surface stays distinguishable from the page
    Given an onmars light page with an open "Country" select
    When the page renders under a "reduce" transparency system preference
    Then the listbox keeps its elevation shadow and its edge against the page

  # S4
  Scenario: A dialog becomes opaque while its backdrop still dims the page
    Given an onmars light page with an open dialog "Delete file"
    When the page renders under a "reduce" transparency system preference
    Then the dialog paints an opaque surface without blur
    And the backdrop still dims the page behind the dialog

  # S5
  Scenario Outline: Every content surface is opaque in every shipped theme and colour scheme
    Given a <theme> page in the <scheme> colour scheme with every component that paints glass
    When the page renders under a "reduce" transparency system preference
    Then every surface that holds content paints an opaque colour without blur
    And every text on those surfaces measures at least 4.5:1

    Examples:
      | theme     | scheme |
      | onmars    | light  |
      | onmars    | dark   |
      | material3 | light  |
      | material3 | dark   |

  # S6
  Scenario: A page can declare reduced transparency without the system preference
    Given an onmars light page whose root declares the transparency "reduce"
    When the page renders under no transparency system preference
    Then the open "Country" listbox paints an opaque surface without blur

  # S7
  Scenario: More contrast also removes transparency
    Given an onmars light page with an open "Country" select
    When the page renders under a "more" contrast system preference
    Then the listbox paints an opaque surface without blur

  # S8
  Scenario: Without a preference or a declaration glass is unchanged
    Given an onmars light page with an open "Country" select
    When the page renders under no transparency or contrast system preference
    Then the listbox keeps its translucent glass surface and its backdrop blur

  # S9
  Scenario: Hover and press washes keep tinting the control they sit on
    Given an onmars light page with a ghost button "More" under the pointer
    When the page renders under a "reduce" transparency system preference
    Then the hover wash still tints the button over the page surface

  # S10
  Scenario: A themed region inside a page that declares reduced transparency keeps it
    Given a page whose root declares the transparency "reduce"
    When a region of the page declares the theme "material3"
    Then a secondary button inside the region paints an opaque surface without blur

  # S11
  Scenario: A page's own opaque value for a glass surface wins
    Given an onmars light page whose stylesheet sets the reduced-transparency value of the floating glass surface to "#fafafa"
    When the page renders under a "reduce" transparency system preference
    Then the open "Country" listbox paints "#fafafa"

  # S12
  Scenario: Reduced transparency applies over a theme of the page's own
    Given a light page themed "acme" by its own stylesheet, which makes the floating glass surface translucent
    When the page renders under a "reduce" transparency system preference
    Then the open "Country" listbox paints an opaque surface without blur

  # S13
  Scenario: A declared transparency applies over a theme of the page's own
    Given a light page themed "acme" by its own stylesheet, which makes the floating glass surface translucent
    And the page root declares the transparency "reduce"
    When the page renders under no transparency system preference
    Then the open "Country" listbox paints an opaque surface without blur

  # S14
  Scenario: A theme of the page's own chooses its reduced-transparency values
    Given an onmars light page with a region themed "acme" by its own stylesheet, which sets the reduced-transparency value of the floating glass surface to "#fafafa"
    When the page renders under a "reduce" transparency system preference
    Then the open "Country" listbox inside the region paints "#fafafa"
