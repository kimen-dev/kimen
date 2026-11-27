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

The loader defines Markdown and its Link, CodeBlock and Note children as they appear. Register the
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

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-markdown`: the default, only the tokens ki-markdown needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

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

- `--ki-corner-inline`: Small radius for an outline around inline content. Default: `var(--ki-radius-xxs)`.
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip). Default: `var(--ki-scale-unit)`.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme. Default: onmars `light-dark(#bb4e2a,#c5735a)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
- `--ki-layout-spacing-5xl`: The 5xl spacing step for a stack or grid gap. Default: `var(--ki-space-5xl)`.
- `--ki-layout-spacing-xs`: The xs spacing step for a stack or grid gap. Default: `var(--ki-space-xs)`.
- `--ki-markdown-backdrop-filter`: Complete backdrop filter for the answer surface. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-markdown-bg`: Answer surface backing. It defaults to transparent so the enclosing surface shows through. Default: `var(--ki-surface-transparent)`.
- `--ki-markdown-bg-image`: Optional image over the answer's solid backing. Default: `var(--ki-surface-image-none)`.
- `--ki-markdown-block-gap`: Spacing between Markdown blocks at standard density. Default: `var(--ki-layout-spacing-xl)`.
- `--ki-markdown-fg`: Ink for prose and headings. Default: `var(--ki-text-high-em)`.
- `--ki-markdown-heading-family`: Typeface for Markdown headings. Default: `var(--ki-typography-family-heading)`.
- `--ki-markdown-inline-code-backdrop-filter`: Complete backdrop filter for inline code. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-markdown-inline-code-bg`: Solid backing of an inline code span. Default: `var(--ki-surface-s2)`.
- `--ki-markdown-inline-code-bg-image`: Optional image over the inline code backing. Default: `var(--ki-surface-image-none)`.
- `--ki-markdown-inline-code-fg`: Ink for source within an inline code span. Default: `var(--ki-text-high-em)`.
- `--ki-markdown-muted-backdrop-filter`: Complete backdrop filter for quotes and table headings. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-markdown-muted-bg`: Backing of quotes and table headings. Default: `var(--ki-surface-transparent)`.
- `--ki-markdown-muted-bg-image`: Optional image over the muted backing. Default: `var(--ki-surface-image-none)`.
- `--ki-markdown-muted-fg`: Ink for quotes and table headings, strengthened under more contrast. Default: `var(--ki-text-supporting)`.
- `--ki-markdown-quote-border`: Logical start rule of a quotation and the ink of a thematic divider. Default: `var(--ki-outline-med-em)`.
- `--ki-outline-low-em`: semantic color for outline low em. Default: onmars `light-dark(rgba(24,22,19,0.1),rgba(255,250,240,0.1))`, material3 `light-dark(#e7e0ec,#36343b)`.
- `--ki-spacing-action-hairline`: Width of the frame and divider in an action surface. Default: `var(--ki-size-border-hairline)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-typography-family-mono`: semantic font family for typography family mono. Default: `var(--ki-font-family-mono)`.
- `--ki-typography-line-height-body-2`: semantic dimension for typography line height body 2. Default: `var(--ki-font-line-height-body-2)`.
- `--ki-typography-line-height-heading-1`: semantic dimension for typography line height heading 1. Default: `var(--ki-font-line-height-heading-1)`.
- `--ki-typography-line-height-heading-2`: semantic dimension for typography line height heading 2. Default: `var(--ki-font-line-height-heading-2)`.
- `--ki-typography-line-height-title-1`: semantic dimension for typography line height title 1. Default: `var(--ki-font-line-height-title-1)`.
- `--ki-typography-line-height-title-2`: semantic dimension for typography line height title 2. Default: `var(--ki-font-line-height-title-2)`.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1. Default: `var(--ki-font-size-body-1)`.
- `--ki-typography-size-body-2`: semantic dimension for typography size body 2. Default: `var(--ki-font-size-body-2)`.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2. Default: `var(--ki-font-size-caption-2)`.
- `--ki-typography-size-heading-1`: semantic dimension for typography size heading 1. Default: `var(--ki-font-size-heading-1)`.
- `--ki-typography-size-heading-2`: semantic dimension for typography size heading 2. Default: `var(--ki-font-size-heading-2)`.
- `--ki-typography-size-title-1`: semantic dimension for typography size title 1. Default: `var(--ki-font-size-title-1)`.
- `--ki-typography-size-title-2`: semantic dimension for typography size title 2. Default: `var(--ki-font-size-title-2)`.
- `--ki-typography-weight-body-medium`: semantic font weight for typography weight body medium. Default: `var(--ki-font-weight-body-medium)`.
- `--ki-typography-weight-body-semibold`: semantic font weight for typography weight body semibold. Default: `var(--ki-font-weight-body-semibold)`.
