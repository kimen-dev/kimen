# ki-file-upload

> A form-associated picker and drop zone with local selection validation and a list of file upload outcomes.

## When to use

collect local attachments, media or imports, and optionally show
application-managed upload progress and results.

## When not to use

transfer files without an application handler, collect a URL,
or use client-side type and size checks as upload authorization.

## Examples

# File upload examples

## Submit attachments with a form

```html
<form action="/attachments" method="post" enctype="multipart/form-data">
  <ki-file-upload
    label="Incident attachments"
    name="attachments"
    accept=".csv,.pdf"
    max-size="10MB"
    max-files="3"
    multiple
    required
  >
    <span slot="help">Choose up to three CSV or PDF files, up to 10 MB each.</span>
  </ki-file-upload>
  <button type="submit">Send attachments</button>
  <button type="reset">Clear attachments</button>
</form>
```

Register the element once with the direct package entry point.

```js
import { defineCustomElement } from '@kimen/elements/ki-file-upload';

defineCustomElement();
```

The form submits each accepted original `File` under `attachments`. A reset
clears the list. Use `error-text` for a form error, such as one returned by
your application, and clear it when the error is resolved.

## Report progress from an application-managed transfer

Use a standalone picker when your application sends files as soon as people
choose them.

```html
<ki-file-upload id="transfer-picker" label="Import CSV files" accept=".csv" multiple>
</ki-file-upload>
```

Here `sendFile` is your application's transfer function. It accepts a
`File`, an abort signal and a progress callback receiving a percentage.

```js
const upload = document.querySelector('#transfer-picker');
const transfers = new Map();

function update(file, changes) {
  upload.files = upload.files.map((entry) =>
    entry.file === file ? { ...entry, ...changes } : entry,
  );
}

async function startUpload(file) {
  const controller = new AbortController();
  transfers.set(file, controller);
  update(file, { status: 'uploading', progress: 0 });

  try {
    await sendFile(file, {
      signal: controller.signal,
      onProgress: (progress) => update(file, { progress }),
    });
    update(file, { status: 'done' });
  } catch {
    const error = controller.signal.aborted ? 'Upload canceled.' : 'Upload failed.';
    update(file, { status: 'error', error });
  } finally {
    transfers.delete(file);
  }
}

upload.addEventListener('ki-files-add', ({ detail }) => {
  for (const { file } of detail.files) {
    void startUpload(file);
  }
});

upload.addEventListener('ki-file-cancel', ({ detail }) => {
  transfers.get(detail.file.file)?.abort();
});
```

Use `ki-file-remove` to update application state when a row is removed.
For previously uploaded attachments, set `files` to rows with metadata and
`status: 'done'`. Only rows carrying an original `File` contribute form
entries.

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-file-upload`: the default, only the tokens ki-file-upload needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `accept` (string | undefined): Comma-separated extensions, MIME types and MIME wildcards allowed in new selections.
- `browse-label` (string, default 'Browse files'): Visible text of the native file picker button.
- `cancel-label` (string, default 'Cancel upload of {file}'): Accessible name template for cancellation. Use {file} for the displayed filename.
- `count-error` (string, default 'Too many files.'): Rejection text for a file beyond selection capacity.
- `disabled` (boolean, default false): Disables the picker and file actions and excludes the field from submission.
- `done-label` (string, default 'Uploaded'): Status text for a completed upload.
- `drop-label` (string, default 'Drop files here or'): Drop instruction shown just before the Browse button.
- `error-text` (string | undefined): Application validation error. Clear it to allow form submission again.
- `failed-label` (string, default 'Upload failed.'): Fallback status text for a failed upload without a supplied error.
- `help-text` (string | undefined): Guidance for file formats, limits or the purpose of this field.
- `label` (string, default 'Upload files'): Visible label and accessible name of the upload group.
- `list-label` (string, default 'Files'): Accessible name of the list of files.
- `max-files` (number | undefined): Maximum accepted local files as a nonnegative integer. Single-file mode also caps this at one.
- `max-size` (string | undefined): Maximum size per selected file in bytes or decimal B, KB, MB or GB, such as "10MB".
- `multiple` (boolean, default false): Allows a selection of more than one file.
- `name` (string | undefined): Form-data key repeated for each accepted original file.
- `queued-label` (string, default 'Queued'): Status text for an accepted file waiting to upload.
- `remove-label` (string, default 'Remove {file}'): Accessible name template for removal. Use {file} for the displayed filename.
- `required` (boolean, default false): Requires at least one original accepted file to submit the form.
- `required-label` (string, default 'Required'): Visible annotation for a required file field.
- `required-message` (string, default 'Select a file.'): Validation message when the form requires a file and none is selected.
- `size-error` (string, default 'This file is too large.'): Rejection text for a file larger than max-size.
- `type-error` (string, default 'This file type is not allowed.'): Rejection text for a file that does not match accept.
- `uploading-label` (string, default 'Uploading {file}'): Progress indicator name template. Use {file} for the displayed filename.

## Slots

- `help`: Plain-language guidance for the picker, in place of help-text.

## Parts

- `action`: Native button for removal or cancellation.
- `browse`: Native button that opens the file picker.
- `drop-zone`: Surface that receives files dragged from the operating system.
- `error`: Field-level form validation error.
- `file-meta`: Size, outcome or error text for the file.
- `file-name`: Name displayed for the file.
- `help`: Guidance associated with the field.
- `input`: Hidden native file picker.
- `label`: Field label and optional required annotation.
- `list`: List of selected files and rejections.
- `progress`: Progress indicator for an uploading file.
- `row`: A file row, with data-status matching its lifecycle state.

## Events

- `ki-file-cancel` (CustomEvent<KiFileActionDetail>): Requests that the application cancel the identified upload.
- `ki-file-remove` (CustomEvent<KiFileActionDetail>): Reports a row removed by the user, after updating the file list.
- `ki-files-add` (CustomEvent<KiFilesAddDetail>): Reports the accepted rows in one picker or drop batch, each with its original File.

## Methods

None.

## CSS custom properties

- `--ki-corner-inline`: Small radius for an outline around inline content.
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-file-upload-active-bg`: Drop zone background while files are dragged over it.
- `--ki-file-upload-active-border`: Drop zone boundary while files are dragged over it.
- `--ki-file-upload-active-fg`: Main drop zone text while files are dragged over it.
- `--ki-file-upload-backdrop-filter`: Complete backdrop filter applied behind the drop zone.
- `--ki-file-upload-bg`: Drop zone background at rest.
- `--ki-file-upload-bg-image`: Optional image over the drop zone background.
- `--ki-file-upload-border`: Dashed boundary of the drop zone.
- `--ki-file-upload-border-width`: Outline stroke width for the drop zone and file rows.
- `--ki-file-upload-error-bg`: Background of a file row with an error.
- `--ki-file-upload-error-border`: Boundary of a file row with an error.
- `--ki-file-upload-error-fg`: Text of a file error or field error.
- `--ki-file-upload-fg`: Main drop zone text at rest.
- `--ki-file-upload-radius`: Drop zone corner radius.
- `--ki-file-upload-row-backdrop-filter`: Complete backdrop filter applied behind a file row.
- `--ki-file-upload-row-bg`: Background of a file row and the field label.
- `--ki-file-upload-row-bg-image`: Optional image over the file row background.
- `--ki-file-upload-row-border`: Boundary of a file row without an error.
- `--ki-file-upload-row-fg`: File names, row action icons and the field label.
- `--ki-file-upload-row-radius`: File row corner radius.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-layout-spacing-3xl`: The 3xl spacing step for a stack or grid gap.
- `--ki-layout-spacing-md`: The md spacing step for a stack or grid gap.
- `--ki-layout-spacing-xs`: The xs spacing step for a stack or grid gap.
- `--ki-text-primary-high-em`: semantic color for text primary high em.
- `--ki-text-supporting`: Supporting text of an enabled control: field labels, placeholders, list secondary lines, quiet button labels and unselected tabs. A role, distinct from the med-em emphasis step it resolves to, so a mode can strengthen enabled supporting text without touching the disabled ink that also draws from med-em (directly, or through text.muted).
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-body-1`: semantic dimension for typography line height body 1.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2.
- `--ki-typography-underline-offset`: Gap between text and its underline.
- `--ki-typography-underline-thickness`: Stroke width of a resting text underline.
- `--ki-typography-underline-thickness-hover`: Stroke width of an emphasized underline on hover.
- `--ki-typography-visually-hidden-size`: Nonzero edge for clipped text available to assistive technology.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium.
- `--ki-typography-weight-body-normal`: semantic font weight for typography weight body normal.
