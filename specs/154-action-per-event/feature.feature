Feature: An action per event
  A bound node may name, for each event its catalog entry declares, the
  declared action that event fires. A binding by name alone keeps its
  meaning, the five components that pick their event from their own state
  included.

  Rule: A binding per event reports each event as its own action

    # S1
    Scenario Outline: A dialog bound per event reports a confirmation and a dismissal as different actions
      Given a spec with a dialog "Delete the task?" whose confirm label is "Yes, delete", bound to "delete.confirmed" on confirm and to "delete.closed" on close
      When the person <gesture>
      Then the host receives one "<action>" action and no other

      Examples:
        | gesture                 | action           |
        | activates "Yes, delete" | delete.confirmed |
        | dismisses the dialog    | delete.closed    |

    # S2
    Scenario Outline: A confirmation card bound to approve and deny reports each answer as its own action
      Given a spec with a confirmation card for the tool "delete_files", bound to "tool.approved" on approve and to "tool.denied" on deny
      When the person <answer>
      Then the host receives one "<action>" action and no other

      Examples:
        | answer   | action        |
        | approves | tool.approved |
        | denies   | tool.denied   |

    # S3
    Scenario: A dialog the host closes after a confirmation still reports the close
      Given a dialog bound to "delete.confirmed" on confirm and to "delete.closed" on close, whose confirmation the host has received
      When the host closes the dialog
      Then the host receives one "delete.closed" action

    # S4
    Scenario: Each bound event carries the fields its node collects
      Given a confirmation card bound to "tool.approved" on approve and to "tool.denied" on deny, collecting the note field "f-note" as "note"
      And the person typed "Too risky" in the note field
      When the person denies
      Then the host receives one "tool.denied" action whose data carries note "Too risky"

    # S5
    Scenario Outline: Each component rejected today with one action binds per event
      Given a spec binding the declared action "picked" to the "<event>" event of a <component>
      When the component reports "<event>"
      Then the host receives one "picked" action

      Examples:
        | component       | event        |
        | ki-code-input   | ki-complete  |
        | ki-confirmation | ki-deny      |
        | ki-file-upload  | ki-files-add |
        | ki-message      | ki-feedback  |
        | ki-popover      | ki-open      |
        | ki-search       | ki-search    |
        | ki-table        | ki-sort      |
        | ki-time-input   | change       |
        | ki-tree-item    | ki-expand    |

    # S6
    Scenario: A live surface binds per event too
      Given a live surface showing the confirmation card "c-1", bound to "tool.approved" on approve and to "tool.denied" on deny
      When the person approves
      Then the host receives one "tool.approved" action naming the node "c-1" and the current revision

  Rule: A binding names only what the catalog and the spec declare

    # S7
    Scenario Outline: A binding per event that names what is not declared renders nothing
      Given a spec that declares the action "pick"
      When the renderer validates the spec, whose <node> is bound to <binding>
      Then no part of the spec renders
      And the diagnostic names the rule "<rule>" and <offender>

      Examples:
        | node              | binding                         | rule               | offender              |
        | confirmation card | "pick" on the event "ki-cancel" | undeclared-event   | the event "ki-cancel" |
        | badge             | "pick" on the event "click"     | undeclared-event   | the event "click"     |
        | confirmation card | "drop" on the event "ki-deny"   | undeclared-action  | the action "drop"     |
        | confirmation card | no event at all                 | malformed-spec     | the empty binding     |
        | paragraph         | "pick" on the event "click"     | action-not-allowed | the paragraph         |

  Rule: A binding by name alone keeps its meaning

    # S8
    Scenario Outline: A component that picks its event from its own state keeps that event
      Given a spec binding the declared action "pick" by name alone to <component>
      When the component reports "<event>"
      Then the host receives one "pick" action
      And none of the component's other declared events fires an action

      Examples:
        | component                             | event          |
        | an assist chip                        | ki-activate    |
        | a filter chip                         | ki-change      |
        | a removable input chip                | ki-remove      |
        | a dialog whose confirm label is "Yes" | ki-confirm     |
        | a dialog without a confirm label      | ki-close       |
        | an idle prompt input                  | ki-submit      |
        | a streaming prompt input              | ki-stop        |
        | a combobox                            | change         |
        | a pagination                          | ki-page-change |

  Rule: A text prop named like a URL attribute is text when the catalog says so

    # S9
    Scenario Outline: A confirmation card renders whatever its tool identifier looks like
      Given a host that <policy>
      When the renderer validates a confirmation card for the tool "<tool>"
      Then the card renders

      Examples:
        | policy                                          | tool                |
        | allows URLs only from "https://cdn.example.com" | delete_files        |
        | declares no URL origins                         | github:create_issue |

    # S10
    Scenario: A registered prop named href that declares no format stays a URL
      Given a host catalog that registers a component whose string prop "href" declares no format
      When the renderer validates a spec that sets that "href" to "javascript:alert(1)"
      Then no part of the spec renders
      And the diagnostic names the rule "url-scheme"
