import '../../../icons/check.js';
import '../../../icons/clock.js';
import {
  AttachInternals,
  Component,
  Element,
  Event,
  type EventEmitter,
  h,
  Listen,
  Prop,
  State,
  Watch,
} from '@stencil/core';
import { isOutsideOverlay, setOverlayOpen } from '../../utils/anchored-overlay';
import {
  FieldMessage,
  fieldDescribedBy,
  fieldInvalid,
  fieldText,
  fieldValidationMessage,
} from '../../utils/field-message';
import {
  createTimeLocale,
  formatCanonicalTime,
  parseCanonicalTime,
  timeBounds,
  timeSlots,
} from './ki-time-input.time';

export interface KiTimeInputChangeDetail {
  value: string;
}

const inputId = 'time';
const listId = 'suggestions';
const invalidTimeMessage = 'Enter a valid time within the allowed range.';
const slotId = (minutes: number): string => `slot-${String(minutes)}`;

/**
 * A time-of-day field with locale-aware typing and suggested slots. The shadow
 * root keeps the combobox and listbox in the same accessibility ID scope.
 * The host owns native form participation.
 *
 * @whenToUse collect an exact time of day or offer regular appointment slots.
 * Provide a visible label and set bounding times when the schedule is limited.
 * @whenNotToUse durations, dates or timestamps. Pair with a date field when
 * the day matters. Timezone conversion belongs to the application.
 * @slot start - Optional leading adornment, outside the input's accessible name.
 * @part label - Visible label naming the editable combobox.
 * @part field - Field enclosure and anchor for the suggestions.
 * @part input - Editable text combobox.
 * @part trigger - Button that opens suggested times.
 * @part listbox - Scrollable list of suggested times.
 * @part option - Individual suggested time.
 * @part help - Help and timezone describing the field.
 * @part error - Polite validation message that replaces help.
 * @event change - Native-style composed event for a changed user commit.
 */
@Component({
  tag: 'ki-time-input',
  styleUrls: ['../../utils/field-message.css', 'ki-time-input.css'],
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class KiTimeInput {
  @Element() private readonly host!: HTMLKiTimeInputElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  /** Visible text naming the time field. Provide it for every use. */
  @Prop({ reflect: true }) label!: string;

  /** Guidance read with the field until a validation error replaces it. */
  @Prop({ reflect: true }) helpText?: string;

  /** Validation message to show after blur or a blocked form submission. */
  @Prop({ reflect: true }) errorText?: string;

  /** Name under which the canonical time is submitted. */
  @Prop({ reflect: true }) name?: string;

  /** Empty values block form submission when true. */
  @Prop({ reflect: true }) required = false;

  /** Disables typing, suggestions and form participation. */
  @Prop({ reflect: true }) disabled = false;

  /** Committed wall-clock time in HH:mm, or empty. The attribute sets the form reset value. */
  @Prop({ mutable: true }) value = '';

  /** Suggested slot interval in whole minutes. Typed times keep their exact minutes. */
  @Prop({ reflect: true }) step = 30;

  /** Earliest allowed wall-clock time in HH:mm, inclusive. */
  @Prop({ reflect: true }) min?: string;

  /** Latest allowed wall-clock time in HH:mm, inclusive. */
  @Prop({ reflect: true }) max?: string;

  /** IANA timezone shown alongside help. Does not change wall-clock values. */
  @Prop({ reflect: true }) timeZone?: string;

  /** Accessible name of the button that opens suggestions. */
  @Prop({ reflect: true }) pickerLabel = 'Choose time';

  /** Accessible name of the suggestion listbox. */
  @Prop({ reflect: true }) listLabel = 'Suggested times';

  /** Fallback validation message for invalid time syntax or bounds. */
  @Prop({ reflect: true }) invalidTimeText = invalidTimeMessage;

  /** Emitted when a person commits a different canonical time or clears it. */
  @Event({ eventName: 'ki-change', bubbles: true, composed: true, cancelable: false })
  kiChange!: EventEmitter<KiTimeInputChangeDetail>;

  @State() private draft = '';
  @State() private shownError = '';
  @State() private formDisabled = false;
  @State() private expanded = false;
  @State() private slots: number[] = [];
  @State() private activeIndex = 0;
  private input: HTMLInputElement | undefined;
  private list: HTMLDivElement | undefined;
  private draftMinutes: number | undefined;
  private revealError = false;
  private customError = '';
  private lastScrolledSlot: number | undefined;
  private locale!: ReturnType<typeof createTimeLocale>;

  /** Current form validation flags. Available on the custom-elements build. */
  get validity(): ValidityState {
    return this.internals.validity;
  }

  /** Current form validation message. Available on the custom-elements build. */
  get validationMessage(): string {
    return this.internals.validationMessage;
  }

  /** Whether this field participates in validation on the custom-elements build. */
  get willValidate(): boolean {
    return this.internals.willValidate;
  }

  /** Checks native form validity and fires invalid on failure. */
  checkValidity(): boolean {
    return this.internals.checkValidity();
  }

  /** Reports a validation failure and focuses the field when the browser allows it. */
  reportValidity(): boolean {
    return this.internals.reportValidity();
  }

  /** Adds a form error from the application. An empty string clears it. */
  setCustomValidity(message: string): void {
    this.customError = message;
    this.syncForm();
  }

  disconnectedCallback(): void {
    this.closeList();
  }

  componentWillLoad(): void {
    this.configureLocale();
  }

  componentDidLoad(): void {
    this.syncForm();
  }

  componentDidRender(): void {
    if (!this.expanded || !this.list) {
      return;
    }
    setOverlayOpen(this.list, true);
    const active = this.slots[this.activeIndex];
    if (active !== undefined && active !== this.lastScrolledSlot) {
      this.list.querySelector(`#${slotId(active)}`)?.scrollIntoView({ block: 'nearest' });
      this.lastScrolledSlot = active;
    }
  }

  @Watch('lang')
  protected configureLocale(): void {
    let node: Element | null = this.host;
    while (node && !node.hasAttribute('lang')) {
      const root = node.getRootNode();
      node = node.parentElement ?? (root instanceof ShadowRoot ? root.host : null);
    }
    const fallback = this.host.ownerDocument.defaultView?.navigator.language;
    this.locale = createTimeLocale(node?.getAttribute('lang') ?? undefined, fallback);
    this.valueChanged();
  }

  @Watch('value')
  protected valueChanged(): void {
    this.draftMinutes = parseCanonicalTime(this.value);
    this.setDraft(
      this.draftMinutes === undefined ? this.value : this.locale.format(this.draftMinutes),
    );
    this.syncForm();
  }

  @Watch('required')
  @Watch('disabled')
  @Watch('errorText')
  @Watch('invalidTimeText')
  protected constraintsChanged(): void {
    if (this.input) {
      this.input.required = this.required;
      this.input.disabled = this.effectiveDisabled;
    }
    if (this.effectiveDisabled) {
      this.closeList();
    }
    this.syncForm();
  }

  @Watch('min')
  @Watch('max')
  @Watch('step')
  protected rangeChanged(): void {
    if (this.expanded) {
      this.openList();
    }
    this.syncForm();
  }

  formResetCallback(): void {
    this.revealError = false;
    this.value = this.host.getAttribute('value') ?? '';
    this.valueChanged();
    this.closeList();
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.constraintsChanged();
  }

  @Listen('invalid')
  protected handleInvalid(): void {
    this.syncForm(true);
  }

  @Listen('pointerdown', { target: 'document' })
  protected dismissOutside(event: PointerEvent): void {
    if (this.expanded && isOutsideOverlay(event, this.host)) {
      this.closeList();
    }
  }

  private get effectiveDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  private setDraft(text: string): void {
    this.draft = text;
    if (this.input && this.input.value !== text) {
      this.input.value = text;
    }
  }

  private constraint(): ValidityStateFlags {
    const time = this.draftMinutes;
    if (time === undefined) {
      if (this.draft.trim() !== '') {
        return { badInput: true };
      }
      return this.required ? { valueMissing: true } : {};
    }
    const { min, max } = timeBounds(this.min, this.max);
    if (time < min) {
      return { rangeUnderflow: true };
    }
    return time > max ? { rangeOverflow: true } : {};
  }

  private syncForm(reveal = false): string | null {
    const flags = this.effectiveDisabled ? {} : this.constraint();
    const invalidTime = Object.keys(flags).length > 0;
    if (!this.effectiveDisabled && this.customError !== '') {
      flags.customError = true;
    }
    const invalid = Object.keys(flags).length > 0;
    const canonical = this.draftMinutes === undefined ? '' : formatCanonicalTime(this.draftMinutes);
    this.revealError = invalid && (reveal || this.revealError);
    this.internals.setFormValue(invalid || this.effectiveDisabled ? null : canonical);
    const browserMessage = flags.valueMissing ? (this.input?.validationMessage ?? '') : '';
    const fallback = browserMessage || fieldText(this.invalidTimeText) || invalidTimeMessage;
    const message = invalid
      ? fieldValidationMessage(this.customError, this.errorText, fallback)
      : '';
    this.internals.setValidity(flags, message, this.input);
    this.shownError = this.revealError ? message : '';
    if (this.revealError) {
      this.internals.states.add('user-invalid');
    } else {
      this.internals.states.delete('user-invalid');
    }
    return invalidTime || this.effectiveDisabled ? null : canonical;
  }

  private commit(value: string): void {
    const changed = this.value !== value;
    this.value = value;
    if (!changed) {
      this.valueChanged();
      return;
    }
    this.host.dispatchEvent(new globalThis.Event('change', { bubbles: true, composed: true }));
    this.kiChange.emit({ value });
  }

  private readonly handleInput = (event: InputEvent): void => {
    event.stopPropagation();
    const text = (event.target as HTMLInputElement).value;
    this.draftMinutes = this.locale.parse(text);
    this.setDraft(text);
    this.syncForm();
  };

  private readonly handleBlur = (): void => {
    if (!this.host.isConnected) {
      return;
    }
    this.closeList();
    const value = this.syncForm(true);
    if (value !== null) {
      this.commit(value);
    }
  };

  private readonly stopChange = (event: globalThis.Event): void => {
    event.stopPropagation();
  };

  private openList(fromEnd = false): void {
    this.slots = timeSlots(timeBounds(this.min, this.max), this.step);
    if (this.slots.length === 0) {
      this.closeList();
      return;
    }
    const index = this.draftMinutes === undefined ? -1 : this.slots.indexOf(this.draftMinutes);
    this.activeIndex = index >= 0 ? index : fromEnd ? this.slots.length - 1 : 0;
    this.expanded = true;
  }

  private closeList(): void {
    this.expanded = false;
    this.lastScrolledSlot = undefined;
    setOverlayOpen(this.list, false);
  }

  private selectSlot(minutes: number): void {
    this.closeList();
    this.commit(formatCanonicalTime(minutes));
    this.input?.focus();
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.shiftKey) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        const down = event.key === 'ArrowDown';
        event.preventDefault();
        if (event.altKey && !down) {
          this.closeList();
        } else if (!this.expanded) {
          this.openList(!down);
        } else if (!event.altKey) {
          const next = this.activeIndex + (down ? 1 : -1);
          this.activeIndex = Math.max(0, Math.min(this.slots.length - 1, next));
        }
        break;
      }
      case 'Escape':
        if (this.expanded) {
          event.preventDefault();
          event.stopPropagation();
          this.closeList();
        }
        break;
      case 'Enter': {
        if (event.altKey) {
          return;
        }
        event.preventDefault();
        const selection = this.expanded ? this.slots[this.activeIndex] : undefined;
        if (selection !== undefined) {
          this.selectSlot(selection);
        } else {
          this.handleBlur();
          this.submitForm();
        }
        break;
      }
    }
  };

  private submitForm(): void {
    const form = this.internals.form;
    const submitter = form?.querySelector<HTMLButtonElement | HTMLInputElement>(
      'button:not([type]), button[type="submit"], input[type="submit"]',
    );
    form?.requestSubmit(submitter?.disabled === false ? submitter : undefined);
  }

  private readonly keepListFocus = (event: MouseEvent): void => {
    event.preventDefault();
  };

  private readonly toggleSuggestions = (): void => {
    if (this.effectiveDisabled) {
      return;
    }
    if (this.expanded) {
      this.closeList();
    } else {
      this.input?.focus();
      this.openList();
    }
  };

  render() {
    const messages = {
      help: [fieldText(this.helpText), fieldText(this.timeZone)].filter(Boolean).join(' · '),
      error: this.shownError,
    };
    const active = this.slots[this.activeIndex];
    const selected = parseCanonicalTime(this.value);
    return (
      <div class="root">
        <label part="label" htmlFor={inputId}>
          {this.label}
        </label>
        <div part="field">
          <slot name="start" />
          <input
            id={inputId}
            part="input"
            role="combobox"
            type="text"
            autocomplete="off"
            ref={(element) => {
              this.input = element;
            }}
            value={this.draft}
            required={this.required}
            disabled={this.effectiveDisabled}
            aria-controls={listId}
            aria-expanded={this.expanded ? 'true' : 'false'}
            aria-activedescendant={
              this.expanded && active !== undefined ? slotId(active) : undefined
            }
            aria-describedby={fieldDescribedBy(messages)}
            aria-invalid={fieldInvalid(messages)}
            onInput={this.handleInput}
            onChange={this.stopChange}
            onBlur={this.handleBlur}
            onKeyDown={this.handleKeyDown}
          />
          <button
            type="button"
            part="trigger"
            tabindex="-1"
            aria-label={this.pickerLabel}
            aria-haspopup="listbox"
            aria-expanded={String(this.expanded)}
            disabled={this.effectiveDisabled}
            onMouseDown={this.keepListFocus}
            onClick={this.toggleSuggestions}
          >
            <ki-icon name="clock" />
          </button>
        </div>
        <FieldMessage {...messages} />
        <div
          id={listId}
          part="listbox"
          role="listbox"
          tabindex="-1"
          popover="manual"
          hidden={!this.expanded}
          ref={(element) => {
            this.list = element;
          }}
          aria-label={this.listLabel}
          onMouseDown={this.keepListFocus}
        >
          {this.expanded &&
            this.slots.map((time, index) => (
              // Keyboard selection is handled by the combobox through aria-activedescendant.
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events
              <div
                key={time}
                id={slotId(time)}
                part="option"
                role="option"
                tabindex="-1"
                aria-selected={time === selected ? 'true' : 'false'}
                data-highlighted={index === this.activeIndex ? 'true' : 'false'}
                onClick={() => {
                  this.selectSlot(time);
                }}
              >
                {this.locale.format(time)}
                {time === selected && <ki-icon name="check" size="sm" />}
              </div>
            ))}
        </div>
      </div>
    );
  }
}
