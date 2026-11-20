// @spec:114-ki-timeline
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineItem } from '../../../dist/components/ki-timeline-item.js';
import { defineCustomElement as defineTimeline } from '../../../dist/components/ki-timeline.js';

const browser = commands as unknown as {
  emulateHoverCapability: (capability: 'none' | null) => Promise<boolean>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineTimeline();
  defineItem();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  await browser.emulateHoverCapability(null);
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  styles.remove();
  fixture.remove();
});

it('S12: coarse input gives the details disclosure a 44 CSS pixel target', async ({ skip }) => {
  const emulated = await browser.emulateHoverCapability('none');
  if (navigator.userAgent.includes('Chrome/')) {
    expect(emulated).toBe(true);
  } else if (!matchMedia('(pointer: coarse)').matches) {
    skip('This browser cannot emulate a coarse primary pointer');
    return;
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);

  fixture.setAttribute('data-ki-density', 'touch');
  fixture.innerHTML = `
    <ki-timeline label="Activity">
      <ki-timeline-item>Preview failed <span slot="details">Runner timed out</span></ki-timeline-item>
    </ki-timeline>
  `;
  const summary = () =>
    fixture.querySelector('ki-timeline-item')?.shadowRoot?.querySelector('summary');
  await expect.poll(summary).toBeInstanceOf(HTMLElement);
  const bounds = summary()?.getBoundingClientRect();
  expect(bounds?.width).toBeGreaterThanOrEqual(44);
  expect(bounds?.height).toBeGreaterThanOrEqual(44);
});
