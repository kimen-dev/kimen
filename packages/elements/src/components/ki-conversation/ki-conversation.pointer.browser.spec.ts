// @spec:115-ki-conversation
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-conversation.js';

const style = document.createElement('style');
const fixture = document.createElement('main');
const browserCommands = commands as unknown as {
  emulateHoverCapability: (capability: 'none' | null) => Promise<boolean>;
};

beforeAll(() => {
  defineCustomElement();
  style.textContent = tokensCss;
  document.head.append(style);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  await browserCommands.emulateHoverCapability(null);
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  style.remove();
});

it('S15 gives the jump control a touch-sized hit target', async (test) => {
  if (!(await browserCommands.emulateHoverCapability('none'))) {
    test.skip('this engine cannot emulate a coarse pointer');
  }
  expect(matchMedia('(pointer: coarse)').matches).toBe(true);
  fixture.innerHTML = `
    <ki-conversation stick-to-bottom style="block-size:180px">
      <div style="min-block-size:400px">Earlier messages</div>
    </ki-conversation>
  `;
  await expect.element(page.getByRole('log')).toBeVisible();
  const viewport = fixture
    .querySelector('ki-conversation')
    ?.shadowRoot?.querySelector<HTMLElement>('[part="log"]');
  if (!viewport) throw new Error('The conversation log part is missing');
  await expect.poll(() => viewport.scrollTop).toBeGreaterThan(0);
  viewport.scrollTop = 0;

  const jump = page.getByRole('button', { name: 'Jump to latest' });
  await expect.element(jump).toBeVisible();
  const bounds = jump.element().getBoundingClientRect();
  expect(bounds.width).toBeGreaterThanOrEqual(44);
  expect(bounds.height).toBeGreaterThanOrEqual(44);
});
