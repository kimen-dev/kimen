import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

// @spec:014-ki-tabs
// @spec:113-tabs-variants
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III).
import { defineCustomElement as defineKiTab } from '../dist/components/ki-tab.js';
import { defineCustomElement as defineKiTabPanel } from '../dist/components/ki-tab-panel.js';
import { defineCustomElement as defineKiTabs } from '../dist/components/ki-tabs.js';
import { expectAccessible, parkPointer } from './axe';
import { repaintedUnderForcedDark } from './color-scheme';
import { moveToNewParent } from './reconnect';

type KiTabsElement = HTMLElement & { value: string };
const browserCommands = commands as unknown as {
  ariaSnapshotByRole: (role: 'tablist' | 'tabpanel', name?: string) => Promise<string>;
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateReducedMotion: (reducedMotion: 'reduce' | 'no-preference' | null) => Promise<void>;
};

const STYLE_ID = 'ki-tabs-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-tabs-browser-material3-token-style';

beforeAll(() => {
  defineKiTabs();
  defineKiTab();
  defineKiTabPanel();
});

afterEach(async () => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
  await parkPointer();
});

function ensureTokens(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = tokensCss;
  document.head.append(style);
}

function ensureMaterial3Tokens(): void {
  if (document.getElementById(MATERIAL3_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = MATERIAL3_STYLE_ID;
  style.textContent = material3Css;
  document.head.append(style);
}

async function waitForRender(el: HTMLElement): Promise<void> {
  const deadline = Date.now() + 1000;
  while (!el.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function mount(markup: string): Promise<KiTabsElement> {
  ensureTokens();
  const main = document.createElement('main');
  main.innerHTML = markup;
  document.body.append(main);
  const tabs = main.querySelector('ki-tabs');
  if (tabs === null) {
    throw new Error('Missing ki-tabs fixture');
  }
  await customElements.whenDefined('ki-tabs');
  await customElements.whenDefined('ki-tab');
  await customElements.whenDefined('ki-tab-panel');
  await waitForRender(tabs);
  return tabs;
}

function fixture(value = 'email'): string {
  return `
    <ki-tabs label="Settings" value="${value}">
      <ki-tab value="email">Email</ki-tab>
      <ki-tab value="notifications">Notifications</ki-tab>
      <ki-tab value="billing" disabled>Billing</ki-tab>
      <ki-tab-panel value="email">Email panel</ki-tab-panel>
      <ki-tab-panel value="notifications">Notifications panel</ki-tab-panel>
      <ki-tab-panel value="billing">Billing panel</ki-tab-panel>
    </ki-tabs>
  `;
}

function tab(tabs: KiTabsElement, value: string): HTMLElement {
  const el = tabs.querySelector(`ki-tab[value="${value}"]`);
  if (el === null) {
    throw new Error(`Missing tab ${value}`);
  }
  return el as HTMLElement;
}

function panel(tabs: KiTabsElement, value: string): HTMLElement {
  const el = tabs.querySelector(`ki-tab-panel[value="${value}"]`);
  if (el === null) {
    throw new Error(`Missing panel ${value}`);
  }
  return el as HTMLElement;
}

function main(): HTMLElement {
  const el = document.querySelector('main');
  if (el === null) {
    throw new Error('Missing main fixture');
  }
  return el;
}

type ValueElement = HTMLElement & { value: string };

/** A tab and its panel whose value is assigned as a property, as framework wrappers do. */
function propertyPair(value: string): { tab: ValueElement; panel: ValueElement } {
  return {
    tab: Object.assign(document.createElement('ki-tab'), {
      value,
      textContent: `Tab ${value}`,
    }),
    panel: Object.assign(document.createElement('ki-tab-panel'), {
      value,
      textContent: `Panel ${value}`,
    }),
  };
}

/** Whether the tab names this panel as the one it controls, and the panel names the tab. */
function paired(pair: { tab: ValueElement; panel: ValueElement }): boolean {
  return (
    pair.panel.id !== '' &&
    pair.tab.id !== '' &&
    pair.tab.getAttribute('aria-controls') === pair.panel.id &&
    pair.panel.getAttribute('aria-labelledby') === pair.tab.id
  );
}

/** A group whose own value, and its children's, are properties set before insertion. */
function propertyGroup(
  requested: string,
  values: string[],
): { tabs: KiTabsElement; pairs: { tab: ValueElement; panel: ValueElement }[] } {
  ensureTokens();
  const tabs = Object.assign(document.createElement('ki-tabs'), {
    label: 'Settings',
    value: requested,
  }) as KiTabsElement;
  const pairs = values.map(propertyPair);
  tabs.append(...pairs.map((pair) => pair.tab), ...pairs.map((pair) => pair.panel));
  const main = document.createElement('main');
  main.append(tabs);
  document.body.append(main);
  return { tabs, pairs };
}

function firstEvent(spy: ReturnType<typeof vi.fn>): CustomEvent<{ value: string }> {
  const call = spy.mock.calls[0];
  if (!call) {
    throw new Error('Missing event call');
  }
  return call[0] as CustomEvent<{ value: string }>;
}

describe('ki-tabs core behavior in a real browser', () => {
  it('S1 selecting a tab reveals its panel and emits one current ki-change', async () => {
    const tabs = await mount(fixture());
    const onChange = vi.fn();
    tabs.addEventListener('ki-change', onChange);

    await userEvent.click(tab(tabs, 'notifications'));

    expect(tabs.value).toBe('notifications');
    expect(tab(tabs, 'notifications').hasAttribute('selected')).toBe(true);
    expect(panel(tabs, 'notifications').hasAttribute('hidden')).toBe(false);
    expect(panel(tabs, 'email').hasAttribute('hidden')).toBe(true);
    expect(onChange).toHaveBeenCalledTimes(1);
    const event = firstEvent(onChange);
    expect(event.detail.value).toBe('notifications');
    expect(tabs.value).toBe('notifications');
  });

  it('S2 disabled and already-selected tabs are inert and silent', async () => {
    const tabs = await mount(fixture());
    const onChange = vi.fn();
    tabs.addEventListener('ki-change', onChange);

    tab(tabs, 'billing').click();
    tab(tabs, 'email').click();

    expect(tabs.value).toBe('email');
    expect(panel(tabs, 'billing').hasAttribute('hidden')).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('S3 falls back from an unknown value to the first non-disabled tab', async () => {
    const tabs = await mount(fixture('missing'));

    expect(tabs.value).toBe('email');
    expect(tab(tabs, 'email').hasAttribute('selected')).toBe(true);
    expect(panel(tabs, 'email').hasAttribute('hidden')).toBe(false);
  });

  it('S12 skips a disabled owner during initial fallback', async () => {
    const tabs = await mount(`
      <ki-tabs value="email">
        <ki-tab value="email" disabled>Email</ki-tab>
        <ki-tab value="notifications">Notifications</ki-tab>
        <ki-tab-panel value="email">Email panel</ki-tab-panel>
        <ki-tab-panel value="notifications">Notifications panel</ki-tab-panel>
      </ki-tabs>
    `);

    expect(tabs.value).toBe('notifications');
    expect(panel(tabs, 'notifications').hasAttribute('hidden')).toBe(false);
  });

  it('S18 all-disabled groups select nothing and show no panel', async () => {
    const tabs = await mount(`
      <ki-tabs value="email">
        <ki-tab value="email" disabled>Email</ki-tab>
        <ki-tab value="notifications" disabled>Notifications</ki-tab>
        <ki-tab-panel value="email">Email panel</ki-tab-panel>
        <ki-tab-panel value="notifications">Notifications panel</ki-tab-panel>
      </ki-tabs>
    `);

    expect(tabs.value).toBe('');
    expect([...tabs.querySelectorAll('ki-tab[selected]')]).toHaveLength(0);
    expect([...tabs.querySelectorAll('ki-tab-panel:not([hidden])')]).toHaveLength(0);
  });

  it('S1 overwrites authored selected and programmatic value writes are silent', async () => {
    const tabs = await mount(`
      <ki-tabs value="notifications">
        <ki-tab value="email" selected>Email</ki-tab>
        <ki-tab value="notifications">Notifications</ki-tab>
        <ki-tab-panel value="email">Email panel</ki-tab-panel>
        <ki-tab-panel value="notifications">Notifications panel</ki-tab-panel>
      </ki-tabs>
    `);
    const onChange = vi.fn();
    tabs.addEventListener('ki-change', onChange);

    expect(tab(tabs, 'email').hasAttribute('selected')).toBe(false);
    expect(tab(tabs, 'notifications').hasAttribute('selected')).toBe(true);

    tabs.value = 'email';
    await waitForRender(tabs);

    expect(tabs.value).toBe('email');
    expect(panel(tabs, 'email').hasAttribute('hidden')).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('S3 keeps malformed composition non-fatal with orphan and duplicate values', async () => {
    const tabs = await mount(`
      <ki-tabs value="orphan-tab">
        <ki-tab value="orphan-tab">Orphan tab</ki-tab>
        <ki-tab value="email">Email</ki-tab>
        <ki-tab value="email">Duplicate email</ki-tab>
        <ki-tab-panel value="email">Email panel</ki-tab-panel>
        <ki-tab-panel value="orphan-panel">Orphan panel</ki-tab-panel>
      </ki-tabs>
    `);

    expect(tabs.value).toBe('orphan-tab');
    expect(
      [...tabs.querySelectorAll('ki-tab[selected]')].map((el) => el.textContent.trim()),
    ).toEqual(['Orphan tab']);
    expect([...tabs.querySelectorAll('ki-tab-panel:not([hidden])')]).toHaveLength(0);

    await userEvent.click(page.getByText('Duplicate email'));

    expect(tabs.value).toBe('orphan-tab');
    expect(panel(tabs, 'orphan-panel').hasAttribute('hidden')).toBe(true);
  });
});

describe('ki-tabs built and updated through properties', () => {
  it('S1 a group built from properties before it is inserted selects the requested tab', async () => {
    // What @kimen/react does: every prop is assigned as a property, on the
    // tabs and panels too, and the finished tree is inserted at once.
    const { tabs, pairs } = propertyGroup('q', ['p', 'q', 'r']);
    await waitForRender(tabs);

    await expect
      .poll(() => pairs.map((pair) => pair.tab.hasAttribute('selected')))
      .toEqual([false, true, false]);
    expect(tabs.value).toBe('q');
    expect(pairs.map((pair) => pair.panel.hasAttribute('hidden'))).toEqual([true, false, true]);
    expect(pairs.map(paired)).toEqual([true, true, true]);
  });

  it('S7 S8 tabs inserted first and given their value right after are each paired with their own panel', async () => {
    const tabs = await mount(fixture());
    // What a framework wrapper does on an update: the new children are
    // inserted, tabs before the panels, and their props are assigned after.
    const added = ['x', 'y'].map((value) => ({
      value,
      tab: document.createElement('ki-tab'),
      panel: document.createElement('ki-tab-panel'),
    }));
    for (const pair of added) {
      panel(tabs, 'email').before(pair.tab);
      tabs.append(pair.panel);
    }
    for (const pair of added) {
      pair.tab.textContent = `Tab ${pair.value}`;
      pair.tab.value = pair.value;
      pair.panel.textContent = `Panel ${pair.value}`;
      pair.panel.value = pair.value;
    }

    await expect.poll(() => added.map(paired)).toEqual([true, true]);
    tabs.value = 'y';
    await expect.poll(() => added[1]?.panel.hasAttribute('hidden')).toBe(false);
    expect(tabs.value).toBe('y');
  });

  it('S3 a requested value that no tab owns yet is honoured when its tab arrives', async () => {
    // Async lists: the value is set once, the tabs render later, and nobody
    // sets the value again.
    const { tabs } = propertyGroup('q', ['p']);
    await waitForRender(tabs);
    await expect.poll(() => tabs.value).toBe('p');

    const late = propertyPair('q');
    tabs.append(late.tab, late.panel);

    await expect.poll(() => late.tab.hasAttribute('selected')).toBe(true);
    expect(tabs.value).toBe('q');
    expect(late.panel.hasAttribute('hidden')).toBe(false);
  });

  it('S1 a tab the user selected is not displaced by a late tab that owns an earlier request', async () => {
    const { tabs, pairs } = propertyGroup('q', ['p', 'r']);
    await waitForRender(tabs);
    await expect.poll(() => tabs.value).toBe('p');
    const chosen = pairs[1];
    if (!chosen) {
      throw new Error('missing tab');
    }
    await userEvent.click(chosen.tab);
    expect(tabs.value).toBe('r');

    const late = propertyPair('q');
    tabs.append(late.tab, late.panel);

    await expect.poll(() => paired(late)).toBe(true);
    expect(tabs.value).toBe('r');
    expect(late.tab.hasAttribute('selected')).toBe(false);
  });

  it('S1 a tab and its panel renamed through their value property can be selected by the new value at once', async () => {
    const { tabs, pairs } = propertyGroup('p', ['p', 'q']);
    await waitForRender(tabs);
    await expect.poll(() => tabs.value).toBe('p');
    const renamed = pairs[1];
    if (!renamed) {
      throw new Error('missing tab');
    }

    // One framework commit: the children's props first, then the group's.
    renamed.tab.value = 'z';
    renamed.panel.value = 'z';
    tabs.value = 'z';

    await expect.poll(() => renamed.panel.hasAttribute('hidden')).toBe(false);
    expect(tabs.value).toBe('z');
    expect(renamed.tab.hasAttribute('selected')).toBe(true);
  });

  it('S8 a tab whose value changes away from its panel stops claiming to control it', async () => {
    const { tabs, pairs } = propertyGroup('p', ['p', 'q']);
    await waitForRender(tabs);
    const renamed = pairs[1];
    if (!renamed) {
      throw new Error('missing tab');
    }
    await expect.poll(() => paired(renamed)).toBe(true);

    renamed.tab.value = 'z';

    await expect.poll(() => renamed.tab.hasAttribute('aria-controls')).toBe(false);
    expect(renamed.panel.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('S1 the selected tab keeps the selection when its value is renamed', async () => {
    const { tabs, pairs } = propertyGroup('q', ['p', 'q']);
    await waitForRender(tabs);
    await expect.poll(() => tabs.value).toBe('q');
    const selected = pairs[1];
    if (!selected) {
      throw new Error('missing tab');
    }

    selected.tab.value = 'z';
    selected.panel.value = 'z';

    await expect.poll(() => tabs.value).toBe('z');
    expect(selected.tab.hasAttribute('selected')).toBe(true);
    expect(selected.panel.hasAttribute('hidden')).toBe(false);
  });
});

// A definition loaded before the body (a classic script in the head) makes
// the parser upgrade the group at its start tag, before any child exists; a
// document that arrives in chunks gives the group time to load meanwhile.
// The children then come in source order, attributes and all.
describe('ki-tabs defined before the parser reaches its children', () => {
  function parsedChild(localName: 'ki-tab' | 'ki-tab-panel', value: string): HTMLElement {
    const child = document.createElement(localName);
    child.setAttribute('value', value);
    child.textContent = localName === 'ki-tab' ? `Tab ${value}` : `Panel ${value}`;
    return child;
  }

  async function loadedEmptyGroup(value: string): Promise<KiTabsElement> {
    ensureTokens();
    const tabs = document.createElement('ki-tabs') as KiTabsElement;
    tabs.setAttribute('label', 'Settings');
    tabs.setAttribute('value', value);
    const main = document.createElement('main');
    main.append(tabs);
    document.body.append(main);
    await waitForRender(tabs);
    return tabs;
  }

  it('S1 selects the tab its value attribute declares once the tabs are parsed', async () => {
    const tabs = await loadedEmptyGroup('q');
    const onChange = vi.fn();
    tabs.addEventListener('ki-change', onChange);

    // The first tab arrives in one chunk, the rest in the next one.
    tabs.append(parsedChild('ki-tab', 'p'));
    await waitForRender(tabs);
    tabs.append(
      parsedChild('ki-tab', 'q'),
      parsedChild('ki-tab', 'r'),
      parsedChild('ki-tab-panel', 'p'),
      parsedChild('ki-tab-panel', 'q'),
      parsedChild('ki-tab-panel', 'r'),
    );

    await expect.poll(() => tab(tabs, 'q').hasAttribute('selected')).toBe(true);
    expect(tabs.value).toBe('q');
    expect([...tabs.querySelectorAll('ki-tab[selected]')]).toHaveLength(1);
    expect(panel(tabs, 'q').hasAttribute('hidden')).toBe(false);
    expect(panel(tabs, 'p').hasAttribute('hidden')).toBe(true);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('S3 still falls back to the first tab when the declared value names none of them', async () => {
    const tabs = await loadedEmptyGroup('missing');

    tabs.append(
      parsedChild('ki-tab', 'p'),
      parsedChild('ki-tab', 'q'),
      parsedChild('ki-tab-panel', 'p'),
      parsedChild('ki-tab-panel', 'q'),
    );

    await expect.poll(() => tab(tabs, 'p').hasAttribute('selected')).toBe(true);
    expect(tabs.value).toBe('p');
    expect(panel(tabs, 'p').hasAttribute('hidden')).toBe(false);
  });
});

describe('ki-tabs moved to another parent', () => {
  it('S2 a tab disabled after the move gives up the selection', async () => {
    const tabs = await mount(fixture('notifications'));
    moveToNewParent(tabs);

    tab(tabs, 'notifications').setAttribute('disabled', '');

    await expect.poll(() => tabs.value).toBe('email');
    expect(tab(tabs, 'notifications').hasAttribute('selected')).toBe(false);
    expect(panel(tabs, 'email').hasAttribute('hidden')).toBe(false);
  });

  it('S2 a tab disabled while the group was out of the document is not selected when it returns', async () => {
    const tabs = await mount(fixture('notifications'));

    tabs.remove();
    tab(tabs, 'notifications').setAttribute('disabled', '');
    main().append(tabs);

    await expect.poll(() => tabs.value).toBe('email');
    expect(tab(tabs, 'notifications').hasAttribute('selected')).toBe(false);
  });

  it('S1 pointer and keyboard still select after the move', async () => {
    const tabs = await mount(fixture());
    moveToNewParent(tabs);
    const onChange = vi.fn();
    tabs.addEventListener('ki-change', onChange);

    await userEvent.click(page.getByRole('tab', { name: 'Notifications' }));
    expect(tabs.value).toBe('notifications');
    await userEvent.keyboard('{ArrowLeft}');

    expect(tabs.value).toBe('email');
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

describe('ki-tabs assistive technology outcomes in a real browser', () => {
  it('S7 exposes a named tab list with named selected and disabled tabs', async () => {
    await mount(fixture());

    const snapshot = await browserCommands.ariaSnapshotByRole('tablist', 'Settings');

    expect(snapshot).toContain('tablist "Settings"');
    expect(snapshot).toContain('tab "Email"');
    expect(snapshot).toContain('selected');
    expect(snapshot).toContain('tab "Notifications"');
    expect(snapshot).toContain('tab "Billing"');
    expect(snapshot).toContain('disabled');
    expect(snapshot).not.toContain('tabpanel');
  });

  it('S8 exposes the visible panel as a tabpanel named after its tab', async () => {
    await mount(fixture());

    const snapshot = await browserCommands.ariaSnapshot('main');

    expect(snapshot).toContain('tabpanel "Email"');
  });

  // Ids used to be derived from the element's position in the list, so a tab
  // added after an earlier one was removed reused a live id and the
  // tab/panel references crossed.
  it('S7 S8 keeps ids unique and each tab paired with its panel when tabs are removed and added', async () => {
    const tabs = await mount(`
      <ki-tabs label="Settings" value="b">
        <ki-tab value="a">Alpha</ki-tab>
        <ki-tab value="b">Bravo</ki-tab>
        <ki-tab value="c">Charlie</ki-tab>
        <ki-tab-panel value="a">Alpha panel</ki-tab-panel>
        <ki-tab-panel value="b">Bravo panel</ki-tab-panel>
        <ki-tab-panel value="c">Charlie panel</ki-tab-panel>
      </ki-tabs>
    `);
    const stableIds = [
      tab(tabs, 'b').id,
      tab(tabs, 'c').id,
      panel(tabs, 'b').id,
      panel(tabs, 'c').id,
    ];

    tab(tabs, 'a').remove();
    panel(tabs, 'a').remove();
    const delta = document.createElement('ki-tab');
    delta.setAttribute('value', 'd');
    delta.textContent = 'Delta';
    const deltaPanel = document.createElement('ki-tab-panel');
    deltaPanel.setAttribute('value', 'd');
    deltaPanel.textContent = 'Delta panel';
    tabs.append(delta, deltaPanel);
    await expect.poll(() => delta.getAttribute('aria-controls')).not.toBeNull();

    const ids = [...tabs.querySelectorAll('ki-tab, ki-tab-panel')].map((el) => el.id);
    expect(ids).toHaveLength(6);
    expect(new Set(ids).size).toBe(6);
    expect([
      tab(tabs, 'b').id,
      tab(tabs, 'c').id,
      panel(tabs, 'b').id,
      panel(tabs, 'c').id,
    ]).toEqual(stableIds);
    for (const value of ['b', 'c', 'd']) {
      expect(tab(tabs, value).getAttribute('aria-controls')).toBe(panel(tabs, value).id);
      expect(panel(tabs, value).getAttribute('aria-labelledby')).toBe(tab(tabs, value).id);
    }

    // What assistive technology gets: the new panel is named after its own tab.
    tabs.value = 'd';
    await expect.poll(() => panel(tabs, 'd').hasAttribute('hidden')).toBe(false);
    expect(await browserCommands.ariaSnapshot('main')).toContain('tabpanel "Delta"');
  });

  it('S7 S8 has zero axe violations across selected and disabled states', async () => {
    const tabs = await mount(fixture());

    await expectAccessible(main());

    await userEvent.click(tab(tabs, 'notifications'));

    await expectAccessible(main());
  });
});

describe('ki-tabs keyboard behavior in a real browser', () => {
  it('S4 ArrowRight focuses and selects the next tab with one ki-change', async () => {
    const tabs = await mount(fixture());
    const onChange = vi.fn();
    tabs.addEventListener('ki-change', onChange);
    tab(tabs, 'email').focus();

    await userEvent.keyboard('{ArrowRight}');

    expect(document.activeElement).toBe(tab(tabs, 'notifications'));
    expect(tabs.value).toBe('notifications');
    expect(panel(tabs, 'notifications').hasAttribute('hidden')).toBe(false);
    expect(getComputedStyle(tab(tabs, 'notifications')).outlineStyle).not.toBe('none');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('S13 wraps past a disabled first tab to the next selectable tab', async () => {
    const tabs = await mount(`
      <ki-tabs value="security">
        <ki-tab value="email" disabled>Email</ki-tab>
        <ki-tab value="notifications">Notifications</ki-tab>
        <ki-tab value="security">Security</ki-tab>
        <ki-tab-panel value="email">Email panel</ki-tab-panel>
        <ki-tab-panel value="notifications">Notifications panel</ki-tab-panel>
        <ki-tab-panel value="security">Security panel</ki-tab-panel>
      </ki-tabs>
    `);
    tab(tabs, 'security').focus();

    await userEvent.keyboard('{ArrowRight}');

    expect(document.activeElement).toBe(tab(tabs, 'notifications'));
    expect(tabs.value).toBe('notifications');
  });

  it('S5 S14 End and Home jump to the last and first selectable tabs', async () => {
    const tabs = await mount(`
      <ki-tabs value="email">
        <ki-tab value="email">Email</ki-tab>
        <ki-tab value="notifications">Notifications</ki-tab>
        <ki-tab value="security">Security</ki-tab>
        <ki-tab-panel value="email">Email panel</ki-tab-panel>
        <ki-tab-panel value="notifications">Notifications panel</ki-tab-panel>
        <ki-tab-panel value="security">Security panel</ki-tab-panel>
      </ki-tabs>
    `);
    tab(tabs, 'email').focus();

    await userEvent.keyboard('{End}');
    expect(document.activeElement).toBe(tab(tabs, 'security'));
    expect(tabs.value).toBe('security');

    await userEvent.keyboard('{Home}');
    expect(document.activeElement).toBe(tab(tabs, 'email'));
    expect(tabs.value).toBe('email');
  });

  it('S6 S15 Tab leaves the strip into the visible panel itself', async () => {
    const tabs = await mount(fixture());
    tab(tabs, 'email').focus();

    await userEvent.tab();

    expect(document.activeElement).toBe(panel(tabs, 'email'));
  });

  it('S16 ArrowLeft moves to the next tab in right-to-left direction', async () => {
    document.documentElement.dir = 'rtl';
    const tabs = await mount(fixture());
    tab(tabs, 'email').focus();

    await userEvent.keyboard('{ArrowLeft}');

    expect(document.activeElement).toBe(tab(tabs, 'notifications'));
    expect(tabs.value).toBe('notifications');
  });

  it('S18 all-disabled groups contribute no keyboard tab stop', async () => {
    const before = document.createElement('button');
    const after = document.createElement('button');
    before.tabIndex = 0;
    after.tabIndex = 0;
    before.textContent = 'Before';
    after.textContent = 'After';
    document.body.append(before);
    const tabs = await mount(`
      <ki-tabs value="email">
        <ki-tab value="email" disabled>Email</ki-tab>
        <ki-tab value="notifications" disabled>Notifications</ki-tab>
        <ki-tab-panel value="email">Email panel</ki-tab-panel>
        <ki-tab-panel value="notifications">Notifications panel</ki-tab-panel>
      </ki-tabs>
    `);
    tabs.parentElement?.after(after);
    before.focus();

    await userEvent.tab();

    expect(document.activeElement).toBe(after);
  });
});

// WCAG 1.4.10 (reflow at 320 CSS px): more tabs than fit must scroll inside
// the strip, never widen the page, and stay reachable by keyboard and pointer.
describe('ki-tabs narrow viewport behavior in a real browser', () => {
  function sixTabs(): string {
    const values = ['a', 'b', 'c', 'd', 'e', 'f'];
    return `
      <ki-tabs label="Settings" value="a">
        ${values.map((value) => `<ki-tab value="${value}">Notifications ${value}</ki-tab>`).join('')}
        ${values.map((value) => `<ki-tab-panel value="${value}">Panel ${value}</ki-tab-panel>`).join('')}
      </ki-tabs>
    `;
  }

  /**
   * Whole tab inside the tab group's own box, which itself fits the page.
   * One pixel of slack: scroll offsets are whole pixels while tab widths are
   * not, so a tab scrolled flush to an edge can sit a fraction past it.
   */
  function inView(tabs: KiTabsElement, value: string): boolean {
    const box = tab(tabs, value).getBoundingClientRect();
    const group = tabs.getBoundingClientRect();
    return box.left >= group.left - 1 && box.right <= group.right + 1;
  }

  /** The box that clips the strip: the nearest scroll container around the tabs. */
  function scrollportOf(tabs: KiTabsElement): HTMLElement {
    let el: HTMLElement | null = tab(tabs, 'a').assignedSlot;
    while (el !== null && getComputedStyle(el).overflowX === 'visible') {
      el = el.parentElement;
    }
    if (el === null) {
      throw new Error('the tab strip is not a scroll container');
    }
    return el;
  }

  async function narrow(run: () => Promise<void>): Promise<void> {
    await page.viewport(320, 640);
    try {
      await run();
    } finally {
      await page.viewport(414, 896);
    }
  }

  it('S4 S5 S14 six tabs scroll inside the strip and keyboard focus stays in view', async () => {
    await narrow(async () => {
      const tabs = await mount(sixTabs());

      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
      expect(tabs.getBoundingClientRect().right).toBeLessThanOrEqual(window.innerWidth);
      expect(inView(tabs, 'a')).toBe(true);
      expect(inView(tabs, 'f')).toBe(false);

      tab(tabs, 'a').focus();
      await userEvent.keyboard('{End}');
      expect(document.activeElement).toBe(tab(tabs, 'f'));
      expect(tabs.value).toBe('f');
      await expect.poll(() => inView(tabs, 'f')).toBe(true);
      expect(inView(tabs, 'a')).toBe(false);

      await userEvent.keyboard('{Home}');
      expect(document.activeElement).toBe(tab(tabs, 'a'));
      await expect.poll(() => inView(tabs, 'a')).toBe(true);

      await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
      expect(document.activeElement).toBe(tab(tabs, 'd'));
      expect(tabs.value).toBe('d');
      await expect.poll(() => inView(tabs, 'd')).toBe(true);

      // Only the strip moved: the page never gained a horizontal scroll.
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
      expect(window.scrollX).toBe(0);
      await expectAccessible(main());
    });
  });

  it('S1 a tab selected by value or by pointer is brought fully into view', async () => {
    await narrow(async () => {
      const tabs = await mount(sixTabs());

      tabs.value = 'f';
      await expect.poll(() => inView(tabs, 'f')).toBe(true);
      tabs.value = 'a';
      await expect.poll(() => inView(tabs, 'a')).toBe(true);

      // Leave the first tab that does not fit cut in half by the edge of the
      // strip: a press on its visible half selects it and scrolls the rest in.
      const cutValue = ['b', 'c', 'd', 'e', 'f'].find((value) => !inView(tabs, value)) ?? 'f';
      const cut = tab(tabs, cutValue);
      const cutBox = cut.getBoundingClientRect();
      scrollportOf(tabs).scrollLeft +=
        cutBox.left + cutBox.width / 2 - tabs.getBoundingClientRect().right;
      expect(inView(tabs, cutValue)).toBe(false);

      await userEvent.click(cut, { position: { x: 4, y: 12 } });

      expect(tabs.value).toBe(cutValue);
      await expect.poll(() => inView(tabs, cutValue)).toBe(true);
      expect(window.scrollX).toBe(0);
    });
  });

  it('S11 six tabs scroll inside the strip from the right edge under RTL', async () => {
    await narrow(async () => {
      document.documentElement.dir = 'rtl';
      const tabs = await mount(sixTabs());

      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
      expect(inView(tabs, 'a')).toBe(true);
      expect(inView(tabs, 'f')).toBe(false);

      tabs.value = 'f';
      await expect.poll(() => inView(tabs, 'f')).toBe(true);
      tab(tabs, 'f').focus();
      await userEvent.keyboard('{Home}');
      expect(document.activeElement).toBe(tab(tabs, 'a'));
      await expect.poll(() => inView(tabs, 'a')).toBe(true);
    });
  });

  it.each(['ltr', 'rtl'])(
    'S11 a strip flush with the page edges adds no page overflow under %s',
    async (dir) => {
      await narrow(async () => {
        document.body.style.margin = '0';
        try {
          document.documentElement.dir = dir;
          const tabs = await mount(sixTabs());

          expect(tabs.getBoundingClientRect().width).toBe(window.innerWidth);
          expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
        } finally {
          document.body.style.margin = '';
        }
      });
    },
  );

  // The room the strip takes for a focus ring must not sit on top of its
  // neighbours when no ring is drawn: a control flush above the group keeps
  // its whole hit area, at rest and after a pointer press on a tab, and
  // keyboard focus (when that room appears) moves nothing.
  it('S4 the strip takes no pointer area from a control flush above it and focus moves no tab', async () => {
    await narrow(async () => {
      const tabs = await mount(sixTabs());
      const above = document.createElement('button');
      above.textContent = 'Above';
      above.style.display = 'block';
      above.style.margin = '0';
      tabs.before(above);
      const aboveBox = above.getBoundingClientRect();
      expect(tabs.getBoundingClientRect().top).toBe(aboveBox.bottom);

      // The control still owns its last pixel rows: nothing of the group lies
      // over them. (Hit-tested in page coordinates; a pointer click by offset
      // would depend on the scale the runner gives the test frame.)
      expect(document.elementFromPoint(aboveBox.left + 12, aboveBox.bottom - 2)).toBe(above);
      await userEvent.click(tab(tabs, 'b'));
      expect(document.activeElement).toBe(tab(tabs, 'b'));
      expect(document.elementFromPoint(aboveBox.left + 12, aboveBox.bottom - 2)).toBe(above);

      const resting = tab(tabs, 'b').getBoundingClientRect();
      above.focus();
      await userEvent.keyboard('{Tab}');
      expect(document.activeElement).toBe(tab(tabs, 'b'));
      const focused = tab(tabs, 'b').getBoundingClientRect();
      expect([focused.left, focused.top, focused.width]).toEqual([
        resting.left,
        resting.top,
        resting.width,
      ]);
    });
  });

  it.each([
    ['first', 'a', '{Home}', 'ltr'],
    ['last', 'f', '{End}', 'ltr'],
    ['first', 'a', '{Home}', 'rtl'],
    ['last', 'f', '{End}', 'rtl'],
  ])(
    'S4 the focus ring of the %s tab (%s, %s) fits inside the strip under %s',
    async (_position, value, key, dir) => {
      await narrow(async () => {
        document.documentElement.dir = dir;
        const tabs = await mount(sixTabs());
        tab(tabs, 'c').focus();

        await userEvent.keyboard(key);
        await expect.poll(() => inView(tabs, value)).toBe(true);

        const focused = tab(tabs, value);
        const style = getComputedStyle(focused);
        const ring = Number.parseFloat(style.outlineWidth) + Number.parseFloat(style.outlineOffset);
        const box = focused.getBoundingClientRect();
        const clip = scrollportOf(tabs).getBoundingClientRect();
        expect(ring).toBeGreaterThan(0);
        expect(box.left - ring).toBeGreaterThanOrEqual(clip.left - 0.5);
        expect(box.right + ring).toBeLessThanOrEqual(clip.right + 0.5);
        expect(box.top - ring).toBeGreaterThanOrEqual(clip.top - 0.5);
        expect(box.bottom + ring).toBeLessThanOrEqual(clip.bottom + 0.5);
        expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
      });
    },
  );
});

describe('ki-tabs theming behavior in a real browser', () => {
  it('S10 honors a forced dark scheme: the tabs and the visible panel repaint', async () => {
    const tabs = await mount(fixture());

    expect(await repaintedUnderForcedDark(tabs)).toEqual(expect.arrayContaining(['tab', 'panel']));
  });

  it('S9 material3 repaints the tabs and their indicator with unchanged markup', async () => {
    const tabs = await mount(fixture());
    const email = tab(tabs, 'email');
    const indicator = (): HTMLElement => {
      const part = email.shadowRoot?.querySelector<HTMLElement>('[part="indicator"]');
      if (!part) {
        throw new Error('the selected tab paints no indicator');
      }
      return part;
    };
    const gapBetweenTabs = (): number =>
      tab(tabs, 'notifications').getBoundingClientRect().left - email.getBoundingClientRect().right;
    const markup = tabs.outerHTML;
    const onmarsColor = getComputedStyle(email).color;
    const onmarsIndicator = getComputedStyle(indicator()).backgroundColor;
    const onmarsGap = gapBetweenTabs();

    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Poll the paint: the fidelity pass transitions the tab foreground, so
    // one frame after the theme flip it still reads the onmars value it is
    // tweening away from.
    await expect.poll(() => getComputedStyle(email).color).not.toBe(onmarsColor);
    await expect
      .poll(() => getComputedStyle(indicator()).backgroundColor)
      .not.toBe(onmarsIndicator);
    // material3 lays its tabs flush; onmars spaces them apart.
    expect(gapBetweenTabs()).not.toBe(onmarsGap);
    expect(tabs.outerHTML).toBe(markup);
  });

  it('S11 lays out the first tab from the right in RTL', async () => {
    document.documentElement.dir = 'rtl';
    const tabs = await mount(fixture());
    const emailBox = tab(tabs, 'email').getBoundingClientRect();
    const notificationsBox = tab(tabs, 'notifications').getBoundingClientRect();

    expect(emailBox.right).toBeGreaterThan(notificationsBox.right);
  });

  it('S17 runs the gated micro-motion only when motion is allowed', async () => {
    await browserCommands.emulateReducedMotion('no-preference');
    try {
      const tabs = await mount(fixture());
      const selectedIndicator = tab(tabs, 'email').shadowRoot?.querySelector('[part="indicator"]');
      const restingIndicator = tab(tabs, 'notifications').shadowRoot?.querySelector(
        '[part="indicator"]',
      );
      const panelPart = panel(tabs, 'email').shadowRoot?.querySelector('[part="panel"]');
      if (
        !(selectedIndicator instanceof HTMLElement) ||
        !(restingIndicator instanceof HTMLElement) ||
        !(panelPart instanceof HTMLElement)
      ) {
        throw new Error('Missing indicator or panel part');
      }

      // Indicator entrance: stays in flow and cross-fades instead of toggling
      // display, so selection can grow the underline from center.
      expect(getComputedStyle(selectedIndicator).opacity).toBe('1');
      expect(getComputedStyle(selectedIndicator).transitionDuration).not.toBe('0s');
      expect(getComputedStyle(restingIndicator).display).toBe('block');
      expect(getComputedStyle(restingIndicator).opacity).toBe('0');

      // Label em-shift cross-fade and focus-ring fade on the tab host.
      expect(getComputedStyle(tab(tabs, 'email')).transitionProperty).toContain('color');
      expect(getComputedStyle(tab(tabs, 'email')).transitionProperty).toContain('box-shadow');

      // Revealed panel fades in and settles up through its enter animation.
      expect(getComputedStyle(panelPart).animationName).toBe('ki-tab-panel-enter');
    } finally {
      await browserCommands.emulateReducedMotion(null);
    }
  });

  it('S17 switches panels without transition or animation under reduced motion', async () => {
    const tabs = await mount(fixture());
    // Reduced motion is switched on with the component in the document, as a
    // person turns it on: WebKit re-evaluates a component's media queries
    // only in the shadow roots present at the change, so an instance mounted
    // after it can keep the motion of one mounted before.
    // Restored in `finally`: the emulation belongs to the Playwright page,
    // not to this file, so a leak reaches whichever spec runs next.
    await browserCommands.emulateReducedMotion('reduce');
    try {
      await userEvent.click(tab(tabs, 'notifications'));

      const visiblePanel = panel(tabs, 'notifications');
      const indicator = tab(tabs, 'notifications').shadowRoot?.querySelector('[part="indicator"]');
      const panelPart = visiblePanel.shadowRoot?.querySelector('[part="panel"]');
      if (!(indicator instanceof HTMLElement) || !(panelPart instanceof HTMLElement)) {
        throw new Error('Missing indicator or panel part');
      }

      expect(visiblePanel.hasAttribute('hidden')).toBe(false);
      expect(getComputedStyle(visiblePanel).transitionDuration).toBe('0s');
      expect(getComputedStyle(visiblePanel).animationName).toBe('none');
      expect(getComputedStyle(panelPart).animationName).toBe('none');
      expect(getComputedStyle(indicator).transitionDuration).toBe('0s');
      expect(getComputedStyle(indicator).animationName).toBe('none');
    } finally {
      await browserCommands.emulateReducedMotion(null);
    }
  });
});

describe('ki-tab boolean attributes', () => {
  function booleanFixture(billing: string): string {
    return `
      <ki-tabs label="Settings" value="email">
        <ki-tab value="email">Email</ki-tab>
        <ki-tab value="billing" ${billing}>Billing</ki-tab>
        <ki-tab-panel value="email">Email panel</ki-tab-panel>
        <ki-tab-panel value="billing">Billing panel</ki-tab-panel>
      </ki-tabs>
    `;
  }

  async function frames(count = 3): Promise<void> {
    for (let index = 0; index < count; index += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('S20 disabled="false" in the markup lets a pointer select a tab', async () => {
    const tabs = await mount(booleanFixture('disabled="false"'));
    await frames();
    tab(tabs, 'billing').click();
    await frames();

    expect(tabs.value).toBe('billing');
    expect(panel(tabs, 'billing').hasAttribute('hidden')).toBe(false);
  });

  it('S20 disabled="false" written after the first render makes a tab reachable by keyboard', async () => {
    const tabs = await mount(booleanFixture('disabled'));
    tab(tabs, 'billing').setAttribute('disabled', 'false');
    await frames();
    tab(tabs, 'email').focus();
    await userEvent.keyboard('{ArrowRight}');
    await frames();

    expect(tabs.value).toBe('billing');
    expect(panel(tabs, 'billing').hasAttribute('hidden')).toBe(false);
  });
});

const inboxIcon =
  '<svg slot="icon" role="img" aria-label="Envelope" viewBox="0 0 20 20"><title>Mail glyph</title><rect x="2" y="5" width="16" height="10" fill="currentColor"/></svg>';

function iconTabFixture(attributes = '', inboxLabel = '<span>Inbox</span>'): string {
  return `<ki-tabs label="Mail" ${attributes}>
    <ki-tab value="inbox">${inboxIcon}${inboxLabel}</ki-tab>
    <ki-tab value="drafts" disabled>Drafts</ki-tab>
    <ki-tab value="sent">Sent</ki-tab>
    <ki-tab-panel value="inbox">Incoming mail</ki-tab-panel>
    <ki-tab-panel value="drafts">Draft mail</ki-tab-panel>
    <ki-tab-panel value="sent">Sent mail</ki-tab-panel>
  </ki-tabs>`;
}

function inboxGeometry(group: KiTabsElement): { icon: DOMRect; label: DOMRect } {
  const inbox = tab(group, 'inbox');
  const icon = inbox.querySelector('svg');
  const label = inbox.querySelector('span');
  if (!icon || !label) throw new Error('Missing inbox icon or label');
  return { icon: icon.getBoundingClientRect(), label: label.getBoundingClientRect() };
}

function indicatorOf(group: KiTabsElement): HTMLElement {
  const indicator = tab(group, 'inbox').shadowRoot?.querySelector<HTMLElement>(
    '[part="indicator"]',
  );
  if (!indicator) throw new Error('Missing inbox indicator');
  return indicator;
}

describe('tabs variants and decorative icons', () => {
  it.each([
    ['', 'stacked'],
    ['variant="primary"', 'stacked'],
    ['variant="secondary"', 'inline'],
    ['variant="primary" icon-layout="inline"', 'inline'],
    ['variant="secondary" icon-layout="stacked"', 'stacked'],
  ])('S1 lays out icons with %s as %s', async (attributes, layout) => {
    const group = await mount(iconTabFixture(attributes));

    await expect
      .poll(() => {
        const { icon, label } = inboxGeometry(group);
        const iconLeads =
          layout === 'stacked' ? icon.bottom <= label.top : icon.right <= label.left;
        return icon.width > 0 && icon.height > 0 && iconLeads;
      })
      .toBe(true);
  });

  it.each(['primary', 'secondary'])('S2 keeps automatic APG activation in %s', async (variant) => {
    const group = await mount(iconTabFixture(`variant="${variant}"`));
    const sent = page.getByRole('tab', { name: 'Sent', exact: true });

    tab(group, 'inbox').focus();
    await userEvent.keyboard('{ArrowRight}');

    await expect.element(sent).toHaveFocus();
    await expect.element(sent).toHaveAttribute('aria-selected', 'true');
    expect(tab(group, 'inbox').tabIndex).toBe(-1);
    expect(tab(group, 'drafts').tabIndex).toBe(-1);
    expect(tab(group, 'sent').tabIndex).toBe(0);
    const visiblePanel = page.getByRole('tabpanel', { name: 'Sent', exact: true });
    await expect.element(visiblePanel).toBeVisible();
    await userEvent.tab();
    await expect.element(visiblePanel).toHaveFocus();
  });

  it('S3 names the tab and panel for the label alone and passes axe', async () => {
    await mount(iconTabFixture('variant="secondary"'));

    await expect
      .element(page.getByRole('tab', { name: 'Inbox', exact: true }))
      .toHaveAttribute('aria-selected', 'true');
    await expect.element(page.getByRole('tabpanel', { name: 'Inbox', exact: true })).toBeVisible();
    expect(page.getByRole('img', { name: 'Envelope' }).query()).toBeNull();
    await expectAccessible(main());
  });

  it('S3 keeps a slotted icon decorative and restores its authored accessibility when moved out', async () => {
    const group = await mount(iconTabFixture());
    const otherGroup = await mount(fixture());
    const icon = tab(group, 'inbox').querySelector('svg');
    if (!icon) throw new Error('Missing inbox icon');

    await expect.poll(() => icon.getAttribute('aria-hidden')).toBe('true');
    icon.setAttribute('aria-hidden', 'false');
    await expect.poll(() => icon.getAttribute('aria-hidden')).toBe('true');
    expect(page.getByRole('img', { name: 'Envelope' }).query()).toBeNull();

    tab(otherGroup, 'email').append(icon);
    await expect.poll(() => icon.assignedSlot?.name).toBe('icon');
    expect(page.getByRole('img', { name: 'Envelope' }).query()).toBeNull();

    main().append(icon);

    await expect.element(page.getByRole('img', { name: 'Envelope' })).toBeVisible();
    expect(icon.getAttribute('aria-hidden')).toBe('false');
  });

  it('S4 omits an icon-only tab and restores it when a visible label arrives', async () => {
    const group = await mount(iconTabFixture('variant="primary" value="inbox"', '  '));
    const inbox = tab(group, 'inbox');
    inbox.setAttribute('aria-label', 'Inbox');

    await expect
      .element(page.getByRole('tab', { name: 'Sent', exact: true }))
      .toHaveAttribute('aria-selected', 'true');
    expect(page.getByRole('tab', { name: 'Inbox', exact: true }).query()).toBeNull();
    expect(inbox.tabIndex).toBe(-1);
    expect(panel(group, 'inbox').hidden).toBe(true);

    inbox.removeAttribute('aria-label');
    inbox.append('Inbox');
    await expect.element(page.getByRole('tab', { name: 'Inbox', exact: true })).toBeVisible();
  });

  it('S6 paints primary content-width and secondary full-width indicators using their tokens', async () => {
    const primary = await mount(
      iconTabFixture(
        'label="Primary mail" style="--ki-tab-padding-inline: 16px; --ki-tab-primary-indicator-height: 5px; --ki-tab-indicator-color: rgb(16, 42, 88)"',
      ),
    );
    const secondary = await mount(
      iconTabFixture(
        'variant="secondary" style="--ki-tab-padding-inline: 16px; --ki-tab-secondary-indicator-height: 4px; --ki-tab-indicator-color: rgb(16, 42, 88)"',
      ),
    );

    await expect
      .poll(() => {
        const indicator = indicatorOf(primary).getBoundingClientRect();
        const host = tab(primary, 'inbox').getBoundingClientRect();
        const { icon, label } = inboxGeometry(primary);
        return (
          Math.abs(indicator.width - Math.max(icon.width, label.width)) < 0.5 &&
          indicator.width < host.width
        );
      })
      .toBe(true);
    await expect
      .poll(() => {
        const width = indicatorOf(secondary).getBoundingClientRect().width;
        return Math.abs(width - tab(secondary, 'inbox').getBoundingClientRect().width) < 0.5;
      })
      .toBe(true);
    const primaryInk = getComputedStyle(indicatorOf(primary));
    const secondaryInk = getComputedStyle(indicatorOf(secondary));
    expect(primaryInk.blockSize).toBe('5px');
    expect(primaryInk.borderStartStartRadius).toBe('5px');
    expect(primaryInk.borderEndStartRadius).toBe('0px');
    expect(secondaryInk.blockSize).toBe('4px');
    expect(secondaryInk.borderStartStartRadius).toBe('0px');
    expect(primaryInk.backgroundColor).toBe('rgb(16, 42, 88)');
    expect(secondaryInk.backgroundColor).toBe('rgb(16, 42, 88)');
  });

  it('S7 positions an inline SVG before the label in RTL', async () => {
    const group = await mount(iconTabFixture('dir="rtl" variant="secondary"'));

    await expect
      .poll(() => {
        const { icon, label } = inboxGeometry(group);
        return icon.left >= label.right && icon.width > 0;
      })
      .toBe(true);
  });

  it('shows the new icon variant without motion when the preference is reduced', async () => {
    const group = await mount(iconTabFixture('variant="secondary"'));
    try {
      await browserCommands.emulateReducedMotion('reduce');
      await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
      await expect.poll(() => getComputedStyle(indicatorOf(group)).transitionDuration).toBe('0s');
      await expect.poll(() => getComputedStyle(indicatorOf(group)).transform).toBe('none');
      await page.getByRole('tab', { name: 'Sent', exact: true }).click();
      await expect.element(page.getByRole('tabpanel', { name: 'Sent', exact: true })).toBeVisible();
    } finally {
      await browserCommands.emulateReducedMotion(null);
    }
  });
});
