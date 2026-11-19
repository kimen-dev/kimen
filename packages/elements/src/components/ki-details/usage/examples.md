### Workspace permissions

Use one disclosure for an explanation the reader can reveal on demand.
Use the plain `summary` prop for text or a heading in the `summary` slot.
The default slot contains the answer.

```html
<ki-details summary="Who can see my workspace?">
  <p>Only people you invite can see it.</p>
</ki-details>
```

Listen for `ki-toggle` on the disclosure to read `event.detail.open`.
In a catalog surface, bind the action to the individual Details node.
