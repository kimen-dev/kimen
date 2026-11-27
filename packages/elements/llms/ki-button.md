# ki-button

> A token-styled action button with native button semantics.

## When to use

trigger the single main action of a view, supporting actions
in descending hierarchy, confirming/destructive actions through tone,
persistent actions such as Bold with `toggle`, or with `href` a call to
action that navigates.
While the action a button started is in progress, set `loading` on that
button instead of disabling it.

## When not to use

links in text (ki-link), icon-only actions, form values, or
the progress of a page or region (use ki-progress).

## Examples

A standalone primary action:

```html
<ki-button variant="primary">Save</ki-button>
```

In momentary mode `type` defaults to `submit`. Use `type="button"` for an independent action inside a form.

```html
<form>
  <ki-button type="button">Cancel</ki-button>
  <ki-button variant="primary">Save changes</ki-button>
</form>
```

A call to action that navigates takes `href`: the button renders a native link with the same look. Enter follows it, it never submits its form, and `target="_blank"` without `rel` gets `rel="noreferrer noopener"`.

```html
<ki-button variant="primary" href="/start">Get started</ki-button>
```

Use `toggle` for a persistent action. `selected` sets the starting state and each activation changes `aria-pressed` while keeping the label. Toggle mode acts independently of form submission and reset, regardless of `type`.

```html
<ki-button id="pin" variant="outline" toggle selected>Pin</ki-button>
<script type="module">
  const button = document.getElementById('pin');
  button.addEventListener('ki-change', ({ detail: { selected } }) => {
    console.log('Pinned', selected);
  });
</script>
```

Enabled outline actions use `--ki-button-outline-hover-bg`,
`--ki-button-outline-hover-fg` and `--ki-button-outline-hover-border` on hover.
Unselected filled and quiet toggles use `--ki-button-toggle-unselected-hover-overlay`.
A selected toggle keeps its fill on hover. Use `--ki-button-outline-selected-border`
to set the selected outline edge.

Programmatic writes to `selected` are silent. A parent coordinating several toggles can listen for their bubbling `ki-change` events and update their `selected` values together.

Open a dialog with `command="show-modal"` and its ID in `commandfor`. The
dialog and invoker share a document or shadow root. The command takes
precedence over form submission or reset.

```html
<ki-button commandfor="draft-preview" command="show-modal">Preview draft</ki-button>
<ki-dialog id="draft-preview" heading="Draft preview">
  This draft is visible only to you.
  <ki-button slot="footer" commandfor="draft-preview" command="close">Done</ki-button>
</ki-dialog>
```

Programmatic creation after registration; string attributes and properties are interchangeable:

```ts
import { defineCustomElement } from '@kimen/elements/ki-button';

defineCustomElement();

const saveButton = document.createElement('ki-button');
saveButton.setAttribute('type', 'button');
saveButton.textContent = 'Save';
document.body.append(saveButton);
```

The leading and trailing slots use `--ki-button-{size}-icon-size` for their
box and for a directly slotted `ki-icon` glyph. The button token takes
precedence over an explicit `size` on that icon.

While the action a button started is in progress, set `loading` on it instead of `disabled`: it keeps its width and focus, ignores further activation (it neither submits nor resets its form), draws a spinner in place of its label and announces `loading-label` (default "Loading") as a polite status message. Clear it when the action ends:

```html
<form id="profile">
  <ki-button variant="primary" loading-label="Saving">Save changes</ki-button>
</form>
<script type="module">
  const form = document.getElementById('profile');
  const save = form.querySelector('ki-button');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    save.loading = true;
    try {
      await fetch('/profile', { method: 'POST', body: new FormData(form) });
    } finally {
      save.loading = false;
    }
  });
</script>
```

A button or link fits its content by default. Set `--ki-button-inline-size`
to `100%` to fill the containing block. The alignment tokens start-align the
content and label lines of this two-line choice.

```html
<style>
  .choice {
    --ki-button-inline-size: 100%;
    --ki-button-justify-content: start;
    --ki-button-text-align: start;
  }
</style>
<ki-button class="choice" variant="outline" toggle>
  <strong>Starter</strong><br />One agent, one repository
</ki-button>
```

## Token stylesheets

- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-button`: the default, only the tokens ki-button needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.
- `@kimen/tokens/css`: every token, once per page, instead of the core and the tag sheets. The simple alternative.

[Boolean attributes](boolean-attributes.md).

## Attributes

- `command` ("close" | "request-close" | "show-modal" | undefined): Dialog action to run for `commandfor`. Use `show-modal` to open, `close` for direct dismissal, or `request-close` for guarded dismissal. Choose a command for local dialog control and omit it for other actions.
- `commandfor` (string | undefined): ID of a ki-dialog in the same document or shadow tree as this button. Set it together with `command` to connect a dialog declaratively.
- `disabled` (boolean, default false): Prevents activation, removes the button from keyboard reach, and exposes the unavailable state through the internal native button. Wins over `loading` when both are set. When NOT to use: do not use disabled for pending/loading semantics; use `loading`.
- `download` (string | undefined): File name to download `href` as; empty lets the browser choose.
- `href` (string | undefined, URL): Destination URL. Nonblank, it renders a native link with the same look; toggle, form and dialog props are then ignored.
- `loading` (boolean, default false): Pending state of the action this button started (saving, sending). While set, every activation is blocked (pointer, Enter and Space) and the button neither submits nor resets its form, but it stays focusable, in the Tab order and at its width: the label stays laid out, transparent, and a spinner is drawn in its place. The internal native button is exposed with `aria-disabled="true"` and keeps its name, and `loadingLabel` is announced as a polite status message. `disabled`, and a disabled fieldset, win over it. The application sets it when the action starts and clears it when the action ends. When to use: while the work a click on this button started is running, so a second activation cannot repeat it. When NOT to use: for a button the person cannot use yet (use `disabled`), or for the progress of a page or region (use ki-progress).
- `loading-label` (string, default 'Loading'): Text of the polite status message announced while `loading` is set. Override for localization; the default English string is the button's only built-in user-visible text. When to use: provide a localized message whenever the document language is not English, or a more specific one ("Saving"). When NOT to use: do not repeat the button's label here; the person already hears it on focus.
- `name` (string | undefined): Form-data key contributed when this button submits its form. When NOT to use: omit when no submitter value should be sent.
- `rel` (string | undefined): Link relationships for `href`.
- `selected` (boolean, default false): Current press state in toggle mode. Set this to initialize or synchronize the state programmatically without emitting a change.
- `size` ("lg" | "md" | "sm" | "xl" | "xs", default 'md'): Token-backed button size. Every size keeps at least the minimum pointer target; choose the size that matches the density of the surrounding UI. When NOT to use: do not use `ki-button` for icon-only compact controls.
- `target` (string | undefined): Browsing context for `href`; `_blank` alone gets `rel="noreferrer noopener"`.
- `toggle` (boolean, default false): Enables persistent press state for an action such as Bold. The native button exposes `aria-pressed` and each activation switches `selected`. Use the same label in both states. A toggle does not submit or reset a form.
- `tone` ("danger" | "neutral" | "success", default 'neutral'): Semantic intent for the action, independent of hierarchy. Use `success` for confirming actions and `danger` for destructive actions. Toggle palettes are specific to the variant. When NOT to use: do not use tone for visual hierarchy; use `variant`.
- `type` ("button" | "reset" | "submit", default 'submit'): Native form action type: `submit` submits the owning form (running constraint validation and contributing `name`/`value` to the form data), `reset` restores field defaults, and `button` leaves the form alone. Toggle mode and configured dialog commands take precedence over form actions. Cancel a submission from the form's `submit` event (`preventDefault()`); unlike a native button, `preventDefault()` on the `click` event does not cancel it. During submission `event.submitter` is a transient native button carrying this element's `name`/`value`, not the `ki-button` host. When NOT to use: use `button` when the action must never submit a form.
- `value` (string | undefined): Form-data value paired with `name` when this button submits its form. When NOT to use: omit when the default empty submitter value is intended.
- `variant` ("ghost" | "outline" | "primary" | "quaternary" | "secondary" | "tertiary", default 'secondary'): Visual hierarchy for the action. Use filled `primary` for the single main action, outlined `secondary` for supporting actions, `quaternary` for neutral text actions, `ghost` for accent text actions and `outline` for an unfilled action with a visible boundary. When NOT to use: do not use variant to signal success or danger; use `tone` for intent.

## Slots

- (default): Label content. This is the accessible name source.
- `end`: Trailing icon or media in writing direction. Uses the start slot's sizing.
- `start`: Leading icon or media in writing direction. Button tokens size a ki-icon glyph, overriding its size.

## Parts

- `button`: Internal native button, or link with `href`.
- `label`: Label wrapper around the default slot.
- `spinner`: Loading spinner drawn at the center of the button, in the button's foreground ink, rendered only while `loading` is in effect.

## Events

- `ki-change` (CustomEvent<{ selected: boolean }>): Emitted after toggle activation with the new selected state.

## Methods

None.

## Other CSS custom properties

- `--ki-button-backdrop-filter`: Complete backdrop filter for button and icon-button variants; none in onmars v2. Default: `var(--ki-effect-component-backdrop-filter)`.
- `--ki-button-border-width`: dimension used by the button component for border width (MarsUI outline stroke: 1px). Default: onmars `var(--ki-size-border-hairline)`, material3 `0.0625rem`.
- `--ki-button-font-family`: font family used by the button component for font family. Default: `var(--ki-typography-family-body)`.
- `--ki-button-font-weight`: font weight used by the button component for font weight. Default: `var(--ki-typography-weight-body-medium)`.
- `--ki-button-inline-size`: Button and link inline size. Set to 100% to fill the container. Default: `var(--ki-size-layout-fit-content)`.
- `--ki-button-justify-content`: Placement of the button content; start for a card. Default: `center`.
- `--ki-button-label-padding-inline`: dimension used by the button component for the label Text_wrap inline padding (MarsUI 8003:300: 4px each side of the label; the flex gap subtracts the same value so icon-to-text keeps the composite distance). Default: `var(--ki-space-xs)`.
- `--ki-button-lg-font-size`: dimension used by the button component for lg font size. Default: `var(--ki-typography-size-body-2)`.
- `--ki-button-lg-gap`: dimension used by the button component for lg gap. Default: `var(--ki-space-sm)`.
- `--ki-button-lg-height`: dimension used by the button component for lg height. Default: `var(--ki-space-14xl)`.
- `--ki-button-lg-icon-size`: dimension used by the button component for lg icon size. Default: `var(--ki-space-5xl)`.
- `--ki-button-lg-line-height`: dimension used by the button component for lg line height. Default: `var(--ki-typography-line-height-body-2)`.
- `--ki-button-lg-min-target`: dimension used by the button component for lg min target. Default: `var(--ki-space-7xl)`.
- `--ki-button-lg-padding-inline`: dimension used by the button component for lg padding inline. Default: `var(--ki-space-xl)`.
- `--ki-button-lg-radius`: dimension used by the button component for lg radius (Button master 8003:300 binds Radius/small-component/lg, the scale a radius mode reassigns). Default: onmars `var(--ki-radius-component-lg)`, material3 `var(--ki-radius-round)`.
- `--ki-button-lg-spinner-size`: dimension used by the button component for the lg loading spinner box (20px, the lg icon size; spec 046 D5: no Figma source, the spinner takes the place of the content). Default: `var(--ki-space-5xl)`.
- `--ki-button-md-font-size`: dimension used by the button component for md font size. Default: `var(--ki-typography-size-body-1)`.
- `--ki-button-md-gap`: dimension used by the button component for md gap (MarsUI effective icon-to-text gap 6px). Default: `var(--ki-space-sm)`.
- `--ki-button-md-height`: dimension used by the button component for md height. Default: `var(--ki-space-12xl)`.
- `--ki-button-md-icon-size`: dimension used by the button component for md icon size. Default: `var(--ki-space-4xl)`.
- `--ki-button-md-line-height`: dimension used by the button component for md line height. Default: `var(--ki-typography-line-height-body-1)`.
- `--ki-button-md-min-target`: dimension used by the button component for md min target. Default: `var(--ki-space-7xl)`.
- `--ki-button-md-padding-inline`: dimension used by the button component for md padding inline. Default: `var(--ki-space-lg)`.
- `--ki-button-md-radius`: dimension used by the button component for md radius (Button master 8003:300 binds Radius/small-component/md, the scale a radius mode reassigns). Default: onmars `var(--ki-radius-component-md)`, material3 `var(--ki-radius-round)`.
- `--ki-button-md-spinner-size`: dimension used by the button component for the md loading spinner box (18px, the md icon size; spec 046 D5: no Figma source, the spinner takes the place of the content). Default: `var(--ki-space-4xl)`.
- `--ki-button-padding-block`: dimension used by the button component for padding block (MarsUI: 4px in every size). Default: `var(--ki-space-xs)`.
- `--ki-button-sm-font-size`: dimension used by the button component for sm font size. Default: `var(--ki-typography-size-body-1)`.
- `--ki-button-sm-gap`: dimension used by the button component for sm gap (Button master 8003:301: root gap Space/xxs 2px + Text_wrap inline padding Space/xs 4px = 6px icon-to-text). Default: `var(--ki-space-sm)`.
- `--ki-button-sm-height`: dimension used by the button component for sm height. Default: `var(--ki-space-10xl)`.
- `--ki-button-sm-icon-size`: dimension used by the button component for sm icon size. Default: `var(--ki-space-3xl)`.
- `--ki-button-sm-line-height`: dimension used by the button component for sm line height. Default: `var(--ki-typography-line-height-body-1)`.
- `--ki-button-sm-min-target`: dimension used by the button component for sm min target. Default: `var(--ki-space-7xl)`.
- `--ki-button-sm-padding-inline`: dimension used by the button component for sm padding inline. Default: `var(--ki-space-md)`.
- `--ki-button-sm-radius`: dimension used by the button component for sm radius (Button master 8003:300 binds Radius/small-component/sm, the scale a radius mode reassigns). Default: onmars `var(--ki-radius-component-sm)`, material3 `var(--ki-radius-round)`.
- `--ki-button-sm-spinner-size`: dimension used by the button component for the sm loading spinner box (16px, the sm icon size; spec 046 D5: no Figma source, the spinner takes the place of the content). Default: `var(--ki-space-3xl)`.
- `--ki-button-spinner-duration`: duration used by the button and icon button components for one turn of the loading spinner (spec 046 D5: the ki-progress indeterminate period). Applied only under prefers-reduced-motion: no-preference. Default: `1600ms`.
- `--ki-button-spinner-stroke-width`: dimension used by the button and icon button components for the loading spinner stroke (spec 046 D5: the circular ki-progress ring, drawn with a non-scaling stroke of this width). Default: `var(--ki-space-xxs)`.
- `--ki-button-text-align`: Alignment of the label lines. Default: `center`.
- `--ki-button-toggle-quiet-bg`: Background of unselected ghost and quaternary toggle buttons. Default: `var(--ki-surface-transparent)`.
- `--ki-button-toggle-quiet-fg`: Foreground of unselected ghost toggle buttons. Default: `var(--ki-text-high-em)`.
- `--ki-button-toggle-radius`: Rounded rectangle shape for an unselected text toggle button. Default: `var(--ki-radius-component-md)`.
- `--ki-button-toggle-selected-radius`: Pill shape for a selected text toggle button. Default: `var(--ki-radius-round)`.
- `--ki-button-toggle-unselected-bg`: Background of unselected filled toggle buttons. Default: `var(--ki-surface-s2)`.
- `--ki-button-toggle-unselected-fg`: Foreground of unselected filled toggle buttons. Default: `var(--ki-text-high-em)`.
- `--ki-button-toggle-unselected-hover-overlay`: Hover wash for unselected filled and quiet toggles. Default: `var(--ki-surface-hover-overlay-inverse)`.
- `--ki-button-xl-font-size`: dimension used by the button component for xl font size. Default: `var(--ki-typography-size-title-2)`.
- `--ki-button-xl-gap`: dimension used by the button component for xl gap (MarsUI effective icon-to-text gap 8px). Default: `var(--ki-space-md)`.
- `--ki-button-xl-height`: dimension used by the button component for xl height. Default: `var(--ki-space-16xl)`.
- `--ki-button-xl-icon-size`: dimension used by the button component for xl icon size. Default: `var(--ki-space-7xl)`.
- `--ki-button-xl-line-height`: dimension used by the button component for xl line height. Default: `var(--ki-typography-line-height-title-2)`.
- `--ki-button-xl-min-target`: dimension used by the button component for xl min target. Default: `var(--ki-space-7xl)`.
- `--ki-button-xl-padding-inline`: dimension used by the button component for xl padding inline (MarsUI 14px). Default: `var(--ki-space-2xl)`.
- `--ki-button-xl-radius`: dimension used by the button component for xl radius (Button master 8003:300 binds Radius/small-component/xl, the scale a radius mode reassigns). Default: onmars `var(--ki-radius-component-xl)`, material3 `var(--ki-radius-round)`.
- `--ki-button-xl-spinner-size`: dimension used by the button component for the xl loading spinner box (24px, the xl icon size; spec 046 D5: no Figma source, the spinner takes the place of the content). Default: `var(--ki-space-7xl)`.
- `--ki-button-xs-font-size`: dimension used by the button component for xs font size: caption_2, 12px, the smallest size the library ships for informative text (spec 002 amendment A1, issue #321). The Figma Button master draws caption_1, 10px. Default: `var(--ki-typography-size-caption-2)`.
- `--ki-button-xs-gap`: dimension used by the button component for xs gap (MarsUI effective icon-to-text gap 4px). Default: `var(--ki-space-xs)`.
- `--ki-button-xs-height`: dimension used by the button component for xs height. Default: `var(--ki-space-7xl)`.
- `--ki-button-xs-icon-size`: dimension used by the button component for xs icon size (MarsUI 14px). Default: `var(--ki-space-2xl)`.
- `--ki-button-xs-line-height`: dimension used by the button component for xs line height (caption_2 16px, the same height as caption_1). Default: `var(--ki-typography-line-height-caption-2)`.
- `--ki-button-xs-min-target`: dimension used by the button component for xs min target. Default: `var(--ki-space-7xl)`.
- `--ki-button-xs-padding-inline`: dimension used by the button component for xs padding inline. Default: `var(--ki-space-sm)`.
- `--ki-button-xs-radius`: dimension used by the button component for xs radius (Button master 8003:300 binds Radius/small-component/xs, the scale a radius mode reassigns). Default: onmars `var(--ki-radius-component-xs)`, material3 `var(--ki-radius-round)`.
- `--ki-button-xs-spinner-size`: dimension used by the button component for the xs loading spinner box (14px, the xs icon size; spec 046 D5: no Figma source, the spinner takes the place of the content). Default: `var(--ki-space-2xl)`.
- `--ki-density-control-offset`: Added to the block size of every scaled control and row (button, icon button, field, select, textarea, option, list item, tab). Components floor the result at ki.size.target-min. Default: `var(--ki-space-zero)`.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1). Default: `var(--ki-size-target-min)`.
- `--ki-effect-component-no-backdrop-filter`: An unadorned surface applies no backdrop filter. Default: `none`.
- `--ki-elevation-none`: Flat surfaces carry no resting shadow. Default: `0 0 #0000`.
- `--ki-motion-duration-fast`: Fast interaction transition duration. Default: onmars `var(--ki-duration-fast)`, material3 `100ms`.
- `--ki-motion-easing-out`: Decelerating interaction transition easing curve. Default: onmars `var(--ki-easing-out)`, material3 `cubic-bezier(0,0,0,1)`.
- `--ki-outline-none`: semantic color for outline none. Default: `light-dark(var(--ki-color-transparent-white),var(--ki-color-transparent-black))`.
- `--ki-surface-image-none`: An unadorned surface has no background image. Default: `none`.

## CSS custom properties by variant and state

| Variant | Tone | State | Token | Default | Description |
| --- | --- | --- | --- | --- | --- |
| — | — | focus | `--ki-button-focus-ring-color` | `var(--ki-focus-ring-color)` | color used by the button component for focus ring color. |
| — | — | focus | `--ki-button-focus-ring-offset` | `var(--ki-focus-ring-offset)` | dimension used by the button component for focus ring offset. |
| — | — | focus | `--ki-button-focus-ring-shadow` | `var(--ki-focus-primary)` | shadow used by the button component for the focus ring glow (MarsUI Focus/primary: 3px spread ring). |
| — | — | focus | `--ki-button-focus-ring-width` | `var(--ki-focus-ring-width)` | dimension used by the button component for focus ring width. |
| ghost | — | rest | `--ki-button-ghost-rest-shadow` | `none` | value used by the button component for ghost rest shadow. |
| ghost | — | disabled | `--ki-button-ghost-disabled-shadow` | `none` | value used by the button component for ghost disabled shadow. |
| ghost | — | hover | `--ki-button-ghost-hover-shadow` | `none` | value used by the button component for ghost hover shadow. |
| ghost | — | selected | `--ki-button-ghost-selected-bg` | onmars `var(--ki-text-primary-high-em)`, material3 `var(--ki-surface-primary-high-em)` | Background of the selected ghost button toggle. |
| ghost | — | selected | `--ki-button-ghost-selected-fg` | `var(--ki-text-primary-on-primary)` | Foreground of the selected ghost button toggle. |
| ghost | danger | rest | `--ki-button-ghost-danger-rest-bg` | `var(--ki-transparent-inverse)` | color used by the button component for ghost danger rest background. |
| ghost | danger | rest | `--ki-button-ghost-danger-rest-border` | `var(--ki-outline-none)` | color used by the button component for ghost danger rest border. |
| ghost | danger | rest | `--ki-button-ghost-danger-rest-fg` | `var(--ki-text-danger-high-em)` | color used by the button component for ghost danger rest foreground. |
| ghost | danger | hover | `--ki-button-ghost-danger-hover-bg` | `var(--ki-surface-danger-base-em-alpha)` | color used by the button component for ghost danger hover background. |
| ghost | danger | hover | `--ki-button-ghost-danger-hover-border` | `var(--ki-outline-none)` | color used by the button component for ghost danger hover border. |
| ghost | danger | hover | `--ki-button-ghost-danger-hover-fg` | `var(--ki-text-danger-high-em)` | color used by the button component for ghost danger hover foreground. |
| ghost | neutral | rest | `--ki-button-ghost-neutral-rest-bg` | `var(--ki-transparent-inverse)` | color used by the button component for ghost neutral rest background. |
| ghost | neutral | rest | `--ki-button-ghost-neutral-rest-border` | `var(--ki-outline-none)` | color used by the button component for ghost neutral rest border. |
| ghost | neutral | rest | `--ki-button-ghost-neutral-rest-fg` | `var(--ki-text-primary-high-em)` | color used by the button component for ghost neutral rest foreground. |
| ghost | neutral | disabled | `--ki-button-ghost-neutral-disabled-bg` | `var(--ki-transparent-inverse)` | color used by the button component for ghost neutral disabled background. |
| ghost | neutral | disabled | `--ki-button-ghost-neutral-disabled-border` | `var(--ki-outline-none)` | color used by the button component for ghost neutral disabled border. |
| ghost | neutral | disabled | `--ki-button-ghost-neutral-disabled-fg` | `var(--ki-text-muted)` | color used by the button component for ghost neutral disabled foreground. |
| ghost | neutral | hover | `--ki-button-ghost-neutral-hover-bg` | `var(--ki-surface-primary-base-em-alpha)` | color used by the button component for ghost neutral hover background. |
| ghost | neutral | hover | `--ki-button-ghost-neutral-hover-border` | `var(--ki-outline-none)` | color used by the button component for ghost neutral hover border. |
| ghost | neutral | hover | `--ki-button-ghost-neutral-hover-fg` | `var(--ki-text-primary-high-em)` | color used by the button component for ghost neutral hover foreground. |
| ghost | success | rest | `--ki-button-ghost-success-rest-bg` | `var(--ki-transparent-inverse)` | color used by the button component for ghost success rest background. |
| ghost | success | rest | `--ki-button-ghost-success-rest-border` | `var(--ki-outline-none)` | color used by the button component for ghost success rest border. |
| ghost | success | rest | `--ki-button-ghost-success-rest-fg` | `var(--ki-text-success-high-em)` | color used by the button component for ghost success rest foreground. |
| ghost | success | hover | `--ki-button-ghost-success-hover-bg` | `var(--ki-surface-success-base-em-alpha)` | color used by the button component for ghost success hover background. |
| ghost | success | hover | `--ki-button-ghost-success-hover-border` | `var(--ki-outline-none)` | color used by the button component for ghost success hover border. |
| ghost | success | hover | `--ki-button-ghost-success-hover-fg` | `var(--ki-text-success-high-em)` | color used by the button component for ghost success hover foreground. |
| outline | — | rest | `--ki-button-outline-rest-bg` | `var(--ki-surface-transparent)` | Background of the outline variant at rest. |
| outline | — | rest | `--ki-button-outline-rest-border` | `var(--ki-outline-control)` | Visible outline of the outline variant at rest. |
| outline | — | rest | `--ki-button-outline-rest-fg` | `var(--ki-text-high-em)` | Foreground of the outline variant at rest. |
| outline | — | hover | `--ki-button-outline-hover-bg` | onmars `var(--ki-surface-s1)`, material3 `var(--ki-surface-s2)` | Background of the hovered outline variant. |
| outline | — | hover | `--ki-button-outline-hover-border` | `var(--ki-outline-control-hover)` | Border of the hovered outline variant. |
| outline | — | hover | `--ki-button-outline-hover-fg` | `var(--ki-text-high-em)` | Ink of the hovered outline variant. |
| outline | — | selected | `--ki-button-outline-selected-bg` | `var(--ki-surface-inverse-white)` | Background of the selected outline button toggle. |
| outline | — | selected | `--ki-button-outline-selected-border` | `var(--ki-outline-none)` | Border of the selected outline toggle. |
| outline | — | selected | `--ki-button-outline-selected-fg` | `var(--ki-text-inverse-black)` | Foreground of the selected outline button toggle. |
| primary | — | rest | `--ki-button-primary-rest-border-bottom` | onmars `var(--ki-outline-primary-button-bottom)`, material3 `var(--ki-outline-none)` | color used by the button component for the primary bottom edge (MarsUI Outline/primary_button_bottom; none in onmars v2). |
| primary | — | rest | `--ki-button-primary-rest-shadow` | `var(--ki-effect-component-primary-default-shadow)` | shadow used by the button component for button primary rest shadow (MarsUI Component_effect/primary_default). |
| primary | — | active | `--ki-button-primary-active-overlay` | `var(--ki-state-layer-pressed)` | Pressed state layer for the primary button: primary paints on a dark brand fill, so its wash lightens: the next rung above ki.surface.hover-overlay (White/5 -> White/8 light). Replaces this variant's share of a 45-cell active bg/fg/border matrix whose values were documented mirrors of rest and which WITHDREW the hover overlay rather than deepening it, an appearance legible only to a pointer user who had hovered first. |
| primary | — | disabled | `--ki-button-primary-disabled-shadow` | `none` | value used by the button component for primary disabled shadow. |
| primary | — | hover | `--ki-button-primary-hover-overlay` | onmars `var(--ki-surface-hover-overlay)`, material3 `var(--ki-state-layer-hover)` | color used by the button component for the primary hover overlay layer (MarsUI hover overlay, White/5). |
| primary | — | hover | `--ki-button-primary-hover-shadow` | `var(--ki-effect-component-primary-hover-shadow)` | shadow used by the button component for button primary hover shadow (MarsUI Component_effect/primary_hover). |
| primary | — | selected | `--ki-button-primary-selected-bg` | `var(--ki-surface-primary-med-em)` | Background of the selected primary button toggle. |
| primary | — | selected | `--ki-button-primary-selected-fg` | `var(--ki-text-primary-on-primary)` | Foreground of the selected primary button toggle. |
| primary | danger | rest | `--ki-button-primary-danger-rest-bg` | `var(--ki-surface-danger-high-em)` | color used by the button component for primary danger rest background. Deliberate deviation: Figma specifies the 500 ramp (Surface/danger_med_em #f05149) but white on 500 is ≈3.5:1 < AA 4.5:1; Kimen keeps the 700 ramp (precedent 010 D2, pending founder ratification). |
| primary | danger | rest | `--ki-button-primary-danger-rest-border` | onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for primary danger rest border (MarsUI top/inline edge; none in onmars v2). |
| primary | danger | rest | `--ki-button-primary-danger-rest-fg` | `var(--ki-text-primary-on-danger)` | color used by the button component for primary danger rest foreground. |
| primary | danger | hover | `--ki-button-primary-danger-hover-bg` | `var(--ki-surface-danger-high-em)` | color used by the button component for primary danger hover background (MarsUI: rest fill; hover lightening comes from the hover overlay). |
| primary | danger | hover | `--ki-button-primary-danger-hover-border` | onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for primary danger hover border (MarsUI top/inline edge; none in onmars v2). |
| primary | danger | hover | `--ki-button-primary-danger-hover-fg` | `var(--ki-text-primary-on-danger)` | color used by the button component for primary danger hover foreground. |
| primary | neutral | rest | `--ki-button-primary-neutral-rest-bg` | `var(--ki-surface-primary-med-em)` | color used by the button component for primary neutral rest background (MarsUI Surface/primary_med_em, brand 500). |
| primary | neutral | rest | `--ki-button-primary-neutral-rest-border` | onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for primary neutral rest border (MarsUI top/inline edge; none in onmars v2). |
| primary | neutral | rest | `--ki-button-primary-neutral-rest-fg` | `var(--ki-text-primary-on-primary)` | color used by the button component for primary neutral rest foreground. |
| primary | neutral | disabled | `--ki-button-primary-neutral-disabled-bg` | `var(--ki-surface-disabled-low-em)` | color used by the button component for primary neutral disabled background. Deliberate deviation: Figma disabled is Surface/disabled_base_em gray.100 with gray.400 text (≈1.4:1); Kimen keeps gray.200 for contrast (precedent 010 D2, pending founder ratification). |
| primary | neutral | disabled | `--ki-button-primary-neutral-disabled-border` | `var(--ki-outline-none)` | color used by the button component for primary neutral disabled border. |
| primary | neutral | disabled | `--ki-button-primary-neutral-disabled-fg` | `var(--ki-text-muted)` | color used by the button component for primary neutral disabled foreground. Deliberate deviation: Figma disabled text is text/base_em gray.400 (≈1.4:1 on gray.100); Kimen keeps text.muted gray.700 for readable disabled text (precedent 010 D2, pending founder ratification). |
| primary | neutral | hover | `--ki-button-primary-neutral-hover-bg` | onmars `var(--ki-surface-primary-med-em-hover)`, material3 `var(--ki-surface-primary-med-em)` | color used by the button component for primary neutral hover background (MarsUI: rest fill; hover lightening comes from the hover overlay). |
| primary | neutral | hover | `--ki-button-primary-neutral-hover-border` | onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for primary neutral hover border (MarsUI top/inline edge; none in onmars v2). |
| primary | neutral | hover | `--ki-button-primary-neutral-hover-fg` | `var(--ki-text-primary-on-primary)` | color used by the button component for primary neutral hover foreground. |
| primary | success | rest | `--ki-button-primary-success-rest-bg` | `var(--ki-surface-success-high-em)` | color used by the button component for primary success rest background. Deliberate deviation: Figma specifies the 500 ramp (Surface/success_med_em #409b3f) but white on 500 is ≈3.5:1 < AA 4.5:1; Kimen keeps the 700 ramp (precedent 010 D2, pending founder ratification). |
| primary | success | rest | `--ki-button-primary-success-rest-border` | onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for primary success rest border (MarsUI top/inline edge; none in onmars v2). |
| primary | success | rest | `--ki-button-primary-success-rest-fg` | `var(--ki-text-primary-on-success)` | color used by the button component for primary success rest foreground. |
| primary | success | hover | `--ki-button-primary-success-hover-bg` | `var(--ki-surface-success-high-em)` | color used by the button component for primary success hover background (MarsUI: rest fill; hover lightening comes from the hover overlay). |
| primary | success | hover | `--ki-button-primary-success-hover-border` | onmars `var(--ki-outline-primary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for primary success hover border (MarsUI top/inline edge; none in onmars v2). |
| primary | success | hover | `--ki-button-primary-success-hover-fg` | `var(--ki-text-primary-on-success)` | color used by the button component for primary success hover foreground. |
| quaternary | — | rest | `--ki-button-quaternary-rest-shadow` | `none` | value used by the button component for quaternary rest shadow. |
| quaternary | — | disabled | `--ki-button-quaternary-disabled-shadow` | `none` | value used by the button component for quaternary disabled shadow. |
| quaternary | — | hover | `--ki-button-quaternary-hover-shadow` | `none` | value used by the button component for quaternary hover shadow. |
| quaternary | — | selected | `--ki-button-quaternary-selected-bg` | `var(--ki-surface-primary-high-em)` | Background of the selected quaternary button toggle. |
| quaternary | — | selected | `--ki-button-quaternary-selected-fg` | `var(--ki-text-primary-on-primary)` | Foreground of the selected quaternary button toggle. |
| quaternary | danger | rest | `--ki-button-quaternary-danger-rest-bg` | `var(--ki-transparent-inverse)` | color used by the button component for quaternary danger rest background. |
| quaternary | danger | rest | `--ki-button-quaternary-danger-rest-border` | onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-danger-med-em)` | color used by the button component for quaternary danger rest border (MarsUI quaternary is borderless in every state). |
| quaternary | danger | rest | `--ki-button-quaternary-danger-rest-fg` | `var(--ki-text-danger-high-em)` | color used by the button component for quaternary danger rest foreground. |
| quaternary | danger | hover | `--ki-button-quaternary-danger-hover-bg` | `var(--ki-surface-danger-base-em-alpha)` | color used by the button component for quaternary danger hover background. |
| quaternary | danger | hover | `--ki-button-quaternary-danger-hover-border` | onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-danger-high-em)` | color used by the button component for quaternary danger hover border (MarsUI quaternary is borderless in every state). |
| quaternary | danger | hover | `--ki-button-quaternary-danger-hover-fg` | `var(--ki-text-danger-high-em)` | color used by the button component for quaternary danger hover foreground. |
| quaternary | neutral | rest | `--ki-button-quaternary-neutral-rest-bg` | `var(--ki-transparent-inverse)` | color used by the button component for quaternary neutral rest background. |
| quaternary | neutral | rest | `--ki-button-quaternary-neutral-rest-border` | onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-primary-med-em)` | color used by the button component for quaternary neutral rest border (MarsUI quaternary is borderless in every state). |
| quaternary | neutral | rest | `--ki-button-quaternary-neutral-rest-fg` | onmars `var(--ki-text-supporting)`, material3 `var(--ki-text-primary-high-em)` | color used by the button component for quaternary neutral rest foreground (MarsUI quaternary label text/med_em gray; never the accent). |
| quaternary | neutral | disabled | `--ki-button-quaternary-neutral-disabled-bg` | `var(--ki-transparent-inverse)` | color used by the button component for quaternary neutral disabled background. |
| quaternary | neutral | disabled | `--ki-button-quaternary-neutral-disabled-border` | onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-low-em)` | color used by the button component for quaternary neutral disabled border (MarsUI quaternary is borderless in every state). |
| quaternary | neutral | disabled | `--ki-button-quaternary-neutral-disabled-fg` | onmars `var(--ki-text-base-em)`, material3 `var(--ki-text-muted)` | color used by the button component for quaternary neutral disabled foreground: the disabled ink of every field and selection control (Text/base_em). quaternary has no fill or border, so its ink alone shows the state; ki.text.muted equals its resting ki.text.med-em in onmars. |
| quaternary | neutral | hover | `--ki-button-quaternary-neutral-hover-bg` | onmars `var(--ki-surface-hover-overlay-inverse)`, material3 `var(--ki-surface-primary-base-em-alpha)` | color used by the button component for quaternary neutral hover background (MarsUI hover mechanism: hover-overlay-inverse Black/3 wash over the transparent rest fill). |
| quaternary | neutral | hover | `--ki-button-quaternary-neutral-hover-border` | onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-primary-high-em)` | color used by the button component for quaternary neutral hover border (MarsUI quaternary is borderless in every state). |
| quaternary | neutral | hover | `--ki-button-quaternary-neutral-hover-fg` | onmars `var(--ki-text-supporting)`, material3 `var(--ki-text-primary-high-em)` | color used by the button component for quaternary neutral hover foreground (MarsUI quaternary label text/med_em gray; never the accent). |
| quaternary | success | rest | `--ki-button-quaternary-success-rest-bg` | `var(--ki-transparent-inverse)` | color used by the button component for quaternary success rest background. |
| quaternary | success | rest | `--ki-button-quaternary-success-rest-border` | onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-success-med-em)` | color used by the button component for quaternary success rest border (MarsUI quaternary is borderless in every state). |
| quaternary | success | rest | `--ki-button-quaternary-success-rest-fg` | `var(--ki-text-success-high-em)` | color used by the button component for quaternary success rest foreground. |
| quaternary | success | hover | `--ki-button-quaternary-success-hover-bg` | `var(--ki-surface-success-base-em-alpha)` | color used by the button component for quaternary success hover background. |
| quaternary | success | hover | `--ki-button-quaternary-success-hover-border` | onmars `var(--ki-outline-none)`, material3 `var(--ki-outline-success-high-em)` | color used by the button component for quaternary success hover border (MarsUI quaternary is borderless in every state). |
| quaternary | success | hover | `--ki-button-quaternary-success-hover-fg` | `var(--ki-text-success-high-em)` | color used by the button component for quaternary success hover foreground. |
| secondary | — | rest | `--ki-button-secondary-rest-border-bottom` | onmars `var(--ki-outline-secondary-button-bottom)`, material3 `var(--ki-outline-none)` | color used by the button component for the secondary bottom edge (MarsUI Outline/secondary_button_bottom). |
| secondary | — | rest | `--ki-button-secondary-rest-shadow` | `var(--ki-effect-component-secondary-default-shadow)` | shadow used by the button component for secondary rest shadow (MarsUI Component_effect/secondary_default). |
| secondary | — | active | `--ki-button-secondary-active-overlay` | onmars `var(--ki-surface-pressed-overlay-inverse)`, material3 `var(--ki-state-layer-pressed)` | Pressed state layer for the secondary button: secondary paints on a light fill, so its wash darkens: the next rung above ki.surface.hover-overlay-inverse (Black/3 -> Black/5 light). Replaces this variant's share of a 45-cell active bg/fg/border matrix whose values were documented mirrors of rest and which WITHDREW the hover overlay rather than deepening it, an appearance legible only to a pointer user who had hovered first. |
| secondary | — | disabled | `--ki-button-secondary-disabled-shadow` | `none` | value used by the button component for secondary disabled shadow. |
| secondary | — | hover | `--ki-button-secondary-hover-overlay` | onmars `var(--ki-surface-hover-overlay-inverse)`, material3 `var(--ki-state-layer-hover)` | color used by the button component for the secondary hover overlay layer (MarsUI hover overlay inverse, Black/3). |
| secondary | — | hover | `--ki-button-secondary-hover-shadow` | `var(--ki-effect-component-secondary-hover-shadow)` | shadow used by the button component for secondary hover shadow (MarsUI Component_effect/secondary_hover). |
| secondary | — | selected | `--ki-button-secondary-selected-bg` | `var(--ki-surface-secondary-med-em)` | Background of the selected secondary button toggle. |
| secondary | — | selected | `--ki-button-secondary-selected-fg` | `var(--ki-text-primary-on-secondary)` | Foreground of the selected secondary button toggle. |
| secondary | danger | rest | `--ki-button-secondary-danger-rest-bg` | `var(--ki-surface-danger-base-em)` | color used by the button component for secondary danger rest background. |
| secondary | danger | rest | `--ki-button-secondary-danger-rest-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for secondary danger rest border (MarsUI top/inline edge, variant trait). |
| secondary | danger | rest | `--ki-button-secondary-danger-rest-fg` | `var(--ki-text-danger-high-em)` | color used by the button component for secondary danger rest foreground. |
| secondary | danger | hover | `--ki-button-secondary-danger-hover-bg` | `var(--ki-surface-danger-low-em)` | color used by the button component for secondary danger hover background. |
| secondary | danger | hover | `--ki-button-secondary-danger-hover-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for secondary danger hover border (MarsUI top/inline edge, variant trait). |
| secondary | danger | hover | `--ki-button-secondary-danger-hover-fg` | `var(--ki-text-danger-high-em)` | color used by the button component for secondary danger hover foreground. |
| secondary | neutral | rest | `--ki-button-secondary-neutral-rest-bg` | `var(--ki-surface-special-secondary-alpha-base)` | color used by the button component for secondary neutral rest background (MarsUI Surface/special/secondary_alpha_base: neutral, not a brand tint; white in onmars v2). |
| secondary | neutral | rest | `--ki-button-secondary-neutral-rest-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for secondary neutral rest border (MarsUI top/inline edge). |
| secondary | neutral | rest | `--ki-button-secondary-neutral-rest-fg` | `var(--ki-text-high-em)` | color used by the button component for secondary neutral rest foreground (MarsUI text/high_em). |
| secondary | neutral | disabled | `--ki-button-secondary-neutral-disabled-bg` | `var(--ki-surface-disabled-low-em)` | color used by the button component for secondary neutral disabled background. |
| secondary | neutral | disabled | `--ki-button-secondary-neutral-disabled-border` | `var(--ki-outline-none)` | color used by the button component for secondary neutral disabled border. |
| secondary | neutral | disabled | `--ki-button-secondary-neutral-disabled-fg` | `var(--ki-text-muted)` | color used by the button component for secondary neutral disabled foreground. |
| secondary | neutral | hover | `--ki-button-secondary-neutral-hover-bg` | onmars `var(--ki-surface-special-light-s2-dark-s3)`, material3 `var(--ki-surface-special-secondary-alpha-base)` | color used by the button component for secondary neutral hover background (MarsUI: rest fill; hover darkening comes from the hover overlay). |
| secondary | neutral | hover | `--ki-button-secondary-neutral-hover-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for secondary neutral hover border (MarsUI top/inline edge). |
| secondary | neutral | hover | `--ki-button-secondary-neutral-hover-fg` | `var(--ki-text-high-em)` | color used by the button component for secondary neutral hover foreground (MarsUI text/high_em). |
| secondary | success | rest | `--ki-button-secondary-success-rest-bg` | `var(--ki-surface-success-base-em)` | color used by the button component for secondary success rest background. |
| secondary | success | rest | `--ki-button-secondary-success-rest-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for secondary success rest border (MarsUI top/inline edge, variant trait). |
| secondary | success | rest | `--ki-button-secondary-success-rest-fg` | `var(--ki-text-success-high-em)` | color used by the button component for secondary success rest foreground. |
| secondary | success | hover | `--ki-button-secondary-success-hover-bg` | `var(--ki-surface-success-low-em)` | color used by the button component for secondary success hover background. |
| secondary | success | hover | `--ki-button-secondary-success-hover-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for secondary success hover border (MarsUI top/inline edge, variant trait). |
| secondary | success | hover | `--ki-button-secondary-success-hover-fg` | `var(--ki-text-success-high-em)` | color used by the button component for secondary success hover foreground. |
| tertiary | — | rest | `--ki-button-tertiary-rest-border-bottom` | onmars `var(--ki-outline-secondary-button-bottom)`, material3 `var(--ki-outline-none)` | color used by the button component for the tertiary bottom edge (MarsUI Outline/secondary_button_bottom, as secondary). |
| tertiary | — | rest | `--ki-button-tertiary-rest-shadow` | onmars `var(--ki-effect-component-secondary-default-shadow)`, material3 `0px 1px 2px 0px light-dark(var(--ki-color-black-24),var(--ki-color-black-32)),0px 2px 6px 2px light-dark(var(--ki-color-black-8),var(--ki-color-black-24))` | shadow used by the button component for tertiary rest shadow (MarsUI Component_effect/secondary_default — replaces the migrated M2-era stack, which the material3 theme keeps via its own override). |
| tertiary | — | disabled | `--ki-button-tertiary-disabled-shadow` | `none` | value used by the button component for tertiary disabled shadow. |
| tertiary | — | hover | `--ki-button-tertiary-hover-overlay` | onmars `var(--ki-surface-hover-overlay-inverse)`, material3 `var(--ki-transparent-inverse)` | Hover overlay for neutral tertiary buttons, shared with secondary by default. |
| tertiary | — | hover | `--ki-button-tertiary-hover-shadow` | onmars `var(--ki-effect-component-secondary-hover-shadow)`, material3 `0px 1px 3px 0px light-dark(var(--ki-color-black-24),var(--ki-color-black-32)),0px 4px 8px 3px light-dark(var(--ki-color-black-8),var(--ki-color-black-24))` | shadow used by the button component for tertiary hover shadow (MarsUI Component_effect/secondary_hover). |
| tertiary | danger | rest | `--ki-button-tertiary-danger-rest-bg` | onmars `var(--ki-surface-danger-base-em)`, material3 `var(--ki-surface-s0)` | Tertiary alias of the secondary danger rest background. |
| tertiary | danger | rest | `--ki-button-tertiary-danger-rest-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for tertiary danger rest border (MarsUI secondary top/inline edge — tertiary carries the secondary_button outline pair). |
| tertiary | danger | rest | `--ki-button-tertiary-danger-rest-fg` | `var(--ki-text-danger-high-em)` | color used by the button component for tertiary danger rest foreground. |
| tertiary | danger | hover | `--ki-button-tertiary-danger-hover-bg` | onmars `var(--ki-surface-danger-low-em)`, material3 `var(--ki-surface-s1)` | Tertiary alias of the secondary danger hover background. |
| tertiary | danger | hover | `--ki-button-tertiary-danger-hover-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for tertiary danger hover border (MarsUI secondary top/inline edge — tertiary carries the secondary_button outline pair). |
| tertiary | danger | hover | `--ki-button-tertiary-danger-hover-fg` | `var(--ki-text-danger-high-em)` | color used by the button component for tertiary danger hover foreground. |
| tertiary | neutral | rest | `--ki-button-tertiary-neutral-rest-bg` | onmars `var(--ki-surface-special-secondary-alpha-base)`, material3 `var(--ki-surface-s0)` | Tertiary alias of the secondary neutral rest background. |
| tertiary | neutral | rest | `--ki-button-tertiary-neutral-rest-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for tertiary neutral rest border (MarsUI secondary top/inline edge — tertiary carries the secondary_button outline pair). |
| tertiary | neutral | rest | `--ki-button-tertiary-neutral-rest-fg` | onmars `var(--ki-text-high-em)`, material3 `var(--ki-text-primary-high-em)` | Tertiary alias of the secondary neutral rest foreground. |
| tertiary | neutral | disabled | `--ki-button-tertiary-neutral-disabled-bg` | `var(--ki-surface-disabled-low-em)` | color used by the button component for tertiary neutral disabled background. |
| tertiary | neutral | disabled | `--ki-button-tertiary-neutral-disabled-border` | `var(--ki-outline-none)` | color used by the button component for tertiary neutral disabled border. |
| tertiary | neutral | disabled | `--ki-button-tertiary-neutral-disabled-fg` | `var(--ki-text-muted)` | color used by the button component for tertiary neutral disabled foreground. |
| tertiary | neutral | hover | `--ki-button-tertiary-neutral-hover-bg` | onmars `var(--ki-surface-special-light-s2-dark-s3)`, material3 `var(--ki-surface-s1)` | Tertiary alias of the secondary neutral hover background. |
| tertiary | neutral | hover | `--ki-button-tertiary-neutral-hover-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for tertiary neutral hover border (MarsUI secondary top/inline edge — tertiary carries the secondary_button outline pair). |
| tertiary | neutral | hover | `--ki-button-tertiary-neutral-hover-fg` | onmars `var(--ki-text-high-em)`, material3 `var(--ki-text-primary-high-em)` | Tertiary alias of the secondary neutral hover foreground. |
| tertiary | success | rest | `--ki-button-tertiary-success-rest-bg` | onmars `var(--ki-surface-success-base-em)`, material3 `var(--ki-surface-s0)` | Tertiary alias of the secondary success rest background. |
| tertiary | success | rest | `--ki-button-tertiary-success-rest-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for tertiary success rest border (MarsUI secondary top/inline edge — tertiary carries the secondary_button outline pair). |
| tertiary | success | rest | `--ki-button-tertiary-success-rest-fg` | `var(--ki-text-success-high-em)` | color used by the button component for tertiary success rest foreground. |
| tertiary | success | hover | `--ki-button-tertiary-success-hover-bg` | onmars `var(--ki-surface-success-low-em)`, material3 `var(--ki-surface-s1)` | Tertiary alias of the secondary success hover background. |
| tertiary | success | hover | `--ki-button-tertiary-success-hover-border` | onmars `var(--ki-outline-secondary-button-top)`, material3 `var(--ki-outline-none)` | color used by the button component for tertiary success hover border (MarsUI secondary top/inline edge — tertiary carries the secondary_button outline pair). |
| tertiary | success | hover | `--ki-button-tertiary-success-hover-fg` | `var(--ki-text-success-high-em)` | color used by the button component for tertiary success hover foreground. |
