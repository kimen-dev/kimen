Display 12-hour time for a US English form and keep the value in canonical
24-hour form. The person can type any time from 08:00 through 18:00, including
minutes between the half-hour suggestions.

```html
<ki-time-input
  lang="en-US"
  label="Pickup time"
  name="pickup"
  required
  value="09:30"
  min="08:00"
  max="18:00"
  step="30"
  help-text="Store hours"
  time-zone="America/New_York"
  error-text="Choose a pickup time between 8:00 AM and 6:00 PM."
></ki-time-input>
```

Set the language on a surrounding element to localize the time, and pass
translated labels for the suggestion controls. Touch density increases the
field and suggestion hit areas.

```html
<div lang="es-ES" data-ki-density="touch">
  <ki-time-input
    label="Hora de la cita"
    picker-label="Elige una hora"
    list-label="Horas sugeridas"
    error-text="Introduce una hora válida."
  ></ki-time-input>
</div>
```
