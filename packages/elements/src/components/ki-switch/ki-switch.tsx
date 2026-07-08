import { Component, Element, Prop, State, Watch, h } from '@stencil/core';
import { checkedFromMarkup } from './ki-switch.form';

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
})
export class KiSwitch {
  @Element() private readonly host!: HTMLElement;

  /**
   * Live on/off state. Boolean presence semantics apply: any present
   * `checked` attribute value, including `checked="false"` or malformed
   * agent output, means on. Omit the attribute to express off.
   * When NOT to use: do not use a switch for choices saved only on submit;
   * use ki-checkbox for that pattern.
   *
   * @default false
   */
  @Prop({ mutable: true, reflect: true }) checked = false;

  /**
   * Prevents toggling, removes the switch from keyboard reach, excludes it
   * from form data, and exposes the unavailable state to assistive technology.
   * When NOT to use: do not use disabled for pending or loading states.
   *
   * @default false
   */
  @Prop({ reflect: true }) disabled = false;

  /**
   * Form-data key contributed while the switch is on.
   * When NOT to use: omit when no form entry should be submitted.
   */
  @Prop({ reflect: true }) name?: string;

  /**
   * Form-data value submitted while on. Omit for native checkbox parity: the
   * submitted value defaults to `on`.
   * When NOT to use: do not set a value to represent off; off contributes
   * nothing.
   */
  @Prop({ reflect: true }) value?: string;

  @State() private formDisabled = false;

  private input: HTMLInputElement | undefined;

  private get effectiveDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  componentWillLoad(): void {
    this.checked = checkedFromMarkup(this.host.hasAttribute('checked'), this.checked);
  }

  componentDidLoad(): void {
    this.syncInput();
  }

  @Watch('checked')
  protected checkedChanged(): void {
    this.syncInput();
  }

  @Watch('disabled')
  protected disabledChanged(): void {
    this.syncInput();
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

  private readonly handleChange = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
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
