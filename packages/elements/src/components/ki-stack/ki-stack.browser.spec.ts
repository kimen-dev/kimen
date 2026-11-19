// @spec:074-ki-stack-grid
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineGrid } from '../../../dist/components/ki-grid.js';
import { defineCustomElement as defineStack } from '../../../dist/components/ki-stack.js';

const style = document.createElement('style');
const fixture = document.createElement('main');
const browserCommands = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
};

beforeAll(() => {
  defineGrid();
  defineStack();
  style.textContent = tokensCss;
  fixture.id = 'layout-accessibility';
  document.head.append(style);
  document.body.append(fixture);
});

afterEach(async () => {
  await parkPointer();
  fixture.replaceChildren();
  fixture.removeAttribute('dir');
  fixture.removeAttribute('style');
});
afterAll(() => {
  fixture.remove();
  style.remove();
});

function mount(markup: string): HTMLElement {
  fixture.innerHTML = markup;
  return fixture.firstElementChild as HTMLElement;
}

const tiles =
  '<div style="inline-size:96px;block-size:32px">First</div><div style="inline-size:96px;block-size:32px">Second</div>';
const bounds = (el: Element | null) => (el as HTMLElement).getBoundingClientRect();
const gapY = (el: HTMLElement) =>
  bounds(el.lastElementChild).top - bounds(el.firstElementChild).bottom;

it('S1 starts with column layout and switches to row in source order', async () => {
  const stack = mount(`<ki-stack>${tiles}</ki-stack>`);
  await expect.poll(() => gapY(stack)).toBeGreaterThan(0);

  stack.setAttribute('direction', 'row');

  await expect
    .poll(() => bounds(stack.firstElementChild).top)
    .toBe(bounds(stack.lastElementChild).top);
  expect(bounds(stack.firstElementChild).right).toBeLessThan(bounds(stack.lastElementChild).left);
});

it('S2 gives a growing child the available space and wraps at the host width', async () => {
  const stack = mount(
    `<ki-stack style="inline-size:400px" direction="row" gap="zero" wrap>${tiles}</ki-stack>`,
  );
  stack.firstElementChild?.setAttribute('data-grow', '');
  await expect.poll(() => bounds(stack.firstElementChild).width).toBe(304);
  expect(bounds(stack.firstElementChild).top).toBe(bounds(stack.lastElementChild).top);

  stack.style.inlineSize = '150px';

  await expect.poll(() => bounds(stack.firstElementChild).width).toBe(150);
  expect(bounds(stack.lastElementChild).top).toBe(bounds(stack.firstElementChild).bottom);
});

it('gives a growing column child room within a definite host block size', async () => {
  const stack = mount(`<ki-stack style="block-size:120px" gap="zero">${tiles}</ki-stack>`);
  stack.firstElementChild?.setAttribute('data-grow', '');

  await expect.poll(() => bounds(stack.firstElementChild).height).toBe(88);
  expect(bounds(stack.lastElementChild).bottom).toBe(bounds(stack).bottom);
});

it('aligns a row on the cross axis and distributes space on the main axis', async () => {
  const stack = mount(
    '<ki-stack style="inline-size:300px" direction="row" align="center" justify="between"><div style="block-size:50px">Tall</div><div style="block-size:20px">Short</div></ki-stack>',
  );

  await expect.poll(() => bounds(stack.lastElementChild).right).toBe(bounds(stack).right);
  expect(bounds(stack.lastElementChild).top - bounds(stack.firstElementChild).top).toBe(15);
});

it('S5 keeps the visual RTL sequence and keyboard focus sequence in source order', async () => {
  fixture.dir = 'rtl';
  const stack = mount(
    '<ki-stack direction="row"><input aria-label="Alpha"><input aria-label="Bravo"></ki-stack><ki-grid min-column="8rem"><input aria-label="Charlie"><input aria-label="Delta"></ki-grid>',
  );
  const grid = stack.nextElementSibling as HTMLElement;
  await expect
    .poll(() => bounds(stack.firstElementChild).left)
    .toBeGreaterThan(bounds(stack.lastElementChild).left);
  await expect
    .poll(() => bounds(grid.firstElementChild).left)
    .toBeGreaterThan(bounds(grid.lastElementChild).left);
  expect(bounds(grid.firstElementChild).top).toBe(bounds(grid.lastElementChild).top);

  await userEvent.tab();
  expect(document.activeElement).toBe(stack.firstElementChild);
  await userEvent.tab();
  expect(document.activeElement).toBe(stack.lastElementChild);
  await userEvent.tab();
  expect(document.activeElement).toBe(grid.firstElementChild);
  await userEvent.tab();
  expect(document.activeElement).toBe(grid.lastElementChild);
});

it('S6 exposes the controls in the accessibility tree without layout roles or focus stops', async () => {
  const stack = mount(
    '<ki-stack><button type="button">Save</button></ki-stack><ki-grid><button type="button">Cancel</button></ki-grid>',
  );
  const grid = stack.nextElementSibling as HTMLElement;
  await expect.poll(() => bounds(grid.firstElementChild).height).toBeGreaterThan(0);

  const snapshot = await browserCommands.ariaSnapshot('#layout-accessibility');

  expect(snapshot).toContain('button "Save"');
  expect(snapshot).toContain('button "Cancel"');
  expect(snapshot).not.toMatch(/- (grid|row|group|region)\b/u);
  expect(stack.tabIndex).toBe(-1);
  expect(grid.tabIndex).toBe(-1);
  await expectAccessible(fixture);
});

it('S7 and S9 use the theme spacing step and keep defaults for a raw gap', async () => {
  const stack = mount(
    `<ki-stack gap="sm">${tiles}</ki-stack><ki-grid gap="sm" style="inline-size:120px">${tiles}</ki-grid>`,
  );
  const grid = stack.nextElementSibling as HTMLElement;

  fixture.style.setProperty('--ki-layout-spacing-sm', '23px');
  await expect.poll(() => [gapY(stack), gapY(grid)]).toEqual([23, 23]);

  stack.setAttribute('gap', '24px');
  grid.setAttribute('gap', '24px');
  await expect.poll(() => [gapY(stack), gapY(grid)]).toEqual([8, 12]);
});

it('keeps an inner stack’s default gap within a stack using a different step', async () => {
  const stack = mount(
    `<ki-stack gap="zero"><ki-stack>${tiles}</ki-stack><div>Third</div></ki-stack>`,
  );
  const nested = stack.firstElementChild as HTMLElement;

  await expect.poll(() => gapY(nested)).toBe(8);
  expect(gapY(stack)).toBe(0);
});
