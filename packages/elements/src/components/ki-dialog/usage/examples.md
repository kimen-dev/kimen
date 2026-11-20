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


## Edit a longer form

```html
<ki-button commandfor="event-details" command="show-modal">Add event</ki-button>
<ki-dialog id="event-details" heading="New event" fullscreen="compact"
  confirm-label="Save" close-label="Discard and close">
  <ki-input label="Title"></ki-input>
  <ki-input label="Date"></ki-input>
</ki-dialog>
```

Below 600 CSS pixels the modal fills the window and keeps its heading and
actions visible above the scrollable body. At wider widths `Save` moves to
the centered dialog's footer. Handle `ki-confirm` to save the form and call
`close()` after success. In fullscreen, call `preventDefault()` on
`ki-close` to veto Escape or the header close button while editing.

When importing the dialog directly, register `ki-button` to use the themed
confirmation button. A single-element import still provides a native
confirmation button with the same label and event.
