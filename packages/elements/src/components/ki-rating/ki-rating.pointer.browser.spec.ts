// @spec:120-ki-rating
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineAllComponents } from '../../../browser-tests/all-components';

const styles = document.createElement('style');
const fixture = document.createElement('main');
const browserCommands = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
};

beforeAll(() => {
  defineAllComponents();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  await browserCommands.emulateHoverCapability(null);
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S17 gives each radio a 44 CSS pixel target in touch density with a coarse pointer', async (test) => {
  if (!(await browserCommands.emulateHoverCapability('none'))) {
    if (navigator.userAgent.includes('Chrome/')) {
      throw new Error('Chromium did not emulate a coarse primary pointer');
    }
    test.skip('This engine cannot emulate a coarse primary pointer');
    return;
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  fixture.innerHTML =
    '<div data-ki-density="touch"><ki-rating label="Usefulness"></ki-rating></div>';
  await expect.element(page.getByRole('radio', { name: '1 star', exact: true })).toBeVisible();

  const targets = page.getByRole('radio').all();
  expect(targets).toHaveLength(5);
  for (const target of targets) {
    const { width, height } = target.element().getBoundingClientRect();
    expect(width).toBeGreaterThanOrEqual(44);
    expect(height).toBeGreaterThanOrEqual(44);
  }
});
