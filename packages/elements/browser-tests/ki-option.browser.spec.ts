import tokensCss from '@kimen/tokens/css?raw';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:005-ki-select
// ki-option is a data element. Every user-facing S-ID scenario is asserted
// through ki-select, which owns the rendered option rows. The axe scan runs
// here with options mounted inside an open select, because options only
// materialize as accessible rows in that parent context.
import { defineCustomElement as defineKiOption } from '../dist/components/ki-option.js';
import { defineCustomElement as defineKiSelect } from '../dist/components/ki-select.js';

const STYLE_ID = 'ki-option-browser-token-style';

beforeAll(() => {
  defineKiOption();
  defineKiSelect();
});

function ensureTokens(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = tokensCss;
  document.head.append(style);
}

describe('ki-option in a real browser', () => {
  it('S1 paints nothing when rendered standalone as data', async () => {
    const el = document.createElement('ki-option');
    el.textContent = 'France';
    document.body.append(el);
    await customElements.whenDefined('ki-option');
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(getComputedStyle(el).display).toBe('none');
    expect(el.shadowRoot?.querySelector('[part]')).toBeNull();
    el.remove();
  });

  it('S12 has zero axe violations for options rendered inside an open select', async () => {
    ensureTokens();
    const main = document.createElement('main');
    main.innerHTML = `
      <ki-select label="Country" placeholder="Choose a country">
        <ki-option value="es">Spain</ki-option>
        <ki-option value="fr">France</ki-option>
        <ki-option value="pt">Portugal</ki-option>
      </ki-select>
    `;
    document.body.append(main);
    await customElements.whenDefined('ki-select');
    await customElements.whenDefined('ki-option');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const trigger = main
      .querySelector('ki-select')
      ?.shadowRoot?.querySelector<HTMLButtonElement>('[part="trigger"]');
    if (!trigger) {
      throw new Error('missing select trigger');
    }

    trigger.click();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect((await axe.run(main)).violations).toEqual([]);
    main.remove();
  });
});
