import { Component, Element, h, Host, Listen, Prop, State, Watch } from '@stencil/core';
import { getKeyboardIntent, isNavigationIntent } from '../../utils/keyboard-intent';
import { rovingFocusIndex, rovingTabIndex } from '../../utils/roving-focus';
import { toolbarScrollState } from './ki-toolbar.scroll';

export type KiToolbarVariant = 'floating' | 'docked';
export type KiToolbarOrientation = 'horizontal' | 'vertical';
export type KiToolbarTone = 'standard' | 'vibrant';

interface Action {
  child: HTMLElement;
  button: HTMLButtonElement;
}

const kimenButtonTags = new Set(['ki-button', 'ki-icon-button']);
const actionAttributes = ['disabled', 'hidden', 'inert', 'tabindex'];
const slottedActionAttributes = [...actionAttributes, 'class', 'style'];
// An action moved straight to another toolbar keeps its pre-toolbar tabindex.
// The owner that claimed it last writes the value and eventually restores it.
const ownedTabStops = new WeakMap<
  HTMLButtonElement,
  { owner: HTMLElement; original: string | null }
>();

function isAvailable({ child, button }: Action): boolean {
  return (
    !child.hidden &&
    !child.inert &&
    !button.hidden &&
    !button.inert &&
    !button.matches(':disabled') &&
    getComputedStyle(child).display !== 'none'
  );
}

/**
 * Brings frequent page actions together in a floating pill or docked surface.
 *
 * @whenToUse group a small set of related page actions, such as text
 * formatting or the commands on a compact message screen.
 * @whenNotToUse for site navigation, mutually exclusive choices, or a docked
 * bar on a screen already using MobileNav.
 * @slot - Direct ki-button, ki-icon-button (including toggles), native button
 * and ki-divider children. Give every icon-only action an accessible name.
 * @slot fab - A companion ki-fab for the floating variant. It follows the
 * toolbar and has its own Tab stop.
 * @part toolbar - The named surface containing the grouped actions.
 */
// The shadow root contains the surface and keeps the FAB outside the toolbar's
// accessibility group while leaving both sets of controls in light DOM.
@Component({ tag: 'ki-toolbar', styleUrl: 'ki-toolbar.css', shadow: true })
export class KiToolbar {
  @Element() private readonly host!: HTMLElement;

  /** Accessible name for the group, such as "Formatting". Supply it in the page's language. */
  @Prop({ reflect: true }) label!: string;

  /**
   * Floating leaves placement to the page. Docked fixes the surface to the
   * viewport's bottom edge. Reserve space below the content when docking.
   * @default 'floating'
   */
  @Prop({ reflect: true }) variant: KiToolbarVariant = 'floating';

  /**
   * Layout and keyboard axis. Set vertical for a floating column. Docked is always horizontal.
   * @default 'horizontal'
   */
  @Prop({ reflect: true }) orientation: KiToolbarOrientation = 'horizontal';

  /**
   * Surface palette. Use vibrant to emphasize the toolbar with an accent tint.
   * @default 'standard'
   */
  @Prop({ reflect: true }) tone: KiToolbarTone = 'standard';

  /**
   * Hides on downward page scroll and reveals on upward scroll or when an
   * action receives focus. Use for secondary actions where content needs room.
   * @default false
   */
  @Prop({ reflect: true }) hideOnScroll = false;

  @State() private scrollHidden = false;

  private scrollWindow: Window | undefined;
  private scrollPosition = 0;
  private actionSlot: HTMLSlotElement | undefined;
  private actions: Action[] = [];
  private current: HTMLButtonElement | undefined;
  private observer?: MutationObserver;
  private readonly pendingDefinitions = new Set<string>();

  connectedCallback(): void {
    if (this.actionSlot) {
      this.configureScroll();
      this.refreshActions();
    }
  }

  componentWillLoad(): void {
    this.configureScroll();
  }

  componentDidLoad(): void {
    this.refreshActions();
  }

  disconnectedCallback(): void {
    this.scrollWindow?.removeEventListener('scroll', this.onScroll);
    this.scrollWindow = undefined;
    this.observer?.disconnect();
    this.actions.forEach(this.releaseAction);
    this.actions = [];
    this.current = undefined;
  }

  @Watch('hideOnScroll')
  protected configureScroll(): void {
    this.scrollWindow?.removeEventListener('scroll', this.onScroll);
    this.scrollWindow = undefined;
    this.scrollHidden = false;
    if (this.hideOnScroll && this.host.isConnected) {
      this.scrollWindow = this.host.ownerDocument.defaultView ?? undefined;
      this.scrollPosition = Math.max(0, this.host.ownerDocument.scrollingElement?.scrollTop ?? 0);
      this.scrollWindow?.addEventListener('scroll', this.onScroll, { passive: true });
    }
  }

  private readonly onScroll = (): void => {
    const viewport = this.host.ownerDocument.scrollingElement;
    if (!viewport) return;
    const next = toolbarScrollState(
      { position: this.scrollPosition, hidden: this.scrollHidden },
      viewport.scrollTop,
      viewport.scrollHeight - viewport.clientHeight,
      this.host.matches(':focus-within'),
    );
    this.scrollPosition = next.position;
    this.scrollHidden = next.hidden;
  };

  private get effectiveOrientation(): KiToolbarOrientation {
    return this.variant !== 'docked' && this.orientation === 'vertical' ? 'vertical' : 'horizontal';
  }

  private readonly refreshActions = (): void => {
    if (!this.actionSlot || !this.host.isConnected) return;
    this.observer ??= new MutationObserver(this.refreshActions);
    this.observer.disconnect();

    const roster: Action[] = [];
    for (const child of this.actionSlot.assignedElements({ flatten: true })) {
      if (!(child instanceof HTMLElement)) continue;
      if (!(child instanceof HTMLButtonElement) && !kimenButtonTags.has(child.localName)) continue;

      this.observer.observe(child, { attributeFilter: slottedActionAttributes });
      if (child instanceof HTMLButtonElement) {
        roster.push({ child, button: child });
        continue;
      }

      // The packaged Stencil controls own their focusable button. Observe the
      // public button part so late hydration and component renders stay in sync.
      const root = child.shadowRoot;
      if (!root) {
        this.waitForDefinition(child.localName);
        continue;
      }
      this.observer.observe(root, {
        childList: true,
        subtree: true,
        attributeFilter: actionAttributes,
      });
      const button = root.querySelector<HTMLButtonElement>('button[part~="button"]');
      if (button) roster.push({ child, button });
    }

    const buttons = new Set(roster.map(({ button }) => button));
    this.actions.filter(({ button }) => !buttons.has(button)).forEach(this.releaseAction);
    this.actions = roster;

    const focused = roster.find((action) => isAvailable(action) && action.button.matches(':focus'));
    const previous = roster.find((action) => isAvailable(action) && action.button === this.current);
    this.current = (focused ?? previous ?? roster.find(isAvailable))?.button;
    this.syncTabStops();
  };

  private waitForDefinition(tag: string): void {
    const registry = this.host.ownerDocument.defaultView?.customElements;
    if (!registry || registry.get(tag) || this.pendingDefinitions.has(tag)) return;
    this.pendingDefinitions.add(tag);
    void registry.whenDefined(tag).then(() => {
      this.pendingDefinitions.delete(tag);
      this.refreshActions();
    });
  }

  private readonly releaseAction = ({ child, button }: Action): void => {
    const ownership = ownedTabStops.get(button);
    if (ownership?.owner !== this.host) return;
    ownedTabStops.delete(button);
    if (button !== child) {
      // These controls own their normal tabindex and may have become disabled
      // or re-enabled since they joined.
      button.tabIndex = button.disabled ? -1 : 0;
    } else if (ownership.original === null) {
      button.removeAttribute('tabindex');
    } else {
      button.setAttribute('tabindex', ownership.original);
    }
  };

  private syncTabStops(): void {
    const currentIndex = this.actions.findIndex(({ button }) => button === this.current);
    this.actions.forEach(({ button }, index) => {
      const ownership = ownedTabStops.get(button);
      if (ownership?.owner !== this.host) {
        ownedTabStops.set(button, {
          owner: this.host,
          original: ownership ? ownership.original : button.getAttribute('tabindex'),
        });
      }
      const tabIndex = String(rovingTabIndex(index, currentIndex));
      if (button.getAttribute('tabindex') !== tabIndex) button.setAttribute('tabindex', tabIndex);
    });
  }

  @Listen('focusin')
  protected onFocusIn(event: FocusEvent): void {
    this.scrollHidden = false;
    const path = event.composedPath();
    const action = this.actions.find(({ button }) => path.includes(button));
    if (!action || !isAvailable(action)) return;
    this.current = action.button;
    this.syncTabStops();
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey)
      return;
    const direction = getComputedStyle(this.host).direction === 'rtl' ? 'rtl' : 'ltr';
    const intent = getKeyboardIntent(event.key, this.effectiveOrientation, direction);
    if (!isNavigationIntent(intent)) return;

    const path = event.composedPath();
    const index = this.actions.findIndex(({ button }) => path.includes(button));
    if (index < 0) return;
    const next = rovingFocusIndex(this.actions, index, intent, {
      wrap: true,
      isFocusable: isAvailable,
    });
    const destination = next === null ? undefined : this.actions[next];
    if (destination) {
      event.preventDefault();
      destination.button.focus();
    }
  };

  render() {
    return (
      <Host class={{ 'scroll-hidden': this.scrollHidden }}>
        <div
          part="toolbar"
          role="toolbar"
          aria-label={this.label}
          aria-orientation={this.effectiveOrientation}
          onKeyDown={this.onKeyDown}
        >
          <slot
            ref={(slot) => {
              this.actionSlot = slot;
            }}
            onSlotchange={this.refreshActions}
          />
        </div>
        {this.variant !== 'docked' && <slot name="fab" />}
      </Host>
    );
  }
}
