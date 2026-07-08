import { AttachInternals, Component, Element, Listen, Prop, State, Watch, h } from '@stencil/core';
import { normalizeKiInputType } from './ki-input.form';

export type KiInputType = 'text' | 'email' | 'password' | 'url' | 'tel' | 'search';

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
  formAssociated: true,
})
export class KiInput {
  private readonly inputId = `ki-input-${String(++inputIds)}`;
  private input: HTMLInputElement | undefined;

  @Element() private readonly host!: HTMLKiInputElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  @State() private formDisabled = false;

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

  componentDidLoad(): void {
    this.syncFormValue();
    this.syncValidity();
  }

  @Watch('value')
  protected valueChanged(): void {
    if (this.input && this.input.value !== this.value) {
      this.input.value = this.value;
    }
    this.syncFormValue();
    this.syncValidity();
  }

  @Watch('type')
  @Watch('required')
  @Watch('readonly')
  @Watch('disabled')
  protected validityAffectingPropChanged(): void {
    this.syncFormValue();
    requestAnimationFrame(() => {
      this.syncValidity();
    });
  }

  formResetCallback(): void {
    this.value = this.host.getAttribute('value') ?? '';
    this.clearUserInvalid();
    this.syncFormValue();
    requestAnimationFrame(() => {
      this.syncValidity();
    });
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.syncFormValue();
    requestAnimationFrame(() => {
      this.syncValidity();
    });
  }

  private readonly handleInput = (event: Event): void => {
    this.value = (event.target as HTMLInputElement).value;
    if (this.input?.validity.valid) {
      this.clearUserInvalid();
    }
  };

  private readonly handleChange = (): void => {
    if (this.input && !this.input.validity.valid) {
      this.setUserInvalid();
    }
    this.host.dispatchEvent(
      new Event('change', {
        bubbles: true,
        composed: true,
      }),
    );
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (
      event.key !== 'Enter' ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.isComposing
    ) {
      return;
    }
    event.preventDefault();
    this.internals.form?.requestSubmit();
  };

  @Listen('invalid')
  protected handleInvalid(): void {
    this.setUserInvalid();
  }

  private get effectiveDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  private get supportsFormInternals(): boolean {
    return typeof this.internals.setFormValue === 'function';
  }

  private syncFormValue(): void {
    if (!this.supportsFormInternals) {
      return;
    }
    this.internals.setFormValue(this.effectiveDisabled ? null : this.value);
  }

  private syncValidity(): void {
    if (!this.supportsFormInternals) {
      return;
    }
    if (!this.input || this.effectiveDisabled) {
      this.internals.setValidity({});
      return;
    }

    if (this.input.validity.valid) {
      this.internals.setValidity({});
      this.clearUserInvalid();
      return;
    }

    this.internals.setValidity(this.input.validity, this.input.validationMessage, this.input);
  }

  private setUserInvalid(): void {
    this.internals.states.add('user-invalid');
  }

  private clearUserInvalid(): void {
    this.internals.states.delete('user-invalid');
  }

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
            disabled={this.effectiveDisabled}
            {...(this.name !== undefined ? { name: this.name } : {})}
            {...(this.placeholder !== undefined ? { placeholder: this.placeholder } : {})}
            {...(this.autocomplete !== undefined ? { autocomplete: this.autocomplete } : {})}
            onInput={this.handleInput}
            onChange={this.handleChange}
            onKeyDown={this.handleKeyDown}
          />
          <slot name="end" />
        </div>
      </label>
    );
  }
}
