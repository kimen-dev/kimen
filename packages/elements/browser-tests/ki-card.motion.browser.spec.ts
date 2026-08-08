// @spec:009-ki-card
// Reduced-motion contract for the card micro-motion added in the MarsUI
// fidelity pass: the entrance animation and the elevation/zoom transitions
// are FULLY gated behind (prefers-reduced-motion: no-preference), while the
// hover end state (e1 -> e2) still applies instantly.
import tokensCss from '@kimen/tokens/css?raw';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-card.js';

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

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function mount(): Promise<HTMLElement> {
  document.body.replaceChildren();
  document.body.insertAdjacentHTML(
    'beforeend',
    '<ki-card><h2 slot="header">Monthly report</h2><p>Revenue increased.</p></ki-card>',
  );
  const el = document.body.lastElementChild as HTMLElement;
  await customElements.whenDefined('ki-card');
  const deadline = Date.now() + 500;
  while (!el.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
    await nextFrame();
  }
  await nextFrame();
  return el;
}

function cardPart(el: HTMLElement): HTMLElement {
  const part = el.shadowRoot?.querySelector<HTMLElement>('[part="card"]');
  expect(part).toBeInstanceOf(HTMLElement);
  if (!part) {
    throw new Error('ki-card did not render a card part');
  }
  return part;
}

function readTokenShadow(name: string): string {
  const probe = document.createElement('div');
  probe.style.boxShadow = `var(${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).boxShadow;
  probe.remove();
  return value;
}

describe('ki-card with reduced motion', () => {
  it('S9 suppresses the entrance animation and elevation transition, keeping end states', async () => {
    const el = await mount();
    const card = cardPart(el);

    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    // No entrance animation: the host renders fully opaque immediately.
    expect(getComputedStyle(el).animationName).toBe('none');
    expect(getComputedStyle(el).opacity).toBe('1');
    // No elevation transition is declared on the surface.
    expect(getComputedStyle(card).transitionDuration).toBe('0s');

    // The hover END STATE still applies (it lives outside the gate).
    await userEvent.hover(el);
    expect(getComputedStyle(card).boxShadow).toBe(readTokenShadow('--ki-elevation-e2'));
  });
});
