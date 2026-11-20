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
