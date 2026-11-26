import { AttachInternals, Component, Element, Listen, Prop, State, Watch, h } from '@stencil/core';
import {
  applyFieldLengthLimit,
  CountedFieldMessage,
  countedFieldDescription,
} from '../../utils/counted-field-message';
import { fieldCountAnnouncement, normalizeLengthLimit } from '../../utils/field-count';
import { fieldInvalid, fieldText, fieldValidationMessage } from '../../utils/field-message';
import { LabelHint } from '../../utils/label-hint';
import { normalizeKiTextareaRows } from './ki-textarea.form';

const defaultMaxlengthErrorText = 'Shorten the text to fit the character limit.';

export type KiTextareaSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * A token-styled multiline text field with native form semantics.
 *
 * Like a native field, it answers `checkValidity()`, `reportValidity()`,
 * `setCustomValidity(message)`, `validity`, `validationMessage` and
 * `willValidate` synchronously on a defined custom element.
 *
 * @whenToUse free-form text longer than one line, such as comments,
 * descriptions, messages, delivery notes, or addresses when paired with a
 * matching `autocomplete` purpose.
 * @whenNotToUse single-line values (`ki-input`), constrained choices,
 * rich or formatted text editing, or search boxes.
 *
 * Agent note: initial text is declared through the `value` attribute; element
 * text content is ignored. Enter inserts a line break and never submits the
 * enclosing form, the inverse of `ki-input`.
 *
 * @part count - Current character count and maximum at the end of the field message row.
 * @part error - Error line shown in place of the help text while the field is invalid
 * after the person answered or submitted; a polite live region, starting with a
 * decorative error symbol.
 * @part field - The enclosure wrapper.
 * @part help - Help line under the field, read as the field's description.
 * @part textarea - Internal native multiline control.
 * @part label - Rendered visible label and accessible-name source.
 * @part label-hint - The `label-hint` text after the label text, inside the label and
 * part of the accessible name; rendered only while a hint is set.
 * @event change - Fired when the user commits an edited value (on blur, with native
 * textarea timing), composed across the shadow boundary; `value` is already
 * current when listeners run. When to use: react to a committed value. When
 * NOT to use: do not use it for per-keystroke updates; the native `input`
 * event carries those.
 */
@Component({
  tag: 'ki-textarea',
  styleUrls: [
    '../../utils/field-message.css',
    '../../utils/label-hint.css',
    'ki-textarea.css',
    '../../utils/field-appearance.css',
    '../../utils/field-count.css',
  ],
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class KiTextarea {
  @Element() private readonly host!: HTMLElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  /**
   * Field appearance. `default` uses the current theme, `outlined` draws a
   * full border, and `filled` uses a tinted surface and bottom indicator.
   * The visible label stays above the field.
   * When to use: set an explicit appearance when fields must share a shape
   * across themes.
   *
   * @default 'default'
   */
  @Prop({ reflect: true }) appearance?: 'default' | 'outlined' | 'filled' = 'default';

  /**
   * Soft maximum in UTF-16 code units. Longer user edits and assigned values
   * are preserved and fail form validation with `validity.tooLong`.
   * When to use: let people revise an over-limit draft without losing text.
   *
   * @minimum 0
   * @maximum 2147483647
   */
  @Prop({ reflect: true }) maxlength?: number;

  /**
   * Native minimum length in UTF-16 code units for a nonempty user edit.
   * When to use: require a minimum number of characters in an answer.
   *
   * @minimum 0
   * @maximum 2147483647
   */
  @Prop({ reflect: true }) minlength?: number;

  /**
   * Shows the current count and maximum next to the help or error text and
   * announces reaching or exceeding the limit. Requires `maxlength`.
   * When to use: give people feedback while writing to a limit.
   *
   * @default false
   */
  @Prop({ reflect: true }) showCount?: boolean = false;

  /**
   * Localized message for an over-limit value. `error-text` and
   * `setCustomValidity()` take precedence.
   * When to use: translate the soft maximum message for the page language.
   */
  @Prop({ reflect: true }) maxlengthErrorText?: string = defaultMaxlengthErrorText;

  /**
   * Visible label rendered by the component and used as the accessible name.
   * When to use: always provide a concise label for the requested long-form
   * text. When NOT to use: do not substitute placeholder text for the label.
   */
  @Prop({ reflect: true }) label!: string;

  /**
   * Short text shown after the label and read with it as part of the field's
   * name, so people know before submitting whether to answer: "(optional)" on
   * the few optional fields of a mostly required form, or "(required)" the
   * other way round, in the page's own language. It changes no validation;
   * set `required` for that, and keep the two consistent.
   * When NOT to use: do not put instructions or length limits in it (use
   * `help-text`), errors (use `error-text`), or a repeat of the label.
   */
  @Prop({ reflect: true }) labelHint?: string;

  /**
   * Hint shown while the textarea is empty.
   * When to use: add an example or short formatting hint. When NOT to use: do
   * not use placeholder as the accessible name or required instruction.
   */
  @Prop({ reflect: true }) placeholder?: string;

  /**
   * Live current text. The `value` attribute declares the reset default;
   * element text content is ignored. Programmatic assignments replace the
   * display and emit no events.
   * When to use: preload or read free-form text, line breaks included. When
   * NOT to use: do not put initial text between the element tags.
   *
   * @default ''
   */
  @Prop({ mutable: true }) value = '';

  /**
   * Form-data key used when the textarea submits with a form.
   * When to use: provide for fields whose text must be included in FormData.
   * When NOT to use: omit for display-only or client-only fields.
   */
  @Prop({ reflect: true }) name?: string;

  /**
   * Visible line count. Invalid, non-numeric, zero, or negative values fall
   * back to 2; no auto-grow or user resize handle exists in v1.
   * When to use: set the stable multiline height needed by the layout. When
   * NOT to use: do not use rows as a responsive size axis.
   *
   * @default 2
   */
  @Prop({ reflect: true }) rows = 2;

  /**
   * Token-backed field size (`--ki-textarea-{size}-*` tokens): padding,
   * radius and text; the label and help text follow in three steps. The
   * height stays `rows` lines. An unrecognized value matches no style rule
   * and keeps the medium metrics.
   * When to use: match the size of the fields around it.
   * When NOT to use: do not pick a smaller size to fit a dense region or a
   * larger one for touch; declare `data-ki-density` on the region instead,
   * which composes with every size.
   *
   * @default 'md'
   */
  @Prop({ reflect: true }) size: KiTextareaSize = 'md';

  /**
   * Requires a non-empty value before form submission.
   * When to use: mark mandatory long-form text. When NOT to use: do not pair
   * with `readonly` expecting it to block; readonly fields are validation
   * exempt like native textareas.
   *
   * @default false
   */
  @Prop({ reflect: true }) required = false;

  /**
   * Makes the textarea focusable and selectable while rejecting edits.
   * When to use: show submitted or policy text that should still be included
   * in form data. When NOT to use: do not use readonly to remove a field from
   * submission; use disabled.
   *
   * @default false
   */
  @Prop({ reflect: true }) readonly = false;

  /**
   * Disables editing, focus, validation and form-data contribution.
   * When to use: make a field temporarily unavailable. When NOT to use: do not
   * use disabled for readonly review text that should submit.
   *
   * @default false
   */
  @Prop({ reflect: true }) disabled = false;

  /**
   * Autofill detail token forwarded to the native textarea.
   * When to use: expose entry purpose such as `street-address` when available.
   * When NOT to use: omit when no valid autofill purpose applies.
   */
  @Prop({ reflect: true }) autocomplete?: string;

  /**
   * One line of help under the field, read with it as its description: what
   * to write, or how long. While an error shows, the error takes its place.
   * When NOT to use: do not repeat the label, and do not use it for error
   * messages; use `error-text`.
   */
  @Prop({ reflect: true }) helpText?: string;

  /**
   * Message shown in place of the help text once the person's answer fails a
   * constraint (`required` or a length limit), and the field's `validationMessage`. Say how to
   * fix the answer. Without it the browser's own message shows, in the
   * browser's language. An error set with `custom-error` or
   * `setCustomValidity` outranks it.
   * When NOT to use: do not use it for server-side or cross-field errors; set
   * `custom-error` or call `setCustomValidity` for those.
   */
  @Prop({ reflect: true }) errorText?: string;

  /**
   * An error of the application's own, such as a server-side verdict on the
   * submitted text ("This title is taken"). While it holds text the field is
   * invalid, blocks its form, shows the text in place of the help text at
   * once and is announced as invalid. It stops counting at the person's next
   * change of the text, or when the form is reset, so it never blocks the
   * corrected answer. It outranks `error-text` and an error set with
   * `setCustomValidity`.
   * When to use: report a verdict from a declarative spec, a live update or a
   * framework binding. Remove it when a new attempt starts.
   * When NOT to use: do not use it for `required` or a length limit the field
   * enforces itself; `error-text` words those. Setting the same text again
   * while the prop still holds it shows nothing: remove it first, then set it
   * again.
   */
  @Prop({ reflect: true }) customError?: string;

  @State() private formDisabled = false;
  // Mirrors the `user-invalid` custom state, which a render cannot observe.
  @State() private userInvalid = false;
  // The validation message last handed to ElementInternals (D4).
  @State() private message = '';
  @State() private countAnnouncement = '';

  private controlId = `ki-textarea-${Math.random().toString(36).slice(2)}`;
  private textarea: HTMLTextAreaElement | undefined;

  private get normalizedRows(): number {
    return normalizeKiTextareaRows(this.rows);
  }

  private get effectiveDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  @Watch('value')
  protected valueChanged(value = this.value, previous = value): void {
    if (this.announcementFor(previous, value) !== undefined) {
      this.countAnnouncement = '';
    }
    this.syncTextareaValue();
    this.syncFormValue();
    this.syncValidity();
  }

  @Watch('showCount')
  @Watch('maxlength')
  protected countSettingsChanged(): void {
    this.countAnnouncement = '';
  }

  @Watch('errorText')
  @Watch('maxlengthErrorText')
  @Watch('maxlength')
  @Watch('minlength')
  @Watch('required')
  @Watch('readonly')
  @Watch('disabled')
  protected validityChanged(): void {
    this.applyTextareaConstraints();
    this.syncDisabledFocus();
    this.syncValidity();
  }

  @Watch('customError')
  protected customErrorChanged(): void {
    this.customErrorWithdrawn = false;
    this.syncValidity();
  }

  // The application's own error (setCustomValidity); '' when none. It is
  // reapplied on every validity sync, so the control's own revalidation never
  // drops it.
  private customValidity = '';

  // Whether the person's change or a form reset withdrew `custom-error`.
  private customErrorWithdrawn = false;

  /**
   * Validity of the control, as on a native form control: which constraint
   * fails, if any, including an error set with `setCustomValidity`.
   * When NOT to use: do not read it to style the control; the control shows
   * its own invalid state after a blocked submission.
   */
  get validity(): ValidityState {
    return this.internals.validity;
  }

  /**
   * Validation message for the current validity state. Empty when the control
   * is valid.
   * When NOT to use: do not parse or localize the browser's message in
   * application code.
   */
  get validationMessage(): string {
    return this.internals.validationMessage;
  }

  /**
   * Whether the control takes part in constraint validation: false while it
   * is disabled, directly or through a fieldset.
   * When NOT to use: do not use it to test whether the control is disabled;
   * read `disabled` for that.
   */
  get willValidate(): boolean {
    return this.internals.willValidate;
  }

  /**
   * Answers at once whether the control satisfies its constraints, firing
   * `invalid` when it does not, exactly as a native field does.
   * When NOT to use: use `reportValidity()` instead when the user should see
   * the problem.
   */
  checkValidity(): boolean {
    return this.internals.checkValidity();
  }

  /**
   * Like `checkValidity()`, and when the control is invalid the browser shows
   * its message and moves focus to the control.
   * When NOT to use: do not call it on every keystroke; it interrupts the user.
   */
  reportValidity(): boolean {
    return this.internals.reportValidity();
  }

  /**
   * Sets an error of the application's own, such as a server-side or
   * cross-field rule. While `message` is not empty the control is invalid,
   * blocks its form and reports that message, and it keeps doing so through
   * the user's edits until `setCustomValidity('')` clears it.
   * When NOT to use: do not use it for `required` or other constraints the
   * control already enforces.
   */
  setCustomValidity(message: string): void {
    this.customValidity = message;
    this.syncValidity();
  }

  componentDidLoad(): void {
    this.syncTextareaValue();
    this.syncFormValue();
    this.syncValidity();
  }

  componentDidRender(): void {
    this.syncTextareaValue();
    this.syncValidity();
  }

  formResetCallback(): void {
    this.customErrorWithdrawn = true;
    this.value = this.host.getAttribute('value') ?? '';
    this.deleteUserInvalidState();
    this.syncTextareaValue();
    this.syncFormValue();
    this.syncValidity();
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.applyTextareaConstraints();
    this.syncDisabledFocus();
    this.syncValidity();
  }

  @Listen('invalid')
  protected handleInvalid(): void {
    this.updateUserInvalidState();
  }

  private readonly handleInput = (): void => {
    if (!this.textarea?.validity) {
      return;
    }

    const value = this.textarea.value;
    const announcement = this.announcementFor(this.value, value);
    this.customErrorWithdrawn = true;
    this.value = value;
    if (announcement !== undefined) {
      this.countAnnouncement = announcement;
    }
    this.syncFormValue();
    this.syncValidity();
  };

  private readonly handleChange = (): void => {
    if (!this.textarea?.validity) {
      return;
    }

    this.value = this.textarea.value;
    this.syncFormValue();
    this.syncValidity();
    this.updateUserInvalidState();
    this.host.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  };

  private syncTextareaValue(): void {
    const value = this.withNativeNewlines(this.value);
    if (this.textarea && this.textarea.value !== value) {
      this.textarea.value = value;
    }
  }

  private applyTextareaConstraints(): void {
    if (!this.textarea) return;
    this.textarea.required = this.required;
    this.textarea.readOnly = this.readonly;
    this.textarea.disabled = this.effectiveDisabled;
    applyFieldLengthLimit(this.textarea, 'minlength', this.minlength);
  }

  private syncFormValue(): void {
    this.internals.setFormValue(this.value);
  }

  private syncValidity(): void {
    if (!this.textarea?.validity) {
      return;
    }

    const customError = this.customErrorWithdrawn ? '' : fieldText(this.customError);
    const applicationError = customError || this.customValidity;
    this.textarea.setCustomValidity(applicationError);
    const validity = this.textarea.validity;
    const tooLong = this.isOverLimit(this.textarea.value.length);
    const flags = tooLong
      ? { tooLong, tooShort: validity.tooShort, customError: validity.customError }
      : validity;
    const message = tooLong
      ? fieldText(this.maxlengthErrorText) || defaultMaxlengthErrorText
      : this.textarea.validationMessage;

    this.internals.setValidity(
      flags,
      fieldValidationMessage(applicationError, this.errorText, message),
      this.textarea,
    );
    this.message = this.internals.validationMessage;

    if (this.internals.validity.valid) {
      this.deleteUserInvalidState();
    } else if (customError !== '' && !this.effectiveDisabled) {
      // A custom error shows at once, without a commit or a submission (D2).
      this.addUserInvalidState();
    }
  }

  private updateUserInvalidState(): void {
    if (!this.textarea?.validity) {
      return;
    }

    if (this.internals.validity.valid) {
      this.deleteUserInvalidState();
    } else {
      this.addUserInvalidState();
    }
  }

  private addUserInvalidState(): void {
    this.internals.states.add('user-invalid');
    this.userInvalid = true;
  }

  private deleteUserInvalidState(): void {
    this.internals.states.delete('user-invalid');
    this.userInvalid = false;
  }

  private syncDisabledFocus(): void {
    if (this.effectiveDisabled && this.host.shadowRoot?.activeElement === this.textarea) {
      this.textarea?.blur();
    }
  }

  private get countLimit(): number | undefined {
    return this.showCount ? normalizeLengthLimit(this.maxlength) : undefined;
  }

  private withNativeNewlines(value: string | null | undefined): string {
    return (value ?? '').replace(/\r\n?/gu, '\n');
  }

  private isOverLimit(length: number): boolean {
    const maximum = normalizeLengthLimit(this.maxlength);
    return maximum !== undefined && length > maximum && !this.effectiveDisabled && !this.readonly;
  }

  private announcementFor(previous: string, value: string): string | undefined {
    return fieldCountAnnouncement(
      this.withNativeNewlines(previous).length,
      this.withNativeNewlines(value).length,
      this.countLimit,
    );
  }

  render() {
    const minimum = normalizeLengthLimit(this.minlength);
    const length = this.withNativeNewlines(this.value).length;
    const messages = {
      help: fieldText(this.helpText),
      error: this.userInvalid && !this.effectiveDisabled ? this.message : '',
    };
    const optionalTextareaAttributes = {
      ...(this.placeholder === undefined ? {} : { placeholder: this.placeholder }),
      ...(this.autocomplete === undefined ? {} : { autocomplete: this.autocomplete }),
    };

    return (
      <div class="root">
        <label part="label" htmlFor={this.controlId}>
          {this.label}
          <LabelHint hint={fieldText(this.labelHint)} />
        </label>
        <div part="field">
          <textarea
            ref={(el) => {
              this.textarea = el;
            }}
            part="textarea"
            id={this.controlId}
            value={this.value}
            rows={this.normalizedRows}
            {...(minimum === undefined ? {} : { minlength: minimum })}
            required={this.required}
            readOnly={this.readonly}
            disabled={this.effectiveDisabled}
            aria-describedby={countedFieldDescription(messages, this.countLimit)}
            aria-invalid={this.isOverLimit(length) ? 'true' : fieldInvalid(messages)}
            onInput={this.handleInput}
            onChange={this.handleChange}
            {...optionalTextareaAttributes}
          />
        </div>
        <CountedFieldMessage
          {...messages}
          length={length}
          limit={this.countLimit}
          announcement={this.countAnnouncement}
        />
      </div>
    );
  }
}
