// @spec:080-ki-popover
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineButton } from '../../../dist/components/ki-button.js';
import { defineCustomElement as definePopover } from '../../../dist/components/ki-popover.js';

const style = document.createElement('style');
const fixture = document.createElement('main');
const browserCommands = commands as unknown as {
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
};
const search = '<label>Search <input name="search" value="status:open"></label>';

beforeAll(() => {
  defineButton();
  definePopover();
  style.textContent = tokensCss;
  fixture.style.cssText = 'background: var(--ki-surface-s0); padding: 48px;';
  document.head.append(style);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('dir');
  fixture.removeAttribute('data-ki-density');
  document.documentElement.style.removeProperty('--ki-surface-raised');
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  style.remove();
});

async function mount(content = 'Open incidents', attributes = '') {
  fixture.innerHTML = `
    <ki-button id="filters" type="button" variant="secondary">Filters</ki-button>
    <ki-popover for="filters" label="Incident filters" ${attributes}>${content}</ki-popover>
    <button type="button">Next</button>
  `;
  const popover = required(fixture, 'ki-popover') as HTMLElement & { open: boolean };
  const trigger = page.getByRole('button', { name: 'Filters' });
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  return { popover, trigger };
}

function dialog() {
  return page.getByRole('dialog', { name: 'Incident filters' });
}

function required(root: ParentNode, selector: string): HTMLElement {
  const node = root.querySelector(selector);
  if (!(node instanceof HTMLElement)) throw new Error(`Missing fixture element: ${selector}`);
  return node;
}

function part(name: string): HTMLElement {
  const root = required(fixture, 'ki-popover').shadowRoot;
  if (!root) throw new Error('The popover has no shadow root');
  return required(root, `[part="${name}"]`);
}

function surface() {
  return part('surface');
}

it('S1 opens beside its trigger, expands it, and reports one open', async () => {
  const { popover, trigger } = await mount();
  const opened = vi.fn();
  popover.addEventListener('ki-open', opened);

  await trigger.click();

  await expect.element(dialog()).toBeVisible();
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(popover.open).toBe(true);
  expect(surface().getBoundingClientRect().top).toBeGreaterThan(
    required(fixture, '#filters').getBoundingClientRect().bottom,
  );
  expect(opened).toHaveBeenCalledTimes(1);
});

it('S2 dismisses natively on an outside click and leaves outside focus available', async () => {
  const { popover, trigger } = await mount(search);
  const closed = vi.fn();
  popover.addEventListener('ki-close', closed);
  await trigger.click();
  const next = page.getByRole('button', { name: 'Next' });

  await next.click();

  await expect.element(dialog()).not.toBeVisible();
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(popover.open).toBe(false);
  expect(closed).toHaveBeenCalledTimes(1);
});

it('S3 focuses a wrapped control on keyboard opening', async () => {
  const { trigger } = await mount(search);

  trigger.element().focus();
  await userEvent.keyboard('{Enter}');

  await expect.element(page.getByRole('textbox', { name: 'Search' })).toHaveFocus();
});

it('S4 Escape restores trigger focus even after application-driven opening', async () => {
  const { popover, trigger } = await mount(search);
  popover.open = true;
  await expect.element(page.getByRole('textbox', { name: 'Search' })).toHaveFocus();

  await userEvent.keyboard('{Escape}');

  await expect.element(dialog()).not.toBeVisible();
  await expect.element(trigger).toHaveFocus();
});

it('S5 Tab reaches the next control on the page', async () => {
  const { trigger } = await mount(search);
  await trigger.click();
  await expect.element(page.getByRole('textbox', { name: 'Search' })).toHaveFocus();

  await userEvent.keyboard('{Tab}');

  await expect.element(page.getByRole('button', { name: 'Next' })).toHaveFocus();
});

it('S6 exposes the named non-modal dialog and passes axe', async () => {
  const { trigger } = await mount(search);
  await trigger.click();

  await expect.element(dialog()).toBeVisible();
  await expect.element(dialog()).not.toHaveAttribute('aria-modal', 'true');
  await expect.element(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
  await expectAccessible(fixture);
});

it('S7 updates a persistent status region and retains keyboard focus', async () => {
  const { trigger } = await mount('Logs are kept for 30 days.', 'kind="toggletip"');
  const status = page.getByRole('status');
  await expect.element(status).toHaveTextContent('');
  trigger.element().focus();

  await userEvent.keyboard(' ');

  await expect.element(status).toHaveTextContent('Logs are kept for 30 days.');
  await expect.element(trigger).toHaveFocus();
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
});

it('S8 flips above a bottom-edge trigger and keeps the arrow on the facing edge', async () => {
  const { trigger } = await mount();
  const anchor = required(fixture, '#filters');
  anchor.style.cssText = 'position: fixed; inset-block-end: 0; inset-inline-start: 48px;';
  await trigger.click();

  await expect.element(dialog()).toBeVisible();
  expect(surface().getBoundingClientRect().bottom).toBeLessThan(anchor.getBoundingClientRect().top);
  const arrow = part('arrow');
  expect(arrow.getBoundingClientRect().bottom).toBeGreaterThan(
    surface().getBoundingClientRect().bottom,
  );
});

it('S9 follows an override of the semantic surface', async () => {
  document.documentElement.style.setProperty('--ki-surface-raised', 'rgb(240, 246, 252)');
  const { trigger } = await mount();

  await trigger.click();

  await expect.element(dialog()).toBeVisible();
  expect(getComputedStyle(surface()).backgroundColor).toBe('rgb(240, 246, 252)');
});

it('S10 aligns at RTL inline-start and keeps a visible border without motion', async (test) => {
  fixture.dir = 'rtl';
  await browserCommands.emulateReducedMotion('reduce');
  await browserCommands.emulateForcedColors('active');
  try {
    if (
      !matchMedia('(forced-colors: active)').matches &&
      !navigator.userAgent.includes('Chrome/')
    ) {
      test.skip('This engine does not emulate forced colours');
    }
    expect(matchMedia('(forced-colors: active)').matches).toBe(true);
    expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    const { trigger } = await mount();
    await trigger.click();

    await expect.element(dialog()).toBeVisible();
    expect(surface().getBoundingClientRect().right).toBeCloseTo(
      required(fixture, '#filters').getBoundingClientRect().right,
      0,
    );
    const paint = getComputedStyle(surface());
    expect(Number.parseFloat(paint.borderInlineStartWidth)).toBeGreaterThan(0);
    expect(paint.borderInlineStartColor).not.toBe(paint.backgroundColor);
    expect(surface().getAnimations()).toHaveLength(0);
  } finally {
    await browserCommands.emulateForcedColors(null);
    await browserCommands.emulateReducedMotion(null);
  }
});

it('S11 reflects application-driven open and close with one event per transition', async () => {
  const { popover, trigger } = await mount();
  const opened = vi.fn();
  const closed = vi.fn();
  popover.addEventListener('ki-open', opened);
  popover.addEventListener('ki-close', closed);

  popover.open = true;

  await expect.element(dialog()).toBeVisible();
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(opened).toHaveBeenCalledTimes(1);
  popover.open = false;
  await expect.element(dialog()).not.toBeVisible();
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(closed).toHaveBeenCalledTimes(1);
});

it('S12 lets the slotted form submit its own data', async () => {
  const { popover, trigger } = await mount(
    `<form>${search}<button type="submit">Apply</button></form>`,
  );
  const form = popover.querySelector('form');
  if (!form) throw new Error('The popover has no form');
  const submit = vi.fn((event: SubmitEvent) => {
    event.preventDefault();
    return [...new FormData(form).entries()];
  });
  form.addEventListener('submit', submit);
  await trigger.click();

  await page.getByRole('button', { name: 'Apply' }).click();

  expect(submit).toHaveReturnedWith([['search', 'status:open']]);
});

it('S13 a second pointer activation closes the same popover', async () => {
  const { popover, trigger } = await mount(search);
  const closed = vi.fn();
  popover.addEventListener('ki-close', closed);
  await trigger.click();
  await expect.element(dialog()).toBeVisible();

  await trigger.click();

  await expect.element(dialog()).not.toBeVisible();
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(closed).toHaveBeenCalledTimes(1);
});
