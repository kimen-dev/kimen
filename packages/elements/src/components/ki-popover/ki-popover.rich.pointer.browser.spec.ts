// @spec:132-rich-tooltip
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-popover.js';

const pointer = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
  tapWithCoarsePointer: (selector: string) => Promise<void>;
};

beforeAll(() => {
  defineCustomElement();
});

afterEach(async () => {
  await pointer.emulateHoverCapability(null);
  document.getElementById('rich-pointer-fixture')?.remove();
  await parkPointer();
});

it('S14 opens with a coarse pointer and follows the inherited compact density', async (test) => {
  const emulated = await pointer.emulateHoverCapability('none');
  if (
    !emulated &&
    !matchMedia('(pointer: coarse)').matches &&
    !navigator.userAgent.includes('Chrome/')
  ) {
    test.skip('This engine does not emulate a coarse pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  const fixture = document.createElement('main');
  fixture.id = 'rich-pointer-fixture';
  fixture.innerHTML = `
    <style>${tokensCss}</style>
    <button id="touch-help" type="button" tabindex="0">Help</button>
    <ki-popover for="touch-help" kind="toggletip" appearance="rich" label="About help" arrow="false">
      <strong id="heading">Help options</strong>
      <button type="button" tabindex="0">Learn more</button>
    </ki-popover>`;
  document.body.append(fixture);

  await expect.element(page.getByRole('button', { name: 'Help', exact: true })).toBeVisible();
  if (emulated) {
    await pointer.tapWithCoarsePointer('#touch-help');
  } else {
    await page.getByRole('button', { name: 'Help', exact: true }).click();
  }

  const surface = await page.getByRole('dialog', { name: 'About help' }).findElement();
  const heading = fixture.querySelector('#heading');
  if (!heading) throw new Error('The rich panel has no heading');
  const padding = () =>
    heading.getBoundingClientRect().top -
    surface.getBoundingClientRect().top -
    Number.parseFloat(getComputedStyle(surface).borderBlockStartWidth);
  await expect.element(surface).toBeVisible();
  const standard = padding();
  expect(standard).toBeGreaterThan(0);
  fixture.setAttribute('data-ki-density', 'compact');
  await expect.poll(padding).toBeCloseTo(standard * 0.75, 1);
});
