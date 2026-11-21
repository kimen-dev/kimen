import {
  AttachInternals,
  AttrDeserialize,
  Component,
  Element,
  Listen,
  Prop,
  State,
  Watch,
  h,
} from '@stencil/core';
import '../../../icons/minus.js';
import '../../../icons/plus.js';
import {
  FieldMessage,
  fieldDescribedBy,
  fieldInvalid,
  fieldText,
  fieldValidationMessage,
} from '../../utils/field-message';
import {
  clampNumber,
  createNumberCodec,
  finiteNumber,
  numberBounds,
  readNumberAttribute,
  readNumberFormat,
  stepNumber,
} from './ki-number-input.numeric';

/**
 * A form field for a numeric quantity with optional stepper buttons, bounds,
 * locale-aware formatting, and a visible unit.
 *
 * @whenToUse Collect a number like a quantity, amount, or limit. Provide a
 * visible label and choose bounds and an increment when they have meaning.
 * @whenNotToUse Use ki-input for identifiers, codes, or other text that only
 * looks numeric. Use a range control when relative position is the main cue.
 * @part label - Visible name of the spinbutton.
 * @part field - Enclosure around the editor, unit and stepper buttons.
 * @part input - Native text editor carrying the spinbutton role.
 * @part unit - Visible unit referenced by the spinbutton's description.
 * @part decrease - Button that subtracts one step.
 * @part increase - Button that adds one step.
 * @part help - Help message associated with the spinbutton.
 * @part error - Polite validation feedback associated with the spinbutton.
 * @part status - Polite feedback explaining a value adjustment.
 * @event change - Composed event fired when the person commits an edited or stepped value. Read the host's numeric value. Listen to native input for live edits.
 */
@Component({
  tag: 'ki-number-input',
  styleUrls: ['../../utils/field-message.css', 'ki-number-input.css'],
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class KiNumberInput {
  @Element() private readonly host!: HTMLKiNumberInputElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  /** Visible accessible name. Supply a meaningful label in the page language. */
  @Prop() label!: string;

  /** Context or instructions displayed beneath the field when it has no visible error. */
  @Prop() helpText?: string;

  /** Validation hint to show when the entry fails a constraint. A `custom-error` outranks it. */
  @Prop() errorText?: string;

  /**
   * An error of the application's own, such as a server-side verdict on the
   * submitted number ("Only 40 seats left"). While it holds text the field is
   * invalid, blocks its form, shows the text in place of the help text at
   * once and is announced as invalid. It stops counting at the person's next
   * edit or step of the number, or when the form is reset, so it never blocks
   * the corrected answer. It outranks `error-text`.
   * When to use: report a verdict from a declarative spec, a live update or a
   * framework binding. Remove it when a new attempt starts.
   * When NOT to use: do not use it for `required`, the bounds or unreadable
   * text, which the field reports itself; `error-text` words those. Setting
   * the same text again while the prop still holds it shows nothing: remove
   * it first, then set it again.
   */
  @Prop() customError?: string;

  /** Whether the user must enter a number before submitting the form. */
  @Prop({ reflect: true }) required = false;

  /** Prevents editing and excludes the control from form submission. */
  @Prop({ reflect: true }) disabled = false;

  /** Form-data key for the plain numeric value. */
  @Prop({ reflect: true }) name?: string;

  /**
   * Current numeric value, or undefined when empty or unparseable. Use the
   * attribute for the form reset value. Property assignments are silent.
   */
  @Prop({ mutable: true }) value: number | undefined;

  /** Minimum permitted numeric value. Omit for an unbounded minimum. */
  @Prop() min?: number;

  /** Maximum permitted numeric value. Omit for an unbounded maximum. */
  @Prop() max?: number;

  /** Positive increment for arrows and buttons. Page keys and Shift+arrows move ten increments. */
  @Prop() step = 1;

  /** Shows named decrease and increase buttons inside the field. */
  @Prop() steppers = false;

  /** Visible suffix such as seconds or seats, included in the accessible description. */
  @Prop() unit?: string;

  /**
   * Intl.NumberFormat options for display. In HTML or a catalog spec, supply
   * these options as JSON text. The form value retains its original precision.
   * @attributeType string
   */
  @Prop() get format(): Intl.NumberFormatOptions | undefined {
    return this.formatOptions;
  }

  set format(value: Intl.NumberFormatOptions | string | null | undefined) {
    // The shared direct-elements runtime can deliver raw attribute text to
    // the setter. The lazy runtime uses the deserializer below.
    this.formatOptions = typeof value === 'string' ? readNumberFormat(value) : (value ?? undefined);
  }

  /** Stepper's accessible name. The field label replaces {label}. */
  @Prop() decreaseLabel = 'Decrease {label}';

  /** Stepper's accessible name. The field label replaces {label}. */
  @Prop() increaseLabel = 'Increase {label}';

  /** Polite adjustment message after falling below the minimum. The formatted bound replaces {value}. */
  @Prop() minimumMessage = 'Value adjusted to the minimum of {value}.';

  /** Polite adjustment message after exceeding the maximum. The formatted bound replaces {value}. */
  @Prop() maximumMessage = 'Value adjusted to the maximum of {value}.';

  /** Default validation message for text that cannot be read as a number. */
  @Prop() invalidNumberMessage = 'Enter a number.';

  @State() private formDisabled = false;
  @State() private draft: string | undefined;
  @State() private adjustment = '';
  @State() private showError = false;
  @State() private message = '';

  private input: HTMLInputElement | undefined;
  private editing = false;
  private editorPointerFocus = false;
  // Whether the person's edit or a form reset withdrew `custom-error`.
  private customErrorWithdrawn = false;
  private committedValue: number | undefined;
  private localUpdate = false;
  private formatOptions: Intl.NumberFormatOptions | undefined;
  private formatState?: {
    locale: string | undefined;
    options: Intl.NumberFormatOptions | undefined;
    codec: ReturnType<typeof createNumberCodec>;
  };

  @AttrDeserialize('format')
  protected deserializeFormat(value: string | null): Intl.NumberFormatOptions | undefined {
    return readNumberFormat(value);
  }

  @AttrDeserialize('value')
  protected deserializeValue(value: string | null): number | undefined {
    return readNumberAttribute(value);
  }

  componentWillLoad(): void {
    this.resetEditingValue();
  }

  componentDidLoad(): void {
    this.syncForm();
  }

  componentDidRender(): void {
    // The native editor owns its text and selection while focused.
    if (!this.editing) this.syncEditor();
  }

  @Watch('value')
  protected valueChanged(): void {
    if (this.localUpdate) return;
    this.resetEditingValue();
    this.syncEditor();
    this.syncForm();
  }

  private resetEditingValue(): void {
    this.committedValue = finiteNumber(this.value);
    if (this.value !== this.committedValue) this.setValue(this.committedValue);
    this.draft = undefined;
    this.adjustment = '';
  }

  /**
   * Answers at once whether the field satisfies its constraints and carries
   * no `custom-error`, firing `invalid` when it does not, as a native field
   * does. Custom-elements build only.
   * When NOT to use: use `reportValidity()` instead when the person should
   * see the problem.
   */
  checkValidity(): boolean {
    return this.internals.checkValidity();
  }

  /**
   * Like `checkValidity()`, and when the field is invalid it shows its
   * message and the browser moves focus to it. Custom-elements build only.
   * When NOT to use: do not call it on every keystroke; it interrupts the
   * person.
   */
  reportValidity(): boolean {
    return this.internals.reportValidity();
  }

  @Watch('customError')
  protected customErrorChanged(): void {
    this.customErrorWithdrawn = false;
    this.syncForm();
  }

  @Watch('min')
  @Watch('max')
  @Watch('required')
  @Watch('disabled')
  @Watch('errorText')
  @Watch('invalidNumberMessage')
  protected syncForm(): void {
    const input = this.input;
    if (input) {
      input.required = this.required;
      input.disabled = this.effectiveDisabled;
    }
    const value = finiteNumber(this.value);
    const [min, max] = numberBounds(this.min, this.max);
    const badInput = value === undefined && Boolean(this.draft?.trim());
    const rangeUnderflow = value !== undefined && min !== undefined && value < min;
    const rangeOverflow = value !== undefined && max !== undefined && value > max;
    const valueMissing = this.required && value === undefined && !badInput;
    const customError = this.customErrorWithdrawn ? '' : fieldText(this.customError);
    const invalid =
      badInput || rangeUnderflow || rangeOverflow || valueMissing || customError !== '';
    const disabled = this.effectiveDisabled;
    this.internals.setFormValue(
      disabled || badInput || rangeUnderflow || rangeOverflow ? null : String(value ?? ''),
    );
    if (disabled || !invalid) {
      this.internals.setValidity({});
      this.message = '';
      this.showError = false;
      return;
    }
    const fallback =
      valueMissing && input?.validationMessage
        ? input.validationMessage
        : this.invalidNumberMessage;
    this.message = fieldValidationMessage(customError, this.errorText, fallback) || ' ';
    this.internals.setValidity(
      { badInput, rangeUnderflow, rangeOverflow, valueMissing, customError: customError !== '' },
      this.message,
      input,
    );
    // A custom error shows at once, without a commit or a submission (D2).
    if (customError !== '') {
      this.showError = true;
    }
  }

  formResetCallback(): void {
    this.customErrorWithdrawn = true;
    this.committedValue = readNumberAttribute(this.host.getAttribute('value'));
    this.setValue(this.committedValue);
    this.draft = undefined;
    this.adjustment = '';
    this.showError = false;
    this.syncEditor();
    this.syncForm();
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.syncForm();
  }

  @Listen('invalid')
  protected handleInvalid(): void {
    this.showError = true;
  }

  private get effectiveDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  private get codec() {
    // `lang` can be inherited through the host of a containing shadow root.
    let scope: Element | null = this.host;
    let locale: string | undefined;
    while (scope) {
      const declaration = scope.closest('[lang]');
      if (declaration) {
        locale = declaration.getAttribute('lang') ?? undefined;
        break;
      }
      const root = scope.getRootNode();
      scope = root instanceof ShadowRoot ? root.host : null;
    }
    if (
      this.formatState?.locale !== locale ||
      this.formatState?.options !== this.format ||
      !this.formatState
    ) {
      this.formatState = {
        locale,
        options: this.format,
        codec: createNumberCodec(locale, this.format),
      };
    }
    return this.formatState.codec;
  }

  private get editorText(): string {
    if (this.draft !== undefined) return this.draft;
    const value = finiteNumber(this.value);
    if (value === undefined) return '';
    return this.editing ? this.codec.edit(value) : this.codec.display(value);
  }

  @Watch('format')
  protected syncEditor(): void {
    const input = this.input;
    if (!input) return;
    const text = this.editorText;
    if (input.value !== text) input.value = text;
  }

  private setValue(value: number | undefined): void {
    this.localUpdate = true;
    this.value = value;
    this.localUpdate = false;
  }

  private emit(type: 'input' | 'change'): void {
    this.host.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
  }

  private readonly markEditorPointerFocus = (): void => {
    this.editorPointerFocus = true;
  };

  private readonly clearEditorPointerFocus = (): void => {
    this.editorPointerFocus = false;
  };

  private readonly handleFocus = (event: FocusEvent): void => {
    const input = event.currentTarget as HTMLInputElement;
    const { value, selectionStart, selectionEnd, selectionDirection } = input;
    const hadFullSelection =
      value.length > 0 && selectionStart === 0 && selectionEnd === value.length;
    const selectAll = hadFullSelection || !this.editorPointerFocus;
    this.editorPointerFocus = false;

    this.editing = true;
    this.syncEditor();
    if (selectAll && input.value.length > 0) {
      input.setSelectionRange(
        0,
        input.value.length,
        hadFullSelection ? (selectionDirection ?? undefined) : undefined,
      );
    }
  };

  private readonly handleBlur = (): void => {
    this.editing = false;
    if (!this.effectiveDisabled) this.commit();
  };

  private readonly handleInput = (event: Event): void => {
    if (this.effectiveDisabled) return;
    this.customErrorWithdrawn = true;
    this.draft = (event.target as HTMLInputElement).value;
    this.adjustment = '';
    this.setValue(this.codec.parse(this.draft));
    this.syncForm();
  };

  private commit(): void {
    const value = finiteNumber(this.value);
    const [min, max] = numberBounds(this.min, this.max);
    const clamped = value === undefined ? undefined : clampNumber(value, min, max);
    const adjusted = value !== clamped;
    if (clamped !== undefined && adjusted) {
      const template = min === clamped ? this.minimumMessage : this.maximumMessage;
      this.adjustment = template.replaceAll('{value}', () => this.codec.display(clamped));
      this.setValue(clamped);
    }
    if (clamped !== undefined || !this.draft?.trim()) this.draft = undefined;
    this.syncEditor();
    this.syncForm();
    this.showError = this.message !== '';
    if (adjusted) this.emit('input');
    if (clamped !== this.committedValue) {
      this.committedValue = clamped;
      this.emit('change');
    }
  }

  private applyStep(next: number): void {
    if (this.effectiveDisabled || next === this.value) return;
    this.customErrorWithdrawn = true;
    this.draft = undefined;
    this.adjustment = '';
    this.setValue(next);
    this.committedValue = next;
    this.syncEditor();
    this.syncForm();
    this.emit('input');
    this.emit('change');
  }

  private move(steps: number): void {
    this.applyStep(stepNumber(finiteNumber(this.value), this.step, steps, this.min, this.max));
  }

  private readonly decrease = (): void => {
    this.move(-1);
  };
  private readonly increase = (): void => {
    this.move(1);
  };

  private readonly keepEditorFocus = (event: MouseEvent): void => {
    if (this.editing) event.preventDefault();
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (
      this.effectiveDisabled ||
      event.defaultPrevented ||
      event.isComposing ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    const [min, max] = numberBounds(this.min, this.max);
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown':
        event.preventDefault();
        this.move((event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 10 : 1));
        break;
      case 'PageUp':
      case 'PageDown':
        event.preventDefault();
        this.move(event.key === 'PageUp' ? 10 : -10);
        break;
      case 'Home':
      case 'End': {
        const limit = event.key === 'Home' ? min : max;
        if (limit !== undefined && !event.shiftKey) {
          event.preventDefault();
          this.applyStep(limit);
        }
        break;
      }
      case 'Enter':
        if (!event.shiftKey) {
          this.commit();
          const form = this.internals.form;
          if (form) {
            event.preventDefault();
            const submitter = Array.from(form.elements).find(
              (control): control is HTMLButtonElement | HTMLInputElement =>
                (control instanceof HTMLButtonElement || control instanceof HTMLInputElement) &&
                control.type === 'submit',
            );
            if (!submitter?.matches(':disabled')) {
              form.requestSubmit(submitter ?? undefined);
            }
          }
        }
        break;
    }
  };

  private renderStepper(increase: boolean, disabled: boolean) {
    const template = increase ? this.increaseLabel : this.decreaseLabel;
    const accessibleName = template.replaceAll('{label}', () => fieldText(this.label)).trim();
    return (
      <button
        type="button"
        part={increase ? 'increase' : 'decrease'}
        class="stepper"
        tabIndex={-1}
        aria-label={accessibleName}
        aria-controls="input"
        disabled={disabled}
        onMouseDown={this.keepEditorFocus}
        onClick={increase ? this.increase : this.decrease}
      >
        <ki-icon name={increase ? 'plus' : 'minus'} size="sm" />
      </button>
    );
  }

  render() {
    const unit = fieldText(this.unit);
    const disabled = this.effectiveDisabled;
    const value = finiteNumber(this.value);
    const [min, max] = numberBounds(this.min, this.max);
    const numericValue =
      value !== undefined && value === clampNumber(value, min, max) ? value : undefined;
    const displayValue = numericValue === undefined ? undefined : this.codec.display(numericValue);
    const messages = { help: fieldText(this.helpText), error: this.showError ? this.message : '' };
    const description = [unit && 'unit', fieldDescribedBy(messages), this.adjustment && 'status']
      .filter(Boolean)
      .join(' ');

    return (
      <div class="root">
        <label part="label" htmlFor="input">
          {this.label}
        </label>
        <div part="field" class={{ stepped: this.steppers }}>
          {this.steppers &&
            this.renderStepper(
              false,
              disabled || (min !== undefined && value !== undefined && value <= min),
            )}
          <input
            ref={(input) => {
              this.input = input;
            }}
            part="input"
            id="input"
            type="text"
            inputMode="decimal"
            role="spinbutton"
            required={this.required}
            disabled={disabled}
            aria-required={this.required ? 'true' : undefined}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={numericValue}
            aria-valuetext={
              displayValue === undefined
                ? undefined
                : [displayValue, unit].filter(Boolean).join(' ')
            }
            aria-describedby={description || undefined}
            aria-invalid={fieldInvalid(messages)}
            onMouseDown={this.markEditorPointerFocus}
            onMouseUp={this.clearEditorPointerFocus}
            onMouseLeave={this.clearEditorPointerFocus}
            onFocus={this.handleFocus}
            onBlur={this.handleBlur}
            onInput={this.handleInput}
            onKeyDown={this.handleKeyDown}
          />
          {unit && (
            <span part="unit" id="unit">
              {unit}
            </span>
          )}
          {this.steppers &&
            this.renderStepper(
              true,
              disabled || (max !== undefined && value !== undefined && value >= max),
            )}
        </div>
        <FieldMessage {...messages} />
        <div id="status" part="status" role="status" aria-live="polite" aria-atomic="true">
          {this.adjustment}
        </div>
      </div>
    );
  }
}
