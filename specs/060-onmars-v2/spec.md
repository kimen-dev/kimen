# Feature Specification: Onmars v2 theme values

**Feature Branch**: `feat/341-onmars-v2-tokens`

**Source**: [Issue #341](https://github.com/kimen-dev/kimen/issues/341) and its
Calma token tables.

## Gherkin

```gherkin
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
```

## Decisions

- Agent's choice, pending founder confirmation. Emit the specified elevation
  geometry with scheme-aware colors. Where geometry differs, a transparent
  layer hides the other scheme's geometry so nested color schemes and host CSS
  continue to work.
- Agent's choice, pending founder confirmation. Schedule the spring name for
  deprecation in 0.1.0 and removal in 1.0.0, following spec 041. The replacement
  uses the original curve in Material 3 to preserve its control motion.
- Agent's choice, pending founder confirmation. In onmars dark, the primary
  neutral button uses a light fill and dark ink. Its danger and success tones
  retain their dark fills. Verify the expected polarity and each pair's contrast.
- Agent's choice, pending founder confirmation. Use the 80% inverse ink for the
  onmars more-contrast select placeholder so it meets 7:1 on the focused fill.
- Agent's choice, pending founder confirmation. Use semantic roles for the
  inverse tooltip colors and flat card. The component dimensions use the
  existing radius, space and border scale aliases named in the issue.
- Agent's choice, pending founder confirmation. Keep the current caption-2
  scale so the tooltip's requested alias resolves to 12px. The older design
  bundle uses 13px from the separate type-scale proposal.
- Agent's choice, pending founder confirmation. The opt-in page stylesheet
  reads the page surface role, so the canvas uses paper in onmars light.
- Agent's choice, pending founder confirmation. Compact the CSS and inline
  references to fixed private foundations to stay within the existing
  stylesheet budgets. Keep their declarations and the public aliases.

## Integration

Calma uses the merged tokens from #342, #343 and #347. Both complete backdrop
filters are `none`. Dialog and tooltip use solid fills, and the tooltip arrow
uses the bubble fill by default. The select listbox keeps its reference tint
as one background color. The dialog heading uses Newsreader at the display
semibold weight, while alert headings use the body family.
