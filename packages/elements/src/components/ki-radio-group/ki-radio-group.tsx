import { AttachInternals, Component, Element, Prop, State, Watch, h } from '@stencil/core';
import { normalizeBooleanPresence, radioGroupFormValue } from './ki-radio-group.form';
import { arrowDirection, nextEnabledIndex } from './ki-radio-group.keyboard';

type KiRadioElement = HTMLElement & {
  disabled: boolean;
  value?: string;
};
interface MaybeFormValueInternals {
  setFormValue?: unknown;
  setValidity?: unknown;
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
  @State() private userInvalid = false;

  // Scoped to this group's shadow root, so a static id is unambiguous
  // (review 007 minor; matches the 003 call).
  private readonly labelId = 'group-label';
  private disabledObserver?: MutationObserver;
  private resetValue = '';
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

  /**
   * Platform validation message for the current group validity state. Empty
   * when the group is valid.
   * When NOT to use: do not parse or localize this value in application code;
   * it is provided by the browser.
   */
  get validationMessage(): string {
    return this.internals.validationMessage;
  }

  @Watch('value')
  protected handleValueChange(): void {
    if (this.suppressValueWatch) {
      return;
    }
    this.selectByValue(this.value);
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
    this.host.addEventListener('keydown', this.handleKeyDown);
    this.host.addEventListener('focusin', this.handleFocusIn);
    this.host.addEventListener('invalid', this.handleInvalid);
    this.syncRoster();
  }

  disconnectedCallback(): void {
    this.host.removeEventListener('input', this.handleInput, { capture: true });
    this.host.removeEventListener('keydown', this.handleKeyDown);
    this.host.removeEventListener('focusin', this.handleFocusIn);
    this.host.removeEventListener('invalid', this.handleInvalid);
    this.disabledObserver?.disconnect();
  }

  formAssociatedCallback(): void {
    this.resetValue = this.value;
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.syncInputs();
  }

  formResetCallback(): void {
    this.userInvalid = false;
    this.selectByValue(this.resetValue);
  }

  private readonly handleSlotChange = (): void => {
    this.syncRoster();
  };

  private readonly handleInvalid = (): void => {
    this.userInvalid = true;
  };

  private lastFocusedRadio: KiRadioElement | null = null;

  private readonly handleFocusIn = (event: Event): void => {
    const target = event.target as Node | null;
    this.lastFocusedRadio = this.roster.find((radio) => radio === target) ?? null;
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

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const direction = arrowDirection(event.key, this.host.matches(':dir(rtl)'));
    if (direction === null || this.effectiveDisabled) {
      return;
    }

    const currentRadio = event
      .composedPath()
      .find((target): target is KiRadioElement => this.isKiRadio(target));
    const currentIndex = currentRadio ? this.roster.indexOf(currentRadio) : -1;
    if (currentIndex < 0) {
      return;
    }

    const nextIndex = nextEnabledIndex(
      this.roster.map((radio) => radio.disabled),
      currentIndex,
      direction,
    );
    if (nextIndex === null) {
      return;
    }

    const nextRadio = this.roster[nextIndex];
    if (!nextRadio) {
      return;
    }

    const input = this.inputFor(nextRadio);
    if (!input) {
      return;
    }

    event.preventDefault();
    input.focus();
    input.click();
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
    // FR-006: if the option that HELD focus becomes disabled at runtime, the
    // browser has already dropped focus to <body> by the time this observer
    // fires — so we track the last-focused option (focusin retargets slotted
    // radios to their host) rather than reading a now-stale activeElement, and
    // move focus to the group's new single tab stop so a keyboard user keeps
    // their place.
    // Capture intent from the attribute (synchronous with setAttribute) BEFORE
    // syncInputs disables the native input. The browser then blurs that input
    // to <body> ASYNCHRONOUSLY, so the focus restore is deferred to the next
    // frame (FR-006: keep the keyboard user on the group's new tab stop).
    const focusedWillDisable =
      this.lastFocusedRadio !== null &&
      (this.effectiveDisabled || this.lastFocusedRadio.hasAttribute('disabled'));

    if (this.selectedRadio && !this.roster.includes(this.selectedRadio)) {
      this.setSelectedRadio(null);
    } else if (!this.selectedRadio && this.value) {
      this.selectByValue(this.value);
    } else {
      this.syncInputs();
    }

    if (focusedWillDisable) {
      requestAnimationFrame(() => {
        if (document.activeElement !== document.body) {
          return; // focus already went somewhere deliberate; leave it
        }
        const anchor = this.tabStopRadio() ?? this.roster[0];
        if (anchor) {
          this.inputFor(anchor)?.focus();
          this.lastFocusedRadio = anchor;
        }
      });
    }
  }

  private selectByValue(value: string): void {
    const radio = this.roster.find((candidate) => this.optionValue(candidate) === value) ?? null;
    this.setSelectedRadio(radio);
  }

  private setSelectedRadio(radio: KiRadioElement | null): void {
    // Selection never dispatches change here; user-driven change is emitted
    // once from handleInput, programmatic selection stays silent (FR-002).
    this.selectedRadio = radio;
    this.suppressValueWatch = true;
    this.value = radio ? this.optionValue(radio) : '';
    this.suppressValueWatch = false;
    this.syncInputs();
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
      input.required = this.required && !this.selectedRadio && !this.effectiveDisabled;
      input.tabIndex = unavailable || radio !== this.tabStopRadio() ? -1 : 0;
    }

    const setFormValue = (this.internals as MaybeFormValueInternals).setFormValue;
    if (typeof setFormValue === 'function') {
      setFormValue.call(this.internals, radioGroupFormValue(this.selectedFormOption()));
    }
    this.syncValidity();
  }

  private syncValidity(): void {
    const setValidity = (this.internals as MaybeFormValueInternals).setValidity;
    if (typeof setValidity !== 'function') {
      return;
    }

    if (this.roster.length === 0) {
      return;
    }

    if (!this.required || this.selectedRadio || this.effectiveDisabled) {
      setValidity.call(this.internals, {});
      this.userInvalid = false;
      return;
    }

    const anchorRadio = this.tabStopRadio() ?? this.roster[0];
    const anchor = anchorRadio ? this.inputFor(anchorRadio) : null;
    if (!anchor) {
      return;
    }

    setValidity.call(this.internals, { valueMissing: true }, this.valueMissingMessage(), anchor);
  }

  private valueMissingMessage(): string {
    const probe = document.createElement('input');
    probe.required = true;
    return probe.validationMessage;
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
          aria-required={this.required ? 'true' : null}
          aria-invalid={this.userInvalid ? 'true' : null}
        >
          <slot onSlotchange={this.handleSlotChange} />
        </div>
      </div>
    );
  }
}
