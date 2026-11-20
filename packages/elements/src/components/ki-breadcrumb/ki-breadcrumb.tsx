import '../../../icons/more-horizontal.js';
import { Component, Element, Prop, State, Watch, h } from '@stencil/core';

import { AnchoredOverlay } from '../../utils/anchored-overlay';
import { anchoredOverlayPosition } from '../../utils/anchored-overlay-layout';
import { getVerticalKeyboardIntent, isNavigationIntent } from '../../utils/keyboard-intent';
import { rovingFocusIndex } from '../../utils/roving-focus';
import { typeaheadIndex } from '../../utils/typeahead';
import { formatMoreLabel, getCollapsedRange } from './ki-breadcrumb.layout';

const ITEM_TAG = 'ki-breadcrumb-item';
const DEFAULT_LABEL = 'Breadcrumb';
const DEFAULT_MORE_LABEL = 'Show {n} more levels';
const positionMenu = anchoredOverlayPosition({ placement: 'bottom-start' });

function resolveLabel(value: string | null | undefined, fallback: string): string {
  const label = value?.trim();
  return label === undefined || label.length === 0 ? fallback : label;
}

interface BreadcrumbLevel {
  label: string;
  href: string | null;
}

/**
 * A path of ancestor links ending at the current page, with optional overflow.
 *
 * @whenToUse show the current page in a deeper hierarchy using direct ki-breadcrumb-item children ordered from root to current.
 * @whenNotToUse switch between peer routes, toggle peer panels, or display progress through a form.
 * @slot - Direct ki-breadcrumb-item children in hierarchy order.
 * @part navigation - The named navigation landmark.
 * @part list - The ordered list of visible levels.
 * @part list-item - A list entry for a level or the overflow control.
 * @part link - A visible native ancestor link.
 * @part current - The current page label.
 * @part label - The label of an ancestor with no destination.
 * @part more-button - The overflow menu button.
 * @part menu - The anchored menu of collapsed levels.
 * @part menu-item - A destination or unavailable level in the overflow menu.
 */
@Component({
  tag: 'ki-breadcrumb',
  styleUrl: 'ki-breadcrumb.css',
  shadow: true,
})
export class KiBreadcrumb {
  @Element() private readonly host!: HTMLElement;
  @State() private levels: BreadcrumbLevel[] = [];
  @State() private open = false;

  /** Accessible name of the navigation landmark. @default 'Breadcrumb' */
  @Prop() label = DEFAULT_LABEL;

  /**
   * Optional overflow threshold. Above it, keep the first and last two levels
   * visible. Positive values are rounded down and clamped to four. Omit this
   * prop, or pass a non-positive or non-finite value, to show the full trail.
   */
  @Prop() maxItems?: number;

  /**
   * Localizable name of the overflow control. Use {n} for the hidden level count.
   * @default 'Show {n} more levels'
   */
  @Prop() moreLabel = DEFAULT_MORE_LABEL;

  private readonly overlay = new AnchoredOverlay();
  private observer?: MutationObserver;
  private menu: HTMLElement | undefined;
  private trigger: HTMLButtonElement | undefined;

  connectedCallback(): void {
    this.refreshLevels();
    this.observer = new MutationObserver(this.refreshLevels);
    this.observer.observe(this.host, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['href', 'hidden'],
    });
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    this.closeMenu();
  }

  @Watch('maxItems')
  protected thresholdChanged(): void {
    this.closeMenu(getCollapsedRange(this.levels.length, this.maxItems) !== undefined);
  }

  private readonly refreshLevels = (): void => {
    const levels = Array.from(this.host.children)
      .filter((child) => child.localName === ITEM_TAG && !child.hasAttribute('hidden'))
      .map((child) => ({
        label: (child.textContent || '').trim().replace(/\s+/gu, ' '),
        href: (child as HTMLElement & { href?: string }).href ?? child.getAttribute('href'),
      }));
    if (
      levels.length === this.levels.length &&
      levels.every((level, index) => {
        const previous = this.levels[index];
        return level.label === previous?.label && level.href === previous.href;
      })
    ) {
      return;
    }
    this.closeMenu(getCollapsedRange(levels.length, this.maxItems) !== undefined);
    this.levels = levels;
  };

  private get menuItems(): HTMLElement[] {
    return Array.from(this.menu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
  }

  private openMenu(edge: 'first' | 'last'): void {
    if (
      !this.trigger ||
      !this.overlay.show(this.menu, this.trigger, {
        position: positionMenu,
        outsidePointer: true,
        escape: 'bubble',
        onDismiss: (reason) => {
          this.closeMenu(reason === 'escape');
        },
      })
    ) {
      return;
    }

    this.open = true;
    const items = this.menuItems;
    items.at(edge === 'first' ? 0 : -1)?.focus();
  }

  private closeMenu(restoreFocus = false): void {
    if (this.open) {
      this.open = false;
      this.overlay.hide(restoreFocus ? true : undefined);
    }
  }

  private readonly handleTriggerClick = (): void => {
    if (this.open) {
      this.closeMenu(true);
    } else {
      this.openMenu('first');
    }
  };

  private readonly handleTriggerKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.openMenu(event.key === 'ArrowDown' ? 'first' : 'last');
    }
  };

  private readonly handleOverflowFocusOut = (event: FocusEvent): void => {
    const boundary = event.currentTarget as HTMLLIElement;
    if (!boundary.contains(event.relatedTarget as Node | null)) {
      this.closeMenu();
    }
  };

  private readonly handleMenuKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Tab') {
      // Resume the browser's sequential focus order from the menu button.
      this.closeMenu(true);
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
      if (event.target instanceof HTMLAnchorElement) {
        event.target.click();
      }
      return;
    }

    const items = this.menuItems;
    const current = items.findIndex((item) => item === event.target);
    const intent = getVerticalKeyboardIntent(event.key);
    if (isNavigationIntent(intent)) {
      event.preventDefault();
      const index = rovingFocusIndex(items, current, intent, { wrap: true });
      if (index !== null) items[index]?.focus();
    } else if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key.length === 1) {
      const index = typeaheadIndex(
        items.map((item) => ({ label: item.textContent || '' })),
        event.key,
        current,
      );
      items[index]?.focus();
    }
  };

  private readonly handleDestination = (): void => {
    this.closeMenu(true);
  };

  private renderLevel(level: BreadcrumbLevel, index: number) {
    const current = index === this.levels.length - 1;
    return (
      <li key={index} part="list-item">
        {current ? (
          <span part="current" aria-current="page">
            <span>{level.label}</span>
          </span>
        ) : level.href !== null ? (
          <a part="link" href={level.href} tabIndex={0}>
            <span>{level.label}</span>
          </a>
        ) : (
          <span part="label">
            <span>{level.label}</span>
          </span>
        )}
      </li>
    );
  }

  private renderOverflow(levels: BreadcrumbLevel[]) {
    const name = formatMoreLabel(resolveLabel(this.moreLabel, DEFAULT_MORE_LABEL), levels.length);
    return (
      <li key="overflow" part="list-item" onFocusout={this.handleOverflowFocusOut}>
        <button
          part="more-button"
          ref={(trigger) => {
            this.trigger = trigger;
          }}
          type="button"
          tabIndex={0}
          aria-label={name}
          aria-haspopup="menu"
          aria-expanded={this.open ? 'true' : 'false'}
          onClick={this.handleTriggerClick}
          onKeyDown={this.handleTriggerKeyDown}
        >
          <ki-icon name="more-horizontal" aria-hidden="true" />
        </button>
        <div
          part="menu"
          ref={(menu) => {
            this.menu = menu;
          }}
          role="menu"
          tabIndex={-1}
          aria-label={name}
          popover="manual"
          onKeyDown={this.handleMenuKeyDown}
        >
          {levels.map((level, index) =>
            level.href !== null ? (
              <a
                key={index}
                part="menu-item"
                role="menuitem"
                href={level.href}
                tabIndex={-1}
                onClick={this.handleDestination}
              >
                <span>{level.label}</span>
              </a>
            ) : (
              <span key={index} part="menu-item" role="menuitem" aria-disabled="true" tabIndex={-1}>
                <span>{level.label}</span>
              </span>
            ),
          )}
        </div>
      </li>
    );
  }

  render() {
    const range = getCollapsedRange(this.levels.length, this.maxItems);
    return [
      <nav key="trail" part="navigation" aria-label={resolveLabel(this.label, DEFAULT_LABEL)}>
        <ol part="list">
          {range
            ? [
                ...this.levels
                  .slice(0, range.start)
                  .map((level, index) => this.renderLevel(level, index)),
                this.renderOverflow(this.levels.slice(range.start, range.end)),
                ...this.levels
                  .slice(range.end)
                  .map((level, index) => this.renderLevel(level, index + range.end)),
              ]
            : this.levels.map((level, index) => this.renderLevel(level, index))}
        </ol>
      </nav>,
      <div key="levels" hidden>
        <slot />
      </div>,
    ];
  }
}
