import '../../../icons/star.js';

import { AttachInternals, Component, Element, Event, h, Prop, State, Watch } from '@stencil/core';
import type { EventEmitter } from '@stencil/core';
import { getIcon } from '../../utils/icon-registry.mjs';
import { getKeyboardIntent } from '../../utils/keyboard-intent';
import { rovingFocusIndex } from '../../utils/roving-focus';
import { ratingMax, ratingStep, ratingValue } from './ki-rating.scale';

/**
 * Displays a score or collects one choice on a small rating scale.
 *
 * @whenToUse Show an average review score in readonly mode or ask people to rate
 * an answer, experience, or product on a small scale.
 * @whenNotToUse Use message actions for yes/no feedback and a slider for a
 * continuous or large numeric range.
 *
 * @part label - Visible question above the editable scale.
 * @part scale - Read-only score image or editable radio group.
 * @part glyph - Decorative artwork for one rating step.
 * @part choice - Native radio target for one selectable score.
 * @part score - Visible numeric score.
 */
@Component({
  tag: 'ki-rating',
  styleUrl: 'ki-rating.css',
  shadow: true,
  formAssociated: true,
})
export class KiRating {
  @Element() private readonly host!: HTMLElement;
  @AttachInternals() private readonly internals!: ElementInternals;
  @State() private formDisabled = false;
  private initialValue = 0;

  /** Visible question in input mode and accessible context in read-only mode. Always supply it. */
  @Prop() label!: string;

  /**
   * Current score. Zero means unanswered in input mode. Editable scores use
   * the nearest allowed step. Read-only scores retain their decimal precision.
   * @minimum 0
   * @maximum 10
   */
  @Prop({ mutable: true }) value = 0;

  /**
   * Highest score and number of glyphs. Use a whole number from 1 to 10.
   * @minimum 1
   * @maximum 10
   */
  @Prop() max = 5;

  /** Displays a score without editing or submitting it. */
  @Prop({ reflect: true }) readonly = false;

  /** Choose 1 for whole steps or 0.5 for half steps. Other inputs use whole steps. */
  @Prop() precision = 1;

  /** Lucide icon name. Import custom names before mounting. Unavailable names use star. */
  @Prop() iconName = 'star';

  /** Form field name for a selected editable score. */
  @Prop({ reflect: true }) name?: string;

  /** Requires an editable score before the form can be submitted. */
  @Prop({ reflect: true }) required = false;

  /** Makes an editable rating unavailable and excludes it from form submission. */
  @Prop({ reflect: true }) disabled = false;

  /** Accessible name pattern for the read-only image. Use {value} and {max} for the scores. */
  @Prop() ratedLabel = 'Rated {value} out of {max}';

  /** Accessible name pattern for the one-star choice. Use {value} for the choice. */
  @Prop() optionSingularLabel = '{value} star';

  /** Accessible name pattern for the other choices. Use {value} for the choice. */
  @Prop() optionLabel = '{value} stars';

  /** Visible score pattern in input mode. Use {value} and {max} for the scores. */
  @Prop() scoreLabel = '{value} of {max}';

  /** Validation message for an unanswered required rating. */
  @Prop() requiredMessage = 'Select a rating.';

  /** Fires once when a person changes the selection. The detail contains the numeric value. */
  @Event({ eventName: 'ki-change', bubbles: true, composed: true, cancelable: false })
  kiChange!: EventEmitter<{ value: number }>;

  componentWillLoad(): void {
    this.initialValue = this.value;
    this.normalizeAndSync();
  }

  componentDidRender(): void {
    // The first radio is the validity anchor after mounting or switching modes.
    this.syncForm();
  }

  @Watch('value')
  @Watch('max')
  @Watch('precision')
  @Watch('readonly')
  protected normalizeAndSync(): void {
    const step = this.readonly ? 0 : ratingStep(this.precision);
    const normalized = ratingValue(this.value, ratingMax(this.max), step);
    if (normalized !== this.value) {
      this.value = normalized;
    }
    this.syncForm();
  }

  @Watch('required')
  @Watch('requiredMessage')
  @Watch('disabled')
  protected syncForm(): void {
    const enabledInput = !this.readonly && !this.unavailable;
    const state = this.readonly ? null : String(this.value);
    this.internals.setFormValue(enabledInput && this.value > 0 ? state : null, state);
    if (enabledInput && this.required && this.value === 0) {
      const anchor = this.host.shadowRoot?.querySelector('input') ?? undefined;
      this.internals.setValidity(
        { valueMissing: true },
        this.requiredMessage || 'Select a rating.',
        anchor,
      );
    } else {
      this.internals.setValidity({});
    }
  }

  formResetCallback(): void {
    this.value = this.initialValue;
    // Reapply the live score after the browser resets native checked state.
    // Stencil can coalesce a selection and its reset into the same render.
    requestAnimationFrame(() => {
      const selected = String(this.value);
      this.host.shadowRoot?.querySelectorAll('input').forEach((radio) => {
        radio.checked = radio.value === selected;
      });
    });
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.syncForm();
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (!this.readonly && typeof state === 'string') {
      this.value = Number(state);
    }
  }

  private get unavailable(): boolean {
    return this.disabled || this.formDisabled;
  }

  private format(pattern: string | null, fallback: string, value: number, max: number): string {
    // Stencil delivers null when the attribute that supplied a pattern is removed.
    return (pattern ?? fallback)
      .replaceAll('{value}', String(value))
      .replaceAll('{max}', String(max));
  }

  private onChoiceChange = (event: Event): void => {
    const radio = event.currentTarget as HTMLInputElement;
    const value = Number(radio.value);
    if (!this.unavailable && radio.checked && value !== this.value) {
      this.value = value;
      this.kiChange.emit({ value });
    }
  };

  private onChoiceKeyDown = (event: KeyboardEvent): void => {
    const current = event.currentTarget as HTMLInputElement;
    const direction = getComputedStyle(current).direction === 'rtl' ? 'rtl' : 'ltr';
    const intent = getKeyboardIntent(event.key, 'both', direction);
    if (this.unavailable || event.altKey || event.ctrlKey || event.metaKey) return;
    if (intent !== 'next' && intent !== 'previous') return;

    // Own arrow movement so RTL and wrap are consistent across engines. Native
    // radio activation still handles click and Space.
    event.preventDefault();
    const group = this.host.shadowRoot;
    if (!group) return;
    const choices = [...group.querySelectorAll('input')];
    const index = rovingFocusIndex(choices, choices.indexOf(current), intent, { wrap: true });
    const next = index === null ? undefined : choices[index];
    next?.focus();
    next?.click();
  };

  private stopNativeInput = (event: Event): void => {
    event.stopPropagation();
  };

  private renderGlyph(icon: string, position: number, displayed: number) {
    const filled = displayed >= position;
    const half = displayed === position - 0.5;
    return (
      <span key={`glyph-${String(position)}`} part="glyph" aria-hidden="true">
        {!filled && <ki-icon key="outline" name={icon} class="outline" />}
        {(filled || half) && (
          <span key="fill" class={{ fill: true, half }}>
            <ki-icon key="ink" name={icon} />
          </span>
        )}
      </span>
    );
  }

  private renderChoice(value: number, tabStop: number, max: number) {
    const label =
      value === 1
        ? this.format(this.optionSingularLabel, '{value} star', value, max)
        : this.format(this.optionLabel, '{value} stars', value, max);
    return (
      <input
        key={value}
        part="choice"
        type="radio"
        name="rating"
        value={String(value)}
        checked={this.value === value}
        disabled={this.unavailable}
        tabIndex={!this.unavailable && value === tabStop ? 0 : -1}
        aria-label={label}
        onInput={this.stopNativeInput}
        onChange={this.onChoiceChange}
        onKeyDown={this.onChoiceKeyDown}
      />
    );
  }

  render() {
    const icon = getIcon(this.iconName) === undefined ? 'star' : this.iconName;
    const max = ratingMax(this.max);
    const positions = Array.from({ length: max }, (_, index) => index + 1);
    if (this.readonly) {
      const artworkValue = ratingValue(this.value, max, 0.5);
      return (
        <div key="display">
          <span key="context" id="rating-context" hidden>
            {this.label}
          </span>
          <div
            key="image"
            part="scale"
            role="img"
            aria-label={this.format(this.ratedLabel, 'Rated {value} out of {max}', this.value, max)}
            aria-describedby="rating-context"
          >
            <span key="glyphs" class="marks" aria-hidden="true">
              {positions.map((position) => this.renderGlyph(icon, position, artworkValue))}
            </span>
            <span key="score" part="score" aria-hidden="true">
              {this.value}
            </span>
          </div>
        </div>
      );
    }

    const step = ratingStep(this.precision);
    const half = step === 0.5;
    const tabStop = this.value || step;
    return (
      <div key="input">
        <span key="label" id="rating-label" part="label">
          {this.label}
        </span>
        <div
          key="group"
          part="scale"
          role="radiogroup"
          aria-labelledby="rating-label"
          aria-required={this.required ? 'true' : undefined}
          aria-disabled={this.unavailable ? 'true' : undefined}
        >
          <span key="choices" class="marks">
            {positions.map((position) => (
              <span key={position} class={{ stop: true, half }}>
                {half && this.renderChoice(position - 0.5, tabStop, max)}
                {this.renderChoice(position, tabStop, max)}
                {this.renderGlyph(icon, position, this.value)}
              </span>
            ))}
          </span>
          <span key="score" part="score" aria-hidden="true">
            {this.format(this.scoreLabel, '{value} of {max}', this.value, max)}
          </span>
        </div>
      </div>
    );
  }
}
