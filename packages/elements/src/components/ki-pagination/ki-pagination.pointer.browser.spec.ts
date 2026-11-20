// @spec:100-ki-pagination
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-pagination.js';

const media = commands as unknown as {
  emulateHoverCapability: (mode: 'none' | null) => Promise<boolean>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  fixture.style.inlineSize = '640px';
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  await media.emulateHoverCapability(null);
  await parkPointer();
  fixture.replaceChildren();
  delete fixture.dataset.kiDensity;
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S10 increases page buttons to 44px under touch density on a coarse pointer', async ({
  skip,
}) => {
  const emulated = await media.emulateHoverCapability('none');
  if (!emulated && !matchMedia('(pointer: coarse)').matches) {
    expect(navigator.userAgent).not.toContain('Chrome/');
    skip('Browser cannot emulate a coarse primary pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  expect(matchMedia('(hover: none)').matches).toBe(true);

  fixture.innerHTML = '<ki-pagination page="5" pages="12"></ki-pagination>';
  const current = page.getByRole('button', { name: 'Page 5', exact: true });
  await expect.element(current).toBeVisible();
  expect(current.element().getBoundingClientRect().height).toBeLessThan(44);

  fixture.dataset.kiDensity = 'touch';
  const box = current.element().getBoundingClientRect();
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
});
