// @spec:077-ki-checkbox-group
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { defineCustomElement as defineGroup } from '../dist/components/ki-checkbox-group.js';
import { defineCustomElement as defineCheckbox } from '../dist/components/ki-checkbox.js';
import { parkPointer } from './axe';

const pointer = commands as unknown as {
  emulateHoverCapability: (capability: 'none' | null) => Promise<boolean>;
};

const style = document.createElement('style');
beforeAll(() => {
  defineCheckbox();
  defineGroup();
  style.textContent = tokensCss;
  document.head.append(style);
});

afterAll(async () => {
  document.body.replaceChildren();
  style.remove();
  await pointer.emulateHoverCapability(null);
  await parkPointer();
});

it('S10 preserves touch density for individual options under a coarse pointer', async ({
  skip,
}) => {
  const emulated = await pointer.emulateHoverCapability('none');
  const coarse = () => matchMedia('(pointer: coarse)').matches;
  if (navigator.userAgent.includes('Chrome/')) {
    expect(emulated).toBe(true);
    await expect.poll(coarse).toBe(true);
  } else if (!coarse()) {
    skip('This engine cannot emulate a coarse primary pointer.');
  }

  document.body.innerHTML = `
    <main data-ki-density="touch">
      <ki-checkbox-group label="Regions">
        <ki-checkbox value="eu">Europe</ki-checkbox>
        <ki-checkbox value="am">Americas</ki-checkbox>
      </ki-checkbox-group>
    </main>`;
  for (const name of ['Europe', 'Americas']) {
    const option = page.getByRole('checkbox', { name });
    await expect.element(option).toBeVisible();
    const target = option.element().getBoundingClientRect();
    expect(target.width).toBeGreaterThanOrEqual(44);
    expect(target.height).toBeGreaterThanOrEqual(44);
  }
});
