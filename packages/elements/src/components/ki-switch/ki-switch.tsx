import { AttachInternals, Component, Element, Prop, State, Watch, h } from '@stencil/core';
import { checkedFromMarkup, resolveSubmittedValue } from './ki-switch.form';

/**
 * A token-styled switch for immediate on/off settings.
 *
 * When to use: binary settings whose change takes effect immediately, always
 * with a slotted label.
 * When NOT to use: selections collected for later form submission; use
 * ki-checkbox for recorded choices, ki-radio-group for mutually exclusive
 * choices, and ki-button for actions.
 *
 * @slot - Label content. This is the accessible name source.
 * @part track - On/off channel.
 * @part thumb - Traveling handle.
 * @part label - Label wrapper around the default slot.
 */
@Component({
  tag: 'ki-switch',
  styleUrl: 'ki-switch.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class KiSwitch {
  @Element() private readonly host!: HTMLElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  /**
   * Live on/off state. Boolean presence semantics apply: any present
   * `checked` attribute value, including `checked="false"` or malformed
   * agent output, means on. Omit the attribute to express off.
   * When to use: set the initial on state for a setting that applies
   * immediately.
   * When NOT to use: do not use a switch for choices saved only on submit;
   * use ki-checkbox for that pattern.
   *
   * @default false
   */
  @Prop({ mutable: true, reflect: true }) checked = false;

  /**
   * Prevents toggling, removes the switch from keyboard reach, excludes it
   * from form data, and exposes the unavailable state to assistive technology.
   * When to use: make a setting temporarily unavailable while preserving its
   * current state.
   * When NOT to use: do not use disabled for pending or loading states.
   *
   * @default false
   */
  @Prop({ reflect: true }) disabled = false;

  /**
   * Form-data key contributed while the switch is on.
   * When to use: include the immediate setting in native form data when on.
   * When NOT to use: omit when no form entry should be submitted.
   *
   * @default undefined
   */
  @Prop({ reflect: true }) name?: string;

  /**
   * Form-data value submitted while on. Omit for native checkbox parity: the
   * submitted value defaults to `on`.
   * When to use: submit a domain-specific value instead of the default `on`.
   * When NOT to use: do not set a value to represent off; off contributes
   * nothing.
   *
   * @default 'on'
   */
  @Prop({ reflect: true }) value?: string;

  @State() private formDisabled = false;

  private input: HTMLInputElement | undefined;
  private resetChecked = false;

  private get effectiveDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  componentWillLoad(): void {
    this.checked = checkedFromMarkup(this.host.hasAttribute('checked'), this.checked);
  }

  componentDidLoad(): void {
    this.syncInput();
    this.syncFormValue();
  }

  @Watch('checked')
  protected checkedChanged(): void {
    this.syncInput();
    this.syncFormValue();
  }

  @Watch('disabled')
  protected disabledChanged(): void {
    this.syncInput();
  }

  @Watch('value')
  protected valueChanged(): void {
    this.syncFormValue();
  }

  formAssociatedCallback(): void {
    this.resetChecked = checkedFromMarkup(this.host.hasAttribute('checked'), this.checked);
    this.syncFormValue();
  }

  formResetCallback(): void {
    this.checked = this.resetChecked;
    this.syncInput();
    this.syncFormValue();
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.syncInput();
    this.syncFormValue();
  }

  private readonly setInput = (input: HTMLInputElement | undefined): void => {
    this.input = input;
    this.syncInput();
  };

  private syncInput(): void {
    if (!this.input) {
      return;
    }

    this.input.checked = this.checked;
    this.input.disabled = this.effectiveDisabled;
  }

  private syncFormValue(): void {
    if (typeof this.internals.setFormValue !== 'function') {
      return;
    }

    this.internals.setFormValue(resolveSubmittedValue(this.checked, this.value));
  }

  // The native `input` event is composed and reaches page listeners BEFORE
  // `change`, so `checked` and the form value must be current by then — a
  // consumer reading `new FormData(form)` from an `input` listener otherwise
  // sees the previous state (S1, codex review). Update on input; keep the
  // composed `change` dispatch below.
  private readonly handleInput = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    if (this.effectiveDisabled) {
      input.checked = this.checked;
      return;
    }
    this.checked = input.checked;
    this.syncFormValue();
  };

  private readonly handleChange = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    if (this.effectiveDisabled) {
      input.checked = this.checked;
      return;
    }
    this.checked = input.checked;
    this.host.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  };

  render() {
    return (
      // eslint-disable-next-line jsx-a11y/label-has-associated-control -- Shadow label wraps the native input and slotted accessible-name content.
      <label class="base">
        <input
          ref={this.setInput}
          type="checkbox"
          role="switch"
          checked={this.checked}
          disabled={this.effectiveDisabled}
          name={this.name ?? ''}
          value={this.value ?? 'on'}
          onInput={this.handleInput}
          onChange={this.handleChange}
        />
        <span part="track">
          <span part="thumb" />
        </span>
        <span part="label">
          <slot />
        </span>
      </label>
    );
  }
}
