import { Component, Element, Prop, State, Watch, h } from '@stencil/core';
import type { KiAvatarSize } from '../ki-avatar/ki-avatar';

/**
 * A token-styled companion container that stacks `ki-avatar` children as one
 * overlapping row with a configurable visible cap and a static "+N" overflow
 * counter.
 *
 * @whenToUse a compact "who is involved" stack — the members of a shared
 * document, project card or event row — where space deserves only the first
 * few identities and an exact "+N" counter accounts for the rest.
 * @whenNotToUse as a member picker or expandable overflow (future interactive
 * grouping — the counter is static text, never a button), for a single
 * identity (use `ki-avatar` alone), or with children other than `ki-avatar`
 * (foreign markup is unsupported and not repaired, 016 precedent).
 *
 * @slot - `ki-avatar` members, stacked in source order. Members beyond the
 * visible cap are neither rendered nor exposed to assistive technology.
 * @part group - The stack row containing the members and the counter.
 * @part counter - The static "+N" overflow text trailing the stack.
 */
@Component({
  tag: 'ki-avatar-group',
  styleUrl: 'ki-avatar-group.css',
  shadow: true,
})
export class KiAvatarGroup {
  @Element() private readonly host!: HTMLElement;

  // N of the "+N" counter: exactly the number of members hidden by the cap
  // (FR-009); zero renders no counter at all, never "+0" (S15).
  @State() private hiddenCount = 0;

  /**
   * Visible cap for the member stack. When the member count exceeds it, the
   * first `max` members render followed by a "+N" counter accounting exactly
   * for the hidden rest. Without it — or when it is not a positive whole
   * number — every member renders and no counter appears; malformed
   * agent-generated markup never breaks the page (FR-009, S14, S15).
   * @default undefined
   */
  @Prop() max?: number;

  /**
   * Size step governing the metrics of every visible member and the counter
   * (avatar vocabulary, FR-010). Member-declared sizes are overridden inside
   * a group so the stack stays uniform (S6). An unrecognized value matches
   * no style selector, so the group keeps the default medium metrics
   * (FR-007).
   * @default 'md'
   */
  @Prop({ reflect: true }) size: KiAvatarSize = 'md';

  @Watch('max')
  protected handleMaxChange(): void {
    this.syncMembers();
  }

  componentDidLoad(): void {
    this.syncMembers();
  }

  private readonly handleSlotChange = (): void => {
    this.syncMembers();
  };

  // FR-009: a cap is only ever a positive whole number; anything else means
  // "no cap". Stencil surfaces a non-numeric attribute as NaN, which fails
  // Number.isInteger — no further validation code needed.
  private visibleCap(): number | null {
    const cap = typeof this.max === 'number' ? this.max : Number(this.max);
    return Number.isInteger(cap) && cap > 0 ? cap : null;
  }

  private members(): HTMLElement[] {
    const slot = this.host.shadowRoot?.querySelector('slot');
    const assigned = slot?.assignedElements() ?? [];
    // mock-doc reports no slot assignment; the light children are the same
    // set there (the browser suite is authoritative, Art. III).
    const candidates = assigned.length > 0 ? assigned : Array.from(this.host.children);
    return candidates.filter(
      (candidate): candidate is HTMLElement =>
        candidate instanceof HTMLElement && candidate.localName === 'ki-avatar',
    );
  }

  private syncMembers(): void {
    const members = this.members();
    const cap = this.visibleCap();
    const visibleCount = cap === null ? members.length : Math.min(cap, members.length);

    members.forEach((member, index) => {
      if (index < visibleCount) {
        member.removeAttribute('data-ki-avatar-group-overflow');
        // MarsUI stacks with reversed z-order: the leading member paints over
        // the next one and the counter sits at the bottom layer (extraction
        // decision 5). Descending per-index depth has no pure-CSS form for
        // arbitrary N, so the group coordinates it (007 composite precedent).
        member.style.zIndex = String(visibleCount - index);
      } else {
        // Beyond the cap: not rendered, not exposed to assistive technology;
        // the counter text is their only trace (FR-009, FR-011).
        member.setAttribute('data-ki-avatar-group-overflow', '');
        member.style.removeProperty('z-index');
      }
    });

    this.hiddenCount = members.length - visibleCount;
  }

  render() {
    // No role, no name, no state of its own (FR-011): the group is layout
    // plus the counter text; the members carry their own image semantics.
    return (
      <div part="group">
        <slot onSlotchange={this.handleSlotChange} />
        {this.hiddenCount > 0 && <span part="counter">{`+${String(this.hiddenCount)}`}</span>}
      </div>
    );
  }
}
