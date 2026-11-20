// @spec:086-ki-copy-button
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-copy-button.js';

const styles = document.createElement('style');
const fixture = document.createElement('main');
const browser = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
};

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S9 extends the xs icon button hit area to 44px on a coarse pointer', async (test) => {
  if (!(await browser.emulateHoverCapability('none'))) {
    test.skip('This browser cannot emulate a coarse pointer');
  }
  try {
    await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
    fixture.innerHTML =
      '<div data-ki-density="touch" style="padding: var(--ki-space-lg)"><ki-copy-button value="token" size="xs"></ki-copy-button></div>';
    const host = fixture.querySelector('ki-copy-button');
    const nativeButton = () => host?.shadowRoot?.querySelector('button');
    await expect.poll(nativeButton).toBeInstanceOf(HTMLButtonElement);
    const button = nativeButton();
    if (!button || !host?.shadowRoot) throw new Error('Missing copy button');
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    expect(host.shadowRoot.elementFromPoint(x - 21, y)).toBe(button);
    expect(host.shadowRoot.elementFromPoint(x + 21, y)).toBe(button);
    expect(host.shadowRoot.elementFromPoint(x, y - 21)).toBe(button);
    expect(host.shadowRoot.elementFromPoint(x, y + 21)).toBe(button);
  } finally {
    await browser.emulateHoverCapability(null);
  }
});
