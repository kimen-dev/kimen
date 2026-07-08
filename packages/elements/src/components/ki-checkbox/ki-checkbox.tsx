/* eslint-disable jsx-a11y/label-has-associated-control -- The shadow label wraps
 * the native input and slotted label text; static JSX analysis cannot see the
 * flattened-tree accessible name. */
import { AttachInternals, Component, Element, Listen, Prop, State, Watch, h } from '@stencil/core';
import { booleanFromAttributePresence, checkboxFormValue } from './ki-checkbox.form';

/**
 * A form-associated checkbox for selecting independent options.
 *
 * When to use: selecting one or more independent options that a form submits
 * later, including a "select all" parent that presents partial selection with
 * `indeterminate`. Always provide a visible label in the default slot.
 * When NOT to use: a single mutually exclusive choice, an immediate on/off
 * effect, triggering an action, unlabeled/icon-only usage, or
 * `checked="false"` to mean unchecked. Boolean attributes use presence
 * semantics; omit `checked` to express unchecked.
 *
 * @slot - Visible label content. This is the accessible name source and a
 * native activation surface.
 * @part control - Visual checkbox box, border, focus ring and currentColor marks.
 * @part label - Label wrapper around the default slot.
 */
@Component({
  tag: 'ki-checkbox',
  styleUrl: 'ki-checkbox.css',
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

  @State() private formDisabled = false;

  private input: HTMLInputElement | undefined;
  private resetBaseline = false;

  private get effectiveDisabled(): boolean {
    return this.disabled || this.formDisabled;
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
    this.syncInputState();
    this.syncFormValue();
    this.syncValidity();
  }

  @Watch('checked')
  protected checkedChanged(): void {
    if (this.input) {
      this.input.checked = this.checked;
    }
    this.syncFormValue();
    this.syncValidity();
    this.syncUserInvalidState(false);
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
  }

  @Watch('value')
  protected valueChanged(): void {
    this.syncFormValue();
  }

  formAssociatedCallback(): void {
    this.resetBaseline = this.checked;
    this.syncFormValue();
    this.syncValidity();
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.setState('fieldset-disabled', disabled);
    this.syncInputState();
    this.syncValidity();
  }

  formResetCallback(): void {
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
    this.input.required = this.required;
    this.input.value = this.value ?? 'on';
  }

  private syncFormValue(): void {
    const setFormValue = (this.internals as { setFormValue?: ElementInternals['setFormValue'] })
      .setFormValue;
    if (typeof setFormValue !== 'function') {
      return;
    }

    setFormValue.call(this.internals, checkboxFormValue(this.checked, this.value));
  }

  private syncValidity(): void {
    const setValidity = (this.internals as { setValidity?: ElementInternals['setValidity'] })
      .setValidity;
    if (typeof setValidity !== 'function') {
      return;
    }

    if (!this.input || this.effectiveDisabled) {
      setValidity.call(this.internals, {});
      this.setUserInvalid(false);
      return;
    }

    setValidity.call(this.internals, this.input.validity, this.input.validationMessage, this.input);
  }

  private syncUserInvalidState(fromUserToggle: boolean): void {
    if (!this.input) {
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
  }

  private setState(name: string, enabled: boolean): void {
    if (name === 'user-invalid') {
      this.host.classList.toggle('ki-user-invalid', enabled);
    }

    const states = (this.internals as { states?: CustomStateSet }).states;
    if (!states) {
      return;
    }

    if (enabled) {
      states.add(name);
    } else {
      states.delete(name);
    }
  }

  render() {
    return (
      <label htmlFor="ki-checkbox-control">
        <input
          id="ki-checkbox-control"
          ref={this.setInput}
          type="checkbox"
          checked={this.checked}
          disabled={this.effectiveDisabled}
          required={this.required}
          value={this.value ?? 'on'}
          onInput={this.handleInput}
          onChange={this.handleChange}
          onInvalid={this.handleInvalid}
        />
        <span part="control" aria-hidden="true">
          <svg class="mark mark-check" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M4 9.5 7.5 13 14 5" stroke="currentColor" />
          </svg>
          <svg class="mark mark-dash" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M4 9h10" stroke="currentColor" />
          </svg>
        </span>
        <span part="label">
          <slot />
        </span>
      </label>
    );
  }
}
