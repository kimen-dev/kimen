// @spec:102-ki-slider
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-slider.js';

const media = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
};
let fixture: HTMLElement;

beforeAll(() => {
  defineCustomElement();
  const style = document.createElement('style');
  style.textContent = tokensCss;
  document.head.append(style);
  fixture = document.createElement('div');
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  await media.emulateHoverCapability(null);
  await parkPointer();
});

it('S10 increases each thumb target to at least 44 by 44 CSS pixels for a coarse pointer', async (context) => {
  if (!(await media.emulateHoverCapability('none')) || !matchMedia('(pointer: coarse)').matches) {
    context.skip();
    return;
  }
  fixture.innerHTML = '<ki-slider range label="Price" value="20,80"></ki-slider>';
  const lower = page.getByRole('slider', { name: 'Price minimum' });
  const upper = page.getByRole('slider', { name: 'Price maximum' });
  await expect.element(lower).toBeVisible();
  await expect.element(upper).toBeVisible();

  for (const thumb of [lower, upper]) {
    const { width, height } = thumb.element().getBoundingClientRect();
    expect(width).toBeGreaterThanOrEqual(44);
    expect(height).toBeGreaterThanOrEqual(44);
  }
});
