import { Component, Element, Prop, h } from '@stencil/core';
import {
  normalizeBooleanPresence,
  optionLabelText,
  optionValue,
} from '../ki-select/ki-select.form';

/**
 * A declarative data option rendered by its owning `ki-select`.
 *
 * When to use: declare one choice inside a `ki-select`; its text is the
 * human-facing label and its `value` is the submitted value.
 * When NOT to use: never use `ki-option` standalone, never author selection
 * on an option, and never expect it to paint its own row.
 *
 * @slot - Text label mirrored by the owning select.
 */
@Component({
  tag: 'ki-option',
  styleUrl: 'ki-option.css',
  shadow: true,
})
export class KiOption {
  @Element() private readonly host!: HTMLElement;

  /**
   * Submission and selection value for this option. When omitted, the value
   * falls back to the trimmed option text, matching native `<option>` parity.
   * When NOT to use: do not use this as selection state; set `ki-select.value`.
   */
  @Prop({ reflect: true, mutable: true }) value?: string;

  /**
   * Makes this option unavailable. Disabled options cannot be selected, are
   * skipped by keyboard highlight, and are exposed unavailable by the select.
   *
   * @default false
   */
  @Prop({ reflect: true }) disabled = false;

  componentWillLoad(): void {
    this.value ??= optionValue(undefined, optionLabelText(this.host));
  }

  get optionValue(): string {
    return optionValue(this.value, optionLabelText(this.host));
  }

  get optionDisabled(): boolean {
    return normalizeBooleanPresence(this.host.getAttribute('disabled') ?? this.disabled);
  }

  render() {
    return <slot />;
  }
}
