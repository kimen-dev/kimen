// @spec:075-ki-chip
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { defineAllComponents } from '../../../browser-tests/all-components';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';

const styles = document.createElement('style');
const fixture = document.createElement('main');
fixture.id = 'chip-group-test';

const { ariaSnapshot } = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
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

const recipients =
  '<ki-chip-group label="Recipients" type="input" focus-target="email"><ki-chip value="ana" removable>Ana García</ki-chip><ki-chip value="luis" removable>Luis</ki-chip></ki-chip-group><input id="email" aria-label="Add recipient">';

function reorderable(direction = 'ltr'): HTMLElement {
  fixture.innerHTML = `<ki-chip-group label="Team" reorderable dir="${direction}"><ki-chip value="design">Design</ki-chip><ki-chip value="eng">Engineering</ki-chip></ki-chip-group>`;
  const group = fixture.querySelector('ki-chip-group');
  if (!group) throw new Error('Missing reorderable chip group');
  return group;
}

function order(group: HTMLElement): (string | null)[] {
  return Array.from(group.children, (chip) => chip.getAttribute('value'));
}

function chipButton(value: string): HTMLButtonElement {
  const control = fixture
    .querySelector(`ki-chip[value="${value}"]`)
    ?.shadowRoot?.querySelector('button');
  if (!control) throw new Error(`Missing button for chip "${value}"`);
  return control;
}

function hasShadowFocus(control: HTMLButtonElement): boolean {
  const root = control.getRootNode();
  return root instanceof ShadowRoot && root.activeElement === control;
}

it('S2 removes the picked value and focuses the next chip', async () => {
  fixture.innerHTML = recipients;
  const remove = vi.fn();
  fixture.querySelector('ki-chip-group')?.addEventListener('ki-remove', (event) => {
    remove((event as CustomEvent<{ value: string }>).detail);
  });
  await page.getByRole('button', { name: 'Remove Ana García' }).click();
  expect(remove).toHaveBeenCalledExactlyOnceWith({ value: 'ana' });
  expect(fixture.querySelector('ki-chip[value="ana"]')).toBeNull();
  await expect.poll(() => hasShadowFocus(chipButton('luis'))).toBe(true);
});

it.each(['Backspace', 'Delete'])(
  'S5 %s on the final recipient returns focus to the field',
  async (key) => {
    fixture.innerHTML = recipients;
    const removed = vi.fn();
    fixture.querySelector('ki-chip-group')?.addEventListener('ki-remove', removed);
    fixture.querySelector('ki-chip[value="ana"]')?.remove();
    expect(fixture.querySelector('ki-chip[value="ana"]')).toBeNull();
    expect(removed).not.toHaveBeenCalled();

    const remove = page.getByRole('button', { name: 'Remove Luis' });
    await expect.element(remove).toBeVisible();
    const button = chipButton('luis');
    button.focus();
    expect(hasShadowFocus(button)).toBe(true);
    await userEvent.keyboard(`{${key}}`);
    expect(removed).toHaveBeenCalledTimes(1);
    await expect.element(remove).not.toBeInTheDocument();
    await expect.element(page.getByRole('textbox', { name: 'Add recipient' })).toHaveFocus();
  },
);

it.each([
  ['ltr', 'ArrowRight'],
  ['rtl', 'ArrowLeft'],
])(
  'S6 reorders via Alt+Arrow in %s, retains focus, and announces the update',
  async (direction, arrow) => {
    const group = reorderable(direction);
    const moved = vi.fn();
    group.addEventListener('ki-reorder', moved);
    const design = page.getByRole('button', { name: 'Design' });
    await expect.element(design).toBeVisible();
    const control = chipButton('design');
    control.focus();
    expect(hasShadowFocus(control)).toBe(true);
    await userEvent.keyboard(`{Alt>}{${arrow}}{/Alt}`);
    expect(order(group)).toEqual(['eng', 'design']);
    await expect.poll(() => hasShadowFocus(chipButton('design'))).toBe(true);
    const status = page.getByRole('status');
    await expect.element(status).toHaveAttribute('aria-live', 'polite');
    await expect.element(status).toHaveTextContent('Design moved to position 2 of 2.');
    expect(moved).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        detail: {
          value: 'design',
          fromIndex: 0,
          toIndex: 1,
        },
      }),
    );
    await userEvent.keyboard(`{Alt>}{${arrow}}{/Alt}`);
    expect(moved).toHaveBeenCalledTimes(1);
  },
);

it('S7 drags the handle to reorder the reading order', async () => {
  const group = reorderable();
  const handles = page.getByTestId('drag-handle');
  await handles.nth(1).dropTo(handles.nth(0));
  expect(order(group)).toEqual(['eng', 'design']);
});

it('S8 exposes a labelled toggle group and a list with a named remove button', async () => {
  fixture.innerHTML =
    '<ki-chip-group label="Team"><ki-chip selected>Design</ki-chip></ki-chip-group>' + recipients;
  // The DOM finder cannot descend from a shadow container through its slot.
  // Read the rendered accessibility tree to verify ownership as well as names.
  const snapshot = () => ariaSnapshot('#chip-group-test');
  await expect.poll(snapshot).toMatch(/^( *)- group "Team":\n\1 +- button "Design" \[pressed\]$/mu);
  await expect
    .poll(snapshot)
    .toMatch(
      /^( *)- list "Recipients":\n(\1 +)- listitem:\n\2 +- text: Ana García\n\2 +- button "Remove Ana García"$/mu,
    );
  await expectAccessible(fixture);
});

it('S12 picks and places chips through their handles without activating the filter', async () => {
  const group = reorderable();
  const activated = vi.fn();
  group.addEventListener('ki-change', activated);
  const handles = page.getByTestId('drag-handle');
  await handles.nth(1).click();
  await handles.nth(0).click();
  expect(order(group)).toEqual(['eng', 'design']);
  expect(activated).not.toHaveBeenCalled();
});

it('S13 honors cancellation of a remove event', async () => {
  fixture.innerHTML = recipients;
  const cancel = vi.fn((event: Event) => {
    event.preventDefault();
  });
  fixture.querySelector('ki-chip-group')?.addEventListener('ki-remove', cancel);
  const remove = page.getByRole('button', { name: 'Remove Ana García' });
  await expect.element(remove).toBeVisible();
  const button = chipButton('ana');
  button.focus();
  expect(hasShadowFocus(button)).toBe(true);
  await userEvent.keyboard('{Enter}');
  expect(cancel).toHaveBeenCalledTimes(1);
  expect(fixture.querySelector('ki-chip[value="ana"]')).not.toBeNull();
  expect(hasShadowFocus(button)).toBe(true);
});
