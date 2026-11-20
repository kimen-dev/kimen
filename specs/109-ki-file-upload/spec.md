# FileUpload

**Issue** #390 · **Branch** `feat/390-ki-file-upload`

A form-associated file picker for attachments, imports and media. People can browse or
drop files, see each rejection, and follow progress reported by their application.
The application owns all file transfers and handles cancellation requests.

## Scenario family coverage

| Family | Scenarios |
| --- | --- |
| Core | S1, S2, S3 |
| Keyboard | S4, S5 |
| Assistive technology | S6 |
| Form participation | S7, S8, S9 |
| Theming | S10, S11, S12 |

## Interpretations pending founder confirmation

- **Agent's choice, pending founder confirmation.** `files` includes accepted and rejected rows. An
  accepted row retains its original `File` and a rejected row retains only its metadata. The add
  event contains the accepted rows in the current batch and fires only when at least one file
  is accepted. Applications assign a fresh array and retain each original `File` when updating
  a local file's lifecycle. Metadata-only rows can represent remote files.
- **Agent's choice, pending founder confirmation.** `accept` matches extensions, MIME types and MIME
  wildcards case-insensitively. `max-size` accepts bytes or decimal B, KB, MB and GB. A cap of zero
  is valid. Malformed limits are ignored. Type and size errors take precedence over the count
  limit. New local files fill available capacity in selection order. Single-selection capacity
  is one across selection attempts. Remove the existing accepted file to free a place.
- **Agent's choice, pending founder confirmation.** Removal updates the list and then emits the
  affected row. A keyboard removal moves focus to Browse. Cancel requests application handling
  through an event, leaving the row available for the application to update. Progress is a
  percentage. Terminal updates announce their result without moving focus.
- **Agent's choice, pending founder confirmation.** Form submission includes the original accepted
  files under repeated field names, including while the application reports upload progress
  or a transport error. Rejected and metadata-only rows do not satisfy `required`.
  `error-text` is a custom form error. Native form reset clears the file list.
- **Agent's choice, pending founder confirmation.** A named `help` slot accepts textual guidance
  in the same position as `help-text`. The in-zone Browse button is the keyboard entry point.
  The labels and rejection messages are overridable. Touch-sized targets use the existing
  opt-in density setting.

## Gherkin

```gherkin
Feature: ki-file-upload collects files for an application
  People choose files, correct rejected selections, and follow each upload's outcome.

  # S1
  Scenario: Dropping allowed files adds them to the queue
    Given "Attachments" accepts CSV and PDF files and allows multiple files
    When the person drops "budget.csv" and "guide.pdf"
    Then both files appear as queued in drop order
    And one add event reports both selected files

  # S2
  Scenario: Rejected files remain listed with individual reasons
    Given "Attachments" accepts PDFs up to 5 bytes and allows one file
    When the person drops "photo.jpg", an oversized "book.pdf", "map.pdf" and "notes.pdf"
    Then "map.pdf" is queued and is the only file reported by the add event
    And the remaining rows explain the type, size and count errors respectively

  # S3
  Scenario: Cancel asks the application to stop an upload
    Given the application shows "guide.pdf" at 62 percent and "map.pdf" as uploaded
    When the person activates "Cancel upload of guide.pdf"
    Then one cancel event identifies "guide.pdf"
    And the application retains control of the upload status

  # S4
  Scenario: A keyboard user can open the file picker
    Given the enabled "Browse files" control has keyboard focus
    When the person activates it with the keyboard
    Then the native file picker opens

  # S5
  Scenario: Removing a file leaves focus on Browse files
    Given "Remove guide.pdf" has keyboard focus
    When the person activates it with the keyboard
    Then "guide.pdf" leaves the list and a remove event identifies it
    And focus returns to "Browse files"

  # S6
  Scenario: Application results reach assistive technology politely
    Given "Attachments" shows named progress and cancel controls for two uploading files
    When the application marks "map.pdf" complete and "guide.pdf" failed with "Connection lost"
    Then a polite status announces both outcomes by filename
    And the failure reason is visible and the completed row offers "Remove map.pdf"

  # S7
  Scenario: The form includes accepted original files under the repeated field name
    Given "Attachments" is named "attachments" and holds two accepted files and a rejected file
    When the person submits the form
    Then the submitted attachments are the two accepted original files in selection order

  # S8
  Scenario: Reset clears a required file field
    Given a required "Attachments" field containing "guide.pdf"
    When the person resets the form
    Then the list is empty and the field is invalid because a file is required
    And reset emits no file action

  # S9
  Scenario: A disabled fieldset excludes the selection and prevents changes
    Given "Attachments" holds "guide.pdf" inside a disabled fieldset
    When the person drops "map.pdf"
    Then the selection stays the same and no add event is emitted
    And the picker and row actions are disabled and the form has no attachments

  # S10
  Scenario: Theme tokens paint the idle and active drop surfaces
    Given a theme gives the drop zone distinct idle and drag-over surface colors
    When the person drags a file over the zone
    Then the surface changes from the idle theme color to the drag-over theme color

  # S11
  Scenario: The file row follows direction and user display preferences
    Given a right-to-left page under forced colors and reduced motion
    When an uploading file appears
    Then its action is on the left and its visible focus and border remain distinguishable
    And its progress is presented without motion

  # S12
  Scenario: Touch density gives the file controls larger targets
    Given a coarse pointer device and "Attachments" with a removable file
    When the document opts into touch density
    Then Browse and Remove each have a target of at least 44 by 44 pixels
```
