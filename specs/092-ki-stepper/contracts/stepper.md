# Stepper authoring contract

| Element | Property | Default | Behavior |
| --- | --- | --- | --- |
| `ki-stepper` | `label` | Required | Names the ordered list. |
| `ki-stepper` | `orientation` | `horizontal` | Use `vertical` for steps stacked at every width. |
| `ki-stepper` | `done-label`, `current-label`, `upcoming-label`, `error-label` | Completed, Current, Not started, Error | Localize the text that accompanies each state for assistive technology. |
| `ki-stepper` | `summary-label` | Step {current} of {total} | Localize the compact summary with a 1-based current position and total. |
| `ki-stepper` | `count-label` | Steps ({total}) | Localize the compact summary when there is no current position. |
| `ki-step` | `state` | `upcoming` | Accepts `done`, `current`, `upcoming` and `error`. |
| `ki-step` | `href` | Omitted | A completed step with a nonblank value gets a native link. |
| `ki-step` | `description` | Omitted | Visible supporting text adjacent to the step label. |

Place `ki-step` elements directly inside the stepper in order. Each default
slot supplies a visible label. Use text or passive inline markup for step
labels so the stepper can place the label inside a native link. Set the
standard `hidden` attribute to omit a step from the list and total.
