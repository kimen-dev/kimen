Feature: MCP Apps surfaces change without a full repaint
  A Kimen surface inside an MCP Apps host paints through the live surface.
  A tool result always carries the full spec it describes and may also carry
  an update: a live batch and the page revision it was computed on. The page
  applies the update only on that revision and only when the live surface
  accepts it, so what the person is typing survives; in every other case it
  paints the full spec, as before. Each action call tells the server where
  the person acted: the bound node's id and the page revision.

  Rule: An update changes only what it names, or the full spec wins

    # S1
    Scenario: An update computed on the current revision keeps what the person is typing
      Given a surface at revision 2 whose field "title" has the keyboard focus and holds the unsent text "Buy milk"
      When a tool result arrives whose update, computed on revision 2, adds the item "Call Ana" to the list "tasks"
      Then the list "tasks" shows "Call Ana"
      And the field "title" still holds "Buy milk" and keeps the keyboard focus

    # S2
    Scenario: An update computed on another revision shows the full spec of that result
      Given a surface at revision 3 whose field "title" holds the unsent text "Buy milk"
      When a tool result arrives whose update was computed on revision 2
      Then the surface shows exactly the full spec of that result
      And the update is reported as not applied because its revision is stale

    # S3
    Scenario Outline: An update the surface cannot apply shows the full spec of that result
      Given a surface at revision 2 painted from a spec that declares only the action "add"
      When a tool result arrives whose update, computed on revision 2, <defect>
      Then the surface shows exactly the full spec of that result
      And nothing the update carried is rendered and the update is reported as not applied

      Examples:
        | defect                                                         |
        | removes the node "gone", which is not on the surface           |
        | inserts an "iframe" component targeting https://evil.example   |
        | comes with a full spec that also declares the action "archive" |

    # S4
    Scenario: A result without an update repaints from its full spec, as before
      Given a surface whose field "title" holds the unsent text "Buy milk"
      When a tool result arrives that carries only a full spec
      Then the surface shows exactly that spec
      And the field "title" holds the value that spec gives it

  Rule: An action call tells the server where the person acted

    # S5
    Scenario: An activated control's action call carries its node id and the revision
      Given a surface at revision 3 whose button with the id "save" is bound to the declared action "save"
      When the person activates the button
      Then the host receives one tools/call request for the app-only action tool with the action "save", the id "save" and the revision 3

  Rule: The new call arguments are optional

    # S6
    Scenario Outline: The Kimen MCP server accepts an action call with or without the new arguments
      Given the Kimen MCP server rendered a surface that declares the action "refresh"
      When the surface sends the action "refresh" <arguments>
      Then the server acknowledges "refresh" and asks for it to be relayed

      Examples:
        | arguments                                                     |
        | with the data "sku" "A-12", the id "row-3" and the revision 2 |
        | with the data "sku" "A-12" and neither an id nor a revision   |

  Rule: A revision names one state of the page and is never reused

    # S7
    Scenario: A full repaint never reuses a revision the page has already reported
      Given a surface at revision 3
      And a tool result without an update then repainted it from its full spec
      When the person activates a control bound to a declared action
      Then the action call carries the revision 4
