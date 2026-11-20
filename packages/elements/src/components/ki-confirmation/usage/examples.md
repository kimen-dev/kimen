# Confirm an assistant action

```html
<ki-confirmation
  id="send-email-prompt"
  heading="Send this email?"
  action="send_email"
  approve-label="Send email"
  deny-label="Keep draft"
  consequence="Recipients will get the message immediately."
  remember
  remember-label="Allow sending email for the rest of this conversation"
>
  <dl>
    <dt>To</dt><dd>Ana Rivera</dd>
    <dt>Subject</dt><dd>Weekly report</dd>
  </dl>
</ki-confirmation>
```

Map the two decisions in trusted host code. This MCP Apps example uses a
ready `SurfaceBridge` whose rendered spec declares `approve-send-email` and
`deny-send-email` in its top-level `actions`. Keep a guarded node's scalar
`action` binding unset because the component declares two events. Its
`props.action` carries the visible tool identifier. A trusted host that
applies an origin allowlist can supply that identifier after rendering, since
guarded spec data under that prop name passes through the URL policy.

```js
const prompt = document.querySelector('#send-email-prompt');

prompt.addEventListener('ki-approve', (event) => {
  if (event.composedPath()[0] !== prompt) return;
  bridge.dispatch('approve-send-email', {
    tool: 'send_email',
    remember: event.detail?.remember === true,
  });
});

prompt.addEventListener('ki-deny', (event) => {
  if (event.composedPath()[0] !== prompt) return;
  bridge.dispatch('deny-send-email', { tool: 'send_email' });
});
```

The host owns execution, deadlines and any conversation permission. Supply
outcome metadata and set the resolved state after recording the decision.

```js
prompt.resolvedBy = 'You';
prompt.resolvedAt = '10:32';
prompt.state = 'approved';
```

Call `await prompt.focusPrompt()` when the person is waiting for the request.
Keep the proposed inputs stable while the person is deciding. Mount a new
element if another request for the same tool replaces a pending one.
