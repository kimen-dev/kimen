# ki-suggestions

> A labelled group of prompt starters or follow-up suggestions.

## When to use

offer suggested prompts to start or continue an assistant conversation.

## When not to use

choose a form value, switch views, or display static example text.

## Examples

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

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-suggestions`: the default, only the tokens ki-suggestions needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `label` (string, required): Required accessible name for the group.
- `mode` ("fill" | "send", default 'send'): Send through the application or fill its attached editor for revision.
- `variant` ("cards" | "chips", default 'chips'): Wrapping chips for follow-ups or cards with room for a description.

## Slots

- (default): Direct ki-suggestion children in reading order.

## Parts

- `group`: The container that lays out the suggested prompts.

## Events

- `ki-select` (CustomEvent<{ text: string }>): Reports the chosen prompt title. Use this event to send the prompt in send mode. Cancel it to take over the default composer write and focus.

## Methods

None.

## CSS custom properties

- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-suggestion-card-backdrop-filter`: Filter behind the card surface.
- `--ki-suggestion-card-bg`: Resting card surface.
- `--ki-suggestion-card-bg-image`: Image layered over the card surface.
- `--ki-suggestion-card-border`: Resting card boundary.
- `--ki-suggestion-card-fg`: Resting card title.
- `--ki-suggestion-card-hover-bg`: Card surface on a hovering device.
- `--ki-suggestion-card-hover-fg`: Title over the card hover surface.
- `--ki-suggestion-card-inset`: Block padding of each starter card.
- `--ki-suggestion-card-pressed-bg`: Card surface while a pointer or key holds activation.
- `--ki-suggestion-card-pressed-fg`: Title over the pressed card surface.
- `--ki-suggestion-card-radius`: Corners of a starter card.
- `--ki-suggestion-card-weight`: Weight of the card title.
- `--ki-suggestions-card-width`: Maximum inline size of each starter card.
- `--ki-suggestions-font-family`: Typeface inherited by the suggestion group.
- `--ki-suggestions-gap`: Spacing between suggestions.
