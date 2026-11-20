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
