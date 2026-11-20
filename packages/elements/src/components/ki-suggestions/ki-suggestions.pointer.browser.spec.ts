// @spec:117-ki-suggestions
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';

import { parkPointer } from '../../../browser-tests/axe';
import { defineCustomElement as defineSuggestion } from '../../../dist/components/ki-suggestion.js';
import { defineCustomElement as defineSuggestions } from '../../../dist/components/ki-suggestions.js';

const pointer = commands as unknown as {
  emulateHoverCapability: (value: 'none' | null) => Promise<boolean>;
};
const styles = document.createElement('style');
const fixture = document.createElement('main');

beforeAll(() => {
  defineSuggestion();
  defineSuggestions();
  styles.textContent = tokensCss;
  document.head.append(styles);
  document.body.append(fixture);
});

afterEach(async () => {
  await pointer.emulateHoverCapability(null);
  fixture.replaceChildren();
  await parkPointer();
});

afterAll(() => {
  fixture.remove();
  styles.remove();
});

it.for(['chips', 'cards'])(
  'S10 gives %s 44 px touch targets under a coarse pointer',
  async (variant, { skip }) => {
    const emulated = await pointer.emulateHoverCapability('none');
    const coarse = () => matchMedia('(pointer: coarse)').matches;
    if (navigator.userAgent.includes('Chrome/')) {
      expect(emulated).toBe(true);
      await expect.poll(coarse).toBe(true);
    } else if (!coarse()) {
      skip('This engine cannot emulate a coarse primary pointer');
      return;
    }

    fixture.innerHTML = `
      <div data-ki-density="touch" style="padding: 16px">
        <ki-suggestions label="Prompt starters" variant="${variant}">
          <ki-suggestion>I</ki-suggestion>
        </ki-suggestions>
      </div>`;
    const option = page.getByRole('button', { name: 'I', exact: true });
    await expect.element(option).toBeVisible();
    const control = option.element();
    const rect = control.getBoundingClientRect();
    const root = control.getRootNode();
    if (!(root instanceof ShadowRoot)) throw new Error('Missing suggestion shadow root');

    if (variant === 'chips') {
      expect(rect.height).toBeCloseTo(32, 0);
    }

    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    // Probe half a pixel inside each edge of the 44 px target to avoid
    // rounding at the boundary. The chip paints only 32 px tall.
    const halfTarget = 21.5;
    expect(control.contains(root.elementFromPoint(x, y - halfTarget))).toBe(true);
    expect(control.contains(root.elementFromPoint(x, y + halfTarget))).toBe(true);
    expect(control.contains(root.elementFromPoint(x - halfTarget, y))).toBe(true);
    expect(control.contains(root.elementFromPoint(x + halfTarget, y))).toBe(true);
  },
);
