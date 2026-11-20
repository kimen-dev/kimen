# ki-conversation examples

## Bounded transcript

Set a block size to make the transcript scroll. Enable `stick-to-bottom` to
follow new messages and keep incoming replies in view.

```html
<ki-conversation id="help-chat" label="Component help" stick-to-bottom style="block-size: 20rem">
  <ki-message message-role="user">Which inputs handle form errors?</ki-message>
  <ki-message message-role="event" icon-name="search">Searched the component docs</ki-message>
  <ki-message message-role="assistant">Input, textarea and select show field errors.</ki-message>
</ki-conversation>
<label for="prompt">Message</label>
<textarea id="prompt"></textarea>
```

## Pass application chunks to a message

Call this function with the async iterable supplied by your application.
Keep the composer and any waiting indicator outside the live log.

```js
async function appendReply(conversation, chunks) {
  const reply = document.createElement('ki-message');
  reply.setAttribute('streaming', '');
  conversation.append(reply);
  try {
    for await (const chunk of chunks) {
      reply.append(chunk);
    }
  } finally {
    reply.removeAttribute('streaming');
  }
}
```

## Custom-elements entry points

```ts
import { defineCustomElement as defineConversation } from '@kimen/elements/ki-conversation';
import { defineCustomElement as defineMessage } from '@kimen/elements/ki-message';

defineConversation();
defineMessage();
```
