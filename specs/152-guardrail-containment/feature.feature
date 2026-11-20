Feature: Guarded surfaces stay contained
  A rendered spec touches only what it inserted: a prop that names another
  element resolves only to a node of the same spec or surface, and a spec
  never submits or resets a form of the host page.

  Rule: A reference resolves only to a node of the same surface

    # S1
    Scenario: A menu anchored to a button of its own spec opens from that button
      Given a spec with a button "Actions" identified as "actions" and a menu anchored to "actions"
      When the person activates the "Actions" button
      Then the menu opens next to the spec's "Actions" button

    # S2
    Scenario Outline: A reference to an id that no node of the spec carries is rejected
      Given a host page with its own element whose id is "checkout"
      When the renderer validates a spec whose <component> sets <reference> to "checkout"
      Then no part of the spec renders
      And the diagnostic names <reference> as a reference to no node of the spec

      Examples:
        | component      | reference    |
        | ki-menu        | anchor       |
        | ki-popover     | for          |
        | ki-tooltip     | for          |
        | ki-counter     | for          |
        | ki-copy-button | from         |
        | ki-chip-group  | focus-target |

    # S3
    Scenario: A host element that shares a spec id is never reached
      Given a host page with its own password field whose id is "secret"
      And a spec whose copy button copies from its own field identified as "secret"
      When the person activates the copy button
      Then the copied text is the spec field's value
      And the host's password field is untouched

    # S4
    Scenario: A live batch that references no node of the surface is rejected
      Given a live surface showing a button identified as "share"
      When the agent applies a batch adding a tooltip for "checkout"
      Then the whole batch is rejected naming the reference "checkout"
      And the surface keeps showing what it showed before

  Rule: A spec never submits or resets a host form

    # S5
    Scenario: A spec button inside a host form does not submit it
      Given a host form "payment" that contains the surface
      And a spec with a button "Continue" bound to no action
      When the person activates "Continue"
      Then the host form "payment" is not submitted

    # S6
    Scenario Outline: A spec that asks for a form-action button is rejected
      Given a host form "payment" that contains the surface
      When the renderer validates a spec with a button whose type is "<type>"
      Then no part of the spec renders
      And the diagnostic names the button type "<type>"

      Examples:
        | type   |
        | submit |
        | reset  |

    # S7
    Scenario: A bound spec button inside a host form dispatches only its action
      Given a host form "payment" that contains the surface
      And a spec with a button "Confirm" bound to the declared action "confirm"
      When the person activates "Confirm"
      Then the host receives the action "confirm"
      And the host form "payment" is not submitted
