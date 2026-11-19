// @spec:074-ki-stack-grid
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-grid.js';

const fixture = document.createElement('main');
const style = document.createElement('style');
const browserCommands = commands as unknown as {
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
};
const items =
  '<div data-span="2">First</div><div>Second</div><div data-span="2">Third</div><div>Fourth</div>';

beforeAll(() => {
  defineCustomElement();
  style.textContent = tokensCss;
  document.head.append(style);
  document.body.append(fixture);
});
afterEach(async () => {
  await parkPointer();
  await browserCommands.emulateReducedMotion(null);
  fixture.replaceChildren();
});
afterAll(() => {
  fixture.remove();
  style.remove();
});

function mount(attributes: string, content = items): HTMLElement {
  fixture.innerHTML = `<ki-grid ${attributes}>${content}</ki-grid>`;
  return fixture.firstElementChild as HTMLElement;
}

const item = (grid: HTMLElement, index: number) =>
  (grid.children[index] as HTMLElement).getBoundingClientRect();

it('S3 uses fixed equal columns and collapses the span below 30rem of host width', async () => {
  const grid = mount('columns="3" min-column="100rem" gap="zero" style="inline-size:30rem"');
  await expect.poll(() => item(grid, 0).width).toBe(320);
  expect(item(grid, 1).width).toBe(160);
  expect(item(grid, 1).top).toBe(item(grid, 0).top);

  grid.style.inlineSize = '29rem';

  await expect.poll(() => item(grid, 0).width).toBe(464);
  expect(item(grid, 1).width).toBe(464);
  expect(item(grid, 3).top).toBeGreaterThan(item(grid, 2).top);
  expect(grid.scrollWidth).toBe(grid.clientWidth);
});

it('S4 auto-fills tracks, spans two when they fit and preserves sparse source order', async () => {
  const grid = mount('min-column="8rem" gap="zero" style="inline-size:8rem"');
  await expect.poll(() => item(grid, 0).width).toBe(128);
  expect(item(grid, 1).top).toBeGreaterThan(item(grid, 0).top);

  grid.style.inlineSize = '24rem';

  await expect.poll(() => item(grid, 0).width).toBe(256);
  expect(item(grid, 1).width).toBe(128);
  expect(item(grid, 2).top).toBe(item(grid, 3).top);
  expect(item(grid, 3).left).toBeGreaterThan(item(grid, 2).left);

  grid.setAttribute('min-column', '12rem');

  await expect.poll(() => item(grid, 0).width).toBe(384);
  expect(item(grid, 3).top).toBeGreaterThan(item(grid, 2).top);
});

it('uses the default minimum for a length that is invalid in a track', async () => {
  const grid = mount(
    'min-column="auto" gap="zero" style="inline-size:30rem"',
    '<div>First</div><div>Second</div>',
  );
  await expect.poll(() => item(grid, 0).width).toBe(240);
  expect(item(grid, 0).top).toBe(item(grid, 1).top);
});

it('reflows immediately without motion when the user requests reduced motion', async () => {
  await browserCommands.emulateReducedMotion('reduce');
  const grid = mount('columns="2" gap="zero" style="inline-size:32rem"');
  await expect.poll(() => item(grid, 1).width).toBe(256);
  expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);

  grid.style.inlineSize = '16rem';

  await expect.poll(() => item(grid, 1).top).toBeGreaterThan(item(grid, 0).top);
  expect(grid.getAnimations({ subtree: true })).toHaveLength(0);
});
