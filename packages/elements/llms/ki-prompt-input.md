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

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-prompt-input`: the default, only the tokens ki-prompt-input needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

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

- `--ki-button-ghost-neutral-hover-bg`: color used by the button component for ghost neutral hover background. Default: `var(--ki-surface-primary-base-em-alpha)`.
- `--ki-button-ghost-neutral-hover-fg`: color used by the button component for ghost neutral hover foreground. Default: `var(--ki-text-primary-high-em)`.
- `--ki-button-ghost-neutral-rest-bg`: color used by the button component for ghost neutral rest background. Default: `var(--ki-transparent-inverse)`.
- `--ki-button-ghost-neutral-rest-fg`: color used by the button component for ghost neutral rest foreground. Default: `var(--ki-text-primary-high-em)`.
- `--ki-button-primary-neutral-disabled-bg`: color used by the button component for primary neutral disabled background. Deliberate deviation: Figma disabled is Surface/disabled_base_em gray.100 with gray.400 text (≈1.4:1); Kimen keeps gray.200 for contrast (precedent 010 D2, pending founder ratification). Default: `var(--ki-surface-disabled-low-em)`.
- `--ki-button-primary-neutral-disabled-border`: color used by the button component for primary neutral disabled border. Default: `var(--ki-outline-none)`.
- `--ki-button-primary-neutral-disabled-fg`: color used by the button component for primary neutral disabled foreground. Deliberate deviation: Figma disabled text is text/base_em gray.400 (≈1.4:1 on gray.100); Kimen keeps text.muted gray.700 for readable disabled text (precedent 010 D2, pending founder ratification). Default: `var(--ki-text-muted)`.
- `--ki-button-primary-neutral-rest-bg`: color used by the button component for primary neutral rest background (MarsUI Surface/primary_med_em, brand 500). Default: `var(--ki-surface-primary-med-em)`.
- `--ki-button-primary-neutral-rest-border`: color used by the button component for primary neutral rest border (MarsUI top/inline edge; none in onmars v2). Default: onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-button-primary-neutral-rest-fg`: color used by the button component for primary neutral rest foreground. Default: `var(--ki-text-primary-on-primary)`.
- `--ki-button-secondary-neutral-rest-bg`: color used by the button component for secondary neutral rest background (MarsUI Surface/special/secondary_alpha_base: neutral, not a brand tint; white in onmars v2). Default: `var(--ki-surface-special-secondary-alpha-base)`.
- `--ki-button-secondary-neutral-rest-border`: color used by the button component for secondary neutral rest border (MarsUI top/inline edge). Default: onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)`.
- `--ki-button-secondary-neutral-rest-fg`: color used by the button component for secondary neutral rest foreground (MarsUI text/high_em). Default: `var(--ki-text-high-em)`.
- `--ki-button-sm-radius`: dimension used by the button component for sm radius (Button master 8003:300 binds Radius/small-component/sm, the scale a radius mode reassigns). Default: onmars `var(--ki-radius-component-sm)`, material3 `var(--ki-radius-round)`.
- `--ki-control-size-sm`: Small control track height, 32 CSS px at the default root size. Default: `var(--ki-space-10xl)`.
- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min. Default: `var(--ki-space-zero)`.
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip). Default: `var(--ki-scale-unit)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme. Default: onmars `light-dark(#bb4e2a,#c5735a)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring. Default: `var(--ki-space-xxs)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
- `--ki-icon-button-sm-icon-size`: dimension used by the icon button component for sm icon size (MarsUI Placeholder_sm 18px). Default: `var(--ki-space-4xl)`.
- `--ki-prompt-input-action-gap`: Default spacing between attachments and toolbar controls. Default: `var(--ki-space-sm)`.
- `--ki-prompt-input-backdrop-filter`: Optional whole backdrop filter behind the composer. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-prompt-input-bg`: Raised surface behind the prompt composer. Default: `var(--ki-surface-s1)`.
- `--ki-prompt-input-bg-image`: Optional background image painted above the composer surface. Default: `var(--ki-surface-image-none)`.
- `--ki-prompt-input-border`: Outline around the composer. Default: `var(--ki-outline-control)`.
- `--ki-prompt-input-border-width`: Outline thickness around the composer. Default: `var(--ki-control-multiline-border-width)`.
- `--ki-prompt-input-editor-padding-block`: Block inset for the native text field and its sizer. Default: `var(--ki-space-xs)`.
- `--ki-prompt-input-editor-padding-inline`: Inline inset for the native text field and its sizer. Default: `var(--ki-space-md)`.
- `--ki-prompt-input-feedback-bg`: Surface immediately behind attachment rejection text. Default: `var(--ki-surface-s1)`.
- `--ki-prompt-input-feedback-fg`: Attachment rejection text on the composer surface. Default: `var(--ki-text-danger-high-em)`.
- `--ki-prompt-input-fg`: Draft text on the composer surface. Default: `var(--ki-text-high-em)`.
- `--ki-prompt-input-max-height`: Maximum height of the draft before the textarea scrolls. Default: `var(--ki-control-multiline-max-size)`.
- `--ki-prompt-input-min-height`: Minimum height of the editable draft. Default: `var(--ki-control-multiline-min-size)`.
- `--ki-prompt-input-padding`: Inset and spacing between rows in the composer. Default: `var(--ki-space-md)`.
- `--ki-prompt-input-placeholder-fg`: Placeholder and writing status on the composer surface. Default: `var(--ki-text-supporting)`.
- `--ki-prompt-input-radius`: Corner radius of the composer surface. Default: `var(--ki-radius-big-component-xs)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-typography-line-height-body-2`: semantic dimension for typography line height body 2. Default: `var(--ki-font-line-height-body-2)`.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2. Default: `var(--ki-font-line-height-caption-2)`.
- `--ki-typography-size-body-2`: semantic dimension for typography size body 2. Default: `var(--ki-font-size-body-2)`.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2. Default: `var(--ki-font-size-caption-2)`.
