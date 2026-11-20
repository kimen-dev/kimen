// @spec:089-ki-ai-label
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';
import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement } from '../../../dist/components/ki-ai-label.js';

const styles = document.createElement('style');
const fixture = document.createElement('main');
const browserCommands = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
};

beforeAll(() => {
  defineCustomElement();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  fixture.replaceChildren();
  fixture.removeAttribute('data-ki-density');
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it('S13 grows the interactive target in touch density on a coarse-pointer page', async (context) => {
  if (!(await browserCommands.emulateHoverCapability('none'))) {
    context.skip('this engine cannot emulate a coarse pointer');
  }
  try {
    expect(matchMedia('(pointer: coarse)').matches).toBe(true);
    fixture.setAttribute('data-ki-density', 'compact');
    const label = document.createElement('ki-ai-label');
    label.setAttribute('explanation', 'Written from the incident reports.');
    fixture.append(label);
    await expect.element(page.getByRole('button', { name: /AI-generated/u })).toBeVisible();

    const button = label.shadowRoot?.querySelector('button');
    if (!button) {
      throw new Error('Missing disclosure button');
    }
    const compact = button.getBoundingClientRect();
    expect(compact.height).toBeGreaterThanOrEqual(24);
    expect(compact.width).toBeGreaterThanOrEqual(24);

    fixture.setAttribute('data-ki-density', 'touch');

    const touch = button.getBoundingClientRect();
    expect(touch.height).toBeGreaterThan(compact.height);
    expect(touch.height).toBeGreaterThanOrEqual(44);
    expect(touch.width).toBeGreaterThanOrEqual(44);
  } finally {
    await browserCommands.emulateHoverCapability(null);
  }
});
