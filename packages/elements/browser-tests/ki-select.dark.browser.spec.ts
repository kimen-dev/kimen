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

    const trigger = el.shadowRoot?.querySelector<HTMLButtonElement>('[part="trigger"]');
    expect(trigger).toBeInstanceOf(HTMLButtonElement);
    if (!trigger) {
      throw new Error('missing trigger');
    }

    // Dropdown rest fill Surface/Special/light-s0_dark-s2: Dark/800 #1a1a1a
    // in dark (formerly dark-950 before the token-wave correction).
    expect(getComputedStyle(trigger).backgroundColor).toBe('rgb(26, 26, 26)');
    // ki.outline.control dark: White/48 (declared 1.4.11 deviation).
    expect(getComputedStyle(trigger).borderBlockStartColor).toBe('rgba(255, 255, 255, 0.48)');

    trigger.click();
    await new Promise((resolve) => requestAnimationFrame(resolve));

    // Dropmenu glass panel in dark: Dark/700 at 80% + Blur/48 (24px).
    const listbox = el.shadowRoot?.querySelector('[part="listbox"]');
    expect(listbox ? getComputedStyle(listbox).backgroundColor : '').toBe('rgba(36, 36, 36, 0.8)');
    expect(listbox ? getComputedStyle(listbox).backdropFilter : '').toBe('blur(24px)');
  });
});
