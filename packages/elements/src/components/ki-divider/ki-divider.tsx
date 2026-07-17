import { Component, Prop, h } from '@stencil/core';

export type KiDividerOrientation = 'horizontal' | 'vertical';

/**
 * A static, decorative rule that visually separates adjacent content.
 *
 * @whenToUse visually separate adjacent content when spacing alone is not
 * enough: grouped settings sections, toolbar action groups, distinct
 * regions inside a card — horizontal between stacked content, vertical
 * between side-by-side content.
 * @whenNotToUse between list items (separation is a ki-list theme-token
 * decision), semantic thematic breaks in running prose (native `<hr>`
 * carries those semantics — the divider is deliberately decorative and
 * contributes no role, name or announcement), as a border or outline
 * substitute (surface/border tokens), or purely decorative flourishes
 * (prefer white space).
 *
 * @part divider - The rule itself: thickness, color and end-cap radius.
 */
@Component({
  tag: 'ki-divider',
  styleUrl: 'ki-divider.css',
  shadow: true,
})
export class KiDivider {
  /**
   * Layout axis of the rule: `horizontal` spans the available inline size
   * between stacked content; `vertical` stretches to the cross size its
   * layout context provides, between side-by-side content. A structural
   * axis, never appearance — thickness, color, end caps and gutter are
   * per-theme `--ki-divider-*` tokens. An unrecognized value matches no
   * style selector, so the divider keeps the default horizontal rendering
   * (fallback by CSS construction — no validation code).
   * @default 'horizontal'
   */
  @Prop({ reflect: true }) orientation: KiDividerOrientation = 'horizontal';

  render() {
    // No slots (FR-008): light-DOM children are never rendered.
    return <div part="divider"></div>;
  }
}
