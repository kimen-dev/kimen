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

Programmatic writes to `selected` are silent. A parent coordinating several toggles can listen for their bubbling `ki-change` events and update their `selected` values together.

Programmatic creation after registration; string attributes and properties are interchangeable:

```ts
import { defineCustomElement } from '@kimen/elements/ki-button';

defineCustomElement();

const saveButton = document.createElement('ki-button');
saveButton.setAttribute('type', 'button');
saveButton.textContent = 'Save';
document.body.append(saveButton);
```

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
