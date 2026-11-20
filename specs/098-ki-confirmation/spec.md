# Feature specification for Confirmation

**Issue** #374  
**Branch** `feat/374-ki-confirmation`

Confirmation presents the proposed tool, its inputs and the consequences
before a person approves or refuses it. The host owns execution, request
identity, resolution, expiry and any conversation-scoped permission.

## Scenario Family Coverage

| Family | Scenario IDs | N/A justification |
| --- | --- | --- |
| Core behavior | S1, S2, S3, S4, S5, S6, S18 | |
| Keyboard path | S7, S8 | |
| Assistive-tech outcome | S9, S10, S11 | |
| Form participation | S12 | The prompt has no form value. The scenario exercises isolation when embedded in a form. |
| Theming | S13, S14, S15, S16, S17 | |

## Interpretations

- **Agent's choice, pending founder confirmation.** Only the waiting host
  calls `focusPrompt()`. The method focuses the group, leaves active editors
  alone, and returns whether focus moved. A primed polite status announces the
  question independently of focus.
- **Agent's choice, pending founder confirmation.** The host controls state
  and supplies display-ready `resolved-by` and `resolved-at` values when
  known. The component renders the outcome, tool and available metadata in
  one compact row. Outcome labels and the remember label can be localized.
- **Agent's choice, pending founder confirmation.** One explicit decision
  locks the controls until the host resolves the prompt. Returning to pending
  or changing the action clears the lock and preference. To replace a still
  pending request for the same tool, mount a new element.
- **Agent's choice, pending founder confirmation.** A pending decision requires
  a nonblank question, tool identifier and both decision labels. An unknown
  state makes no decision available. Escape and elapsed time leave state to
  the host. Denial is the first decision in keyboard order.
- **Agent's choice, pending founder confirmation.** The trusted host maps the
  two component events to fixed, declared bridge actions. The catalog exposes
  both events and the details slot. The guarded renderer's ambiguous
  single-action check and existing URL policy stay in force. The tool identifier
  is display data. A guarded host with an origin policy can set the identifier
  itself after validation.
- **Agent's choice, pending founder confirmation.** The card follows the
  available inline space. Kimen Button and a labelled native checkbox follow
  the density tokens. The default slot carries the details and the status
  row can wrap. The warning Note supplies the decorative glyph. The question
  and outcome use text to keep Button and Note in the stand-alone bundle.
- **Agent's choice, pending founder confirmation.** Focus stays in the group
  when a person's decision disables the currently focused control.

## Behavior contract

```gherkin
Feature: Confirmation asks for a person's decision
  The person can review an assistant's proposed action and decide whether it may proceed.

  # S1
  Scenario: A destructive request explains the action before the person decides
    Given a request to delete a report with the tool "delete_report"
    When the request appears
    Then the person sees the question, tool, report details and warning about permanent deletion
    And "Delete report" is styled as destructive and "Keep report" is available

  # S2
  Scenario: Approval reports the person's explicit conversation preference
    Given a pending email request with the conversation preference selected
    When the person chooses "Send email"
    Then the host receives one approval with the conversation preference selected

  # S3
  Scenario: Refusal reports only the refusal
    Given a pending email request with the conversation preference selected
    When the person chooses "Don't send"
    Then the host receives one refusal
    And the choice does not activate any enclosing action

  # S4
  Scenario: A decision is reported once while the host is responding
    Given a request whose approval has already been reported and whose host is responding
    When the person attempts another decision on that request
    Then no additional decision is reported

  # S5
  Scenario Outline: A resolved request shows its outcome, actor and time
    Given a pending email request
    When the host records it as <state> by "Mara" at "10:32"
    Then a single summary shows <outcome>, "send_email", "Mara" and "10:32"
    And the details and decision controls disappear

    Examples:
      | state    | outcome  |
      | approved | Approved |
      | denied   | Denied   |
      | expired  | Expired  |

  # S6
  Scenario: A new request starts without conversation permission
    Given a completed request that had the conversation preference selected
    When the host presents another pending request
    Then the preference is clear
    And approval of the new request is available

  # S7
  Scenario: The least destructive choice comes first in keyboard order
    Given a destructive request with focus on its question
    When the person advances to the decisions by keyboard
    Then the first decision is "Keep report"
    And pressing Enter there reports only refusal

  # S8
  Scenario Outline: An explicit decision is required to approve
    Given a pending destructive request with focus on its question
    When <trigger>
    Then no decision is reported
    And the request remains pending

    Examples:
      | trigger                           |
      | the person presses Escape         |
      | one hour passes without a choice |

  # S9
  Scenario: A new request has a name and a polite announcement
    Given an email request with the question "Send this email?"
    When the request appears
    Then assistive technology exposes a group named "Send this email?"
    And the question is available in a polite status region

  # S10
  Scenario: The host can direct attention to a request when the person is waiting
    Given a pending request and a person waiting for the assistant
    When the host requests focus for the confirmation
    Then focus lands on the named group

  # S11
  Scenario: A request leaves focus in the person's editor
    Given a person composing a message
    When the assistant presents a request for approval
    Then the editor retains focus even if the host asks to move it

  # S12
  Scenario: Approval inside a form stays separate from form submission
    Given a pending email request inside a form with its conversation preference selected
    When the person chooses "Send email"
    Then approval is reported without submitting the form
    And the request contributes no form data

  # S13
  Scenario: The surface and heading follow the theme
    Given a theme that overrides the prompt's surface color, image, filter and heading font
    When the request appears
    Then the prompt uses that surface and heading font

  # S14
  Scenario: Right-to-left placement follows the reading direction
    Given a pending request in a right-to-left region
    When the request appears
    Then the leading decision is on the right and both decisions remain reachable

  # S15
  Scenario: The forced palette preserves the prompt's boundary and decisions
    Given a destructive request in a forced-color palette
    When the request appears
    Then the surface has a visible boundary and both decisions are operable

  # S16
  Scenario: The request stays still when motion is reduced
    Given a pending request in reduced motion
    When the request appears
    Then the question and decisions appear without animation or transition

  # S17
  Scenario: Touch density gives both decisions room to tap
    Given a pending request on a coarse-pointer page using touch density
    When the request appears
    Then both decision targets measure at least 44 by 44 CSS pixels

  # S18
  Scenario: An incomplete proposal cannot be approved
    Given a pending request without an action identifier
    When the request appears
    Then there is no available approval
```
