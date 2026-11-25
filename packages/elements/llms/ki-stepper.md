# ki-stepper

> An ordered, responsive view of progress through named steps.

## When to use

Show the current place in onboarding, checkout or a wizard.
Provide a label and direct ki-step children in task order.

## When not to use

A percentage or indeterminate task, a carousel position,
or navigation among peer views. The task owner updates step states.

## Examples

# Stepper examples

## Setup wizard

```html
<ki-stepper label="Setup progress">
  <ki-step state="done" href="/setup/account">Account</ki-step>
  <ki-step state="done">Workspace</ki-step>
  <ki-step state="current">Invite team</ki-step>
  <ki-step>Review</ki-step>
</ki-stepper>
```

At under 22rem of available inline size, the horizontal stepper shows
**Step 3 of 4**. Activate the summary to open the ordered list and return
to the Account step.

## Vertical setup guide

```html
<ki-stepper label="Publish a surface" orientation="vertical">
  <ki-step state="done">Connect the repository</ki-step>
  <ki-step state="current">Choose a theme</ki-step>
  <ki-step state="error" description="Check the repository permissions.">Run checks</ki-step>
  <ki-step description="Publish when the checks pass.">Publish</ki-step>
</ki-stepper>
```

## Localized status and summary

```html
<ki-stepper
  label="Avance de la configuración"
  done-label="Completado"
  current-label="Actual"
  upcoming-label="Sin empezar"
  error-label="Error"
  summary-label="Paso {current} de {total}"
  count-label="Pasos ({total})"
>
  <ki-step state="done">Cuenta</ki-step>
  <ki-step state="current">Equipo</ki-step>
  <ki-step>Revisión</ki-step>
</ki-stepper>
```

## Token stylesheets

- `@kimen/tokens/css`: every token, once per page. The default.
- `@kimen/tokens/css/core` once per page and `@kimen/tokens/css/ki-stepper`: the light option, only the tokens ki-stepper needs, including those of the components it renders. Load the sheet of every ki-* tag the page uses.

## Attributes

- `count-label` (string | undefined, default 'Steps ({total})'): Compact disclosure text without a current step. Include {total}.
- `current-label` (string | undefined, default 'Current'): Localized text for the current step.
- `done-label` (string | undefined, default 'Completed'): Localized text for a completed step.
- `error-label` (string | undefined, default 'Error'): Localized text for a step that has an error.
- `label` (string, required): Accessible name of the list. Use a localized description of the task.
- `orientation` ("horizontal" | "vertical", default 'horizontal'): Use vertical for a stacked list. Horizontal layout compacts below 22rem.
- `summary-label` (string | undefined, default 'Step {current} of {total}'): Compact disclosure text. Place {current} and {total} in the local order.
- `upcoming-label` (string | undefined, default 'Not started'): Localized text for an upcoming step.

## Slots

- (default): Direct ki-step children in task order. The stepper assigns each child to its row automatically.

## Parts

- `connector`: The decorative line leading to the next step.
- `description`: Optional supporting text below the label.
- `list`: The ordered list.
- `marker`: The decorative step number or state glyph.
- `step`: A list item in the sequence.
- `summary`: The compact disclosure button.
- `title`: The label, rendered as a link when a completed step has a destination.

## Events

None.

## Methods

None.

## CSS custom properties

- `--ki-corner-activity-mark`: Round corners for rings and typing dots.
- `--ki-density-target-min`: The smallest pointer target any density may produce: 24 x 24 CSS px by default and in compact (WCAG 2.5.8 AA), 44 x 44 in touch (WCAG 2.5.5). It floors a shrinking control but never lifts what a control paints: a control painted smaller extends its target to it, invisibly; rows and tabs grow to it (spec 045 A1).
- `--ki-focus-ring-color`: Colour of the keyboard focus ring every focusable component draws: 3:1 or more against the page in every theme and scheme.
- `--ki-focus-ring-offset`: Gap between a focusable component and its keyboard focus ring.
- `--ki-focus-ring-width`: Thickness of the keyboard focus ring every focusable component draws (its outline). One token instead of one per component, so a mode or a theme changes every ring at once.
- `--ki-layout-spacing-7xl`: The 7xl spacing step for a stack or grid gap.
- `--ki-layout-spacing-md`: The md spacing step for a stack or grid gap.
- `--ki-layout-spacing-sm`: The sm spacing step for a stack or grid gap.
- `--ki-layout-spacing-xl`: The xl spacing step for a stack or grid gap.
- `--ki-layout-spacing-xs`: The xs spacing step for a stack or grid gap.
- `--ki-layout-spacing-xxs`: The xxs spacing step for a stack or grid gap.
- `--ki-step-description-bg`: Backing of a step description.
- `--ki-step-description-fg`: Ink of a step description.
- `--ki-stepper-connector`: Decorative connector from a step that is still incomplete.
- `--ki-stepper-connector-done`: Decorative connector from a completed step.
- `--ki-stepper-current-bg`: Fill of the current step marker.
- `--ki-stepper-current-border`: Outline of the current step marker.
- `--ki-stepper-current-fg`: Number ink on the current step marker.
- `--ki-stepper-done-bg`: Fill of a completed step marker.
- `--ki-stepper-done-fg`: Glyph ink on the completed step marker.
- `--ki-stepper-dot-size`: Diameter of the step marker.
- `--ki-stepper-error-bg`: Fill of the step error marker.
- `--ki-stepper-error-border`: Outline of the step error marker.
- `--ki-stepper-error-fg`: Glyph ink of the step error marker.
- `--ki-stepper-glyph-size`: Size of the marker and disclosure glyphs.
- `--ki-stepper-label-bg`: Default backing of a step label.
- `--ki-stepper-label-fg`: Default ink of a step label.
- `--ki-stepper-stroke`: Width of the marker outline and connector.
- `--ki-stepper-summary-bg`: Backing of the compact disclosure.
- `--ki-stepper-summary-fg`: Ink of the compact disclosure.
- `--ki-stepper-upcoming-bg`: Fill of an upcoming step marker.
- `--ki-stepper-upcoming-border`: Outline of an upcoming step marker.
- `--ki-stepper-upcoming-fg`: Number and label ink of an upcoming step.
- `--ki-typography-family-body`: semantic font family for typography family body.
- `--ki-typography-line-height-body-1`: semantic dimension for typography line height body 1.
- `--ki-typography-line-height-caption-2`: semantic dimension for typography line height caption 2.
- `--ki-typography-size-body-1`: semantic dimension for typography size body 1.
- `--ki-typography-size-caption-2`: semantic dimension for typography size caption 2.
- `--ki-typography-weight-body-semibold`: semantic font weight for typography weight body semibold.
