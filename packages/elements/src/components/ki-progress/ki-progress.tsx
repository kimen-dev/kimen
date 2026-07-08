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
 * When to use: communicate advancement of an ongoing task such as upload,
 * download, installation or multi-step processing. Use `value`/`max` when
 * the completed fraction is known; use `indeterminate` when work is ongoing
 * but its duration cannot be measured, including loading-indicator use cases.
 * Choose `linear` in page flows and lists, and `circular` in compact or
 * centered placements. Always set `label` to what is progressing.
 * When NOT to use: static measurements within a known range such as disk
 * usage or scores (gauge/meter), step-by-step wizard navigation (stepper),
 * skeleton placeholders while content loads, or operations that finish in
 * under about one second.
 *
 * @part track - The full channel or ring: track ink and radius/stroke geometry.
 * @part indicator - The advancing fill or arc: indicator ink and indeterminate
 * animation.
 */
@Component({
  tag: 'ki-progress',
  styleUrl: 'ki-progress.css',
  shadow: true,
})
export class KiProgress {
  /**
   * Completed amount. Presentation and ARIA clamp this value to `0..max`;
   * malformed values fall back to `0`. Ignored while `indeterminate` is set.
   * When to use: set with `max` for determinate task advancement.
   * When NOT to use: do not set a fabricated value for unknown-duration work;
   * set `indeterminate` instead.
   *
   * @default 0
   */
  @Prop({ reflect: true }) value = 0;

  /**
   * Total amount. Non-finite, zero or negative values normalize to `100` for
   * presentation and ARIA.
   * When to use: set when a determinate task's total is not 100.
   * When NOT to use: omit for conventional percentage-style progress.
   *
   * @default 100
   */
  @Prop({ reflect: true }) max = 100;

  /**
   * Unknown-duration mode. When set, no completed fraction or current value is
   * exposed. Its motion is declared only when reduced motion is not requested.
   * When to use: show ongoing work whose duration or total cannot be measured.
   * When NOT to use: do not use for known fractions; use `value` and `max`.
   *
   * @default false
   */
  @Prop({ reflect: true }) indeterminate = false;

  /**
   * Structural presentation. Use `linear` in page flows and lists; use
   * `circular` in compact or centered placements. Unknown values render linear.
   * When NOT to use: do not use shape to encode semantic status or task intent.
   *
   * @default 'linear'
   */
  @Prop({ reflect: true }) shape: KiProgressShape = 'linear';

  /**
   * Accessible name applied to the internal progressbar. Always set this to
   * what is progressing, such as "Uploading report.pdf". Without it the
   * element renders but exposes no accessible name.
   * When NOT to use: do not use a generic label such as "Loading" when the
   * task can be named more specifically.
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
