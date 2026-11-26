Feature: A page loads only the token CSS its components need
  Beside the full token sheet, @kimen/tokens publishes a core sheet and one
  sheet per component tag. A page that loads the core and the sheets of the
  tags it uses paints those components as the full sheet does, keeps every
  theme, preference mode and override working without !important, and ships
  a fraction of the token CSS.

  Rule: The core plus a tag's sheet paints that tag as the full sheet does

    # S1
    Scenario: A page with one component loads only the core and that component's tokens
      Given a page that loads the core token sheet and the ki-button sheet
      When the page renders a primary ki-button
      Then the button looks as it does with the full token sheet
      And the page declares no token of any other component

    # S2
    Scenario: Every component renders with the core and its own sheet as it does with the full sheet
      Given each registered ki-* tag on a page that loads the core and that tag's sheet
      When the tag renders its default gallery state
      Then its computed styles equal those it has with the full token sheet

    # S3
    Scenario: A component that renders other components brings their tokens in its own sheet
      Given a page that loads the core and the ki-pagination sheet only
      When the page renders a ki-pagination with 12 pages
      Then its buttons and icons look as they do with the full token sheet

  Rule: Themes, preference modes and overrides restyle a split page as they restyle a full one

    # S4
    Scenario: A semantic override on the root restyles a component painted from the split sheets
      Given a page that loads the core and the ki-button sheet
      And a page stylesheet loaded after them that sets --ki-surface-primary-med-em to "#7a1fa2" on :root
      When the page renders a primary ki-button
      Then the button's background is "#7a1fa2"

    # S5
    Scenario: A component override on the root wins even when the component's sheet loads later
      Given a page stylesheet that sets --ki-button-md-height to "3rem" on :root
      And the ki-button sheet loads after that stylesheet
      When the page renders a medium ki-button
      Then the button is 3rem tall

    # S6
    Scenario: A Material 3 region restyles a split-sheet component as it does with the full sheet
      Given a page that loads the core, the ki-button sheet and the material3 sheet
      When a region of the page declares data-ki-theme "material3"
      Then a primary ki-button inside it looks as it does under material3 with the full token sheet

    # S7
    Scenario: More contrast reaches the component tokens of a split sheet
      Given a page that loads the core and the ki-card sheet
      When the person prefers more contrast
      Then the card's border takes its more-contrast colour and width, as with the full token sheet

  Rule: Every existing import keeps working

    # S8
    Scenario: The existing stylesheets keep every token and value they publish today
      Given an application that imports @kimen/tokens/css, @kimen/tokens/css/base and @kimen/tokens/css/material3
      When it is built against the release that adds the split sheets
      Then every token resolves to the value it had before, in every theme, scheme, preference mode and density

    # S9
    Scenario: Loading the full sheet together with split sheets changes nothing
      Given a page that loads the full token sheet and the ki-button sheet
      When the page renders a primary ki-button
      Then the button looks as it does with the full token sheet alone

  Rule: The split stays within its measured budget

    # S10
    Scenario Outline: The token CSS of a page stays within its budget
      Given the published sheets of <page>, minified and brotli-compressed as a bundler ships them
      When the token budgets are measured
      Then they weigh at most <budget> bytes, against the full sheet's budget of 20,724

      Examples:
        | page                                | budget |
        | the core alone                      | 7,000  |
        | the core and ki-button              | 8,300  |
        | the core and the ten-component page | 11,400 |

  Rule: Agents and people can wire the split from the tag name alone

    # S11
    Scenario: A component's documentation names the token sheets it needs
      Given the generated agent and site documentation of ki-pagination
      When a reader looks up how to load the component's tokens
      Then it names @kimen/tokens/css/core, once per page, and @kimen/tokens/css/ki-pagination
