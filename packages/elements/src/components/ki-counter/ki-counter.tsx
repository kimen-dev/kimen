import { Component, Element, Host, Prop, Watch, h } from '@stencil/core';
import { observeCounterAnchor } from './ki-counter.anchor';
import { formatCount } from './ki-counter.count';

export type KiCounterTone = 'danger' | 'primary' | 'success' | 'neutral';

/**
 * A decorative count or dot over a trigger or avatar.
 *
 * @whenToUse mark unread or pending items on a trigger, or presence on an
 * avatar. Supply the full meaning in the host's accessible name and use a
 * page-owned polite live region for important updates.
 * @whenNotToUse for an object's status (use ki-badge), a count inside a list
 * row (use text or ki-badge), or an announcement that needs its own semantics.
 *
 * @part indicator - Painted pill or dot, including the surrounding ring.
 */
@Component({
  tag: 'ki-counter',
  styleUrl: 'ki-counter.css',
  shadow: true,
})
export class KiCounter {
  @Element() private readonly host!: HTMLElement;

  /**
   * Count of unread or pending items. Finite values are rounded down.
   * Values below one and non-finite values hide the count.
   * @default undefined
   */
  @Prop() value?: number;

  /**
   * Largest count displayed in full. Higher values display the cap with a
   * plus sign. Fractional caps round down; invalid caps use 99.
   * @default 99
   */
  @Prop() max = 99;

  /**
   * Show a dot independently of the count, including when the value is zero.
   * @default false
   */
  @Prop({ reflect: true }) dot = false;

  /**
   * Semantic palette of the pill or dot. An unknown tone uses danger.
   * @default 'danger'
   */
  @Prop({ reflect: true }) tone: KiCounterTone = 'danger';

  /**
   * Literal ID of a trigger in the same document or shadow root. Places the
   * indicator at its block-start inline-end corner and hides it while the
   * trigger is unavailable. For a named host slot, omit this property.
   * @default undefined
   */
  @Prop({ reflect: true }) for?: string;

  private stopObservingAnchor: (() => void) | undefined;
  private observedFor: string | undefined;

  connectedCallback(): void {
    this.syncAnchor();
  }

  disconnectedCallback(): void {
    this.stopObservingAnchor?.();
    this.stopObservingAnchor = undefined;
    this.observedFor = undefined;
  }

  @Watch('for')
  @Watch('value')
  @Watch('dot')
  protected syncAnchor(): void {
    const targetId =
      this.host.isConnected && (this.dot || this.count !== undefined) ? this.for : undefined;
    if (targetId === this.observedFor) return;

    this.stopObservingAnchor?.();
    this.observedFor = targetId;
    this.stopObservingAnchor = targetId ? observeCounterAnchor(this.host, targetId) : undefined;
  }

  private get count(): string | undefined {
    return this.dot ? undefined : formatCount(this.value, this.max);
  }

  render() {
    const count = this.count;
    const empty = !this.dot && count === undefined;
    return (
      <Host aria-hidden="true" data-empty={empty ? '' : undefined}>
        {!empty && (
          <span part="indicator" dir="ltr">
            {count}
          </span>
        )}
      </Host>
    );
  }
}
