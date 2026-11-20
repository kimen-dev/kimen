# ki-markdown examples

Render a short note as static text.

```html
<ki-markdown src-text="## Release notes"></ki-markdown>

<ki-markdown>Check the **release date** and the [upgrade guide](/guides/upgrade).</ki-markdown>
```

Update the source while chunks arrive. When all text has arrived, finish the
stream so the component renders the complete Markdown document.

```html
<ki-markdown id="answer" streaming></ki-markdown>
```

```js
const answer = document.querySelector('#answer');
let source = '';
for await (const chunk of answerChunks) {
  source += chunk;
  answer.srcText = source;
}
answer.streaming = false;
```

Assign untrusted strings to `srcText`. In a static HTML example, escape angle
brackets before passing them as text.

```html
<ki-markdown>&lt;aside&gt;This markup is shown as text.&lt;/aside&gt;</ki-markdown>
```

A guarded surface can pass the source as a string in the default slot.

```json
{
  "version": 1,
  "root": {
    "component": "ki-markdown",
    "props": { "heading-offset": 1 },
    "slots": { "": ["# Release notes\n\nRead the [upgrade guide](/guides/upgrade)."] }
  }
}
```
