// @spec:083-ki-button-group
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page } from 'vitest/browser';
import { defineCustomElement as defineKiButtonGroup } from '../dist/components/ki-button-group.js';
import { defineCustomElement as defineKiButton } from '../dist/components/ki-button.js';
import { defineCustomElement as defineKiIconButton } from '../dist/components/ki-icon-button.js';
import { parkPointer } from './axe';

const browserCommands = commands as unknown as {
  emulateHoverCapability: (capability: 'hover' | 'none' | null) => Promise<boolean>;
};
const tokens = document.createElement('style');
const coarsePointer = '(pointer: coarse)';

beforeAll(() => {
  defineKiButton();
  defineKiIconButton();
  defineKiButtonGroup();
  tokens.textContent = tokensCss;
  document.head.append(tokens);
});

afterEach(async () => {
  document.body.replaceChildren();
  await browserCommands.emulateHoverCapability(null);
  await parkPointer();
});

afterAll(() => {
  tokens.remove();
});

it('keeps adjacent xs actions independently reachable at touch density on a coarse pointer', async (context) => {
  const emulated = await browserCommands.emulateHoverCapability('none');
  if (!emulated && !navigator.userAgent.includes('Chrome/')) {
    context.skip(`${navigator.userAgent} cannot emulate a coarse primary pointer`);
  }
  expect(emulated, 'Chromium did not emulate touch').toBe(true);
  await expect.poll(() => matchMedia(coarsePointer).matches).toBe(true);

  const fixture = document.createElement('main');
  fixture.style.padding = '48px';
  fixture.innerHTML = `
    <ki-button-group label="Editing" size="xs" attached data-ki-density="touch">
      <ki-button type="button" variant="primary">Cut</ki-button>
      <ki-icon-button label="Paste" variant="primary">
        <svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z" stroke="currentColor" fill="none"/></svg>
      </ki-icon-button>
    </ki-button-group>
  `;
  document.body.append(fixture);

  const cut = page.getByRole('button', { name: 'Cut' });
  const paste = page.getByRole('button', { name: 'Paste' });
  const cutClick = vi.fn();
  const pasteClick = vi.fn();
  fixture.querySelector('ki-button')?.addEventListener('click', cutClick);
  fixture.querySelector('ki-icon-button')?.addEventListener('click', pasteClick);
  await expect.element(cut).toBeVisible();
  await expect.element(paste).toBeVisible();

  const cutRect = cut.element().getBoundingClientRect();
  const pasteRect = paste.element().getBoundingClientRect();
  expect(Math.min(cutRect.width, cutRect.height)).toBeGreaterThanOrEqual(44);
  expect(Math.min(pasteRect.width, pasteRect.height)).toBeGreaterThanOrEqual(44);

  // Just inside each side of the shared edge is a distinct hit target.
  await cut.click({ position: { x: cutRect.width - 3, y: cutRect.height / 2 } });
  expect(cutClick).toHaveBeenCalledTimes(1);
  expect(pasteClick).not.toHaveBeenCalled();
  await paste.click({ position: { x: 3, y: pasteRect.height / 2 } });
  expect(cutClick).toHaveBeenCalledTimes(1);
  expect(pasteClick).toHaveBeenCalledTimes(1);
});
