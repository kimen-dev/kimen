// @spec:075-ki-chip
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { defineAllComponents } from '../../../browser-tests/all-components';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';

const styles = document.createElement('style');
const fixture = document.createElement('main');
const media = commands as unknown as {
  emulateForcedColors: (value: 'active' | null) => Promise<void>;
};

beforeAll(() => {
  defineAllComponents();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  await parkPointer();
  fixture.replaceChildren();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

function selectionIcon(control: Element) {
  const icon = control.querySelector('[part~="selection-icon"]');
  if (!icon) throw new Error('Missing filter selection icon');
  return page.elementLocator(icon);
}

it('S1 selects a filter, renders its check, and reports selection', async () => {
  fixture.innerHTML = '<ki-chip value="eng">Engineering</ki-chip>';
  const change = vi.fn();
  fixture.addEventListener('ki-change', change, { once: true });
  const filter = page.getByRole('button', { name: 'Engineering' });
  await expect.element(filter).toHaveAttribute('aria-pressed', 'false');
  const chip = fixture.querySelector('ki-chip');
  const control = chip?.shadowRoot?.querySelector('button');
  if (!control) throw new Error('Missing filter control');
  const initialFill = getComputedStyle(control).backgroundColor;
  await filter.click();
  await expect.element(filter).toHaveAttribute('aria-pressed', 'true');
  await expect.element(selectionIcon(control)).toBeVisible();
  await expect.poll(() => getComputedStyle(control).backgroundColor).not.toBe(initialFill);
  expect(change).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ detail: { selected: true } }),
  );
});

it('S3 S9 exposes one plain, text-named button and emits its contextual action', async () => {
  fixture.innerHTML =
    '<ki-chip type="assist" value="calendar" selected removable>Add to calendar<svg slot="start" role="img" aria-label="Calendar glyph" viewBox="0 0 24 24"><path fill="currentColor" d="M3 5h18v16H3z"/></svg></ki-chip>';
  const activation = vi.fn();
  const remove = vi.fn();
  const change = vi.fn();
  const chip = fixture.querySelector('ki-chip');
  if (!chip) throw new Error('Missing assist chip');
  chip.addEventListener('ki-activate', activation);
  chip.addEventListener('ki-remove', remove);
  chip.addEventListener('ki-change', change);
  const assist = page.getByRole('button', { name: 'Add to calendar', exact: true });
  await expect.element(assist).toBeVisible();
  await expect
    .poll(() => fixture.querySelector('svg[slot="start"]')?.getBoundingClientRect().width ?? 0)
    .toBeGreaterThan(0);
  expect(page.getByRole('button').all()).toHaveLength(1);
  await expect.element(assist).not.toHaveAttribute('aria-pressed');
  await assist.click();
  expect(activation).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ detail: { value: 'calendar' } }),
  );
  expect(remove).not.toHaveBeenCalled();
  expect(change).not.toHaveBeenCalled();
  await parkPointer();
  await expectAccessible(fixture);
});

it('S4 Space toggles a focused filter off', async () => {
  fixture.innerHTML = '<ki-chip selected>Engineering</ki-chip>';
  const filter = page.getByRole('button', { name: 'Engineering' });
  await expect.element(filter).toHaveAttribute('aria-pressed', 'true');
  const root = fixture.querySelector('ki-chip')?.shadowRoot;
  const button = root?.querySelector('button');
  if (!button) throw new Error('Missing filter button');
  button.focus();
  expect(root?.activeElement).toBe(button);
  await userEvent.keyboard(' ');
  await expect.element(filter).toHaveAttribute('aria-pressed', 'false');
});

it('S10 prevents filter, input and assist activation while disabled', async () => {
  fixture.innerHTML =
    '<ki-chip disabled>Design</ki-chip><ki-chip disabled removable type="input">Ana</ki-chip><ki-chip disabled type="assist">Directions</ki-chip>';
  const action = vi.fn();
  for (const name of ['ki-change', 'ki-remove', 'ki-activate']) {
    fixture.addEventListener(name, action);
  }
  try {
    for (const name of ['Design', 'Remove Ana', 'Directions']) {
      await expect.element(page.getByRole('button', { name, exact: true })).toBeDisabled();
    }
    for (const chip of fixture.querySelectorAll('ki-chip')) {
      chip.shadowRoot?.querySelector('button')?.click();
    }
    expect(action).not.toHaveBeenCalled();
    expect(fixture.querySelectorAll('ki-chip')).toHaveLength(3);
    await expect
      .element(page.getByRole('button', { name: 'Design' }))
      .toHaveAttribute('aria-pressed', 'false');
  } finally {
    for (const name of ['ki-change', 'ki-remove', 'ki-activate']) {
      fixture.removeEventListener(name, action);
    }
  }
});

it('keeps the check and boundary in forced colors', async ({ skip }) => {
  try {
    await media.emulateForcedColors('active');
    const forced = () => matchMedia('(forced-colors: active)').matches;
    if (navigator.userAgent.includes('Chrome/')) {
      await expect.poll(forced).toBe(true);
    } else if (!forced()) {
      skip('This engine does not emulate forced colors');
      return;
    }
    fixture.innerHTML =
      '<ki-chip selected>Design</ki-chip><ki-chip type="input" removable>Ana</ki-chip>';
    const filter = page.getByRole('button', { name: 'Design' });
    await expect.element(filter).toHaveAttribute('aria-pressed', 'true');
    await expect.element(selectionIcon(filter.element())).toBeVisible();
    const input = fixture.querySelector('ki-chip[type="input"]');
    await expect.element(page.getByRole('button', { name: 'Remove Ana' })).toBeVisible();
    const pill = input?.shadowRoot?.querySelector('[part~="chip"]');
    if (!pill) throw new Error('Missing input chip pill');
    expect(getComputedStyle(pill).borderInlineStartStyle).toBe('solid');
    expect(getComputedStyle(pill).borderInlineStartColor).not.toBe(
      getComputedStyle(pill).backgroundColor,
    );
  } finally {
    await media.emulateForcedColors(null);
  }
});
