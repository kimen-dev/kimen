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
