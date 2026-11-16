Feature: Native primitives in generated UI
  A UI spec may carry a closed set of native HTML elements for text, layout
  and images next to catalog components. They cross the same guarded boundary,
  carry only their declared attributes, never bind actions, render text as
  inert text, take the host page's typography and lay out through spacing
  tokens without a single inline style attribute.

  Rule: The closed set renders as native elements

    # S1
    Scenario: A spec mixing native text, layout and an image with catalog components renders native elements
      Given a spec whose layout div holds an h2 "Resumen", a paragraph "Ventas de " with the strong text "marzo", an image of "/img/ventas.png" with alt "Gráfico de ventas" and a ki-button "Ver detalle"
      When the host renders the spec
      Then the surface holds one div whose children are an h2, a p, an img and a ki-button in that order
      And the paragraph reads "Ventas de marzo" with "marzo" inside a strong element

    # S2
    Scenario Outline: An element outside the closed set is rejected
      Given a spec whose ki-card holds a node of the component "<tag>"
      When the host renders the spec
      Then no part of the spec renders
      And the diagnostic names the rule "unknown-component" and the value "<tag>"

      Examples:
        | tag      |
        | script   |
        | SCRIPT   |
        | iframe   |
        | style    |
        | link     |
        | base     |
        | form     |
        | input    |
        | object   |
        | embed    |
        | template |
        | svg      |
        | a        |
        | h1       |
        | ul       |
        | span     |
        | Img      |

  Rule: A native element carries only its declared attributes

    # S3
    Scenario Outline: A native element rejects every attribute it does not declare
      Given a spec whose <element> carries the attribute "<attribute>"
      When the host validates the spec
      Then the spec is rejected with the rule "unknown-prop" naming "<attribute>"

      Examples:
        | element    | attribute      |
        | image      | style          |
        | image      | class          |
        | image      | onerror        |
        | image      | srcset         |
        | image      | referrerpolicy |
        | paragraph  | style          |
        | paragraph  | onclick        |
        | h2         | id             |
        | layout div | class          |
        | layout div | tabindex       |
        | layout div | role           |
        | layout div | slot           |

    # S4
    Scenario Outline: An image source is held to the URL policy
      Given a host that declares <origins> as allowed URL origins
      And a spec with an image whose src is <src>
      When the host validates the spec
      Then the spec is <outcome>

      Examples:
        | origins                   | src                                  | outcome                           |
        | nothing                   | "https://cdn.example.com/ventas.png" | accepted                          |
        | nothing                   | "/img/ventas.png"                    | accepted                          |
        | nothing                   | "javascript:alert(1)"                | rejected as url-scheme            |
        | nothing                   | "data:image/png;base64,iVBORw0KGgo=" | rejected as url-scheme            |
        | nothing                   | "blob:https://example.com/1"         | rejected as url-scheme            |
        | nothing                   | absent                               | rejected as missing-required-prop |
        | "https://cdn.example.com" | "https://cdn.example.com/ventas.png" | accepted                          |
        | "https://cdn.example.com" | "https://tracker.example/p.png"      | rejected as url-origin            |
        | "https://cdn.example.com" | "/img/ventas.png"                    | rejected as url-origin            |

    # S5
    Scenario Outline: An image says what it shows or declares itself decorative
      Given a spec with an image of "/img/ventas.png" whose alt is <alt>
      When the host validates the spec
      Then the spec is <outcome>

      Examples:
        | alt                 | outcome                           |
        | "Gráfico de ventas" | accepted                          |
        | "" (decorative)     | accepted                          |
        | absent              | rejected as missing-required-prop |
        | "   "               | rejected as missing-required-prop |

    # S6
    Scenario: A rendered image withholds the page address and fits its container
      Given a ki-card 240 pixels wide holding an image of "/img/ancho.png" declaring a width of 1200
      When the host renders the spec
      Then the image requests its source with the referrer policy "no-referrer"
      And the image is no wider than the card

  Rule: Text is always inert text

    # S7
    Scenario: Text inside native elements renders as inert text
      Given a spec whose h2 reads "<img src=x onerror=alert(1)>" and whose paragraph reads "<script>alert(2)</script>"
      When the host renders the spec
      Then the heading and the paragraph show those texts verbatim
      And no img or script element exists and no script executes

  Rule: Native elements keep a valid content model and never act

    # S8
    Scenario Outline: Native elements accept only their content model
      Given a spec where <parent> holds <child>
      When the host validates the spec
      Then the spec is <outcome>

      Examples:
        | parent                     | child                         | outcome                   |
        | a paragraph                | a strong holding an em        | accepted                  |
        | a layout div               | a ki-card holding a paragraph | accepted                  |
        | the header slot of ki-card | an h3                         | accepted                  |
        | a layout div               | the text "Hola"               | accepted                  |
        | a paragraph                | a layout div                  | rejected as invalid-child |
        | an h2                      | a paragraph                   | rejected as invalid-child |
        | a paragraph                | a ki-badge                    | rejected as invalid-child |
        | a strong                   | an image                      | rejected as invalid-child |
        | an image                   | the text "x"                  | rejected as unknown-slot  |

    # S9
    Scenario Outline: A native element never binds an action
      Given a spec declaring the action "abrir" bound to <element>
      When the host validates the spec
      Then the spec is rejected with the rule "action-not-allowed"

      Examples:
        | element      |
        | a layout div |
        | an image     |
        | a paragraph  |
        | an h3        |

  Rule: Layout comes from spacing tokens through the CSSOM

    # S10
    Scenario Outline: Layout props lay the children out under a CSP that forbids inline styles
      Given a page whose Content-Security-Policy forbids inline style attributes
      And a spec whose layout div declares <props>
      When the host renders the spec
      Then the div lays its children out as <layout>
      And the page records no Content-Security-Policy violation

      Examples:
        | props                                                                       | layout                                                                                       |
        | no layout props                                                             | a column separated by the "md" spacing token and stretched across the div                    |
        | direction "row", gap "xl", align "center", justify "space-between" and wrap | a wrapping row separated by the "xl" spacing token, centered across it and spaced between it |

    # S11
    Scenario Outline: A layout value outside its closed set is rejected
      Given a spec whose layout div declares <prop> "<value>"
      When the host validates the spec
      Then the spec is rejected with the rule "invalid-prop-type" naming "<value>"

      Examples:
        | prop      | value              |
        | gap       | 13px               |
        | gap       | var(--ki-space-xl) |
        | direction | row-reverse        |
        | align     | baseline           |
        | justify   | space-around       |
        | wrap      | yes                |

    # S12
    Scenario: Reassigning a spacing token restyles the layout gap
      Given a page that sets the spacing token "--ki-space-xl" to "2rem"
      And a spec whose layout div declares gap "xl"
      When the host renders the spec
      Then the gap between the div's children computes to "2rem"

    # S13
    Scenario: Native text takes the host page's typography
      Given a host surface styled with the font family "Georgia" and the color "rgb(10, 20, 30)"
      And a spec holding an h2 "Resumen" and a paragraph "Hola"
      When the host renders the spec
      Then the heading and the paragraph compute the surface's font family and color
      And neither element carries a style attribute

  Rule: Native elements are accessible by construction

    # S14
    Scenario: Headings and images expose their semantics to assistive technology
      Given a spec holding an h3 "Ventas", an image with alt "Gráfico de ventas" and an image with alt ""
      When the host renders the spec
      Then the accessibility tree exposes a level-3 heading "Ventas" and an image named "Gráfico de ventas"
      And the decorative image is absent from the accessibility tree

    # S15
    Scenario: Native elements add no tab stop
      Given a rendered spec whose layout div holds an h2, a paragraph, an image and a ki-button "Ver detalle"
      When the user presses Tab from the start of the surface
      Then focus lands on the "Ver detalle" button

  Rule: Only Kimen's own definitions render native elements

    # S16
    Scenario Outline: A catalog value not built by Kimen cannot widen a native element
      Given a hand-built catalog value whose "<tag>" entry declares <props>
      When the host renders a spec using "<tag>" through that catalog
      Then no part of the spec renders
      And the diagnostic names the rule "invalid-tag" and the value "<tag>"

      Examples:
        | tag    | props                   |
        | script | a src prop              |
        | h1     | no props                |
        | img    | srcset besides src, alt |
        | p      | a style prop            |

    # S17
    Scenario Outline: Catalog registration never defines a native element
      Given a consumer catalog definition <definition>
      When the consumer creates the catalog
      Then the creation <outcome>

      Examples:
        | definition                                                      | outcome                             |
        | declaring the entry "p"                                         | fails with invalid-tag naming "p"   |
        | declaring the entry "img" with a srcset prop                    | fails with invalid-tag naming "img" |
        | extending a base catalog whose "img" entry also declares srcset | fails with invalid-tag naming "img" |
        | declaring "acme-kpi" and extending the built-in catalog         | succeeds with every native element  |

    # S18
    Scenario Outline: Native elements come with the built-in catalog and the catalogs that extend it
      Given the catalog in use is <catalog>
      When the host renders a spec whose layout div holds the paragraph "Hola"
      Then the spec is <outcome>

      Examples:
        | catalog                                           | outcome                                    |
        | the built-in catalog                              | rendered                                   |
        | a consumer catalog extending the built-in catalog | rendered                                   |
        | a standalone consumer catalog of "acme-kpi"       | rejected as unknown-component naming "div" |

  Rule: Live surfaces change native elements in place

    # S19
    Scenario: A live batch changes a native element in place
      Given a page whose Content-Security-Policy forbids inline style attributes
      And a live surface showing the layout div "fila" with gap "md" holding the image "grafico"
      When the agent applies a batch setting gap "xl" on "fila" and a new src and alt on "grafico"
      Then "fila" and "grafico" are the same elements as before, with the "xl" gap and the new src and alt
      And the page records no Content-Security-Policy violation

    # S20
    Scenario Outline: A live batch is held to the native boundary on the resulting state
      Given a live surface showing the layout div "fila" holding the paragraph "nota"
      When the agent applies a batch that <violation>
      Then the surface, its revision and its snapshot are unchanged
      And the diagnostic names the rule "<rule>"

      Examples:
        | violation                                                         | rule               |
        | sets the prop "style" on "fila"                                   | unknown-prop       |
        | inserts into "fila" an image whose src is "javascript:alert(1)"   | url-scheme         |
        | inserts into "fila" a node of the component "script"              | unknown-component  |
        | inserts a layout div into "nota"                                  | invalid-child      |
        | inserts into "fila" an image bound to the declared action "abrir" | action-not-allowed |

  Rule: Agents learn the primitives from the emitter

    # S21
    Scenario: The emitter describes each native element with exactly its attributes
      Given the built-in catalog
      When the host derives the emitter's JSON Schema
      Then the schema offers one branch per native element whose props are exactly the declared ones
      And the image branch requires src and alt and accepts an empty alt
