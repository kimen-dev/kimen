import axe from 'axe-core';
import tokensCss from '@kimen/tokens/css?raw';
import { page, userEvent } from 'vitest/browser';
import { commands } from 'vitest/browser';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

// @spec:014-ki-tabs
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III).
import { defineCustomElement as defineKiTab } from '../dist/components/ki-tab.js';
import { defineCustomElement as defineKiTabPanel } from '../dist/components/ki-tab-panel.js';
import { defineCustomElement as defineKiTabs } from '../dist/components/ki-tabs.js';

type KiTabsElement = HTMLElement & { value: string };
const browserCommands = commands as unknown as {
  ariaSnapshotByRole: (role: 'tablist' | 'tabpanel', name?: string) => Promise<string>;
  ariaSnapshot: (selector: string) => Promise<string>;
};

const STYLE_ID = 'ki-tabs-browser-token-style';

beforeAll(() => {
  defineKiTabs();
  defineKiTab();
  defineKiTabPanel();
});

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
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
    const event = onChange.mock.calls[0][0] as CustomEvent<{ value: string }>;
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

  it('S7 S8 has zero axe violations across selected and disabled states', async () => {
    const tabs = await mount(fixture());

    expect((await axe.run(main())).violations).toEqual([]);

    await userEvent.click(tab(tabs, 'notifications'));

    expect((await axe.run(main())).violations).toEqual([]);
  });
});
