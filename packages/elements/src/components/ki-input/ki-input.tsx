import { Component, Element, Prop, Watch, h } from '@stencil/core';
import { type KiInputType, normalizeKiInputType } from './ki-input.form';

let inputIds = 0;

/**
 * A token-styled single-line text field with native input semantics.
 *
 * When to use: collect one line of free text from a person, always with a
 * visible `label`; choose the `type` and `autocomplete` that match the entry
 * purpose.
 * When NOT to use: multiline text, predefined choices, boolean state, numeric
 * stepper entry, or placeholder-only labeling.
 *
 * @slot start - Leading icon or text affix inside the field. Follows writing direction.
 * @slot end - Trailing icon or text affix inside the field. Follows writing direction.
 * @part field - Enclosure wrapper for background, border, radius and focus ring.
 * @part input - Internal native input that owns entry text, caret and selection.
 * @part label - Visible label that provides the accessible name.
 */
@Component({
  tag: 'ki-input',
  styleUrl: 'ki-input.css',
  shadow: { delegatesFocus: true },
})
export class KiInput {
  private readonly inputId = `ki-input-${String(++inputIds)}`;
  private input: HTMLInputElement | undefined;

  @Element() private readonly host!: HTMLKiInputElement;

  /**
   * Entry kind with native single-line input semantics. Unknown runtime
   * values fall back to `text`; `number` is not a v1 input kind.
   * When NOT to use: use future numeric controls for locale-aware number entry.
   *
   * @default 'text'
   */
  @Prop({ reflect: true }) type: KiInputType = 'text';

  /**
   * Visible label rendered next to the entry area and used as the accessible
   * name. This is mandatory for valid usage.
   * When NOT to use: never use `placeholder` as a label substitute.
   */
  @Prop({ reflect: true }) label?: string;

  /**
   * Hint shown when the field is empty.
   * When NOT to use: do not use placeholder as the accessible name.
   */
  @Prop({ reflect: true }) placeholder?: string;

  /**
   * Live text value. The attribute declares the initial default; the property
   * is the current value and programmatic assignments are silent.
   * When NOT to use: do not observe user edits by polling; listen for `input`
   * and `change`.
   *
   * @default ''
   */
  @Prop({ mutable: true }) value = '';

  /**
   * Form-data key for the submitted value.
   * When NOT to use: omit when the field must not contribute named form data.
   */
  @Prop({ reflect: true }) name?: string;

  /**
   * Marks the field as required for native constraint validation.
   * When NOT to use: do not use required on optional fields.
   *
   * @default false
   */
  @Prop({ reflect: true }) required = false;

  /**
   * Makes the value focusable and selectable while rejecting edits.
   * When NOT to use: use `disabled` when the value must be unavailable and
   * excluded from forms.
   *
   * @default false
   */
  @Prop({ reflect: true }) readonly = false;

  /**
   * Prevents editing, removes the field from keyboard reach and exposes the
   * unavailable state through the internal native input.
   * When NOT to use: do not use disabled for readonly reference values.
   *
   * @default false
   */
  @Prop({ reflect: true }) disabled = false;

  /**
   * Native autocomplete detail token forwarded to the internal input.
   * When NOT to use: omit when no autofill entry purpose is known.
   */
  @Prop({ reflect: true }) autocomplete?: string;

  @Watch('value')
  protected valueChanged(): void {
    if (this.input && this.input.value !== this.value) {
      this.input.value = this.value;
    }
  }

  private readonly handleInput = (event: Event): void => {
    this.value = (event.target as HTMLInputElement).value;
  };

  private readonly handleChange = (): void => {
    this.host.dispatchEvent(
      new Event('change', {
        bubbles: true,
        composed: true,
      }),
    );
  };

  render() {
    const type = normalizeKiInputType(this.type);

    return (
      <label part="label" htmlFor={this.inputId}>
        {this.label}
        <div part="field">
          <slot name="start" />
          <input
            ref={(el) => {
              this.input = el;
            }}
            id={this.inputId}
            part="input"
            type={type}
            value={this.value}
            required={this.required}
            readOnly={this.readonly}
            disabled={this.disabled}
            {...(this.name !== undefined ? { name: this.name } : {})}
            {...(this.placeholder !== undefined ? { placeholder: this.placeholder } : {})}
            {...(this.autocomplete !== undefined ? { autocomplete: this.autocomplete } : {})}
            onInput={this.handleInput}
            onChange={this.handleChange}
          />
          <slot name="end" />
        </div>
      </label>
    );
  }
}
