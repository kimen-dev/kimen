import { Component, Host, h, Prop } from '@stencil/core';

/**
 * A non-interactive page-position indicator: one dot per position of a
 * bounded sequence, exactly one highlighted as current.
 *
 * @whenToUse show the current position within a bounded, sequential set of
 * peer views whose navigation lives elsewhere: carousel slides, unlabeled
 * onboarding steps, gallery pages. Wire `count` and `current` (1-based) to
 * the sequence the consumer renders and give it a `label` (required
 * authoring: assistive technology reads one graphic named
 * "<label>, <current> / <count>"). Below two positions an indicator carries
 * no information.
 * @whenNotToUse section navigation (ki-tabs), task completion or loading
 * (ki-progress), labeled step flows (a stepper is a separate roadmap item),
 * interactive pagination (a future feature — the indicator takes no focus
 * and no input; navigation belongs to the composing carousel's own
 * controls), or conveying quantity without a current position. Position
 * changes are never announced by the indicator itself (no live region): the
 * composing carousel owns announcements.
 *
 * @part indicator - The row container: layout and the token-driven gap.
 * @part dot - Every dot: size, shape and color.
 * @part dot-current - Additionally on the current dot: the highlight treatment.
 */
@Component({
  tag: 'ki-indicator',
  styleUrl: 'ki-indicator.css',
  shadow: true,
})
export class KiIndicator {
  /**
   * Number of positions (non-negative integer): one dot renders per
   * position, in position order. A missing, non-numeric or negative value
   * renders zero dots — an authoring mistake by catalog guidance, never an
   * error state or a rendering failure (FR-002; empty ki-list precedent).
   * @default undefined
   */
  @Prop() count?: number;

  /**
   * The current position, 1-based to match the exposed position text
   * ("2 / 5"). Exactly one dot presents the current appearance whenever
   * `count` >= 1: values above `count` clamp to the last position, values
   * below 1 and non-numeric values fall back to the first (FR-003). Updates
   * re-render in place — the highlight and the exposed text follow
   * immediately, re-applying the normalization (FR-004).
   * @default undefined
   */
  @Prop() current?: number;

  /**
   * Accessible name of the sequence ("Slide position"). The exposed name
   * combines it with the wordless numeric position —
   * "<label>, <current> / <count>" — on a single non-interactive graphic;
   * without a label the name degrades to the bare position text (documented
   * as required authoring, FR-005). The label is never rendered visually
   * and position changes are never announced (no live region, FR-006).
   * @default undefined
   */
  @Prop() label?: string;

  /** FR-002: non-negative integer, or zero dots — never a failure. */
  private normalizedCount(): number {
    const count = Math.floor(Number(this.count));
    return Number.isFinite(count) && count > 0 ? count : 0;
  }

  /** FR-003: clamp into [1, count]; non-numeric falls back to 1. */
  private normalizedCurrent(count: number): number {
    const current = Math.floor(Number(this.current));
    if (!Number.isFinite(current)) {
      return 1;
    }
    return Math.min(count, Math.max(1, current));
  }

  render() {
    const count = this.normalizedCount();
    const current = count >= 1 ? this.normalizedCurrent(count) : 0;
    const position = `${String(current)} / ${String(count)}`;
    // FR-005: one structural graphic on the host — dots stay presentational
    // by construction (descendants of an img role expose nothing of their
    // own). Zero dots convey nothing, so the empty row is decorative — an
    // unnamed graphic would be an axe violation, not information.
    const semantics =
      count >= 1
        ? { role: 'img', 'aria-label': this.label ? `${this.label}, ${position}` : position }
        : { 'aria-hidden': 'true' };
    return (
      <Host {...semantics}>
        <div part="indicator">
          {Array.from({ length: count }, (_, index) => (
            <span part={index + 1 === current ? 'dot dot-current' : 'dot'}></span>
          ))}
        </div>
      </Host>
    );
  }
}
