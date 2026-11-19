A standalone primary action:

```html
<ki-button variant="primary">Save</ki-button>
```

`type` defaults to `submit`, so a bare `ki-button` inside a form submits it; opt out with `type="button"`:

```html
<form>
  <ki-button type="button">Cancel</ki-button>
  <ki-button variant="primary">Save changes</ki-button>
</form>
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
