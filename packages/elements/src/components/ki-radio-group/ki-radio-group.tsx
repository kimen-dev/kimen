import { AttachInternals, Component, Element, Prop, State, Watch, h } from '@stencil/core';
import { normalizeBooleanPresence, radioGroupFormValue } from './ki-radio-group.form';

type KiRadioElement = HTMLElement & {
  disabled: boolean;
  value?: string;
};
interface MaybeFormValueInternals {
  setFormValue?: unknown;
}

/**
 * A token-styled radio group that owns selection, keyboard coordination and
 * form participation for slotted `ki-radio` options.
 *
 * When to use: a person must choose exactly one of a small set of mutually
 * exclusive options that should all be visible at once.
 * When NOT to use: many options or tight space (use `ki-select`), independent
 * on/off settings (use `ki-checkbox` or `ki-switch`), multiple selection, or
 * authored selection on options; set this group's `value` instead.
 *
 * @slot - `ki-radio` options. Document order is navigation order.
 * @part label - Visible group label and accessible-name source.
 */
@Component({
  tag: 'ki-radio-group',
  styleUrl: 'ki-radio-group.css',
  shadow: true,
  formAssociated: true,
})
export class KiRadioGroup {
  @Element() private readonly host!: HTMLElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  @State() private roster: KiRadioElement[] = [];
  @State() private selectedRadio: KiRadioElement | null = null;
  @State() private formDisabled = false;

  private readonly labelId = `label-${Math.random().toString(36).slice(2)}`;
  private disabledObserver?: MutationObserver;
  private suppressValueWatch = false;

  /**
   * Form-data key for the selected option's value. Omit when the group should
   * not contribute a form entry.
   * When NOT to use: do not put `name` on `ki-radio` options; their internal
   * native inputs are intentionally unnamed.
   */
  @Prop({ reflect: true }) name?: string;

  /**
   * Projection of the current selection. The initial attribute selects the
   * first matching option; unmatched values leave the group unselected and
   * operable. Assigning the property updates selection silently.
   * When NOT to use: never author selection on `ki-radio`; set this value.
   *
   * @default ''
   */
  @Prop({ mutable: true }) value = '';

  /**
   * Visible label and accessible-name source for the radiogroup.
   * When NOT to use: do not omit it; unlabeled groups fail accessibility gates.
   */
  @Prop({ reflect: true }) label!: string;

  /**
   * Requires one selected option for form submission. The group uses platform
   * `valueMissing` from its internal native radio inputs.
   * When NOT to use: do not use required when no answer is acceptable.
   *
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) required = false;

  /**
   * Makes the whole group unavailable, skips it in Tab order and removes its
   * form entry.
   * When NOT to use: do not use disabled for pending/loading semantics.
   *
   * @default false
   */
  @Prop({ reflect: true, mutable: true }) disabled = false;

  @Watch('value')
  protected handleValueChange(): void {
    if (this.suppressValueWatch) {
      return;
    }
    this.selectByValue(this.value, false);
  }

  @Watch('disabled')
  @Watch('required')
  protected normalizeBooleanProps(): void {
    const normalizedDisabled = normalizeBooleanPresence(
      this.host.hasAttribute('disabled') ? this.host.getAttribute('disabled') : this.disabled,
    );
    const normalizedRequired = normalizeBooleanPresence(
      this.host.hasAttribute('required') ? this.host.getAttribute('required') : this.required,
    );

    if (this.disabled !== normalizedDisabled) {
      this.disabled = normalizedDisabled;
    }
    if (this.required !== normalizedRequired) {
      this.required = normalizedRequired;
    }
    this.syncInputs();
  }

  private get effectiveDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  componentWillLoad(): void {
    this.normalizeBooleanProps();
  }

  componentDidLoad(): void {
    this.host.addEventListener('input', this.handleInput, { capture: true });
    this.syncRoster();
  }

  disconnectedCallback(): void {
    this.host.removeEventListener('input', this.handleInput, { capture: true });
    this.disabledObserver?.disconnect();
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.syncInputs();
  }

  private readonly handleSlotChange = (): void => {
    this.syncRoster();
  };

  private readonly handleInput = (event: Event): void => {
    const radio = event
      .composedPath()
      .find((target): target is KiRadioElement => this.isKiRadio(target));

    if (!radio || !this.roster.includes(radio) || this.effectiveDisabled || radio.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (radio === this.selectedRadio) {
      return;
    }

    this.setSelectedRadio(radio);
    setTimeout(() => {
      this.host.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }, 0);
  };

  private syncRoster(): void {
    const slot = this.host.shadowRoot?.querySelector('slot');
    const assigned = slot
      ?.assignedElements()
      .filter((element): element is KiRadioElement => this.isKiRadio(element));
    this.roster = assigned ?? [];
    this.disabledObserver?.disconnect();
    if (typeof MutationObserver !== 'function') {
      this.reconcileSelection();
      return;
    }
    this.disabledObserver = new MutationObserver(() => {
      this.reconcileSelection();
    });
    for (const radio of this.roster) {
      this.disabledObserver.observe(radio, { attributes: true, attributeFilter: ['disabled'] });
    }
    this.reconcileSelection();
  }

  private reconcileSelection(): void {
    if (this.selectedRadio && !this.roster.includes(this.selectedRadio)) {
      this.setSelectedRadio(null);
      return;
    }

    if (!this.selectedRadio && this.value) {
      this.selectByValue(this.value, false);
      return;
    }

    this.syncInputs();
  }

  private selectByValue(value: string, emit: boolean): void {
    const radio = this.roster.find((candidate) => this.optionValue(candidate) === value) ?? null;
    this.setSelectedRadio(radio, emit);
  }

  private setSelectedRadio(radio: KiRadioElement | null, emit = false): void {
    this.selectedRadio = radio;
    this.suppressValueWatch = true;
    this.value = radio ? this.optionValue(radio) : '';
    this.suppressValueWatch = false;
    this.syncInputs();

    if (emit) {
      this.host.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
  }

  private syncInputs(): void {
    for (const radio of this.roster) {
      const input = this.inputFor(radio);
      if (!input) {
        continue;
      }
      const unavailable = this.effectiveDisabled || radio.disabled;
      input.checked = radio === this.selectedRadio;
      input.disabled = unavailable;
      input.tabIndex = unavailable || radio !== this.tabStopRadio() ? -1 : 0;
    }

    const setFormValue = (this.internals as MaybeFormValueInternals).setFormValue;
    if (typeof setFormValue === 'function') {
      setFormValue.call(this.internals, radioGroupFormValue(this.selectedFormOption()));
    }
  }

  private selectedFormOption(): { disabled: boolean; value?: string } | null {
    if (!this.selectedRadio) {
      return null;
    }

    const option = {
      disabled: this.effectiveDisabled || this.selectedRadio.disabled,
    };
    const value = this.selectedRadio.value;

    return value === undefined ? option : { ...option, value };
  }

  private tabStopRadio(): KiRadioElement | null {
    if (this.effectiveDisabled) {
      return null;
    }

    if (this.selectedRadio && !this.selectedRadio.disabled) {
      return this.selectedRadio;
    }

    return this.roster.find((radio) => !radio.disabled) ?? null;
  }

  private optionValue(radio: KiRadioElement): string {
    return radio.value ?? 'on';
  }

  private inputFor(radio: KiRadioElement): HTMLInputElement | null {
    return radio.shadowRoot?.querySelector('input') ?? null;
  }

  private isKiRadio(target: EventTarget): target is KiRadioElement {
    return target instanceof HTMLElement && target.localName === 'ki-radio';
  }

  render() {
    return (
      <div>
        <span part="label" id={this.labelId}>
          {this.label}
        </span>
        <div
          role="radiogroup"
          aria-labelledby={this.labelId}
          aria-disabled={this.effectiveDisabled ? 'true' : null}
        >
          <slot onSlotchange={this.handleSlotChange} />
        </div>
      </div>
    );
  }
}
