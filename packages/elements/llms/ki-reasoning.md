# ki-reasoning

> A disclosure for the assistant's progress or plan, with a localized summary.

## When to use

present assistant-supplied steps, progress or a completed plan alongside the answer.

## When not to use

hide the answer or controls the user needs to complete a task. Use a general disclosure for unrelated content.

## Examples

# Using ki-reasoning

## Show a plan while it develops

```html
<ki-reasoning open>
  <ol>
    <li>Check the inputs.</li>
  </ol>
</ki-reasoning>
```

Add subsequent list items as the assistant produces them. The default state is
collapsed. Set `open` to show the steps immediately.

## Show the elapsed time after completion

```html
<ki-reasoning status="done" duration="12000">
  <ol>
    <li>Check the inputs.</li>
    <li>Compare the available outcomes.</li>
  </ol>
</ki-reasoning>
```

The summary reads “Thought for 12 seconds.” Omit `duration` if it is unavailable.

## Localize the summary

```html
<ki-reasoning
  lang="es"
  status="done"
  duration="1000"
  thinking-label="Pensando…"
  done-label="Listo"
  singular-duration-label="Pensó durante {seconds} segundo"
  duration-label="Pensó durante {seconds} segundos"
>
  <ol>
    <li>Revisar los datos de entrada.</li>
  </ol>
</ki-reasoning>
```

## Report disclosure changes in a guarded surface

Declare the action in the surface and reference it on the disclosure. The
renderer binds it to the catalog's `ki-toggle` event.

```json
{
  "version": 1,
  "actions": ["record-plan-toggle"],
  "root": {
    "component": "ki-reasoning",
    "props": { "status": "done", "duration": 12000 },
    "action": "record-plan-toggle",
    "slots": { "": ["Check the inputs and compare the outcomes."] }
  }
}
```

## Custom-elements entry point

```ts
import { defineCustomElement } from '@kimen/elements/ki-reasoning';

defineCustomElement();
```

## Token stylesheets

- `@kimen/tokens/css`: every token, once per page. The default.
- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-reasoning`: the light option, only the tokens ki-reasoning needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.

## Attributes

- `done-label` (string, default 'Thought'): Summary text when done and elapsed time is unavailable.
- `duration` (number | undefined): Optional elapsed milliseconds. Done displays finite, nonnegative values rounded to seconds.
- `duration-label` (string, default 'Thought for {seconds} seconds'): Summary template for zero or multiple elapsed seconds. The {seconds} placeholder receives the rounded time.
- `open` (boolean, default false): Whether the disclosure shows its steps. Native toggles update this reflected property.
- `singular-duration-label` (string, default 'Thought for {seconds} second'): Summary template for one elapsed second. The {seconds} placeholder receives the rounded time.
- `status` ("done" | "thinking", default 'thinking'): Use thinking while steps arrive and done once the assistant finishes.
- `thinking-label` (string, default 'Thinking…'): Summary text while the assistant is thinking.

## Slots

- (default): Supporting content shown when expanded, such as an ordered list of steps supplied by the application.

## Parts

- `body`: The slotted content area with the inline-start rule.
- `summary`: The native disclosure control that shows the current status.

## Events

- `ki-toggle` (CustomEvent<KiReasoningToggleDetail>): Emitted after a native disclosure toggle. Setting open from the application is silent.

## Methods

None.

## CSS custom properties

- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-motion-duration-fast`: Fast interaction transition duration.
- `--ki-motion-easing-standard`: Standard interaction transition easing curve.
- `--ki-reasoning-backdrop-filter`: Complete filter behind the disclosure. None keeps the backdrop clear.
- `--ki-reasoning-bg`: Fill behind the disclosure summary and its steps.
- `--ki-reasoning-bg-image`: Optional image painted over the disclosure fill.
- `--ki-reasoning-body-gap`: Block spacing between the summary and the step content.
- `--ki-reasoning-body-indent`: Inline spacing between the rule and the content.
- `--ki-reasoning-border`: Ink of the decorative rule at the inline start of the steps.
- `--ki-reasoning-border-width`: Width of the steps rule.
- `--ki-reasoning-fg`: Medium-emphasis ink for the disclosure summary and its steps.
- `--ki-reasoning-list-indent`: Inline space for markers on a slotted list.
- `--ki-reasoning-shimmer-duration`: Period of the thinking shimmer.
- `--ki-reasoning-shimmer-easing`: Easing into and out of the thinking highlight.
- `--ki-reasoning-shimmer-fg`: Readable highlight at the midpoint of the thinking shimmer.
- `--ki-reasoning-summary-gap`: Space between the summary text and glyphs and between separate step blocks.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-para`: semantic dimension for typography line height para.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1.
- `--ki-typography-visually-hidden-size`: Nonzero edge for clipped text available to assistive technology.
