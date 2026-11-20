A modal confirmation. `heading` names the dialog and actions go in the `footer`
slot. Each invoker uses the dialog's ID within the same document or shadow root.

```html
<ki-button commandfor="confirm-dialog" command="show-modal" tone="danger">Delete draft</ki-button>
<ki-dialog heading="Delete draft?" id="confirm-dialog">
  <p>This permanently removes the draft.</p>
  <ki-button slot="footer" commandfor="confirm-dialog" command="request-close" autofocus>Cancel</ki-button>
  <ki-button slot="footer" commandfor="confirm-dialog" command="close" tone="danger" variant="primary">Delete</ki-button>
</ki-dialog>
```

`close` dismisses the dialog. `request-close` first gives the dialog a chance
to cancel the request. After an accepted close command, the opening button
regains focus and `ki-close` reports `detail.reason: 'command'`. `show()` and
`close()` remain available for programmatic control.
