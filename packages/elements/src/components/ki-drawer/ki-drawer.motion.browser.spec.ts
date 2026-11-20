// @spec:103-ki-drawer
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-drawer.js';

const browser = commands as unknown as {
  emulateReducedMotion: (mode: 'reduce' | null) => Promise<void>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(async () => {
  await browser.emulateReducedMotion('reduce');
  defineCustomElement();
  styles.textContent = `${tokensCss}\nki-drawer::part(dialog) { animation-play-state: paused; }`;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(async () => {
  await browser.emulateReducedMotion(null);
  fixture.remove();
  styles.remove();
});

it('S11 fades at the final edge when the user prefers reduced motion', async () => {
  fixture.innerHTML = '<ki-drawer heading="Edit incident" open><p>Incident details</p></ki-drawer>';
  expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
  await expect.element(page.getByRole('dialog', { name: 'Edit incident' })).toBeInTheDocument();
  const dialog = fixture.querySelector('ki-drawer')?.shadowRoot?.querySelector('dialog');
  if (!dialog) throw new Error('Drawer surface is missing');

  const [entrance] = dialog.getAnimations();
  if (!(entrance?.effect instanceof KeyframeEffect))
    throw new Error('Drawer did not fade on entry');
  const [first, last] = entrance.effect.getKeyframes();
  expect(first?.opacity).toBe('0');
  expect(last?.opacity).toBe('1');
  expect(first?.translate).toBeUndefined();
  expect(first?.transform).toBeUndefined();
  expect(Math.abs(dialog.getBoundingClientRect().right - window.innerWidth)).toBeLessThan(0.5);
});
