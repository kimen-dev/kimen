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
  <ki-code-block slot="input" language="json" wrap>{"query": "Forms"}</ki-code-block>
  <ki-code-block slot="output" language="json" wrap>["Field help"]</ki-code-block>
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
- `ki-tool-status-change` (CustomEvent<{
    name: string;
    status: 'pending' | 'running' | 'done' | 'failed' | 'approval';
    label: string;
  }>): Once per status transition after initialization. Append one entry to the conversation log.

## Methods

None.

## CSS custom properties

- `--ki-badge-sm-height`: dimension used by the badge component for sm height.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-tool-call-backdrop-filter`: Whole filter behind the call.
- `--ki-tool-call-bg`: Solid background of the call disclosure.
- `--ki-tool-call-bg-image`: Optional image over the solid background.
- `--ki-tool-call-border`: Border ink around the call.
- `--ki-tool-call-border-width`: Width of the disclosure frame.
- `--ki-tool-call-caption-size`: Size of captions and the tool identifier.
- `--ki-tool-call-code-bg`: Background for input and output payloads.
- `--ki-tool-call-code-fg`: Plain text ink on the payload surface.
- `--ki-tool-call-code-radius`: Corners of the plain payload surface.
- `--ki-tool-call-fg`: Text ink on the call surface.
- `--ki-tool-call-font-size`: Body text size.
- `--ki-tool-call-gap`: Gap between summary items and body sections.
- `--ki-tool-call-icon`: Ink of the decorative icons.
- `--ki-tool-call-icon-size`: Size of the wrench and chevron.
- `--ki-tool-call-inline-gap`: Gap between status items and after each caption.
- `--ki-tool-call-line-height`: Body text line height.
- `--ki-tool-call-mono-family`: Typeface of the tool identifier.
- `--ki-tool-call-padding`: Horizontal inset and space after the body.
- `--ki-tool-call-radius`: Corners of the disclosure surface.
- `--ki-tool-call-transition-duration`: Duration of the disclosure chevron rotation.
- `--ki-tool-call-transition-easing`: Easing of the disclosure chevron rotation.
- `--ki-typography-family-body`: semantic font family for typography family body.
