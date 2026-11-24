Feature: An action collects the values of other fields
  A node bound to an action may name other nodes of its spec by id. When the
  person activates it, every named field is asked whether it is valid, and
  the action carries the fields' live values next to the node's own props.
  A spec that is valid today keeps its meaning.

  Rule: A bound node delivers the live values of the fields it names

    # S1
    Scenario: A button that collects two fields delivers both values with its own props
      Given a spec with a text field "Title" identified as "f-title" and a number field "Quantity" identified as "f-qty"
      And a "primary" button "Add" bound to the declared action "add" that collects "f-title" as "title" and "f-qty" as "quantity"
      And the person typed "Buy milk" in "Title" and 2 in "Quantity"
      When the person activates "Add"
      Then the host receives one "add" action whose data is exactly variant "primary", title "Buy milk" and quantity 2

    # S2
    Scenario: A collected number arrives as a number and a collected checkbox as true or false
      Given a spec whose "Add" button collects a number field as "quantity" and two checkboxes as "urgent" and "gift"
      And the person typed 2 in the number field and checked only the "urgent" checkbox
      When the person activates "Add"
      Then the action data carries quantity as the number 2, urgent as true and gift as false

    # S3
    Scenario: An empty number field contributes no entry and an empty text field contributes empty text
      Given a spec whose "Add" button collects an optional text field as "notes" and an optional number field as "quantity"
      And the person left both fields empty
      When the person activates "Add"
      Then the action data carries notes as the empty text ""
      And the action data has no entry named "quantity"

    # S12
    Scenario: On a live surface the button collects from the field the surface holds now
      Given a live surface whose button "Add", bound to the declared action "add", collects the text field "f-title" as "title"
      And a later batch replaced "f-title" with a new text field, where the person typed "Buy milk"
      When the person activates "Add"
      Then the host receives one "add" action whose data carries title "Buy milk"

  Rule: Every collected field is asked for validity before the action leaves

    # S4
    Scenario: Required collected fields left empty block the action and show their messages
      Given a spec whose "Add" button collects the required text fields "Title" and "Owner", shown in that order
      And the person left both fields empty
      When the person activates "Add"
      Then the host receives no action
      And "Title" and "Owner" each show their own validation message, and the focus is on "Title"

    # S5
    Scenario: Text that is not a number in a collected number field blocks the action
      Given a spec whose "Add" button collects the number field "Quantity"
      And the person typed "two" in "Quantity"
      When the person activates "Add"
      Then the host receives no action
      And the focus is on "Quantity"

    # S6
    Scenario: Text that is not a date in a collected date field blocks the action
      Given a spec whose "Add" button collects the date field "Due"
      And the person typed "tomorrow" in "Due"
      When the person activates "Add"
      Then the host receives no action
      And the focus is on "Due"

    # S11
    Scenario: An invalid collected control that cannot show its message on request still blocks the action
      Given a spec whose "Add" button collects a required control "Assignee" that offers no way to report its validity
      And the person left "Assignee" empty
      When the person activates "Add"
      Then the host receives no action
      And the focus is on "Assignee"

    # S13
    Scenario: The browser's own message for a blocked action opens on the field that takes the focus
      Given a spec whose "Add" button collects the required text field "Title" and the number field "Quantity", shown in that order
      And the person left "Title" empty and typed "two" in "Quantity"
      When the person activates "Add"
      Then the host receives no action
      And the focus and the browser's own validation message are on "Title", and "Quantity" shows its own message

  Rule: A collect that cannot work is rejected whole

    # S7
    Scenario Outline: A spec whose collect cannot work renders nothing and names the rule
      Given a spec with a text field identified as "f-title" and a checkbox group identified as "f-topics"
      When the renderer validates the spec, whose "primary" button <problem>
      Then no part of the spec renders
      And the diagnostic names the rule "<rule>"

      Examples:
        | problem                                                           | rule                   |
        | collects "f-title" while bound to no action                       | collect-without-action |
        | is bound to "add" and collects "f-missing", an id no node carries | collect-unknown-node   |
        | is bound to "add" and collects the checkbox group "f-topics"      | collect-no-value       |
        | is bound to "add" and collects "f-title" under the name "variant" | collect-key-conflict   |
        | is bound to "add" and collects 33 values                          | collect-budget         |

    # S8
    Scenario: A live batch that removes a collected field is rejected whole
      Given a live surface showing a text field identified as "f-title" and a button "Add" that collects it
      When the agent applies a batch removing "f-title"
      Then the whole batch is rejected naming the rule "collect-unknown-node" and the id "f-title"
      And the surface keeps showing what it showed before

  Rule: An action event names its node, and older specs keep their meaning

    # S9
    Scenario Outline: An action event names the id of its node outside the live surface too
      Given <surface> with a button identified as "add-task" bound to the declared action "add"
      When the person activates the button
      Then the host receives one "add" action naming the node "add-task"

      Examples:
        | surface         |
        | a rendered spec |
        | a streamed node |

    # S10
    Scenario: A spec written for catalog schema 1.6.0 renders and acts as before
      Given a spec declaring the catalog schema version "1.6.0" with a "primary" button "Add" bound to the declared action "add" and no collect
      When the person activates "Add"
      Then the host receives one "add" action whose data is exactly variant "primary"
