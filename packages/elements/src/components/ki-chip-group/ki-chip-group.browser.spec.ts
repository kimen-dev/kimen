// @spec:075-ki-chip
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { defineAllComponents } from '../../../browser-tests/all-components';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';

const styles = document.createElement('style');
const fixture = document.createElement('main');
const media = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
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

it('S2 removes the picked value and focuses the next chip', async () => {
  fixture.innerHTML = recipients;
  const remove = vi.fn();
  fixture.querySelector('ki-chip-group')?.addEventListener('ki-remove', remove);
  await page.getByRole('button', { name: 'Remove Ana García' }).click();
  expect(remove).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({ detail: { value: 'ana' } }),
  );
  expect(fixture.querySelector('ki-chip[value="ana"]')).toBeNull();
  await expect.element(page.getByRole('button', { name: 'Remove Luis' })).toHaveFocus();
});

it.each(['Backspace', 'Delete'])(
  'S5 %s on the final recipient returns focus to the field',
  async (key) => {
    fixture.innerHTML = recipients;
    fixture.querySelector('ki-chip[value="ana"]')?.remove();
    const remove = page.getByRole('button', { name: 'Remove Luis' });
    await userEvent.tab();
    await expect.element(remove).toHaveFocus();
    await userEvent.keyboard(`{${key}}`);
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
    await userEvent.tab();
    await expect.element(design).toHaveFocus();
    await userEvent.keyboard(`{Alt>}{${arrow}}{/Alt}`);
    expect(order(group)).toEqual(['eng', 'design']);
    await expect.element(design).toHaveFocus();
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
  await expect
    .element(page.getByRole('group', { name: 'Team' }).getByRole('button', { name: 'Design' }))
    .toHaveAttribute('aria-pressed', 'true');
  const list = page.getByRole('list', { name: 'Recipients' });
  await expect
    .element(
      list
        .getByRole('listitem')
        .filter({ hasText: 'Ana García' })
        .getByRole('button', { name: 'Remove Ana García' }),
    )
    .toBeVisible();
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
  fixture
    .querySelector('ki-chip-group')
    ?.addEventListener('ki-remove', (event) => { event.preventDefault(); });
  const remove = page.getByRole('button', { name: 'Remove Ana García' });
  await userEvent.tab();
  await expect.element(remove).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  await expect.element(remove).toHaveFocus();
  expect(fixture.querySelector('ki-chip[value="ana"]')).not.toBeNull();
});

it('keeps default density on coarse pointers and uses touch density when requested', async ({
  skip,
}) => {
  if (!(await media.emulateHoverCapability('none'))) {
    skip();
    return;
  }
  try {
    fixture.innerHTML =
      '<ki-chip size="sm">Compact</ki-chip><ki-chip type="input" size="sm" removable>Ana</ki-chip>';
    await expect.element(page.getByRole('button', { name: 'Compact' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Remove Ana' })).toBeVisible();
    expect(matchMedia('(pointer: coarse)').matches).toBe(true);
    const controls = Array.from(fixture.querySelectorAll('ki-chip'), (chip) => {
      const control = chip.shadowRoot?.querySelector('button');
      if (!control) throw new Error('Missing chip button');
      return control;
    });
    expect(controls.map((control) => control.getBoundingClientRect().height)).toEqual([24, 24]);
    fixture.setAttribute('data-ki-density', 'touch');
    await expect
      .poll(() => controls.map((control) => control.getBoundingClientRect().height))
      .toEqual([44, 44]);
  } finally {
    fixture.removeAttribute('data-ki-density');
    await media.emulateHoverCapability(null);
  }
});
