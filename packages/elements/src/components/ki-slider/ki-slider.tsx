import { AttachInternals, Component, Element, h, Prop, State, Watch } from '@stencil/core';
import {
  booleanFromAttributePresence,
  observeAttributePresence,
} from '../../utils/boolean-presence';
import {
  formatSlider,
  moveBySteps,
  normalizeScale,
  readSelection,
  scaleFraction,
  type SliderSelection,
  snapValue,
} from './ki-slider.math';

export type KiSliderFormat = 'number' | 'percent' | 'currency';
export type KiSliderOrientation = 'horizontal' | 'vertical';

const DEFAULT_LABEL = 'Slider';
const MINIMUM_LABEL = 'minimum';
const MAXIMUM_LABEL = 'maximum';
type Thumb = 0 | 1;

const percent = (fraction: number) => `${String(fraction * 100)}%`;
const serialize = (selection: SliderSelection, range: boolean): number | string =>
  range ? selection.join(',') : selection[0];

function labelText(value: string | undefined, fallback: string): string {
  const text = value?.trim();
  return text === undefined || text === '' ? fallback : text;
}

interface Drag {
  id: number;
  thumb: Thumb;
  start: SliderSelection;
  offset: number;
  chooseDirection: boolean;
}

/**
 * Adjusts a value or an interval on a bounded scale.
 *
 * @whenToUse coarse adjustments such as volume, balance or a price filter,
 * with a descriptive label.
 * @whenNotToUse when people need to enter exact numbers or choose among a
 * few named options. Use a number input or radio group for those tasks.
 * @part field - Layout containing the visible label, value, controls and help.
 * @part label - Visible text used to name the control.
 * @part value - Formatted value or interval shown beside the label.
 * @part track - Inactive rail between the two ends of the scale.
 * @part fill - Active portion of the rail.
 * @part thumb - Focusable pointer target for one end of the selection.
 * @part mark - Decorative scale mark at an interval boundary.
 * @part center-tick - Midpoint mark on a centered scale.
 * @part help - Supporting text associated with each thumb.
 * @event change - Bubbles once when a pointer operation commits a different
 * selection or a keyboard action changes it. Read the current host value.
 * For updates during a drag, listen for the standard bubbling `input` event.
 * Programmatic updates and form resets are silent.
 */
@Component({
  tag: 'ki-slider',
  styleUrl: 'ki-slider.css',
  // Shadow DOM keeps the rail and named slider roles together with their help.
  shadow: { delegatesFocus: true },
  formAssociated: true,
})
export class KiSlider {
  @Element() private readonly host!: HTMLElement;
  @AttachInternals() private readonly internals!: ElementInternals;

  /** Visible base name. Use a task-specific, localized label. @default 'Slider' */
  @Prop() label?: string = 'Slider';

  /** Optional supporting text, read as the description of each thumb. */
  @Prop() helpText?: string;

  /** Native form key. Omit when the value should remain local to the control. */
  @Prop({ reflect: true }) name?: string;

  /** Makes the slider unavailable for pointer, keyboard and form submission. @default false */
  @Prop({ reflect: true }) disabled = false;

  /** Inclusive lower bound and step origin. @default 0 */
  @Prop() min = 0;

  /** Inclusive upper bound. A maximum below min collapses the scale. @default 100 */
  @Prop() max = 100;

  /** Positive increment. Values snap from min and max is always reachable. @default 1 */
  @Prop() step = 1;

  /**
   * Current selection as a number or, in range mode, a comma-separated pair.
   * HTML attributes also accept the scalar as numeric text. Defaults to min
   * for one thumb and to both bounds for a range. User updates are normalized.
   */
  @Prop({ mutable: true }) value: number | string | undefined;

  /** Enables two non-crossing thumbs in minimum then maximum tab order. @default false */
  @Prop() range = false;

  /**
   * Number of evenly spaced tick intervals, up to 100. Zero hides ticks.
   * @maximum 100
   * @minimum 0
   * @default 0
   */
  @Prop() marks = 0;

  /** Display format for the readout and accessible values. @default 'number' */
  @Prop() format: KiSliderFormat = 'number';

  /** ISO 4217 code used with currency format. @default 'EUR' */
  @Prop() currency = 'EUR';

  /** Localized suffix for the lower thumb's accessible name. @default 'minimum' */
  @Prop() minimumLabel?: string = 'minimum';

  /** Localized suffix for the upper thumb's accessible name. @default 'maximum' */
  @Prop() maximumLabel?: string = 'maximum';

  /** Shows a midpoint tick and fills from that point to a single thumb. @default false */
  @Prop() centered = false;

  /** Axis of the scale. A vertical scale increases towards the top. @default 'horizontal' */
  @Prop() orientation: KiSliderOrientation = 'horizontal';

  @State() private formDisabled = false;

  private rail: HTMLElement | undefined;
  private interaction: HTMLElement | undefined;
  private readonly thumbs: [HTMLElement | undefined, HTMLElement | undefined] = [
    undefined,
    undefined,
  ];
  private initialValue: string | number | undefined;
  private drag: Drag | undefined;
  private presenceObserver?: MutationObserver;

  private get scale() {
    return normalizeScale(this.min, this.max, this.step);
  }

  private get unavailable(): boolean {
    return this.disabled || this.formDisabled;
  }

  private get vertical(): boolean {
    return this.orientation === 'vertical';
  }

  connectedCallback(): void {
    this.presenceObserver = observeAttributePresence(this.host, ['disabled'], () => {
      this.disabled = true;
    });
  }

  componentWillLoad(): void {
    this.disabled = booleanFromAttributePresence(this.disabled, this.host.hasAttribute('disabled'));
    this.initialValue = this.value;
    this.syncSelection();
  }

  disconnectedCallback(): void {
    this.presenceObserver?.disconnect();
    this.endDrag();
  }

  @Watch('value')
  @Watch('range')
  @Watch('min')
  @Watch('max')
  @Watch('step')
  protected syncSelection(): void {
    const value = serialize(readSelection(this.value, this.range, this.scale), this.range);
    if (this.value !== value) this.value = value;
    this.internals.setFormValue(this.unavailable ? null : String(value));
  }

  @Watch('disabled')
  protected syncDisabled(): void {
    if (this.unavailable) {
      this.endDrag();
      this.thumbs[0]?.blur();
      this.thumbs[1]?.blur();
    }
    this.syncSelection();
  }

  formDisabledCallback(disabled: boolean): void {
    this.formDisabled = disabled;
    this.syncDisabled();
  }

  formResetCallback(): void {
    this.endDrag();
    this.value = this.initialValue;
    this.syncSelection();
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === 'string') this.value = state;
  }

  private emit(type: 'input' | 'change'): void {
    this.host.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
  }

  private updateThumb(thumb: Thumb, candidate: number): boolean {
    const [lower, upper] = readSelection(this.value, this.range, this.scale);
    const snapped = snapValue(candidate, this.scale);
    const nextLower = thumb === 0 ? (this.range ? Math.min(snapped, upper) : snapped) : lower;
    const nextUpper = thumb === 1 ? Math.max(snapped, lower) : upper;
    if (nextLower === lower && nextUpper === upper) return false;
    this.value = serialize([nextLower, nextUpper], this.range);
    this.emit('input');
    return true;
  }

  private rtl(): boolean {
    return getComputedStyle(this.host).direction === 'rtl';
  }

  private onKeyDown(event: KeyboardEvent, thumb: Thumb): void {
    if (this.unavailable || this.drag !== undefined) return;
    const scale = this.scale;
    const [lower, upper] = readSelection(this.value, this.range, scale);
    const current = thumb === 0 ? lower : upper;
    const forward = !this.vertical && this.rtl() ? -1 : 1;
    const moves: Readonly<Record<string, number>> = {
      ArrowRight: forward,
      ArrowLeft: -forward,
      ArrowUp: 1,
      ArrowDown: -1,
      PageUp: 10,
      PageDown: -10,
      Home: Number.NEGATIVE_INFINITY,
      End: Number.POSITIVE_INFINITY,
    };
    const count = Object.hasOwn(moves, event.key) ? moves[event.key] : undefined;
    if (count === undefined) return;
    event.preventDefault();
    if (this.updateThumb(thumb, moveBySteps(current, count, scale))) this.emit('change');
  }

  private pointerFraction(event: PointerEvent): number {
    const rail = this.rail?.getBoundingClientRect();
    if (rail === undefined) return 0;
    if (this.vertical) return rail.height > 0 ? (rail.bottom - event.clientY) / rail.height : 0;
    if (rail.width === 0) return 0;
    return this.rtl()
      ? (rail.right - event.clientX) / rail.width
      : (event.clientX - rail.left) / rail.width;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.unavailable || !event.isPrimary || event.button !== 0 || this.drag !== undefined)
      return;
    const start = readSelection(this.value, this.range, this.scale);
    const position = this.pointerFraction(event);
    const lower = scaleFraction(start[0], this.scale);
    const upper = scaleFraction(start[1], this.scale);
    const target = event.target;
    const hitThumb = target === this.thumbs[0] || target === this.thumbs[1];
    const nearUpper = Math.abs(position - upper) < Math.abs(position - lower);
    const thumb = this.range && nearUpper ? 1 : 0;
    const offset = hitThumb ? position - (thumb === 0 ? lower : upper) : 0;

    event.preventDefault();
    this.drag = {
      id: event.pointerId,
      thumb,
      start,
      offset,
      chooseDirection: this.range && start[0] === start[1],
    };
    this.interaction?.setPointerCapture(event.pointerId);
    this.thumbs[thumb]?.focus({ preventScroll: true });
    if (!hitThumb) this.movePointer(event, this.drag);
  };

  private movePointer(event: PointerEvent, drag: Drag): void {
    const fraction = Math.max(0, Math.min(1, this.pointerFraction(event) - drag.offset));
    const { min, max } = this.scale;
    const candidate = fraction * max + (1 - fraction) * min;
    if (drag.chooseDirection && snapValue(candidate, this.scale) !== drag.start[0]) {
      drag.thumb = candidate < drag.start[0] ? 0 : 1;
      drag.chooseDirection = false;
      this.thumbs[drag.thumb]?.focus({ preventScroll: true });
    }
    this.updateThumb(drag.thumb, candidate);
  }

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (this.drag?.id === event.pointerId) this.movePointer(event, this.drag);
  };

  private endDrag(): Drag | undefined {
    const drag = this.drag;
    this.drag = undefined;
    if (drag !== undefined && this.interaction?.hasPointerCapture(drag.id)) {
      this.interaction.releasePointerCapture(drag.id);
    }
    return drag;
  }

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (this.drag?.id !== event.pointerId) return;
    const drag = this.endDrag();
    const [lower, upper] = readSelection(this.value, this.range, this.scale);
    if (drag !== undefined && (lower !== drag.start[0] || upper !== drag.start[1])) {
      this.emit('change');
    }
  };

  private readonly onPointerCancel = (event: PointerEvent): void => {
    if (this.drag?.id !== event.pointerId) return;
    const drag = this.endDrag();
    if (drag === undefined) return;
    const initial = serialize(drag.start, this.range);
    if (initial !== this.value) {
      this.value = initial;
      this.emit('input');
    }
  };

  private locale(): string | undefined {
    let origin: Element | undefined = this.host;
    while (origin !== undefined) {
      const language = origin.closest('[lang]')?.getAttribute('lang');
      if (language !== null && language !== undefined) return language || undefined;
      const root = origin.getRootNode();
      origin = root instanceof ShadowRoot ? root.host : undefined;
    }
    return undefined;
  }

  private renderThumb(index: Thumb, selection: SliderSelection, text: string, label: string) {
    const scale = this.scale;
    const value = selection[index];
    const suffix =
      index === 0
        ? labelText(this.minimumLabel, MINIMUM_LABEL)
        : labelText(this.maximumLabel, MAXIMUM_LABEL);
    return (
      <span
        part="thumb"
        ref={(element) => {
          this.thumbs[index] = element;
        }}
        role="slider"
        tabindex={this.unavailable ? -1 : 0}
        aria-label={this.range ? `${label} ${suffix}` : label}
        aria-valuemin={index === 1 ? selection[0] : scale.min}
        aria-valuemax={this.range && index === 0 ? selection[1] : scale.max}
        aria-valuenow={value}
        aria-valuetext={text}
        aria-orientation={this.vertical ? 'vertical' : 'horizontal'}
        aria-describedby={this.helpText ? 'help' : undefined}
        aria-disabled={this.unavailable ? 'true' : undefined}
        style={{ '--_position': percent(scaleFraction(value, scale)) }}
        onKeyDown={(event) => {
          this.onKeyDown(event, index);
        }}
      />
    );
  }

  render() {
    const scale = this.scale;
    const selection = readSelection(this.value, this.range, scale);
    const lower = scaleFraction(selection[0], scale);
    const upper = scaleFraction(selection[1], scale);
    const centered = this.centered && !this.range;
    const start = this.range ? lower : centered ? Math.min(0.5, lower) : 0;
    const end = centered ? Math.max(0.5, lower) : upper;
    const marks = Number.isFinite(this.marks)
      ? Math.max(0, Math.min(100, Math.floor(this.marks)))
      : 0;
    const formatter = formatSlider(this.locale(), this.format, this.currency);
    const label = labelText(this.label, DEFAULT_LABEL);
    const first = formatter.format(selection[0]);
    const last = this.range ? formatter.format(selection[1]) : first;

    return (
      <div
        part="field"
        class={{ field: true, vertical: this.vertical, disabled: this.unavailable }}
      >
        <span part="label">{label}</span>
        <span part="value" aria-hidden="true">
          {this.range ? `${first} – ${last}` : first}
        </span>
        <div
          class="interaction"
          ref={(element) => {
            this.interaction = element;
          }}
          onPointerDown={this.onPointerDown}
          onPointerMove={this.onPointerMove}
          onPointerUp={this.onPointerUp}
          onPointerCancel={this.onPointerCancel}
          onLostPointerCapture={this.onPointerCancel}
        >
          <div
            part="track"
            ref={(element) => {
              this.rail = element;
            }}
          >
            <span
              part="fill"
              aria-hidden="true"
              style={{
                '--_start': percent(start),
                '--_length': percent(scale.min === scale.max ? 0 : end - start),
              }}
            />
            {marks > 0 &&
              Array.from({ length: marks + 1 }, (_, index) => (
                <span
                  part="mark"
                  aria-hidden="true"
                  style={{ '--_position': percent(index / marks) }}
                />
              ))}
            {centered && <span part="center-tick" aria-hidden="true" />}
            {this.renderThumb(0, selection, first, label)}
            {this.range && this.renderThumb(1, selection, last, label)}
          </div>
        </div>
        {this.helpText && (
          <span id="help" part="help">
            {this.helpText}
          </span>
        )}
      </div>
    );
  }
}
