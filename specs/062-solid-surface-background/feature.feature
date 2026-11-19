Feature: Optional background images on floating surfaces
  Themes can paint the dialog, tooltip and select listbox with a solid fill
  or layer a background image over the fill.

  # S1
  Scenario Outline: A theme can paint a solid floating surface
    Given the theme supplies an opaque fill and no background image for the <surface>
    When the <surface> is shown
    Then the surface paints the supplied fill without a background image

    Examples:
      | surface        |
      | dialog         |
      | tooltip        |
      | select listbox |

  # S2
  Scenario Outline: A theme can layer an image over the floating surface fill
    Given the theme supplies a fill and a background image for the <surface>
    When the <surface> is shown
    Then the surface paints the supplied image over the fill

    Examples:
      | surface        |
      | dialog         |
      | tooltip        |
      | select listbox |

  # S3
  Scenario Outline: The shipped themes preserve their existing floating surface appearance
    Given the page uses the <theme> theme
    When the <surface> is shown
    Then the surface keeps its existing appearance

    Examples:
      | theme       | surface        |
      | onmars v1   | dialog         |
      | onmars v1   | tooltip        |
      | onmars v1   | select listbox |
      | Material 3 | dialog         |
      | Material 3 | tooltip        |
      | Material 3 | select listbox |

  # S4
  Scenario Outline: The onmars v1 glass image still uses the legacy stop colors
    Given the onmars v1 theme supplies legacy start and end colors for the <surface>
    When the <surface> is shown
    Then its default background image uses those colors

    Examples:
      | surface |
      | dialog  |
      | tooltip |

  # S5
  Scenario Outline: A forced palette gives a floating surface a Canvas fill
    Given the person uses a forced palette
    And the theme supplies a background image for the <surface>
    When the <surface> is shown
    Then it paints an opaque Canvas fill without the image

    Examples:
      | surface        |
      | dialog         |
      | tooltip        |
      | select listbox |
