import { AttachInternals, Component, Element, Listen, Prop, State, Watch, h } from '@stencil/core';
import {
  FieldMessage,
  fieldDescribedBy,
  fieldInvalid,
  fieldText,
  fieldValidationMessage,
} from '../../utils/field-message';
import { normalizeKiTextareaRows } from './ki-textarea.form';

/**
 * A token-styled multiline text field with native form semantics.
 *
 * Like a native field, it answers `checkValidity()`, `reportValidity()`,
 * `setCustomValidity(message)`, `validity`, `validationMessage` and
 * `willValidate` synchronously, on the custom-elements build (not on hosts
 * created by the lazy loader).
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
 * @part error - Error line shown in place of the help text while the field is invalid
 * after the person answered or submitted; a polite live region, starting with a
 * decorative error symbol.
 * @part field - The enclosure wrapper.
 * @part help - Help line under the field, read as the field's description.
 * @part textarea - Internal native multiline control.
 * @part label - Rendered visible label and accessible-name source.
 * @event change - Fired when the user commits an edited value (on blur, with native
 * textarea timing), composed across the shadow boundary; `value` is already
 * current when listeners run. When to use: react to a committed value. When
 * NOT to use: do not use it for per-keystroke updates; the native `input`
 * event carries those.
 */
@Component({
  tag: 'ki-textarea',
  styleUrls: ['../../utils/field-message.css', 'ki-textarea.css'],
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class KiTextarea {
  @Element() private readonly host!: HTMLElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  /**
   * Visible label rendered by the component and used as the accessible name.
   * When to use: always provide a concise label for the requested long-form
   * text. When NOT to use: do not substitute placeholder text for the label.
   */
  @Prop({ reflect: true }) label!: string;

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
   * constraint (`required`), and the field's `validationMessage`. Say how to
   * fix the answer. Without it the browser's own message shows, in the
   * browser's language. An error set with `setCustomValidity` outranks it.
   * When NOT to use: do not use it for server-side or cross-field errors; call
   * `setCustomValidity` for those.
   */
  @Prop({ reflect: true }) errorText?: string;

  @State() private formDisabled = false;
  // Mirrors the `user-invalid` custom state, which a render cannot observe.
  @State() private userInvalid = false;
  // The validation message last handed to ElementInternals (D4).
  @State() private message = '';

  private controlId = `ki-textarea-${Math.random().toString(36).slice(2)}`;
  private textarea: HTMLTextAreaElement | undefined;

  private get normalizedRows(): number {
    return normalizeKiTextareaRows(this.rows);
  }

  private get effectiveDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  @Watch('value')
  protected valueChanged(): void {
    this.syncTextareaValue();
    this.syncFormValue();
    this.syncValidity();
  }

  @Watch('errorText')
  @Watch('required')
  @Watch('readonly')
  @Watch('disabled')
  protected validityChanged(): void {
    this.syncDisabledFocus();
    this.syncValidity();
  }

  // The application's own error (setCustomValidity); '' when none. It is
  // reapplied on every validity sync, so the control's own revalidation never
  // drops it.
  private customValidity = '';

  /**
   * Validity of the control, as on a native form control: which constraint
   * fails, if any, including an error set with `setCustomValidity`. Present
   * on the custom-elements build (`@kimen/elements/ki-*`,
   * `@kimen/elements/components` and the framework wrappers), not on hosts
   * created by the lazy loader.
   * When NOT to use: do not read it to style the control; the control shows
   * its own invalid state after a blocked submission.
   */
  get validity(): ValidityState {
    return this.internals.validity;
  }

  /**
   * Validation message for the current validity state: the browser's, or the
   * error set with `setCustomValidity`. Empty when the control is valid.
   * Custom-elements build only.
   * When NOT to use: do not parse or localize the browser's message in
   * application code.
   */
  get validationMessage(): string {
    return this.internals.validationMessage;
  }

  /**
   * Whether the control takes part in constraint validation: false while it
   * is disabled, directly or through a fieldset. Custom-elements build only.
   * When NOT to use: do not use it to test whether the control is disabled;
   * read `disabled` for that.
   */
  get willValidate(): boolean {
    return this.internals.willValidate;
  }

  /**
   * Answers at once whether the control satisfies its constraints, firing
   * `invalid` when it does not, exactly as a native field does.
   * Custom-elements build only.
   * When NOT to use: use `reportValidity()` instead when the user should see
   * the problem.
   */
  checkValidity(): boolean {
    return this.internals.checkValidity();
  }

  /**
   * Like `checkValidity()`, and when the control is invalid the browser shows
   * its message and moves focus to the control. Custom-elements build only.
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
   * Custom-elements build only.
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
    this.value = this.host.getAttribute('value') ?? '';
    this.deleteUserInvalidState();
    this.syncTextareaValue();
    this.syncFormValue();
    this.syncValidity();
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.syncDisabledFocus();
  }

  @Listen('invalid')
  protected handleInvalid(): void {
    this.updateUserInvalidState();
  }

  private readonly handleInput = (): void => {
    if (!this.textarea?.validity) {
      return;
    }

    this.value = this.textarea.value;
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
    if (this.textarea && this.textarea.value !== this.value) {
      this.textarea.value = this.value;
    }
  }

  private syncFormValue(): void {
    this.internals.setFormValue(this.value);
  }

  private syncValidity(): void {
    if (!this.textarea?.validity) {
      return;
    }

    this.textarea.setCustomValidity(this.customValidity);

    this.internals.setValidity(
      this.textarea.validity,
      fieldValidationMessage(this.customValidity, this.errorText, this.textarea.validationMessage),
      this.textarea,
    );
    this.message = this.internals.validationMessage;

    if (this.textarea.validity.valid) {
      this.deleteUserInvalidState();
    }
  }

  private updateUserInvalidState(): void {
    if (!this.textarea?.validity) {
      return;
    }

    if (this.textarea.validity.valid) {
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

  render() {
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
            required={this.required}
            readOnly={this.readonly}
            disabled={this.effectiveDisabled}
            aria-describedby={fieldDescribedBy(messages)}
            aria-invalid={fieldInvalid(messages)}
            onInput={this.handleInput}
            onChange={this.handleChange}
            {...optionalTextareaAttributes}
          />
        </div>
        <FieldMessage {...messages} />
      </div>
    );
  }
}
