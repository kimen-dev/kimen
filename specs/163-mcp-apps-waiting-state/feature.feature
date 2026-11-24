Feature: An MCP Apps surface with nothing to paint shows that it is waiting
  The packaged surface document shows a text-free waiting placeholder from
  the moment it loads until a tool result paints a spec, so a host that has
  not delivered a result, or will not deliver it again, shows a card that is
  waiting instead of an empty page.

  Rule: Until a spec paints, the surface shows a waiting placeholder

    # S1
    Scenario: A surface that has received no result shows the waiting placeholder
      Given a host that embeds the Kimen surface document
      When the handshake completes and no tool result has arrived
      Then the surface shows a waiting placeholder with no text
      And the surface is marked busy for assistive technology

    # S2
    Scenario: The first accepted result replaces the waiting placeholder
      Given a surface showing the waiting placeholder
      When a tool result arrives whose spec the guarded renderer accepts
      Then the spec is painted and no part of the placeholder remains
      And the surface is no longer marked busy

    # S3
    Scenario: A refused result leaves the waiting placeholder in place
      Given a surface showing the waiting placeholder
      When a tool result arrives whose spec the guarded renderer refuses
      Then the surface still shows the waiting placeholder and stays marked busy

    # S4
    Scenario: A re-created surface whose host sends no result again shows the placeholder, not an empty page
      Given a host that tore down a painted surface and embedded the document again
      When the handshake completes and the host sends the tool input but no tool result
      Then the surface shows the waiting placeholder

    # S7
    Scenario: A placeholder that has waited 10 seconds without a result stops animating
      Given a surface showing the waiting placeholder
      When 10 seconds pass without a tool result
      Then the placeholder stays in place and stops animating

  Rule: The placeholder follows the person's settings

    # S5
    Scenario: With reduced motion the placeholder does not animate
      Given the person prefers reduced motion
      When the surface shows the waiting placeholder
      Then the placeholder does not animate

    # S6
    Scenario: The placeholder follows the host's dark theme
      Given a host whose theme is dark
      When the surface shows the waiting placeholder
      Then the placeholder uses the dark color scheme of the default theme
