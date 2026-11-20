// @spec:094-toggle-icon-button
// Coarse-pointer emulation belongs to the isolated pointer-capability project.
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { defineCustomElement as defineKiButton } from '../dist/components/ki-button.js';
import { defineCustomElement as defineKiIconButton } from '../dist/components/ki-icon-button.js';
import { parkPointer, settleEntryMotion } from './axe';

const browserCommands = commands as unknown as {
  emulateHoverCapability: (capability: 'none' | null) => Promise<boolean>;
};
const style = document.createElement('style');
style.textContent = tokensCss;

beforeAll(() => {
  defineKiButton();
  defineKiIconButton();
  document.head.append(style);
});

afterEach(async () => {
  document.body.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  style.remove();
});

function hitsAtEdges(control: HTMLButtonElement, side: number): (Element | null)[] {
  const { left, top, width, height } = control.getBoundingClientRect();
  const x = left + width / 2;
  const y = top + height / 2;
  // Sample just inside the expected target edge, avoiding subpixel rounding.
  const half = side / 2 - 0.5;
  return [
    document.elementFromPoint(x, y - half),
    document.elementFromPoint(x, y + half),
    document.elementFromPoint(x - half, y),
    document.elementFromPoint(x + half, y),
  ];
}

it('S12 keeps compact selected toggles usable with a coarse pointer and honors opt-in touch density', async (test) => {
  const emulated = await browserCommands.emulateHoverCapability('none');
  try {
    if (!emulated) test.skip('this engine cannot emulate a coarse pointer');
    expect(matchMedia('(pointer: coarse)').matches).toBe(true);
    const fixture = document.createElement('main');
    fixture.style.cssText = 'display:flex;gap:32px;padding:32px;';
    fixture.innerHTML = `
      <ki-icon-button toggle selected size="xs" label="Bookmark">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z"/></svg>
      </ki-icon-button>
      <ki-button toggle selected size="xs">Bold</ki-button>
    `;
    document.body.append(fixture);
    const controls = [];
    for (const host of fixture.children) {
      const findControl = () =>
        host.shadowRoot?.querySelector<HTMLButtonElement>('[part="button"]');
      await expect.poll(() => findControl()?.getAttribute('aria-pressed')).toBe('true');
      const control = findControl();
      if (!control) throw new Error(`${host.localName} rendered no button part`);

      expect(hitsAtEdges(control, 24)).toEqual([host, host, host, host]);
      expect(hitsAtEdges(control, 44).slice(0, 2)).not.toContain(host);
      controls.push({ control, host });
    }

    fixture.setAttribute('data-ki-density', 'touch');
    for (const { control, host } of controls) {
      expect(hitsAtEdges(control, 44)).toEqual([host, host, host, host]);
      const { left, top, width, height } = control.getBoundingClientRect();
      const surface = fixture.getBoundingClientRect();
      await userEvent.click(fixture, {
        position: { x: left + width / 2 - surface.left, y: top + height / 2 + 21.5 - surface.top },
      });
      await expect.poll(() => control.getAttribute('aria-pressed')).toBe('false');
      await settleEntryMotion();
      expect(hitsAtEdges(control, 44)).toEqual([host, host, host, host]);
      const unselected = control.getBoundingClientRect();
      expect(unselected.width).toBeCloseTo(width, 0);
      expect(unselected.height).toBeCloseTo(height, 0);
    }
  } finally {
    await browserCommands.emulateHoverCapability(null);
  }
});
