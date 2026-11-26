Feature: MCP Apps documents per catalog subset
  A server can serve a Kimen surface as a smaller predeclared document that
  carries only a named subset of the catalog. Each subset document stays
  self-contained and auditable under its own content policy, and it renders
  only its subset: the document, its validator, the server's validation and
  the catalog offered to the agent all use the same subset. The full document
  stays available for every surface that names no subset.

  Rule: A subset surface is a predeclared document of its own

    # S1
    Scenario: A tool's subset surface resolves to a document of that subset
      Given a server that declares a surface for the "form" subset of the catalog
      And a tool whose metadata declares that surface for its results
      When the host resolves the surface the tool declares
      Then the host receives one self-contained HTML document at that surface's own ui:// URI
      And the document carries the components of the "form" subset, not the whole catalog

    # S2
    Scenario: A subset that names a composite brings the parts the composite needs
      Given a surface served from a subset that names "ki-select" and not "ki-option"
      When a tool result arrives whose spec is a "ki-select" with three "ki-option" children
      Then the select paints with its three options

    # S3
    Scenario: A surface declared without a subset still serves the full document
      Given a server that declares a surface without naming a subset
      When the host resolves that surface
      Then the host receives the full surface document, which carries every catalog component

    # S4
    Scenario: A subset document regenerates byte for byte
      Given a document generated for the "form" subset
      When it is generated again from the same subset and the same package builds
      Then the two documents are byte-identical

    # S5
    Scenario: Each document's content policy admits only its own script and stylesheet
      Given a server that declares the full surface and a "form" subset surface
      When the host audits both documents before first render
      Then each content policy identifies that document's own inline script and stylesheet by digest
      And neither document nor its declared content policy references an external network origin

  Rule: A subset document renders only its subset

    # S6
    Scenario: A spec naming a catalog component outside the subset is refused
      Given a surface served from the "form" subset document
      When a tool result arrives whose spec names "ki-table", a catalog component outside the subset
      Then rendering refuses the spec and reports the unknown component "ki-table"
      And nothing of the spec is painted

    # S7
    Scenario: A component the document carries only to draw another cannot be named
      Given a subset document whose "ki-pagination" draws "ki-icon-button", which the subset does not name
      When a tool result arrives whose spec names "ki-icon-button"
      Then rendering refuses the spec and reports the unknown component "ki-icon-button"

    # S8
    Scenario: The server's validation for a subset surface reaches the document's verdict
      Given a server that validates the results of the "form" subset surface
      When it validates a spec that names "ki-table"
      Then the validation reports the unknown component "ki-table", as the "form" document does

    # S9
    Scenario: A subset cannot name a component the catalog does not have
      Given a subset definition that names "acme-chart", which is not in the catalog
      When the subset document is generated
      Then generation fails and names "acme-chart"
      And no document is produced

  Rule: A server picks a surface per tool

    # S10
    Scenario: A tool and its action tool name the same subset surface
      Given a server that declares the full surface and a "form" subset surface
      When it declares a tool that renders through the "form" subset surface
      Then the tool's metadata names the "form" surface's ui:// URI
      And the app-only action tool of that surface names the same URI

    # S11
    Scenario: The agent is offered the catalog of the tool's subset
      Given a tool that renders through the "form" subset surface
      When the agent reads the components it may use for that tool
      Then it is offered exactly the components the "form" document renders

  Rule: A subset changes the weight of the document, not how it looks

    # S12
    Scenario: A component looks the same in a subset document as in the full document
      Given a spec of a card with a form that the "form" document and the full document both accept
      When the host paints it in each document under the same theme
      Then every painted component has the same computed styles in both documents
