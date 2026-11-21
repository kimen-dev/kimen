# ki-confirmation

> An inline prompt for a decision about a proposed assistant action.

## When to use

Show the exact action and the details a person needs before
granting permission. A trusted host maps the two decision events to its
declared actions and records the outcome in state.

## When not to use

Report a completed action without a preceding request, or
block the rest of the interface with a modal decision (use ki-dialog).
The displayed action identifier is text and carries no execution authority.

## Examples

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

A guarded UI spec binds each decision to its own action, one per event. A
binding by name alone is rejected, because the component declares two
events. `props.action` carries the visible tool identifier as text, never as
a URL, so the card renders under an origin allowlist too.

```json
{
  "version": 1,
  "actions": ["approve-send-email", "deny-send-email"],
  "root": {
    "component": "ki-confirmation",
    "props": {
      "heading": "Send this email?",
      "action": "send_email",
      "approve-label": "Send email",
      "deny-label": "Keep draft",
      "consequence": "Recipients will get the message immediately."
    },
    "action": { "ki-approve": "approve-send-email", "ki-deny": "deny-send-email" }
  }
}
```

The action data carries the card's props, not the event's detail. When the
decision needs the conversation preference, map the two events in trusted
host code instead. This MCP Apps example uses a ready `SurfaceBridge` whose
rendered spec declares `approve-send-email` and `deny-send-email` in its
top-level `actions` and leaves the card unbound.

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

## Attributes

- `action` (string, required): Tool identifier shown to the person and available for reporting by the host.
- `approve-label` (string, required): Verb or short phrase that describes what approval does, such as "Send email".
- `approved-label` (string, default 'Approved'): Localized outcome text when the host marks the request approved.
- `consequence` (string | undefined): Cost or irreversible effect to read before deciding, displayed as a warning note.
- `denied-label` (string, default 'Denied'): Localized outcome text when the host marks the request denied.
- `deny-label` (string, required): Verb or short phrase for refusal, such as "Keep draft".
- `expired-label` (string, default 'Expired'): Localized outcome text when the host marks the request expired.
- `heading` (string, required): Question naming the proposed action. Provide it before asking for a decision.
- `remember` (boolean, default false): Offers an unchecked preference limited to this action in the current conversation.
- `remember-label` (string, default 'Allow this action for the rest of this conversation'): Localized conversation permission label. Name the specific permission when possible.
- `resolved-at` (string | undefined): Display-ready, localized resolution time from the host, if known.
- `resolved-by` (string | undefined): Display-ready name of the person or service that resolved the request, if known.
- `state` ("approved" | "denied" | "expired" | "pending", default 'pending'): Host-controlled outcome. Resolve after recording a decision or expiring the request.
- `tone` ("danger" | "neutral", default 'neutral'): Use danger when approval is destructive. Unknown values use neutral.

## Slots

- (default): Details the person needs to make the decision. Use readable text or semantic markup such as a description list.

## Parts

- `decisions`: The row of decision controls.
- `group`: The painted, labelled prompt or outcome surface.
- `heading`: The pending question.
- `remember`: The label of the conversation preference checkbox.
- `summary`: The resolved row.

## Events

- `ki-approve` (CustomEvent<{ remember: boolean }>): Explicit approval, with the conversation preference at the time of the decision.
- `ki-deny` (CustomEvent<void>): Explicit refusal of the pending request.

## Methods

- `focusPrompt()` (Promise<boolean>): Moves focus to the pending group and reports success. Call only when the host knows the person was waiting for this request. A focused editor keeps its focus, including editors inside open shadow roots.

## CSS custom properties

- `--ki-confirmation-backdrop-filter`: Complete backdrop effect behind the confirmation.
- `--ki-confirmation-bg`: Solid raised background of the confirmation prompt and summary.
- `--ki-confirmation-bg-image`: Optional image painted over the solid confirmation background.
- `--ki-confirmation-border`: Boundary of the confirmation surface.
- `--ki-confirmation-border-width`: Stroke width of the confirmation boundary.
- `--ki-confirmation-fg`: Text on the confirmation surface.
- `--ki-confirmation-gap`: Block separation between confirmation rows.
- `--ki-confirmation-heading-font-family`: Typeface of the pending question.
- `--ki-confirmation-inline-gap`: Space between text and controls in a row.
- `--ki-confirmation-padding`: Space between the prompt's edge and its content.
- `--ki-confirmation-radius`: Corner radius of the confirmation surface.
- `--ki-density-space-scale`: Multiplies every scaled container padding and gap (card, dialog, alert, list, list item, select listbox, tab panel, tooltip).
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-surface-primary-med-em`: semantic color for surface primary med em.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-family-mono`: semantic font family for typography family mono.
- `--ki-typography-line-height-para`: semantic dimension for typography line height para.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1.
- `--ki-typography-size-body-2`: semantic dimension for typography size body 2.
- `--ki-typography-visually-hidden-size`: Nonzero edge for clipped text available to assistive technology.
