import {
  AttachInternals,
  Component,
  Element,
  Host,
  Listen,
  Prop,
  State,
  Watch,
  h,
} from '@stencil/core';
import {
  firstEnabled,
  keyIntent,
  lastEnabled,
  moveHighlight,
  openHighlight,
} from './ki-select.keyboard';
import {
  normalizeBooleanPresence,
  optionLabelText,
  optionValue,
  resolveSelection,
  selectFormValue,
  selectValueMissing,
  type SelectOptionRecord,
} from './ki-select.form';

type RosterOption = SelectOptionRecord & {
  element: HTMLElement;
  id: string;
};

/**
 * A form-associated select-only combobox for choosing one option from
 * declarative `ki-option` children.
 *
 * When to use: choose exactly one value from a known closed list, especially
 * when there are roughly five or more choices or space is limited.
 * When NOT to use: use `ki-radio-group` for a few always-visible choices,
 * `ki-input` for free or searchable text, `ki-checkbox`/`ki-switch` for
 * binary decisions, and never use it for multiselect or command menus.
 *
 * @slot - `ki-option` data children. They do not paint; rows are mirrored.
 * @part label - Visible label and accessible-name source.
 * @part trigger - Native button carrying the combobox role.
 * @part value - Displayed selection or placeholder.
 * @part indicator - Decorative dropdown indicator.
 * @part listbox - Popup listbox surface.
 * @part option - Mirrored option row rendered in this shadow root.
 */
@Component({
  tag: 'ki-select',
  styleUrl: 'ki-select.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class KiSelect {
  @Element() private readonly host!: HTMLElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  /**
   * Visible label and accessible-name source for the combobox trigger.
   * When NOT to use: do not omit it; unlabeled selects are invalid usage.
   */
  @Prop({ reflect: true }) label = '';

  /**
   * Text shown while no option is selected.
   * When NOT to use: do not use it as a replacement for `label`.
   */
  @Prop({ reflect: true }) placeholder = '';

  /**
   * Form-data key used when a selected option contributes its value.
   * When NOT to use: omit it when the select should not submit data.
   */
  @Prop({ reflect: true }) name?: string;

  /**
   * Live projection of the selected option value, or `""` when unselected.
   * Assigning it selects the first matching option silently; the attribute is
   * the reset/default declaration and is not updated by user commits.
   *
   * @default ''
   */
  @Prop({ mutable: true }) value = '';

  /**
   * Prevents opening, removes the trigger from keyboard reach, and excludes
   * the select from form submission. Boolean presence semantics apply.
   *
   * @default false
   */
  @Prop({ reflect: true }) disabled = false;

  /**
   * Requires a non-empty submitted value. The platform validation message is
   * donated by a hidden native select.
   *
   * @default false
   */
  @Prop({ reflect: true }) required = false;

  @State() private roster: RosterOption[] = [];
  @State() private open = false;
  @State() private highlightedIndex = -1;
  @State() private selectedIndex = -1;
  @State() private formDisabled = false;
  @State() private userInvalid = false;

  private readonly labelId = 'label';
  private readonly triggerId = 'trigger';
  private readonly listboxId = 'listbox';
  private mutationObserver: MutationObserver | undefined;
  private triggerElement?: HTMLButtonElement;
  private donorElement?: HTMLSelectElement;
  // Distinguishes "options never slotted yet" (retain a pending value for the
  // framework property-before-children path) from "options were present and
  // then emptied" (clear the value, per FR-004: the value reads '' once the
  // selected option disappears).
  private sawOptions = false;

  private get effectiveDisabled(): boolean {
    return (
      normalizeBooleanPresence(this.host.getAttribute('disabled') ?? this.disabled) ||
      this.formDisabled
    );
  }

  private get normalizedRequired(): boolean {
    return normalizeBooleanPresence(this.host.getAttribute('required') ?? this.required);
  }

  private get selectedOption(): RosterOption | null {
    return this.selectedIndex >= 0 ? (this.roster[this.selectedIndex] ?? null) : null;
  }

  connectedCallback(): void {
    this.host.addEventListener('focusout', this.handleFocusOut);
  }

  componentDidLoad(): void {
    this.reconcileRoster();
    this.syncValidity();
  }

  disconnectedCallback(): void {
    this.host.removeEventListener('focusout', this.handleFocusOut);
    this.detachOutsideListener();
    this.mutationObserver?.disconnect();
  }

  @Watch('value')
  protected valueChanged(nextValue: string): void {
    this.selectByValue(nextValue, false);
  }

  @Watch('disabled')
  @Watch('required')
  protected stateAttributeChanged(): void {
    if (this.effectiveDisabled) {
      this.close();
    }
    this.syncValidity();
  }

  @Listen('invalid')
  protected handleInvalid(): void {
    this.userInvalid = true;
  }

  formResetCallback(): void {
    this.userInvalid = false;
    this.selectByValue(this.host.getAttribute('value') ?? '', false);
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    if (disabled) {
      this.close();
    }
    this.syncValidity();
  }

  private readonly setTriggerRef = (element?: HTMLButtonElement): void => {
    if (element) {
      this.triggerElement = element;
    }
  };

  private readonly setDonorRef = (element?: HTMLSelectElement): void => {
    if (element) {
      this.donorElement = element;
      this.syncValidity();
    }
  };

  private readonly handleSlotChange = (): void => {
    this.reconcileRoster();
  };

  private readonly handleTriggerClick = (): void => {
    if (this.effectiveDisabled) {
      return;
    }
    if (this.open) {
      this.close();
      return;
    }
    this.openWithHighlight(openHighlight(this.roster, this.selectedIndex));
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (this.effectiveDisabled || event.altKey || event.metaKey || event.ctrlKey) {
      return;
    }

    const intent = keyIntent(event.key, this.open);
    if (!intent) {
      return;
    }

    if (intent !== 'tab') {
      event.preventDefault();
    }

    if (intent === 'open-selected') {
      this.openWithHighlight(openHighlight(this.roster, this.selectedIndex));
    } else if (intent === 'open-first') {
      this.openWithHighlight(firstEnabled(this.roster));
    } else if (intent === 'open-last') {
      this.openWithHighlight(lastEnabled(this.roster));
    } else if (intent === 'next') {
      this.highlight(moveHighlight(this.roster, this.highlightedIndex, 'next'));
    } else if (intent === 'previous') {
      this.highlight(moveHighlight(this.roster, this.highlightedIndex, 'previous'));
    } else if (intent === 'first') {
      this.highlight(firstEnabled(this.roster));
    } else if (intent === 'last') {
      this.highlight(lastEnabled(this.roster));
    } else if (intent === 'commit') {
      this.commit(this.highlightedIndex);
    } else {
      this.close();
    }
  };

  private readonly handleOutsidePointerDown = (event: PointerEvent): void => {
    if (!event.composedPath().includes(this.host)) {
      this.close();
    }
  };

  private readonly handleFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget;
    if (next instanceof Node && this.host.contains(next)) {
      return;
    }
    this.close();
  };

  private reconcileRoster(): void {
    const slot = this.host.shadowRoot?.querySelector('slot');
    const assigned = slot?.assignedElements({ flatten: true }) ?? [];
    const options = assigned.filter(
      (element) => element.localName === 'ki-option',
    ) as HTMLElement[];
    const selectedElement = this.selectedOption?.element;

    this.mutationObserver?.disconnect();
    this.mutationObserver =
      typeof MutationObserver === 'function'
        ? new MutationObserver(() => {
            this.reconcileRoster();
          })
        : undefined;

    this.roster = options.map((element, index) => {
      const text = optionLabelText(element);
      const label = text.trim();
      this.mutationObserver?.observe(element, {
        attributeFilter: ['value', 'disabled'],
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      });
      return {
        element,
        id: `option-${String(index)}`,
        label,
        value: optionValue(element.getAttribute('value'), text),
        disabled: element.hasAttribute('disabled'),
      };
    });

    if (this.roster.length > 0) {
      this.sawOptions = true;
    }

    if (selectedElement && this.roster.some((option) => option.element === selectedElement)) {
      this.selectedIndex = this.roster.findIndex((option) => option.element === selectedElement);
    } else {
      const declaredValue =
        this.value !== '' ? this.value : (this.host.getAttribute('value') ?? '');
      this.selectByValue(declaredValue, false);
    }

    if (this.open) {
      this.highlight(openHighlight(this.roster, this.selectedIndex));
    }
  }

  private selectByValue(value: string, emit: boolean): void {
    const selected = resolveSelection(this.roster, value);
    this.selectedIndex = selected ? this.roster.indexOf(selected) : -1;
    // Clear an unmatched value once options exist OR ever existed. A roster
    // that is empty and never had options means the children have not upgraded
    // yet (a framework assigning the `value` property before its <ki-option>s
    // connect); the request is retained so reconcileRoster resolves it when they
    // arrive. But once options have appeared, an unmatched value clears to ''
    // even if the roster was later emptied — the selection is gone (FR-004).
    if (selected || this.roster.length > 0 || this.sawOptions) {
      this.value = selected?.value ?? '';
    }
    this.syncValidity();

    if (emit) {
      this.host.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      this.host.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
  }

  private commit(index: number): void {
    const option = this.roster[index];
    this.close();
    if (!option || option.disabled || this.selectedIndex === index) {
      return;
    }
    this.selectedIndex = index;
    this.value = option.value;
    this.userInvalid = false;
    this.syncValidity();
    this.host.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.host.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  private openWithHighlight(index: number): void {
    this.open = true;
    this.highlightedIndex = index;
    document.addEventListener('pointerdown', this.handleOutsidePointerDown);
    requestAnimationFrame(() => {
      this.scrollHighlightedIntoView();
    });
  }

  private close(): void {
    this.open = false;
    this.highlightedIndex = -1;
    this.detachOutsideListener();
  }

  private detachOutsideListener(): void {
    document.removeEventListener('pointerdown', this.handleOutsidePointerDown);
  }

  private highlight(index: number): void {
    this.highlightedIndex = index;
    requestAnimationFrame(() => {
      this.scrollHighlightedIntoView();
    });
  }

  private scrollHighlightedIntoView(): void {
    if (this.highlightedIndex < 0) {
      return;
    }
    const id = this.roster[this.highlightedIndex]?.id;
    if (!id) {
      return;
    }
    this.host.shadowRoot?.getElementById(id)?.scrollIntoView({ block: 'nearest' });
  }

  private syncValidity(): void {
    const submittedValue = this.effectiveDisabled ? null : selectFormValue(this.selectedOption);
    if (typeof this.internals.setFormValue === 'function') {
      this.internals.setFormValue(submittedValue);
    }

    if (selectValueMissing(this.normalizedRequired, submittedValue)) {
      this.donorElement?.setAttribute('required', '');
      if (typeof this.internals.setValidity === 'function') {
        this.internals.setValidity(
          this.donorElement?.validity ?? { valueMissing: true },
          this.donorElement?.validationMessage,
          this.triggerElement,
        );
      }
    } else {
      if (typeof this.internals.setValidity === 'function') {
        this.internals.setValidity({});
      }
      this.userInvalid = false;
    }
  }

  private renderOption(option: RosterOption, index: number) {
    const highlighted = this.open && this.highlightedIndex === index;
    return (
      // Options are activated by pointer; all keyboard interaction lives on the
      // combobox trigger via aria-activedescendant (APG select-only), so these
      // rows intentionally carry no key handler of their own.
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events
      <div
        id={option.id}
        part="option"
        role="option"
        aria-selected={this.selectedIndex === index ? 'true' : 'false'}
        aria-disabled={option.disabled ? 'true' : null}
        data-highlighted={highlighted ? 'true' : null}
        tabindex="-1"
        onClick={() => {
          this.commit(index);
        }}
      >
        {option.label}
      </div>
    );
  }

  render() {
    const selected = this.selectedOption;
    const displayValue = selected?.label ?? this.placeholder;
    const activeId =
      this.open && this.highlightedIndex >= 0 ? this.roster[this.highlightedIndex]?.id : undefined;

    return (
      <Host>
        <label id={this.labelId} part="label" htmlFor={this.triggerId}>
          {this.label}
        </label>
        <button
          ref={this.setTriggerRef}
          id={this.triggerId}
          part="trigger"
          type="button"
          role="combobox"
          aria-expanded={this.open ? 'true' : 'false'}
          aria-controls={this.listboxId}
          aria-activedescendant={activeId}
          aria-required={this.normalizedRequired ? 'true' : null}
          aria-invalid={this.userInvalid ? 'true' : null}
          disabled={this.effectiveDisabled}
          onClick={this.handleTriggerClick}
          onKeyDown={this.handleKeyDown}
        >
          <span part="value" data-placeholder={selected ? null : 'true'}>
            {displayValue}
          </span>
          <span part="indicator" aria-hidden="true" />
        </button>
        <div
          id={this.listboxId}
          part="listbox"
          role="listbox"
          aria-labelledby={this.labelId}
          hidden={!this.open}
        >
          {this.roster.map((option, index) => this.renderOption(option, index))}
        </div>
        <div class="data-slot" hidden>
          <slot onSlotchange={this.handleSlotChange} />
        </div>
        <select
          ref={this.setDonorRef}
          class="validity-donor"
          tabindex="-1"
          aria-hidden="true"
          required
        />
      </Host>
    );
  }
}
