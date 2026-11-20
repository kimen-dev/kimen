# Feature specification for ki-tool-call

**Branch** `feat/373-ki-tool-call`

**Source** Issue #373 and the ToolCall design-system preview.

## Scenario family coverage

| Family | Scenarios | Notes |
| --- | --- | --- |
| Core behavior | S1, S2, S3, S7, S13, S14 | Payload visibility, failure, approval and guarded retry |
| Keyboard path | S4 | Native disclosure activation with either key |
| Assistive-tech outcome | S5, S6 | Native summary state, visible status text and one conversation log entry |
| Form participation | N/A | ToolCall has no submitted value or validation. Its retry control is a non-submit action. |
| Theming | S8, S9, S10, S11, S12 | Token overrides, forced colors, reduced motion, direction and touch density |

## Interpretations

- **Disclosure** (agent's choice, pending founder confirmation). With `open` unset, a failed call is expanded and every other call starts collapsed. Setting `open` explicitly or activating the summary overrides this default until the property is cleared. Native details and summary provide the interaction.
- **Identity and duration** (agent's choice, pending founder confirmation). The optional HTML `title` is displayed beside the monospace tool ID and exposed as `toolTitle` in typed bindings to preserve the native HTMLElement property. Valid durations appear only for Done, in milliseconds below one second and seconds otherwise. The optional `locale` controls the number and unit formatting, with English as the default.
- **Conversation log** (agent's choice, pending founder confirmation). A call publishes one `ki-tool-status-change` event per actual status transition after initialization. The conversation owns the log and appends an entry per event. The badge stays readable in the summary and the spinner is decorative.
- **Retry** (agent's choice, pending founder confirmation). Authors can supply an error message or their own action through the error slot. Failed calls with `retryable` also offer a built-in Retry button, which requests a declared `ki-tool-retry` action. The built-in control is a native ghost-style button. The host decides whether to run anything. Approval uses its own status label and can be paired with a separate confirmation surface.
- **Presentation** (agent's choice, pending founder confirmation). Follow the reference's badge tones and code surface. Display only populated payload sections, and show the error section for failed calls. The title and slot labels follow the body typography. The spinner stops moving under reduced motion.

## Gherkin

```gherkin
Feature: ki-tool-call lets people inspect an assistant tool call
  A disclosure summarizes one call and reveals its inputs, outputs and errors on demand.

  # S1
  Scenario: Inspect a completed search call
    Given a completed "search_docs" call titled "Search docs" with a duration of 1200 ms and input and output
    When the reader opens the call
    Then the title, tool id, Done status and 1.2-second duration identify the call
    And the input and output are visible under their labels

  # S2
  Scenario: Inspect a failed call without opening it first
    Given a failed "deploy_preview" call with an error message
    When the reader encounters the call
    Then the call is expanded and its error message is visible

  # S3
  Scenario: Preserve an explicit expansion choice
    Given a running "deploy_preview" call explicitly set to collapsed
    When the status changes to Failed
    Then the call stays collapsed and the Failed status is visible

  # S4
  Scenario: Toggle the call with the keyboard
    Given the focused summary of a collapsed "search_docs" call
    When the reader activates the summary with Space or Enter
    Then the call expands and the summary keeps focus

  # S5
  Scenario: Expose the tool identity, status and expansion state
    Given an expanded "run_tests" call with status Running
    When the reader navigates to its summary
    Then assistive technology can read "run_tests", "Running" and the expanded state
    And there is no separate spinner announcement

  # S6
  Scenario: Publish one status update to the conversation log
    Given a running "run_tests" call on a page with a conversation log
    When its status changes to Done
    Then the conversation log receives one "run_tests: Done" entry

  # S7
  Scenario: Request a retry through a declared action
    Given a guarded surface with a failed retryable call and a declared retry action
    When the reader activates Retry
    Then the surface dispatches the declared action once
    And the call still shows Failed until the caller updates it

  # S8
  Scenario: Repaint the summary and payloads from tokens
    Given a completed call with custom surface and code background tokens
    When the reader opens the call
    Then the disclosure and its code payload use the assigned backgrounds

  # S9
  Scenario: Read and operate the summary in forced colors
    Given a running call in forced colors
    When the summary receives keyboard focus
    Then the status label and focus indicator remain visible

  # S10
  Scenario: Read a running call with reduced motion
    Given a running call under the reduced-motion preference
    When the reader views it
    Then the Running text is visible and the activity indicator is static

  # S11
  Scenario: Read a call in a right-to-left interface
    Given a completed call in a right-to-left interface
    When the reader views its summary
    Then the tool identity and status follow the interface reading order

  # S12
  Scenario: Reach the disclosure on a coarse pointer
    Given a call using touch density on a coarse pointer
    When the reader reaches for its summary
    Then the summary spans at least 44 CSS pixels in both dimensions

  # S13
  Scenario: Inspect a call that needs approval
    Given a "publish_preview" call awaiting approval
    When the reader views its summary
    Then the summary shows Needs approval and omits the duration

  # S14
  Scenario: A failure reveals the error when expansion is automatic
    Given a running call with no expansion choice and an error message
    When its status changes to Failed
    Then the call opens and reveals the error message
```
