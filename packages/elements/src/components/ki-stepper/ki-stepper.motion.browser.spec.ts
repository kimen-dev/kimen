// @spec:092-ki-stepper
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineStep } from '../../../dist/components/ki-step.js';
import { defineCustomElement } from '../../../dist/components/ki-stepper.js';

const browser = commands as unknown as {
  emulateReducedMotion: (value: 'reduce' | 'no-preference' | null) => Promise<void>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineStep();
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  await browser.emulateReducedMotion(null);
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S11 moves the current state without animation under reduced motion', async () => {
  await browser.emulateReducedMotion('reduce');
  expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
  fixture.innerHTML = `
    <ki-stepper label="Setup progress" orientation="vertical">
      <ki-step state="current">Account</ki-step><ki-step>Invite</ki-step>
    </ki-stepper>
  `;
  const items = page.getByRole('listitem');
  await expect.element(items.nth(0)).toHaveAttribute('aria-current', 'step');
  const [account, invite] = fixture.querySelectorAll('ki-step');

  account?.setAttribute('state', 'done');
  invite?.setAttribute('state', 'current');

  await expect.element(items.nth(1)).toHaveAttribute('aria-current', 'step');
  await expect.element(items.nth(0)).not.toHaveAttribute('aria-current');
  expect(page.getByRole('list').element().getAnimations({ subtree: true })).toHaveLength(0);
});
