import { Directive, ElementRef, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { ValueAccessor } from './value-accessor';

@Directive({
  /* tslint:disable-next-line:directive-selector */
  selector: 'ki-select, ki-radio-group',
  host: {
    '(change)': 'handleChangeEvent($event.target?.["value"])'
  },
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectValueAccessor),
      multi: true
    }
  ]
})
export class SelectValueAccessor extends ValueAccessor {
  constructor(el: ElementRef) {
    super(el);
  }
}
