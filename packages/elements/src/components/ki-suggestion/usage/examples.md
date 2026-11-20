# ki-suggestion examples

## Add context to a prompt

```html
<ki-suggestions label="Start a conversation" variant="cards">
  <ki-suggestion description="For the merged pull requests">Draft release notes</ki-suggestion>
  <ki-suggestion>Plan the next release</ki-suggestion>
</ki-suggestions>
```

Put the prompt in the default slot as plain text. The title supplies the
button's accessible name. Use `description` for separate context.

Register both tags for direct imports. Listen to `ki-select` on the group
for the chosen title.
