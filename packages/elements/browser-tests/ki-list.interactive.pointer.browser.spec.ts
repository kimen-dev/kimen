// @spec:107-interactive-list
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { defineCustomElement as defineKiList } from '../dist/components/ki-list.js';
import { defineCustomElement as defineKiListItem } from '../dist/components/ki-list-item.js';
import { parkPointer } from './axe';

const browserCommands = commands as unknown as {
  emulateHoverCapability: (mode: 'hover' | 'none' | null) => Promise<boolean>;
};

afterEach(async () => {
  document.body.replaceChildren();
  await parkPointer();
});

it('S17 keeps a coarse-pointer target without lingering hover paint in compact density', async (test) => {
  if (!(await browserCommands.emulateHoverCapability('none'))) {
    test.skip('this engine cannot emulate a touch screen');
  }
  const url = location.href;
  try {
    await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
    defineKiList();
    defineKiListItem();
    const style = document.createElement('style');
    style.textContent = tokensCss;
    document.head.append(style);
    const main = document.createElement('main');
    main.setAttribute('data-ki-density', 'compact');
    main.innerHTML =
      '<ki-list label="Settings"><ki-list-item size="sm" href="#account">Account</ki-list-item></ki-list><div id="account">Settings</div>';
    document.body.append(main);
    const link = page.getByRole('link', { name: 'Account' });
    await expect.element(link).toBeInTheDocument();
    expect(link.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
    main.setAttribute('data-ki-density', 'touch');
    expect(link.element().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    main.setAttribute('data-ki-density', 'compact');
    await link.click();
    expect(location.hash).toBe('#account');
    expect(getComputedStyle(link.element()).backgroundColor).toBe('rgba(0, 0, 0, 0)');
  } finally {
    history.replaceState(null, '', url);
    await browserCommands.emulateHoverCapability(null);
  }
});
