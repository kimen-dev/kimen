# Suggestions consumer contract

```html
<ki-suggestions label="Start a conversation" variant="cards" mode="fill">
  <ki-suggestion description="For the merged pull requests">Draft release notes</ki-suggestion>
</ki-suggestions>
<textarea id="draft" aria-label="Message"></textarea>
```

```js
const suggestions = document.querySelector('ki-suggestions');
suggestions.composer = document.querySelector('#draft');
```

The group exposes `label`, `variant` and `mode`. Its default slot accepts direct
`ki-suggestion` children. The defaults are `chips` and `send`. The `group` part
exposes the layout container. A suggestion accepts its plain-text title in the
default slot and an optional `description`, with `button` and `description` parts.

The bubbling, composed, cancelable `ki-select` originates from the group and
carries `{ text: string }` in `detail`. A supplied script-only `composer` exposes
a writable string `value` and a `focus()` method. After the event, the group
fills it in fill mode and focuses it in either mode. Call `preventDefault()`
to take over that workflow. Use the event handler to send prompts in send
mode. Cancelling or omitting the composer also supports applications that
assign focus asynchronously.

Register both tags when using direct imports or framework wrappers. The
catalog exposes their declarative props and slots plus the group's selection
event. Its action handler receives the normal catalog action payload. A
different action identifier on each suggestion can identify the prompt.
