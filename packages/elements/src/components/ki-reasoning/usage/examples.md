# Using ki-reasoning

## Show a plan while it develops

```html
<ki-reasoning open>
  <ol>
    <li>Check the inputs.</li>
  </ol>
</ki-reasoning>
```

Add subsequent list items as the assistant produces them. The default state is
collapsed. Set `open` to show the steps immediately.

## Show the elapsed time after completion

```html
<ki-reasoning status="done" duration="12000">
  <ol>
    <li>Check the inputs.</li>
    <li>Compare the available outcomes.</li>
  </ol>
</ki-reasoning>
```

The summary reads “Thought for 12 seconds.” Omit `duration` if it is unavailable.

## Localize the summary

```html
<ki-reasoning
  lang="es"
  status="done"
  duration="1000"
  thinking-label="Pensando…"
  done-label="Listo"
  singular-duration-label="Pensó durante {seconds} segundo"
  duration-label="Pensó durante {seconds} segundos"
>
  <ol>
    <li>Revisar los datos de entrada.</li>
  </ol>
</ki-reasoning>
```

## Report disclosure changes in a guarded surface

Declare the action in the surface and reference it on the disclosure. The
renderer binds it to the catalog's `ki-toggle` event.

```json
{
  "version": 1,
  "actions": ["record-plan-toggle"],
  "root": {
    "component": "ki-reasoning",
    "props": { "status": "done", "duration": 12000 },
    "action": "record-plan-toggle",
    "slots": { "": ["Check the inputs and compare the outcomes."] }
  }
}
```

## Custom-elements entry point

```ts
import { defineCustomElement } from '@kimen/elements/ki-reasoning';

defineCustomElement();
```
