import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { defineCustomElement as defineCounter } from '../dist/components/ki-counter.js';
import { defineCustomElement as defineIconButton } from '../dist/components/ki-icon-button.js';
import { parkPointer } from './axe';

const browserCommands = commands as unknown as {
  emulateHoverCapability: (capability: 'none' | null) => Promise<boolean>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineCounter();
  defineIconButton();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  await browserCommands.emulateHoverCapability(null);
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('keeps the indicator compact and the touch target independent of the counter', async (test) => {
  if (!(await browserCommands.emulateHoverCapability('none'))) {
    if (navigator.userAgent.includes('Chrome/')) {
      throw new Error('Chromium did not emulate a coarse primary pointer');
    }
    test.skip('This browser cannot emulate a coarse primary pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  fixture.innerHTML = `<ki-icon-button label="Plain" size="xs"></ki-icon-button>
    <ki-icon-button label="Notifications, 3 unread" size="xs">
      <ki-counter slot="counter" value="3"></ki-counter>
    </ki-icon-button>`;
  await expect.element(page.getByRole('button', { name: 'Plain' })).toBeVisible();
  await expect.element(page.getByText('3', { exact: true })).toBeVisible();

  const plain = fixture
    .querySelector('ki-icon-button[label="Plain"]')
    ?.shadowRoot?.querySelector('button');
  const trigger = fixture
    .querySelector('ki-icon-button[label^="Notifications"]')
    ?.shadowRoot?.querySelector('button');
  const counter = fixture.querySelector('ki-counter');
  if (!plain || !trigger || !counter) throw new Error('Missing touch fixture');

  expect(getComputedStyle(trigger, '::before').inlineSize).toBe(
    getComputedStyle(plain, '::before').inlineSize,
  );
  expect(trigger.getBoundingClientRect().width).toBe(plain.getBoundingClientRect().width);
  expect(counter.getBoundingClientRect().height).toBeLessThan(
    trigger.getBoundingClientRect().height,
  );
  expect(getComputedStyle(counter).pointerEvents).toBe('none');
});
