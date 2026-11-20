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
