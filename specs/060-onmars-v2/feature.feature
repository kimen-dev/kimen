Feature: Onmars v2 theme values

  Rule: Onmars uses the Calma design tokens

    # S1
    Scenario: The default theme follows the paper and charcoal palettes
      Given the onmars theme
      When its light and dark token values resolve
      Then the page, text, accents, tints and focus cues use the specified Calma values
      And the body and display stacks start with Instrument Sans and Newsreader

    # S2
    Scenario: Components resolve the Calma shape and surface roles
      Given the onmars theme
      When a component resolves its styling tokens
      Then controls, cards, dialogs and tooltips use the specified Calma shapes and surfaces
      And each elevation paints its specified shadow in the active scheme

    # S3
    Scenario: The old motion token identifies its replacement
      Given the built token stylesheets
      When the onmars motion tokens resolve
      Then fast, moderate and slow motion take 150, 260 and 380 milliseconds
      And the old spring name still resolves to the emphasized-out curve and names its replacement

  Rule: Themes preserve accessibility and Material 3 preserves its styling

    # S4
    Scenario: Existing Material 3 values remain stable
      Given the Material 3 values before the Calma port
      When the updated token package resolves Material 3
      Then each existing Material 3 token resolves to its previous value in both schemes and all preference modes

    # S5
    Scenario: Text and controls meet their contrast thresholds
      Given the onmars and Material 3 themes in both schemes
      When their standard, reduced-transparency and more-contrast values are checked
      Then enabled text and controls meet the contrast thresholds for the active mode
