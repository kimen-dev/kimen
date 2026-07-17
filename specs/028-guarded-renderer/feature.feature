Feature: Guarded renderer
  Untrusted UI specs render only through the neutral catalog: components,
  props and actions outside the catalog contract are rejected fail-closed
  with machine-readable diagnostics, no code path executes from spec data,
  and declared budgets bound every render.

  Rule: Only catalog components render

    # S1
    Scenario: A valid spec renders catalog components with declared props
      Given a spec describing a ki-card containing a ki-button labeled "Pay now"
      When the renderer renders the spec
      Then the surface shows the described card and button
      And every rendered component and prop matches its catalog declaration

    # S2
    Scenario Outline: A component type outside the catalog never renders
      Given a spec containing a node of type "<requested-type>"
      When the renderer validates the spec
      Then no part of the spec renders
      And the diagnostic names "<requested-type>" as outside the catalog

      Examples:
        | requested-type    |
        | script            |
        | iframe            |
        | ki-not-in-catalog |

  Rule: Only declared props and actions pass the boundary

    # S3
    Scenario: An undeclared prop is rejected fail-closed
      Given a spec whose ki-button node sets the undeclared prop "onclick" to "alert(1)"
      When the renderer validates the spec
      Then no part of the spec renders
      And the diagnostic names "onclick" as undeclared for ki-button

    # S4
    Scenario: Activating a rendered control dispatches only its declared action
      Given a rendered spec binding the "Pay now" button to its declared action "submit-order"
      When the user activates the button
      Then the host receives one "submit-order" action event carrying the spec's data payload
      And no other callback or code path executes

    # S5
    Scenario: A binding to an invented component event never wires
      Given a spec binding the action "submit-order" to an event "onPwn" that the catalog does not declare for ki-button
      When the renderer validates the spec
      Then no part of the spec renders
      And the diagnostic names "onPwn" as undeclared for ki-button

  Rule: No code-execution path exists from spec data

    # S6
    Scenario: Markup inside spec text renders as inert text
      Given a spec whose ki-alert message text is "<img src=x onerror=alert(1)>"
      When the renderer renders the spec
      Then the message appears verbatim as text
      And no image request occurs and no script executes

    # S7
    Scenario Outline: An executable URL value is rejected
      Given a spec setting a URL-typed prop to "<value>"
      When the renderer validates the spec
      Then no part of the spec renders
      And the diagnostic names the prop and the rejected scheme

      Examples:
        | value                                     |
        | javascript:alert(1)                       |
        | data:text/html,<script>alert(1)</script>  |

    # S8
    Scenario Outline: A prototype-pollution attempt leaves the runtime untouched
      Given a spec whose <object> contains the key "<key>" set to {"polluted": true}
      When the renderer validates the spec
      Then no part of the spec renders
      And no object outside the spec gains a "polluted" property

      Examples:
        | object       | key         |
        | props object | __proto__   |
        | props object | constructor |
        | props object | prototype   |
        | data object  | __proto__   |

  Rule: Declared budgets bound every render

    # S9
    Scenario Outline: A spec beyond a declared budget is rejected before rendering
      Given a spec exceeding the declared <budget> budget by <excess>
      When the renderer validates the spec
      Then no part of the spec renders
      And the diagnostic names the exceeded <budget> budget

      Examples:
        | budget       | excess            |
        | depth        | one nesting level |
        | node-count   | one node          |
        | payload-size | one byte          |

  Rule: Every rejection is observable

    # S10
    Scenario: A rejection diagnostic pinpoints the offending node
      Given a spec whose third child node is of type "iframe"
      When the renderer validates the spec
      Then the diagnostic reports the node path, the violated rule and the offending value
      And the diagnostic is machine-readable data, not markup

  Rule: Partial specs render progressively without weakening the boundary

    # S11
    Scenario: A streamed spec renders validated nodes before the stream ends
      Given a spec streaming in chunks whose first complete node is a valid ki-card
      When the renderer consumes the first complete node
      Then the card renders while the stream remains open
      And only validated nodes are attached to the surface

    # S12
    Scenario: An invalid node arriving mid-stream fails closed
      Given a streamed spec that rendered a valid ki-card and then delivers a node of type "script"
      When the renderer consumes the invalid node
      Then the invalid node and its children never render
      And the failure is reported while previously validated content remains

  Rule: Version skew fails closed at the boundary

    # S13
    Scenario: A spec declaring an unsupported catalog schema version is rejected
      Given a spec declaring a catalog schema version the renderer's catalog does not support
      When the renderer validates the spec
      Then no part of the spec renders
      And the diagnostic names the spec's declared version and the versions the renderer supports

  Rule: Budgets are falsifiable on both sides and bound the accumulated stream

    # S14
    Scenario: A spec exactly at every declared budget renders
      Given a spec exactly at the declared depth, node-count and payload-size budgets
      When the renderer renders the spec
      Then every node of the spec renders

    # S15
    Scenario: A stream that never closes still trips its budget
      Given a streamed spec delivering valid chunks without ever closing the document
      When the renderer consumes the chunk that takes the accumulated payload size beyond the declared budget
      Then the stream halts fail-closed and nothing further attaches
      And the diagnostic names the exceeded payload-size budget

  Rule: Diagnostics stay inert under hostile content

    # S16
    Scenario: A hostile offending value stays inert inside its diagnostic
      Given a spec rejected for the offending value "<img src=x onerror=alert(1)>"
      When the host displays the diagnostic containing that value
      Then the offending value appears as inert text
      And no image request occurs and no script executes
