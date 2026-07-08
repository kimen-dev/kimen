import { defineCustomElement as defineRadio } from '../dist/components/ki-radio.js';
import { defineCustomElement as defineRadioGroup } from '../dist/components/ki-radio-group.js';

export function defineKiRadioGroupComposite() {
  defineRadioGroup();
  defineRadio();
}
