import { Component, Element, Event, type EventEmitter, Prop, State, h } from '@stencil/core';

import { type CardTitle, getCardHref, getCardTitle } from './card-interaction';

type CardRegion = 'media' | 'header' | 'body' | 'footer';
type RegionState = Record<CardRegion, boolean>;

const EMPTY_REGIONS: RegionState = {
  media: false,
  header: false,
  body: false,
  footer: false,
};

const INNER_CONTROL = [
  'a[href]',
  'area[href]',
  'button',
  'input',
  'select',
  'textarea',
  'summary',
  'label',
  'audio[controls]',
  'video[controls]',
  '[tabindex]',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
].join(',');

function hasAssignedContent(slot: HTMLSlotElement): boolean {
  return slot.assignedNodes({ flatten: true }).some((node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      return true;
    }

    return node.nodeType === Node.TEXT_NODE && (node.textContent?.trim() ?? '') !== '';
  });
}

/**
 * A card surface for grouping related content, with an optional primary link or action.
 *
 * @whenToUse group related media, a title, supporting text and actions into
 * one scannable surface. Set `href` for navigation or `interactive` for a
 * declared action. Give a clickable card one text heading in the header
 * slot and place secondary controls in the body or footer.
 * @whenNotToUse as a form field, fieldset, page landmark, section replacement
 * or nested card. Use a standalone button or link for a control without
 * supporting content.
 *
 * @slot media - Leading visual region for an image, video or illustration.
 * @slot header - Title region. Supply one nonempty text heading at the surrounding document level for a clickable card.
 * @slot - Body region for supporting text or arbitrary composed content.
 * @slot footer - Closing region for actions such as `ki-button`; no dedicated actions slot exists in v1.
 * @part card - Card surface: background, border, radius, elevation and region gap.
 * @part media - Media region wrapper.
 * @part header - Header region wrapper.
 * @part body - Body region wrapper around the default slot.
 * @part footer - Footer region wrapper.
 * @part trigger - Native link or action button in a clickable card’s heading.
 */
// Shadow DOM keeps the title trigger and card surface in the same focus scope.
@Component({
  tag: 'ki-card',
  styleUrl: 'ki-card.css',
  shadow: true,
})
export class KiCard {
  @Element() private readonly host!: HTMLElement;

  /**
   * Surface treatment. Choose elevated for a raised panel, filled for a
   * tinted group or outlined for a bordered surface. Use default to follow
   * the theme's existing card treatment.
   * @default 'default'
   */
  @Prop() variant?: 'default' | 'elevated' | 'filled' | 'outlined' = 'default';

  /**
   * Destination for the card's title link. Supply a text heading in the
   * header slot. A nonblank href takes precedence over interactive.
   * @format url
   */
  @Prop() href?: string;

  /**
   * Gives a titled card a primary button that emits ki-activate. Use href
   * for navigation. Keep other actions in separate controls in the card.
   * @default false
   */
  @Prop() interactive?: boolean = false;

  /** Fires once when the user activates an action card by pointer or keyboard. */
  @Event({ eventName: 'ki-activate', bubbles: true, composed: true, cancelable: false })
  kiActivate!: EventEmitter<void>;

  @State() private title: CardTitle | undefined;

  @State() private hasContent: RegionState = EMPTY_REGIONS;

  private readonly slots = new Map<CardRegion, HTMLSlotElement>();
  private observer?: MutationObserver;

  connectedCallback(): void {
    // slotchange does NOT fire when an already-assigned text node's content
    // changes (e.g. body text driven from '' to real text, or back), so a
    // characterData observer re-checks the regions on those mutations too
    // (codex review). Armed on every connection: disconnectedCallback
    // releases the observer, and a card that is moved in the document (a
    // reordered grid) connects again without loading again.
    this.observer?.disconnect();
    this.observer = new MutationObserver(() => {
      this.syncAllRegions();
    });
    this.observer.observe(this.host, {
      attributeFilter: ['aria-hidden', 'hidden'],
      characterData: true,
      childList: true,
      subtree: true,
    });
    // Content written while the card was out of the document. On the first
    // connection the slots are not rendered yet: componentDidLoad syncs.
    this.syncAllRegions();
  }

  componentDidLoad(): void {
    this.syncAllRegions();
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

    if (region === 'header') {
      this.syncTitle(slot);
    }

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

  private syncTitle(slot: HTMLSlotElement | undefined): void {
    const headings = slot?.assignedElements({ flatten: true }) ?? [];
    const heading = headings[0];
    const title =
      headings.length === 1 &&
      heading &&
      !heading.matches(`[hidden], [aria-hidden="true"], ${INNER_CONTROL}`) &&
      heading.childElementCount === 0
        ? getCardTitle(heading.localName, heading.textContent)
        : undefined;
    if (title?.tag !== this.title?.tag || title?.text !== this.title?.text) {
      this.title = title;
    }
  }

  private activateSurface = (event: MouseEvent): void => {
    if (event.defaultPrevented) {
      return;
    }
    const trigger = this.host.shadowRoot?.querySelector<HTMLAnchorElement | HTMLButtonElement>(
      '[part="trigger"]',
    );
    if (!trigger) {
      return;
    }

    const path = event.composedPath();
    const fromTitle = path.includes(trigger);
    if (!fromTitle) {
      // The visible regions sit above the stretched trigger so native
      // selection and controls get the original pointer event.
      if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }
      for (const node of path) {
        if (node === event.currentTarget) break;
        if (node instanceof globalThis.Element && node.matches(INNER_CONTROL)) return;
      }
    }

    const selection = this.host.ownerDocument.getSelection();
    if (
      event.detail > 0 &&
      selection &&
      !selection.isCollapsed &&
      (this.host.contains(selection.anchorNode) || this.host.contains(selection.focusNode))
    ) {
      if (fromTitle) event.preventDefault();
      return;
    }

    if (trigger instanceof HTMLButtonElement) {
      this.kiActivate.emit();
    } else if (!fromTitle) {
      // Let the native link resolve the URL against the document's base.
      // This click stays inside the shadow root. The original surface click
      // is the only click the surrounding page receives.
      trigger.dispatchEvent(new MouseEvent('click', { cancelable: true }));
    }
  };

  private renderTitle(title: CardTitle, href: string | undefined) {
    const Heading = title.tag;
    return (
      <Heading class="title">
        {href ? (
          <a part="trigger" href={href}>
            {title.text}
          </a>
        ) : (
          <button part="trigger" type="button">
            {title.text}
          </button>
        )}
      </Heading>
    );
  }

  private region(
    part: CardRegion,
    slotName?: CardRegion,
    primaryTitle?: ReturnType<KiCard['renderTitle']>,
  ) {
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
        {primaryTitle}
      </div>
    );
  }

  render() {
    const href = getCardHref(this.href);
    const primaryTitle =
      this.title && (href || this.interactive) ? this.renderTitle(this.title, href) : undefined;

    return (
      <div
        part="card"
        data-variant={this.variant}
        data-clickable={primaryTitle ? '' : undefined}
        {...(primaryTitle ? { onClick: this.activateSurface } : {})}
      >
        {this.region('media', 'media')}
        {this.region('header', 'header', primaryTitle)}
        {this.region('body')}
        {this.region('footer', 'footer')}
      </div>
    );
  }
}
