# AI label examples

Mark generated content beside the text it describes.

```html
<header>Weekly summary <ki-ai-label></ki-ai-label></header>
```

Give people a short provenance explanation when they need to assess a result.
The model and generation time are optional.

```html
<ki-ai-label
  explanation="Written from the incident reports of the last 30 days."
  model="Standard"
  generated-at="2026-11-19T10:32"
></ki-ai-label>
```

Use the input's `end` slot to announce the provenance with the field
description. Keep the original in application state and restore it on
`ki-revert`.

```html
<ki-input id="subject" label="Subject" value="Incident summary">
  <ki-ai-label
    slot="end"
    explanation="Suggested from the incident reports."
    revertible
  ></ki-ai-label>
</ki-input>

<script type="module">
  const field = document.querySelector('#subject');
  const label = field.querySelector('ki-ai-label');
  const original = 'Weekly summary';

  label.addEventListener('ki-revert', () => {
    field.value = original;
    label.remove();
    field.focus();
  });
</script>
```
