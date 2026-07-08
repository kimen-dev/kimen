import { AttachInternals, Component, Element, Host, State, h } from '@stencil/core';

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
 * When to use: only as a child of `ki-list`, for one read-only entry in a
 * similar vertical collection.
 * When NOT to use: outside `ki-list`, as a menu item, selectable option,
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
  @AttachInternals() private readonly internals!: ElementInternals;

  @State() private hasStart = false;
  @State() private hasPrimary = false;
  @State() private hasSecondary = false;
  @State() private hasEnd = false;

  componentWillLoad(): void {
    this.internals.role = 'listitem';
    if (this.internals.role !== 'listitem') {
      Object.defineProperty(this.internals, 'role', { value: 'listitem', configurable: true });
    }
    Object.defineProperty(this.host, 'internals', {
      value: { role: 'listitem' },
      configurable: true,
    });
  }

  componentDidLoad(): void {
    this.syncSlotState();
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
    return (
      <Host
        class={{
          'has-start': this.hasStart,
          'has-primary': this.hasPrimary,
          'has-secondary': this.hasSecondary,
          'has-end': this.hasEnd,
        }}
      >
        <div part="item">
          <div part="start" hidden={!this.hasStart}>
            <slot name="start" onSlotchange={this.syncSlotState} />
          </div>
          <div part="content">
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
