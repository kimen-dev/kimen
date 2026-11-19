// @spec:084-ki-skeleton
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-skeleton.js';

const browserCommands = commands as unknown as {
  emulateHoverCapability: (capability: 'none' | null) => Promise<boolean>;
};

afterEach(async () => {
  await browserCommands.emulateHoverCapability(null);
  await parkPointer();
});

it('S11 preserves explicit geometry in automatic coarse-pointer density', async (test) => {
  defineCustomElement();
  const fixture = document.createElement('main');
  fixture.innerHTML = `
    <style>
      ${tokensCss}
      @media (pointer: coarse) {
        .automatic-density {
          --ki-density-control-offset: var(--ki-space-xs);
          --ki-density-target-min: var(--ki-size-target-touch);
        }
      }
    </style>
    <div class="automatic-density">
      <ki-skeleton shape="rect" inline-size="160px" block-size="96px"></ki-skeleton>
    </div>
  `;
  document.body.append(fixture);
  try {
    const host = fixture.querySelector('ki-skeleton');
    if (!host) throw new Error('Expected a skeleton');
    const part = () => host.shadowRoot?.querySelector('[part="shape"]');
    const dimensions = () => {
      const box = part()?.getBoundingClientRect();
      return [box?.width, box?.height];
    };
    const densityTarget = () =>
      getComputedStyle(host).getPropertyValue('--ki-density-target-min').trim();
    await expect.poll(dimensions).toEqual([160, 96]);
    expect(densityTarget()).toBe('24px');

    const emulated = await browserCommands.emulateHoverCapability('none');
    if (!emulated && !navigator.userAgent.includes('Chrome/')) {
      test.skip('Primary pointer emulation requires Chromium CDP');
      return;
    }
    expect(emulated).toBe(true);
    await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
    expect(densityTarget()).toBe('44px');
    expect(dimensions()).toEqual([160, 96]);
  } finally {
    fixture.remove();
  }
});
