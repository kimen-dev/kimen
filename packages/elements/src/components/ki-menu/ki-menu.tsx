import {
  Component,
  Element,
  Event,
  type EventEmitter,
  h,
  Listen,
  Prop,
  State,
  Watch,
} from '@stencil/core';

import { resolveOverlayAnchor, setOverlayOpen } from '../../utils/anchored-overlay';
import { resolveOverlayPosition } from '../../utils/anchored-overlay-position';
import { getVerticalKeyboardIntent, isNavigationIntent } from '../../utils/keyboard-intent';
import { focusThroughShadow, shadowFocusTarget } from '../../utils/shadow-focus';
import { extendTypeahead, typeaheadIndex } from '../../utils/typeahead';
import {
  collectMenuItems,
  type MenuItem,
  menuItemLabel,
  menuNavigationIndex,
} from './ki-menu.keyboard';

export type KiMenuPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

export interface KiMenuSelectDetail {
  value: string;
  checked?: boolean;
}

type TriggerElement = HTMLElement & {
  ariaControlsElements?: readonly Element[] | null;
  ariaLabelledByElements?: readonly Element[] | null;
};

const triggerAttributes = ['aria-haspopup', 'aria-expanded', 'aria-controls'] as const;
let nextId = 0;

/**
 * A popup of actions opened by a button in the same document or shadow root.
 *
 * @whenToUse row actions, account commands, split buttons, and overflow actions.
 * @whenNotToUse form values, navigation destinations, or long action lists.
 * @slot - Place ki-menu-item, ki-menu-group, and ki-divider here.
 * @slot header - Informational content above the actions, such as account details.
 * @part popup - The anchored surface.
 * @part menu - The named menu containing the actions.
 * @part header - The informational header.
 * @part filter - The filter field.
 */
@Component({ tag: 'ki-menu', styleUrl: 'ki-menu.css', shadow: true })
export class KiMenu {
  @Element() host!: HTMLElement;

  /**
   * Literal ID of the menu button in the same document or containing shadow root.
   * @format idref
   */
  @Prop() anchor = '';

  /** Whether the popup is open. Reflected when the user opens or dismisses it. */
  @Prop({ mutable: true, reflect: true }) open = false;

  /** Preferred side and logical alignment. Flips when the opposite side has more room. */
  @Prop() placement: KiMenuPlacement = 'bottom-start';

  /** Accessible name and placeholder of the filter. Omit to hide the field. */
  @Prop() filterLabel = '';

  /** Polite results message. The menu substitutes the number of matches for `{count}`. */
  @Prop() filterResultsLabel = 'Matching actions: {count}';

  /** Reports the selected action and, for a checkbox or radio, its new checked state. */
  @Event({ eventName: 'ki-select' }) selectAction!: EventEmitter<KiMenuSelectDetail>;

  @State() matchCount = 0;

  private panel: HTMLElement | undefined;
  private list: HTMLElement | undefined;
  private filter: HTMLInputElement | undefined;
  private trigger: TriggerElement | undefined;
  private triggerControl: TriggerElement | undefined;
  private triggerEvents?: AbortController;
  private anchorObserver?: MutationObserver;
  private itemObserver: MutationObserver | undefined;
  private popupEvents: AbortController | undefined;
  private resize: ResizeObserver | undefined;
  private restoreTrigger: (() => void) | undefined;
  private restoreControl: (() => void) | undefined;
  private available: MenuItem[] = [];
  private filtered = new Set<HTMLElement>();
  private separators = new Set<HTMLElement>();
  private query = '';
  private typed = '';
  private lastTypedAt = 0;
  private shown = false;

  connectedCallback() {
    if (this.panel) this.connect();
  }

  componentDidLoad() {
    this.connect();
  }

  disconnectedCallback() {
    this.anchorObserver?.disconnect();
    this.itemObserver?.disconnect();
    this.hide();
    this.unbindTrigger();
  }

  @Watch('anchor')
  anchorChanged() {
    if (this.panel && this.host.isConnected) this.bindTrigger();
  }

  @Watch('open')
  openChanged() {
    if (this.open) this.show();
    else this.hide();
    this.updateTrigger();
  }

  @Watch('placement')
  placementChanged() {
    this.position();
  }

  @Watch('filterLabel')
  filterChanged(label: string) {
    if (!label) {
      this.query = '';
      this.refreshItems();
    }
  }

  private connect(): void {
    if (!this.host.isConnected) return;
    if (!this.host.id) {
      do {
        this.host.id = `ki-menu-${String(++nextId)}`;
      } while (resolveOverlayAnchor(this.host, this.host.id) !== this.host);
    }
    this.anchorObserver = new MutationObserver(() => {
      this.bindTrigger();
    });
    this.anchorObserver.observe(this.host.getRootNode(), {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['id'],
    });
    this.bindTrigger();
  }

  private bindTrigger(): void {
    const anchor = this.anchor && resolveOverlayAnchor(this.host, this.anchor);
    const trigger = anchor instanceof HTMLElement && anchor !== this.host ? anchor : undefined;
    if (trigger === this.trigger) {
      this.updateTrigger();
      this.position();
      return;
    }
    const wasShown = this.shown;
    this.hide();
    this.unbindTrigger();
    if (!trigger) {
      if (wasShown) this.open = false;
      return;
    }

    this.trigger = trigger;
    this.restoreTrigger = this.saveTriggerAttributes(trigger);
    this.triggerEvents = new AbortController();
    const options = { signal: this.triggerEvents.signal };
    trigger.addEventListener('click', this.onTriggerClick, options);
    trigger.addEventListener('keydown', this.onTriggerKeyDown, options);
    trigger.addEventListener('focusin', this.onTriggerFocus, options);
    this.updateTrigger();
    this.openChanged();
  }

  private unbindTrigger(): void {
    this.triggerEvents?.abort();
    this.restoreControl?.();
    this.restoreTrigger?.();
    this.trigger = undefined;
    this.triggerControl = undefined;
    this.restoreTrigger = undefined;
    this.restoreControl = undefined;
  }

  private saveTriggerAttributes(element: TriggerElement): () => void {
    const original = triggerAttributes.map((attribute) => element.getAttribute(attribute));
    return () => {
      for (const [index, attribute] of triggerAttributes.entries()) {
        const value = original[index];
        if (value === null || value === undefined) element.removeAttribute(attribute);
        else element.setAttribute(attribute, value);
      }
    };
  }

  private updateTrigger(): void {
    const trigger = this.trigger;
    if (!trigger) return;
    const control: TriggerElement | undefined = shadowFocusTarget(trigger) ?? undefined;
    if (control !== this.triggerControl) {
      this.restoreControl?.();
      this.triggerControl = control;
      this.restoreControl = control && this.saveTriggerAttributes(control);
    }

    trigger.setAttribute('aria-controls', this.host.id);
    const button = control ?? trigger;
    button.setAttribute('aria-haspopup', 'menu');
    button.setAttribute('aria-expanded', String(this.shown));
    if (control) {
      trigger.removeAttribute('aria-haspopup');
      trigger.removeAttribute('aria-expanded');
      if ('ariaControlsElements' in control && control.ariaControlsElements?.[0] !== this.host) {
        control.ariaControlsElements = [this.host];
      }
    }
    if (this.shown) this.labelMenu(trigger);
  }

  private onTriggerFocus = (): void => {
    this.updateTrigger();
  };

  private triggerIsDisabled(event: globalThis.Event): boolean {
    return event
      .composedPath()
      .some(
        (target) =>
          target instanceof HTMLElement &&
          target.matches(':disabled, [disabled], [aria-disabled="true"]'),
      );
  }

  private onTriggerClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || this.triggerIsDisabled(event)) return;
    event.preventDefault();
    if (this.open) this.close(true);
    else this.openAt('first');
  };

  private onTriggerKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.isComposing || this.triggerIsDisabled(event)) return;
    const intent = getVerticalKeyboardIntent(event.key);
    if (intent === 'activate' || intent === 'next' || intent === 'previous') {
      event.preventDefault();
      if (!event.repeat) {
        if (this.open && intent === 'activate') this.close(true);
        else this.openAt(intent === 'previous' ? 'last' : 'first');
      }
    } else if (this.open && intent === 'close') {
      event.preventDefault();
      event.stopPropagation();
      this.close(true);
    }
  };

  private openAt(edge: 'first' | 'last'): void {
    this.open = true;
    if (!this.shown) return;
    if (this.filter) this.filter.focus();
    else this.focusItem(edge);
  }

  private close(restoreFocus = false): void {
    this.open = false;
    if (restoreFocus && this.trigger?.isConnected) focusThroughShadow(this.trigger);
  }

  private show(): void {
    if (!this.trigger || !this.panel || this.shown) return;
    this.itemObserver = new MutationObserver(() => {
      this.refreshItems();
    });
    this.itemObserver.observe(this.host, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['hidden', 'slot'],
    });
    this.shown = true;
    this.refreshItems();
    setOverlayOpen(this.panel, true);
    this.position();

    this.popupEvents = new AbortController();
    const signal = this.popupEvents.signal;
    const root = this.host.getRootNode();
    const doc = this.host.ownerDocument;
    doc.addEventListener('pointerdown', this.onOutsidePointer, { signal });
    if (root instanceof ShadowRoot) {
      root.addEventListener('scroll', this.position, { signal, capture: true });
      if (root.mode === 'closed') {
        root.addEventListener('pointerdown', this.onOutsidePointer, { signal });
      }
    }
    doc.defaultView?.addEventListener('resize', this.position, { signal });
    doc.defaultView?.addEventListener('scroll', this.position, { signal, capture: true });
    this.resize = new ResizeObserver(this.position);
    this.resize.observe(this.panel);
    this.resize.observe(this.trigger);
  }

  private labelMenu(trigger: TriggerElement): void {
    const label = [
      this.host.getAttribute('aria-label'),
      trigger.ariaLabelledByElements?.map((node) => node.textContent).join(' '),
      this.triggerControl?.getAttribute('aria-label'),
      trigger.getAttribute('aria-label'),
      trigger.getAttribute('label'),
      menuItemLabel(trigger),
    ].find((text) => text?.trim());
    if (label) this.list?.setAttribute('aria-label', label);
    else this.list?.removeAttribute('aria-label');
  }

  private onOutsidePointer = (event: globalThis.Event): void => {
    const path = event.composedPath();
    if (!this.trigger || !this.panel || path.includes(this.trigger) || path.includes(this.panel)) {
      return;
    }
    const root = this.host.getRootNode();
    if (
      event.currentTarget === this.host.ownerDocument &&
      root instanceof ShadowRoot &&
      root.mode === 'closed' &&
      path.includes(root.host)
    ) {
      return;
    }
    this.close();
  };

  private position = (): void => {
    const { trigger, panel } = this;
    const view = this.host.ownerDocument.defaultView;
    if (!this.shown || !trigger || !panel || !view) return;
    const { x, y } = resolveOverlayPosition({
      placement: this.placement,
      offset: Number.parseFloat(view.getComputedStyle(panel).paddingBlockStart) || 0,
      dir: view.getComputedStyle(trigger).direction === 'rtl' ? 'rtl' : 'ltr',
      triggerRect: trigger.getBoundingClientRect(),
      popupRect: panel.getBoundingClientRect(),
      viewport: { width: view.innerWidth, height: view.innerHeight },
    });
    panel.style.left = `${String(x)}px`;
    panel.style.top = `${String(y)}px`;
  };

  private hide(): void {
    if (!this.shown) return;
    this.shown = false;
    setOverlayOpen(this.panel, false);
    this.popupEvents?.abort();
    this.resize?.disconnect();
    this.itemObserver?.disconnect();
    this.query = '';
    this.typed = '';
    if (this.filter) this.filter.value = '';
    for (const element of this.filtered) element.removeAttribute('data-menu-filtered');
    for (const separator of this.separators) {
      if (separator.getAttribute('role') === 'separator') separator.removeAttribute('role');
    }
    this.filtered.clear();
    this.separators.clear();
    this.available = [];
  }

  private refreshItems(): void {
    if (!this.shown) return;
    const { items, hidden, separators } = collectMenuItems(this.host, this.query);
    for (const element of this.filtered) {
      if (!hidden.has(element)) element.removeAttribute('data-menu-filtered');
    }
    for (const element of hidden) element.setAttribute('data-menu-filtered', '');
    for (const separator of this.separators) {
      if (!separators.has(separator)) {
        if (separator.getAttribute('role') === 'separator') separator.removeAttribute('role');
        this.separators.delete(separator);
      }
    }
    for (const separator of separators) {
      if (!separator.hasAttribute('role')) {
        separator.setAttribute('role', 'separator');
        this.separators.add(separator);
      }
    }

    this.filtered = hidden;
    this.available = items;
    this.matchCount = items.length;
  }

  private onFilterInput = (event: InputEvent): void => {
    if (event.currentTarget instanceof HTMLInputElement) {
      this.query = event.currentTarget.value;
      this.typed = '';
      this.refreshItems();
    }
  };

  private focusItem(intent: 'next' | 'previous' | 'first' | 'last', current = -1): void {
    const index = menuNavigationIndex(intent, current, this.available.length);
    const row = this.available[index]?.shadowRoot?.querySelector<HTMLButtonElement>('button');
    (row ?? this.list)?.focus();
  }

  @Listen('keydown')
  onPanelKeyDown(event: KeyboardEvent): void {
    const path = event.composedPath();
    if (
      !this.shown ||
      !this.panel ||
      !path.includes(this.panel) ||
      event.defaultPrevented ||
      event.isComposing
    ) {
      return;
    }
    const intent = getVerticalKeyboardIntent(event.key);
    if (intent === 'close') {
      event.preventDefault();
      event.stopPropagation();
      this.close(true);
      return;
    }
    if (event.key === 'Tab') {
      // Native Tab should continue from the trigger, wherever the menu was mounted.
      this.close(true);
      return;
    }

    if (this.filter && path.includes(this.filter)) {
      if (intent === 'next' && this.available.length) {
        event.preventDefault();
        this.focusItem('first');
      }
      return;
    }
    const current = this.available.findIndex((item) => path.includes(item));
    if (isNavigationIntent(intent)) {
      event.preventDefault();
      this.typed = '';
      this.focusItem(intent, current);
    } else if (
      event.key.length === 1 &&
      event.key !== ' ' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      this.typed = extendTypeahead(this.typed, event.key, event.timeStamp - this.lastTypedAt);
      this.lastTypedAt = event.timeStamp;
      const entries = this.available.map((item) => ({ label: menuItemLabel(item) }));
      this.available[typeaheadIndex(entries, this.typed, current)]?.shadowRoot
        ?.querySelector<HTMLButtonElement>('button')
        ?.focus();
    }
  }

  @Listen('click')
  onPanelClick(event: MouseEvent): void {
    const path = event.composedPath();
    if (!this.shown || !this.panel || !path.includes(this.panel)) return;
    const item = this.available.find((entry) => path.includes(entry));
    if (!item || item.disabled || event.defaultPrevented) return;

    const detail: KiMenuSelectDetail = { value: item.value };
    if (item.type === 'checkbox') {
      item.checked = !item.checked;
      detail.checked = item.checked;
    } else if (item.type === 'radio') {
      for (const sibling of item.parentElement?.children ?? []) {
        if (sibling.localName === item.localName && (sibling as MenuItem).type === 'radio') {
          (sibling as MenuItem).checked = sibling === item;
        }
      }
      detail.checked = true;
    }
    if (item.type !== 'checkbox') this.close(true);
    this.selectAction.emit(detail);
  }

  render() {
    return (
      <div
        key="popup"
        part="popup"
        popover="manual"
        ref={(panel) => {
          this.panel = panel;
        }}
      >
        <div key="header" part="header">
          <slot key="header-slot" name="header" />
        </div>
        {this.filterLabel && (
          <div key="filter" class="filter-row">
            <svg
              key="icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path key="handle" d="m21 21-4.34-4.34" />
              <circle key="lens" cx="11" cy="11" r="8" />
            </svg>
            <input
              key="search"
              part="filter"
              type="search"
              aria-label={this.filterLabel}
              placeholder={this.filterLabel}
              autocomplete="off"
              ref={(filter) => {
                this.filter = filter ?? undefined;
              }}
              onInput={this.onFilterInput}
            />
            <span key="status" class="status" role="status" aria-live="polite" aria-atomic="true">
              {this.filterResultsLabel.replace('{count}', String(this.matchCount))}
            </span>
          </div>
        )}
        <div
          key="menu"
          part="menu"
          role="menu"
          hidden={Boolean(this.filterLabel) && this.matchCount === 0}
          tabIndex={-1}
          ref={(list) => {
            this.list = list;
          }}
        >
          <slot key="items" />
        </div>
      </div>
    );
  }
}
