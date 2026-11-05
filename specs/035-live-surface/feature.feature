Feature: Live surface
  A long-lived surface changes through atomic batches of operations addressed
  by stable node ids. Each batch is validated against the resulting state by
  the guarded renderer's boundary before any DOM write, changes only the
  elements it names, never overwrites the user's own state implicitly, and a
  rejected batch leaves the surface live with its previous state.

  Rule: Nodes may carry stable ids

    # S1
    Scenario: A node carrying a stable id validates and renders without exposing the id
      Given a spec whose ki-card node carries the id "dec-3"
      When the host validates and renders the spec
      Then the spec is accepted and the card renders
      And no rendered element carries an id attribute derived from "dec-3"

    # S2
    Scenario Outline: An id outside the grammar or repeated is rejected
      Given a spec whose nodes carry the ids <ids>
      When the host validates the spec
      Then no part of the spec renders
      And the diagnostic names the rule "<rule>" and the offending id

      Examples:
        | ids                    | rule         |
        | "Dec 3"                | invalid-id   |
        | "-dec"                 | invalid-id   |
        | a 65-character id      | invalid-id   |
        | "dec-3" and "dec-3"    | duplicate-id |

  Rule: Compatible catalog schema versions are accepted

    # S3
    Scenario Outline: The version gate accepts the same major up to the supported minor
      Given a renderer whose catalog schema version is "1.1.0"
      And a spec declaring the catalog schema version "<declared>"
      When the renderer validates the spec
      Then the spec is <outcome>

      Examples:
        | declared | outcome                          |
        | 1.0.0    | accepted                         |
        | 1.1.0    | accepted                         |
        | 1.1.7    | accepted                         |
        | 1.2.0    | rejected as unsupported-version  |
        | 2.0.0    | rejected as unsupported-version  |
        | 0.9.0    | rejected as unsupported-version  |
        | 1.1      | rejected as unsupported-version  |

  Rule: A batch changes only what it names

    # S4
    Scenario: Setting props keeps the element, its focus, its typed value and its scroll
      Given a live surface showing a card "dec-3" and a field "note" the user has focused and typed "hola" into
      When the agent applies a batch setting the card's tone and the field's label
      Then the card and the field are the same elements as before
      And the field keeps the focus, the typed "hola" and its scroll position

    # S5
    Scenario: Inserting a sibling before a focused node recreates and reorders nothing else
      Given a live surface whose list holds the nodes "q-1" and "q-2" and the user has focused "q-2"
      When the agent applies a batch inserting the node "q-0" before "q-1"
      Then the list shows "q-0", "q-1", "q-2" in that order
      And "q-1" and "q-2" are the same elements as before and "q-2" keeps the focus

    # S6
    Scenario: A text op replaces only the text of the named slot
      Given a live surface showing the card "dec-3" with the header text "Draft" and a focused field in its body
      When the agent applies a batch setting the header text of "dec-3" to "Decided"
      Then the header reads "Decided"
      And every element of the card is the same as before and the field keeps the focus

    # S7
    Scenario: Removing a node detaches only its subtree and frees its id and budget
      Given a live surface at its node budget holding the nodes "q-1" and "q-2"
      When the agent applies a batch removing "q-1"
      Then only "q-1" and its subtree leave the surface and "q-2" is the same element
      And a later batch may insert a new node with the id "q-1"

    # S8
    Scenario: Replacing a node swaps exactly that node in place
      Given a live surface whose list holds the nodes "q-1", "q-2" and "q-3"
      When the agent applies a batch replacing "q-2" with a new node
      Then the new node sits between "q-1" and "q-3"
      And "q-1" and "q-3" are the same elements as before

  Rule: A batch is atomic and a rejection never kills the surface

    # S9
    Scenario: One invalid op discards the whole batch and the surface stays live
      Given a live surface at revision 4
      And a batch of ten ops whose seventh inserts the component "script"
      When the agent applies the batch
      Then the surface's elements, revision and snapshot are unchanged
      And the diagnostic names the op, the rule and the offending value
      And a following valid batch applies and advances the revision to 5

    # S10
    Scenario Outline: Every op is held to the guarded renderer's boundary
      Given a live surface showing the card "dec-3"
      When the agent applies a batch that <violation>
      Then the surface is unchanged
      And the diagnostic names the rule "<rule>"

      Examples:
        | violation                                                   | rule              |
        | inserts a component outside the catalog                     | unknown-component |
        | sets an undeclared prop on "dec-3"                          | unknown-prop      |
        | sets the event-handler prop "onclick"                       | unknown-prop      |
        | inserts a link whose URL prop is "javascript:alert(1)"      | url-scheme        |
        | carries the key "__proto__" inside an op's props            | forbidden-key     |
        | inserts a node whose id is already live                     | duplicate-id      |
        | targets an id that is not live                              | unknown-id        |
        | inserts into a slot the parent does not declare             | unknown-slot      |
        | binds an action the surface does not declare                | undeclared-action |
        | inserts before a node that sits in another parent           | invalid-position  |
        | sets text on a slot that holds nodes                        | slot-has-nodes    |

    # S11
    Scenario Outline: State budgets bind the resulting state on both sides
      Given a live surface whose resulting state would hold <state>
      When the agent applies the batch producing that state
      Then the batch is <outcome>

      Examples:
        | state                                         | outcome                         |
        | exactly the declared node budget              | applied                         |
        | one node beyond the declared node budget      | rejected as node-count-budget   |
        | one level beyond the declared depth budget    | rejected as depth-budget        |
        | one byte beyond the declared payload budget   | rejected as size-budget         |

    # S12
    Scenario Outline: A batch beyond a per-batch budget is rejected without halting
      Given a live surface whose per-batch budget allows <limit>
      When the agent applies a batch exceeding it by one
      Then the batch is rejected as "<rule>"
      And a following batch within the budget applies

      Examples:
        | limit           | rule              |
        | two ops         | batch-op-budget   |
        | 200 bytes       | batch-size-budget |

  Rule: The user's own state is never overwritten implicitly

    # S13
    Scenario: Setting a value the user changed is rejected without an explicit override
      Given a live surface showing the checkbox "agree" that the user has ticked
      When the agent applies a batch setting "agree" unchecked without forcing it
      Then the checkbox stays ticked and the batch is rejected as "user-state-conflict"

    # S14
    Scenario Outline: A forced override applies only when the host allows it
      Given a live surface whose host <policy> user-state overrides
      And the checkbox "agree" that the user has ticked
      When the agent applies a batch forcing "agree" unchecked
      Then <outcome>

      Examples:
        | policy      | outcome                                                              |
        | allows      | the checkbox is unticked                                             |
        | does not allow | the checkbox stays ticked and the batch is rejected as "user-state-override-denied" |

  Rule: Revision, optimistic concurrency and snapshot keep host and agent in sync

    # S15
    Scenario: The revision advances once per applied batch and never on a rejection
      Given a live surface at revision 0
      When the agent applies a valid batch, a rejected batch and another valid batch
      Then the revision is 2

    # S16
    Scenario: A batch computed against a stale revision is rejected
      Given a live surface at revision 3
      When the agent applies a valid batch carrying ifRevision 2
      Then the surface is unchanged
      And the diagnostic names the rule "stale-revision" and the current revision

    # S17
    Scenario: The snapshot is the current content as frozen plain data
      Given a live surface after several applied batches
      When the host takes a snapshot
      Then the snapshot holds the current nodes with their ids, props, actions and text as plain data
      And the snapshot cannot be mutated and every node in it validates as a spec root

  Rule: Actions identify their node

    # S18
    Scenario: An action event names the node's id, current path, revision and live data
      Given a live surface where the button "pay" is bound to the declared action "submit"
      And later batches inserted a sibling before it and set its label
      When the user activates "pay"
      Then the host receives one "submit" event with the id "pay", its current path and the current revision
      And its data carries the props set by the latest batch

  Rule: No code path exists from batch data

    # S19
    Scenario: Markup in a text op renders as inert text
      Given a live surface showing the card "dec-3"
      When the agent applies a batch setting its text to "<img src=x onerror=alert(1)>"
      Then the text appears verbatim
      And no image element exists and no script executes
