// @spec:079-card-variants
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-card.js';
import { parkPointer } from './axe';

const browserCommands = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
  tapWithCoarsePointer: (selector: string) => Promise<void>;
};

beforeAll(() => {
  defineCustomElement();
  const style = document.createElement('style');
  style.textContent = tokensCss;
  document.head.append(style);
});

afterEach(async () => {
  await parkPointer();
  document.body.replaceChildren();
});

afterAll(async () => {
  await browserCommands.emulateHoverCapability(null);
  await browserCommands.emulateReducedMotion(null);
});

it('S12 activates a coarse-pointer tap on the body without retaining hover feedback', async ({
  skip,
}) => {
  const emulated = await browserCommands.emulateHoverCapability('none');
  if (!emulated && !navigator.userAgent.includes('Chrome/')) {
    skip('CDP touch emulation is available in Chromium');
  }
  expect(emulated).toBe(true);
  await expect.poll(() => matchMedia('(pointer: coarse) and (hover: none)').matches).toBe(true);
  await browserCommands.emulateReducedMotion('reduce');
  document.body.innerHTML = `
    <ki-card interactive variant="outlined" data-ki-density="touch">
      <h3 slot="header">Search index rebuild</h3>
      <p id="touch-copy">Rebuild starts at midnight</p>
    </ki-card>
  `;
  await expect.element(page.getByRole('button', { name: 'Search index rebuild' })).toBeVisible();
  const card = document.querySelector('ki-card');
  const surface = card?.shadowRoot?.querySelector('[part="card"]');
  if (!card || !surface) throw new Error('Card surface did not render');
  const styles = getComputedStyle(surface);
  expect(parseFloat(styles.minBlockSize)).toBeGreaterThanOrEqual(44);
  expect(parseFloat(styles.minInlineSize)).toBeGreaterThanOrEqual(44);
  const hoverPaint = () => ({
    shadow: getComputedStyle(surface).boxShadow,
    overlay: getComputedStyle(surface, '::before').backgroundColor,
  });
  const resting = hoverPaint();
  const activate = vi.fn();
  card.addEventListener('ki-activate', activate);
  await browserCommands.tapWithCoarsePointer('#touch-copy');
  await expect.poll(() => activate.mock.calls.length).toBe(1);
  expect(hoverPaint()).toEqual(resting);
  await userEvent.hover(page.getByText('Rebuild starts at midnight'));
  expect(hoverPaint()).toEqual(resting);
});
