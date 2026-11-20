# Using ki-skeleton

Define the component when using direct imports.

```js
import { defineCustomElement } from '@kimen/elements/ki-skeleton';
defineCustomElement();
```

## Match the expected layout

```html
<section aria-label="Assistant is writing" aria-busy="true">
  <ki-skeleton lines="3"></ki-skeleton>
</section>

<section aria-label="Loading project" aria-busy="true">
  <ki-skeleton shape="circle" size="2.5rem"></ki-skeleton>
  <ki-skeleton shape="rect" block-size="6rem"></ki-skeleton>
</section>
```

The last of multiple text lines is shorter. Use `inline-size` and `block-size` to match the dimensions of the incoming content. Set `animated="false"` to use a static fill.

## Skip the flash on fast loads

Reserve the expected block size immediately. Use `hidden` until the request has been pending for about 300 ms.

```html
<section id="project" aria-label="Loading project" aria-busy="true" style="min-block-size:6rem">
  <ki-skeleton hidden shape="rect" block-size="6rem"></ki-skeleton>
</section>
```

```js
const region = document.querySelector('#project');
const placeholder = region.querySelector('ki-skeleton');
const reveal = setTimeout(() => {
  placeholder.hidden = false;
}, 300);

try {
  const project = await new Promise((resolve) => {
    setTimeout(() => resolve({ name: 'Roadmap' }), 900);
  });
  region.textContent = project.name;
} finally {
  clearTimeout(reveal);
  placeholder.remove();
  region.setAttribute('aria-busy', 'false');
  region.setAttribute('aria-label', 'Project');
}
```

Use this script in a module after the section is mounted. Change the simulated request to 150 ms to see the fast path. In an application, use the real request and show its error state in the same region.
