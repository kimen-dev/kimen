import { Component, h, Prop } from '@stencil/core';

/**
 * A declarative data option rendered by its owning `ki-select` or `ki-combobox`.
 *
 * @whenToUse declare one choice inside a `ki-select` or `ki-combobox`; its text is the
 * human-facing label and its `value` is the submitted value.
 * @whenNotToUse `ki-option` standalone, authoring selection
 * on an option, or expecting it to paint its own row.
 *
 * @slot - Text label mirrored by the owning choice field.
 * @slot start - Decorative content shown before the label in a combobox row.
 */
@Component({
  tag: 'ki-option',
  styleUrl: 'ki-option.css',
  shadow: true,
})
export class KiOption {
  /**
   * Submission and selection value for this option. When omitted, the value
   * falls back to the trimmed option text, matching native `<option>` parity.
   * When NOT to use: do not use this as selection state; set `ki-select.value`.
   */
  @Prop({ reflect: true }) value?: string;

  /**
   * Makes this option unavailable. Disabled options cannot be selected, are
   * skipped by keyboard highlight, and are exposed unavailable by the select.
   *
   * @default false
   */
  @Prop({ reflect: true }) disabled = false;

  /** Secondary text shown below the label in a combobox choice row. */
  @Prop({ reflect: true }) description?: string;

  // Deliberately NO componentWillLoad materialization of `value`: writing the
  // label fallback into the reflected `value` prop would turn an implicit value
  // into an explicit attribute that goes stale if the label text later changes.
  // The owning ki-select derives the effective value when it reads the option.

  render() {
    return [<slot key="label" />, <slot key="start" name="start" />];
  }
}
