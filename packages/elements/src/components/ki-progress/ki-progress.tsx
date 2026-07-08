import { Component, Prop, h } from '@stencil/core';
import { clampValue, normalizeMax, resolveShape, type KiProgressShape } from './ki-progress.math';

interface ProgressBaseAttributes {
  'aria-label'?: string | undefined;
  'aria-valuemax': string;
  'aria-valuemin': string;
  'aria-valuenow'?: string | undefined;
  class: string;
  role: string;
}

/**
 * A token-styled, non-interactive progress indicator for known or unknown
 * duration work.
 *
 * When to use: communicate advancement of an ongoing task with `value`/`max`
 * when the fraction is known, or ongoing activity of unknown duration with
 * `indeterminate`.
 * When NOT to use: static measurements, wizard steps, skeleton placeholders,
 * or sub-second operations.
 *
 * @part track - Full channel or ring behind the advancing indicator.
 * @part indicator - Advancing fill or arc that represents current progress.
 */
@Component({
  tag: 'ki-progress',
  styleUrl: 'ki-progress.css',
  shadow: true,
})
export class KiProgress {
  /**
   * Completed amount. Presentation and ARIA clamp this value to `0..max`;
   * malformed values fall back to `0`.
   *
   * @default 0
   */
  @Prop({ reflect: true }) value = 0;

  /**
   * Total amount. Non-finite, zero or negative values normalize to `100` for
   * presentation and ARIA.
   *
   * @default 100
   */
  @Prop({ reflect: true }) max = 100;

  /**
   * Unknown-duration mode. When set, no completed fraction or current value is
   * exposed; use when work is ongoing but cannot be measured.
   *
   * @default false
   */
  @Prop({ reflect: true }) indeterminate = false;

  /**
   * Structural presentation. Use `linear` in page flows and lists; use
   * `circular` in compact or centered placements. Unknown values render linear.
   *
   * @default 'linear'
   */
  @Prop({ reflect: true }) shape: KiProgressShape = 'linear';

  /**
   * Accessible name applied to the internal progressbar. Always set this to
   * what is progressing, such as "Uploading report.pdf".
   */
  @Prop({ reflect: true }) label?: string;

  private get normalizedMax(): number {
    return normalizeMax(this.max);
  }

  private get clampedValue(): number {
    return clampValue(this.value, this.normalizedMax);
  }

  private get resolvedShape(): KiProgressShape {
    return resolveShape(this.shape);
  }

  private get fraction(): number {
    return this.clampedValue / this.normalizedMax;
  }

  private baseAttributes(): ProgressBaseAttributes {
    const attrs: ProgressBaseAttributes = {
      'aria-valuemax': String(this.normalizedMax),
      'aria-valuemin': '0',
      class: `base base-${this.resolvedShape}`,
      role: 'progressbar',
    };

    if (this.label) {
      attrs['aria-label'] = this.label;
    }

    if (!this.indeterminate) {
      attrs['aria-valuenow'] = String(this.clampedValue);
    }

    return attrs;
  }

  private renderLinear() {
    return (
      <div part="track">
        <div part="indicator" />
      </div>
    );
  }

  private renderCircular() {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle part="track" cx="24" cy="24" r="20" pathLength="100" />
        <circle part="indicator" cx="24" cy="24" r="20" pathLength="100" />
      </svg>
    );
  }

  render() {
    const attrs = this.baseAttributes();
    const children =
      this.resolvedShape === 'circular' ? this.renderCircular() : this.renderLinear();

    if (this.indeterminate) {
      return <div {...attrs}>{children}</div>;
    }

    return (
      <div {...attrs} style={{ '--_ki-progress-fraction': String(this.fraction) }}>
        {children}
      </div>
    );
  }
}
