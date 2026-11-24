Feature: An action is a report, not consent
  A bound action reports that a rendered component fired the event it is
  bound to, whatever made the component fire it. The renderer cannot tell a
  person's gesture from a timer, a failed load or a property the spec set,
  so an action is never the person's consent.

  Rule: A bound event reports its action whatever caused it

    # S1
    Scenario Outline: An event the component fires on its own still reports its action
      Given a spec that binds the declared action "noted" to the "<event>" event of <component>
      When <cause>
      Then the host receives one "noted" action

      Examples:
        | component                                   | event      | cause                     |
        | a toast that stays for 2 seconds            | ki-dismiss | the toast's time runs out |
        | an image whose source cannot be loaded      | ki-error   | the image fails to load   |
        | a lazy tree item that is expanded and empty | ki-load    | the surface renders       |
