# ki-suggestions examples

## Fill a draft for editing

```html
<ki-suggestions id="starters" label="Start a conversation" variant="cards" mode="fill">
  <ki-suggestion description="For the merged pull requests">Draft release notes</ki-suggestion>
  <ki-suggestion description="From the on-call reports">Summarise the incidents</ki-suggestion>
</ki-suggestions>
<label for="draft">Message</label>
<textarea id="draft"></textarea>
```

```js
import { defineCustomElement as defineSuggestions } from '@kimen/elements/ki-suggestions';
import { defineCustomElement as defineSuggestion } from '@kimen/elements/ki-suggestion';

defineSuggestions();
defineSuggestion();

document.querySelector('#starters').composer = document.querySelector('#draft');
```

The group replaces the draft and focuses the textarea. A custom composer can
expose the same writable string `value` and `focus()` interface.

## Send a follow-up

```html
<ki-suggestions id="follow-ups" label="Follow-up suggestions">
  <ki-suggestion>Which ones recur?</ki-suggestion>
  <ki-suggestion>Group them by service</ki-suggestion>
</ki-suggestions>
```

```js
const followUps = document.querySelector('#follow-ups');
followUps.composer = document.querySelector('#draft');
followUps.addEventListener('ki-select', ({ detail }) => {
  sendPrompt(detail.text);
});
```

Here `sendPrompt` is the application's conversation handler. After dispatch,
the group focuses the composer and preserves its draft. Cancel the event to
manage value and focus in the application handler.
