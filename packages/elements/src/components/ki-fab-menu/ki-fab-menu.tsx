import '../../../icons/plus.js';
import '../../../icons/x.js';

import {
  Component,
  Element,
  Event,
  type EventEmitter,
  h,
  Host,
  Prop,
  State,
  Watch,
} from '@stencil/core';
import { resolveOverlayPosition } from '../../utils/anchored-overlay-position';
import { getVerticalKeyboardIntent, isNavigationIntent } from '../../utils/keyboard-intent';
import { menuNavigationIndex } from '../ki-menu/ki-menu.keyboard';
import type { KiFabPosition, KiFabVariant } from '../ki-fab/ki-fab';
import type { KiFabMenuItem } from '../ki-fab-menu-item/ki-fab-menu-item';
import { fabMenuActionValue } from './ki-fab-menu.actions';

type Action = HTMLElement & Pick<KiFabMenuItem, 'value'>;
const itemTag = ['ki', 'fab', 'menu', 'item'].join('-');
const menuId = 'fab-menu';

export interface KiFabMenuSelectDetail {
  value: string;
}

/**
 * An icon FAB that opens two to six related actions above its trigger.
 *
 * @whenToUse group related creation or screen actions behind one floating button.
 * @whenNotToUse for a single primary action, long lists, or site navigation.
 * @slot - Two to six direct ki-fab-menu-item children, in top-to-bottom order.
 * @part trigger - The native floating button that opens and closes the menu.
 * @part menu - The named action list above the trigger.
 * @part scrim - The optional pointer-dismissible overlay behind the menu.
 */
// The native trigger and its controlled menu share a shadow root for the ARIA ID reference.
@Component({ tag: 'ki-fab-menu', styleUrl: 'ki-fab-menu.css', shadow: true })
export class KiFabMenu {
  @Element() private readonly host!: HTMLElement;

  /** Accessible name of the closed trigger and of the menu. */
  @Prop() label!: string;

  /** Registered Lucide glyph for the closed trigger. The plus glyph ships with the component. */
  @Prop() iconName = 'plus';

  /** Localized accessible name of the trigger when it becomes the close control. */
  @Prop() closeLabel = 'Close menu';

  /** Whether the action stack is open. Reflected when the user opens or dismisses it. */
  @Prop({ mutable: true, reflect: true }) open = false;

  /** Closed FAB surface. The open trigger always uses primary. */
  @Prop({ reflect: true }) variant: KiFabVariant = 'secondary';

  /** Static anchors to the host. Fixed anchors to the viewport's block-end inline-end corner. */
  @Prop({ reflect: true }) position: KiFabPosition = 'static';

  /** Dim the viewport and dismiss on a scrim click. Use the boolean property or scrim="false" to opt out. */
  @Prop() scrim = true;

  /** Emitted when the action stack opens. */
  @Event({ eventName: 'ki-open' }) opened!: EventEmitter<void>;

  /** Emitted when the action stack closes. */
  @Event({ eventName: 'ki-close' }) closed!: EventEmitter<void>;

  /** Emits the selected item's value or its trimmed label. Native links retain their destination. */
  @Event({ eventName: 'ki-select' }) selected!: EventEmitter<KiFabMenuSelectDetail>;

  @State() private hasActions = false;

  private trigger: HTMLButtonElement | undefined;
  private panel: HTMLDivElement | undefined;
  private observer?: MutationObserver;
  private resize?: ResizeObserver;
  private loaded = false;
  private expanded = false;
  private openingEdge: 'first' | 'last' = 'first';

  connectedCallback(): void {
    this.syncItems();
    this.observer = new MutationObserver(this.syncItems);
    this.observer.observe(this.host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'slot'],
    });
    if (this.expanded) this.watchPosition();
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    this.unwatchPosition();
  }

  componentDidLoad(): void {
    this.loaded = true;
    if (this.expanded) this.focusItem('first');
  }

  componentDidRender(): void {
    const expanded = this.open && this.hasActions;
    if (expanded === this.expanded) return;
    this.expanded = expanded;
    if (expanded) {
      this.watchPosition();
      if (this.loaded) this.focusItem(this.openingEdge);
      this.openingEdge = 'first';
      if (this.loaded) this.opened.emit();
    } else {
      this.unwatchPosition();
      if (this.loaded) this.closed.emit();
    }
  }

  @Watch('open')
  protected onOpenChange(open: boolean): void {
    if (open && !this.hasActions) this.open = false;
    if (!open && this.panel?.matches(':focus-within')) this.trigger?.focus({ preventScroll: true });
  }

  private readonly syncItems = (): void => {
    this.hasActions = this.items().length >= 2;
    if (!this.hasActions && this.open) this.open = false;
  };

  private items(): Action[] {
    return [...this.host.children]
      .filter(
        (child): child is Action =>
          child.localName === itemTag &&
          !child.hasAttribute('hidden') &&
          !child.getAttribute('slot'),
      )
      .slice(0, 6);
  }

  private watchPosition(): void {
    if (!this.panel || !this.trigger) return;
    this.positionMenu();
    this.resize = new ResizeObserver(this.positionMenu);
    this.resize.observe(this.panel);
    this.resize.observe(this.trigger);
    this.host.ownerDocument.defaultView?.addEventListener('resize', this.positionMenu);
  }

  private unwatchPosition(): void {
    this.resize?.disconnect();
    this.host.ownerDocument.defaultView?.removeEventListener('resize', this.positionMenu);
  }

  private readonly positionMenu = (): void => {
    const { panel, trigger } = this;
    const view = this.host.ownerDocument.defaultView;
    if (!panel || !trigger || !view || !this.expanded) return;

    const dir = view.getComputedStyle(trigger).direction === 'rtl' ? 'rtl' : 'ltr';
    const popupRect = panel.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const { documentElement } = view.document;
    // The panel stays above the trigger. Only its inline position can shift at a viewport edge.
    const { crossAxisShift } = resolveOverlayPosition({
      placement: 'top-end',
      dir,
      triggerRect,
      popupRect,
      viewport: { width: documentElement.clientWidth, height: documentElement.clientHeight },
    });
    panel.style.setProperty(
      '--_fab-menu-shift',
      `${String(dir === 'rtl' ? -crossAxisShift : crossAxisShift)}px`,
    );
  };

  private focusItem(intent: 'first' | 'last' | 'next' | 'previous', current = -1): void {
    const items = this.items();
    const item = items[menuNavigationIndex(intent, current, items.length)];
    const itemControl = () => item?.shadowRoot?.querySelector<HTMLElement>('[part="control"]');
    const control = itemControl();
    if (control) {
      control.focus();
      return;
    }
    // Slotted custom elements can render a frame after their parent.
    this.panel?.focus();
    this.host.ownerDocument.defaultView?.requestAnimationFrame(() => {
      if (this.open && this.panel?.matches(':focus')) itemControl()?.focus();
    });
  }

  private dismiss(restoreFocus: boolean): void {
    if (restoreFocus) this.trigger?.focus({ preventScroll: true });
    this.open = false;
  }

  private readonly onTriggerClick = (): void => {
    if (this.open) this.dismiss(true);
    else if (this.hasActions) this.open = true;
  };

  private readonly onTriggerKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.isComposing) return;
    const intent = getVerticalKeyboardIntent(event.key);
    if (intent === 'next' || intent === 'previous') {
      event.preventDefault();
      if (event.repeat || !this.hasActions) return;
      const edge = intent === 'next' ? 'first' : 'last';
      if (this.expanded) this.focusItem(edge);
      else {
        this.openingEdge = edge;
        this.open = true;
      }
    } else if (this.open && intent === 'close') {
      event.preventDefault();
      event.stopPropagation();
      this.dismiss(true);
    } else if (this.open && event.key === 'Tab') {
      this.dismiss(false);
    }
  };

  private readonly onMenuKeyDown = (event: KeyboardEvent): void => {
    if (!this.open || event.defaultPrevented || event.isComposing) return;
    const intent = getVerticalKeyboardIntent(event.key);
    if (intent === 'close') {
      event.preventDefault();
      event.stopPropagation();
      this.dismiss(true);
    } else if (event.key === 'Tab') {
      // Continue native sequential navigation from the trigger.
      this.dismiss(true);
    } else if (isNavigationIntent(intent)) {
      event.preventDefault();
      const path = event.composedPath();
      this.focusItem(
        intent,
        this.items().findIndex((item) => path.includes(item)),
      );
    }
  };

  private readonly onMenuClick = (event: MouseEvent): void => {
    if (!this.open || event.defaultPrevented) return;
    const path = event.composedPath();
    const item = this.items().find((candidate) => path.includes(candidate));
    if (!item) return;

    const value = fabMenuActionValue(item.value, item.textContent);
    this.dismiss(true);
    this.selected.emit({ value });
  };

  private readonly onFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget;
    if (
      this.open &&
      next instanceof Node &&
      !this.host.contains(next) &&
      !this.host.shadowRoot?.contains(next)
    ) {
      this.dismiss(false);
    }
  };

  private readonly onScrimClick = (): void => {
    this.dismiss(true);
  };

  render() {
    const open = this.open && this.hasActions;
    return (
      <Host onFocusout={this.onFocusOut}>
        {open && this.scrim && (
          <div
            part="scrim"
            aria-hidden="true"
            onPointerDown={(event) => {
              event.preventDefault();
            }}
            onClick={this.onScrimClick}
          />
        )}
        <button
          part="trigger"
          type="button"
          tabIndex={0}
          disabled={!this.hasActions}
          aria-label={open ? this.closeLabel : this.label}
          aria-haspopup="menu"
          aria-expanded={open ? 'true' : 'false'}
          aria-controls={menuId}
          data-variant={open ? 'primary' : this.variant}
          onClick={this.onTriggerClick}
          onKeyDown={this.onTriggerKeyDown}
          ref={(trigger) => {
            this.trigger = trigger;
          }}
        >
          <ki-icon name={open ? 'x' : this.iconName} aria-hidden="true" />
        </button>
        <div
          part="menu"
          id={menuId}
          role="menu"
          aria-label={this.label}
          hidden={!open}
          tabIndex={-1}
          onKeyDown={this.onMenuKeyDown}
          onClick={this.onMenuClick}
          ref={(panel) => {
            this.panel = panel;
          }}
        >
          <slot />
        </div>
      </Host>
    );
  }
}
