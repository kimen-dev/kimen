// @spec:112-input-variants
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { parkPointer } from './axe';
import { installKimen, mount, resetRoot, themeDocument, uninstallKimen, unmountAll } from './modes';

const browserCommands = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
};

beforeAll(installKimen);
afterAll(async () => {
  await browserCommands.emulateHoverCapability(null);
  await uninstallKimen();
});
afterEach(async () => {
  await parkPointer();
  unmountAll();
  resetRoot();
});

it('S7 preserves touch density and native text size for both appearances', async ({ skip }) => {
  const emulated = await browserCommands.emulateHoverCapability('none');
  if (!emulated && !navigator.userAgent.includes('Chrome/')) {
    skip('CDP touch emulation is available in Chromium');
  }
  expect(emulated).toBe(true);
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  themeDocument('material3', 'light');
  const fixture = await mount(`
    <section data-ki-density="touch">
      <ki-input label="Name" appearance="outlined" size="xs"></ki-input>
      <ki-textarea label="Notes" appearance="filled" size="xs"></ki-textarea>
    </section>
  `);
  await expect.element(page.getByRole('textbox', { name: 'Name' })).toBeVisible();
  await expect.element(page.getByRole('textbox', { name: 'Notes' })).toBeVisible();
  const input = fixture.querySelector('ki-input')?.shadowRoot?.querySelector('input');
  const textarea = fixture.querySelector('ki-textarea')?.shadowRoot?.querySelector('textarea');
  if (!input || !textarea) throw new Error('Missing native controls');
  for (const control of [input, textarea]) {
    expect(parseFloat(getComputedStyle(control).fontSize)).toBeGreaterThanOrEqual(16);
    expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  }
});
