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
  emulateReducedMotion: (value: 'reduce' | null) => Promise<void>;
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
  await expect.element(filter.getByTestId('selection-icon')).toBeVisible();
  await expect.poll(() => getComputedStyle(control).backgroundColor).not.toBe(initialFill);
  expect(change).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ detail: { selected: true } }),
  );
});

it('S3 S9 exposes one plain, text-named button and emits its contextual action', async () => {
  fixture.innerHTML =
    '<ki-chip type="assist" value="calendar" selected removable>Add to calendar<span slot="start">decorative</span></ki-chip>';
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
  await userEvent.tab();
  await expect.element(filter).toHaveFocus();
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

it('S11 uses the themed selected fill and removes transitions under reduced motion', async () => {
  await media.emulateReducedMotion('reduce');
  try {
    fixture.innerHTML = '<ki-chip style="--ki-chip-selected-bg: rgb(20, 40, 60)">Design</ki-chip>';
    const filter = page.getByRole('button', { name: 'Design' });
    await filter.click();
    await expect.element(filter).toHaveAttribute('aria-pressed', 'true');
    const control = fixture.querySelector('ki-chip')?.shadowRoot?.querySelector('button');
    if (!control) throw new Error('Missing filter button');
    expect(getComputedStyle(control).backgroundColor).toBe('rgb(20, 40, 60)');
    expect(getComputedStyle(control).transitionDuration).toBe('0s');
  } finally {
    await media.emulateReducedMotion(null);
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
    await expect
      .element(page.getByRole('button', { name: 'Design' }))
      .toHaveAttribute('aria-pressed', 'true');
    await expect.element(page.getByTestId('selection-icon')).toBeVisible();
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
