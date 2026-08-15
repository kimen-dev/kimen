// @spec:034-framework-wrappers
// The generated value accessor against a real FormControl (S6): this
// exercises the accessor CLASS contract — the exact wiring Angular's
// reactive forms perform for a registered ControlValueAccessor (writeValue
// on init, registerOnChange feeding the control) — over a real DOM
// element, plus a structural assertion that the generated @Directive host
// metadata binds the component's re-dispatched native `change` event to
// that handler. Full-TestBed integration remains the documented follow-up
// (research D8); the class + host-metadata pair IS what the wrapper
// generates.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// JIT fallback for partial-compiled Angular libraries under vitest (the
// alternative the Angular error message itself prescribes when no linker
// plugin processes the fesm bundles).
import '@angular/compiler';
import { ElementRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';

import { BooleanValueAccessor } from '../src/directives/boolean-value-accessor';

describe('angular value accessor', () => {
  it('S6 round-trips a ki-checkbox form control through the generated accessor', () => {
    const element = document.createElement('ki-checkbox') as HTMLElement & {
      checked: boolean;
    };
    element.checked = false;
    document.body.appendChild(element);

    const accessor = new BooleanValueAccessor(new ElementRef(element));
    const control = new FormControl(false, { nonNullable: true });

    // The wiring Angular's setUpControl performs for a registered accessor.
    accessor.writeValue(control.value);
    accessor.registerOnChange((value: boolean) => {
      control.setValue(value);
      control.markAsDirty();
    });

    // The generated host metadata routes the component's re-dispatched
    // native change event into handleChangeEvent with the host's checked.
    const source = readFileSync(
      join(__dirname, '../src/directives/boolean-value-accessor.ts'),
      'utf8',
    );
    expect(source).toContain(`'(change)': 'handleChangeEvent($event.target?.["checked"])'`);
    expect(source).toContain("selector: 'ki-checkbox, ki-switch'");

    element.checked = true;
    accessor.handleChangeEvent(element.checked);
    expect(control.value).toBe(true);
    expect(control.dirty).toBe(true);

    control.setValue(false);
    accessor.writeValue(control.value);
    expect(element.checked).toBe(false);

    element.remove();
  });
});
