// @spec:080-ki-popover
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-popover.js';

const browserCommands = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
};

beforeAll(() => {
  defineCustomElement();
});

afterEach(async () => {
  await browserCommands.emulateHoverCapability(null);
  document.getElementById('popover-pointer-fixture')?.remove();
  await parkPointer();
});

it('S10 keeps normal density under a coarse pointer and follows an explicit touch region', async (test) => {
  const emulated = await browserCommands.emulateHoverCapability('none');
  if (
    !emulated &&
    !matchMedia('(pointer: coarse)').matches &&
    !navigator.userAgent.includes('Chrome/')
  ) {
    test.skip('This engine does not emulate a coarse pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  const fixture = document.createElement('main');
  fixture.id = 'popover-pointer-fixture';
  fixture.innerHTML = `<style>${tokensCss}</style>
    <button id="touch-filters" type="button">Filters</button>
    <ki-popover for="touch-filters" label="Filters" open>Open incidents</ki-popover>`;
  document.body.append(fixture);
  await expect.element(page.getByRole('dialog', { name: 'Filters' })).toBeVisible();
  const surface = fixture
    .querySelector('ki-popover')
    ?.shadowRoot?.querySelector('[part="surface"]');
  if (!surface) throw new Error('The popover has no surface');
  const padding = () => Number.parseFloat(getComputedStyle(surface).paddingInlineStart);

  expect(padding()).toBe(12);
  fixture.dataset.kiDensity = 'touch';
  expect(padding()).toBeGreaterThan(12);
});
