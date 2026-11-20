// @spec:073-ki-note
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-note.js';

const browser = commands as unknown as {
  emulateHoverCapability: (capability: 'none' | null) => Promise<boolean>;
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
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S12: coarse input leaves a small note compact and non-interactive', async ({ skip }) => {
  fixture.innerHTML = '<ki-note size="sm">Only owners can change billing.</ki-note>';
  const host = fixture.querySelector('ki-note');
  const renderedSurface = () => host?.shadowRoot?.querySelector('[part="note"]');
  await expect.poll(renderedSurface).toBeInstanceOf(HTMLElement);
  const surface = renderedSurface();
  if (!surface) throw new Error('Expected the note surface');
  const metrics = () => {
    const css = getComputedStyle(surface);
    return [css.fontSize, css.paddingBlockStart, css.paddingInlineStart, css.blockSize];
  };
  const original = metrics();

  const emulated = await browser.emulateHoverCapability('none');
  const coarse = () => matchMedia('(pointer: coarse)').matches;
  if (navigator.userAgent.includes('Chrome/')) {
    expect(emulated).toBe(true);
    await expect.poll(coarse).toBe(true);
  } else if (!coarse()) {
    skip('This browser cannot emulate a coarse primary pointer');
  }
  fixture.setAttribute('data-ki-density', 'touch');
  expect(metrics()).toEqual(original);
  expect(surface.querySelector('a, button, input, [tabindex]')).toBeNull();
});
