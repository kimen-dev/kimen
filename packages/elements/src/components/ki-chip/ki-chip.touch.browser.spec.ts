import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { defineAllComponents } from '../../../browser-tests/all-components';
import { parkPointer } from '../../../browser-tests/axe';

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

it('keeps default density on coarse pointers and uses touch density when requested', async ({
  skip,
}) => {
  if (!(await media.emulateHoverCapability('none'))) {
    skip();
    return;
  }
  try {
    fixture.style.paddingBlock = '16px';
    fixture.innerHTML =
      '<ki-chip size="sm">Compact</ki-chip><ki-chip type="input" size="sm" removable>Ana</ki-chip>';
    await expect.element(page.getByRole('button', { name: 'Compact' })).toBeVisible();
    await expect.element(page.getByRole('button', { name: 'Remove Ana' })).toBeVisible();
    await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
    const chips = Array.from(fixture.querySelectorAll('ki-chip'));
    const controls = chips.map((chip) => {
      const control = chip.shadowRoot?.querySelector('button');
      if (!control) throw new Error('Missing chip button');
      return control;
    });
    const hitAbovePaint = () =>
      controls.map((control, index) => {
        const rect = control.getBoundingClientRect();
        return (
          chips[index]?.shadowRoot?.elementFromPoint(rect.x + rect.width / 2, rect.y - 8) ===
          control
        );
      });

    expect(controls.map((control) => control.getBoundingClientRect().height)).toEqual([24, 24]);
    expect(hitAbovePaint()).toEqual([false, false]);
    fixture.setAttribute('data-ki-density', 'touch');
    await expect.poll(hitAbovePaint).toEqual([true, true]);
    expect(controls.map((control) => control.getBoundingClientRect().height)).toEqual([24, 24]);
  } finally {
    fixture.removeAttribute('data-ki-density');
    fixture.style.removeProperty('padding-block');
    await media.emulateHoverCapability(null);
  }
});
