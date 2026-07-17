import { Component, Prop, h } from '@stencil/core';

export type KiStatusTone = 'neutral' | 'success' | 'danger' | 'info' | 'warning';

/**
 * A tiny, non-interactive status dot that marks the state of a nearby item.
 *
 * @whenToUse mark a state with minimal footprint adjacent to (or overlaid
 * on) the item it describes: presence on an avatar, health of a service
 * list entry, connection state in a toolbar. Label it (`label`) or pair it
 * with adjacent visible text — color is never the only carrier of the
 * meaning (WCAG 1.4.1).
 * @whenNotToUse short labeled status text (that pill is ki-badge — this dot
 * never renders text), notification counters or the overlay attachment
 * mechanism (a future, separate nav-badge concern), messages that need
 * attention or announcement (ki-alert — the dot has no live region),
 * progress or loading (ki-progress). An unlabeled dot without adjacent
 * visible text is an authoring mistake (WCAG 1.4.1).
 *
 * @part dot - The dot itself: size, tone fill, radius, ring and effects.
 */
@Component({
  tag: 'ki-status',
  styleUrl: 'ki-status.css',
  shadow: true,
})
export class KiStatus {
  /**
   * Semantic intent, never appearance: each tone resolves its fill from
   * the per-theme `--ki-status-{tone}-color` tokens. An unrecognized value
   * matches no style selector, so the dot keeps the neutral appearance
   * (fallback by CSS construction — no validation code, FR-007).
   * @default 'neutral'
   */
  @Prop({ reflect: true }) tone: KiStatusTone = 'neutral';

  /**
   * Draws a separating ring around the dot for placement over media (an
   * avatar photo), keeping it distinguishable from the pixels beneath. A
   * per-instance functional axis — MarsUI ships Outline=True|False as
   * sibling variants under one theme (recorded deviation from the 002
   * token-only rule) — while ring width and color stay per-theme
   * `--ki-status-ring-*` tokens. The ring paints outside the dot's box and
   * never shifts layout.
   * @default false
   */
  @Prop({ reflect: true }) ring = false;

  /**
   * Accessible name for the state ("Online", "Build failing"). With a
   * label the dot is exposed to assistive technology as a named
   * non-interactive image (role `img`); without one it is decorative and
   * contributes nothing to the accessibility tree — the meaning must then
   * live in adjacent visible text (FR-003, FR-008). The label is never
   * rendered visually: visible status text belongs to ki-badge. Runtime
   * changes are not announced (no live region, FR-005).
   * @default undefined
   */
  @Prop() label?: string;

  render() {
    // The label/decoration duality (FR-003): a named non-interactive image
    // when labeled, full accessibility-tree transparency when not.
    const semantics = this.label
      ? { role: 'img', 'aria-label': this.label }
      : { 'aria-hidden': 'true' };
    // No slots (FR-009): the element renders nothing but its dot.
    return <span part="dot" {...semantics}></span>;
  }
}
