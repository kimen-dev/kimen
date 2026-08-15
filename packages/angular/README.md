# @kimen/angular

Generated Angular bindings for the Kimen `ki-*` web components (spec 034):
every published component as a standalone, typed Angular component with
outputs for `ki-*` events, plus **ControlValueAccessor directives** wiring
the form components into template-driven and reactive forms over their
re-dispatched native `input`/`change` events.

```ts
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { KiButton, KiCheckbox, KiInput, BooleanValueAccessor, TextValueAccessor } from '@kimen/angular';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule, KiButton, KiCheckbox, KiInput, BooleanValueAccessor, TextValueAccessor],
  template: `
    <ki-input label="Name" [formControl]="name"></ki-input>
    <ki-checkbox [formControl]="notify">Email notifications</ki-checkbox>
    <ki-button variant="primary" (click)="save()">Save</ki-button>
  `,
})
export class SettingsComponent {
  name = new FormControl('');
  notify = new FormControl(false, { nonNullable: true });
}
```

- **Value accessors**: `TextValueAccessor` (`ki-input`, `ki-textarea` —
  `value` on `input`), `BooleanValueAccessor` (`ki-checkbox`, `ki-switch`
  — `checked` on `change`), `SelectValueAccessor` (`ki-select`,
  `ki-radio-group` — `value` on `change`). Import them alongside the
  components they bind.
- **Peers**: `@angular/core` and `@angular/forms` `^22` (the library ships
  partial-Ivy Angular Package Format built on Angular 22).
- **Zoneless note**: the generated components are OnPush; Stencil events
  arrive outside any scheduler — in zoneless apps drive updates with
  signals or `markForCheck` in handlers.
- **Client-side only**: SSR/DSD support is a deferred bet of the
  repository.
- Generated from the same source of truth as every other Kimen artifact
  and drift-gated in CI — never hand-edited (constitution Art. I).
  Components register their custom element on first render.

Theming stays at the token layer: see the
[`@kimen/tokens` README](../tokens/README.md).
