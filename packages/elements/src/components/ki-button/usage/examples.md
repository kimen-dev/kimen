A standalone primary action:

```html
<ki-button variant="primary">Save</ki-button>
```

In momentary mode `type` defaults to `submit`. Use `type="button"` for an independent action inside a form.

```html
<form>
  <ki-button type="button">Cancel</ki-button>
  <ki-button variant="primary">Save changes</ki-button>
</form>
```

A call to action that navigates takes `href`: the button renders a native link with the same look. Enter follows it, it never submits its form, and `target="_blank"` without `rel` gets `rel="noreferrer noopener"`.

```html
<ki-button variant="primary" href="/start">Get started</ki-button>
```

Use `toggle` for a persistent action. `selected` sets the starting state and each activation changes `aria-pressed` while keeping the label. Toggle mode acts independently of form submission and reset, regardless of `type`.

```html
<ki-button id="pin" variant="outline" toggle selected>Pin</ki-button>
<script type="module">
  const button = document.getElementById('pin');
  button.addEventListener('ki-change', ({ detail: { selected } }) => {
    console.log('Pinned', selected);
  });
</script>
```

Enabled outline actions use `--ki-button-outline-hover-bg`,
`--ki-button-outline-hover-fg` and `--ki-button-outline-hover-border` on hover.
Unselected filled and quiet toggles use `--ki-button-toggle-unselected-hover-overlay`.
A selected toggle keeps its fill on hover. Use `--ki-button-outline-selected-border`
to set the selected outline edge.

Programmatic writes to `selected` are silent. A parent coordinating several toggles can listen for their bubbling `ki-change` events and update their `selected` values together.

Open a dialog with `command="show-modal"` and its ID in `commandfor`. The
dialog and invoker share a document or shadow root. The command takes
precedence over form submission or reset.

```html
<ki-button commandfor="draft-preview" command="show-modal">Preview draft</ki-button>
<ki-dialog id="draft-preview" heading="Draft preview">
  This draft is visible only to you.
  <ki-button slot="footer" commandfor="draft-preview" command="close">Done</ki-button>
</ki-dialog>
```

Programmatic creation after registration; string attributes and properties are interchangeable:

```ts
import { defineCustomElement } from '@kimen/elements/ki-button';

defineCustomElement();

const saveButton = document.createElement('ki-button');
saveButton.setAttribute('type', 'button');
saveButton.textContent = 'Save';
document.body.append(saveButton);
```

The leading and trailing slots use `--ki-button-{size}-icon-size` for their
box and for a directly slotted `ki-icon` glyph. The button token takes
precedence over an explicit `size` on that icon.

While the action a button started is in progress, set `loading` on it instead of `disabled`: it keeps its width and focus, ignores further activation (it neither submits nor resets its form), draws a spinner in place of its label and announces `loading-label` (default "Loading") as a polite status message. Clear it when the action ends:

```html
<form id="profile">
  <ki-button variant="primary" loading-label="Saving">Save changes</ki-button>
</form>
<script type="module">
  const form = document.getElementById('profile');
  const save = form.querySelector('ki-button');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    save.loading = true;
    try {
      await fetch('/profile', { method: 'POST', body: new FormData(form) });
    } finally {
      save.loading = false;
    }
  });
</script>
```

A button or link fits its content by default. Set `--ki-button-inline-size`
to `100%` to fill the containing block. The alignment tokens start-align the
content and label lines of this two-line choice.

```html
<style>
  .choice {
    --ki-button-inline-size: 100%;
    --ki-button-justify-content: start;
    --ki-button-text-align: start;
  }
</style>
<ki-button class="choice" variant="outline" toggle>
  <strong>Starter</strong><br />One agent, one repository
</ki-button>
```
