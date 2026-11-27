# ki-code-block

> Presents source code with a named header, syntax colors, line controls and clipboard feedback.

## When to use

display a multiline example, generated code or a tool result that
readers should be able to inspect and copy.

## When not to use

when the reader should edit the source or when the code belongs
inline in a sentence. Use an editor or a native inline code element.

## Examples

# ki-code-block examples

Display a TypeScript snippet with line numbers and a highlighted line.

```html
<ki-code-block language="ts" filename="main.ts" line-numbers highlight="2">// Load the current sample.
const sample = load(3);</ki-code-block>
```

Use plain text for unsupported syntax. In HTML, escape literal angle
brackets so they remain part of the source.

```html
<ki-code-block language="html" filename="example.html" wrap copyable="false">&lt;p&gt;Hello&lt;/p&gt;</ki-code-block>
```

Color a Gherkin contract in English or Spanish with `language="gherkin"`.
Keywords count only where they open a line.

```html
<ki-code-block language="gherkin" filename="pagos.feature"># language: es
Característica: Pagar el carrito
  Escenario: Pagar con tarjeta
    Dado un carrito con 3 productos y un cupón
    Cuando el cliente paga
    Entonces el recibo muestra el total</ki-code-block>
```

The guarded catalog accepts source strings in the default slot.

```json
{
  "version": 1,
  "actions": ["sampleCopied"],
  "root": {
    "component": "ki-code-block",
    "props": { "language": "js", "filename": "index.js", "line-numbers": true },
    "slots": { "": ["const sample = load(3);"] },
    "action": "sampleCopied"
  }
}
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-code-block`: the default, only the tokens ki-code-block needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `copied-label` (string, default 'Copied'): Polite announcement after a successful clipboard write.
- `copy-error-label` (string, default "Couldn't copy"): Polite announcement after a failed clipboard write.
- `copy-label` (string, default 'Copy code'): Accessible name of the copy button.
- `copyable` (boolean, default true): Show the copy control. Set `copyable="false"` in HTML to hide it.
- `filename` (string | undefined): File name shown in the header beside the language.
- `highlight` (string | undefined): Comma-separated lines or inclusive ranges, for example `"3,5-7"`.
- `highlight-label` (string, default 'Highlighted lines'): Localizable prefix for the accessible description of highlighted lines.
- `label` (string | undefined, default 'Code'): Figure and scroll area label when there is no language or filename.
- `language` (string | undefined): Visible language label and syntax grammar. Supports JavaScript, TypeScript, JSON and Gherkin (English and Spanish).
- `line-numbers` (boolean, default false): Show decorative one-based line numbers.
- `wrap` (boolean, default false): Soft-wrap long lines within the available width.

## Slots

- (default): Literal source text. Escape markup in HTML or supply a text node.

## Parts

- `code`: The monospaced source and its optional gutter.
- `figure`: Framed surface around the snippet.
- `header`: Caption containing the language, filename and copy control.
- `scroll`: Focusable native code scroll area.

## Events

- `ki-copy` (CustomEvent<{ value: string }>): Emitted after a successful clipboard write. Detail is `{ value: string }` with the exact copied source.
- `ki-copy-error` (CustomEvent<void>): Emitted when copying fails. Detail is `null`.

## Methods

None.

## CSS custom properties

- `--ki-code-backdrop-filter`: Whole backdrop filter for the figure.
- `--ki-code-bg`: Solid backing for the header and source.
- `--ki-code-bg-image`: Optional image layer above the solid backing.
- `--ki-code-border`: Frame and header divider.
- `--ki-code-border-width`: Width of the frame and header divider.
- `--ki-code-comment`: Supporting syntax ink for comments.
- `--ki-code-fg`: Default source ink.
- `--ki-code-focus-color`: Keyboard focus ring of the scroll area.
- `--ki-code-focus-width`: Width of the scroll area's focus ring.
- `--ki-code-font-family`: Typeface for source and line numbers.
- `--ki-code-font-size`: Compact text size for caption and source.
- `--ki-code-function`: Syntax ink for function names.
- `--ki-code-header-fg`: Supporting language and filename ink.
- `--ki-code-header-padding`: Compact header inset and gap.
- `--ki-code-highlight-bg`: Fill of a highlighted line.
- `--ki-code-highlight-marker`: Inline rule identifying a highlighted line.
- `--ki-code-highlight-marker-width`: Width of the highlighted line rule.
- `--ki-code-keyword`: Syntax ink for keywords.
- `--ki-code-line-height`: Line box height for caption and source.
- `--ki-code-line-number`: Ink for the decorative line numbers.
- `--ki-code-number`: Syntax ink for numbers.
- `--ki-code-padding`: Inset of the source and leading caption edge.
- `--ki-code-radius`: Corner radius of the figure.
- `--ki-code-string`: Syntax ink for strings.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-typography-family-body`: semantic font family for typography family body.
