// @spec:127-ki-code-block
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-code-block.js';

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

it('S11 preserves the full touch target inside the code header', async (test) => {
  if (!(await browser.emulateHoverCapability('none'))) {
    test.skip('This browser cannot emulate a coarse pointer');
  }
  try {
    await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
    fixture.innerHTML =
      '<div data-ki-density="touch"><ki-code-block language="ts">let x = 1;</ki-code-block></div>';
    const host = fixture.querySelector('ki-code-block');
    const copy = () => host?.shadowRoot?.querySelector('ki-copy-button');
    const nativeButton = () => copy()?.shadowRoot?.querySelector('button');
    await expect.poll(nativeButton).toBeInstanceOf(HTMLButtonElement);
    const button = nativeButton();
    const root = copy()?.shadowRoot;
    if (!button || !root) throw new Error('Missing copy button');
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    expect(root.elementFromPoint(x - 21, y)).toBe(button);
    expect(root.elementFromPoint(x + 21, y)).toBe(button);
    expect(root.elementFromPoint(x, y - 21)).toBe(button);
    expect(root.elementFromPoint(x, y + 21)).toBe(button);
  } finally {
    await browser.emulateHoverCapability(null);
  }
});
