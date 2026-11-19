import { Component, Element, Event, Host, Prop, Watch, h } from '@stencil/core';
import { childDisabled, childValue } from '../../utils/child-props';
import {
  firstSelectableIndex,
  lastSelectableIndex,
  navigationIntentForKey,
  nextSelectableIndex,
} from './ki-tabs.keyboard';
import {
  buildPairing,
  resolveSelection,
  type PairingRecord,
  type TabRecord,
} from './ki-tabs.selection';

// Local structural type for the Stencil @Event emitter. Declaring it here
// (rather than importing EventEmitter from '@stencil/core') keeps the
// generated .d.ts from referencing '../../stencil-public-runtime', whose
// extensionless import fails node16 ESM type resolution (attw
// InternalResolutionError) — the packaging gate stays honest without a suppression.
interface EventEmitter<T> {
  emit(detail: T): CustomEvent<T>;
}

const TAB_TAG = 'ki-tab';
const PANEL_TAG = 'ki-tab-panel';

let nextId = 0;

/**
 * A tab group for switching between peer content views.
 *
 * @whenToUse switch between small sets of peer views inside the same page,
 * with one visible panel at a time.
 * @whenNotToUse selecting form values
 * (use `ki-radio-group`), page navigation (use links), step flows, or
 * standalone `ki-tab` / `ki-tab-panel` children outside this group.
 *
 * @slot - `ki-tab` and `ki-tab-panel` children. Tabs are auto-assigned to an
 * internal named slot as managed output.
 * @managedSlot tab - The group stamps `slot="tab"` on its `ki-tab` children so
 * the tablist owns them; coordination, not authoring surface (spec 014).
 * @part tablist - Internal strip carrying the `tablist` role.
 */
@Component({
  tag: 'ki-tabs',
  styleUrl: 'ki-tabs.css',
  shadow: true,
})
export class KiTabs {
  @Element() private readonly host!: HTMLElement;

  private readonly instanceId = nextId++;
  private readonly issuedIds = new Map<string, number>();
  private tabRoster: HTMLElement[] = [];
  private panelRoster: HTMLElement[] = [];
  private pairings: PairingRecord[] = [];
  private tabStrip: HTMLElement | undefined;
  // The tab the last reconciliation left selected.
  private selectedTab: HTMLElement | null = null;
  private childObserver?: MutationObserver;
  private reconciling = false;
  private loaded = false;
  // A value requested by attribute or property that no tab owns yet. `value`
  // reads the fallback meanwhile, and the request is honoured when a tab that
  // owns it arrives, loads or takes that value: frameworks and streamed
  // generated UI set the value before the tabs exist, and nobody sets it
  // again. Another value or the user's choice replaces it. Writing the
  // fallback's own value does not: `value` already reads it, so that write is
  // no change and reaches no watcher.
  private pendingValue = '';

  /**
   * Resolved selected value. The attribute declares the initial request;
   * the live property falls back to the first enabled owner tab, or `""`
   * when no tab is selectable. Programmatic writes are silent.
   *
   * @default ''
   */
  @Prop({ mutable: true }) value = '';

  /**
   * Accessible name for the tablist. Always provide one when multiple tab
   * groups may appear in a view. When NOT to use: do not use `label` as a
   * visible heading; render visible context in surrounding content.
   *
   * @default undefined
   */
  @Prop({ reflect: true }) label?: string;

  /**
   * Fired once after a user-driven selection change from pointer or keyboard
   * navigation. `detail.value` is the resolved selected value and `value` is
   * already current when listeners run. Programmatic `value` writes and
   * first-render fallback are silent.
   */
  @Event({ eventName: 'ki-change', bubbles: true, composed: true })
  kiChange!: EventEmitter<{ value: string }>;

  @Watch('value')
  protected valueChanged(): void {
    if (!this.reconciling) {
      this.reconcile(this.value);
    }
  }

  connectedCallback(): void {
    this.childObserver = new MutationObserver(() => {
      this.reconcile();
    });
    // Back in the document after a move (a keyed reorder, a drag between
    // lists): disconnectedCallback released the observer, the tabs may have
    // changed meanwhile, and the group loads only once. On the first
    // connection there is nothing to reconcile yet: componentDidLoad does it.
    if (this.loaded) {
      this.reconcile();
    }
  }

  componentWillLoad(): void {
    // The declared value is a request until a tab owns it: the first
    // reconciliation may run before any tab is there to be asked. A value
    // written between connection and load has already registered itself.
    if (this.pendingValue === '') {
      this.pendingValue = this.value;
    }
  }

  componentDidLoad(): void {
    this.loaded = true;
    this.reconcile();
  }

  disconnectedCallback(): void {
    this.childObserver?.disconnect();
  }

  private readonly setTabStripRef = (strip?: HTMLElement): void => {
    this.tabStrip = strip;
  };

  private readonly handleSlotChange = (): void => {
    this.reconcile();
  };

  private readonly handleClick = (event: MouseEvent): void => {
    const target = this.tabFromEvent(event);

    if (!target || !this.isSelectableTab(target) || target.hasAttribute('selected')) {
      return;
    }

    this.selectTab(target, true);
  };

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const target = this.tabFromEvent(event);
    if (!target) {
      return;
    }

    const dir = this.host.matches(':dir(rtl)') ? 'rtl' : 'ltr';
    const intent = navigationIntentForKey(event.key, dir);
    if (intent === null) {
      return;
    }

    const currentIndex = this.tabRoster.indexOf(target);
    const records = this.tabRecords();
    const nextIndex =
      intent === 'first'
        ? firstSelectableIndex(records)
        : intent === 'last'
          ? lastSelectableIndex(records)
          : nextSelectableIndex(records, currentIndex, intent);

    if (nextIndex === null) {
      return;
    }

    const nextTab = this.tabRoster[nextIndex];
    if (!nextTab) {
      return;
    }

    event.preventDefault();
    this.selectTab(nextTab, true);
    nextTab.focus();
  };

  /**
   * The strip is a scrollport, and a scrollport clips the focus ring a tab
   * draws outside its own box. While a tab shows that ring, the strip gets
   * its reach as room on every side (ki-tabs.css). It is measured from the
   * tab, not assumed: no ring (pointer focus) means no room.
   */
  private readonly handleFocusIn = (event: FocusEvent): void => {
    const tab = this.tabFromEvent(event);
    const strip = this.tabStrip;
    if (!tab || !strip) {
      return;
    }
    const ring = getComputedStyle(tab);
    const reach =
      ring.outlineStyle === 'none'
        ? 0
        : Number.parseFloat(ring.outlineWidth) + Number.parseFloat(ring.outlineOffset);
    strip.style.setProperty('--_ki-tabs-focus-room', `${String(Math.max(reach, 0) || 0)}px`);
    // Keyboard focus brings the tab in together with its ring. Pointer focus
    // does not scroll: the strip must not move under a press still going on.
    if (reach > 0) {
      this.revealTab(tab);
    }
  };

  private readonly handleFocusOut = (): void => {
    this.tabStrip?.style.removeProperty('--_ki-tabs-focus-room');
  };

  private tabFromEvent(event: Event): HTMLElement | null {
    for (const part of event.composedPath()) {
      if (
        part instanceof HTMLElement &&
        part.localName === TAB_TAG &&
        part.parentElement === this.host
      ) {
        return part;
      }
    }

    return null;
  }

  /**
   * Brings selection, pairing and stamps in line with the current children.
   * With a `requestedValue` it answers a new request (the `value` property,
   * the user's choice); without one, the children changed and nobody asked
   * for another tab.
   */
  private reconcile(requestedValue?: string): void {
    this.reconciling = true;
    this.stampTabSlots();
    this.readRosters();
    this.observeChildren();

    const tabRecords = this.tabRecords();
    this.pairings = buildPairing(
      tabRecords,
      this.panelRoster.map((panel) => ({ value: this.elementValue(panel) })),
    );

    const previousTab = this.selectedTab;
    const selectedTab = this.resolveSelectedTab(tabRecords, requestedValue);
    this.selectedTab = selectedTab;
    this.applyStamps(selectedTab);
    this.value = selectedTab ? this.elementValue(selectedTab) : '';
    this.reconciling = false;

    // A selection made by pointer or through `value` brings its tab into
    // view. Only a change does: reconciling an unchanged selection (a tab
    // added, a tab disabled) leaves the strip where the person scrolled it.
    if (selectedTab !== previousTab && selectedTab) {
      this.revealTab(selectedTab);
    }
  }

  private resolveSelectedTab(tabRecords: TabRecord[], requestedValue?: string): HTMLElement | null {
    const owned = (value: string): boolean => tabRecords.some((tab) => tab.value === value);

    if (requestedValue !== undefined) {
      // A new request replaces the one that was waiting.
      this.pendingValue = requestedValue;
    }
    const pendingOwned = this.pendingValue !== '' && owned(this.pendingValue);
    const wanted = requestedValue ?? (pendingOwned ? this.pendingValue : this.value);
    if (pendingOwned) {
      // Settled, whatever comes of it: a tab that owns the value and is
      // disabled yields to the fallback and does not claim the selection
      // later.
      this.pendingValue = '';
    }

    // The children changed and no tab carries the selected value any more,
    // yet the selected tab is still there: its own value was changed. It
    // keeps the selection, and `value` follows it.
    const previousTab = this.selectedTab;
    if (
      requestedValue === undefined &&
      !owned(wanted) &&
      previousTab &&
      this.tabRoster.includes(previousTab) &&
      this.isSelectableTab(previousTab)
    ) {
      return previousTab;
    }

    const selectedIndex = resolveSelection(tabRecords, wanted);
    return selectedIndex === null ? null : (this.tabRoster[selectedIndex] ?? null);
  }

  /**
   * Scrolls the strip, and only the strip, until the tab is whole inside it,
   * clear of the focus-ring room when there is one. Not `scrollIntoView`:
   * that also scrolls the page to a strip that is off screen. The deltas are
   * physical, so they hold in either writing direction.
   */
  private revealTab(tab: HTMLElement): void {
    const strip = this.tabStrip;
    // Nothing to do unless the strip measurably overflows (also covers
    // runtimes with no layout, where both sizes are absent).
    if (!strip || !(strip.scrollWidth > strip.clientWidth)) {
      return;
    }
    const room = Number.parseFloat(getComputedStyle(strip).scrollPaddingInlineStart) || 0;
    const stripBox = strip.getBoundingClientRect();
    const tabBox = tab.getBoundingClientRect();
    const pastLeft = stripBox.left + room - tabBox.left;
    const pastRight = tabBox.right - (stripBox.right - room);
    if (pastLeft > 0) {
      strip.scrollLeft -= pastLeft;
    } else if (pastRight > 0) {
      strip.scrollLeft += pastRight;
    }
  }

  private stampTabSlots(): void {
    for (const child of this.childrenOf(TAB_TAG)) {
      if (child.getAttribute('slot') !== 'tab') {
        child.setAttribute('slot', 'tab');
      }
    }
  }

  private readRosters(): void {
    this.tabRoster = this.childrenOf(TAB_TAG);
    this.panelRoster = this.childrenOf(PANEL_TAG);
  }

  private childrenOf(localName: string): HTMLElement[] {
    return [...this.host.children].filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.localName === localName,
    );
  }

  /**
   * What a child declares and the group resolves against: a tab's `disabled`
   * and `value`, a panel's `value`. Both are reflected, so a property a
   * framework assigns reaches the group here once the child has rendered.
   */
  private observeChildren(): void {
    this.childObserver?.disconnect();

    for (const tab of this.tabRoster) {
      this.childObserver?.observe(tab, { attributeFilter: ['disabled', 'value'] });
    }
    for (const panel of this.panelRoster) {
      this.childObserver?.observe(panel, { attributeFilter: ['value'] });
    }
  }

  private tabRecords(): TabRecord[] {
    const seen = new Set<string>();

    return this.tabRoster.map((tab) => {
      const value = this.elementValue(tab);
      const duplicate = seen.has(value);
      seen.add(value);
      return {
        value,
        disabled: childDisabled(tab),
        duplicate,
      };
    });
  }

  private elementValue(element: HTMLElement): string {
    return childValue(element) ?? '';
  }

  private applyStamps(selectedTab: HTMLElement | null): void {
    const selectedPairing = selectedTab ? this.pairingForTab(selectedTab) : undefined;
    const visiblePanel =
      selectedPairing?.panelIndex === null || selectedPairing?.panelIndex === undefined
        ? null
        : this.panelRoster[selectedPairing.panelIndex];

    this.tabRoster.forEach((tab) => {
      const selected = tab === selectedTab;
      this.setBooleanAttribute(tab, 'selected', selected);
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.setAttribute('aria-disabled', childDisabled(tab) ? 'true' : 'false');
      tab.setAttribute('tabindex', selected ? '0' : '-1');
      this.ensureId(tab, 'ki-tab');

      const pairing = this.pairingForTab(tab);
      if (pairing?.panelIndex === null || pairing?.panelIndex === undefined) {
        tab.removeAttribute('aria-controls');
      } else {
        const panel = this.panelRoster[pairing.panelIndex];
        if (!panel) {
          tab.removeAttribute('aria-controls');
          return;
        }
        this.ensureId(panel, 'ki-tab-panel');
        tab.setAttribute('aria-controls', panel.id);
      }
    });

    if (selectedTab === null) {
      this.tabRoster.forEach((tab) => {
        tab.setAttribute('tabindex', '-1');
      });
    }

    this.panelRoster.forEach((panel) => {
      const visible = panel === visiblePanel;
      this.setBooleanAttribute(panel, 'hidden', !visible);
      this.ensureId(panel, 'ki-tab-panel');
      if (visible) {
        panel.setAttribute('tabindex', '0');
      } else {
        panel.removeAttribute('tabindex');
      }

      const pairing = this.pairingForPanel(panel);
      if (pairing?.tabIndex === null || pairing?.tabIndex === undefined) {
        panel.removeAttribute('aria-labelledby');
      } else {
        const tab = this.tabRoster[pairing.tabIndex];
        if (!tab) {
          panel.removeAttribute('aria-labelledby');
          return;
        }
        this.ensureId(tab, 'ki-tab');
        panel.setAttribute('aria-labelledby', tab.id);
      }
    });
  }

  /**
   * Ids come from a per-group counter that only moves forward, never from the
   * element's position: a position is reused as soon as one tab is removed
   * and another added, and two live elements would share an id.
   */
  private ensureId(element: HTMLElement, prefix: string): void {
    if (!element.id) {
      const ordinal = (this.issuedIds.get(prefix) ?? 0) + 1;
      this.issuedIds.set(prefix, ordinal);
      element.id = `${prefix}-${String(this.instanceId)}-${String(ordinal)}`;
    }
  }

  private setBooleanAttribute(element: HTMLElement, name: string, enabled: boolean): void {
    if (enabled) {
      element.setAttribute(name, '');
    } else {
      element.removeAttribute(name);
    }
  }

  private pairingForTab(tab: HTMLElement): PairingRecord | undefined {
    const index = this.tabRoster.indexOf(tab);
    return this.pairings.find((pairing) => pairing.tabIndex === index);
  }

  private pairingForPanel(panel: HTMLElement): PairingRecord | undefined {
    const index = this.panelRoster.indexOf(panel);
    return this.pairings.find((pairing) => pairing.panelIndex === index);
  }

  private isSelectableTab(tab: HTMLElement): boolean {
    return this.pairingForTab(tab) !== undefined && !childDisabled(tab);
  }

  private selectTab(tab: HTMLElement, emit: boolean): void {
    const previousValue = this.value;
    this.reconcile(this.elementValue(tab));

    if (emit && this.value !== previousValue) {
      this.kiChange.emit({ value: this.value });
    }
  }

  render() {
    return (
      <Host
        onClick={this.handleClick}
        onKeyDown={this.handleKeyDown}
        onFocusin={this.handleFocusIn}
        onFocusout={this.handleFocusOut}
      >
        <div part="tablist" role="tablist" aria-label={this.label}>
          <slot name="tab" ref={this.setTabStripRef} onSlotchange={this.handleSlotChange} />
        </div>
        <slot onSlotchange={this.handleSlotChange} />
      </Host>
    );
  }
}
