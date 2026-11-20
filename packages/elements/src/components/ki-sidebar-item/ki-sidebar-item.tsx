import { Component, Element, Prop, State, h } from '@stencil/core';
import { getIcon } from '../../utils/icon-registry.mjs';
import {
  DEFAULT_COUNT_LABEL,
  normalizeSidebarCount,
  sidebarCountLabelParts,
} from './ki-sidebar-item.label';

const sidebarTag = ['ki', 'sidebar'].join('-');
// The library loader supplies the overlay. Direct imports register it once
// alongside the sidebar instead of pulling the overlay into each item bundle.
const tooltipTag = ['ki', 'tooltip'].join('-');

/**
 * One destination in a sidebar.
 *
 * @whenToUse link to a named destination in ki-sidebar or ki-sidebar-group.
 * Register ki-tooltip once when using direct component imports for a rail.
 * @whenNotToUse for commands, nested controls, or standalone links outside the sidebar.
 * @slot - The destination name as text or static inline content.
 * @slot start - One decorative icon that overrides icon-name.
 * @part item - Navigation link or static row.
 * @part start - Leading icon holder.
 * @part label - Destination text.
 * @part count - Expanded pill or rail dot.
 */
@Component({
  tag: 'ki-sidebar-item',
  styleUrl: 'ki-sidebar-item.css',
  shadow: true,
})
export class KiSidebarItem {
  @Element() private readonly host!: HTMLElement;

  /**
   * Destination resolved by a native link. Omit for a static row.
   * @format url
   */
  @Prop() href?: string;

  /** Mark this destination as the current page. */
  @Prop({ reflect: true }) current = false;

  /** Positive unread count. Fractional values round down. */
  @Prop() count?: number;

  /** Accessible count template, using the {label} and {count} placeholders. */
  @Prop() countLabel = DEFAULT_COUNT_LABEL;

  /** Name of a registered Lucide glyph. Import its per-icon entry point first. */
  @Prop() iconName?: string;

  @State() private rail = false;
  @State() private name = '';
  @State() private hasStart = false;

  private observer?: MutationObserver;

  connectedCallback(): void {
    const sidebar = this.host.closest(sidebarTag);
    this.readContent();
    const readMode = () => {
      this.rail = sidebar?.hasAttribute('collapsed') ?? false;
    };
    readMode();
    this.observer = new MutationObserver(() => {
      readMode();
      this.readContent();
    });
    this.observer.observe(this.host, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['slot'],
    });
    if (sidebar)
      this.observer.observe(sidebar, { attributes: true, attributeFilter: ['collapsed'] });
  }

  componentWillLoad(): void {
    if (!this.host.hasAttribute('role')) this.host.setAttribute('role', 'listitem');
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
  }

  private readContent(): void {
    const text: string[] = [];
    let hasStart = false;
    for (const node of this.host.childNodes) {
      const isElement = node.nodeType === Node.ELEMENT_NODE;
      const slot = isElement ? (node as globalThis.Element).getAttribute('slot') : null;
      if (slot) {
        hasStart ||= slot === 'start';
      } else if (isElement || node.nodeType === Node.TEXT_NODE) {
        text.push(node.textContent ?? '');
      }
    }
    this.hasStart = hasStart;
    this.name = text.join('').replace(/\s+/gu, ' ').trim();
  }

  render() {
    const count = normalizeSidebarCount(this.count);
    const [before, after] = sidebarCountLabelParts(this.name, count, this.countLabel);
    const icon = this.iconName && getIcon(this.iconName) ? this.iconName : undefined;
    const isLink = typeof this.href === 'string';
    const glyph = icon ? h('ki-icon', { name: icon }) : (Array.from(this.name)[0] ?? '');

    const start = h(
      'span',
      { part: 'start', 'aria-hidden': 'true', hidden: !this.hasStart && !icon && !this.rail },
      h('slot', { name: 'start' }, glyph),
    );
    // Keep the live slot in the link's name in both modes. Counter only paints
    // the pill or dot, so the localized full count comes from adjacent text.
    const countText = (text: string) =>
      isLink && text ? h('span', { class: { 'sr-only': true } }, text) : null;
    const text = h('span', { part: 'label', class: { 'sr-only': this.rail } }, [
      countText(before),
      h('slot'),
      countText(after),
    ]);
    const marker =
      count === undefined
        ? null
        : h(
            'span',
            { part: 'count' },
            h('ki-counter', { tone: 'neutral', value: count, dot: this.rail }),
          );

    const item = h(
      isLink ? 'a' : 'span',
      {
        part: 'item',
        class: { rail: this.rail },
        href: this.href,
        tabIndex: isLink ? 0 : undefined,
        'aria-current': isLink && this.current ? 'page' : undefined,
      },
      [start, text, marker],
    );

    return h(
      tooltipTag,
      { label: this.rail ? `${before}${this.name}${after}` : '', placement: 'end' },
      item,
    );
  }
}
