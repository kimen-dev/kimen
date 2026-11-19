// @spec:050-size-axes
// Sized text fields on a touch screen (spec 050 D5, with spec 048).
//
// Under a coarse primary pointer a field's text is the larger of its size's
// text and the touch text size (16px): a small field grows to 16px so Safari
// on iOS does not zoom the page into it, and a large field keeps its own
// larger text. The coarse pointer is emulated exactly as
// touch-field-text.browser.spec.ts does, in the same isolated input-device
// setup (vitest.browser.config.ts), because the emulation is page-level.
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { defineCustomElement as defineKiInput } from '../dist/components/ki-input.js';

const browserCommands = commands as unknown as {
  emulateHoverCapability: (capability: 'hover' | 'none' | null) => Promise<boolean>;
};

interface Skippable {
  skip: (note?: string) => void;
}

const STYLE_ID = 'touch-size-field-text-tokens';
const SETTLE_DEADLINE_MS = 2000;
const COARSE = '(pointer: coarse)';
/** The engine of the PR gate: an emulation that does not apply there is a failure, not a skip. */
const MUST_EMULATE = navigator.userAgent.includes('Chrome/');

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

/** Emulate a touch screen and wait until the page reports a coarse primary pointer. */
async function underCoarsePointer(test: Skippable): Promise<void> {
  const emulated = await browserCommands.emulateHoverCapability('none');
  const deadline = Date.now() + SETTLE_DEADLINE_MS;
  while (emulated && !matchMedia(COARSE).matches && Date.now() < deadline) {
    await nextFrame();
  }
  const coarse = matchMedia(COARSE).matches;
  if (MUST_EMULATE) {
    expect(emulated && coarse, 'Chromium did not emulate a coarse primary pointer').toBe(true);
  } else if (!coarse) {
    test.skip(`${navigator.userAgent} cannot emulate a coarse primary pointer`);
  }
}

/** Mount one ki-input per size and return each one's native control. */
async function mountFields(sizes: readonly string[]): Promise<HTMLInputElement[]> {
  const region = document.createElement('main');
  region.innerHTML = sizes
    .map((size) => `<ki-input label="Email" size="${size}"></ki-input>`)
    .join('');
  document.body.replaceChildren(region);
  await customElements.whenDefined('ki-input');
  const hosts = [...region.querySelectorAll('ki-input')];
  // The dist/components build has no componentOnReady: wait for the render.
  const deadline = Date.now() + SETTLE_DEADLINE_MS;
  while (hosts.some((host) => !host.shadowRoot?.querySelector('input')) && Date.now() < deadline) {
    await nextFrame();
  }
  await nextFrame();
  return hosts.map((host) => {
    const control = host.shadowRoot?.querySelector('input');
    if (control === null || control === undefined) throw new Error('no native input rendered');
    return control;
  });
}

const fontSize = (element: Element): number =>
  Number.parseFloat(getComputedStyle(element).fontSize);

beforeAll(() => {
  defineKiInput();
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = tokensCss;
  document.head.append(style);
});

// The emulation belongs to the Playwright page, which the next file of this
// setup shares: restore it whatever the test did.
afterEach(async () => {
  await browserCommands.emulateHoverCapability(null);
  document.body.replaceChildren();
});

afterAll(() => {
  document.getElementById(STYLE_ID)?.remove();
});

describe('sized text fields on a touch screen (spec 050)', () => {
  it('S16 on a touch screen a small field has 16px text and a large field keeps its 18px', async (context) => {
    await underCoarsePointer(context);
    const [extraSmall, extraLarge] = await mountFields(['xs', 'xl']);
    if (extraSmall === undefined || extraLarge === undefined)
      throw new Error('two fields expected');

    expect(fontSize(extraSmall)).toBe(16);
    expect(fontSize(extraLarge)).toBe(18);
  });
});
