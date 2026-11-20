import { AttachInternals, Component, Element, h, Listen, Prop, State, Watch } from '@stencil/core';
import {
  booleanFromAttributePresence,
  observeAttributePresence,
} from '../../utils/boolean-presence';
import { checkboxGroupFor, checkboxGroupOptions } from '../../utils/checkbox-group-context';
import {
  FieldMessage,
  fieldDescribedBy,
  fieldInvalid,
  fieldText,
  fieldValidationMessage,
} from '../../utils/field-message';
import { LabelHint } from '../../utils/label-hint';
import { checkboxFormValue } from './ki-checkbox.form';

export type KiCheckboxSize = 'sm' | 'md' | 'lg';

/**
 * A form-associated checkbox for selecting independent options.
 *
 * Like a native field, it answers `checkValidity()`, `reportValidity()`,
 * `setCustomValidity(message)`, `validity`, `validationMessage` and
 * `willValidate` synchronously, on the custom-elements build (not on hosts
 * created by the lazy loader).
 *
 * @whenToUse selecting one or more independent options that a form submits
 * later, including a "select all" parent that presents partial selection with
 * `indeterminate`. Always provide a visible label in the default slot.
 * @whenNotToUse a single mutually exclusive choice, an immediate on/off
 * effect, triggering an action, unlabeled/icon-only usage, or
 * `checked="false"` to mean unchecked. Boolean attributes use presence
 * semantics; omit `checked` to express unchecked.
 *
 * @slot - Visible label content. This is the accessible name source and a
 * native activation surface.
 * @part control - Visual checkbox box, border, focus ring and currentColor marks.
 * @part error - Error line shown in place of the help text while the checkbox is
 * invalid after the person toggled it or submitted; a polite live region, starting
 * with a decorative error symbol.
 * @part help - Help line under the checkbox, read as its description.
 * @part label - Label wrapper around the default slot.
 * @part label-hint - The `label-hint` text after the slotted label, inside the label
 * wrapper and part of the accessible name; rendered only while a hint is set.
 * @event change - Fired once after a user toggle (pointer, slotted label or Space)
 * commits, composed across the shadow boundary; `checked` is already current
 * when listeners run. When to use: react to the committed selection. When NOT
 * to use: do not expect it for programmatic `checked` writes, which are silent.
 */
@Component({
  tag: 'ki-checkbox',
  styleUrls: ['../../utils/field-message.css', '../../utils/label-hint.css', 'ki-checkbox.css'],
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class KiCheckbox {
  @AttachInternals() private readonly internals!: ElementInternals;

  @Element() private readonly host!: HTMLElement;

  /**
   * Live binary selection state. User activation by pointer, slotted label or
   * Space toggles it with native checkbox parity and emits composed `input`
   * before composed `change`. Boolean presence semantics apply:
   * `checked="false"` still renders checked; omit the attribute to express
   * unchecked. Programmatic assignment is silent.
   * When NOT to use: do not treat this reflected attribute as a native
   * `defaultChecked`; reset uses the baseline captured at form association.
   *
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) checked = false;

  /**
   * Presentation-only mixed state. It renders the dash mark, is forwarded to
   * the internal native input for mixed assistive-technology exposure, and
   * never changes the submitted value. Any user toggle clears it and removes
   * the reflected attribute.
   * When NOT to use: do not submit or persist `indeterminate` as a third
   * value; model data remains binary through `checked`.
   *
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) indeterminate = false;

  /**
   * Token-backed size: the box is 18, 20 or 24px in onmars. `sm` also takes
   * the smaller label (13/20, 8px away); `md` and `lg` keep the 15px label.
   * The pointer target never drops under 24px. An unrecognized value matches
   * no style rule and keeps the medium metrics.
   * When to use: match the size of the text and controls around it.
   * When NOT to use: do not pick a smaller size to fit a dense region or a
   * larger one for touch; declare `data-ki-density` on the region instead,
   * which composes with every size.
   *
   * @default 'md'
   */
  @Prop({ reflect: true }) size: KiCheckboxSize = 'md';

  /**
   * Prevents activation, removes the checkbox from keyboard reach, exposes the
   * unavailable state, and excludes it from form data.
   * When NOT to use: do not use disabled for validation errors or pending
   * state.
   *
   * @default false
   */
  @Prop({ reflect: true }) disabled = false;

  /**
   * Requires the checkbox to be checked before form submission can proceed.
   * The invalid appearance appears after a blocked submission attempt or an
   * invalidating user toggle, never on initial render.
   * When NOT to use: do not use required to express group-level rules; compose
   * those at the form/application layer.
   *
   * @default false
   */
  @Prop({ reflect: true }) required = false;

  /**
   * Form-data key contributed when the checkbox is checked.
   * When NOT to use: omit when the checkbox should not submit a value.
   */
  @Prop({ reflect: true }) name?: string;

  /**
   * Form-data value paired with `name` when checked. If omitted, the submitted
   * value is `on`, matching native checkbox behavior.
   * When NOT to use: do not encode the unchecked state here; unchecked
   * checkboxes contribute no form entry.
   */
  @Prop({ reflect: true }) value?: string;

  /**
   * Short text shown after the slotted label and read with it as part of the
   * checkbox name, so people know before submitting whether they must check
   * it: "(required)" on a consent the form cannot do without, "(optional)"
   * on one it can, in the page's own language. It changes no validation; set
   * `required` for that, and keep the two consistent.
   * When NOT to use: do not put what checking it commits to in it (use
   * `help-text`), errors (use `error-text`), or a repeat of the label.
   */
  @Prop({ reflect: true }) labelHint?: string;

  /**
   * One line of help under the checkbox, read with it as its description:
   * what checking it means or commits to.
   * When NOT to use: do not repeat the label, and do not use it for error
   * messages; use `error-text`.
   */
  @Prop({ reflect: true }) helpText?: string;

  /**
   * Message shown in place of the help text once a `required` checkbox is
   * left unchecked, and its `validationMessage`. Say what checking it means
   * ("Accept the terms to continue"). Without it the browser's own message
   * shows, in the browser's language. An error set with `setCustomValidity`
   * outranks it.
   * When NOT to use: do not use it for server-side or cross-field errors; call
   * `setCustomValidity` for those.
   */
  @Prop({ reflect: true }) errorText?: string;

  @State() private formDisabled = false;
  // Mirrors the `user-invalid` custom state, which a render cannot observe.
  @State() private userInvalid = false;
  // The validation message last handed to ElementInternals (D4).
  @State() private message = '';

  private input: HTMLInputElement | undefined;
  private resetBaseline = false;
  private presenceObserver: MutationObserver | undefined;

  private get effectiveDisabled(): boolean {
    return this.disabled || this.formDisabled || Boolean(checkboxGroupFor(this.host)?.disabled);
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

  connectedCallback(): void {
    // Boolean presence semantics must survive hydration, not just apply once in
    // componentWillLoad. Stencil natively adopts `checked=""`/removal via its
    // own attribute observation, but parses a present-but-falsy `checked="false"`
    // to `false`; watch for that and restore presence semantics. Armed on every
    // connection: disconnectedCallback releases the observer, and a checkbox
    // that is moved in the document connects again without loading again.
    this.presenceObserver?.disconnect();
    this.presenceObserver = observeAttributePresence(
      this.host,
      ['checked', 'indeterminate', 'disabled', 'required'],
      this.handlePresentAttribute,
    );
    if (this.input) this.syncGroupState();
  }

  componentWillLoad(): void {
    this.checked = booleanFromAttributePresence(this.checked, this.host.hasAttribute('checked'));
    this.indeterminate = booleanFromAttributePresence(
      this.indeterminate,
      this.host.hasAttribute('indeterminate'),
    );
    this.disabled = booleanFromAttributePresence(this.disabled, this.host.hasAttribute('disabled'));
    this.required = booleanFromAttributePresence(this.required, this.host.hasAttribute('required'));
  }

  componentDidLoad(): void {
    checkboxGroupOptions.set(this.host, this.syncGroupState);
    this.syncGroupState();
    checkboxGroupFor(this.host)?.optionChanged(this.host);
  }

  private readonly syncGroupState = (): void => {
    const group = checkboxGroupFor(this.host);
    this.setState('fieldset-disabled', this.formDisabled || Boolean(group?.disabled));
    this.syncInputState();
    this.syncFormValue();
    this.syncValidity();
  };

  disconnectedCallback(): void {
    this.presenceObserver?.disconnect();
    this.presenceObserver = undefined;
  }

  // Correct ONLY the case Stencil gets wrong: a present-but-falsy attribute the
  // author set after hydration. Absence and Stencil's own reflect writes already
  // agree with the prop, so skipping them avoids fighting the reflection that
  // fires on every normal toggle (a naive `prop = hasAttribute` would).
  private readonly handlePresentAttribute = (attribute: string): void => {
    if (attribute === 'checked' && !this.checked) {
      this.checked = true;
    } else if (attribute === 'indeterminate' && !this.indeterminate) {
      this.indeterminate = true;
    } else if (attribute === 'disabled' && !this.disabled) {
      this.disabled = true;
    } else if (attribute === 'required' && !this.required) {
      this.required = true;
    }
  };

  @Watch('checked')
  protected checkedChanged(): void {
    if (this.input) {
      this.input.checked = this.checked;
    }
    this.syncFormValue();
    this.syncValidity();
    this.syncUserInvalidState(false);
    checkboxGroupFor(this.host)?.optionChanged(this.host);
  }

  @Watch('indeterminate')
  protected indeterminateChanged(): void {
    if (this.input) {
      this.input.indeterminate = this.indeterminate;
    }
  }

  @Watch('disabled')
  @Watch('required')
  protected inputConstraintChanged(): void {
    this.syncInputState();
    this.syncValidity();
    // Relaxing a constraint (e.g. required -> false) that makes the control
    // valid must also drop the user-invalid affordance; syncValidity only does
    // so on the disabled path (codex review).
    this.syncUserInvalidState(false);
  }

  @Watch('value')
  protected valueChanged(): void {
    this.syncFormValue();
    checkboxGroupFor(this.host)?.optionChanged(this.host);
  }

  @Watch('errorText')
  protected errorTextChanged(): void {
    this.syncValidity();
  }

  formAssociatedCallback(): void {
    this.resetBaseline = this.checked;
    this.syncFormValue();
    this.syncValidity();
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.syncGroupState();
  }

  formResetCallback(): void {
    if (checkboxGroupFor(this.host)) return;
    this.checked = this.resetBaseline;
    this.syncInputState();
    this.syncFormValue();
    this.syncValidity();
    this.setUserInvalid(false);
  }

  private readonly setInput = (input?: HTMLInputElement): void => {
    this.input = input;
    this.syncInputState();
  };

  private readonly handleChange = (): void => {
    this.syncFromInput();
    this.syncUserInvalidState(true);
    this.host.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  };

  private readonly handleInput = (): void => {
    this.syncFromInput();
  };

  private syncFromInput(): void {
    if (!this.input) {
      return;
    }

    this.checked = this.input.checked;
    this.indeterminate = false;
    this.syncFormValue();
    this.syncValidity();
  }

  private readonly handleInvalid = (): void => {
    this.syncValidity();
    this.setUserInvalid(true);
  };

  @Listen('invalid')
  protected hostInvalid(): void {
    this.handleInvalid();
  }

  private syncInputState(): void {
    if (!this.input) {
      return;
    }

    this.input.checked = this.checked;
    this.input.indeterminate = this.indeterminate;
    this.input.disabled = this.effectiveDisabled;
    this.input.tabIndex = this.effectiveDisabled ? -1 : 0;
    this.input.required = this.required && !checkboxGroupFor(this.host);
    this.input.value = this.value ?? 'on';
  }

  private syncFormValue(): void {
    const formValue = checkboxGroupFor(this.host)
      ? null
      : checkboxFormValue(this.checked, this.value);
    this.internals.setFormValue(formValue);
  }

  private syncValidity(): void {
    this.input?.setCustomValidity(this.customValidity);
    if (!this.input || this.effectiveDisabled || checkboxGroupFor(this.host)) {
      this.internals.setValidity({});
      this.message = '';
      this.setUserInvalid(false);
      return;
    }

    this.internals.setValidity(
      this.input.validity,
      fieldValidationMessage(this.customValidity, this.errorText, this.input.validationMessage),
      this.input,
    );
    this.message = this.internals.validationMessage;
  }

  private syncUserInvalidState(fromUserToggle: boolean): void {
    if (!this.input || checkboxGroupFor(this.host)) {
      return;
    }

    if (this.input.validity.valid) {
      this.setUserInvalid(false);
    } else if (fromUserToggle) {
      this.setUserInvalid(true);
    }
  }

  private setUserInvalid(invalid: boolean): void {
    this.setState('user-invalid', invalid);
    this.userInvalid = invalid;
  }

  private setState(name: string, enabled: boolean): void {
    if (name === 'user-invalid') {
      this.host.classList.toggle('ki-user-invalid', enabled);
    }

    if (enabled) {
      this.internals.states.add(name);
    } else {
      this.internals.states.delete(name);
    }
  }

  render() {
    const messages = {
      help: fieldText(this.helpText),
      error: this.userInvalid ? this.message : '',
    };
    return [
      <label htmlFor="ki-checkbox-control">
        <input
          id="ki-checkbox-control"
          ref={this.setInput}
          type="checkbox"
          tabIndex={this.effectiveDisabled ? -1 : 0}
          checked={this.checked}
          disabled={this.effectiveDisabled}
          required={this.required && !checkboxGroupFor(this.host)}
          value={this.value ?? 'on'}
          aria-describedby={fieldDescribedBy(messages)}
          aria-invalid={fieldInvalid(messages)}
          onInput={this.handleInput}
          onChange={this.handleChange}
        />
        <span part="control" aria-hidden="true">
          <svg class="mark mark-check" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M4 9.5 7.5 13 14 5" stroke="currentColor" />
          </svg>
          {/* Indeterminate dash: 8x2 fully-rounded rect centered in the 18px
              box (x 5..13 with round caps), per master 10030:982. */}
          <svg class="mark mark-dash" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M5 9h8" stroke="currentColor" />
          </svg>
        </span>
        <span part="label">
          {/* The slotted label keeps its own inline flow in one wrapper, so a
              hint beside it (spec 047) lays out two items, not one per
              slotted node. */}
          <span class="label-text">
            <slot />
          </span>
          <LabelHint hint={fieldText(this.labelHint)} />
        </span>
      </label>,
      <FieldMessage {...messages} />,
    ];
  }
}
