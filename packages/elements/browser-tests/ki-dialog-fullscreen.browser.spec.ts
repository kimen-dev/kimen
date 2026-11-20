// @spec:126-fullscreen-dialog
import tokensCss from '@kimen/tokens/css?raw';
import material3Css from '@kimen/tokens/css/material3?raw';
import { afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-dialog.js';
import { expectAccessible, parkPointer } from './axe';

const browserCommands = commands as unknown as {
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
};

const heading = 'New event';
const modal = () => page.getByRole('dialog', { name: heading });
const field = () => page.getByRole('textbox', { name: 'Title' });
const confirm = () => page.getByRole('button', { name: 'Save' });
const dismiss = () => page.getByRole('button', { name: 'Discard and close' });
const trigger = () => page.getByRole('button', { name: 'Add event' });

type TestDialog = HTMLElement & { open: boolean; show: () => Promise<void> };

beforeAll(() => {
  defineCustomElement();
  const style = document.createElement('style');
  style.textContent = `${tokensCss}\n${material3Css}`;
  document.head.append(style);
});

afterEach(async () => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
  await page.viewport(414, 896);
  await parkPointer();
});

function mount(mode?: string, confirmLabel?: string): TestDialog {
  const opener = document.createElement('button');
  opener.textContent = 'Add event';
  opener.tabIndex = 0;
  const dialog = document.createElement('ki-dialog') as TestDialog;
  dialog.setAttribute('heading', heading);
  dialog.setAttribute('close-label', 'Discard and close');
  if (mode !== undefined) dialog.setAttribute('fullscreen', mode);
  if (confirmLabel !== undefined) dialog.setAttribute('confirm-label', confirmLabel);
  dialog.innerHTML = '<form><label>Title <input tabindex="0" value="Design review"></label></form>';
  opener.addEventListener('click', () => void dialog.show());
  document.body.append(opener, dialog);
  return dialog;
}

async function openDialog(): Promise<void> {
  // Explicit focus models a keyboard invoker across engines, including WebKit.
  (trigger().element() as HTMLElement).focus();
  await userEvent.keyboard('{Enter}');
  await expect.element(modal()).toBeVisible();
}

function part(dialog: TestDialog, name: string): HTMLElement {
  const element = dialog.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`);
  if (!element) throw new Error(`Missing dialog part ${name}`);
  return element;
}

function fillsViewport(dialog: TestDialog): boolean {
  const rect = part(dialog, 'dialog').getBoundingClientRect();
  const { clientWidth, clientHeight } = document.documentElement;
  return [rect.left, rect.top, clientWidth - rect.right, clientHeight - rect.bottom].every(
    (delta) => Math.abs(delta) < 0.5,
  );
}

it('S1 uses the compact layout below 600px and the centered footer at 600px', async () => {
  await page.viewport(599, 650);
  const dialog = mount('compact', 'Save');
  await openDialog();

  await expect.poll(() => fillsViewport(dialog)).toBe(true);
  const firstField = field().element();
  expect(dialog.shadowRoot?.querySelector('[part~="header"] ki-button')).toHaveAttribute(
    'variant',
    'ghost',
  );

  await page.viewport(600, 650);
  await expect.poll(() => dialog.shadowRoot?.querySelector('[part~="header"]')).toBeNull();
  await expect.poll(() => fillsViewport(dialog)).toBe(false);
  await expect.element(modal()).toBeVisible();
  await expect.element(confirm()).toBeVisible();
  expect(part(dialog, 'footer').querySelector('ki-button')).toHaveAttribute('variant', 'primary');
  expect(field().element()).toBe(firstField);
  await expect.element(field()).toHaveValue('Design review');

  await page.viewport(360, 650);
  await expect.poll(() => fillsViewport(dialog)).toBe(true);
  await expect.element(confirm()).toBeVisible();
});

it('S2 fills the window in always mode at 1024px', async () => {
  await page.viewport(1024, 650);
  const dialog = mount('always');
  dialog.removeAttribute('close-label');
  await openDialog();

  await expect.poll(() => fillsViewport(dialog)).toBe(true);
  await expect.element(page.getByRole('button', { name: 'Close', exact: true })).toBeVisible();
  await expect.element(confirm()).not.toBeInTheDocument();
});

it('S3 keeps the default dialog centered at 360px and reports its legacy close', async () => {
  await page.viewport(360, 650);
  const dialog = mount();
  const observed: { cancelable: boolean; open: boolean }[] = [];
  dialog.addEventListener('ki-close', (event) => {
    observed.push({ cancelable: event.cancelable, open: dialog.open });
  });
  await openDialog();

  const rect = part(dialog, 'dialog').getBoundingClientRect();
  expect(rect.width).toBeLessThan(document.documentElement.clientWidth);
  await expect.element(dismiss()).not.toBeInTheDocument();
  await userEvent.keyboard('{Escape}');
  await expect
    .poll(() => observed[0])
    .toEqual({
      cancelable: false,
      open: false,
    });
});

it('S4 keeps the header in view when its body scrolls', async () => {
  await page.viewport(360, 480);
  const dialog = mount('always', 'Save');
  for (let index = 0; index < 40; index += 1) {
    const paragraph = document.createElement('p');
    paragraph.textContent = 'Event details';
    dialog.append(paragraph);
  }
  await openDialog();
  await expect.poll(() => fillsViewport(dialog)).toBe(true);
  const body = part(dialog, 'body');
  const header = part(dialog, 'header');
  const top = header.getBoundingClientRect().top;

  body.scrollTop = body.scrollHeight;

  expect(body.scrollTop).toBeGreaterThan(0);
  expect(Math.abs(header.getBoundingClientRect().top - top)).toBeLessThan(0.5);
  expect(part(dialog, 'dialog').scrollTop).toBe(0);
  await expect.element(dismiss()).toBeVisible();
  await expect.element(confirm()).toBeVisible();
});

it('S5 names the native modal and puts initial focus on its first field', async () => {
  const dialog = mount('always', 'Save');
  await openDialog();

  expect(modal().element().matches(':modal')).toBe(true);
  await expect.element(field()).toHaveFocus();
  await expect.element(dismiss()).toBeVisible();
  await expectAccessible(dialog);
});

it.each([
  ['S6', 'Escape', async () => userEvent.keyboard('{Escape}'), 'escape'],
  ['S7', 'close button', async () => dismiss().click(), 'method'],
] as const)(
  '%s %s offers a cancelable close before dismissal',
  async (_id, _via, activate, reason) => {
    const dialog = mount('always');
    const veto = vi.fn((event: Event) => {
      const close = event as CustomEvent<{ reason: string }>;
      close.preventDefault();
      return { cancelable: close.cancelable, open: dialog.open, reason: close.detail.reason };
    });
    dialog.addEventListener('ki-close', veto);
    await openDialog();
    await activate();

    expect(veto).toHaveBeenCalledTimes(1);
    expect(veto.mock.results[0]?.value).toEqual({ cancelable: true, open: true, reason });
    await expect.element(modal()).toBeVisible();
  },
);

it.each([
  ['Escape', async () => userEvent.keyboard('{Escape}')],
  [
    'close button',
    async () => {
      (dismiss().element() as HTMLElement).focus();
      await userEvent.keyboard('{Enter}');
    },
  ],
] as const)(
  'S8 %s returns focus and emits exactly one accepted dismissal',
  async (_via, activate) => {
    const dialog = mount('always');
    const listener = vi.fn();
    dialog.addEventListener('ki-close', listener);
    await openDialog();
    await activate();

    await expect.element(modal()).not.toBeInTheDocument();
    await expect.element(trigger()).toHaveFocus();
    await expect.poll(() => dialog.open).toBe(false);
    expect(listener).toHaveBeenCalledTimes(1);
  },
);

it('S9 reaches the header and wraps Tab in both directions', async () => {
  mount('always', 'Save');
  await openDialog();
  await expect.element(field()).toHaveFocus();
  // Some WebKit configurations omit buttons from sequential navigation
  // unless the native controls themselves specify tabindex.
  (dismiss().element() as HTMLElement).tabIndex = 0;
  (confirm().element() as HTMLElement).tabIndex = 0;

  await userEvent.tab();
  await expect.element(dismiss()).toHaveFocus();
  await userEvent.tab({ shift: true });
  await expect.element(field()).toHaveFocus();
  await userEvent.tab({ shift: true });
  await expect.element(confirm()).toHaveFocus();
});

it.each(['never', 'always'] as const)(
  'S10 confirmation in %s signals without submitting or closing',
  async (mode) => {
    const dialog = mount(mode, 'Save');
    const listener = vi.fn();
    const submit = vi.fn((event: Event) => { event.preventDefault(); });
    dialog.querySelector('form')?.addEventListener('submit', submit);
    document.body.addEventListener('ki-confirm', listener, { once: true });
    await openDialog();
    await confirm().click();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({
      target: dialog,
      bubbles: true,
      composed: true,
    });
    expect(submit).not.toHaveBeenCalled();
    await expect.element(modal()).toBeVisible();
  },
);

it('S12 shows the named modal, header and close focus indicator in forced colors', async () => {
  await browserCommands.emulateForcedColors('active');
  try {
    expect(matchMedia('(forced-colors: active)').matches).toBe(true);
    const dialog = mount('always', 'Save');
    await openDialog();
    await expect.element(dismiss()).toBeVisible();
    await expect.element(confirm()).toBeVisible();

    (dismiss().element() as HTMLElement).tabIndex = 0;
    (confirm().element() as HTMLElement).tabIndex = 0;
    await userEvent.tab();
    await expect.element(dismiss()).toHaveFocus();
    const style = getComputedStyle(dismiss().element());
    expect(style.outlineStyle).not.toBe('none');
    expect(Number.parseFloat(style.outlineWidth)).toBeGreaterThan(0);
    expect(getComputedStyle(part(dialog, 'header')).borderBlockEndStyle).toBe('solid');
  } finally {
    await browserCommands.emulateForcedColors(null);
  }
});

it('S13 places the close control at inline start under RTL', async () => {
  document.documentElement.dir = 'rtl';
  mount('always', 'Save');
  await openDialog();
  await expect.element(dismiss()).toBeVisible();
  await expect.element(confirm()).toBeVisible();

  expect(dismiss().element().getBoundingClientRect().left).toBeGreaterThan(
    confirm().element().getBoundingClientRect().right,
  );
});

it.each([
  ['onmars', 'light'],
  ['onmars', 'dark'],
  ['material3', 'light'],
  ['material3', 'dark'],
] as const)('S15 applies the %s %s palette at compact and wide widths', async (theme, scheme) => {
  document.documentElement.setAttribute('data-ki-theme', theme);
  document.documentElement.setAttribute('data-ki-color-scheme', scheme);
  await page.viewport(360, 650);
  const dialog = mount('compact', 'Save');
  await openDialog();
  await expect.poll(() => fillsViewport(dialog)).toBe(true);

  const surface = part(dialog, 'dialog');
  const expected = document.createElement('div');
  expected.style.backgroundColor = 'var(--ki-dialog-fullscreen-bg)';
  dialog.after(expected);
  const fill = getComputedStyle(expected).backgroundColor;
  expected.remove();
  expect(fill).not.toBe('rgba(0, 0, 0, 0)');
  expect(getComputedStyle(surface).backgroundColor).toBe(fill);
  expect(getComputedStyle(surface).backgroundImage).toBe('none');
  await expect.element(confirm()).toBeVisible();

  await page.viewport(1024, 650);
  await expect.poll(() => fillsViewport(dialog)).toBe(false);
  await expect.element(confirm()).toBeVisible();
  expect(part(dialog, 'footer').querySelector('ki-button')).toHaveAttribute('variant', 'primary');
});
