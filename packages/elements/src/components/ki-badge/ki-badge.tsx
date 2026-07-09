import { Component, Prop, h } from '@stencil/core';

export type KiBadgeTone = 'neutral' | 'success' | 'danger' | 'info' | 'warning';
export type KiBadgeSize = 'sm' | 'md';

/**
 * A static, non-interactive status pill.
 *
 * @whenToUse annotate an entity with short status text (a state, a
 * category) whose meaning is carried by the label itself; the tone color
 * only reinforces the text, it never replaces it.
 * @whenNotToUse feedback that must be announced (that is
 * ki-alert's job — the badge has no live region), an interactive
 * chip, filter or button, empty content (the label IS the meaning), or a
 * notification-counter overlay (a future, separate concern).
 *
 * @slot - The label: short status text, the sole carrier of meaning.
 * @part badge - The pill: background, foreground, border, radius, metrics
 * and typography.
 */
@Component({
  tag: 'ki-badge',
  styleUrl: 'ki-badge.css',
  shadow: true,
})
export class KiBadge {
  /**
   * Semantic intent, never appearance: each tone resolves its colors from
   * the `--ki-badge-{tone}-*` tokens. An unrecognized value matches no
   * style selector, so the badge keeps the neutral appearance (fallback by
   * CSS construction — no validation code).
   */
  @Prop({ reflect: true }) tone: KiBadgeTone = 'neutral';

  /**
   * Metric scale (`--ki-badge-{size}-*` tokens). An unrecognized value
   * falls back to the `md` metrics the same way.
   */
  @Prop({ reflect: true }) size: KiBadgeSize = 'md';

  render() {
    return (
      <span part="badge">
        <slot />
      </span>
    );
  }
}
