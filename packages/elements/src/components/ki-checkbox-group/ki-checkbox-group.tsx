import {
  AttachInternals,
  Component,
  Element,
  Event,
  type EventEmitter,
  forceUpdate,
  h,
  Listen,
  Prop,
  State,
  Watch,
} from '@stencil/core';
import {
  booleanFromAttributePresence,
  observeAttributePresence,
} from '../../utils/boolean-presence';
import {
  type CheckboxGroupContext,
  checkboxGroupFor,
  checkboxGroupOptions,
  checkboxGroups,
} from '../../utils/checkbox-group-context';
import {
  FieldMessage,
  fieldDescribedBy,
  fieldInvalid,
  fieldText,
  fieldValidationMessage,
} from '../../utils/field-message';
import { checkboxGroupConstraint, checkboxGroupFormValue } from './ki-checkbox-group.form';

export type KiCheckboxGroupOrientation = 'vertical' | 'horizontal';

export interface KiCheckboxGroupChangeDetail {
  value: string[];
}

type CheckboxOption = HTMLElement & { checked: boolean; disabled: boolean; value?: string };

// Scoped to this group's shadow root, so a static id is unambiguous.
const LEGEND_ID = 'group-label';

/**
 * A form-associated group of independently selectable checkboxes.
 *
 * @whenToUse people may select several visible options that share a question,
 * form field, and optional selection limits.
 * @whenNotToUse mutually exclusive choices (use `ki-radio-group`) or an
 * immediate on/off setting (use `ki-switch`). Provide a group label.
 *
 * @slot - Direct `ki-checkbox` options, each with its own visible label and value.
 * Put form naming and constraints on the group.
 * @part label - Legend that names the group.
 * @part help - Guidance below the options and the group's accessible description.
 * @part error - Polite error message shown in place of the help.
 * @cssprop --ki-checkbox-group-gap - Space between options and group sections.
 */
@Component({
  tag: 'ki-checkbox-group',
  styleUrls: ['../../utils/field-message.css', 'ki-checkbox-group.css'],
  shadow: true,
  formAssociated: true,
})
export class KiCheckboxGroup {
  @Element() private readonly host!: HTMLElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  /**
   * Visible legend and accessible name for these choices.
   * When NOT to use: do not omit it unless the host's `aria-labelledby` names
   * the group from the page.
   *
   * Naming from the page: set `aria-labelledby` on the host to the ids of
   * elements in the same document or shadow root, such as the heading that
   * already asks the question. The group then takes its name from them,
   * followed by its own `label` when set. The ids are read when the group
   * renders and whenever the attribute changes.
   * When to use: the question is written on the page above the options; omit
   * `label` so the question is not shown, or read, twice.
   * When NOT to use: do not reference elements inside another component's
   * shadow root, which an id reference cannot reach.
   */
  @Prop({ reflect: true }) label!: string;

  /**
   * Hides the legend from view and from reading order while it stays the
   * group's accessible name, so a screen reader announces it once, as the
   * group's name.
   * When to use: the layout already makes the question obvious to sighted
   * people but the group still needs a name of its own.
   * When NOT to use: do not hide a legend that repeats a question already on
   * the page; point `aria-labelledby` at that question instead.
   *
   * @default false
   */
  @Prop({ reflect: true }) labelHidden = false;

  /** Form-data key repeated for each selected option. */
  @Prop({ reflect: true }) name?: string;

  /** One line of guidance displayed under the choices. */
  @Prop({ reflect: true }) helpText?: string;

  /** Localized message displayed for a failing selection limit. */
  @Prop({ reflect: true }) errorText?: string;

  /** Makes the group unavailable and excludes it from form submission. */
  @Prop({ reflect: true, mutable: true }) disabled = false;

  /** Minimum number of checked options, as a nonnegative integer. */
  @Prop({ reflect: true }) min?: number;

  /** Maximum number of checked options, as a nonnegative integer. */
  @Prop({ reflect: true }) max?: number;

  /** Lays choices out vertically or in a wrapping horizontal row. */
  @Prop({ reflect: true }) orientation: KiCheckboxGroupOrientation = 'vertical';

  private readonly defaultValue: string[] = [];

  /**
   * Selected values in option order. Assign a fresh array to update selection
   * silently. Initial checked options seed the group when this property is
   * omitted. In HTML and catalog specs use `checked` on each selected option.
   *
   * @default []
   */
  @Prop({ attribute: null, mutable: true }) value = this.defaultValue;

  /** Fires once for a committed user toggle with a copy of the current selection. */
  @Event({ eventName: 'ki-change', bubbles: true, composed: true, cancelable: false })
  kiChange!: EventEmitter<KiCheckboxGroupChangeDetail>;

  @State() private formDisabled = false;
  @State() private userInvalid = false;
  @State() private message = '';

  private ready = false;
  private updatingOptions = false;
  private options: CheckboxOption[] = [];
  private pendingValues = new Set<string>();
  private initialValue?: string[];
  private readonly initialOptions = new WeakSet<Element>();
  private readonly initialChecked = new WeakSet<CheckboxOption>();
  private presenceObserver?: MutationObserver;
  private fieldset: HTMLElement | undefined;
  private legend: HTMLElement | undefined;
  private customValidity = '';
  private readonly group: CheckboxGroupContext = {
    disabled: false,
    optionChanged: (option) => {
      if (!this.ready || this.updatingOptions || !this.host.isConnected) return;
      if (this.owns(option)) {
        this.applyPendingValues();
        this.syncSelection();
      } else {
        this.syncOptions();
      }
    },
  };

  private get effectiveDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  /** Current selection validity. Available synchronously on the custom-elements build. */
  get validity(): ValidityState {
    return this.internals.validity;
  }

  /** Current validation message. Available synchronously on the custom-elements build. */
  get validationMessage(): string {
    return this.internals.validationMessage;
  }

  /** Whether the field participates in constraint validation. Custom-elements build only. */
  get willValidate(): boolean {
    return this.internals.willValidate;
  }

  /** Returns validity and fires `invalid` when the field fails. Custom-elements build only. */
  checkValidity(): boolean {
    return this.internals.checkValidity();
  }

  /** Reports validation through the browser. Custom-elements build only. */
  reportValidity(): boolean {
    return this.internals.reportValidity();
  }

  /** Applies an application error until cleared with an empty string. Custom-elements build only. */
  setCustomValidity(message: string): void {
    this.customValidity = message;
    this.syncValidity();
  }

  connectedCallback(): void {
    checkboxGroups.set(this.host, this.group);
    this.presenceObserver = observeAttributePresence(
      this.host,
      ['disabled', 'label-hidden'],
      (attribute) => {
        if (attribute === 'label-hidden') this.labelHidden = true;
        else this.disabled = true;
      },
    );
    if (this.ready) this.syncOptions();
  }

  componentWillLoad(): void {
    this.disabled = booleanFromAttributePresence(this.disabled, this.host.hasAttribute('disabled'));
    this.labelHidden = booleanFromAttributePresence(
      this.labelHidden,
      this.host.hasAttribute('label-hidden'),
    );
    this.syncDisabled();
  }

  componentDidRender(): void {
    this.syncName();
  }

  // The name may come from the page: re-resolve when the ids change.
  @Watch('aria-labelledby')
  private labelledByChanged(): void {
    forceUpdate(this.host);
  }

  /** Elements the host's `aria-labelledby` names, in its own tree. */
  private pageLabels(): Element[] {
    const root = this.host.getRootNode();
    if (!(root instanceof Document || root instanceof ShadowRoot)) {
      return [];
    }
    const ids = (this.host.getAttribute('aria-labelledby') ?? '').split(/\s+/u);
    return ids.flatMap((id) => {
      const element = id ? root.getElementById(id) : null;
      return element ? [element] : [];
    });
  }

  // The visible legend names the fieldset natively. A hidden legend names it
  // through an id reference, which counts a hidden node it names directly.
  // Labels from the page arrive as element references, which may point into
  // the trees that contain this shadow root; the legend follows them.
  private syncName(): void {
    const fieldset = this.fieldset;
    if (!fieldset) {
      return;
    }
    const page = this.pageLabels();
    const own = this.legend ? [this.legend] : [];
    if (page.length > 0) {
      // ARIA element reflection (Baseline 2025), which Stencil's DOM
      // declarations predate: assigned through its setter.
      Object.assign(fieldset, { ariaLabelledByElements: [...page, ...own] });
    } else if (own.length > 0 && this.labelHidden) {
      if (fieldset.getAttribute('aria-labelledby') !== LEGEND_ID) {
        fieldset.setAttribute('aria-labelledby', LEGEND_ID);
      }
    } else {
      fieldset.removeAttribute('aria-labelledby');
    }
  }

  componentDidLoad(): void {
    this.ready = true;
    const initial =
      this.value !== this.defaultValue && Array.isArray(this.value) ? [...this.value] : undefined;
    if (!initial) {
      // Options can be defined after the group when using separate imports.
      // Capture which nodes were present before reading their hydrated state.
      for (const child of this.host.children) this.initialOptions.add(child);
    }
    this.syncOptions();
    if (initial) {
      this.initialValue = initial;
      this.selectValues(initial);
    }
  }

  disconnectedCallback(): void {
    this.presenceObserver?.disconnect();
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.syncDisabled();
  }

  formResetCallback(): void {
    this.userInvalid = false;
    if (this.initialValue) {
      this.selectValues(this.initialValue);
      return;
    }
    this.pendingValues.clear();
    this.updateChecked((option) => this.initialChecked.has(option));
    this.syncSelection();
  }

  @Watch('value')
  protected valueChanged(value: string[]): void {
    if (this.ready && !this.updatingOptions) {
      this.selectValues(Array.isArray(value) ? value : []);
    }
  }

  @Watch('disabled')
  protected syncDisabled(): void {
    // A shadow fieldset cannot disable slotted form controls. The checkboxes
    // read this context and keep their own authored disabled state.
    this.group.disabled = this.effectiveDisabled;
    for (const option of this.options) checkboxGroupOptions.get(option)?.();
    this.syncFormValue();
    this.syncValidity();
  }

  @Watch('name')
  protected syncFormValue(): void {
    const data =
      this.effectiveDisabled || !Array.isArray(this.value)
        ? null
        : checkboxGroupFormValue(this.name, this.value);
    this.internals.setFormValue(data);
  }

  @Watch('min')
  @Watch('max')
  @Watch('errorText')
  protected syncValidity(): void {
    const count = Array.isArray(this.value) ? this.value.length : 0;
    const limit = checkboxGroupConstraint(count, this.min, this.max);
    if (this.effectiveDisabled || (!limit && !this.customValidity)) {
      this.internals.setValidity({});
      this.message = '';
      this.userInvalid = false;
      return;
    }

    const flags: ValidityStateFlags = {
      ...(limit ? { [limit]: true } : {}),
      customError: Boolean(this.customValidity),
    };
    const authoredMessage = fieldValidationMessage(this.customValidity, this.errorText, '');
    const message = authoredMessage || this.nativeValidationMessage(count, limit);
    // The browser reports the error at the first option's own native
    // checkbox, as ki-radio-group does at a radio's. Never at the option
    // element: WebKit on Linux draws its validation bubble inside the
    // anchor's shadow root, and on a ki-checkbox that replaced the option's
    // own shadow root, checkbox and all.
    const anchor = this.options
      .find(
        (option) => !option.disabled && !option.hidden && checkboxGroupFor(option) === this.group,
      )
      ?.shadowRoot?.querySelector('input');
    this.internals.setValidity(flags, message, anchor ?? undefined);
    this.message = this.internals.validationMessage;
  }

  @Listen('invalid')
  protected handleInvalid(): void {
    this.userInvalid = true;
  }

  @Listen('focusout')
  protected handleFocusOut(event: FocusEvent): void {
    if (
      event.target instanceof HTMLElement &&
      this.owns(event.target) &&
      !(event.relatedTarget instanceof Node && this.host.contains(event.relatedTarget))
    ) {
      this.userInvalid = !this.internals.validity.valid;
    }
  }

  @Listen('change')
  protected handleChange(event: Event): void {
    if (event.target instanceof HTMLElement && this.owns(event.target) && !this.effectiveDisabled) {
      this.pendingValues.clear();
      this.syncSelection();
      this.kiChange.emit({ value: [...this.value] });
    }
  }

  private owns(option: HTMLElement): boolean {
    return checkboxGroupFor(option) === this.group && this.options.some((item) => item === option);
  }

  private readonly syncOptions = (): void => {
    if (!this.ready) return;
    const previous = this.options;
    this.options = Array.from(this.host.children).filter(
      (option): option is CheckboxOption =>
        option instanceof HTMLElement &&
        checkboxGroupFor(option) === this.group &&
        checkboxGroupOptions.has(option),
    );
    for (const option of this.options) {
      if (this.initialOptions.delete(option) && option.checked) this.initialChecked.add(option);
    }
    for (const option of new Set([...previous, ...this.options])) {
      checkboxGroupOptions.get(option)?.();
    }
    this.applyPendingValues();
    this.syncSelection();
  };

  private optionValue(option: CheckboxOption): string {
    return option.value ?? 'on';
  }

  private selectValues(values: readonly string[]): void {
    const requested = new Set(values);
    this.pendingValues = new Set(values);
    this.updateChecked((option) => {
      const value = this.optionValue(option);
      this.pendingValues.delete(value);
      return requested.has(value);
    });
    this.syncSelection();
  }

  private applyPendingValues(): void {
    if (this.pendingValues.size === 0) return;
    const pending = new Set(this.pendingValues);
    this.updateChecked((option) => {
      const matched = pending.has(this.optionValue(option));
      if (matched) this.pendingValues.delete(this.optionValue(option));
      return matched || option.checked;
    });
  }

  private updateChecked(isSelected: (option: CheckboxOption) => boolean): void {
    this.updatingOptions = true;
    for (const option of this.options) option.checked = isSelected(option);
    this.updatingOptions = false;
  }

  private syncSelection(): void {
    const selected = this.options
      .filter((option) => option.checked)
      .map((option) => this.optionValue(option));
    if (
      !Array.isArray(this.value) ||
      this.value.length !== selected.length ||
      selected.some((value, index) => value !== this.value[index])
    ) {
      this.updatingOptions = true;
      this.value = selected;
      this.updatingOptions = false;
    }
    this.syncFormValue();
    this.syncValidity();
  }

  private nativeValidationMessage(
    count: number,
    limit: ReturnType<typeof checkboxGroupConstraint>,
  ): string {
    const input = this.host.ownerDocument.createElement('input');
    input.type = 'number';
    input.value = String(count);
    if (limit === 'valueMissing') input.min = String(this.min);
    if (limit === 'rangeOverflow') input.max = String(this.max);
    return input.validationMessage;
  }

  render() {
    const messages = {
      help: fieldText(this.helpText),
      error: this.userInvalid ? this.message : '',
    };
    return (
      <fieldset
        disabled={this.effectiveDisabled}
        aria-describedby={fieldDescribedBy(messages)}
        aria-invalid={fieldInvalid(messages)}
        ref={(element) => {
          this.fieldset = element;
        }}
      >
        {fieldText(this.label) && (
          <legend
            part="label"
            id={LEGEND_ID}
            class={{ hidden: this.labelHidden }}
            ref={(element) => {
              this.legend = element;
            }}
          >
            {this.label}
          </legend>
        )}
        <div class="options">
          <slot onSlotchange={this.syncOptions} />
        </div>
        <FieldMessage {...messages} />
      </fieldset>
    );
  }
}
