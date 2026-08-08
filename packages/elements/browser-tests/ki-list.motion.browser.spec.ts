// @spec:016-ki-list
// Reduced-motion contract for the list micro-motion added in the MarsUI
// fidelity pass: the mount-entrance stagger on slotted items and the
// hover/pressed wash transitions are FULLY gated behind
// (prefers-reduced-motion: no-preference).
import tokensCss from '@kimen/tokens/css?raw';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { defineCustomElement as defineKiList } from '../dist/components/ki-list.js';
import { defineCustomElement as defineKiListItem } from '../dist/components/ki-list-item.js';

const browserCommands = commands as unknown as {
  emulateReducedMotion: (reducedMotion: 'reduce' | 'no-preference' | null) => Promise<void>;
};

beforeAll(async () => {
  await browserCommands.emulateReducedMotion('reduce');
  defineKiList();
  defineKiListItem();

  const style = document.createElement('style');
  style.textContent = tokensCss;
  document.head.append(style);
});

async function mountList(): Promise<HTMLElement> {
  document.body.replaceChildren();
  const main = document.createElement('main');
  main.innerHTML = `
    <ki-list>
      <ki-list-item>Email<span slot="secondary">ana@onmars.dev</span></ki-list-item>
      <ki-list-item>Notifications</ki-list-item>
      <ki-list-item>Storage</ki-list-item>
    </ki-list>
  `;
  document.body.append(main);
  await customElements.whenDefined('ki-list');
  await customElements.whenDefined('ki-list-item');
  await new Promise((resolve) => requestAnimationFrame(resolve));
  await new Promise((resolve) => requestAnimationFrame(resolve));
  const list = main.querySelector('ki-list');
  if (!list) {
    throw new Error('ki-list fixture missing');
  }
  return list;
}

describe('ki-list with reduced motion', () => {
  it('S12 suppresses the mount stagger and item transitions, rendering rows opaque at once', async () => {
    const list = await mountList();
    const items = [...list.querySelectorAll('ki-list-item')];
    expect(items).toHaveLength(3);

    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    for (const item of items) {
      // No entrance animation on any slotted row, regardless of stagger step.
      expect(getComputedStyle(item).animationName).toBe('none');
      expect(getComputedStyle(item).opacity).toBe('1');
      const part = item.shadowRoot?.querySelector<HTMLElement>('[part="item"]');
      if (!part) {
        throw new Error('item part missing');
      }
      // No wash/pressed transitions are declared on the row surface.
      expect(getComputedStyle(part).transitionDuration).toBe('0s');
      expect(getComputedStyle(part, '::after').transitionDuration).toBe('0s');
    }
  });
});
