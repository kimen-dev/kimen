// @spec:075-ki-chip
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { defineAllComponents } from '../../../browser-tests/all-components';
import { parkPointer } from '../../../browser-tests/axe';

const { emulateReducedMotion } = commands as unknown as {
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(async () => {
  await emulateReducedMotion('reduce');
  // expect.poll only runs inside a test, so wait for the media query here.
  for (
    let frame = 0;
    frame < 60 && !matchMedia('(prefers-reduced-motion: reduce)').matches;
    frame += 1
  ) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    throw new Error('reduced motion did not apply');
  }
  defineAllComponents();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  await parkPointer();
  fixture.replaceChildren();
});

afterAll(async () => {
  fixture.remove();
  styles.remove();
  await emulateReducedMotion(null);
});

it('S11 uses the themed selected fill without a transition under reduced motion', async () => {
  fixture.innerHTML = '<ki-chip style="--ki-chip-selected-bg: rgb(20, 40, 60)">Design</ki-chip>';
  const filter = page.getByRole('button', { name: 'Design' });
  await expect.element(filter).toHaveAttribute('aria-pressed', 'false');
  const button = filter.element();
  expect(getComputedStyle(button).transitionDuration).toBe('0s');

  await filter.click();

  await expect.element(filter).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => getComputedStyle(button).backgroundColor).toBe('rgb(20, 40, 60)');
  expect(getComputedStyle(button).transitionDuration).toBe('0s');
});
