Feature: Tokens and theming with onmars as the default theme
  Every visual value in Kimen resolves from a design token
  (primitive → theme → semantic). onmars is the default theme;
  a brand restyles the system by reassigning the theme and
  semantic layers only, proven by the material3 reference theme.

  # S1
  Scenario: onmars light is the default appearance without configuration
    Given a document that loads the Kimen tokens stylesheet
    When the document renders with no theme or scheme declaration
    Then the brand token resolves to the onmars terracotta "#bc4c26"
    And the base surface token resolves to paper ivory "#f9f7f4"

  # S2
  Scenario: dark appearance follows the system preference automatically
    Given a document that loads the Kimen tokens stylesheet
    When the document renders under a dark system color scheme
    Then the base surface token resolves to the onmars charcoal "#1b1916"

  # S3
  Scenario: a document can force dark over a light system preference
    Given a document whose root declares the color scheme "dark"
    When the document renders under a light system color scheme
    Then the base surface token resolves to the onmars charcoal "#1b1916"

  # S4
  Scenario: a document can force light over a dark system preference
    Given a document whose root declares the color scheme "light"
    When the document renders under a dark system color scheme
    Then the base surface token resolves to paper ivory "#f9f7f4"

  # S5
  Scenario: declaring the material3 theme restyles the document
    Given a document that loads the Kimen tokens and material3 stylesheets
    When the document root declares the theme "material3"
    Then the brand token resolves to the Material 3 primary "#6750a4"

  # S6
  Scenario: material3 exposes the identical token contract as onmars
    Given a document that loads the Kimen tokens and material3 stylesheets
    When the document root declares the theme "material3"
    Then every token name of the onmars contract resolves to a value
    And the material3 stylesheet reassigns no token name outside that contract

  # S7
  Scenario: an unknown theme declaration falls back to onmars
    Given a document that loads the Kimen tokens stylesheet
    When the document root declares the unknown theme "acme"
    Then the brand token resolves to the onmars terracotta "#bc4c26"

  # S8
  Scenario: a subtree can declare the material3 theme inside an onmars document
    Given an onmars document that loads the Kimen tokens and material3 stylesheets
    When a subtree of the document declares the theme "material3"
    Then a button and a text field inside the subtree render as they do in a material3 document
    And a button and a text field outside the subtree keep the onmars appearance

  # S9
  Scenario: a subtree can return to the default theme inside a material3 document
    Given a document whose root declares the theme "material3"
    When a subtree of the document declares the theme "onmars"
    Then a button and a text field inside the subtree render as they do in an onmars document
    And a button and a text field outside the subtree keep the material3 appearance

  # S10
  Scenario: a subtree can force dark inside a light document
    Given a document that renders in the light color scheme
    When a subtree of the document declares the color scheme "dark"
    Then a button and a text field inside the subtree render as they do in a dark document
    And a button and a text field outside the subtree keep the light appearance

  # S11
  Scenario: a subtree can force light inside a dark document
    Given a document whose root declares the color scheme "dark"
    When a subtree of the document declares the color scheme "light"
    Then a button and a text field inside the subtree render as they do in a light document
    And a button and a text field outside the subtree keep the dark appearance

  # S12
  Scenario: nested subtrees each follow their nearest declaration
    Given a material3 dark subtree inside an onmars light document
    When a subtree nested inside it declares the theme "onmars" and the color scheme "light"
    Then a button inside the nested subtree renders as it does in an onmars light document
    And a button between the two subtrees renders as it does in a material3 dark document

  # S13
  Scenario: the tokens stylesheet alone keeps a dark page coherent
    Given a document that loads only the Kimen tokens stylesheet
    When the document renders under a dark system color scheme
    Then the browser paints the page canvas and its native controls dark
    And every component text stays readable against the surface behind it

  # S14
  Scenario: a host page's own color scheme wins over the tokens stylesheet
    Given a document that loads the Kimen tokens stylesheet
    And the host page's own stylesheet declares the color scheme "light" for the page
    When the document renders under a dark system color scheme
    Then a button and a text field render as they do in a light document

  # S15
  Scenario: a theme that redefines a colour ramp gets matching translucent variants
    Given an onmars document with a themed region whose theme redefines the brand ramp step "500"
    When a quiet button inside the region and a quiet button outside it are hovered
    Then the hover fill inside the region is the region's brand step at the onmars alpha
    And the hover fill outside the region keeps the onmars terracotta

  # S16
  Scenario: a themed region that redefines the palette recomputes its semantic tokens
    Given an onmars document with a region that declares its own theme name
    And the page's stylesheet redefines the neutral ramp on that region
    When the document renders
    Then the semantic surfaces inside the region resolve from the region's ramp
    And the semantic surfaces outside the region keep the onmars values

  # S17
  Scenario: the page contract lays out components that have not registered yet
    Given a document that loads the Kimen tokens stylesheet and the page contract
    And no script has registered the segmented control or the radio group
    When the document renders their markup
    Then each segment and each radio sits on its own line
    And the same markup lays out as the components style it once they register
