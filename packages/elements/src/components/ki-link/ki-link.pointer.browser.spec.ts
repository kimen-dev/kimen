// @spec:070-ki-link
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-link.js';

const media = commands as unknown as {
  emulateHoverCapability: (mode: 'none' | null) => Promise<boolean>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  await media.emulateHoverCapability(null);
  await parkPointer();
  fixture.replaceChildren();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S9 keeps standalone links underlined and follows the selected density on coarse pointers', async ({
  skip,
}) => {
  const emulated = await media.emulateHoverCapability('none');
  if (!emulated && !matchMedia('(pointer: coarse)').matches) {
    expect(navigator.userAgent).not.toContain('Chrome/');
    skip('Browser cannot emulate a coarse primary pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  expect(matchMedia('(hover: none)').matches).toBe(true);

  fixture.innerHTML = '<ki-link href="/changelog" underline="hover">Changelog</ki-link>';
  const read = () => fixture.querySelector('ki-link')?.shadowRoot?.querySelector('[part="link"]');
  await expect.poll(read).toBeInstanceOf(HTMLAnchorElement);
  const part = read();
  if (!(part instanceof HTMLAnchorElement)) throw new Error('Missing native link part');

  expect(getComputedStyle(part).textDecorationLine).toBe('underline');
  expect(part.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
  expect(part.getBoundingClientRect().height).toBeLessThan(44);

  fixture.dataset.kiDensity = 'touch';
  try {
    expect(part.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    expect(part.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
  } finally {
    delete fixture.dataset.kiDensity;
  }
});
