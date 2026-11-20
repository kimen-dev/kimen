// @spec:129-ki-tool-call
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-tool-call.js';

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
  await browser.emulateHoverCapability(null);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S12 keeps the disclosure summary at least 44 CSS pixels in both dimensions', async (context) => {
  const emulated = await browser.emulateHoverCapability('none');
  if (!emulated && !navigator.userAgent.includes('Chrome/')) {
    context.skip('This browser cannot emulate a coarse primary pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  fixture.innerHTML =
    '<div data-ki-density="touch"><ki-tool-call name="search_docs"></ki-tool-call></div>';
  const host = fixture.querySelector('ki-tool-call');
  const summary = () => host?.shadowRoot?.querySelector('summary');
  await expect.poll(summary).toBeInstanceOf(HTMLElement);
  const box = summary()?.getBoundingClientRect();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  expect(box?.width).toBeGreaterThanOrEqual(44);
});
