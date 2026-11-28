# ki-tool-call

> A disclosure for one assistant tool call, with a status and optional payloads.

## When to use

show which tool ran, its state and duration, and let the reader
inspect the supplied input, output or error. Use a conversation log for status updates.

## When not to use

collecting approval, running or configuring tools. Pair with a
separate confirmation control for an approval decision.

## Examples

# ToolCall examples

## Inspect a completed tool call

```html
<ki-tool-call name="search_docs" title="Search docs" status="done" duration="1200">
  <ki-code-block slot="input" language="json" filename="search-input.json" wrap>{"query": "Forms"}</ki-code-block>
  <ki-code-block slot="output" language="json" filename="search-output.json" wrap>["Field help"]</ki-code-block>
</ki-tool-call>
```

## Handle a failed call

```html
<ki-tool-call name="build_preview" status="failed" retryable>
  <p slot="error">The build was interrupted.</p>
</ki-tool-call>
```

Listen for `ki-tool-retry` to let the application handle the request. In
a guarded surface, set the node's `action` to a declared retry action.
A consumer-owned control in the error slot can declare its own action.

## Record a transition in the conversation

```html
<div id="tool-updates" role="log" aria-label="Tool updates"></div>
<ki-tool-call id="call" name="run_tests" status="running"></ki-tool-call>
<script type="module">
  const log = document.querySelector('#tool-updates');
  const call = document.querySelector('#call');
  call.addEventListener('ki-tool-status-change', ({ detail: { name, label } }) => {
    const entry = document.createElement('p');
    entry.textContent = [name, label].join(': ');
    log.append(entry);
  });
</script>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-tool-call`: the default, only the tokens ki-tool-call needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `approval-label` (string, default 'Needs approval'): Status text for a call waiting on an approval decision.
- `done-label` (string, default 'Done'): Status text for a successful call.
- `duration` (number | undefined, minimum 0): Non-negative elapsed time in milliseconds. Displayed only for Done.
- `error-label` (string, default 'Error'): Caption for the error slot.
- `failed-label` (string, default 'Failed'): Status text for a failed call.
- `input-label` (string, default 'Input'): Caption for the input slot.
- `locale` (string, default 'en'): Language tag used to format the completed duration. Defaults to English.
- `name` (string, required): Tool identifier, such as search_docs, displayed in monospace.
- `open` (boolean | undefined): Override the disclosure state. Without an override, failed calls are open and other calls are closed. Set open="false" for an explicit collapse. Using the summary sets the property to the reader's choice.
- `output-label` (string, default 'Output'): Caption for the output slot.
- `pending-label` (string, default 'Pending'): Status text for a call waiting to run.
- `retry-label` (string, default 'Retry'): Visible and accessible label for the built-in retry control.
- `retryable` (boolean, default false): Offer the built-in Retry button when the call fails.
- `running-label` (string, default 'Running'): Status text for a call in progress.
- `status` ("approval" | "done" | "failed" | "pending" | "running", default 'pending'): Lifecycle status. Unknown values display Pending.
- `title` (string | undefined): Optional human-readable label displayed beside the identifier.

## Slots

- `error`: A failure message or a consumer-owned retry control, visible on failed calls.
- `input`: Arguments supplied to the tool. Use ki-code-block for structured text.
- `output`: Result returned by the tool. Use ki-code-block for structured text.

## Parts

- `body`: Content disclosed by opening the call.
- `disclosure`: Native details surface.
- `error`: Error section for failed calls.
- `input`: Input section with its caption and payload.
- `name`: Monospaced tool identifier.
- `output`: Output section with its caption and payload.
- `payload`: Surface for the input and output content.
- `retry`: Opt-in action button for failed calls.
- `status`: Badge that contains the status text and completed duration.
- `summary`: Native disclosure control and its status row.

## Events

- `ki-tool-retry` (CustomEvent<{ name: string }>): A request to retry this tool call. Bind a declared surface action to handle it.
- `ki-tool-status-change` (CustomEvent<{ name: string; status: string; label: string }>): Once per status transition after initialization. Append one entry to the conversation log.

## Methods

None.

## CSS custom properties

- `--ki-badge-sm-height`: dimension used by the badge component for sm height. Default: `var(--ki-space-7xl)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme. Default: onmars `light-dark(#bb4e2a,#c5735a)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
- `--ki-tool-call-backdrop-filter`: Whole filter behind the call. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-tool-call-bg`: Solid background of the call disclosure. Default: `var(--ki-surface-raised)`.
- `--ki-tool-call-bg-image`: Optional image over the solid background. Default: `var(--ki-surface-image-none)`.
- `--ki-tool-call-border`: Border ink around the call. Default: `var(--ki-outline-low-em)`.
- `--ki-tool-call-border-width`: Width of the disclosure frame. Default: `var(--ki-spacing-action-hairline)`.
- `--ki-tool-call-caption-size`: Size of captions and the tool identifier. Default: `var(--ki-typography-size-caption-2)`.
- `--ki-tool-call-code-bg`: Background for input and output payloads. Default: `var(--ki-surface-s2)`.
- `--ki-tool-call-code-fg`: Plain text ink on the payload surface. Default: `var(--ki-text-high-em)`.
- `--ki-tool-call-code-radius`: Corners of the plain payload surface. Default: `var(--ki-radius-component-sm)`.
- `--ki-tool-call-fg`: Text ink on the call surface. Default: `var(--ki-text-high-em)`.
- `--ki-tool-call-font-size`: Body text size. Default: `var(--ki-typography-size-body-1)`.
- `--ki-tool-call-gap`: Gap between summary items and body sections. Default: `var(--ki-layout-spacing-md)`.
- `--ki-tool-call-icon`: Ink of the decorative icons. Default: `var(--ki-text-med-em)`.
- `--ki-tool-call-icon-size`: Size of the wrench and chevron. Default: `var(--ki-layout-spacing-lg)`.
- `--ki-tool-call-inline-gap`: Gap between status items and after each caption. Default: `var(--ki-layout-spacing-xs)`.
- `--ki-tool-call-line-height`: Body text line height. Default: `var(--ki-typography-line-height-body-1)`.
- `--ki-tool-call-mono-family`: Typeface of the tool identifier. Default: `var(--ki-typography-family-mono)`.
- `--ki-tool-call-padding`: Horizontal inset and space after the body. Default: `var(--ki-layout-spacing-xl)`.
- `--ki-tool-call-radius`: Corners of the disclosure surface. Default: `var(--ki-radius-component-lg)`.
- `--ki-tool-call-transition-duration`: Duration of the disclosure chevron rotation. Default: `var(--ki-motion-duration-fast)`.
- `--ki-tool-call-transition-easing`: Easing of the disclosure chevron rotation. Default: `var(--ki-motion-easing-standard)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
