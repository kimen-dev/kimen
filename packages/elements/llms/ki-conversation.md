# ki-conversation

> An accessible chat transcript with optional following as messages arrive.

## When to use

Display chronological user, assistant and event messages. Give
the host a block-size constraint to keep scrolling within the transcript.

## When not to use

Collect input, send messages or present a static sequence of
cards. Place the composer outside the transcript.

## Examples

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

## Attributes

- `jump-label` (string, default 'Jump to latest'): Visible and accessible label for the control that resumes following.
- `label` (string, default 'Conversation'): Accessible name of the transcript. Supply a distinct label when several logs share a page.
- `stick-to-bottom` (boolean, default false): Follow new or growing messages until the reader scrolls away from the end.

## Slots

- (default): The chronological transcript, normally ki-message elements.

## Parts

- `jump`: The Jump to latest button shown while following is paused.
- `log`: The named polite live region and keyboard-focusable scrollport.
- `messages`: The stack of slotted messages inside the scrollport.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-conversation-gap`: Space between messages in the transcript.
- `--ki-conversation-max-width`: Maximum inline size of the transcript.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-layout-spacing-md`: The md spacing step for a stack or grid gap.
- `--ki-typography-family-body`: semantic font family for typography family body.
