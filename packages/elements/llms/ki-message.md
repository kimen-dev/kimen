# ki-message

> A named chat article styled as a person’s message, assistant reply or event.

## When to use

Display a transcript entry inside ki-conversation. Pass
formatted content through the default slot and set streaming during a reply.

## When not to use

Collect a prompt, announce a page alert, or execute a tool.

## Examples

# ki-message examples

## User and event messages

```html
<ki-message message-role="user">Can I export my settings?</ki-message>
<ki-message message-role="event" icon-name="search">Found the export guide</ki-message>
```

## Assistant reply with an avatar and action

The `author` prop names the article. Put formatted content in the default
slot and application controls in `actions`.

```html
<ki-message message-role="assistant" author="Ava said">
  <span slot="avatar" aria-hidden="true">AV</span>
  <strong>Yes.</strong> Choose <code>JSON</code> from the export menu.
  <details slot="actions">
    <summary>View source</summary>
    Settings export guide
  </details>
</ki-message>
```

## Streaming reply

Add `streaming` while the content is arriving, then remove it when the
complete reply is available. Use a registered Markdown component in the
default slot when your application displays formatted Markdown.

```html
<ki-message message-role="assistant" streaming>Choose the export format</ki-message>
```

## Attributes

- `author` (string | undefined): Full accessible name for this article, such as "Ava said". Override it to identify the speaker or localize the default role-specific name.
- `icon-name` (string | undefined): Decorative event glyph from the ki-icon registry. Search is available directly. Import other per-icon modules before setting their names.
- `message-role` ("assistant" | "event" | "user" | undefined): The speaker or event kind. The user has a trailing bubble, the assistant has a leading avatar, and an event is a centered note.
- `streaming` (boolean, default false): Show the caret and mark the article busy until this message is complete.

## Slots

- (default): Message content, including text or formatted elements.
- `actions`: Follow-up controls supplied by the consumer after the content.
- `avatar`: Optional avatar replacing the assistant’s decorative default.

## Parts

- `actions`: The group containing slotted follow-up controls.
- `avatar`: The leading assistant avatar container.
- `caret`: The decorative marker displayed while a message is streaming.
- `content`: The body of the article, including any event icon.
- `message`: The named article and role-specific layout.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-control-border-width`: Stroke width of the boundary of a compact control.
- `--ki-layout-spacing-2xl`: The 2xl spacing step for a stack or grid gap.
- `--ki-layout-spacing-3xl`: The 3xl spacing step for a stack or grid gap.
- `--ki-layout-spacing-9xl`: The 9xl spacing step for a stack or grid gap.
- `--ki-layout-spacing-md`: The md spacing step for a stack or grid gap.
- `--ki-layout-spacing-xl`: The xl spacing step for a stack or grid gap.
- `--ki-layout-spacing-xxs`: The xxs spacing step for a stack or grid gap.
- `--ki-message-assistant-fg`: Text ink of an assistant reply on the page surface.
- `--ki-message-avatar-backdrop-filter`: Complete filter behind the default assistant avatar.
- `--ki-message-avatar-bg`: Solid primary container of the default assistant avatar.
- `--ki-message-avatar-bg-image`: Optional image over the default assistant avatar background.
- `--ki-message-avatar-fg`: Glyph ink inside the default assistant avatar.
- `--ki-message-avatar-radius`: Corner radius of the default assistant avatar.
- `--ki-message-caret-block-size`: Streaming caret height relative to its message text.
- `--ki-message-caret-duration`: Period of the streaming caret blink when motion is allowed.
- `--ki-message-caret-inline-size`: Streaming caret width relative to its message text.
- `--ki-message-event-fg`: Text and icon ink of a system event on the page surface.
- `--ki-message-padding`: Block and inline padding inside a user bubble, in that order.
- `--ki-message-radius`: Radius of the user bubble corners.
- `--ki-message-user-backdrop-filter`: Complete filter behind the user bubble.
- `--ki-message-user-bg`: Solid background of a user bubble.
- `--ki-message-user-bg-image`: Optional image over the user bubble background.
- `--ki-message-user-end-radius`: Radius of the user bubble at the block-end inline-end corner.
- `--ki-message-user-fg`: Text ink in a user bubble.
- `--ki-message-user-max-width`: Maximum share of the transcript width a user bubble occupies.
- `--ki-motion-easing-activity-pulse`: Symmetric easing for fluctuations in a typing pulse.
- `--ki-outline-low-em`: semantic color for outline low em.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-body-2`: semantic dimension for typography line height body 2.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2.
- `--ki-typography-size-body-2`: semantic dimension for typography size body 2.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2.
