import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';

// @spec:008-ki-switch
import { defineCustomElement } from '../dist/components/ki-switch.js';

type KiSwitchElement = HTMLElement & {
  checked: boolean;
};

const browserCommands = commands as unknown as {
  emulateReducedMotion: (reducedMotion: 'reduce' | 'no-preference' | null) => Promise<void>;
};

beforeAll(async () => {
  await browserCommands.emulateReducedMotion('reduce');
  defineCustomElement();

  const style = document.createElement('style');
  style.textContent = tokensCss;
  document.head.append(style);
});

afterEach(() => {
  document.body.replaceChildren();
});

async function mount(): Promise<KiSwitchElement> {
  const el = document.createElement('ki-switch') as KiSwitchElement;
  el.textContent = 'Email notifications';
  document.body.append(el);
  await customElements.whenDefined('ki-switch');
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return el;
}

function inputOf(el: KiSwitchElement): HTMLInputElement {
  const input = el.shadowRoot?.querySelector('input');
  expect(input).toBeInstanceOf(HTMLInputElement);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('ki-switch did not render an input');
  }
  return input;
}

function thumbOf(el: KiSwitchElement): HTMLElement {
  const thumb = el.shadowRoot?.querySelector('[part="thumb"]');
  expect(thumb).toBeInstanceOf(HTMLElement);
  if (!(thumb instanceof HTMLElement)) {
    throw new Error('ki-switch did not render a thumb');
  }
  return thumb;
}

describe('ki-switch with reduced motion', () => {
  it('S19 toggles on without a thumb travel transition under reduced motion', async () => {
    const el = await mount();

    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    await userEvent.click(inputOf(el));

    expect(el.checked).toBe(true);
    expect(getComputedStyle(thumbOf(el)).transitionDuration).toBe('0s');
  });
});
