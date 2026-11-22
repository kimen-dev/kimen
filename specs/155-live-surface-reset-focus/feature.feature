Feature: Live surface keeps focus and empties fields safely
  A batch may name the node that receives focus when the batch leaves focus
  nowhere, and it never takes focus from where the person is. A forced
  removal empties a field, a rejection is a return value that says what to
  do, the host may raise every budget, and a reset clears only what an action
  already delivered, so nothing the person typed and did not send is lost.

  Rule: A batch repairs lost focus and never takes it

    # S1
    Scenario Outline: When a batch leaves focus nowhere, it goes to the node the batch names
      Given a live surface listing the tasks "t1", "t2" and "t3", each with a Delete button
      And <situation>
      When the agent applies a batch that <change> and names the Delete button of "t3" as its focus
      Then the Delete button of "t3" has focus once the change has rendered

      Examples:
        | situation                                                                     | change                             |
        | the person's focus is on the Delete button of "t2"                            | removes "t2"                       |
        | the person confirmed deleting "t2" in a dialog opened from its Delete button  | closes the dialog and removes "t2" |

    # S2
    Scenario Outline: A batch's focus never takes focus from where the person is
      Given a live surface listing the tasks "t1", "t2" and "t3"
      And the person is typing "Buy milk" into <field>
      When the agent applies a batch that removes "t2" and names the Delete button of "t3" as its focus
      Then <field> keeps focus and the typed "Buy milk" once the change has rendered

      Examples:
        | field                            |
        | the surface's field "title"      |
        | the host page's own message box  |

    # S3
    Scenario Outline: A batch whose focus names no node of the resulting surface is rejected whole
      Given a live surface listing the tasks "t1" and "t2"
      When the agent applies a batch that removes "t2" and names "<focus>" as its focus
      Then the batch is rejected as "unknown-id" naming "<focus>"
      And "t2" is still listed

      Examples:
        | focus |
        | t9    |
        | t2    |

    # S4
    Scenario: Replacing the node that has focus leaves focus on its replacement
      Given a live surface where the person's focus is on the button "follow" reading "Follow"
      When the agent applies a batch replacing "follow" with a button reading "Following"
      Then the "Following" button has focus once the change has rendered

  Rule: A forced removal of a value empties the field

    # S5
    Scenario: A forced removal of a number the person typed empties the number field
      Given a live surface whose host allows user-state overrides
      And the number field "quantity" the person has typed 42 into
      When the agent applies a batch forcing the removal of the value of "quantity"
      Then the field "quantity" is empty and holds no value

  Rule: A rejection says how to proceed

    # S6
    Scenario: Reopening a dialog the person closed is rejected with the way to reopen it
      Given a live surface whose dialog "confirm-delete" the agent opened and the person closed with Escape
      When the agent applies a batch setting "confirm-delete" open
      Then the dialog stays closed and the batch is rejected as "user-state-conflict"
      And the diagnostic says to set it closed in a batch of its own first

  Rule: The host may raise every budget

    # S7
    Scenario Outline: A host may raise each budget above its default
      Given a batch that goes one past the default <limit>, which the defaults reject as "<rule>"
      And a live surface whose host raised that limit
      When the agent applies the batch
      Then the batch applies whole

      Examples:
        | limit                         | rule              |
        | 64 ops per batch              | batch-op-budget   |
        | 65,536 bytes per batch        | batch-size-budget |
        | 512 nodes on the surface      | node-count-budget |
        | 32 levels of nesting          | depth-budget      |
        | 262,144 bytes on the surface  | size-budget       |

  Rule: A rejected batch is a return value and changes nothing

    # S8
    Scenario: A rejected batch is returned, not thrown, and leaves earlier batches applied
      Given a live surface at revision 4 where an earlier batch renamed the task "t1" to "Buy milk"
      When the agent applies a batch that removes "t1" and sets a prop of the unknown node "t9"
      Then the call returns a result that is not ok and names "unknown-id", without throwing
      And "t1" still reads "Buy milk" and the revision stays 4

  Rule: A reset clears only what an action already delivered

    # S9
    Scenario: After an action delivered a field's text, a reset empties the field without host permission
      Given a live surface whose host does not allow user-state overrides
      And the field "title" whose typed "Buy milk" the button "add" delivered with its action
      When the agent applies a batch resetting "title"
      Then the field "title" is empty

    # S10
    Scenario: A reset after the person typed again is rejected and keeps the new text
      Given the field "title" whose "Buy milk" the button "add" delivered, and the person then typed "Buy bread"
      When the agent applies a batch resetting "title"
      Then the field keeps "Buy bread" and the batch is rejected as "unsent-user-input"
      And the diagnostic does not repeat "Buy bread"

    # S11
    Scenario: A reset of a field the person never touched succeeds and changes nothing
      Given a live surface showing the empty field "title" the person never touched
      When the agent applies a batch resetting "title"
      Then the batch applies and the field "title" is still empty

    # S12
    Scenario Outline: A reset empties a delivered number field and a delivered date field
      Given the <kind> field "<id>" whose <entry> the button "add" delivered with its action
      When the agent applies a batch resetting "<id>"
      Then the field "<id>" is empty and holds no value

      Examples:
        | kind   | id       | entry      |
        | number | quantity | 42         |
        | date   | due      | 2026-12-24 |

    # S13
    Scenario: A reset restores the value the spec gave the field
      Given the field "status" the spec filled with "Draft", whose "Ready" the button "save" delivered
      When the agent applies a batch resetting "status"
      Then the field "status" shows "Draft"

    # S14
    Scenario: A reset of an id no node of the surface carries is rejected whole
      Given a live surface showing the field "title" whose "Buy milk" the button "add" delivered
      When the agent applies a batch resetting "title" and the unknown "t9"
      Then the batch is rejected as "unknown-id" naming "t9"
      And the field "title" keeps "Buy milk"
