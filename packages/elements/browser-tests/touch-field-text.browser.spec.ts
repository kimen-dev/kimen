// @spec:048-touch-field-text
// Text fields large enough for a touch screen (issue #320).
//
// Safari on iOS zooms the page into a focused text field whose text is under
// 16px, and leaves it zoomed. Under a coarse primary pointer the native text
// of ki-input and ki-textarea is at least 16px; with a fine pointer it keeps
// its size, and the label and help text never change.
//
// A coarse pointer can only be emulated where CDP exists: Chromium's touch
// emulation, behind the `emulateHoverCapability` command, which also moves the
// primary pointer to coarse. This file shares the isolated input-device setup
// with pointer-capability.browser.spec.ts (vitest.browser.config.ts) because
// that emulation is page-level. On Chromium a failed emulation is a failure;
// elsewhere the coarse-pointer cases skip aloud and the rule stays plain CSS.
import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { defineCustomElement as defineKiInput } from '../dist/components/ki-input.js';
import { defineCustomElement as defineKiTextarea } from '../dist/components/ki-textarea.js';

const browserCommands = commands as unknown as {
  emulateHoverCapability: (capability: 'hover' | 'none' | null) => Promise<boolean>;
};

type Field = 'ki-input' | 'ki-textarea';
type Theme = 'onmars' | 'material3';
type Control = HTMLInputElement | HTMLTextAreaElement;
interface Skippable {
  skip: (note?: string) => void;
}

const STYLESHEETS = [
  ['touch-field-text-tokens', tokensCss],
  ['touch-field-text-material3', material3Css],
] as const;
const SETTLE_DEADLINE_MS = 2000;
const COARSE = '(pointer: coarse)';
/** The engine of the PR gate: an emulation that does not apply there is a failure, not a skip. */
const MUST_EMULATE = navigator.userAgent.includes('Chrome/');

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

/**
 * Emulate a touch screen and wait until the page reports a coarse primary
 * pointer: CDP acknowledges before the page re-evaluates its media queries.
 */
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

/** Lift any touch emulation and wait until the primary pointer is no longer coarse. */
async function withoutCoarsePointer(): Promise<void> {
  await browserCommands.emulateHoverCapability('hover');
  const deadline = Date.now() + SETTLE_DEADLINE_MS;
  while (matchMedia(COARSE).matches && Date.now() < deadline) {
    await nextFrame();
  }
  expect(matchMedia(COARSE).matches, 'the primary pointer is still coarse').toBe(false);
}

async function mount(
  field: Field,
  theme: Theme,
  attributes = '',
  regionStyle = '',
): Promise<{ host: HTMLElement; control: Control }> {
  const region = document.createElement('main');
  if (theme === 'material3') {
    region.setAttribute('data-ki-theme', 'material3');
  }
  region.setAttribute('style', regionStyle);
  region.innerHTML = `<${field} label="Email" ${attributes}></${field}>`;
  document.body.replaceChildren(region);
  const host = region.querySelector<HTMLElement>(field);
  if (host === null) {
    throw new Error(`${field} did not mount`);
  }
  await customElements.whenDefined(field);
  // The dist/components build has no componentOnReady: wait for the render.
  const selector = field === 'ki-input' ? 'input' : 'textarea';
  const deadline = Date.now() + SETTLE_DEADLINE_MS;
  while (!host.shadowRoot?.querySelector(selector) && Date.now() < deadline) {
    await nextFrame();
  }
  await nextFrame();
  const control = host.shadowRoot?.querySelector<Control>(selector);
  if (control === null || control === undefined) {
    throw new Error(`${field} rendered no native text control`);
  }
  return { host, control };
}

function part(host: HTMLElement, name: string): HTMLElement {
  const node = host.shadowRoot?.querySelector<HTMLElement>(`[part="${name}"]`);
  if (node === null || node === undefined) {
    throw new Error(`missing part ${name}`);
  }
  return node;
}

const fontSize = (element: Element): number =>
  Number.parseFloat(getComputedStyle(element).fontSize);

beforeAll(() => {
  defineKiInput();
  defineKiTextarea();
  for (const [id, css] of STYLESHEETS) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.append(style);
  }
});

// The emulation belongs to the Playwright page, which the next file of this
// setup shares: restore it whatever the test did.
afterEach(async () => {
  await browserCommands.emulateHoverCapability(null);
  document.body.replaceChildren();
});

afterAll(() => {
  for (const [id] of STYLESHEETS) {
    document.getElementById(id)?.remove();
  }
});

describe('text fields on a touch screen (spec 048)', () => {
  it.for([
    ['onmars', 'ki-input'],
    ['onmars', 'ki-textarea'],
    ['material3', 'ki-input'],
    ['material3', 'ki-textarea'],
  ] as const)(
    'S1 on a touch screen the text of a %s %s is at least 16 pixels',
    async ([theme, field], context) => {
      await underCoarsePointer(context);
      const { control } = await mount(field, theme);

      control.focus();

      expect(fontSize(control)).toBeGreaterThanOrEqual(16);
    },
  );

  it('S2 with a mouse or a trackpad a text field keeps its standard text size', async () => {
    await withoutCoarsePointer();
    const { control } = await mount('ki-input', 'onmars');

    control.focus();

    expect(fontSize(control)).toBe(13);
  });

  it('S3 the label and the help text keep their size on a touch screen', async (context) => {
    const attributes = 'help-text="We never share it"';
    await withoutCoarsePointer();
    const fine = await mount('ki-input', 'onmars', attributes);
    const standard = [fontSize(part(fine.host, 'label')), fontSize(part(fine.host, 'help'))];

    await underCoarsePointer(context);
    const coarse = await mount('ki-input', 'onmars', attributes);
    coarse.control.focus();

    // The field text did take the touch size, so the comparison below is
    // made on the device it claims to be about.
    expect(fontSize(coarse.control)).toBeGreaterThanOrEqual(16);
    expect([fontSize(part(coarse.host, 'label')), fontSize(part(coarse.host, 'help'))]).toEqual(
      standard,
    );
  });

  it('S4 reassigning the touch text size restyles the field on a touch screen', async (context) => {
    await underCoarsePointer(context);
    const { control } = await mount('ki-input', 'onmars', '', '--ki-input-font-size-touch: 20px');

    control.focus();

    expect(fontSize(control)).toBe(20);
  });
});
