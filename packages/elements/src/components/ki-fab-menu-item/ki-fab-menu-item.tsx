import { Component, Element, Event, type EventEmitter, h, Prop } from '@stencil/core';
import type { KiFabMenuSelectDetail } from '../ki-fab-menu/ki-fab-menu';
import { fabMenuActionValue } from '../ki-fab-menu/ki-fab-menu.actions';

/**
 * A labeled command or native link within a floating action menu.
 *
 * @whenToUse as a direct child of ki-fab-menu, with a short, visible action label.
 * @whenNotToUse for a standalone action, a form control, or a container of interactive content.
 * @slot - The visible action label.
 * @part control - The native action button or link.
 * @part icon - The decorative glyph next to the label.
 */
@Component({ tag: 'ki-fab-menu-item', styleUrl: 'ki-fab-menu-item.css', shadow: true })
export class KiFabMenuItem {
  @Element() private readonly host!: HTMLElement;

  /** Registered Lucide glyph. Import the desired icon before rendering. */
  @Prop() iconName?: string;

  /**
   * A nonempty destination renders a native link and preserves relative URL resolution.
   * @format url
   */
  @Prop() href?: string;

  /** Stable selection identifier. When omitted, the menu reports the trimmed visible label. */
  @Prop() value?: string;

  /** Local command selection for a direct action binding. Links use native navigation. */
  @Event({ eventName: 'ki-select', bubbles: false, composed: false, cancelable: false })
  selected!: EventEmitter<KiFabMenuSelectDetail>;

  private readonly onCommandClick = (event: MouseEvent): void => {
    if (!event.defaultPrevented) {
      this.selected.emit({ value: fabMenuActionValue(this.value, this.host.textContent) });
    }
  };

  private readonly onLinkKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== ' ' || event.defaultPrevented || event.isComposing) return;
    event.preventDefault();
    if (!event.repeat && event.currentTarget instanceof HTMLAnchorElement) {
      event.currentTarget.click();
    }
  };

  render() {
    const href = this.href?.trim();
    const attributes = { part: 'control', role: 'menuitem', tabIndex: -1 };
    const content = [
      this.iconName && <ki-icon key="icon" part="icon" name={this.iconName} aria-hidden="true" />,
      <span key="label" class="label">
        <slot />
      </span>,
    ];
    return href ? (
      <a {...attributes} href={href} onKeyDown={this.onLinkKeyDown}>
        {content}
      </a>
    ) : (
      <button {...attributes} type="button" onClick={this.onCommandClick}>
        {content}
      </button>
    );
  }
}
