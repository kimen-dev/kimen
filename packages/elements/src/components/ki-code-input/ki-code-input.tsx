import {
  AttachInternals,
  Component,
  Element,
  Event,
  type EventEmitter,
  Listen,
  Prop,
  State,
  Watch,
  h,
} from '@stencil/core';
import {
  FieldMessage,
  fieldDescribedBy,
  fieldInvalid,
  fieldText,
  fieldValidationMessage,
} from '../../utils/field-message';
import { normalizeCode, normalizeCodeInputLength } from './ki-code-input.value';

export type KiCodeInputType = 'numeric' | 'alphanumeric';

export interface KiCodeInputDetail {
  value: string;
}

/**
 * A form-associated verification field with one native text input and a visual box per character.
 *
 * @whenToUse Collect a one-time code of four to eight characters for sign-in or verification.
 * @whenNotToUse Use ki-input for passwords, long codes or free text.
 * @part label - Visible label supplying the native input's accessible name.
 * @part field - Enclosure of the native input and its visual boxes.
 * @part input - Single native text input, responsible for editing and autofill.
 * @part cell - Decorative box for one code character.
 * @part help - Delivery and validity instructions read with the field.
 * @part error - Polite validation message that replaces the instructions.
 */
// The label and native input share their own shadow root. ElementInternals
// associates the host with the enclosing form.
@Component({
  tag: 'ki-code-input',
  styleUrls: ['../../utils/field-message.css', 'ki-code-input.css'],
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class KiCodeInput {
  @Element() private readonly host!: HTMLKiCodeInputElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  @State() private formDisabled = false;
  @State() private shownError = '';
  @State() private selectionStart = 0;
  @State() private selectionEnd = 0;

  private input: HTMLInputElement | undefined;
  private userInvalid = false;
  private customValidity = '';

  /** Visible accessible name. Supply a label in the language of the form. */
  @Prop({ reflect: true }) label!: string;

  /** Instructions saying where the code was sent and how long it is valid. */
  @Prop({ reflect: true }) helpText?: string;

  /** Message for a failing code constraint. Omit to use the browser's message. */
  @Prop({ reflect: true }) errorText?: string;

  /** Key for the single value submitted to the enclosing form. */
  @Prop({ reflect: true }) name?: string;

  /** Require a complete code before submitting. An optional field may be empty. */
  @Prop({ reflect: true }) required = false;

  /** Disable editing, sequential focus and form participation. */
  @Prop({ reflect: true }) disabled = false;

  /**
   * Number of cells and maximum code length. Unsupported lengths fall back to six.
   * @minimum 4
   * @maximum 8
   */
  @Prop({ reflect: true }) length = 6;

  /** Allowed characters and keyboard hint. Alphanumeric mode preserves ASCII letter case. */
  @Prop({ reflect: true }) type: KiCodeInputType = 'numeric';

  /** Medium or small cells. The form region's density adjusts both sizes. */
  @Prop({ reflect: true }) size: 'sm' | 'md' = 'md';

  /**
   * The current code, including leading zeros. Use the attribute to declare
   * the reset value. Programmatic assignments are normalized and silent.
   */
  @Prop({ mutable: true }) value = '';

  /** Emitted when a user edit changes the code. */
  @Event({ eventName: 'ki-input', bubbles: true, composed: true, cancelable: false })
  kiInput!: EventEmitter<KiCodeInputDetail>;

  /** Emitted after the input event when the edited code fills all the cells. */
  @Event({ eventName: 'ki-complete', bubbles: true, composed: true, cancelable: false })
  kiComplete!: EventEmitter<KiCodeInputDetail>;

  /** Native validity flags, available on the custom-elements build. */
  get validity(): ValidityState {
    return this.internals.validity;
  }

  /** The active validation message, available on the custom-elements build. */
  get validationMessage(): string {
    return this.internals.validationMessage;
  }

  /** Whether this field participates in constraint validation on the custom-elements build. */
  get willValidate(): boolean {
    return this.internals.willValidate;
  }

  /** Check validity and dispatch an invalid event when appropriate on the custom-elements build. */
  checkValidity(): boolean {
    return this.internals.checkValidity();
  }

  /** Report validity and focus an invalid field on the custom-elements build. */
  reportValidity(): boolean {
    return this.internals.reportValidity();
  }

  /** Set or clear an application error on the custom-elements build. */
  setCustomValidity(message: string): void {
    this.customValidity = message;
    this.syncValidity();
  }

  componentWillLoad(): void {
    this.value = normalizeCode(this.value, this.type, this.codeLength);
  }

  componentDidLoad(): void {
    this.syncValue();
  }

  @Watch('value')
  protected syncValue(): void {
    const code = normalizeCode(this.value, this.type, this.codeLength);
    if (this.value !== code) {
      this.value = code;
      return;
    }
    // An accepted native edit keeps its existing value and undo history.
    if (this.input && this.input.value !== code) {
      this.input.value = code;
    }
    this.syncSelection();
    this.internals.setFormValue(this.effectiveDisabled ? null : code);
    this.syncValidity();
  }

  @Watch('type')
  @Watch('length')
  @Watch('required')
  @Watch('disabled')
  protected syncConstraints(): void {
    if (this.input) {
      this.input.maxLength = this.codeLength;
      this.input.pattern = this.codePattern;
      this.input.required = this.required;
      this.input.disabled = this.effectiveDisabled;
    }
    this.syncValue();
  }

  @Watch('errorText')
  protected syncValidity(): void {
    const input = this.input;
    if (!input || this.effectiveDisabled) {
      this.internals.setValidity({});
      this.clearError();
      return;
    }

    input.setCustomValidity(this.customValidity);
    if (input.validity.valid) {
      this.internals.setValidity({});
      this.clearError();
      return;
    }

    const message = fieldValidationMessage(
      this.customValidity,
      this.errorText,
      input.validationMessage,
    );
    this.internals.setValidity(input.validity, message, input);
    this.shownError = this.userInvalid ? message : '';
  }

  formResetCallback(): void {
    this.clearError();
    this.value = this.host.getAttribute('value') ?? '';
    this.syncValue();
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.syncConstraints();
  }

  formStateRestoreCallback(
    state: string | File | FormData | null,
    mode: 'restore' | 'autocomplete',
  ): void {
    if (typeof state !== 'string') return;
    if (mode === 'autocomplete') {
      this.applyUserCode(normalizeCode(state, this.type, this.codeLength));
    } else {
      this.value = state;
    }
  }

  @Listen('invalid')
  protected handleInvalid(): void {
    if (this.effectiveDisabled) return;
    this.userInvalid = true;
    this.shownError = this.internals.validationMessage;
  }

  @Listen('beforeinput')
  protected handleBeforeInput(event: InputEvent): void {
    const character = event.data;
    if (
      event.inputType === 'insertText' &&
      !event.isComposing &&
      character?.length === 1 &&
      normalizeCode(character, this.type, this.codeLength) === ''
    ) {
      event.preventDefault();
    }
  }

  private get codeLength(): number {
    return normalizeCodeInputLength(this.length);
  }

  private get codePattern(): string {
    const characters = this.type === 'alphanumeric' ? '[A-Za-z0-9]' : '[0-9]';
    return `${characters}{${String(this.codeLength)}}`;
  }

  private get effectiveDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  private clearError(): void {
    this.userInvalid = false;
    this.shownError = '';
  }

  private readonly syncSelection = (): void => {
    this.selectionStart = this.input?.selectionStart ?? 0;
    this.selectionEnd = this.input?.selectionEnd ?? 0;
  };

  private applyUserCode(code: string): void {
    if (this.effectiveDisabled || code === this.value) return;
    this.value = code;
    const complete = code.length === this.codeLength;
    this.kiInput.emit({ value: code });
    if (complete) {
      this.kiComplete.emit({ value: code });
    }
  }

  private readonly acceptInput = (): void => {
    const input = this.input;
    if (!input || this.effectiveDisabled) return;

    const raw = input.value;
    const code = normalizeCode(raw, this.type, this.codeLength);
    if (raw !== code) {
      const start = normalizeCode(
        raw.slice(0, input.selectionStart ?? 0),
        this.type,
        this.codeLength,
      );
      const end = normalizeCode(raw.slice(0, input.selectionEnd ?? 0), this.type, this.codeLength);
      input.value = code;
      input.setSelectionRange(start.length, end.length);
    }
    this.syncSelection();
    this.applyUserCode(code);
  };

  private readonly handleInput = (event: InputEvent): void => {
    if (!event.isComposing) this.acceptInput();
  };

  private readonly handleChange = (): void => {
    this.acceptInput();
    if (!this.internals.validity.valid) this.handleInvalid();
  };

  private readonly handlePaste = (event: ClipboardEvent): void => {
    const input = this.input;
    const text = event.clipboardData?.getData('text/plain');
    if (!input || !text || this.effectiveDisabled || event.defaultPrevented) return;

    const filtered = normalizeCode(text, this.type, text.length);
    if (text === filtered) return;

    event.preventDefault();
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? start;
    const available = Math.max(0, this.codeLength - (input.value.length - (end - start)));
    const replacement = filtered.slice(0, available);
    if (replacement === '') return;

    // The native clipboard transaction handles plain codes and their undo.
    // A formatted paste inserts the cleaned text into the current selection.
    input.setRangeText(replacement, start, end, 'end');
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        composed: true,
        inputType: 'insertFromPaste',
        data: replacement,
      }),
    );
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const form = this.internals.form;
    if (
      !form ||
      event.key !== 'Enter' ||
      event.defaultPrevented ||
      event.isComposing ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    )
      return;

    // The native input is in shadow DOM. Forward an explicit Enter to the
    // outer form using its submitter, so its value and overrides are preserved.
    event.preventDefault();
    const submitter = Array.from(form.elements).find(
      (element): element is HTMLButtonElement | HTMLInputElement =>
        (element instanceof HTMLButtonElement || element instanceof HTMLInputElement) &&
        element.type === 'submit',
    );
    if (!submitter?.matches(':disabled')) form.requestSubmit(submitter);
  };

  render() {
    const length = this.codeLength;
    const messages = { help: fieldText(this.helpText), error: this.shownError };
    const active = Math.min(this.selectionStart, length - 1);

    return (
      <div class="root">
        <label part="label" htmlFor="input">
          {this.label}
        </label>
        <div
          part="field"
          dir="ltr"
          style={{ '--_length': String(length) }}
          data-invalid={this.shownError ? 'true' : null}
        >
          <input
            ref={(input) => {
              this.input = input;
            }}
            id="input"
            part="input"
            type="text"
            {...(this.name !== undefined ? { name: this.name } : {})}
            autocomplete="one-time-code"
            autoCapitalize="none"
            spellcheck="false"
            inputMode={this.type === 'alphanumeric' ? 'text' : 'numeric'}
            maxLength={length}
            pattern={this.codePattern}
            value={this.value}
            required={this.required}
            disabled={this.effectiveDisabled}
            aria-describedby={fieldDescribedBy(messages)}
            aria-invalid={fieldInvalid(messages)}
            onInput={this.handleInput}
            onCompositionend={this.acceptInput}
            onChange={this.handleChange}
            onPaste={this.handlePaste}
            onFocus={this.syncSelection}
            onClick={this.syncSelection}
            onSelect={this.syncSelection}
            onKeyUp={this.syncSelection}
            onKeyDown={this.handleKeyDown}
          />
          <div class="cells" aria-hidden="true">
            {Array.from({ length }, (_, index) => (
              <span
                key={index}
                part="cell"
                data-active={index === active ? 'true' : null}
                data-selected={
                  index >= this.selectionStart && index < this.selectionEnd ? 'true' : null
                }
              >
                {this.value[index] ?? ''}
              </span>
            ))}
          </div>
        </div>
        <FieldMessage {...messages} />
      </div>
    );
  }
}
