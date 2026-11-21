// @spec:105-ki-top-nav
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineIconButton } from '../../../dist/components/ki-icon-button.js';
import { defineCustomElement } from '../../../dist/components/ki-top-nav.js';

const media = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineCustomElement();
  defineIconButton();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  await media.emulateHoverCapability(null);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S19: sizes the collapsed navigation trigger for a coarse pointer', async (test) => {
  if (!(await media.emulateHoverCapability('none'))) {
    if (navigator.userAgent.includes('Chrome/'))
      throw new Error('Chromium could not emulate a coarse pointer');
    test.skip('This browser cannot emulate a coarse primary pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  fixture.innerHTML =
    '<ki-top-nav style="inline-size: 21rem"><a href="#overview">Overview</a></ki-top-nav>';
  const trigger = page.getByRole('button', { name: 'Open navigation' });
  await expect.element(trigger).toBeVisible();
  const { width, height } = trigger.element().getBoundingClientRect();
  expect(Math.min(width, height)).toBeGreaterThanOrEqual(44);
});

// Integrator feedback 0.1.1, item 3: a collapsed bar laid edge to edge widened
// the page by a pixel. A button's status region sits 1px past its inline end,
// an icon button's touch target reaches 2px past its square on a coarse
// pointer, and the trigger grew to 44px while its landmark could shrink
// below it.
it('S2: a collapsed bar never reaches past its own box on a coarse pointer', async (test) => {
  if (!(await media.emulateHoverCapability('none'))) {
    if (navigator.userAgent.includes('Chrome/'))
      throw new Error('Chromium could not emulate a coarse pointer');
    test.skip('This browser cannot emulate a coarse primary pointer');
  }
  await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
  fixture.innerHTML = `<div style="inline-size: 22rem; overflow-x: auto">
    <ki-top-nav style="--ki-top-nav-padding-inline: 0">
      <a slot="brand" href="#home">Gate-Driven Development</a>
      <a href="#docs">Documentation</a>
      <a href="#guide">Guide</a>
      <a slot="actions" href="#es">Español</a>
      <ki-icon-button slot="actions" label="Switch theme"></ki-icon-button>
    </ki-top-nav>
  </div>`;
  const scroller = fixture.firstElementChild as HTMLElement;
  const trigger = page.getByRole('button', { name: 'Open navigation' });
  await expect.element(trigger).toBeVisible();
  await expect.element(page.getByRole('button', { name: 'Switch theme' })).toBeVisible();

  const host = scroller.querySelector('ki-top-nav');
  const nav = host?.shadowRoot?.querySelector('nav')?.getBoundingClientRect();
  const actions = host?.shadowRoot?.querySelector('.actions')?.getBoundingClientRect();
  const box = trigger.element().getBoundingClientRect();
  // The trigger keeps its whole target inside its landmark, clear of the actions.
  expect(box.left).toBeGreaterThanOrEqual((nav?.left ?? 0) - 0.5);
  expect(box.right).toBeLessThanOrEqual((nav?.right ?? 0) + 0.5);
  expect(box.right).toBeLessThanOrEqual(actions?.left ?? 0);
  // And nothing in the row widens the page.
  expect(scroller.scrollWidth).toBe(scroller.clientWidth);
});
