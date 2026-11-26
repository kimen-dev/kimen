import {
  AttachInternals,
  Component,
  Element,
  Event,
  type EventEmitter,
  Host,
  h,
  Listen,
  Prop,
  State,
  Watch,
} from '@stencil/core';
import '../../../icons/x.js';
import { setOverlayOpen } from '../../utils/anchored-overlay';
import {
  booleanFromAttributePresence,
  observeAttributePresence,
} from '../../utils/boolean-presence';
import { childDisabled, childValue } from '../../utils/child-props';
import {
  type ComboboxFilter,
  labelMatcher,
  normalizedValues,
  offerCustom,
  sameSelection,
} from './ki-combobox.options';

interface Option {
  id: string;
  value: string;
  label: string;
  disabled?: boolean;
  description?: string | undefined;
  start?: Element[];
}

type Choice = Option & { match?: readonly [number, number] };

const OPTION_TAG = ['ki', 'option'].join('-');
const NATIVE_BOOLEAN_PROPS = ['disabled', 'required'] as const;

/**
 * An editable, form-associated combobox with local or remote filtering,
 * single or multiple selection, and optional free entry.
 *
 * @whenToUse choose from a long list of options, let people search an option
 * source, or allow multiple selections that remain visible as tags.
 * @whenNotToUse use a select-only control for a short closed set or a plain
 * text field for unrestricted input with no choices.
 * @slot - Declarative ki-option children. Supply unique values and a human-readable label.
 * @part label - Visible label of the field and its listbox.
 * @part field - Container for the text input and selected tags.
 * @part input - Native text input with the combobox role.
 * @part listbox - Floating listbox surface.
 * @part option - A mirrored choice row.
 * @part description - An option's secondary text.
 * @part tag - A selected value in multiple mode.
 * @part remove - A native button that removes a selected tag.
 * @part help - Help below the field.
 * @part error - Polite error message shown after failed validation.
 * @event change - Composed event after a user changes the committed selection.
 * Read the committed value from the host.
 * @catalogAction change
 */
@Component({
  tag: 'ki-combobox',
  styleUrl: 'ki-combobox.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class KiCombobox {
  @Element() private readonly host!: HTMLElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  /** Visible label and accessible name. Supply it even when placeholder text is also set. */
  @Prop() label!: string;

  /** Hint shown in the text input when it is empty. */
  @Prop() placeholder = '';

  /** Guidance shown below the field and read as its description. */
  @Prop() helpText?: string;

  /** Message used when a required selection is missing, in place of the browser's message. A `custom-error` outranks it. */
  @Prop() errorText?: string;

  /**
   * An error of the application's own, such as a server-side verdict on the
   * submitted choice ("Ana is on leave this week"). While it holds text the
   * field is invalid, blocks its form, shows the text in place of the help
   * text at once and is announced as invalid. It stops counting when the
   * person commits another selection (choosing, removing or clearing a
   * choice; typing filter text is not a change), or when the form is reset,
   * so it never blocks the corrected answer. It outranks `error-text`.
   * When to use: report a verdict from a declarative spec, a live update or a
   * framework binding. Remove it when a new attempt starts.
   * When NOT to use: do not use it for a `required` field left without a
   * choice; `error-text` words that. Setting the same text again while the
   * prop still holds it shows nothing: remove it first, then set it again.
   */
  @Prop() customError?: string;

  /** Form-data key. Multiple choices contribute one entry each under this name. */
  @Prop({ reflect: true }) name?: string;

  /**
   * Committed value. Use a string for single selection and an array of strings
   * for multiple selection. In HTML and catalog specs, encode multiple values
   * as a JSON array string in the value attribute, or supply one literal value.
   * Assign a new array to change multiple selections programmatically.
   */
  @Prop({ mutable: true }) value: string | string[] = '';

  /** Enables ordered multiple selection and renders selected values as tags. */
  @Prop({ reflect: true }) multiple = false;

  /** Offers to add trimmed query text when no known or selected choice already matches it. */
  @Prop({ reflect: true }) allowCustom = false;

  /** Filters by label. Set to none when the application provides results from a remote search. */
  @Prop() filter: ComboboxFilter = 'contains';

  /** Replaces visible options with a loading indicator while a search is pending. */
  @Prop({ reflect: true }) loading = false;

  /** Requires a committed choice to submit the form. */
  @Prop({ reflect: true }) required = false;

  /** Disables editing, navigation and form submission. */
  @Prop({ reflect: true }) disabled = false;

  /** Localizable free-entry offer. {text} is replaced by the trimmed query. */
  @Prop() addLabel = 'Add “{text}”';

  /** Localizable removal button label. {label} is replaced by the selected label. */
  @Prop() removeLabel = 'Remove {label}';

  /** Localizable status while waiting for a result set. */
  @Prop() loadingLabel = 'Loading results';

  /** Localizable status when there are no choices to display. */
  @Prop() emptyLabel = 'No results';

  /** Localizable status for one available choice. */
  @Prop() resultOneLabel = '1 result';

  /** Localizable status for several choices. {count} is replaced by the result count. */
  @Prop() resultCountLabel = '{count} results';

  /** Reports a raw text edit in `detail.value`. Listen to it to request remote results. */
  @Event({ eventName: 'ki-input', bubbles: true, composed: true, cancelable: false })
  queryInput!: EventEmitter<{ value: string }>;

  @State() private options: Option[] = [];
  @State() private query: string | undefined;
  @State() private open = false;
  @State() private activeId: string | undefined;
  @State() private formDisabled = false;
  @State() private userInvalid = false;

  private input: HTMLInputElement | undefined;
  private listbox: HTMLElement | undefined;
  private initialValue: string | string[] = '';
  private selectedLabels = new Map<string, string>();
  private observer?: MutationObserver;
  private presenceObserver?: MutationObserver;
  private requiredMessage?: string;
  // Whether the person's committed selection or a form reset withdrew `custom-error`.
  private customErrorWithdrawn = false;

  connectedCallback(): void {
    this.observer = new MutationObserver(() => {
      this.readOptions();
    });
    this.observer.observe(this.host, {
      childList: true,
      characterData: true,
      attributes: true,
      subtree: true,
    });
    this.presenceObserver = observeAttributePresence(
      this.host,
      NATIVE_BOOLEAN_PROPS,
      (attribute) => {
        this[attribute] = true;
      },
    );
    this.readOptions();
  }

  componentWillLoad(): void {
    for (const attribute of NATIVE_BOOLEAN_PROPS) {
      this[attribute] = booleanFromAttributePresence(
        this[attribute],
        this.host.hasAttribute(attribute),
      );
    }
    this.initialValue = Array.isArray(this.value) ? [...this.value] : this.value;
    this.syncForm();
  }

  componentDidLoad(): void {
    this.syncForm();
  }

  componentDidRender(): void {
    setOverlayOpen(this.listbox, this.open);
    if (this.activeId) {
      this.host.shadowRoot?.getElementById(this.activeId)?.scrollIntoView({ block: 'nearest' });
    }
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    this.presenceObserver?.disconnect();
    this.dismiss();
  }

  private get unavailable(): boolean {
    return this.disabled || this.formDisabled;
  }

  private get selected(): string[] {
    return Array.isArray(this.value) ? this.value : normalizedValues(this.value, this.multiple);
  }

  private get choices(): Choice[] {
    if (this.loading) return [];
    const matchLabel = labelMatcher(this.query ?? '', this.filter);
    const choices: Choice[] = [];
    for (const option of this.options) {
      const match = matchLabel(option.label);
      if (match !== null) choices.push({ ...option, match });
    }
    const custom = this.allowCustom
      ? offerCustom(this.query ?? '', this.options, this.selected)
      : null;
    if (custom !== null) {
      choices.push({
        id: 'custom',
        value: custom,
        label: this.addLabel.replace('{text}', () => custom),
      });
    }
    return choices;
  }

  private labelFor(value: string): string {
    return this.selectedLabels.get(value) ?? value;
  }

  private readOptions(): void {
    const options: Option[] = [];
    const values = new Set<string>();
    for (const child of Array.from(this.host.children)) {
      if (child.localName !== OPTION_TAG) continue;
      const start: Element[] = [];
      let text = '';
      for (const node of child.childNodes) {
        if (node instanceof globalThis.Element && node.slot) {
          if (node.slot === 'start') start.push(node);
        } else if (node.nodeType !== Node.COMMENT_NODE) {
          text += node.textContent ?? '';
        }
      }
      const label = text.trim();
      const value = childValue(child) ?? label;
      if (values.has(value)) continue;
      values.add(value);
      const description =
        (child as { description?: string }).description ?? child.getAttribute('description');
      options.push({
        id: `choice-${String(options.length)}`,
        label: label || value,
        value,
        description: description?.trim(),
        disabled: childDisabled(child),
        start,
      });
    }
    this.options = options;
    this.activeId = undefined;
    this.rememberLabels();
  }

  private rememberLabels(): void {
    const prior = this.selectedLabels;
    const selected = this.selected;
    this.selectedLabels = new Map(
      selected.map((value) => [
        value,
        this.options.find((option) => option.value === value)?.label ?? prior.get(value) ?? value,
      ]),
    );
  }

  @Watch('multiple')
  @Watch('value')
  @Watch('name')
  @Watch('required')
  @Watch('disabled')
  @Watch('errorText')
  protected syncForm(): void {
    const values = normalizedValues(this.value, this.multiple);
    const next = this.multiple ? values : (values[0] ?? '');
    const current = this.value;
    const changed = Array.isArray(next)
      ? !Array.isArray(current) || !sameSelection(next, current)
      : next !== current;
    if (changed) {
      this.value = next;
      return;
    }
    this.rememberLabels();

    if (this.unavailable) {
      this.dismiss();
      this.internals.setFormValue(null);
      this.internals.setValidity({});
      return;
    }

    let submitted: string | FormData | null = values[0] ?? null;
    if (this.multiple) {
      submitted = new FormData();
      if (this.name) {
        for (const value of values) submitted.append(this.name, value);
      }
    }
    this.internals.setFormValue(submitted);

    const valueMissing = this.required && values.length === 0;
    if (valueMissing && this.requiredMessage === undefined) {
      const donor = this.host.ownerDocument.createElement('input');
      donor.required = true;
      this.requiredMessage = donor.validationMessage;
    }
    const errorText = this.errorText?.trim() ?? '';
    const customError = this.customErrorWithdrawn ? '' : (this.customError?.trim() ?? '');
    const message = customError || (valueMissing ? errorText || (this.requiredMessage ?? '') : '');
    this.internals.setValidity(
      { valueMissing, customError: customError !== '' },
      message,
      this.input,
    );
    // A custom error shows at once, without a submission (D2).
    if (customError !== '') this.userInvalid = true;
  }

  @Watch('customError')
  protected customErrorChanged(): void {
    this.customErrorWithdrawn = false;
    this.syncForm();
  }

  /**
   * Answers at once whether the field satisfies `required` and carries no
   * `custom-error`, firing `invalid` when it does not, as a native field
   * does.
   * When NOT to use: use `reportValidity()` instead when the person should
   * see the problem.
   */
  checkValidity(): boolean {
    return this.internals.checkValidity();
  }

  /**
   * Like `checkValidity()`, and when the field is invalid it shows its
   * message and the browser moves focus to it.
   * When NOT to use: do not call it on every keystroke; it interrupts the
   * person.
   */
  reportValidity(): boolean {
    return this.internals.reportValidity();
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.syncForm();
  }

  formResetCallback(): void {
    this.customErrorWithdrawn = true;
    this.dismiss();
    this.userInvalid = false;
    this.value = normalizedValues(this.initialValue, this.multiple);
    this.syncForm();
  }

  @Listen('invalid')
  protected onInvalid(): void {
    this.userInvalid = true;
  }

  private dismiss(): void {
    this.open = false;
    this.activeId = undefined;
    this.query = undefined;
  }

  private openChoices(): void {
    if (!this.unavailable) this.open = true;
  }

  private commit(value: string[]): void {
    const previous = this.selected;
    this.value = this.multiple ? value : (value[0] ?? '');
    if (sameSelection(previous, this.selected)) {
      return;
    }
    this.customErrorWithdrawn = true;
    this.syncForm();
    this.host.dispatchEvent(new globalThis.Event('change', { bubbles: true, composed: true }));
  }

  private choose(choice: Choice): void {
    if (this.unavailable || this.loading || choice.disabled) return;
    if (this.multiple) {
      const selected = this.selected;
      this.commit(
        selected.includes(choice.value)
          ? selected.filter((value) => value !== choice.value)
          : [...selected, choice.value],
      );
      this.query = undefined;
      this.activeId = undefined;
    } else {
      this.commit([choice.value]);
      this.dismiss();
    }
    this.input?.focus();
  }

  private remove(value: string): void {
    if (this.unavailable) return;
    this.commit(this.selected.filter((selection) => selection !== value));
    this.input?.focus();
  }

  private moveActive(direction: 1 | -1): void {
    const choices = this.choices.filter((choice) => !choice.disabled);
    const current = this.open ? choices.findIndex((choice) => choice.id === this.activeId) : -1;
    const next =
      current < 0
        ? direction > 0
          ? 0
          : choices.length - 1
        : Math.min(choices.length - 1, Math.max(0, current + direction));
    this.activeId = choices[next]?.id;
    this.openChoices();
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (this.unavailable || event.defaultPrevented || event.isComposing) return;
    if (event.key === 'Tab') {
      this.dismiss();
    } else if (
      (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.shiftKey
    ) {
      event.preventDefault();
      this.moveActive(event.key === 'ArrowDown' ? 1 : -1);
    } else if (
      event.key === 'Escape' &&
      (this.open || this.query || (!this.multiple && this.value !== ''))
    ) {
      event.preventDefault();
      event.stopPropagation();
      if (this.open) {
        this.open = false;
        this.activeId = undefined;
      } else if (this.query) {
        this.query = '';
      } else {
        this.commit([]);
        this.query = undefined;
      }
    } else if (event.key === 'Enter' && this.open) {
      event.preventDefault();
      const active = this.choices.find((choice) => choice.id === this.activeId);
      if (active) this.choose(active);
    } else if (event.key === 'Backspace' && this.multiple && !this.input?.value) {
      const selected = this.selected;
      if (selected.length) {
        event.preventDefault();
        this.commit(selected.slice(0, -1));
      }
    }
  }

  private onInput(event: globalThis.Event): void {
    event.stopPropagation();
    if (this.unavailable || !(event.target instanceof HTMLInputElement)) return;
    this.query = event.target.value;
    this.activeId = undefined;
    this.openChoices();
    this.queryInput.emit({ value: this.query });
  }

  private renderOption(choice: Choice, selected: string[]) {
    const [start, end] = choice.match ?? [0, 0];
    const descriptionId = choice.description ? `${choice.id}-description` : undefined;
    const isSelected = selected.includes(choice.value);
    return (
      // DOM focus stays on the combobox. Its keyboard handler activates the active option.
      // eslint-disable-next-line jsx-a11y/click-events-have-key-events
      <div
        key={choice.id}
        id={choice.id}
        part="option"
        role="option"
        tabindex="-1"
        aria-selected={String(isSelected)}
        aria-disabled={choice.disabled ? 'true' : undefined}
        aria-describedby={descriptionId}
        data-active={!choice.disabled && this.activeId === choice.id ? '' : undefined}
        onClick={() => {
          this.choose(choice);
        }}
      >
        {choice.start && choice.start.length > 0 ? (
          <span
            aria-hidden="true"
            inert
            ref={(element) => {
              const startContent = choice.start;
              if (element && startContent) {
                element.replaceChildren(...startContent.map((node) => node.cloneNode(true)));
              }
            }}
          />
        ) : null}
        <span class="choice-text">
          <span>
            {end > start
              ? [
                  choice.label.slice(0, start),
                  <mark>{choice.label.slice(start, end)}</mark>,
                  choice.label.slice(end),
                ]
              : choice.label}
          </span>
          {descriptionId && (
            <span id={descriptionId} part="description" aria-hidden="true">
              {choice.description}
            </span>
          )}
        </span>
      </div>
    );
  }

  render() {
    const selected = this.selected;
    const selectedValue = selected[0];
    const display =
      this.query ??
      (this.multiple || selectedValue === undefined ? '' : this.labelFor(selectedValue));
    const choices = this.open ? this.choices : [];
    const active = choices.find((choice) => choice.id === this.activeId && !choice.disabled);
    const error = this.userInvalid ? this.internals.validationMessage : '';
    const help = error ? '' : this.helpText?.trim();
    const count = choices.length;
    let status = '';
    if (this.open) {
      if (this.loading) status = this.loadingLabel;
      else if (count === 0) status = this.emptyLabel;
      else if (count === 1) status = this.resultOneLabel;
      else status = this.resultCountLabel.replace('{count}', String(count));
    }
    // Stable keys keep the input and live regions mounted during option updates.
    return (
      <Host key="combobox">
        <label key="label" id="label" part="label" htmlFor="input">
          {this.label}
        </label>
        <div key="field" part="field">
          {this.multiple &&
            selected.map((value) => {
              const label = this.labelFor(value);
              return (
                <span key={`tag-${value}`} part="tag">
                  {label}
                  <button
                    type="button"
                    tabIndex={0}
                    part="remove"
                    disabled={this.unavailable}
                    aria-label={this.removeLabel.replace('{label}', () => label)}
                    onClick={() => {
                      this.remove(value);
                    }}
                  >
                    <ki-icon name="x" />
                  </button>
                </span>
              );
            })}
          <input
            key="input"
            id="input"
            part="input"
            ref={(element) => {
              this.input = element;
              // Native edits can occur between renders with the same display value.
              if (element && element.value !== display) element.value = display;
            }}
            type="text"
            role="combobox"
            autocomplete="off"
            aria-autocomplete="list"
            aria-controls="choices"
            aria-expanded={String(this.open)}
            aria-activedescendant={active?.id}
            aria-required={this.required ? 'true' : undefined}
            aria-describedby={error ? 'error' : help ? 'help' : undefined}
            aria-invalid={error ? 'true' : undefined}
            disabled={this.unavailable}
            placeholder={this.placeholder}
            onInput={(event) => {
              this.onInput(event);
            }}
            onChange={(event) => {
              event.stopPropagation();
            }}
            onClick={() => {
              this.openChoices();
            }}
            onBlur={() => {
              this.dismiss();
            }}
            onKeyDown={(event) => {
              this.onKeyDown(event);
            }}
          />
        </div>
        {help && (
          <div key="help" id="help" part="help">
            {help}
          </div>
        )}
        <div key="error" id="error" part="error" aria-live="polite" aria-atomic="true">
          {error}
        </div>
        <div
          key="choices"
          id="choices"
          part="listbox"
          role="listbox"
          tabindex="-1"
          aria-labelledby="label"
          aria-multiselectable={this.multiple ? 'true' : undefined}
          aria-busy={this.loading ? 'true' : undefined}
          popover="manual"
          ref={(element) => {
            this.listbox = element;
          }}
          onMouseDown={(event) => {
            if (event.button === 0) event.preventDefault();
          }}
        >
          {this.open &&
            (count ? (
              choices.map((choice) => this.renderOption(choice, selected))
            ) : (
              <div
                part="option"
                role="option"
                aria-selected="false"
                aria-disabled="true"
                aria-label={this.loading ? this.loadingLabel : this.emptyLabel}
              >
                {this.loading ? (
                  <ki-spinner label={this.loadingLabel} showLabel aria-hidden="true" />
                ) : (
                  this.emptyLabel
                )}
              </div>
            ))}
        </div>
        <span key="status" class="status" role="status" aria-atomic="true">
          {status}
        </span>
        <div key="data" hidden>
          <slot key="options" />
        </div>
      </Host>
    );
  }
}
