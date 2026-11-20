Feature: Kimen MCP server
  An agent connected over stdio discovers the Kimen catalog from the
  generated artifacts, validates UI specs with errors it can correct, and
  renders accepted specs only as an MCP Apps surface painted by the guarded
  renderer; the server reaches no network and reads nothing beyond its own
  package.

  Rule: The catalog is read from the generated artifacts, never a hand-written list

    # S1
    Scenario: Listing the catalog returns exactly the generated catalog
      Given a Kimen MCP server started over stdio
      When the agent lists the catalog components
      Then every component of the generated catalog appears exactly once with its usage guidance
      And no component outside the generated catalog appears

    # S2
    Scenario: Describing a component returns its whole published contract
      Given a Kimen MCP server started over stdio
      When the agent describes the component "ki-button"
      Then the answer lists its props with types, allowed values and defaults, its slots and its events
      And it lists the design tokens and parts the component exposes for theming
      And every entry matches the generated catalog and component manifest

    # S3
    Scenario: Describing a component outside the catalog is refused by name
      Given a Kimen MCP server started over stdio
      When the agent describes the component "ki-unlisted"
      Then the call fails naming "ki-unlisted" as not in the catalog
      And the failure points the agent to listing the catalog

    # S4
    Scenario: The catalog is also published as readable resources
      Given a Kimen MCP server started over stdio
      When the client lists the server's resources
      Then the catalog, the spec-authoring guide and the spec JSON Schema are listed
      And reading the catalog resource returns the same components as listing the catalog

  Rule: Validation answers with errors a model can correct

    # S5
    Scenario: A spec composed only of catalog components validates
      Given a spec with a "ki-card" holding a "ki-button" bound to the declared action "save"
      When the agent validates the spec
      Then the result reports the spec valid with no issues

    # S6
    Scenario Outline: An invalid spec is reported with a code, a location and its offender
      Given a spec whose root contains <defect>
      When the agent validates the spec
      Then the result reports the spec invalid
      And it carries an issue with code "<code>" at "<path>" naming "<offender>"

      Examples:
        | defect                                                | code              | path                | offender    |
        | the component "ki-unlisted"                           | unknown-component | root.component      | ki-unlisted |
        | a "ki-button" bound to the undeclared action "delete" | undeclared-action | root.action         | delete      |
        | a "ki-badge" whose prop "tone" is "loud"              | invalid-prop-type | root.props.tone     | loud        |
        | a "ki-button" with the key "__proto__"                | forbidden-key     | spec.root.__proto__ | __proto__   |

    # S7
    Scenario Outline: Validation refuses what the guarded renderer would refuse
      Given a spec of catalog components that <exceeds-budget>
      When the agent validates the spec
      Then the result reports the spec invalid with the "<rule>" issue the guarded renderer enforces

      Examples:
        | exceeds-budget                 | rule              |
        | nests 33 levels deep           | depth-budget      |
        | holds 513 components           | node-count-budget |

    # S8
    Scenario: An oversized spec is refused before it is traversed
      Given a spec whose serialized size is 300 KiB
      When the agent validates the spec
      Then the result reports a "size-budget" issue naming the 262144-byte budget
      And no other issue is reported

  Rule: Rendering goes only through the guarded renderer, inside an MCP Apps surface

    # S9
    Scenario: Rendering a valid spec returns a Kimen surface for the host to display
      Given a host that supports MCP Apps
      When the agent renders a valid spec
      Then the render tool declares the server's ui:// Kimen surface as its interactive view
      And the result carries the validated spec for that surface to paint through the guarded renderer
      And reading the surface resource returns the adapter's self-contained surface document

    # S10
    Scenario: A spec that does not validate is never rendered
      Given a spec containing the component "iframe" with source "https://evil.example"
      When the agent renders the spec
      Then the call fails with the same issues validation reports
      And the result carries no surface payload

    # S11
    Scenario: A host without interactive surfaces still receives a usable answer
      Given a host that does not support MCP Apps
      When the agent renders a valid spec with a card titled "Inventory" and a button "Refresh" bound to "refresh"
      Then the result's text content outlines the card, its text "Inventory", the button "Refresh" and its action "refresh"
      And the text content is plain text, never markup to display

  Rule: Only actions a rendered surface declared reach the server

    # S12
    Scenario: A declared action from a rendered surface is acknowledged
      Given the server rendered a surface that declares the action "refresh"
      When the surface sends the action "refresh" with the data "sku" "A-12"
      Then the server acknowledges the action "refresh"

    # S13
    Scenario: An action no rendered surface declared is refused
      Given the server rendered only surfaces that declare the action "refresh"
      When a caller sends the action "transfer-funds"
      Then the call fails naming "transfer-funds" as undeclared
      And the server acknowledges no action

    # S14
    Scenario: The action tool is reserved for the surface
      Given a Kimen MCP server started over stdio
      When the client lists the server's tools
      Then the action tool is marked visible to the app only
      And it is linked to the server's ui:// Kimen surface

  Rule: URL properties are refused, because the surface can neither load nor open them

    # S15
    Scenario Outline: A URL property is refused by the server's URL policy
      Given a spec with a "ki-avatar" whose source is "<url>"
      When the agent validates the spec
      Then the result reports a "<code>" issue at "root.props.src"
      And rendering the same spec is refused with the same issue

      Examples:
        | url                           | code       |
        | https://tracker.example/p.gif | url-origin |
        | /avatar.png                   | url-origin |
        | javascript:alert(1)           | url-scheme |

  Rule: The server is contained and protocol-disciplined

    # S16
    Scenario: The server works with no network and no file access beyond its own package
      Given the server started under the Node permission model with read access to its own bundle only and no network
      When an agent lists, describes, validates, renders and sends a declared action
      Then every call is answered
      And no access outside the server's own bundle is attempted

    # S17
    Scenario: An oversized protocol message is discarded without being parsed
      Given a running server
      When the client sends one message larger than 4 MiB
      Then the server discards the message and reports it on its error stream
      And the server answers the client's next request

    # S18
    Scenario Outline: Clients of both protocol eras are served over stdio
      Given a client that speaks MCP <revision>
      When the client connects to the server over stdio
      Then it lists the server's tools and renders a valid spec

      Examples:
        | revision   |
        | 2026-07-28 |
        | 2025-11-25 |

    # S19
    Scenario: The compatibility matrix declares exact protocol versions
      Given the server's packaged compatibility matrix
      When a maintainer audits the supported protocol versions
      Then it names the exact MCP revisions the server negotiates and the MCP Apps revision it serves
      And the matrix and the server's code declare the same versions
