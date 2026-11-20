// @spec:118-ki-reasoning
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import { defineCustomElement } from '../dist/components/ki-reasoning.js';
import { parkPointer } from './axe';

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
  await browser.emulateHoverCapability(null);
  fixture.replaceChildren();
  delete fixture.dataset.kiDensity;
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S12 gives the summary a 44 by 44 CSS pixel target in touch density', async ({ skip }) => {
  const coarsePointer = matchMedia('(pointer: coarse)');
  const emulated = await browser.emulateHoverCapability('none');
  if (!emulated && !coarsePointer.matches) {
    expect(navigator.userAgent).not.toContain('Chrome/');
    skip('The browser cannot emulate a coarse primary pointer');
  }
  await expect.poll(() => coarsePointer.matches).toBe(true);

  fixture.dataset.kiDensity = 'touch';
  fixture.innerHTML = '<ki-reasoning thinking-label="Wait"><p>Check the inputs.</p></ki-reasoning>';

  const readSummary = () =>
    fixture.querySelector('ki-reasoning')?.shadowRoot?.querySelector('summary[part~="summary"]');
  await expect.poll(readSummary).toBeInstanceOf(HTMLElement);
  const summary = readSummary();
  if (summary === undefined || summary === null) throw new Error('Missing native summary');

  const target = summary.getBoundingClientRect();
  expect(target.width).toBeGreaterThanOrEqual(44);
  expect(target.height).toBeGreaterThanOrEqual(44);
});
