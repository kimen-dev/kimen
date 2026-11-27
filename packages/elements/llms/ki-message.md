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

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-message`: the default, only the tokens ki-message needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

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

- `--ki-button-ghost-neutral-disabled-bg`: color used by the button component for ghost neutral disabled background. Default: `var(--ki-transparent-inverse)`.
- `--ki-button-ghost-neutral-disabled-border`: color used by the button component for ghost neutral disabled border. Default: `var(--ki-outline-none)`.
- `--ki-button-ghost-neutral-disabled-fg`: color used by the button component for ghost neutral disabled foreground. Default: `var(--ki-text-muted)`.
- `--ki-button-ghost-neutral-hover-bg`: color used by the button component for ghost neutral hover background. Default: `var(--ki-surface-primary-base-em-alpha)`.
- `--ki-button-ghost-neutral-hover-border`: color used by the button component for ghost neutral hover border. Default: `var(--ki-outline-none)`.
- `--ki-button-ghost-neutral-hover-fg`: color used by the button component for ghost neutral hover foreground. Default: `var(--ki-text-primary-high-em)`.
- `--ki-button-ghost-neutral-rest-bg`: color used by the button component for ghost neutral rest background. Default: `var(--ki-transparent-inverse)`.
- `--ki-button-ghost-neutral-rest-border`: color used by the button component for ghost neutral rest border. Default: `var(--ki-outline-none)`.
- `--ki-button-ghost-neutral-rest-fg`: color used by the button component for ghost neutral rest foreground. Default: `var(--ki-text-primary-high-em)`.
- `--ki-button-xs-radius`: dimension used by the button component for xs radius (Button master 8003:300 binds Radius/small-component/xs, the scale a radius mode reassigns). Default: onmars `var(--ki-radius-component-xs)`, material3 `var(--ki-radius-round)`.
- `--ki-control-border-width`: Stroke width of the boundary of a compact control. Default: `var(--ki-size-border-hairline)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme. Default: onmars `light-dark(#bb4e2a,#c5735a)`, material3 `var(--ki-outline-primary-high-em)`.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring. Default: `var(--ki-space-xxs)`.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once. Default: `var(--ki-space-xxs)`.
- `--ki-icon-button-xs-icon-size`: dimension used by the icon button component for xs icon size (MarsUI Icon/Placeholder_xs 16px — one step above the button xs icon). Default: `var(--ki-space-3xl)`.
- `--ki-icon-button-xs-size`: dimension used by the icon button component for xs box (24px square, Figma Space/7xl). Default: `var(--ki-space-7xl)`.
- `--ki-layout-conversation-avatar-radius`: Round corner radius of the fallback assistant avatar. Default: `var(--ki-radius-round)`.
- `--ki-layout-conversation-bubble-end-radius`: Smaller radius of the end corner of a user bubble. Default: `var(--ki-radius-component-xs)`.
- `--ki-layout-conversation-caret-block-size`: Block size of a streaming caret. Default: `var(--ki-size-conversation-caret-block-size)`.
- `--ki-layout-conversation-caret-inline-size`: Inline size of a streaming caret. Default: `var(--ki-size-conversation-caret-inline-size)`.
- `--ki-layout-conversation-user-max-width`: Maximum width of a user bubble relative to the transcript. Default: `var(--ki-size-conversation-user-max-width)`.
- `--ki-layout-spacing-2xl`: The 2xl spacing step for a stack or grid gap. Default: `var(--ki-space-2xl)`.
- `--ki-layout-spacing-3xl`: The 3xl spacing step for a stack or grid gap. Default: `var(--ki-space-3xl)`.
- `--ki-layout-spacing-9xl`: The 9xl spacing step for a stack or grid gap. Default: `var(--ki-space-9xl)`.
- `--ki-layout-spacing-md`: The md spacing step for a stack or grid gap. Default: `var(--ki-space-md)`.
- `--ki-layout-spacing-xl`: The xl spacing step for a stack or grid gap. Default: `var(--ki-space-xl)`.
- `--ki-layout-spacing-xxs`: The xxs spacing step for a stack or grid gap. Default: `var(--ki-space-xxs)`.
- `--ki-message-assistant-fg`: Text ink of an assistant reply on the page surface. Default: `var(--ki-text-high-em)`.
- `--ki-message-avatar-backdrop-filter`: Complete filter behind the default assistant avatar. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-message-avatar-bg`: Solid primary container of the default assistant avatar. Default: `var(--ki-surface-primary-low-em)`.
- `--ki-message-avatar-bg-image`: Optional image over the default assistant avatar background. Default: `var(--ki-surface-image-none)`.
- `--ki-message-avatar-fg`: Glyph ink inside the default assistant avatar. Default: `var(--ki-text-primary-on-primary-light)`.
- `--ki-message-event-fg`: Text and icon ink of a system event on the page surface. Default: `var(--ki-text-supporting)`.
- `--ki-message-padding`: Block and inline padding inside a user bubble, in that order. Default: `var(--ki-layout-conversation-bubble-padding)`.
- `--ki-message-radius`: Radius of the user bubble corners. Default: `var(--ki-layout-conversation-bubble-radius)`.
- `--ki-message-user-backdrop-filter`: Complete filter behind the user bubble. Default: `var(--ki-effect-component-no-backdrop-filter)`.
- `--ki-message-user-bg`: Solid background of a user bubble. Default: `var(--ki-surface-s2)`.
- `--ki-message-user-bg-image`: Optional image over the user bubble background. Default: `var(--ki-surface-image-none)`.
- `--ki-message-user-fg`: Text ink in a user bubble. Default: `var(--ki-text-high-em)`.
- `--ki-motion-duration-activity-pulse`: Period of an indeterminate typing pulse. Default: `var(--ki-duration-activity-pulse)`.
- `--ki-motion-easing-activity-pulse`: Symmetric easing for fluctuations in a typing pulse. Default: `var(--ki-easing-in-out)`.
- `--ki-outline-low-em`: semantic color for outline low em. Default: onmars `light-dark(rgba(24,22,19,0.1),rgba(255,250,240,0.1))`, material3 `light-dark(#e7e0ec,#36343b)`.
- `--ki-typography-family-body`: semantic font family for typography family body. Default: `var(--ki-font-family-body)`.
- `--ki-typography-line-height-body-2`: semantic dimension for typography line height body 2. Default: `var(--ki-font-line-height-body-2)`.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2. Default: `var(--ki-font-line-height-caption-2)`.
- `--ki-typography-size-body-2`: semantic dimension for typography size body 2. Default: `var(--ki-font-size-body-2)`.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2. Default: `var(--ki-font-size-caption-2)`.
