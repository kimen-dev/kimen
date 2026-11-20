// @spec:088-ki-stat
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-stat.js';

const browser = commands as unknown as {
  emulateHoverCapability: (value: 'hover' | 'none' | null) => Promise<boolean>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  fixture.lang = 'en-US';
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  styles.remove();
  fixture.remove();
});

it('S12 preserves the visible value and comparison at coarse pointer and touch density', async (test) => {
  await page.viewport(390, 600);
  fixture.innerHTML =
    '<ki-stat label="Median render time" value="84" unit="ms" delta="-9"></ki-stat>';
  const root = fixture.querySelector('ki-stat')?.shadowRoot;
  await expect
    .poll(() => root?.querySelector('[part="trend"]')?.getBoundingClientRect().height ?? 0)
    .toBeGreaterThan(0);
  const card = root?.querySelector('[part="card"]');
  const value = root?.querySelector('[part="value"]');
  const trend = root?.querySelector('[part="trend"]');
  if (!card || !value || !trend) {
    throw new Error('The stat did not render its card, value and trend parts');
  }
  const fontSize = getComputedStyle(value).fontSize;
  const padding = getComputedStyle(card).paddingInlineStart;

  if (!(await browser.emulateHoverCapability('none'))) {
    test.skip('this engine cannot emulate a coarse pointer');
  }

  try {
    expect(matchMedia('(pointer: coarse)').matches).toBe(true);
    fixture.dataset.kiDensity = 'touch';
    expect(value.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(trend.getBoundingClientRect().height).toBeGreaterThan(0);
    expect(getComputedStyle(value).fontSize).toBe(fontSize);
    expect(getComputedStyle(card).paddingInlineStart).toBe(padding);
  } finally {
    delete fixture.dataset.kiDensity;
    await browser.emulateHoverCapability(null);
  }
});
