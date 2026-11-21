import '../../../icons/ellipsis.js';
import '../../../icons/menu.js';

import { Component, Element, Host, Prop, State, Watch, h } from '@stencil/core';

import { AnchoredOverlay } from '../../utils/anchored-overlay';
import { shadowFocusTarget } from '../../utils/shadow-focus';
import { typeaheadIndex } from '../../utils/typeahead';
import { type TopNavSize, appBarSize, hasCenteredTitle, headingTag } from './ki-top-nav.layout';

const DEFAULT_COLLAPSE_AT = '48rem';
const DEFAULT_LABEL = 'Main';
const DEFAULT_NAVIGATION_LABEL = 'Open navigation';
const DEFAULT_OVERFLOW_LABEL = 'More actions';
const INLINE_ACTIONS = 3;
const MENU_ID = 'top-nav-menu';
const TRIGGER_ID = 'top-nav-trigger';

type TopNavVariant = 'header' | 'app-bar';
type TopNavTitleAlign = 'start' | 'center';
type TopNavScrollBehavior = 'none' | 'elevate' | 'collapse';
interface LinkAttributes {
  role: string | null;
  tabindex: string | null;
}

interface Action {
  element: HTMLElement;
  label: string;
  disabled: boolean;
}

/**
 * Application navigation with responsive primary links, or a per-screen app
 * bar with a real heading, optional search, and overflow actions.
 *
 * @whenToUse group a brand, up to five primary sections and global controls,
 * or set a screen title, leading control and screen actions in app-bar mode.
 * @whenNotToUse more than five sections or a deep navigation tree (use a
 * sidebar), or switches between in-page views (use ki-tabs).
 *
 * @slot - Header mode: up to five direct native anchors; mark the current one with
 * aria-current="page". They stay the page's own anchors, so the page's link
 * rules reach them and outrank the bar's link styles (CSS Scoping gives the
 * page's styles precedence over a component's `::slotted()` rules, whatever
 * their specificity). `a { color: inherit }` is safe: the links then take the
 * bar's item ink. A rule that sets `color`, `text-decoration`, `font-*` or
 * `padding` on every `a` restyles them too: scope it away from the bar, for
 * example `:where(main, footer) a` or `a:not(ki-top-nav > a)`, and restyle the
 * bar's links with the `--ki-top-nav-item-*` tokens.
 * @slot brand - Header mode: the brand link or wordmark. Page link rules reach it
 * as they reach the primary links.
 * @slot actions - Header: global actions. App bar: up to three inline; additional direct named buttons or links go into overflow.
 * @slot leading - App bar: a named Back or Open navigation control.
 * @slot search - App bar: an accessible search control that can shrink inside its row.
 * @part bar - Painted header or app-bar surface.
 * @part navigation - The named primary navigation landmark.
 * @part brand - Wrapper for the header brand.
 * @part links - Wrapper for the primary links, including when displayed as a menu.
 * @part actions - Wrapper for the trailing actions.
 * @part leading - Wrapper for the app-bar leading control.
 * @part heading - The native screen heading.
 * @part subtitle - Supporting text below the screen heading.
 * @part search - Wrapper for the app-bar search control.
 * @part menu-trigger - Native button opening collapsed navigation or overflow.
 * @part menu - Anchored navigation or overflow menu surface.
 * @part menu-item - Generated screen action in the overflow menu.
 */
@Component({ tag: 'ki-top-nav', styleUrl: 'ki-top-nav.css', shadow: true })
export class KiTopNav {
  @Element() private readonly host!: HTMLElement;

  /** Header for primary navigation, or app-bar for the current screen. Defaults to header. */
  @Prop() variant: TopNavVariant = 'header';

  /** Accessible name of the header's primary navigation landmark. Override for localization. */
  @Prop() label = DEFAULT_LABEL;

  /** Bar size. Only app-bar mode has large and extra-large two-row sizes. */
  @Prop() size: TopNavSize = 'md';

  /** CSS length below which navigation collapses and single-row app bars can center their title. */
  @Prop() collapseAt = DEFAULT_COLLAPSE_AT;

  /** Keep the bar at the block start of the scroll container and draw a bottom border. */
  @Prop({ reflect: true }) sticky = false;

  /** Accessible name for the compact navigation button and menu. Override for localization. */
  @Prop() navigationLabel = DEFAULT_NAVIGATION_LABEL;

  /** Accessible name for the app-bar overflow button and menu. Override for localization. */
  @Prop() overflowLabel = DEFAULT_OVERFLOW_LABEL;

  /** Screen heading, set with the HTML title attribute or the screenTitle property. */
  @Prop({ attribute: 'title' }) screenTitle = '';

  /** Supporting text displayed under the screen heading. */
  @Prop() subtitle = '';

  /** Native heading level for the screen title. Use 1 through 6 to fit the page outline. */
  @Prop() headingLevel = 1;

  /** Center a compact single-row title when the app bar has at most one action. */
  @Prop() titleAlign: TopNavTitleAlign = 'start';

  /** Tint on scroll with elevate, also shrink tall bars with collapse, or opt out with none. */
  @Prop() scrollBehavior: TopNavScrollBehavior = 'elevate';

  @State() private compact = false;
  @State() private scrolled = false;
  @State() private collapsed = false;
  @State() private open = false;
  @State() private linkCount = 0;
  @State() private actionCount = 0;
  @State() private overflowActions: Action[] = [];
  @State() private hasSearch = false;

  private menu: HTMLElement | undefined;
  private trigger: HTMLButtonElement | undefined;
  private probe: HTMLElement | undefined;
  private linkSlot: HTMLSlotElement | undefined;
  private actionSlot: HTMLSlotElement | undefined;
  private searchSlot: HTMLSlotElement | undefined;
  private links: HTMLAnchorElement[] = [];
  private readonly linkAttributes = new Map<HTMLAnchorElement, LinkAttributes>();
  private readonly overlay = new AnchoredOverlay();
  private resizeObserver?: ResizeObserver;
  private contentObserver?: MutationObserver;
  private scrollRoot: Element | Document | undefined;
  private focusAfterLayout: HTMLAnchorElement | 'trigger' | undefined;

  private get appBar(): boolean {
    return this.variant === 'app-bar';
  }

  connectedCallback(): void {
    if (this.probe) this.observe();
  }

  componentDidLoad(): void {
    this.observe();
  }

  componentDidRender(): void {
    if (this.appBar) this.syncScroll();
    const focus = this.focusAfterLayout;
    this.focusAfterLayout = undefined;
    if (focus === 'trigger') this.trigger?.focus();
    else focus?.focus();
  }

  disconnectedCallback(): void {
    this.resizeObserver?.disconnect();
    this.contentObserver?.disconnect();
    this.scrollRoot?.removeEventListener('scroll', this.syncScroll);
    this.scrollRoot = undefined;
    this.closeMenu();
    this.restoreLinks();
  }

  @Watch('variant')
  protected changeVariant(): void {
    this.closeMenu();
    this.restoreLinks();
    this.updateScrollRoot();
  }

  private observe(): void {
    this.resizeObserver = new ResizeObserver(this.syncCompact);
    this.resizeObserver.observe(this.host);
    if (this.probe) this.resizeObserver.observe(this.probe);
    this.contentObserver = new MutationObserver(this.syncContent);
    this.contentObserver.observe(this.host, {
      childList: true,
      subtree: true,
      characterData: true,
      attributeFilter: [
        'slot',
        'href',
        'aria-label',
        'aria-labelledby',
        'label',
        'disabled',
        'aria-disabled',
        'loading',
      ],
    });
    this.syncContent();
    this.syncCompact();
    this.updateScrollRoot();
  }

  private readonly syncCompact = (): void => {
    const bar = this.host.shadowRoot?.querySelector<HTMLElement>('.bar');
    if (!this.probe || !bar) return;
    const inlineSize = (element: HTMLElement) =>
      Number.parseFloat(getComputedStyle(element).inlineSize);
    // The breakpoint compares the width the row lays out in: the bar fills the
    // host's content box. The host's own inline size would include its padding
    // whenever the page gives it `box-sizing: border-box`.
    const compact = inlineSize(bar) < inlineSize(this.probe);
    if (this.compact === compact) return;

    if (!this.appBar) {
      const focused = this.focusedLink();
      if (compact && focused) this.focusAfterLayout = 'trigger';
      if (!compact && (focused || this.host.shadowRoot?.activeElement === this.trigger)) {
        this.focusAfterLayout = focused ?? this.links[0];
      }
      this.closeMenu();
    }
    this.compact = compact;
    this.syncLinkAttributes();
  };

  private updateScrollRoot(): void {
    this.scrollRoot?.removeEventListener('scroll', this.syncScroll);
    this.scrollRoot = undefined;
    if (!this.appBar) return;

    const doc = this.host.ownerDocument;
    let node: Node | null = this.host;
    while (node) {
      node =
        node instanceof globalThis.Element && node.assignedSlot
          ? node.assignedSlot
          : node instanceof ShadowRoot
            ? node.host
            : node.parentNode;
      if (
        !(node instanceof globalThis.Element) ||
        node === doc.body ||
        node === doc.documentElement
      )
        continue;
      if (/^(auto|scroll|hidden|overlay)$/.test(getComputedStyle(node).overflowY)) {
        this.scrollRoot = node;
        break;
      }
    }
    this.scrollRoot ??= doc;
    this.scrollRoot.addEventListener('scroll', this.syncScroll, { passive: true });
    this.syncScroll();
  }

  private readonly syncScroll = (): void => {
    const root = this.scrollRoot;
    const offset =
      (root instanceof Document ? root.scrollingElement?.scrollTop : root?.scrollTop) ?? 0;
    this.scrolled = offset > 0;
    this.collapsed = this.scrolled && offset >= (this.probe?.offsetHeight ?? 0);
  };

  private readonly syncContent = (): void => {
    if (!this.appBar) {
      this.links = (this.linkSlot?.assignedElements() ?? []).filter(
        (element): element is HTMLAnchorElement =>
          element instanceof HTMLAnchorElement && element.hasAttribute('href'),
      );
      this.linkCount = this.links.length;
      this.syncLinkAttributes();
      if (this.linkCount === 0) this.closeMenu();
      return;
    }

    const actions = this.actionSlot?.assignedElements() ?? [];
    this.actionCount = actions.length;
    this.hasSearch = (this.searchSlot?.assignedElements().length ?? 0) > 0;
    this.overflowActions = actions.slice(INLINE_ACTIONS).flatMap((element) => {
      if (!(element instanceof HTMLElement)) return [];
      const label = this.actionLabel(element);
      return label ? [{ element, label, disabled: this.actionDisabled(element) }] : [];
    });
    if (this.overflowActions.length === 0) this.closeMenu();
  };

  private actionLabel(element: HTMLElement): string {
    const root = element.getRootNode();
    const labels = element.getAttribute('aria-labelledby')?.trim();
    if (labels && (root instanceof Document || root instanceof ShadowRoot)) {
      const name = labels
        .split(/\s+/)
        .map((id) => (root.getElementById(id)?.textContent ?? '').trim())
        .filter(Boolean)
        .join(' ');
      if (name) return name;
    }
    return (
      element.getAttribute('aria-label') ??
      element.getAttribute('label') ??
      (element.textContent || '')
    ).trim();
  }

  private actionDisabled(element: HTMLElement): boolean {
    // Boolean HTML attributes disable even when empty. Kimen Boolean props
    // also accept an explicit "false" string in HTML/JSX.
    return (
      element.matches(':disabled, [aria-disabled="true"]') ||
      (element.hasAttribute('disabled') && element.getAttribute('disabled') !== 'false') ||
      (element.hasAttribute('loading') && element.getAttribute('loading') !== 'false')
    );
  }

  private syncLinkAttributes(): void {
    this.restoreLinks(this.compact && !this.appBar ? this.links : []);
    if (!this.compact || this.appBar) return;
    for (const link of this.links) {
      if (this.linkAttributes.has(link)) continue;
      this.linkAttributes.set(link, {
        role: link.getAttribute('role'),
        tabindex: link.getAttribute('tabindex'),
      });
      link.setAttribute('role', 'menuitem');
      link.tabIndex = -1;
    }
  }

  private restoreLinks(keep: readonly HTMLAnchorElement[] = []): void {
    for (const [link, attributes] of this.linkAttributes) {
      if (keep.includes(link)) continue;
      for (const name of ['role', 'tabindex'] as const) {
        const value = attributes[name];
        if (value === null) link.removeAttribute(name);
        else link.setAttribute(name, value);
      }
      this.linkAttributes.delete(link);
    }
  }

  private focusedLink(): HTMLAnchorElement | undefined {
    const root = this.host.getRootNode();
    const focused =
      root instanceof Document || root instanceof ShadowRoot ? root.activeElement : null;
    return this.links.find((link) => link === focused);
  }

  private menuItems(): HTMLElement[] {
    if (this.appBar)
      return [...(this.menu?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
    return this.links;
  }

  private openMenu(last = false): void {
    const trigger = this.trigger;
    const items = this.menuItems();
    if (!trigger || items.length === 0) return;
    if (
      this.overlay.show(this.menu, trigger, {
        outsidePointer: true,
        onDismiss: () => {
          this.closeMenu();
        },
      })
    ) {
      this.open = true;
      (last ? items.at(-1) : items[0])?.focus();
    }
  }

  private closeMenu(restoreFocus = false): void {
    this.open = false;
    this.overlay.hide();
    if (restoreFocus) this.trigger?.focus();
  }

  private readonly toggleMenu = (): void => {
    if (this.open) this.closeMenu(true);
    else this.openMenu();
  };

  private readonly onTriggerKey = (event: KeyboardEvent): void => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    this.openMenu(event.key === 'ArrowUp');
  };

  private readonly onMenuKey = (event: KeyboardEvent): void => {
    if (!this.open) return;
    const items = this.menuItems();
    if (items.length === 0) return;
    const current = items.findIndex((item) => event.composedPath().includes(item));
    let target: number;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        this.closeMenu(true);
        return;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = items.length - 1;
        break;
      case 'ArrowDown':
        target = (current + 1) % items.length;
        break;
      case 'ArrowUp':
        target = current > 0 ? current - 1 : items.length - 1;
        break;
      case ' ':
        if (!this.appBar && current >= 0) {
          event.preventDefault();
          items[current]?.click();
        }
        return;
      default: {
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
        target = typeaheadIndex(
          items.map((item) => ({ label: this.actionLabel(item) })),
          event.key,
          current,
        );
      }
    }

    if (target >= 0) {
      event.preventDefault();
      items[target]?.focus();
    }
  };

  private readonly onMenuFocusOut = (event: FocusEvent): void => {
    if (!this.open) return;
    const next = event.relatedTarget;
    if (!(next instanceof Node) || !this.menuItems().some((item) => item.contains(next))) {
      this.closeMenu();
    }
  };

  private readonly onLinkClick = (event: MouseEvent): void => {
    if (this.open && this.links.some((link) => event.composedPath().includes(link))) {
      this.closeMenu(this.focusedLink() !== undefined);
    }
  };

  private activateAction(action: Action): void {
    if (this.actionDisabled(action.element)) return;
    this.closeMenu(true);
    (shadowFocusTarget(action.element) ?? action.element).click();
  }

  private renderMenuTrigger(label: string, icon: 'menu' | 'ellipsis') {
    // Announce the menu before opening and reference the rendered menu once
    // expanded. Axe treats aria-controls paired with aria-haspopup as unresolved.
    return (
      <button
        id={TRIGGER_ID}
        part="menu-trigger"
        class="menu-trigger"
        type="button"
        tabindex="0"
        aria-label={label}
        aria-haspopup={this.open ? undefined : 'menu'}
        aria-controls={this.open ? MENU_ID : undefined}
        aria-expanded={this.open ? 'true' : 'false'}
        ref={(element) => {
          if (element) this.trigger = element;
        }}
        onClick={this.toggleMenu}
        onKeyDown={this.onTriggerKey}
        onPointerDown={(event: PointerEvent) => {
          // Keep focus in an open menu until the trigger's click closes it.
          if (this.open) event.preventDefault();
        }}
      >
        <ki-icon name={icon} size="md" />
      </button>
    );
  }

  private renderHeader() {
    const menu = this.compact && this.linkCount > 0;
    const popup = menu
      ? {
          id: MENU_ID,
          popover: 'manual' as const,
          role: 'menu',
          tabindex: '-1',
          'aria-labelledby': TRIGGER_ID,
        }
      : {};
    return (
      <header
        key="header"
        part="bar"
        class={{ bar: true, header: true, compact: this.compact, 'small-bar': this.size === 'sm' }}
      >
        <div class="brand" part="brand">
          <slot name="brand" />
        </div>
        <nav part="navigation" aria-label={this.label || DEFAULT_LABEL}>
          {menu && this.renderMenuTrigger(this.navigationLabel || DEFAULT_NAVIGATION_LABEL, 'menu')}
          {/* Keyboard handlers apply only while this surface has the menu role. */}
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            part={menu ? 'links menu' : 'links'}
            class={{ links: true, 'nav-menu': this.compact, popup: menu }}
            {...popup}
            ref={(element) => {
              if (element) this.menu = element;
            }}
            onClick={this.onLinkClick}
            onKeyDown={this.onMenuKey}
            onFocusout={this.onMenuFocusOut}
          >
            <slot
              ref={(element) => {
                this.linkSlot = element;
              }}
              onSlotchange={this.syncContent}
            />
          </div>
        </nav>
        <div class="actions" part="actions">
          <slot name="actions" />
        </div>
      </header>
    );
  }

  private renderOverflow() {
    return [
      this.renderMenuTrigger(this.overflowLabel || DEFAULT_OVERFLOW_LABEL, 'ellipsis'),
      <div
        id={MENU_ID}
        part="menu"
        class="popup"
        popover="manual"
        role="menu"
        tabindex="-1"
        aria-labelledby={TRIGGER_ID}
        ref={(element) => {
          if (element) this.menu = element;
        }}
        onKeyDown={this.onMenuKey}
        onFocusout={this.onMenuFocusOut}
      >
        {this.overflowActions.map((action) => (
          <button
            type="button"
            role="menuitem"
            part="menu-item"
            class="overflow-item"
            tabindex="-1"
            aria-disabled={action.disabled ? 'true' : undefined}
            onClick={() => {
              this.activateAction(action);
            }}
          >
            {action.label}
          </button>
        ))}
      </div>,
    ];
  }

  private renderAppBar() {
    const size = appBarSize(this.size, this.scrollBehavior, this.collapsed);
    const expanded = size === 'lg' || size === 'xl';
    const centered =
      hasCenteredTitle(size, this.titleAlign, this.compact, this.actionCount) && !this.hasSearch;
    const Heading = headingTag(this.headingLevel);
    return (
      <header
        key="app-bar"
        part="bar"
        class={{
          bar: true,
          'app-bar': true,
          'small-bar': size === 'sm',
          expanded,
          'extra-large': size === 'xl',
          'has-search': this.hasSearch,
          centered,
          scrolled: this.scrolled && this.scrollBehavior !== 'none',
        }}
      >
        <div class="leading" part="leading">
          <slot name="leading" />
        </div>
        <div class="title-group">
          {this.screenTitle && <Heading part="heading">{this.screenTitle}</Heading>}
          {this.subtitle && <div part="subtitle">{this.subtitle}</div>}
        </div>
        <div class="search" part="search">
          <slot
            name="search"
            ref={(element) => {
              this.searchSlot = element;
            }}
            onSlotchange={this.syncContent}
          />
        </div>
        <div class="actions app-actions" part="actions">
          <slot
            name="actions"
            ref={(element) => {
              this.actionSlot = element;
            }}
            onSlotchange={this.syncContent}
          />
          {this.overflowActions.length > 0 && this.renderOverflow()}
        </div>
      </header>
    );
  }

  render() {
    const length = (this.collapseAt || DEFAULT_COLLAPSE_AT).trim();
    const breakpoint = CSS.supports('inline-size', `max(0px, ${length})`)
      ? length
      : DEFAULT_COLLAPSE_AT;
    const collapsible = this.appBar && this.scrollBehavior === 'collapse';
    return (
      <Host
        class={{
          'collapse-lg': collapsible && this.size === 'lg',
          'collapse-xl': collapsible && this.size === 'xl',
        }}
      >
        <span class="measure" aria-hidden="true">
          <span
            class="probe"
            ref={(element) => {
              this.probe = element;
            }}
            style={{ inlineSize: breakpoint }}
          />
        </span>
        {this.appBar ? this.renderAppBar() : this.renderHeader()}
      </Host>
    );
  }
}
