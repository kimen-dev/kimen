# ki-prompt-input

> A multiline assistant composer with local file attachments and send and stop requests.

## When to use

Compose a message to an assistant, optionally attach local files, and let people interrupt the assistant's response.

## When not to use

Ordinary multiline form input without a send or stop interaction (`ki-textarea`), file uploads, or rich text editing.

## Examples

# PromptInput examples

Use a composer when a person can send a message to an assistant and stop its response. Provide a `label` even when there is a placeholder.

## Text and attachments

```html
<ki-prompt-input
  label="Message Kimen Assistant"
  placeholder="Ask anything, or drop a file"
  accept=".csv,.pdf,image/*"
  max-files="5"
  max-size="5000000"
></ki-prompt-input>
```

The file picker, drop area and clipboard share the same checks. `max-size` is the number of bytes allowed per file. An empty `accept` hides the attachment UI. The host receives a `ki-submit` event with `detail.text` and `detail.files`.

## Model selection and keyboard shortcuts

```html
<ki-prompt-input label="Message assistant" submit-on="mod-enter">
  <select slot="tools" aria-label="Assistant model">
    <option value="standard">Standard</option>
    <option value="careful">Careful</option>
  </select>
</ki-prompt-input>
```

In modifier mode, Control+Enter and Command+Enter send. Shift+Enter always inserts a newline. A model picker built with a menu can use the same slot. Read model selection from that control when handling `ki-submit`.

The application sets `status` to `submitted` while awaiting a response and to `streaming` when output begins. It handles `ki-stop` and sets `status` to `idle` when the response ends or stops.

## Attributes

- `accept` (string | undefined, default ''): Comma-separated extensions or MIME types. Empty hides the attachment surface.
- `attach-label` (string, default 'Attach files'): Accessible name of the file picker button.
- `attachments-label` (string, default 'Attachments'): Accessible name of the attachment list.
- `disabled` (boolean, default false): Excludes the composer from interaction and native form data.
- `file-count-message` (string, default '{name} exceeds the maximum number of attachments.'): Localized count rejection. The {name} marker is replaced with the file name.
- `file-size-message` (string, default '{name} exceeds the file size limit.'): Localized size rejection. The {name} marker is replaced with the file name.
- `file-type-message` (string, default '{name} has an unsupported file type.'): Localized type rejection. The {name} marker is replaced with the file name.
- `label` (string, required): Required accessible name of the text field. Supply it even with a placeholder.
- `max-files` (number | undefined): Maximum count of attached files. Omit for no count limit.
- `max-size` (number | undefined): Maximum attachment size in bytes per file. Omit for no size limit.
- `name` (string | undefined): Optional key for the text in native form data. Files are carried by ki-submit.
- `placeholder` (string | undefined): Hint displayed while the text field is empty.
- `remove-label` (string, default 'Remove'): Prefix of an attachment's remove button name, followed by the file name.
- `send-label` (string, default 'Send'): Accessible name of the Send button.
- `status` ("idle" | "streaming" | "submitted" | undefined, default 'idle'): Application-owned request state. Only idle can send; streaming exposes Stop.
- `stop-label` (string, default 'Stop generating'): Accessible name of the Stop button.
- `submit-on` ("enter" | "mod-enter", default 'enter'): Send with Enter or with Control/Command+Enter. Shift+Enter always adds a line.
- `value` (string | undefined, default ''): Current draft text; the value attribute provides the form reset default.
- `writing-message` (string, default 'Writing…'): Visible polite status while the assistant streams.

## Slots

- `attachments`: Supplemental list items, visible when accept is set. Composer-managed files appear in the same list and alone contribute to ki-submit.
- `tools`: Application-owned toolbar controls, such as a model-picker trigger. Use non-submitting controls.

## Parts

- `actions`: The toolbar with attachment, tool and message actions.
- `attach`: The native file-picker button.
- `attachments`: The labelled attachment list.
- `feedback`: The polite announcement for rejected attachments.
- `field`: The painted composer enclosure.
- `send`: The native Send button.
- `status`: The polite announcement for the streaming state.
- `stop`: The native Stop button, visible while streaming.
- `textarea`: The native growing text control.
- `tools`: The container for the tools slot.

## Events

- `ki-stop` (CustomEvent<void>): Requests that the application stop its streaming response.
- `ki-submit` (CustomEvent<KiPromptInputSubmitDetail>): Requests a send with original text and a snapshot of accepted local files.

## Methods

None.

## CSS custom properties

- `--ki-button-ghost-neutral-hover-bg`: color used by the button component for ghost neutral hover background.
- `--ki-button-ghost-neutral-hover-fg`: color used by the button component for ghost neutral hover foreground.
- `--ki-button-ghost-neutral-rest-bg`: color used by the button component for ghost neutral rest background.
- `--ki-button-ghost-neutral-rest-fg`: color used by the button component for ghost neutral rest foreground.
- `--ki-button-primary-neutral-disabled-bg`: color used by the button component for primary neutral disabled background. Deliberate deviation: Figma disabled is Surface/disabled_base_em gray.100 with gray.400 text (≈1.4:1); Kimen keeps gray.200 for contrast (precedent 010 D2, pending founder ratification).
- `--ki-button-primary-neutral-disabled-border`: color used by the button component for primary neutral disabled border.
- `--ki-button-primary-neutral-disabled-fg`: color used by the button component for primary neutral disabled foreground. Deliberate deviation: Figma disabled text is text/base_em gray.400 (≈1.4:1 on gray.100); Kimen keeps text.muted gray.700 for readable disabled text (precedent 010 D2, pending founder ratification).
- `--ki-button-primary-neutral-rest-bg`: color used by the button component for primary neutral rest background (MarsUI Surface/primary_med_em, brand 500).
- `--ki-button-primary-neutral-rest-border`: color used by the button component for primary neutral rest border (MarsUI top/inline edge; none in onmars v2).
- `--ki-button-primary-neutral-rest-fg`: color used by the button component for primary neutral rest foreground.
- `--ki-button-secondary-neutral-rest-bg`: color used by the button component for secondary neutral rest background (MarsUI Surface/special/secondary_alpha_base: neutral, not a brand tint; white in onmars v2).
- `--ki-button-secondary-neutral-rest-border`: color used by the button component for secondary neutral rest border (MarsUI top/inline edge).
- `--ki-button-secondary-neutral-rest-fg`: color used by the button component for secondary neutral rest foreground (MarsUI text/high_em).
- `--ki-button-sm-radius`: dimension used by the button component for sm radius (Button master 8003:300 binds Radius/small-component/sm, the scale a radius mode reassigns).
- `--ki-control-size-sm`: Small control track height, 32 CSS px at the default root size.
- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min.
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-icon-button-sm-icon-size`: dimension used by the icon button component for sm icon size (MarsUI Placeholder_sm 18px).
- `--ki-prompt-input-action-gap`: Default spacing between attachments and toolbar controls.
- `--ki-prompt-input-backdrop-filter`: Optional whole backdrop filter behind the composer.
- `--ki-prompt-input-bg`: Raised surface behind the prompt composer.
- `--ki-prompt-input-bg-image`: Optional background image painted above the composer surface.
- `--ki-prompt-input-border`: Outline around the composer.
- `--ki-prompt-input-border-width`: Outline thickness around the composer.
- `--ki-prompt-input-editor-padding-block`: Block inset for the native text field and its sizer.
- `--ki-prompt-input-editor-padding-inline`: Inline inset for the native text field and its sizer.
- `--ki-prompt-input-feedback-bg`: Surface immediately behind attachment rejection text.
- `--ki-prompt-input-feedback-fg`: Attachment rejection text on the composer surface.
- `--ki-prompt-input-fg`: Draft text on the composer surface.
- `--ki-prompt-input-max-height`: Maximum height of the draft before the textarea scrolls.
- `--ki-prompt-input-min-height`: Minimum height of the editable draft.
- `--ki-prompt-input-padding`: Inset and spacing between rows in the composer.
- `--ki-prompt-input-placeholder-fg`: Placeholder and writing status on the composer surface.
- `--ki-prompt-input-radius`: Corner radius of the composer surface.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-body-2`: semantic dimension for typography line height body 2.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2.
- `--ki-typography-size-body-2`: semantic dimension for typography size body 2.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2.
