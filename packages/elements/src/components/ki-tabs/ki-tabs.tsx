import { Component, Element, Event, Host, Prop, Watch, h } from '@stencil/core';
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
  private tabRoster: HTMLElement[] = [];
  private panelRoster: HTMLElement[] = [];
  private pairings: PairingRecord[] = [];
  private disabledObserver?: MutationObserver;
  private reconciling = false;

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
    if (typeof MutationObserver === 'function') {
      this.disabledObserver = new MutationObserver(() => {
        this.reconcile(this.value);
      });
    }
  }

  componentDidLoad(): void {
    this.reconcile(this.value);
  }

  disconnectedCallback(): void {
    this.disabledObserver?.disconnect();
  }

  private readonly handleSlotChange = (): void => {
    this.reconcile(this.value);
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

  private reconcile(requestedValue: string): void {
    this.reconciling = true;
    this.stampTabSlots();
    this.readRosters();
    this.observeDisabledTabs();

    const tabRecords = this.tabRecords();
    this.pairings = buildPairing(
      tabRecords,
      this.panelRoster.map((panel) => ({ value: this.elementValue(panel) })),
    );

    const selectedIndex = resolveSelection(tabRecords, requestedValue);
    const selectedTab = selectedIndex === null ? null : (this.tabRoster[selectedIndex] ?? null);
    this.applyStamps(selectedTab);
    this.value = selectedTab ? this.elementValue(selectedTab) : '';
    this.reconciling = false;
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

  private observeDisabledTabs(): void {
    this.disabledObserver?.disconnect();

    for (const tab of this.tabRoster) {
      this.disabledObserver?.observe(tab, { attributes: true, attributeFilter: ['disabled'] });
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
        disabled: tab.hasAttribute('disabled'),
        duplicate,
      };
    });
  }

  private elementValue(element: HTMLElement): string {
    return element.getAttribute('value') ?? '';
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
      tab.setAttribute('aria-disabled', tab.hasAttribute('disabled') ? 'true' : 'false');
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

  private ensureId(element: HTMLElement, prefix: string): void {
    if (!element.id) {
      const ordinal = this.tabRoster.indexOf(element) + this.panelRoster.indexOf(element) + 2;
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
    return this.pairingForTab(tab) !== undefined && !tab.hasAttribute('disabled');
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
      <Host onClick={this.handleClick} onKeyDown={this.handleKeyDown}>
        <div part="tablist" role="tablist" aria-label={this.label}>
          <slot name="tab" onSlotchange={this.handleSlotChange} />
        </div>
        <slot onSlotchange={this.handleSlotChange} />
      </Host>
    );
  }
}
