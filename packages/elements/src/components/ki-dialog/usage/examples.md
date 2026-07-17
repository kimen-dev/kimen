A modal confirmation; `heading` names the dialog for assistive technology and actions go in the `footer` slot:

```html
<ki-dialog heading="Delete draft?" id="confirm-dialog">
  <p>This permanently removes the draft.</p>
  <ki-button slot="footer" type="button">Cancel</ki-button>
  <ki-button slot="footer" tone="danger" variant="primary">Delete</ki-button>
</ki-dialog>
```

Open it with the `show()` method (and close with `close()`); the `ki-close` event reports why it closed in `detail.reason` (`method`, `escape`, or `backdrop`):

```html
<ki-button type="button" onclick="document.getElementById('confirm-dialog').show()">
  Delete draft
</ki-button>
```
