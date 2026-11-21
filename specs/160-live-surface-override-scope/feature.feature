Feature: A forced override hands back only the props it names
  A forced set the host allows replaces the user-state props it names and
  hands only those back to the agent. Whatever else the person typed,
  ticked, selected or opened on the same control stays theirs.

  Rule: The person's other input still needs force

    # S1
    Scenario Outline: After forcing a search closed, a batch that would discard its query is rejected
      Given a live surface whose host allows user-state overrides
      And the search "find" the person typed "secret" into and opened, which an earlier batch forced closed
      When the agent applies a batch that <op> without force
      Then the search keeps "secret" and the batch is rejected as "user-state-conflict"

      Examples:
        | op                              |
        | sets the query of "find" to "x" |
        | removes "find"                  |
        | replaces "find"                 |

    # S2
    Scenario: After forcing the query of a search, closing it is rejected
      Given a live surface whose host allows user-state overrides
      And the search "find" the person typed "secret" into and opened, which an earlier batch forced to the query "x"
      When the agent applies a batch setting "find" closed without force
      Then the search stays open and the batch is rejected as "user-state-conflict"

  Rule: The prop a forced override named is the agent's again

    # S3
    Scenario: After forcing a search closed, an ordinary set opens it again
      Given a live surface whose host allows user-state overrides
      And the search "find" the person typed "secret" into and opened, which an earlier batch forced closed
      When the agent applies a batch setting "find" open
      Then the search is open
