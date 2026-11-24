Feature: A surface sends its actions within a rate budget
  An agent-written spec can bind an action to an event that fires on its own,
  such as a carousel's automatic rotation. Every rendered surface lets through
  at most a declared burst of actions, then one more per refill interval, so
  no spec can flood the host; the latest report of each binding still arrives,
  and a flood on one binding never starves another.

  Rule: A surface never sends more actions than its budget allows

    # S1
    Scenario Outline: A burst exactly at the action budget arrives whole
      Given a surface whose action budget is a burst of 10, then one more every 500 ms
      And 11 buttons, each bound to its own declared action
      When <count> of the buttons are activated at the same moment
      Then the host receives <now> actions at once
      And the host receives <later> more 500 ms later

      Examples:
        | count | now | later |
        | 10    | 10  | 0     |
        | 11    | 10  | 1     |

    # S2
    Scenario Outline: A carousel that rotates every millisecond cannot flood the host
      Given a spec that binds the declared action "slide" to a looping carousel that rotates every millisecond
      And the carousel sits in a closed disclosure, where no one can see or pause it
      When one second passes after <host> renders the spec
      Then <host> receives at most 12 "slide" actions

      Examples:
        | host                                    |
        | a page that renders the spec once       |
        | a live surface                          |
        | an MCP Apps host, as action tool calls  |

  Rule: The latest report of each binding arrives, and none starves another

    # S3
    Scenario: A code typed faster than the budget refills arrives as last typed
      Given a surface whose action budget is spent
      And a code field whose every edit reports the declared action "code"
      When a person types "482916" faster than the budget refills
      Then the last "code" action the host receives carries the code "482916"
      And it arrives within 500 ms of the last keystroke

    # S4
    Scenario: A flooding binding cannot starve a person's action
      Given a hidden carousel whose "slide" reports have spent the surface's action budget
      And a button bound to the declared action "confirm"
      When a person activates the button
      Then the host receives the "confirm" action within 1000 ms

  Rule: A held report never outlives its node

    # S5
    Scenario: A report held for a node the surface no longer shows is never sent
      Given a "slide" report that the action budget holds
      When the host renders a new spec without the carousel on the same surface
      Then the host never receives that "slide" report

    # S8
    Scenario: A held report names the surface revision its event fired on
      Given a surface at revision 1 whose action budget holds a "confirm" report
      When the host applies an update that takes the surface to revision 2
      Then the "confirm" action the host receives names revision 1

    # S9
    Scenario: A value committed in an A2UI form survives an update while the budget is spent
      Given an A2UI surface whose action budget is spent
      And a text field bound to the data model path "/name" in which a person has committed "Ana"
      When the agent updates the surface before the budget refills
      Then the next action the agent receives carries "Ana" from "/name"

  Rule: Exceeding the budget is diagnosable

    # S6
    Scenario: The first report the budget holds is diagnosed once
      Given a spec whose carousel at path "root" reports "slide" every millisecond
      When the surface's action budget holds a report for the first time
      Then the host receives one diagnostic naming the action-rate budget, the path "root" and the action "slide"
      And holding further reports adds no diagnostic

  Rule: The host sets the budget

    # S7
    Scenario: A host that tightens the budget receives fewer actions
      Given a host that sets the action budget to a burst of 1, then one more every 2000 ms
      And a spec that binds "slide" to a carousel that rotates every millisecond
      When one second passes after the host renders the spec
      Then the host receives exactly 1 "slide" action
