## Edit details beside a list

Use `heading` to name the sheet. Open it from a focused trigger so focus can
return there. The app wires its own footer actions.

```html
<ki-button id="edit-incident" type="button">Edit incident</ki-button>
<ki-drawer id="incident-editor" heading="Edit incident" placement="end">
  <ki-input label="Title" value="Search index rebuild"></ki-input>
  <ki-button slot="footer" id="save-incident" type="button" variant="primary">
    Save
  </ki-button>
</ki-drawer>

<script type="module">
  const editor = document.querySelector('#incident-editor');
  document.querySelector('#edit-incident').addEventListener('click', () => editor.show());
  document.querySelector('#save-incident').addEventListener('click', () => {
    // Save the app's changes first.
    editor.close();
  });
  editor.addEventListener('ki-close', (event) => {
    if (editor.hasAttribute('data-unsaved')) event.preventDefault();
  });
</script>
```

## Offer a short list of actions

A bottom sheet has a swipe handle and a keyboard-accessible Close button.
Use `close-label` to translate the button for your audience.

```html
<ki-drawer heading="Share incident" placement="bottom" size="20rem" open>
  <p>Choose how to share the incident.</p>
  <ki-button slot="footer" variant="secondary">Email</ki-button>
  <ki-button slot="footer" variant="primary">Copy link</ki-button>
</ki-drawer>
```

Use `modal="false"` when the page behind the drawer should stay interactive.
`placement="start"` and `placement="end"` follow the inherited direction.
