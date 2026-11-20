# Rating consumer contract

```html
<ki-rating label="Average rating" value="4.2" readonly></ki-rating>
<ki-rating label="How useful was this answer?" name="usefulness" precision="0.5" required></ki-rating>
```

Supply a label for the context or question. The default scale goes up to five with whole steps. Set `precision="0.5"` to enable half steps in input mode. Read-only artwork always uses half stars and the text keeps the score's original precision.

Listen for `ki-change` to observe a changed user selection. Read the numeric score from `event.detail.value`. A named editable rating submits the score as a decimal string. Zero represents an unanswered rating and is omitted from form data. Reset restores the starting score.

The catalog exposes the same scalar inputs and the declared `ki-change` action. Direct element imports and the generated React, Vue and Angular wrappers expose the component. Supply a registered Lucide name to use a different glyph.
