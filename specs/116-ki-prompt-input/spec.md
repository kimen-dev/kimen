# Feature Specification — PromptInput

**Branch** `feat/372-ki-prompt-input` · **Issue** #372 · **Date** 2026-11-20

`<ki-prompt-input>` is the assistant's multiline composer. It accepts local attachments and exposes send and stop requests to the application. The design-system PromptInput preview guides the layout. Current Kimen elements and tokens govern the implementation.

## Scope

- Auto-grow the native textarea until `--ki-prompt-input-max-height`, then scroll. Expose a required accessible name through `label`.
- Validate attachments uniformly across picker, drop and paste. Expose accepted files in a named list with keyboard-operable removal and report rejections in a polite live region.
- Let the application drive `idle`, `submitted` and `streaming`. Emit `ki-submit` and `ki-stop` as requests. Compose a model picker or other controls in `tools` and supplementary items in `attachments`.
- Register the component through generated catalog, wrapper and documentation surfaces. The guarded renderer applies its existing declared-action and URL policies.

## Interpretations

Each entry is an agent's choice, pending founder confirmation.

- **I-1 Draft lifecycle.** A send requires non-whitespace text or an accepted file, carries the original text and a snapshot of the files, then clears the draft and returns focus to the textarea. The application sets `status`. `submitted` disables Send, and `streaming` exposes Stop and the writing status. People may prepare the next draft in either busy state. Enter used as a send shortcut does not insert a newline while busy. Composition keystrokes, repeated keydown, and Shift+Enter have their normal editing behavior without sending.
- **I-2 Attachments.** `max-size` is bytes per file. Omitted or invalid limits are unrestricted, zero is enforceable, and fractional counts are rounded down. MIME types and extensions are case-insensitive. The limits apply when new files arrive. Clearing `accept` removes previously selected files so they cannot be sent while hidden. Keep valid files in arrival order even if their batch contains rejections. Accepted files and supplementary items share the named list when attachments are enabled. The application owns supplementary items and the tools slot, including the model picker. A disabled composer makes both slots inert.
- **I-3 Form.** `name` contributes current text to the enclosing native form. Files are available in `ki-submit`. Form reset restores the initial `value` attribute and clears component-owned attachments and rejection messages. Composer Send remains a surface event even in a form.
- **I-4 Localization.** English defaults for action names, writing status and attachment feedback are overridable props. Rejection messages identify the affected file and reason.
- **I-5 Catalog.** Both declared events can activate a bound surface action, using the composer status to choose the applicable event. Submit forwards the scalar text and Stop forwards the current scalar props through the guarded renderer. Local `File` objects stay in the DOM event.
- **I-6 Theme and documentation.** Both themes use the raised semantic surface `--ki-surface-s1`, the repository's current name for the preview's `--ki-surface-raised`, with theme-specific geometry inherited from those aliases. The three toolbar buttons use native controls and the existing ghost, primary, and secondary button palette to keep the standalone bundle within its limit. Touch density expands the actual targets. The attachment chip shows its filename and removal control. The co-located site and Storybook docs are the canonical component pages. A flat MDX entry links to the same documentation for compatibility with the issue's path. The API declaration follows the gate's major classification for additions to generated loader namespaces.

## Scenario Family Coverage

| Family | Scenario IDs | N/A justification |
|---|---|---|
| Core behavior | S1, S2, S3, S4, S5, S6, S7 | |
| Keyboard path | S8, S9, S10, S11 | |
| Assistive-tech outcome | S12 | |
| Form participation | S13, S14, S15 | |
| Theming | S16, S17, S18, S19, S20 | |

## Behavior Contract

```gherkin
Feature: ki-prompt-input composes an assistant message
  People can write a message, attach local files, send the draft and stop a response.

  # S1
  Scenario: Send delivers the draft and returns focus to the composer
    Given a composer with the draft "Summarise the incidents" and an accepted CSV file
    When the person activates Send
    Then the send event reports the original text and file
    And the draft is cleared and focus is in the text field

  # S2
  Scenario: The multiline draft grows and scrolls at its height limit
    Given a composer showing one line of text
    When the person enters enough lines to reach the height limit
    Then the text field grows to the limit and scrolls to reveal the rest

  # S3
  Scenario Outline: The same file is accepted from each attachment source
    Given a composer accepting CSV files up to 10 bytes
    When the person adds incidents.csv using <source>
    Then incidents.csv is listed as an attachment

    Examples:
      | source   |
      | picker   |
      | drop     |
      | paste    |

  # S4
  Scenario Outline: Rejected files explain why they were skipped
    Given a composer accepting up to two CSV files of at most 10 bytes each with one file already attached
    When the person drops a batch containing <file>
    Then the rejected file is absent from the attachment list
    And the composer identifies <reason> beside the draft

    Examples:
      | file                   | reason          |
      | photo.png              | unsupported type |
      | oversized.csv          | excessive size   |
      | a third valid CSV file | file count limit |

  # S5
  Scenario: Streaming offers Stop and emits the stop request
    Given the assistant is streaming a response
    When the person activates Stop
    Then a stop event is emitted and the text draft is preserved

  # S6
  Scenario: A submitted request prevents a repeated send
    Given the composer has draft text and a request is submitted
    When the person presses Enter
    Then no send event is emitted and the draft is preserved

  # S7
  Scenario: Attachments are unavailable without accepted types
    Given a composer with no accepted file types
    When the person drops a CSV file
    Then the Attach files control and attachment list are absent

  # S8
  Scenario: Enter sends a ready draft by default
    Given an idle composer focused with the draft "Hello"
    When the person presses Enter
    Then a send event reports "Hello" without a trailing newline

  # S9
  Scenario Outline: Newline shortcuts preserve a multiline draft
    Given a focused composer configured for <mode> with draft "Hello"
    When the person presses <keys>
    Then a newline is inserted and no send event is emitted

    Examples:
      | mode      | keys          |
      | enter     | Shift+Enter   |
      | mod-enter | Enter         |
      | mod-enter | Shift+Enter   |

  # S10
  Scenario Outline: Modifier Enter sends in modifier mode
    Given a focused composer configured for mod-enter with a ready draft
    When the person presses <keys>
    Then the draft is sent

    Examples:
      | keys          |
      | Control+Enter |
      | Meta+Enter    |

  # S11
  Scenario: The keyboard removes an attachment and returns to the draft
    Given focus is on the button named "Remove incidents.csv"
    When the person presses Space
    Then the attachment is removed and focus returns to the text field

  # S12
  Scenario: Composer controls expose names and live feedback
    Given a composer named "Message Kimen Assistant" with incidents.csv attached
    When the assistant starts streaming
    Then assistive technology can identify the text field, the Attachments list, and the Remove and Stop controls
    And "Writing…" is exposed as a polite status update

  # S13
  Scenario: A named composer contributes its text to the enclosing form
    Given a form containing an enabled composer named "message" with an edited text draft and one attachment
    When the form data is collected
    Then "message" contains the current text draft

  # S14
  Scenario: Reset restores the initial text and clears attachments
    Given the form's composer had initial text "Hello" and now has edited text and a file
    When the enclosing form is reset
    Then the composer contains "Hello" and no attachments

  # S15
  Scenario: A disabled fieldset disables the composer
    Given the composer is inside an enabled fieldset with a ready draft
    When the fieldset is disabled
    Then the composer cannot be edited or sent and contributes no form value

  # S16
  Scenario: A semantic surface override repaints the composer
    Given a composer under a Kimen theme
    When the raised surface token is changed
    Then the composer surface uses the new colour

  # S17
  Scenario: Right-to-left direction mirrors the composer controls
    Given a composer with an attach control before its send control
    When the region uses right-to-left direction
    Then the attach control is at inline-start and the send control at inline-end

  # S18
  Scenario: Touch density enlarges control targets
    Given a composer on a coarse pointer with standard density
    When the region requests touch density
    Then attachment and send controls activate within the enlarged targets

  # S19
  Scenario: Forced colours retain a visible focus indicator
    Given a composer displayed in forced colours
    When the text field receives keyboard focus
    Then the field retains a visible border and focus indicator

  # S20
  Scenario: Reduced motion changes the writing state without animation
    Given a composer under a reduced-motion preference
    When the assistant starts streaming
    Then the Stop control and writing status appear without animation
```
