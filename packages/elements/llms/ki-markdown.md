# ki-markdown

> Displays Markdown as Kimen components and native HTML semantics.

## When to use

Show a formatted reply, readme excerpt or progressively received text from a person or model.

## When not to use

Present an editable document or apply trusted authored HTML. Use native markup for structured page content.

## Examples

# ki-markdown examples

The supported Markdown subset includes headings, paragraphs, emphasis,
strikethrough, inline and fenced code, links, opt-in images, ordered and
unordered lists, task items, blockquotes, tables and hard breaks.
Use `> [!NOTE]` to display a Kimen Note.

The package loader registers Markdown, Link, CodeBlock and Note. Register the
child elements your content uses when using direct imports or framework
wrappers.

```js
import { defineCustomElement as defineCodeBlock } from '@kimen/elements/ki-code-block';
import { defineCustomElement as defineLink } from '@kimen/elements/ki-link';
import { defineCustomElement as defineNote } from '@kimen/elements/ki-note';
import { defineCustomElement as defineMarkdown } from '@kimen/elements/ki-markdown';

defineCodeBlock();
defineLink();
defineNote();
defineMarkdown();
```

With a framework wrapper, use the first three registrations. The wrapper
registers Markdown.

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

## Attributes

- `allow-images` (boolean, default false): Render Markdown images that pass the URL policy. Otherwise show their alternative text.
- `heading-offset` (number, default 2, minimum 0, maximum 5): Add zero through five levels to source headings. The output stops at level six. Invalid values use two.
- `src-text` (string | undefined): Markdown source. A supplied value, including an empty string, takes precedence over the default text slot.
- `streaming` (boolean, default false): Keep established blocks mounted while an answer grows. Turn it off when the source is complete.

## Slots

- (default): Literal Markdown source. Set a text node or escape markup when writing HTML.

## Parts

- `content`: Box containing the formatted blocks.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-corner-inline`: Small radius for an outline around inline content.
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-layout-spacing-5xl`: The 5xl spacing step for a stack or grid gap.
- `--ki-layout-spacing-xs`: The xs spacing step for a stack or grid gap.
- `--ki-markdown-backdrop-filter`: Complete backdrop filter for the answer surface.
- `--ki-markdown-bg`: Answer surface backing. It defaults to transparent so the enclosing surface shows through.
- `--ki-markdown-bg-image`: Optional image over the answer's solid backing.
- `--ki-markdown-block-gap`: Spacing between Markdown blocks at standard density.
- `--ki-markdown-fg`: Ink for prose and headings.
- `--ki-markdown-heading-family`: Typeface for Markdown headings.
- `--ki-markdown-inline-code-backdrop-filter`: Complete backdrop filter for inline code.
- `--ki-markdown-inline-code-bg`: Solid backing of an inline code span.
- `--ki-markdown-inline-code-bg-image`: Optional image over the inline code backing.
- `--ki-markdown-inline-code-fg`: Ink for source within an inline code span.
- `--ki-markdown-muted-backdrop-filter`: Complete backdrop filter for quotes and table headings.
- `--ki-markdown-muted-bg`: Backing of quotes and table headings.
- `--ki-markdown-muted-bg-image`: Optional image over the muted backing.
- `--ki-markdown-muted-fg`: Ink for quotes and table headings, strengthened under more contrast.
- `--ki-markdown-quote-border`: Logical start rule of a quotation and the ink of a thematic divider.
- `--ki-outline-low-em`: semantic color for outline low em.
- `--ki-spacing-action-hairline`: Width of the frame and divider in an action surface.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-family-mono`: semantic font family for typography family mono.
- `--ki-typography-line-height-body-2`: semantic dimension for typography line height body 2.
- `--ki-typography-line-height-heading-1`: semantic dimension for typography line height heading 1.
- `--ki-typography-line-height-heading-2`: semantic dimension for typography line height heading 2.
- `--ki-typography-line-height-title-1`: semantic dimension for typography line height title 1.
- `--ki-typography-line-height-title-2`: semantic dimension for typography line height title 2.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1.
- `--ki-typography-size-body-2`: semantic dimension for typography size body 2.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2.
- `--ki-typography-size-heading-1`: semantic dimension for typography size heading 1.
- `--ki-typography-size-heading-2`: semantic dimension for typography size heading 2.
- `--ki-typography-size-title-1`: semantic dimension for typography size title 1.
- `--ki-typography-size-title-2`: semantic dimension for typography size title 2.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium.
- `--ki-typography-weight-body-semibold`: semantic font weight for typography weight body semibold.
