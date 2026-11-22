Feature: A live surface keeps the person's unsent input from the agent
  What the person typed, ticked or selected and has not sent stays theirs: a
  set that agrees with it does not hand it to the agent, and no rejection
  repeats it. Only a forced override the host allows replaces it.

  Rule: Agreeing with the person's input leaves it theirs

    # S1
    Scenario Outline: After a set agreed with the person, setting other input is still rejected
      Given a live surface whose host does not allow user-state overrides
      And <control> the person <entered>, which an earlier batch set to the same without force
      When the agent applies a batch setting <control> to <other>
      Then <control> keeps what the person entered and the batch is rejected as "user-state-conflict"

      Examples:
        | control                  | entered               | other       |
        | the field "note"         | typed "Buy milk" into | "Buy bread" |
        | the checkbox "agree"     | ticked                | unticked    |
        | the toggle button "bold" | selected              | unselected  |

    # S2
    Scenario Outline: After a set agreed with the person, removing or replacing what holds their input is still rejected
      Given a live surface whose host does not allow user-state overrides
      And the card "card" holding the field "note" the person typed "Buy milk" into, which an earlier batch set to "Buy milk"
      When the agent applies a batch that <op>
      Then the field keeps "Buy milk" and the batch is rejected as "user-state-conflict"

      Examples:
        | op              |
        | removes "card"  |
        | replaces "note" |

    # S3
    Scenario: A forced override the host allows still replaces input a set agreed with
      Given a live surface whose host allows user-state overrides
      And the field "note" the person typed "Buy milk" into, which an earlier batch set to "Buy milk"
      When the agent applies a batch forcing "note" to "Buy bread"
      Then the field shows "Buy bread"

  Rule: A dialog the person closed can still be reopened

    # S4
    Scenario: After a set agreed that the person closed a dialog, a later set reopens it
      Given a live surface whose dialog "confirm-delete" the agent opened and the person closed
      And an earlier batch that set "confirm-delete" closed
      When the agent applies a batch setting "confirm-delete" open
      Then the dialog is open

  Rule: A rejection never repeats the person's input

    # S5
    Scenario Outline: A rejection that protects the person's input does not repeat it
      Given a live surface whose host does not allow user-state overrides
      And the card "card" holding the field "note" the person typed "Buy milk" into
      When the agent applies a batch that <op>
      Then the batch is rejected as "<rule>"
      And no part of the diagnostic repeats "Buy milk"

      Examples:
        | op                           | rule                       |
        | sets "note" to "Buy bread"   | user-state-conflict        |
        | forces "note" to "Buy bread" | user-state-override-denied |
        | removes "card"               | user-state-conflict        |
        | replaces "card" with force   | user-state-override-denied |
