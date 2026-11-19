# ki-spinner examples

## Inline save status

Insert the spinner when the save begins. Remove it when the save ends.

```html
<ki-spinner size="sm" label="Saving changes…" show-label></ki-spinner>
```

## Assistant status

Use a visually hidden label when the surrounding UI already describes the
activity.

```html
<ki-spinner variant="dots" label="Assistant is thinking"></ki-spinner>
```

## Custom-elements entry point

```ts
import { defineCustomElement } from '@kimen/elements/ki-spinner';

defineCustomElement();
```
