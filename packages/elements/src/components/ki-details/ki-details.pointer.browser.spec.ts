// @spec:085-ki-details
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-details.js';

const browserCommands = commands as unknown as {
  emulateHoverCapability: (capability: 'none' | null) => Promise<boolean>;
};

const styles = document.createElement('style');
const fixture = document.createElement('main');

afterEach(async () => {
  fixture.remove();
  styles.remove();
  await parkPointer();
});

it('S15 provides a 44px summary without hover paint under coarse touch density', async (test) => {
  if (!(await browserCommands.emulateHoverCapability('none'))) {
    test.skip('This engine cannot emulate a coarse primary pointer');
  }
  try {
    await expect.poll(() => matchMedia('(pointer: coarse)').matches).toBe(true);
    defineCustomElement();
    styles.textContent = tokensCss;
    document.head.append(styles);
    fixture.setAttribute('data-ki-density', 'touch');
    fixture.innerHTML = '<ki-details summary="Permissions">Invite users.</ki-details>';
    document.body.append(fixture);

    const findSummary = () =>
      fixture.querySelector('ki-details')?.shadowRoot?.querySelector('summary') ?? null;
    await expect.poll(findSummary).not.toBeNull();
    const summary = findSummary();
    if (!summary) throw new Error('Missing summary');
    expect(summary.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    const background = getComputedStyle(summary).backgroundColor;
    await userEvent.hover(summary);
    expect(summary.matches(':hover')).toBe(true);
    expect(getComputedStyle(summary).backgroundColor).toBe(background);
  } finally {
    await browserCommands.emulateHoverCapability(null);
  }
});
