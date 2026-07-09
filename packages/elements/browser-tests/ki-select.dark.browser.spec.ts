// @spec:005-ki-select
import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement as defineKiOption } from '../dist/components/ki-option.js';
import { defineCustomElement as defineKiSelect } from '../dist/components/ki-select.js';

const browserCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
};

beforeAll(async () => {
  defineKiSelect();
  defineKiOption();
  await browserCommands.emulateColorScheme('dark');
});

describe('ki-select dark scheme', () => {
  it('S18 resolves dark onmars tokens under forced dark', async () => {
    document.body.replaceChildren();
    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
    const style = document.createElement('style');
    style.textContent = tokensCss;
    document.head.append(style);
    const el = document.createElement('ki-select');
    el.setAttribute('label', 'Country');
    el.innerHTML = '<ki-option value="fr">France</ki-option>';
    document.body.append(el);
    await customElements.whenDefined('ki-select');
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const trigger = el.shadowRoot?.querySelector('[part="trigger"]');
    expect(trigger ? getComputedStyle(trigger).backgroundColor : '').toBe('rgb(10, 10, 10)');
  });
});
