// @spec:082-ki-segmented-control
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineSegment } from '../../../dist/components/ki-segment.js';
import { defineCustomElement as defineGroup } from '../../../dist/components/ki-segmented-control.js';

const media = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
};
const style = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineGroup();
  defineSegment();
  style.textContent = tokensCss;
  document.head.append(style);
  document.body.append(fixture);
});

afterEach(async () => {
  await parkPointer();
  await media.emulateHoverCapability(null);
  fixture.replaceChildren();
  fixture.removeAttribute('data-ki-density');
});

afterAll(() => {
  fixture.remove();
  style.remove();
});

it('S11 uses touch targets for opt-in density while a coarse pointer alone keeps xs', async (context) => {
  const emulated = await media.emulateHoverCapability('none');
  const coarse = () => matchMedia('(pointer: coarse)').matches;
  if (navigator.userAgent.includes('Chrome/')) {
    expect(emulated).toBe(true);
    await expect.poll(coarse).toBe(true);
  } else if (!coarse()) {
    context.skip('This engine does not emulate a coarse primary pointer');
  }

  fixture.innerHTML = `<ki-segmented-control label="View" size="xs">
    <ki-segment value="list">List</ki-segment>
    <ki-segment value="board" aria-label="Board">
      <svg slot="start" aria-hidden="true" viewBox="0 0 16 16"><path d="M2 2h12v12H2z"/></svg>
    </ki-segment>
  </ki-segmented-control>`;
  await expect.element(page.getByRole('radio', { name: 'List' })).toBeChecked();
  const control = fixture.querySelector('ki-segmented-control');
  expect(control?.getBoundingClientRect().height).toBe(28);

  fixture.dataset.kiDensity = 'touch';

  const list = page.getByRole('radio', { name: 'List' }).element().getBoundingClientRect();
  const board = page.getByRole('radio', { name: 'Board' }).element().getBoundingClientRect();
  expect(list.width).toBeGreaterThanOrEqual(44);
  expect(list.height).toBeGreaterThanOrEqual(44);
  expect(board.width).toBeGreaterThanOrEqual(44);
  expect(board.height).toBeGreaterThanOrEqual(44);
});
