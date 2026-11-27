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
import '../../../icons/calendar.js';
import '../../../icons/chevron-left.js';

import {
  addMonths,
  calendarFormats,
  calendarLocale,
  clampDate,
  type DatePickerMode,
  daysForMonth,
  firstWeekday,
  fromIso,
  formatValue,
  inBounds,
  isoDate,
  moveDate,
  normalizeValue,
  parseEntry,
  rangeValue,
  todayDate,
  weekdayDates,
} from './ki-date-picker.dates';

/** ISO date or date range committed by the user. */
export interface DatePickerChangeDetail {
  value: string;
}

function languageOf(element: Element): string | undefined {
  const language = element.closest('[lang]:not([lang=""])')?.getAttribute('lang');
  const root = element.getRootNode();
  return language ?? (root instanceof ShadowRoot ? languageOf(root.host) : undefined);
}

/**
 * A locale-aware date field with an anchored keyboard-operable calendar.
 *
 * @whenToUse Choose a nearby date or date range when the weekday matters, such as
 * a booking, a deadline or a schedule.
 * @whenNotToUse Enter a known distant date, such as a birth date, or choose a time.
 * @part label - Visible label and accessible name of the text field.
 * @part field - Enclosure of the text field and calendar button.
 * @part input - Native text entry for a localized date or range.
 * @part trigger - Button that opens and closes the calendar.
 * @part help - Help text associated with the input.
 * @part error - Live constraint message replacing help when the field is invalid.
 * @part popup - Anchored non-modal calendar dialog.
 * @part month - Live month and year heading.
 * @part grid - Calendar grid with localized weekdays and date buttons.
 * @part day - Date button in the calendar grid.
 */
@Component({
  tag: 'ki-date-picker',
  styleUrl: 'ki-date-picker.css',
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class KiDatePicker {
  @Element() private readonly host!: HTMLElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  #input: HTMLInputElement | undefined;
  #trigger: HTMLButtonElement | undefined;
  #popup: HTMLElement | undefined;
  #focusDayAfterRender = false;
  // Whether the person's edit or a form reset withdrew `custom-error`.
  #customErrorWithdrawn = false;
  #today = '';
  #formats?: { locale: string; value: ReturnType<typeof calendarFormats> };

  @State() private formDisabled = false;
  @State() private showError = false;
  @State() private entry: string | undefined;
  @State() private active = '';
  @State() private draft: string | undefined;

  /** Visible text and accessible name of the date field. Provide a label for every field. */
  @Prop({ reflect: true }) label!: string;
  /** A format hint or explanation read with the field. It is replaced by a visible error. */
  @Prop({ reflect: true }) helpText?: string;
  /** Overrides the message shown when a date is missing, invalid or outside the bounds. A `custom-error` outranks it. */
  @Prop({ reflect: true }) errorText?: string;
  /**
   * An error of the application's own, such as a server-side verdict on the
   * submitted date ("No flights on that day"). While it holds text the field
   * is invalid, blocks its form, shows the text in place of the help text at
   * once and is announced as invalid. It stops counting at the person's next
   * edit of the text or pick of another date, or when the form is reset, so
   * it never blocks the corrected answer. It outranks `error-text`.
   * When to use: report a verdict from a declarative spec, a live update or a
   * framework binding. Remove it when a new attempt starts.
   * When NOT to use: do not use it for a missing, unreadable or out-of-bounds
   * date, which the field reports itself; `error-text` words those. Setting
   * the same text again while the prop still holds it shows nothing: remove
   * it first, then set it again.
   */
  @Prop({ reflect: true }) customError?: string;
  /** Requires a complete date or pair of dates for native form submission. */
  @Prop({ reflect: true }) required = false;
  /** Disables the text entry and calendar button and excludes the field from form data. */
  @Prop({ reflect: true }) disabled = false;
  /** Form-data key. A range is submitted as a single value. */
  @Prop({ reflect: true }) name?: string;
  /** Select one date or a range with a start and an end date. */
  @Prop({ reflect: true }) mode: DatePickerMode = 'single';
  /** Current ISO date, ISO start/end pair or empty string. The value attribute is the reset default. */
  @Prop({ mutable: true }) value = '';
  /** Earliest selectable date, inclusive. Use YYYY-MM-DD. */
  @Prop({ reflect: true }) min?: string;
  /** Latest selectable date, inclusive. Use YYYY-MM-DD. */
  @Prop({ reflect: true }) max?: string;
  /** BCP 47 language tag for localized dates and weekday order. Defaults to the page language. */
  @Prop({ reflect: true }) locale?: string;
  /**
   * First weekday, where Sunday is 0 and Saturday is 6. Defaults to the locale's week start.
   * @minimum 0
   * @maximum 6
   */
  @Prop({ reflect: true }) firstDayOfWeek?: number;
  /** Require Apply before saving picks made in the calendar. */
  @Prop({ reflect: true }) confirm = false;
  /** Localized name of the calendar dialog and of the trigger when no date is saved. */
  @Prop() chooseLabel = 'Choose date';
  /** Localized name of the trigger when a date is saved. Use {date} for the current selection. */
  @Prop() changeLabel = 'Change date, {date}';
  /** Localized accessible name of the previous-month button. */
  @Prop() previousMonthLabel = 'Previous month';
  /** Localized accessible name of the next-month button. */
  @Prop() nextMonthLabel = 'Next month';
  /** Localized label of the confirmation button that discards a draft. */
  @Prop() cancelLabel = 'Cancel';
  /** Localized label of the confirmation button that saves a complete draft. */
  @Prop() applyLabel = 'Apply';
  /** Localized fallback message for an impossible, incomplete or out-of-bounds date. */
  @Prop() invalidDateLabel = 'Enter a valid date within the allowed range.';

  /** Reports a changed, committed value in canonical ISO form. Use this for calendar and typed changes. */
  @Event({ eventName: 'ki-change', cancelable: false })
  kiChange!: EventEmitter<DatePickerChangeDetail>;

  get #open(): boolean {
    return this.draft !== undefined;
  }

  get #effectiveDisabled(): boolean {
    return this.disabled || this.formDisabled;
  }

  get #resolvedLocale(): string {
    return calendarLocale(this.locale, languageOf(this.host));
  }

  get #bounds(): [string | undefined, string | undefined] {
    return [isoDate(this.min), isoDate(this.max)];
  }

  get #savedValue(): string | undefined {
    return normalizeValue(this.value, this.mode, ...this.#bounds);
  }

  get #weekStart(): number {
    return firstWeekday(this.#resolvedLocale, this.firstDayOfWeek);
  }

  componentDidLoad(): void {
    this.syncForm();
  }

  componentDidRender(): void {
    if (this.#focusDayAfterRender && this.#popup) {
      this.#focusDayAfterRender = false;
      const day = this.#popup.querySelector<HTMLButtonElement>('.day[tabindex="0"]');
      (day ?? this.#popup).focus();
    }
  }

  disconnectedCallback(): void {
    this.draft = undefined;
  }

  /**
   * Answers at once whether the field holds a complete, readable date within
   * its bounds and carries no `custom-error`, firing `invalid` when it does
   * not, as a native field does.
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

  @Watch('customError')
  protected customErrorChanged(): void {
    this.#customErrorWithdrawn = false;
    this.syncForm();
  }

  @Watch('value')
  @Watch('mode')
  @Watch('min')
  @Watch('max')
  @Watch('locale')
  @Watch('disabled')
  @Watch('required')
  @Watch('errorText')
  @Watch('invalidDateLabel')
  protected syncForm(_newValue?: unknown, _oldValue?: unknown, prop?: string): void {
    const disabled = this.#effectiveDisabled;
    if (prop === 'value') {
      this.entry = undefined;
      this.value ||= '';
      // A value write or a reset can coalesce with an edit's pending render,
      // which then matches the previous render and leaves the edit's text in
      // the native input.
      if (this.#input) {
        this.#input.value = this.#displayValue(this.#resolvedLocale, this.#savedValue);
      }
    }
    if (disabled || prop === 'value') this.#closeCalendar();
    if (prop === 'mode' || prop === 'locale' || prop === 'min' || prop === 'max') {
      this.#closeCalendar(this.#trigger);
    }
    const value = this.entry === undefined ? this.#savedValue : this.#parse(this.entry);
    const missing = this.required && value === '';
    const customError = this.#customErrorWithdrawn ? '' : (this.customError?.trim() ?? '');
    this.internals.setFormValue(disabled ? null : (value ?? null));
    if (disabled || (!missing && value !== undefined && customError === '')) {
      this.internals.setValidity({});
      this.showError = false;
      return;
    }
    const nativeMessage = this.#input?.validationMessage;
    const fallback = missing && nativeMessage ? nativeMessage : this.invalidDateLabel;
    const override = this.errorText?.trim() ?? '';
    const message = customError || (override === '' ? fallback : override);
    this.internals.setValidity(
      { valueMissing: missing, badInput: value === undefined, customError: customError !== '' },
      message,
      this.#input,
    );
    // A custom error shows at once, without a commit or a submission (D2).
    if (customError !== '') this.showError = true;
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.syncForm();
  }

  formResetCallback(): void {
    this.#customErrorWithdrawn = true;
    this.showError = false;
    this.value = this.host.getAttribute('value') ?? '';
    // Take the value-write path even when the default equals the current value.
    this.syncForm(undefined, undefined, 'value');
  }

  @Listen('invalid')
  protected onInvalid(): void {
    this.showError = true;
  }

  #parse(text: string): string | undefined {
    return parseEntry(text, this.mode, this.#resolvedLocale, ...this.#bounds);
  }

  #displayValue(locale: string, saved: string | undefined): string {
    return saved === undefined ? this.value : formatValue(saved, locale);
  }

  #commit(value: string): void {
    this.entry = undefined;
    if (this.#input) this.#input.value = formatValue(value, this.#resolvedLocale);
    if (this.value !== value) {
      this.#customErrorWithdrawn = true;
      this.value = value;
      this.kiChange.emit({ value });
    } else {
      this.syncForm();
    }
  }

  #onInput = (event: globalThis.Event): void => {
    this.#customErrorWithdrawn = true;
    this.entry = (event.target as HTMLInputElement).value;
    this.syncForm();
  };

  #commitTyped = (): void => {
    if (this.entry === undefined || this.#effectiveDisabled) return;
    const value = this.#parse(this.entry);
    if (value === undefined) {
      this.showError = true;
      return;
    }
    this.#commit(value);
    this.showError = !this.internals.validity.valid;
  };

  #onCalendarToggle = ({ newState }: Pick<ToggleEvent, 'newState'>): void => {
    if (newState === 'closed') {
      this.draft = undefined;
      this.#focusDayAfterRender = false;
      return;
    }
    this.#today = todayDate();
    this.draft = this.#savedValue ?? '';
    this.active = clampDate(this.draft ? this.draft.slice(0, 10) : this.#today, ...this.#bounds);
    this.#focusDayAfterRender = true;
  };

  #closeCalendar(focus?: HTMLElement): void {
    if (!this.#open) return;
    this.#popup?.hidePopover();
    focus?.focus();
  }

  @Listen('keydown')
  protected onKeyDown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing) return;
    if (this.#open && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.#closeCalendar(this.#input);
    }
    if (event.key === 'Enter' && this.#input?.matches(':focus')) {
      event.preventDefault();
      this.#commitTyped();
    }
  }

  #onGridKey = (event: KeyboardEvent): void => {
    const target = event.target;
    const date = (target as HTMLElement).dataset.date;
    if (!date || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const [min, max] = this.#bounds;
    const next = moveDate(
      date,
      event.key,
      this.#weekStart,
      event.shiftKey,
      getComputedStyle(this.host).direction === 'rtl',
      min,
      max,
    );
    if (!next) return;
    event.preventDefault();
    this.#focusDay(next);
  };

  #focusDay(date: string): void {
    if (date === this.active) return;
    this.#focusDayAfterRender = true;
    this.active = date;
  }

  #pick(date: string): void {
    if (!inBounds(date, ...this.#bounds)) return;
    this.#focusDay(date);
    this.draft =
      this.mode === 'range' && this.draft && !this.draft.includes('/')
        ? rangeValue(this.draft, date)
        : date;
    if (!this.confirm) this.#applyDraft();
  }

  get #completeDraft(): boolean {
    return !!this.draft && (this.mode !== 'range' || this.draft.includes('/'));
  }

  #applyDraft = (): void => {
    const value = this.draft;
    if (!value || !this.#completeDraft) return;
    this.#closeCalendar(this.#trigger);
    this.#commit(value);
  };

  #monthButton(target: string, previous: boolean) {
    const disabled = target.startsWith(this.active.slice(0, 7));
    return (
      <button
        key={previous ? 'previous' : 'next'}
        type="button"
        class={previous ? 'icon-button previous' : 'icon-button next'}
        tabIndex={0}
        aria-label={previous ? this.previousMonthLabel : this.nextMonthLabel}
        aria-disabled={disabled ? 'true' : undefined}
        onClick={() => {
          if (!disabled) this.active = target;
        }}
      >
        <ki-icon name="chevron-left" />
      </button>
    );
  }

  #renderCalendar(formats: ReturnType<typeof calendarFormats>) {
    const first = this.#weekStart;
    const [min, max] = this.#bounds;
    const previous = clampDate(addMonths(this.active, -1), min, max);
    const next = clampDate(addMonths(this.active, 1), min, max);
    const month = this.active.slice(0, 7);
    const [start = '', end = start] = this.draft?.split('/') ?? [];
    const range = this.mode === 'range';
    return [
      <div key="header" class="calendar-header">
        {this.#monthButton(previous, true)}
        <h2 key="month" id="month" part="month" aria-live="polite">
          {formats.month.format(fromIso(this.active))}
        </h2>
        {this.#monthButton(next, false)}
      </div>,
      <table
        key="grid"
        role="grid"
        part="grid"
        aria-labelledby="month"
        aria-multiselectable={range ? 'true' : undefined}
        onKeyDown={this.#onGridKey}
      >
        <thead key="weekdays">
          <tr>
            {weekdayDates(first).map((date) => (
              <th scope="col" aria-label={formats.weekday.format(date)}>
                {formats.weekdayShort.format(date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody key="weeks">
          {daysForMonth(this.active, first).map((week) => (
            <tr>
              {week.map((date) => {
                if (!date) return <td />;
                const available = inBounds(date, min, max);
                const selected = date === start || date === end;
                const inRange = range && date >= start && date <= end;
                const day = fromIso(date);
                return (
                  <td
                    aria-selected={selected || inRange ? 'true' : 'false'}
                    class={{ 'in-range': inRange }}
                  >
                    <button
                      type="button"
                      part="day"
                      data-date={date}
                      class={{ day: true, outside: !inRange && !date.startsWith(month), selected }}
                      tabIndex={available && date === this.active ? 0 : -1}
                      aria-label={formats.full.format(day)}
                      aria-current={date === this.#today ? 'date' : undefined}
                      aria-disabled={available ? undefined : 'true'}
                      onClick={() => {
                        this.#pick(date);
                      }}
                    >
                      <span>{formats.day.format(day)}</span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>,
      this.confirm && (
        <div key="footer" class="calendar-footer">
          <button
            type="button"
            tabIndex={0}
            onClick={() => {
              this.#closeCalendar(this.#trigger);
            }}
          >
            {this.cancelLabel}
          </button>
          <button
            type="button"
            tabIndex={0}
            class="apply"
            disabled={!this.#completeDraft}
            onClick={this.#applyDraft}
          >
            <span>{this.applyLabel}</span>
          </button>
        </div>
      ),
    ];
  }

  render() {
    const locale = this.#resolvedLocale;
    if (this.#formats?.locale !== locale)
      this.#formats = { locale, value: calendarFormats(locale) };
    const formats = this.#formats.value;
    const saved = this.#savedValue;
    const name = saved
      ? this.changeLabel.replace('{date}', formatValue(saved, locale, formats.short))
      : this.chooseLabel;
    const error = this.showError ? this.internals.validationMessage : '';
    const help = this.helpText?.trim();
    return [
      <label key="label" part="label" htmlFor="input">
        {this.label}
      </label>,
      <div key="field" part="field">
        <input
          key="input"
          ref={(input) => {
            this.#input = input;
          }}
          id="input"
          part="input"
          value={this.entry ?? this.#displayValue(locale, saved)}
          disabled={this.#effectiveDisabled}
          required={this.required}
          aria-describedby={error ? 'error' : help ? 'help' : undefined}
          aria-invalid={error ? 'true' : 'false'}
          onInput={this.#onInput}
          onBlur={this.#commitTyped}
        />
        <button
          key="trigger"
          ref={(button) => {
            this.#trigger = button;
          }}
          type="button"
          part="trigger"
          class="icon-button"
          tabIndex={0}
          aria-label={name}
          aria-haspopup="dialog"
          aria-expanded={String(this.#open)}
          disabled={this.#effectiveDisabled}
          popoverTarget="calendar"
        >
          <ki-icon key="calendar" name="calendar" />
        </button>
      </div>,
      !error && help && (
        <div key="help" id="help" part="help">
          {help}
        </div>
      ),
      <div key="error" id="error" part="error" aria-live="polite">
        {error}
      </div>,
      <div
        key="dialog"
        ref={(popup) => {
          this.#popup = popup;
        }}
        id="calendar"
        part="popup"
        popover="auto"
        onBeforeToggle={this.#onCalendarToggle}
        role="dialog"
        aria-modal="false"
        aria-label={this.chooseLabel}
        tabIndex={-1}
      >
        {this.#open && this.#renderCalendar(formats)}
      </div>,
    ];
  }
}
