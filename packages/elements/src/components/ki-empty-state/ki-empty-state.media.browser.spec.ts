// @spec:087-ki-empty-state
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { settleFrames } from '../../../browser-tests/visual/fixtures';
import { defineCustomElement } from '../../../dist/components/ki-empty-state.js';

const browser = commands as unknown as {
  emulateForcedColors: (value: 'active' | 'none' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | 'no-preference' | null) => Promise<void>;
};
const fixture = document.createElement('main');
const styles = document.createElement('style');

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  await browser.emulateForcedColors(null);
  await browser.emulateReducedMotion(null);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

async function mountMessage() {
  fixture.innerHTML =
    '<ki-empty-state heading="No projects yet">Create a project to get started.</ki-empty-state>';
  await expect.element(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();
  const root = fixture.firstElementChild?.shadowRoot;
  const container = root?.querySelector('[part="container"]');
  const title = root?.querySelector('h3');
  const description = root?.querySelector('[part="description"]');
  if (!container || !title || !description) throw new Error('Expected the EmptyState message');
  return { container, title, description };
}

it('S8 keeps the heading and description legible in forced colors', async (context) => {
  await browser.emulateForcedColors('active');
  const { container, title, description } = await mountMessage();
  const witness = document.createElement('span');
  const original = 'rgb(1, 2, 3)';
  witness.style.backgroundColor = original;
  fixture.append(witness);
  await settleFrames(2);
  const paletteApplied = () =>
    matchMedia('(forced-colors: active)').matches &&
    getComputedStyle(witness).backgroundColor !== original;
  if (!paletteApplied() && !navigator.userAgent.includes('Chrome/')) {
    context.skip('The browser cannot apply a forced palette under emulation');
  }
  await expect.poll(paletteApplied).toBe(true);

  const background = getComputedStyle(container).backgroundColor;
  expect(background).toBe(getComputedStyle(witness).backgroundColor);
  expect(getComputedStyle(title).color).not.toBe(background);
  expect(getComputedStyle(description).color).not.toBe(background);
});

it('S9 shows the whole message with no animation under reduced motion', async () => {
  await browser.emulateReducedMotion('reduce');
  await expect.poll(() => matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
  const { container } = await mountMessage();
  await expect.element(page.getByText('Create a project to get started.')).toBeVisible();
  expect(container.getAnimations({ subtree: true })).toHaveLength(0);
});
