import { Component, Element, Host, State, h } from '@stencil/core';

function hasAssignedContent(slot: HTMLSlotElement | null, textSlot = false): boolean {
  if (!slot) {
    return false;
  }

  return slot.assignedNodes({ flatten: true }).some((node) => {
    if (!textSlot && node.nodeType === Node.ELEMENT_NODE) {
      return true;
    }

    const textContent = node.textContent;
    return textContent !== null && textContent.trim().length > 0;
  });
}

/**
 * A non-interactive item inside `ki-list`, composed from leading media,
 * primary text, optional secondary text and trailing media or meta.
 *
 * @whenToUse only as a child of `ki-list`, for one read-only entry in a
 * similar vertical collection.
 * @whenNotToUse outside `ki-list`, as a menu item, selectable option,
 * tabular row, navigation link or whole-item clickable control.
 *
 * @slot start - Leading media such as an icon, avatar or image.
 * @slot - Primary text line.
 * @slot secondary - Supporting text below the primary line. Its presence
 * selects the multi-line min-height token.
 * @slot end - Trailing media, meta text or a slotted control.
 * @part item - Item row surface and layout container.
 * @part start - Leading region wrapper.
 * @part content - Text column containing primary and secondary lines.
 * @part end - Trailing region wrapper.
 */
@Component({
  tag: 'ki-list-item',
  styleUrl: 'ki-list-item.css',
  shadow: true,
})
export class KiListItem {
  @Element() private readonly host!: HTMLElement;

  @State() private hasStart = false;
  @State() private hasPrimary = false;
  @State() private hasSecondary = false;
  @State() private hasEnd = false;

  private observer?: MutationObserver;

  componentWillLoad(): void {
    // Default structural role, set only when the author has not supplied one so
    // an author role still wins (codex review).
    if (!this.host.hasAttribute('role')) {
      this.host.setAttribute('role', 'listitem');
    }
  }

  componentDidLoad(): void {
    this.syncSlotState();
    // slotchange does not fire when an already-assigned text node's content
    // changes (e.g. secondary text populated after async load), so a
    // characterData observer re-checks the slots on those mutations (codex
    // review).
    if (typeof MutationObserver === 'function') {
      this.observer = new MutationObserver(() => {
        this.syncSlotState();
      });
      this.observer.observe(this.host, { characterData: true, childList: true, subtree: true });
    }
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
  }

  private syncSlotState = (): void => {
    const start =
      this.host.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="start"]') ?? null;
    const primary =
      this.host.shadowRoot?.querySelector<HTMLSlotElement>('slot:not([name])') ?? null;
    const secondary =
      this.host.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="secondary"]') ?? null;
    const end = this.host.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="end"]') ?? null;

    this.hasStart = hasAssignedContent(start);
    this.hasPrimary = hasAssignedContent(primary, true);
    this.hasSecondary = hasAssignedContent(secondary, true);
    this.hasEnd = hasAssignedContent(end);
  };

  render() {
    // Only `.has-secondary` drives styling (the multi-line min-height token,
    // :host(.has-secondary)); start/primary/end drive the per-region `hidden`
    // collapse, not host classes.
    return (
      <Host class={{ 'has-secondary': this.hasSecondary }}>
        <div part="item">
          <div part="start" hidden={!this.hasStart}>
            <slot name="start" onSlotchange={this.syncSlotState} />
          </div>
          {/* Collapse the flexible text column when neither text region has
              content, so an item with only start/end regions does not reserve
              column width or flex gaps (FR-002/FR-003, codex review). */}
          <div part="content" hidden={!this.hasPrimary && !this.hasSecondary}>
            <span class="primary" hidden={!this.hasPrimary}>
              <slot onSlotchange={this.syncSlotState} />
            </span>
            <span class="secondary" hidden={!this.hasSecondary}>
              <slot name="secondary" onSlotchange={this.syncSlotState} />
            </span>
          </div>
          <div part="end" hidden={!this.hasEnd}>
            <slot name="end" onSlotchange={this.syncSlotState} />
          </div>
        </div>
      </Host>
    );
  }
}
