import { Component, Prop, State, h } from '@stencil/core';
import type { KiLayoutGap } from '../../utils/layout-gap';
import { layoutGapToken } from '../../utils/layout-gap';
import { fixedColumnCount } from './ki-grid.columns';

function explicitMinimum(value: string): string | undefined {
  if (
    value === '15rem' ||
    !CSS.supports('border-inline-start-width', value) ||
    !CSS.supports('grid-template-columns', `repeat(auto-fill, minmax(min(100%, ${value}), 1fr))`)
  ) {
    return undefined;
  }
  return value;
}

/**
 * A passive responsive grid for content items.
 *
 * @whenToUse lay out items on responsive tracks with consistent token spacing.
 * @whenNotToUse for page shells, painted grouping (use ki-card), or a data grid.
 * @slot - The content in reading order. A direct child with data-span="2" spans two tracks when they fit.
 * @part grid - The grid layout containing the slotted content.
 * @cssprop --ki-grid-gap - The default gap on the host. An explicit non-default gap selects a semantic spacing step.
 * @cssprop --ki-grid-min - The default minimum width of an automatic track. Ignored in fixed mode.
 */
// Shadow DOM isolates the track rules while the slot preserves consumer semantics.
@Component({ tag: 'ki-grid', styleUrl: 'ki-grid.css', shadow: true })
export class KiGrid {
  /**
   * Positive whole track count. Below 30rem of available inline size the fixed
   * grid uses one column. Omit columns for automatic tracks.
   * @minimum 1
   */
  @Prop() columns?: number;

  /** Minimum automatic track size as a CSS length. Defaults to 15rem and is ignored with fixed columns. */
  @Prop() minColumn = '15rem';

  /** Kimen spacing step, xl by default. Unsupported values keep the default gap. */
  @Prop() gap: KiLayoutGap = 'xl';

  @State() private wide = false;

  private grid: HTMLElement | undefined;
  private measure: HTMLElement | undefined;
  private observer?: ResizeObserver;

  connectedCallback() {
    this.observeSize();
  }

  componentDidLoad() {
    this.observeSize();
  }

  disconnectedCallback() {
    this.observer?.disconnect();
  }

  private observeSize() {
    const { grid, measure } = this;
    if (grid === undefined || measure === undefined) {
      return;
    }

    // Observe the track threshold as well as the grid. Theme, font, and prop
    // changes can move the threshold without moving the grid's inline size.
    this.observer ??= new ResizeObserver(() => {
      const available = Number.parseFloat(getComputedStyle(grid).inlineSize);
      const required = Number.parseFloat(getComputedStyle(measure).inlineSize);
      this.wide = available >= required;
    });
    this.observer.observe(grid);
    this.observer.observe(measure);
  }

  render() {
    const columns = fixedColumnCount(this.columns);
    const minimum = columns === undefined ? explicitMinimum(this.minColumn) : undefined;
    const gap = layoutGapToken(this.gap, 'xl');
    const style: Record<string, string> = {};
    if (columns !== undefined) style['--_grid-columns'] = String(columns);
    if (minimum !== undefined) style['--ki-grid-min'] = minimum;
    if (gap !== undefined) style['--ki-grid-gap'] = gap;

    return (
      <div
        part="grid"
        ref={(el) => {
          this.grid = el;
        }}
        data-fixed={columns !== undefined ? '' : undefined}
        data-wide={this.wide ? '' : undefined}
        data-span={this.wide && columns !== 1 ? '' : undefined}
        style={style}
      >
        <slot />
        <div class="track-measure">
          <span
            class="track-threshold"
            ref={(el) => {
              this.measure = el;
            }}
          />
        </div>
      </div>
    );
  }
}
