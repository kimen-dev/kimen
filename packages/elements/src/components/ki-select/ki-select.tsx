import {
  AttachInternals,
  Component,
  Element,
  Host,
  h,
  Listen,
  Prop,
  State,
  Watch,
} from '@stencil/core';
import { isOutsideOverlay, setOverlayOpen } from '../../utils/anchored-overlay';
import {
  booleanFromAttributePresence,
  observeAttributePresence,
} from '../../utils/boolean-presence';
import { childDisabled, childValue } from '../../utils/child-props';
import {
  FieldMessage,
  fieldDescribedBy,
  fieldInvalid,
  fieldText,
  fieldValidationMessage,
} from '../../utils/field-message';
import { LabelHint } from '../../utils/label-hint';
import { extendTypeahead, typeaheadIndex } from '../../utils/typeahead';
import {
  normalizeBooleanPresence,
  optionLabelText,
  optionValue,
  resolveSelection,
  type SelectOptionRecord,
  selectFormValue,
  selectValueMissing,
} from './ki-select.form';
import { keyIntent, moveHighlight, openHighlight } from './ki-select.keyboard';

export type KiSelectSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

type RosterOption = SelectOptionRecord & {
  element: HTMLElement;
  id: string;
};

/**
 * A form-associated select-only combobox for choosing one option from
 * declarative `ki-option` children.
 *
 * Like a native field, it answers `checkValidity()`, `reportValidity()`,
 * `setCustomValidity(message)`, `validity`, `validationMessage` and
 * `willValidate` synchronously on a defined custom element.
 *
 * @whenToUse choose exactly one value from a known closed list, especially
 * when there are roughly five or more choices or space is limited.
 * @whenNotToUse `ki-radio-group` for a few always-visible choices,
 * `ki-input` for free or searchable text, `ki-checkbox`/`ki-switch` for
 * binary decisions, or multiselect and command menus.
 *
 * @slot - `ki-option` data children. They do not paint; rows are mirrored.
 * @part label - Visible label and accessible-name source.
 * @part label-hint - The `label-hint` text after the label text, inside the label and
 * part of the accessible name of the combobox and its listbox; rendered only while a
 * hint is set.
 * @part trigger - Native button carrying the combobox role.
 * @part value - Displayed selection or placeholder.
 * @part indicator - Decorative dropdown indicator.
 * @part listbox - Popup listbox surface.
 * @part option - Mirrored option row rendered in this shadow root.
 * @part help - Help line under the trigger, read as the combobox description.
 * @part error - Error line shown in place of the help text while the select is
 * invalid after the person chose or submitted; a polite live region, starting with
 * a decorative error symbol.
 * @event change - Fired once after the user commits a different option, composed
 * across the shadow boundary and preceded by `input`; `value` is already
 * current when listeners run. When to use: react to the committed choice.
 * When NOT to use: do not expect it for programmatic `value` writes, which
 * are silent.
 */
@Component({
  tag: 'ki-select',
  styleUrls: ['../../utils/field-message.css', '../../utils/label-hint.css', 'ki-select.css'],
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
  @Prop({ reflect: true }) label!: string;

  /**
   * Short text shown after the label and read with it as part of the
   * combobox name, so people know before submitting whether to choose:
   * "(optional)" on the few optional fields of a mostly required form, or
   * "(required)" the other way round, in the page's own language. It changes
   * no validation; set `required` for that, and keep the two consistent.
   * When NOT to use: do not put instructions in it (use `help-text`), errors
   * (use `error-text`), or a repeat of the label.
   */
  @Prop({ reflect: true }) labelHint?: string;

  /**
   * Text shown while no option is selected.
   * When NOT to use: do not use it as a replacement for `label`.
   */
  @Prop({ reflect: true }) placeholder = '';

  /**
   * Token-backed trigger size (`--ki-select-{size}-*` tokens): the trigger is
   * 24, 32, 40, 48 or 56px tall in onmars, with its padding, radius, text and
   * indicator; the label and help text follow in three steps. The listbox
   * and its options keep their size. An unrecognized value matches no style
   * rule and keeps the medium metrics.
   * When to use: match the size of the fields around it.
   * When NOT to use: do not pick a smaller size to fit a dense region or a
   * larger one for touch; declare `data-ki-density` on the region instead,
   * which composes with every size.
   *
   * @default 'md'
   */
  @Prop({ reflect: true }) size: KiSelectSize = 'md';

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

  /**
   * One line of help under the trigger, read with it as the combobox
   * description: what the choice decides. While an error shows, the error
   * takes its place.
   * When NOT to use: do not repeat the label, and do not use it for error
   * messages; use `error-text`.
   */
  @Prop({ reflect: true }) helpText?: string;

  /**
   * Message shown in place of the help text once a `required` select is left
   * without a choice, and its `validationMessage` ("Choose a country").
   * Without it the browser's own message shows, in the browser's language. An
   * error set with `custom-error` or `setCustomValidity` outranks it.
   * When NOT to use: do not use it for server-side or cross-field errors; set
   * `custom-error` or call `setCustomValidity` for those.
   */
  @Prop({ reflect: true }) errorText?: string;

  /**
   * An error of the application's own, such as a server-side verdict on the
   * submitted choice ("We do not ship there"). While it holds text the select
   * is invalid, blocks its form, shows the text in place of the help text at
   * once and is announced as invalid. It stops counting when the person
   * chooses another option, or when the form is reset, so it never blocks the
   * corrected answer. It outranks `error-text` and an error set with
   * `setCustomValidity`.
   * When to use: report a verdict from a declarative spec, a live update or a
   * framework binding. Remove it when a new attempt starts.
   * When NOT to use: do not use it for a `required` select left without a
   * choice; `error-text` words that. Setting the same text again while the
   * prop still holds it shows nothing: remove it first, then set it again.
   */
  @Prop({ reflect: true }) customError?: string;

  @State() private roster: RosterOption[] = [];
  @State() private open = false;
  @State() private highlightedIndex = -1;
  @State() private selectedIndex = -1;
  @State() private formDisabled = false;
  @State() private userInvalid = false;
  // The validation message last handed to ElementInternals (D4).
  @State() private message = '';

  private readonly labelId = 'label';
  private readonly triggerId = 'trigger';
  private readonly listboxId = 'listbox';
  private mutationObserver: MutationObserver | undefined;
  private presenceObserver: MutationObserver | undefined;
  private triggerElement?: HTMLButtonElement;
  private listboxElement?: HTMLElement;
  private donorElement?: HTMLSelectElement;
  // Distinguishes "options never slotted yet" (retain a pending value for the
  // framework property-before-children path) from "options were present and
  // then emptied" (clear the value, per FR-004: the value reads '' once the
  // selected option disappears).
  private sawOptions = false;
  // A value requested by attribute, property or reset that no option carries
  // yet. `value` reads '' meanwhile (FR-004), and the request is honoured when
  // an option carrying it arrives, loads or takes that value: frameworks and
  // streamed generated UI set the value before the options exist, and nobody
  // sets it again. Another value, the user's choice or a form reset replaces
  // it. Writing '' does not: `value` already reads '' while it waits, so that
  // write is no change and reaches no watcher (ki-radio-group shares the
  // limit).
  private pendingValue = '';
  // True while `value` is written to project the selection, so the watch does
  // not take the projection for a new request and drop the pending one.
  private projecting = false;
  private typed = '';
  private typedAt = 0;

  private get effectiveDisabled(): boolean {
    return (
      normalizeBooleanPresence(this.host.getAttribute('disabled') ?? this.disabled) ||
      this.formDisabled
    );
  }

  private get selectedOption(): RosterOption | null {
    return this.selectedIndex >= 0 ? (this.roster[this.selectedIndex] ?? null) : null;
  }

  // The application's own error (setCustomValidity); '' when none. It is
  // reapplied on every validity sync, so the control's own revalidation never
  // drops it.
  private customValidity = '';

  // Whether the person's choice or a form reset withdrew `custom-error`.
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
   * Validation message for the current validity state: the browser's, or the
   * error set with `setCustomValidity`. Empty when the control is valid.
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

  connectedCallback(): void {
    this.host.addEventListener('focusout', this.handleFocusOut);
    // Presence semantics for attributes written after hydration: Stencil parses
    // `disabled="false"` to `false` and would remove the attribute on reflect.
    this.presenceObserver?.disconnect();
    this.presenceObserver = observeAttributePresence(
      this.host,
      ['disabled', 'required'],
      this.handlePresentAttribute,
    );
    // Removal from the document hides a popover; a select moved while open
    // shows its list again where it lands.
    // Only an explicit opening arms outside-pointer dismiss.
    setOverlayOpen(this.listboxElement, this.open);
    // disconnectedCallback released the options observer, and the options may
    // have changed while the select was out of the document: a select that is
    // moved (a keyed reorder, a drag between lists) connects again without
    // loading again. On the first connection the slot is not rendered yet:
    // componentDidLoad reads the options.
    this.reconcileRoster();
  }

  componentWillLoad(): void {
    this.disabled = booleanFromAttributePresence(this.disabled, this.host.hasAttribute('disabled'));
    this.required = booleanFromAttributePresence(this.required, this.host.hasAttribute('required'));
  }

  componentDidLoad(): void {
    this.reconcileRoster();
    this.syncValidity();
  }

  disconnectedCallback(): void {
    this.host.removeEventListener('focusout', this.handleFocusOut);
    document.removeEventListener('pointerdown', this.handleOutsidePointerDown);
    this.mutationObserver?.disconnect();
    this.presenceObserver?.disconnect();
    this.presenceObserver = undefined;
  }

  private readonly handlePresentAttribute = (attribute: string): void => {
    if (attribute === 'disabled' && !this.disabled) {
      this.disabled = true;
    } else if (attribute === 'required' && !this.required) {
      this.required = true;
    }
  };

  @Watch('value')
  protected valueChanged(nextValue: string): void {
    if (this.projecting) {
      return;
    }
    this.selectByValue(nextValue);
  }

  @Watch('errorText')
  protected errorTextChanged(): void {
    this.syncValidity();
  }

  @Watch('customError')
  protected customErrorChanged(): void {
    this.customErrorWithdrawn = false;
    this.syncValidity();
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
    this.customErrorWithdrawn = true;
    this.userInvalid = false;
    this.selectByValue(this.host.getAttribute('value') ?? '');
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

  private readonly setListboxRef = (element?: HTMLElement): void => {
    if (element) {
      this.listboxElement = element;
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

    if (intent === 'type') {
      this.typeahead(event.key);
      return;
    }
    if (intent === 'close' || intent === 'tab') {
      this.close();
      return;
    }
    if (!this.open && intent !== 'first' && intent !== 'last') {
      this.handleTriggerClick();
      return;
    }
    if (intent === 'activate') {
      this.commit(this.highlightedIndex);
      return;
    }

    const index = moveHighlight(this.roster, this.highlightedIndex, intent);
    if (this.open) {
      this.highlight(index);
    } else {
      this.openWithHighlight(index);
    }
  };

  private readonly handleOutsidePointerDown = (event: PointerEvent): void => {
    if (isOutsideOverlay(event, this.host)) {
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
    if (!slot) {
      // Nothing rendered yet: there are no options to read.
      return;
    }
    const assigned = slot.assignedElements({ flatten: true });
    const options = assigned.filter(
      (element) => element.localName === 'ki-option',
    ) as HTMLElement[];
    const selectedElement = this.selectedOption?.element;

    this.mutationObserver?.disconnect();
    this.mutationObserver = new MutationObserver(() => {
      this.reconcileRoster();
    });

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
        value: optionValue(childValue(element), text),
        disabled: childDisabled(element),
      };
    });

    if (this.roster.length > 0) {
      this.sawOptions = true;
    }

    if (selectedElement && this.roster.some((option) => option.element === selectedElement)) {
      this.selectedIndex = this.roster.findIndex((option) => option.element === selectedElement);
      // The selected option survived reconciliation, but its `value` attribute
      // may have changed (the observer watches it); mirror it so the property
      // and submitted form value are not stale (codex review). Silent — a
      // programmatic mutation is not a user-driven change.
      const current = this.roster[this.selectedIndex];
      if (current && current.value !== this.value) {
        this.value = current.value;
        this.syncValidity();
      }
    } else if (this.pendingValue !== '' || this.value !== '' || this.host.hasAttribute('value')) {
      // In order: a request still waiting for its option; the value itself,
      // set before any option could carry it or left by an option that has
      // just gone and that another one may carry too; the declared attribute.
      const declaredValue =
        this.pendingValue !== ''
          ? this.pendingValue
          : this.value !== ''
            ? this.value
            : (this.host.getAttribute('value') ?? '');
      this.selectByValue(declaredValue);
      if (selectedElement) {
        // The selected option left and no other carries its value: the
        // selection is gone, not waiting to come back (FR-004).
        this.pendingValue = '';
      }
    } else {
      // No declared default: an option carrying value="" must NOT be
      // auto-selected — show the placeholder and submit nothing (S2/S24,
      // codex review).
      this.selectedIndex = -1;
      this.value = '';
      this.syncValidity();
    }

    if (this.open) {
      this.highlight(openHighlight(this.roster, this.selectedIndex));
    }
  }

  private selectByValue(value: string): void {
    const selected = resolveSelection(this.roster, value);
    this.selectedIndex = selected ? this.roster.indexOf(selected) : -1;
    this.pendingValue = selected ? '' : value;
    // Clear an unmatched value once options exist OR ever existed. A roster
    // that is empty and never had options means the children have not upgraded
    // yet (a framework assigning the `value` property before its <ki-option>s
    // connect); the request is retained so reconcileRoster resolves it when they
    // arrive. But once options have appeared, an unmatched value clears to ''
    // even if the roster was later emptied — the selection is gone (FR-004).
    if (selected || this.roster.length > 0 || this.sawOptions) {
      this.projecting = true;
      this.value = selected?.value ?? '';
      this.projecting = false;
    }
    this.syncValidity();
  }

  private commit(index: number): void {
    // Select-only combobox: DOM focus belongs on the trigger. A pointer press
    // moves it onto the pressed row, which is then hidden with the popup (focus
    // falls to the body) or, for a disabled row, stays open with the keyboard
    // handlers out of reach. Keyboard commits are already there: a no-op.
    this.triggerElement?.focus();
    const option = this.roster[index];
    // Activating a disabled (or missing) option does nothing and leaves the
    // popup open — closing first would change interaction state and force a
    // reopen (S4 / research D5, codex review).
    if (!option || option.disabled) {
      return;
    }
    this.close();
    if (this.selectedIndex === index) {
      return;
    }
    this.selectedIndex = index;
    // The user's choice settles any request that was still waiting.
    this.pendingValue = '';
    this.customErrorWithdrawn = true;
    this.value = option.value;
    this.userInvalid = false;
    this.syncValidity();
    this.host.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.host.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  private typeahead(character: string): void {
    const now = performance.now();
    this.typed = extendTypeahead(this.typed, character, now - this.typedAt);
    this.typedAt = now;

    // Closed, the search starts from the selection the popup would open on.
    const from = this.open ? this.highlightedIndex : this.selectedIndex;
    const match = typeaheadIndex(this.roster, this.typed, from);
    if (match < 0) {
      // Nothing starts with the string: drop it so the next key starts afresh.
      this.typed = '';
    }

    if (!this.open) {
      this.openWithHighlight(match < 0 ? openHighlight(this.roster, this.selectedIndex) : match);
    } else if (match >= 0) {
      this.highlight(match);
    }
  }

  private openWithHighlight(index: number): void {
    this.open = true;
    setOverlayOpen(this.listboxElement, this.open);
    this.highlight(index);
    document.addEventListener('pointerdown', this.handleOutsidePointerDown);
  }

  private close(): void {
    this.open = false;
    setOverlayOpen(this.listboxElement, this.open);
    this.highlightedIndex = -1;
    document.removeEventListener('pointerdown', this.handleOutsidePointerDown);
  }

  private highlight(index: number): void {
    this.highlightedIndex = index;
    requestAnimationFrame(() => {
      this.scrollHighlightedIntoView();
    });
  }

  private scrollHighlightedIntoView(): void {
    const id = this.roster[this.highlightedIndex]?.id;
    if (!id) {
      return;
    }
    this.host.shadowRoot?.getElementById(id)?.scrollIntoView({ block: 'nearest' });
  }

  private syncValidity(): void {
    // Disabled controls are barred from constraint validation, so a disabled
    // required-but-empty select must not stay value-missing / user-invalid
    // (codex review).
    if (this.effectiveDisabled) {
      this.internals.setFormValue(null);
      this.internals.setValidity({});
      this.message = '';
      this.userInvalid = false;
      return;
    }

    const submittedValue = selectFormValue(this.selectedOption);
    this.internals.setFormValue(submittedValue);

    // `required` is read from the property, never from the host attribute:
    // Stencil un-reflects a cleared property only at the next render, so the
    // attribute is still present when the watch calls this and would keep a
    // select whose `required` was just set to `false` blocking its form.
    // Presence semantics already reached the property (componentWillLoad and
    // the attribute observer).
    const valueMissing = selectValueMissing(this.required, submittedValue);
    const customError = this.customErrorWithdrawn ? '' : fieldText(this.customError);
    const applicationError = customError || this.customValidity;
    if (applicationError !== '') {
      // The application's error outranks the platform message, as on a
      // native select; a missing value still shows in the flags.
      this.internals.setValidity(
        { customError: true, valueMissing },
        applicationError,
        this.triggerElement,
      );
      // A custom error shows at once, without a submission (D2).
      if (customError !== '') {
        this.userInvalid = true;
      }
    } else if (valueMissing) {
      this.donorElement?.setAttribute('required', '');
      this.internals.setValidity(
        this.donorElement?.validity ?? { valueMissing: true },
        fieldValidationMessage('', this.errorText, this.donorElement?.validationMessage ?? ''),
        this.triggerElement,
      );
    } else {
      this.internals.setValidity({});
      this.userInvalid = false;
    }
    this.message = this.internals.validationMessage;
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
    const activeId = this.open ? this.roster[this.highlightedIndex]?.id : undefined;
    const messages = {
      help: fieldText(this.helpText),
      error: this.userInvalid ? this.message : '',
    };

    // Fixed nodes use stable keys to avoid shipping Stencil's generated hashes.
    return (
      <Host key="select">
        <label key="label" id={this.labelId} part="label" htmlFor={this.triggerId}>
          {this.label}
          {h(LabelHint, { hint: fieldText(this.labelHint) })}
        </label>
        <button
          key="trigger"
          ref={this.setTriggerRef}
          id={this.triggerId}
          part="trigger"
          type="button"
          tabIndex={this.effectiveDisabled ? -1 : 0}
          role="combobox"
          aria-expanded={this.open ? 'true' : 'false'}
          aria-controls={this.listboxId}
          aria-activedescendant={activeId}
          aria-required={this.required ? 'true' : null}
          aria-invalid={fieldInvalid(messages)}
          aria-describedby={fieldDescribedBy(messages)}
          disabled={this.effectiveDisabled}
          onClick={this.handleTriggerClick}
          onKeyDown={this.handleKeyDown}
        >
          <span key="value" part="value" data-placeholder={selected ? null : 'true'}>
            {displayValue}
          </span>
          <span key="indicator" part="indicator" aria-hidden="true" />
        </button>
        {h(FieldMessage, messages)}
        <div
          key="listbox"
          ref={this.setListboxRef}
          id={this.listboxId}
          part="listbox"
          role="listbox"
          aria-labelledby={this.labelId}
          popover="manual"
          hidden={!this.open}
        >
          {this.roster.map((option, index) => this.renderOption(option, index))}
        </div>
        <div key="data-slot" class="data-slot" hidden>
          <slot key="options" onSlotchange={this.handleSlotChange} />
        </div>
        <select
          key="donor"
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
