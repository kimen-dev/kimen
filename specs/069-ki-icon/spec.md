# Feature specification for ki-icon

**Branch** `feat/360-ki-icon` · **Created** 2026-11-19 · **Issue** [#360](https://github.com/kimen-dev/kimen/issues/360)

An author or a GenUI surface can request a local Lucide glyph by name. An icon with adjacent text is decorative. A standalone meaningful icon takes a label from the author.

## Gherkin scenarios

```gherkin
Feature: ki-icon displays an imported Lucide glyph

  # S1
  Scenario: Display a named glyph
    Given the application imports circle-check and triangle-alert
    When the icon name changes from circle-check to triangle-alert
    Then the warning glyph replaces the check glyph

  # S2
  Scenario: Keep illustrations outside the tab order
    Given a labelled and a decorative icon between two controls
    When the user tabs from the first control
    Then focus moves to the second control

  # S3
  Scenario: Name only meaningful icons
    Given the application imports triangle-alert and circle-check
    When the page displays triangle-alert with label "Warning" and circle-check without a label
    Then assistive technology exposes a single image named "Warning"

  # S4
  Scenario: Keep icons out of submitted form data
    Given a form with an icon named circle-check next to an input named status
    When the form data is collected
    Then it contains the status field alone

  # S5
  Scenario: Size and colour follow the surrounding theme
    Given a theme overrides the small icon size and stroke width
    When the page displays a small circle-check in a success ink
    Then the glyph uses the overridden size and stroke width and the surrounding ink

  # S6
  Scenario: Report unavailable names on a guarded surface
    Given the guarded surface imports circle-check alone
    When a surface requests an unimported or unknown icon name
    Then the surface draws no requested icon and reports the unavailable name

  # S7
  Scenario: Leave unavailable standalone icons empty
    Given a page uses an icon with a name unavailable to the application
    When the page is displayed
    Then that icon has no glyph or accessible image and requests no external asset

  # S8
  Scenario: Use a named glyph from A2UI
    Given an A2UI surface declares an Icon with name "check"
    When the adapter translates the surface
    Then the result names the check glyph on a ki-icon

  # S9
  Scenario: Preserve the glyph across user media preferences
    Given a labelled circle-check with the inherited size in a right-to-left row
    When the row is displayed with forced colours, reduced motion and coarse-pointer density
    Then the glyph follows the forced ink, keeps its size and shape, and does not animate

  # S10
  Scenario: Ship only the glyphs selected by the application
    Given an application imports circle-check and the alert-triangle alias
    When the production bundle displays the page
    Then the imported glyphs appear and the bundle excludes the rest of the icon set

  # S11
  Scenario: Keep guarded icons passive
    Given a guarded surface imports circle-check and declares an action
    When the surface attaches that action to circle-check
    Then the surface reports that the icon cannot dispatch actions

  # S12
  Scenario: Audit the four icon gallery appearances
    Given the icon gallery has a visual suite for both schemes
    When release verification checks expected captures
    Then the audit requires onmars and Material 3 in both light and dark
```

| Family | Scenarios |
| --- | --- |
| Core behavior | S1, S7, S8, S10 |
| Keyboard path | S2 |
| Assistive-tech outcome | S3, S7 |
| Form participation | S4 |
| Theming | S5, S9, S12 |
| Guarded surfaces | S6, S11 |

## Requirements

- The component renders the verified Lucide geometry on a 24 × 24 viewBox, with no fill, rounded caps and joins, `currentColor`, and the stroke width token.
- Size defaults to `inherit` (1em). `sm`, `md` and `lg` resolve to theme tokens with defaults of 16, 20 and 24 CSS px at a 16px root.
- A nonblank label exposes one named image. An unlabelled glyph is hidden from assistive technology. Icons have no pointer or keyboard action, motion, or form value.
- Applications import the names their surfaces use. Unknown or unimported icons have no glyph. The guarded catalog reports missing glyphs through its diagnostics. Names never cause fetches or provide SVG source.
- A2UI `Icon` maps to `ki-icon`; the adapter translates standard protocol names to Lucide names where needed. The application owns imports and labels.
- The icon inherits ink. Use semantic high-emphasis text inks on the page surface for meaningful icons (minimum 3:1). Verify the contrast of other ink and background pairs in the chosen mode.
- The package includes the full Lucide ISC and Feather MIT notice as supplied by the source.

## Constitutional surface

Additive public API includes the element, its three props, the theme tokens and per-icon import subpaths. Component discovery supplies direct imports, wrappers and agent metadata. The catalog accepts the documented props and has no icon slots or actions. The component has no runtime dependency or interaction pattern. Packaging and a real consumer build verify the selected glyphs and exclusion of unused geometry.

## Decisions

- **Agent's choice, pending founder confirmation.** Publish `@kimen/elements/icons/<name>` under the existing elements package. This uses the existing release and consumer contracts and ships the verbatim notice with the icon modules. Build the modules from the committed JSON so updates merge as source data with no generated module churn.
- **Agent's choice, pending founder confirmation.** Share registration within a JavaScript realm so direct elements, the lazy loader and catalog agree. Applications import each exact name before mounting or validating a surface. Lucide aliases have their own import paths.
- **Agent's choice, pending founder confirmation.** Treat blank labels as decorative and unrecognized direct-element sizes as inherited. Keep directional artwork as authored in RTL. A composite owns any contextual mirroring and accessibility label for its control.
- **Agent's choice, pending founder confirmation.** Keep the adapter's existing accessibility metadata policy and report A2UI SVG path objects as an unsupported variant. Standard A2UI names resolve to corresponding Lucide names.
- **Agent's choice, pending founder confirmation.** Record the additive feature in a major API declaration because the protected release comparator still classifies the generated Components and JSX namespace changes from #316 as major.
