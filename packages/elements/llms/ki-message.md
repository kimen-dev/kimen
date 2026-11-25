# ki-message

> A user message, assistant reply or event.

## When to use

Display an entry in ki-conversation.

## When not to use

Prompt input, page alerts or tool execution.

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
  <ki-avatar slot="avatar" size="xs" initials="AV"></ki-avatar>
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

## Alternative replies

```html
<ki-message branch-index="2" branch-count="3">Choose JSON for a readable copy.</ki-message>
```

Handle `ki-branch-change` to show the requested alternative. Set
`branchIndex` to `event.detail.index` when replacing the reply content.
Set `actions-label` when the reply supplies a toolbar. The Conversation
guide includes the complete Message actions recipe.

## Token stylesheets

- `@kimen/tokens/css`: every token, once per page. The default.
- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-message`: the light option, only the tokens ki-message needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.

## Attributes

- `actions-label` (string | undefined): Names and enables the assistant toolbar.
- `author` (string | undefined): Accessible article name. Defaults by role.
- `branch-count` (number | undefined, default 1): Total replies. Shows a picker for two or more.
- `branch-index` (number | undefined, default 1): One-based reply index. Update after accepting a branch request.
- `branch-status-label` (string | undefined, default 'Response {index} of {count}'): Branch announcement template with {index} and {count}.
- `feedback` ("bad" | "good" | undefined): Good or bad rating. Restore it when switching branches.
- `icon-name` (string | undefined): Decorative event icon. Search is built in. Import other icons before use.
- `message-role` ("assistant" | "event" | "user" | undefined): Trailing user bubble, leading assistant avatar or centered event.
- `next-branch-label` (string | undefined, default 'Next response'): Next branch button label.
- `previous-branch-label` (string | undefined, default 'Previous response'): Previous branch button label.
- `streaming` (boolean, default false): Show a caret and mark the article busy.

## Slots

- (default): Text or formatted content.
- `actions`: App controls. With actions-label, use direct buttons or a layout-only ki-button-group. Mark regenerate and rating buttons with data-message-action.
- `avatar`: Overrides the decorative assistant avatar.

## Parts

- `actions`: Follow-up controls.
- `avatar`: Assistant avatar.
- `branches`: Branch picker and position.
- `caret`: Decorative streaming marker.
- `content`: Body and optional event icon.
- `message`: Named article.

## Events

- `ki-branch-change` (CustomEvent<{ index: number }>): Requests a branch by its one-based index.
- `ki-feedback` (CustomEvent<{ value: KiMessageFeedback }>): Reports the selected rating.
- `ki-regenerate` (CustomEvent<void>): Requests a new reply on Regenerate.

## Methods

None.

## CSS custom properties

- `--ki-button-ghost-neutral-disabled-bg`: color used by the button component for ghost neutral disabled background.
- `--ki-button-ghost-neutral-disabled-border`: color used by the button component for ghost neutral disabled border.
- `--ki-button-ghost-neutral-disabled-fg`: color used by the button component for ghost neutral disabled foreground.
- `--ki-button-ghost-neutral-hover-bg`: color used by the button component for ghost neutral hover background.
- `--ki-button-ghost-neutral-hover-border`: color used by the button component for ghost neutral hover border.
- `--ki-button-ghost-neutral-hover-fg`: color used by the button component for ghost neutral hover foreground.
- `--ki-button-ghost-neutral-rest-bg`: color used by the button component for ghost neutral rest background.
- `--ki-button-ghost-neutral-rest-border`: color used by the button component for ghost neutral rest border.
- `--ki-button-ghost-neutral-rest-fg`: color used by the button component for ghost neutral rest foreground.
- `--ki-button-xs-radius`: dimension used by the button component for xs radius (Button master 8003:300 binds Radius/small-component/xs, the scale a radius mode reassigns).
- `--ki-control-border-width`: Stroke width of the boundary of a compact control.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-icon-button-xs-icon-size`: dimension used by the icon button component for xs icon size (MarsUI Icon/Placeholder_xs 16px — one step above the button xs icon).
- `--ki-icon-button-xs-size`: dimension used by the icon button component for xs box (24px square, Figma Space/7xl).
- `--ki-layout-conversation-avatar-radius`: Round corner radius of the fallback assistant avatar.
- `--ki-layout-conversation-bubble-end-radius`: Smaller radius of the end corner of a user bubble.
- `--ki-layout-conversation-caret-block-size`: Block size of a streaming caret.
- `--ki-layout-conversation-caret-inline-size`: Inline size of a streaming caret.
- `--ki-layout-conversation-user-max-width`: Maximum width of a user bubble relative to the transcript.
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
- `--ki-message-event-fg`: Text and icon ink of a system event on the page surface.
- `--ki-message-padding`: Block and inline padding inside a user bubble, in that order.
- `--ki-message-radius`: Radius of the user bubble corners.
- `--ki-message-user-backdrop-filter`: Complete filter behind the user bubble.
- `--ki-message-user-bg`: Solid background of a user bubble.
- `--ki-message-user-bg-image`: Optional image over the user bubble background.
- `--ki-message-user-fg`: Text ink in a user bubble.
- `--ki-motion-duration-activity-pulse`: Period of an indeterminate typing pulse.
- `--ki-motion-easing-activity-pulse`: Symmetric easing for fluctuations in a typing pulse.
- `--ki-outline-low-em`: semantic color for outline low em.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-body-2`: semantic dimension for typography line height body 2.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2.
- `--ki-typography-size-body-2`: semantic dimension for typography size body 2.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2.
