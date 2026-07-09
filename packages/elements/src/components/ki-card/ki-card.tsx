import { Component, Element, State, h } from '@stencil/core';

type CardRegion = 'media' | 'header' | 'body' | 'footer';
type RegionState = Record<CardRegion, boolean>;

const EMPTY_REGIONS: RegionState = {
  media: false,
  header: false,
  body: false,
  footer: false,
};

function hasAssignedContent(slot: HTMLSlotElement): boolean {
  return slot.assignedNodes({ flatten: true }).some((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      return true;
    }

    return node.nodeType === Node.TEXT_NODE && (node.textContent?.trim() ?? '') !== '';
  });
}

/**
 * A non-interactive card surface for grouping related content.
 *
 * @whenToUse group related media, heading, supporting text and actions into
 * one scannable surface visually distinct from the page; fill any subset of
 * regions. Supply the heading element yourself in the `header` slot — plain
 * text slotted there carries no heading semantics for assistive technology.
 * @whenNotToUse as a button or link target, form control, fieldset, page
 * landmark, section replacement or nested card. For an interactive card, slot
 * the button or link INSIDE a region (whole-card interactivity is a future
 * feature, not this component).
 *
 * @slot media - Leading visual region for an image, video or illustration.
 * @slot header - Title region. The author supplies the heading element at the surrounding document level; plain text here carries no heading semantics.
 * @slot - Body region for supporting text or arbitrary composed content.
 * @slot footer - Closing region for actions such as `ki-button`; no dedicated actions slot exists in v1.
 * @part card - Card surface: background, border, radius, elevation and region gap.
 * @part media - Media region wrapper.
 * @part header - Header region wrapper.
 * @part body - Body region wrapper around the default slot.
 * @part footer - Footer region wrapper.
 */
// Plain shadow DOM: slotted content keeps its own semantics while the card
// contributes no role, tabindex, ARIA or events of its own.
@Component({
  tag: 'ki-card',
  styleUrl: 'ki-card.css',
  shadow: true,
})
export class KiCard {
  @Element() private readonly host!: HTMLElement;

  @State() private hasContent: RegionState = EMPTY_REGIONS;

  private readonly slots = new Map<CardRegion, HTMLSlotElement>();
  private observer?: MutationObserver;

  componentDidLoad(): void {
    this.syncAllRegions();
    // slotchange does NOT fire when an already-assigned text node's content
    // changes (e.g. body text driven from '' to real text, or back), so a
    // characterData observer re-checks the regions on those mutations too
    // (codex review).
    if (typeof MutationObserver === 'function') {
      this.observer = new MutationObserver(() => {
        this.syncAllRegions();
      });
      this.observer.observe(this.host, { characterData: true, childList: true, subtree: true });
    }
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
  }

  private setSlot(region: CardRegion, slot: HTMLSlotElement | undefined): void {
    if (!slot) {
      return;
    }

    this.slots.set(region, slot);
  }

  private syncRegion(region: CardRegion): void {
    const slot = this.slots.get(region);
    const present = slot ? hasAssignedContent(slot) : false;

    if (this.hasContent[region] === present) {
      return;
    }

    this.hasContent = { ...this.hasContent, [region]: present };
  }

  private syncAllRegions(): void {
    for (const region of this.slots.keys()) {
      this.syncRegion(region);
    }
  }

  private region(part: CardRegion, slotName?: CardRegion) {
    const slotAttributes = slotName ? { name: slotName } : {};

    return (
      <div part={part} data-empty={this.hasContent[part] ? undefined : ''}>
        <slot
          {...slotAttributes}
          ref={(slot) => {
            this.setSlot(part, slot);
          }}
          onSlotchange={() => {
            this.syncRegion(part);
          }}
        />
      </div>
    );
  }

  render() {
    return (
      <div part="card">
        {this.region('media', 'media')}
        {this.region('header', 'header')}
        {this.region('body')}
        {this.region('footer', 'footer')}
      </div>
    );
  }
}
