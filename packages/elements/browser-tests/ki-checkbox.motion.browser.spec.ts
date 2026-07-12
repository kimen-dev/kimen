// @spec:006-ki-checkbox
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-checkbox.js';

type KiCheckboxElement = HTMLElement & {
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

async function mount(): Promise<KiCheckboxElement> {
  const el = document.createElement('ki-checkbox') as KiCheckboxElement;
  el.textContent = 'Email notifications';
  document.body.append(el);
  await customElements.whenDefined('ki-checkbox');
  await new Promise((resolve) => requestAnimationFrame(resolve));
  return el;
}

function inputOf(el: KiCheckboxElement): HTMLInputElement {
  const input = el.shadowRoot?.querySelector('input');
  expect(input).toBeInstanceOf(HTMLInputElement);
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('ki-checkbox did not render an input');
  }
  return input;
}

function markOf(el: KiCheckboxElement): SVGElement {
  const mark = el.shadowRoot?.querySelector('.mark');
  expect(mark).toBeInstanceOf(SVGElement);
  if (!(mark instanceof SVGElement)) {
    throw new Error('ki-checkbox did not render a mark');
  }
  return mark;
}

describe('ki-checkbox with reduced motion', () => {
  it('S21 applies state with no mark animation under reduced motion', async () => {
    const el = await mount();

    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    await userEvent.click(inputOf(el));

    const style = getComputedStyle(markOf(el));
    expect(el.checked).toBe(true);
    expect(`${style.transitionDuration} ${style.animationName}`).toBe('0s none');
  });
});
