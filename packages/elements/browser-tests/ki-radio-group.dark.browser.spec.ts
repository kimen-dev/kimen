// @spec:007-ki-radio-group
import { commands } from 'vitest/browser';
import { beforeAll, describe, expect, it } from 'vitest';

import onmarsCss from '@kimen/tokens/css?raw';
import { defineCustomElement as defineRadio } from '../dist/components/ki-radio.js';
import { defineCustomElement as defineRadioGroup } from '../dist/components/ki-radio-group.js';

const browserCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
};

beforeAll(async () => {
  defineRadioGroup();
  defineRadio();
  await browserCommands.emulateColorScheme('dark');
});

function injectStyles(): void {
  if (document.getElementById('ki-radio-group-dark-tokens')) {
    return;
  }
  const style = document.createElement('style');
  style.id = 'ki-radio-group-dark-tokens';
  style.textContent = onmarsCss;
  document.head.append(style);
}

describe('ki-radio-group under the dark scheme', () => {
  it('S17 resolves radio appearance from dark token values', async () => {
    document.body.replaceChildren();
    injectStyles();
    const el = document.createElement('ki-radio-group') as HTMLElement & { value: string };
    el.setAttribute('label', 'Contact preference');
    el.setAttribute('value', 'email');
    el.innerHTML = '<ki-radio value="email">Email</ki-radio><ki-radio value="sms">SMS</ki-radio>';
    document.body.append(el);
    await customElements.whenDefined('ki-radio-group');
    await customElements.whenDefined('ki-radio');
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const input = el.querySelector('ki-radio')?.shadowRoot?.querySelector('input');
    if (!input) {
      throw new Error('Missing radio input for dark token assertion');
    }

    expect(getComputedStyle(input).getPropertyValue('--ki-radio-selected-rest-fg').trim()).not.toBe(
      '',
    );
  });
});
