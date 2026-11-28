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

  # S13
  Scenario Outline: Boolean attributes read consistently from markup and script
    Given a file upload control
    When an attribute (disabled, required, and multiple) is <write> <moment>
    Then the corresponding property reads <state>

    Examples:
      | write                    | moment                 | state        |
      | absent                   | in the initial markup  | its default  |
      | set to exactly "false"   | in the initial markup  | false        |
      | set to an empty value    | in the initial markup  | true         |
      | set to "true"            | in the initial markup  | true         |
      | set to exactly "false"   | after the first render | false        |
      | set to an empty value    | after the first render | true         |
      | set to "true"            | after the first render | true         |
