import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-audio.js';

const browser = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
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
  fixture.replaceChildren();
  await browser.emulateHoverCapability(null);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('keeps each transport control and the transcript reachable with a coarse pointer', async ({
  skip,
}) => {
  const emulated = await browser.emulateHoverCapability('none');
  const coarse = () => matchMedia('(pointer: coarse)').matches;
  if (navigator.userAgent.includes('Chrome/')) {
    expect(emulated).toBe(true);
    await expect.poll(coarse).toBe(true);
  } else if (!coarse()) {
    skip('This browser cannot emulate a coarse primary pointer');
  }
  fixture.setAttribute('data-ki-density', 'touch');
  fixture.innerHTML = '<ki-audio title="Interview" transcript-href="/ep4/transcript"></ki-audio>';
  const controls = [
    page.getByRole('button', { name: 'Play', exact: true }),
    page.getByRole('slider', { name: 'Seek' }),
    page.getByRole('button', { name: 'Playback speed: 1×' }),
    page.getByRole('button', { name: 'Mute', exact: true }),
    page.getByRole('link', { name: 'Read the transcript' }),
  ];

  for (const control of controls) {
    await expect.element(control).toBeVisible();
    const { width, height } = control.element().getBoundingClientRect();
    expect(width).toBeGreaterThanOrEqual(44);
    expect(height).toBeGreaterThanOrEqual(44);
  }
});
