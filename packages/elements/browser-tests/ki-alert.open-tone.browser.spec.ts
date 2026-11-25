// @spec:164-catalog-closed-open-unions
// The catalog closes ki-alert's tone for generated specs (S1); markup keeps
// the element's open type (FR-004). This file pins the markup side on the
// BUILT custom element, separately from spec 011's own tests.
import tokensCss from '@kimen/tokens/css?raw';
import { beforeAll, describe, expect, it } from 'vitest';
import { defineCustomElement } from '../dist/components/ki-alert.js';

type KiAlertElement = HTMLElement & { tone: string };

beforeAll(() => {
  defineCustomElement();
  const style = document.createElement('style');
  style.textContent = tokensCss;
  document.head.append(style);
});

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function mount(tone: string, message: string): Promise<KiAlertElement> {
  const el = document.createElement('ki-alert') as KiAlertElement;
  el.setAttribute('tone', tone);
  el.textContent = message;
  document.body.append(el);
  await customElements.whenDefined('ki-alert');
  const deadline = Date.now() + 1000;
  while (!el.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
    await nextFrame();
  }
  await nextFrame();
  return el;
}

function card(el: KiAlertElement): string {
  const node = el.shadowRoot?.querySelector('[part="card"]');
  expect(node, 'missing part card').toBeInstanceOf(HTMLElement);
  const style = getComputedStyle(node as HTMLElement);
  return `${style.backgroundColor} / ${style.color}`;
}

function liveRole(el: KiAlertElement): string | null {
  return el.shadowRoot?.querySelector('[role]')?.getAttribute('role') ?? null;
}

describe('164 — markup keeps the open alert tone', () => {
  it('S5 renders hand-written tone "error" with the neutral appearance and role status', async () => {
    document.body.replaceChildren();
    const neutral = await mount('neutral', 'Save failed');
    const unknown = await mount('error', 'Save failed');
    const danger = await mount('danger', 'Save failed');

    expect(unknown.tone).toBe('error');
    expect(card(unknown)).toBe(card(neutral));
    expect(card(unknown)).not.toBe(card(danger));
    expect(liveRole(unknown)).toBe('status');
    expect(liveRole(danger)).toBe('alert');
  });
});
