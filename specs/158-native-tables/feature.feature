Feature: Read-only native tables in generated UI
  A UI spec may carry a table as native elements: a caption, a header row
  and body rows whose cells hold text, native elements and catalog
  components. A table is for reading: it keeps a strict content model,
  carries no attribute beyond a header cell's scope, never binds an action,
  and takes ki-table's styling inside a ki-table.

  Rule: A table renders as native elements

    # S1
    Scenario: A spec renders a table with a caption, a header row and two body rows
      Given a spec whose ki-table holds a table captioned "Pedidos" with the header row "Pedido", "Estado" and two body rows whose "Estado" cells hold a ki-badge
      When the host renders the spec
      Then the surface holds one table whose caption reads "Pedidos", whose head holds one row of two th cells and whose body holds two rows
      And the last cell of each body row holds a ki-badge

    # S2
    Scenario: A table exposes its caption and headers to assistive technology
      Given a spec whose table is captioned "Pedidos", with the th cells "Pedido" and "Estado" scoped to columns and body rows headed by the th cells "A-17" and "A-18" scoped to rows
      When the host renders the spec
      Then the accessibility tree exposes a table named "Pedidos" with the column headers "Pedido" and "Estado" and the row headers "A-17" and "A-18"

    # S3
    Scenario: Reassigning a ki-table token restyles a table from a spec
      Given a page that sets the token "--ki-table-header-bg" to "rgb(10, 20, 30)"
      And a spec whose ki-table holds a table with a header row
      When the host renders the spec
      Then the table head's background computes to "rgb(10, 20, 30)"
      And no table element carries a style attribute

  Rule: A table keeps its content model

    # S4
    Scenario Outline: Table elements accept only their content model
      Given a spec where <parent> holds <child>
      When the host validates the spec
      Then the spec is <outcome>

      Examples:
        | parent                         | child                                    | outcome                   |
        | a table                        | a caption, a thead and a tbody, in order | accepted                  |
        | a table                        | two tbody elements                       | accepted                  |
        | a td                           | a ki-badge and the text "activo"         | accepted                  |
        | a caption                      | the text "Pedidos" and an em             | accepted                  |
        | a layout div                   | a table                                  | accepted                  |
        | the default slot of ki-table   | a table                                  | accepted                  |
        | a table                        | a td                                     | rejected as invalid-child |
        | a table                        | a tbody followed by a caption            | rejected as invalid-child |
        | a table                        | two thead elements                       | rejected as invalid-child |
        | a table                        | the text "Pedidos"                       | rejected as invalid-child |
        | a tbody                        | a td                                     | rejected as invalid-child |
        | a tr                           | a layout div                             | rejected as invalid-child |
        | a tr                           | the text "A-17"                          | rejected as invalid-child |
        | a td                           | a table                                  | rejected as invalid-child |
        | a caption                      | a layout div                             | rejected as invalid-child |
        | a layout div                   | a tr                                     | rejected as invalid-child |
        | the default slot of ki-card    | a td                                     | rejected as invalid-child |
        | the spec                       | a tr as its root                         | rejected as invalid-child |

  Rule: A table is for reading

    # S5
    Scenario Outline: A table element rejects every attribute it does not declare
      Given a spec whose <element> carries the attribute "<attribute>"
      When the host validates the spec
      Then the spec is rejected with the rule "unknown-prop" naming "<attribute>"

      Examples:
        | element | attribute     |
        | table   | background    |
        | table   | class         |
        | th      | data-sort     |
        | tr      | data-key      |
        | tr      | aria-selected |
        | tr      | onclick       |
        | td      | colspan       |
        | td      | scope         |
        | td      | style         |

    # S6
    Scenario Outline: A th's scope is a column or a row
      Given a spec whose th declares the scope <scope>
      When the host validates the spec
      Then the spec is <outcome>

      Examples:
        | scope      | outcome                       |
        | "col"      | accepted                      |
        | "row"      | accepted                      |
        | absent     | accepted                      |
        | "colgroup" | rejected as invalid-prop-type |
        | "rowgroup" | rejected as invalid-prop-type |
        | "COL"      | rejected as invalid-prop-type |

    # S7
    Scenario Outline: A table element never binds an action
      Given a spec declaring the action "abrir" bound to a <element>
      When the host validates the spec
      Then the spec is rejected with the rule "action-not-allowed"

      Examples:
        | element |
        | table   |
        | caption |
        | thead   |
        | tbody   |
        | tr      |
        | th      |
        | td      |

  Rule: Live surfaces keep the table's content model

    # S8
    Scenario: A live batch adds a row to a rendered table in place
      Given a live surface showing a table whose tbody "cuerpo" holds the row "r1"
      When the agent applies a batch inserting into "cuerpo" the row "r2" with two td cells
      Then the tbody holds the rows "r1" and "r2" in that order
      And "r1" is the same element as before

    # S9
    Scenario Outline: A live batch is held to the table content model on the resulting state
      Given a live surface showing the layout div "fila" holding a table whose tbody is "cuerpo"
      When the agent applies a batch that <violation>
      Then the surface, its revision and its snapshot are unchanged
      And the diagnostic names the rule "invalid-child"

      Examples:
        | violation                          |
        | inserts into "fila" a td           |
        | inserts into "cuerpo" a layout div |
        | inserts a tr as a top-level node   |
