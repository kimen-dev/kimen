import { AttachInternals, Component, Element, Listen, Prop, State, Watch, h } from '@stencil/core';
import {
  FieldMessage,
  fieldDescribedBy,
  fieldInvalid,
  fieldText,
  fieldValidationMessage,
} from '../../utils/field-message';
import { LabelHint } from '../../utils/label-hint';
import { normalizeKiInputType } from './ki-input.form';

export type KiInputSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type KiInputType = 'text' | 'email' | 'password' | 'url' | 'tel' | 'search';

/**
 * A token-styled single-line text field with native input semantics.
 *
 * Like a native field, it answers `checkValidity()`, `reportValidity()`,
 * `setCustomValidity(message)`, `validity`, `validationMessage` and
 * `willValidate` synchronously, on the custom-elements build (not on hosts
 * created by the lazy loader).
 *
 * @whenToUse collect one line of free text from a person, always with a
 * visible `label`; choose the `type` and `autocomplete` that match the entry
 * purpose.
 * @whenNotToUse multiline text, predefined choices, boolean state, numeric
 * stepper entry, or placeholder-only labeling.
 *
 * @slot start - Leading icon or text affix inside the field. Follows writing direction.
 * @slot end - Trailing icon or text affix inside the field. Follows writing direction.
 * @slot action - One small submit action inside the field after the end adornment.
 * Use for one-field forms such as search or subscribe. Place a named
 * `ki-button size="sm" type="submit"` here, or wire a labeled
 * `ki-icon-button size="sm"` to request form submission. The action has its own tab
 * stop. Use the end slot for clear or reveal controls.
 * @part error - Error line shown in place of the help text while the field is invalid
 * after the person answered or submitted; a polite live region, starting with a
 * decorative error symbol.
 * @part field - Enclosure wrapper for background, border, radius and focus ring.
 * @part help - Help line under the field, read as the field's description.
 * @part input - Internal native input that owns entry text, caret and selection.
 * @part label - Visible label that provides the accessible name.
 * @part label-hint - The `label-hint` text after the label text, inside the label and
 * part of the accessible name; rendered only while a hint is set.
 * @event change - Fired when the user commits an edited value (native text-field
 * timing, such as on blur), composed across the shadow boundary; `value` is
 * already current when listeners run. When to use: react to a committed
 * value. When NOT to use: do not use it for per-keystroke updates; the native
 * `input` event carries those.
 */
@Component({
  tag: 'ki-input',
  styleUrls: ['../../utils/field-message.css', '../../utils/label-hint.css', 'ki-input.css'],
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class KiInput {
  // IDs are scoped per shadow root; a static id is unambiguous (review round 1).
  private readonly inputId = 'input';
  private input: HTMLInputElement | undefined;

  @Element() private readonly host!: HTMLKiInputElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  @State() private formDisabled = false;
  // Mirrors the `user-invalid` custom state, which a render cannot observe.
  @State() private userInvalid = false;
  // The validation message last handed to ElementInternals (D4).
  @State() private message = '';

  /**
   * Entry kind with native single-line input semantics. Unknown runtime
   * values fall back to `text`; `number` is not a v1 input kind.
   * When NOT to use: use future numeric controls for locale-aware number entry.
   *
   * @default 'text'
   */
  @Prop({ reflect: true }) type: KiInputType = 'text';

  /**
   * Token-backed field size (`--ki-input-{size}-*` tokens): the field box is
   * 24, 32, 40, 48 or 56px tall in onmars, with its padding, radius, text and
   * icon box; the label and help text follow in three steps. An unrecognized
   * value matches no style rule and keeps the medium metrics.
   * When to use: match the size of the buttons and fields around it.
   * When NOT to use: do not pick a smaller size to fit a dense region or a
   * larger one for touch; declare `data-ki-density` on the region instead,
   * which composes with every size.
   *
   * @default 'md'
   */
  @Prop({ reflect: true }) size: KiInputSize = 'md';

  /**
   * Visible label rendered next to the entry area and used as the accessible
   * name. This is mandatory for valid usage.
   * When NOT to use: never use `placeholder` as a label substitute.
   */
  @Prop({ reflect: true }) label!: string;

  /**
   * Short text shown after the label and read with it as part of the field's
   * name, so people know before submitting whether to answer: "(optional)" on
   * the few optional fields of a mostly required form, or "(required)" the
   * other way round, in the page's own language. It changes no validation;
   * set `required` for that, and keep the two consistent.
   * When NOT to use: do not put instructions or formats in it (use
   * `help-text`), errors (use `error-text`), or a repeat of the label.
   */
  @Prop({ reflect: true }) labelHint?: string;

  /**
   * Hint shown when the field is empty.
   * When NOT to use: do not use placeholder as the accessible name.
   */
  @Prop({ reflect: true }) placeholder?: string;

  /**
   * Live text value. The attribute declares the initial default; the property
   * is the current value and programmatic assignments are silent.
   * Deviation from native (deliberate, research D2): assigning the ATTRIBUTE
   * programmatically also replaces the displayed value, silently — native
   * inputs would keep the user's dirty value. Form reset restores the
   * attribute's current value.
   * When NOT to use: do not observe user edits by polling; listen for `input`
   * and `change` (both re-dispatched composed across the shadow boundary).
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

  /**
   * One line of help under the field, read with it as its description: the
   * format expected, or why the answer is asked. While an error shows, the
   * error takes its place.
   * When NOT to use: do not repeat the label, and do not use it for error
   * messages; use `error-text`.
   */
  @Prop({ reflect: true }) helpText?: string;

  /**
   * Message shown in place of the help text once the person's answer fails a
   * constraint (`required`, `type`), and the field's `validationMessage`. Say
   * how to fix the answer ("Enter an email address like name@example.com").
   * Without it the browser's own message shows, in the browser's language. An
   * error set with `setCustomValidity` outranks it.
   * When NOT to use: do not use it for server-side or cross-field errors; call
   * `setCustomValidity` for those.
   */
  @Prop({ reflect: true }) errorText?: string;

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
   * Validation message for the current validity state: the error set with
   * `setCustomValidity`, else `error-text`, else the browser's. Empty when the
   * control is valid.
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

  @Watch('errorText')
  protected errorTextChanged(): void {
    this.syncValidity();
  }

  @Watch('type')
  @Watch('required')
  @Watch('readonly')
  @Watch('disabled')
  protected validityAffectingPropChanged(): void {
    this.syncFormValue();
    // Mirror the constraint onto the internal input NOW rather than waiting for
    // the next render, so `el.required = true; form.requestSubmit()` in one task
    // blocks the empty field exactly as a native input would (codex review).
    this.applyInputConstraints();
    this.syncValidity();
  }

  formResetCallback(): void {
    this.value = this.host.getAttribute('value') ?? '';
    this.clearUserInvalid();
    this.syncFormValue();
    this.applyInputConstraints();
    this.syncValidity();
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.syncFormValue();
    this.applyInputConstraints();
    this.syncValidity();
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
      event.defaultPrevented ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.isComposing
    ) {
      return;
    }
    const form = this.internals.form;
    if (!form) {
      return;
    }
    event.preventDefault();
    // Native implicit submission activates the form's default (first) submit
    // control, carrying its name/value and formaction/formnovalidate. A bare
    // requestSubmit() drops that submitter, so mirror the default button when
    // one exists (codex review).
    const submitter = form.querySelector<HTMLButtonElement | HTMLInputElement>(
      'button:not([type]), button[type="submit"], input[type="submit"]',
    );
    if (submitter && !submitter.disabled) {
      form.requestSubmit(submitter);
    } else {
      form.requestSubmit();
    }
  };

  @Listen('invalid')
  protected handleInvalid(): void {
    this.setUserInvalid();
  }

  private get effectiveDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  private syncFormValue(): void {
    this.internals.setFormValue(this.effectiveDisabled ? null : this.value);
  }

  private syncValidity(): void {
    this.input?.setCustomValidity(this.customValidity);
    if (!this.input || this.effectiveDisabled) {
      // Disabled controls are barred from constraint validation; drop any
      // lingering user-invalid affordance so a now-inert field is not styled
      // invalid (codex review).
      this.internals.setValidity({});
      this.message = '';
      this.clearUserInvalid();
      return;
    }

    if (this.input.validity.valid) {
      this.internals.setValidity({});
      this.message = '';
      this.clearUserInvalid();
      return;
    }

    this.internals.setValidity(
      this.input.validity,
      fieldValidationMessage(this.customValidity, this.errorText, this.input.validationMessage),
      this.input,
    );
    this.message = this.internals.validationMessage;
  }

  // Imperatively mirror validity-affecting props onto the internal input so its
  // ValidityState is fresh before the next render commit — a same-task
  // constraint change + submit must see the new state (codex review).
  private applyInputConstraints(): void {
    if (!this.input) {
      return;
    }
    this.input.type = normalizeKiInputType(this.type);
    this.input.required = this.required;
    this.input.readOnly = this.readonly;
    this.input.disabled = this.effectiveDisabled;
  }

  private setUserInvalid(): void {
    this.internals.states.add('user-invalid');
    this.userInvalid = true;
  }

  private clearUserInvalid(): void {
    this.internals.states.delete('user-invalid');
    this.userInvalid = false;
  }

  render() {
    const type = normalizeKiInputType(this.type);
    const messages = {
      help: fieldText(this.helpText),
      error: this.userInvalid ? this.message : '',
    };

    return (
      <div class="root">
        {/* Review round 1 (Critical-1): the label is a SIBLING of the field so
            slotted adornments never join the control's accessible name
            (research D1 anatomy); for/id keeps click-to-focus. */}
        <label part="label" htmlFor={this.inputId}>
          {this.label}
          <LabelHint hint={fieldText(this.labelHint)} />
        </label>
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
            aria-describedby={fieldDescribedBy(messages)}
            aria-invalid={fieldInvalid(messages)}
            {...(this.name !== undefined ? { name: this.name } : {})}
            {...(this.placeholder !== undefined ? { placeholder: this.placeholder } : {})}
            {...(this.autocomplete !== undefined ? { autocomplete: this.autocomplete } : {})}
            onInput={this.handleInput}
            onChange={this.handleChange}
            onKeyDown={this.handleKeyDown}
          />
          <slot name="end" />
          <slot name="action" />
        </div>
        <FieldMessage {...messages} />
      </div>
    );
  }
}
