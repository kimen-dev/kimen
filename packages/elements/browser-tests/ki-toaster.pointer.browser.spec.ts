// @spec:049-ki-toast
// The toaster's placement on a narrow touch screen. Emulating a device
// without a hovering pointer changes the page's input device through CDP,
// which headless Linux does not reliably restore, so this spec runs in the
// isolated pointer-capability project and never next to hover contracts.
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { defineCustomElement as defineKiToast } from '../dist/components/ki-toast.js';
import { defineCustomElement as defineKiToaster } from '../dist/components/ki-toaster.js';
import { parkPointer } from './axe';

const STYLE_ID = 'ki-toaster-pointer-token-style';
const NARROW_VIEWPORT = { height: 896, width: 414 };
const INSET = 16;

const browserCommands = commands as unknown as {
  emulateHoverCapability: (capability: 'hover' | 'none' | null) => Promise<boolean>;
};

beforeAll(() => {
  defineKiToast();
  defineKiToaster();
});

afterEach(async () => {
  document.body.replaceChildren();
  await parkPointer();
});

function ensureTokens(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = tokensCss;
  document.head.append(style);
}

async function frames(count = 6): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

it('S17 sits at the bottom center on a narrow touch screen', async (test) => {
  await page.viewport(NARROW_VIEWPORT.width, NARROW_VIEWPORT.height);
  if (!(await browserCommands.emulateHoverCapability('none'))) {
    test.skip('this engine cannot emulate a touch screen');
  }
  try {
    expect(matchMedia('(pointer: coarse)').matches).toBe(true);
    ensureTokens();
    const toaster = document.createElement('ki-toaster');
    toaster.setAttribute('placement', 'top-end');
    const toast = document.createElement('ki-toast');
    toast.setAttribute('duration', '0');
    toast.textContent = 'Draft saved';
    toaster.append(toast);
    document.body.append(toaster);
    await customElements.whenDefined('ki-toaster');
    await customElements.whenDefined('ki-toast');
    await frames();

    const stack = toaster.shadowRoot?.querySelector<HTMLElement>('[part~="stack"]');
    expect(stack, 'missing part stack').toBeInstanceOf(HTMLElement);
    const rect = stack?.getBoundingClientRect() ?? new DOMRect();
    const height = document.documentElement.clientHeight;
    const width = document.documentElement.clientWidth;
    expect(rect.height, 'the stack has a box').toBeGreaterThan(0);
    expect(height - rect.bottom, 'distance from the bottom').toBeCloseTo(INSET, 0);
    expect((rect.left + rect.right) / 2, 'centered').toBeCloseTo(width / 2, 0);
  } finally {
    await browserCommands.emulateHoverCapability(null);
  }
});
