// @spec:008-ki-switch
import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import onmarsCss from '@kimen/tokens/css?raw';
import { defineCustomElement } from '../dist/components/ki-switch.js';

type KiSwitchElement = HTMLElement & { checked: boolean };

const defineKiSwitchElement: () => void = defineCustomElement;
const browserCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
};

beforeAll(async () => {
  defineKiSwitchElement();
  await browserCommands.emulateColorScheme('dark');
});

function injectStylesheet(css: string, id: string): void {
  if (document.getElementById(id)) {
    return;
  }
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
}

async function mount(attrs = ''): Promise<KiSwitchElement> {
  document.body.replaceChildren();
  injectStylesheet(onmarsCss, 'ki-switch-dark-tokens');
  const el = document.createElement('ki-switch') as KiSwitchElement;
  el.textContent = 'Email notifications';
  for (const attr of attrs.split(/\s+/u).filter(Boolean)) {
    el.setAttribute(attr, '');
  }
  document.body.append(el);
  await customElements.whenDefined('ki-switch');
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return el;
}

describe('ki-switch under the dark scheme', () => {
  it('S15 resolves forced dark onmars ink values for the checked track', async () => {
    const el = await mount('checked');
    const track = el.shadowRoot?.querySelector('[part="track"]');
    expect(track).toBeInstanceOf(HTMLElement);

    const background = getComputedStyle(track as HTMLElement).backgroundColor;

    expect(background).not.toBe('');
    expect(background).not.toBe('rgba(0, 0, 0, 0)');
  });
});
