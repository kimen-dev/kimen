import { Component, Prop, h } from '@stencil/core';
import type { KiLayoutGap } from '../../utils/layout-gap';
import { layoutGapToken } from '../../utils/layout-gap';

export type KiStackDirection = 'column' | 'row';
export type KiStackAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type KiStackJustify = 'start' | 'center' | 'end' | 'between';

/**
 * A passive flex layout for content on one axis.
 *
 * @whenToUse arrange content in a vertical sequence or a horizontal row with
 * consistent token spacing.
 * @whenNotToUse for page shells, painted grouping (use ki-card), or tabular data.
 * @slot - The content in reading order. A direct child with data-grow takes a share of free space.
 * @part stack - The flex layout containing the slotted content.
 * @cssprop --ki-stack-gap - The default gap on the host. An explicit non-default gap selects a semantic spacing step.
 */
// Shadow DOM isolates the layout rules while the slot preserves consumer semantics.
@Component({ tag: 'ki-stack', styleUrl: 'ki-stack.css', shadow: true })
export class KiStack {
  /** Main axis, column by default. */
  @Prop({ reflect: true }) direction: KiStackDirection = 'column';

  /** Kimen spacing step, md by default. Unsupported values keep the default gap. */
  @Prop() gap: KiLayoutGap = 'md';

  /** Cross-axis alignment, stretch by default. */
  @Prop({ reflect: true }) align: KiStackAlign = 'stretch';

  /** Main-axis distribution, start by default. Use between to distribute spare space. */
  @Prop({ reflect: true }) justify: KiStackJustify = 'start';

  /** Allow items to continue on a new line. Defaults to false. */
  @Prop({ reflect: true }) wrap = false;

  render() {
    const gap = layoutGapToken(this.gap, 'md');

    return (
      <div part="stack" style={gap === undefined ? {} : { '--ki-stack-gap': gap }}>
        <slot />
      </div>
    );
  }
}
