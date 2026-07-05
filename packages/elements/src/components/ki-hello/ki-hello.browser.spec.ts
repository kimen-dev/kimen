import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (constitution Art. III).
import { defineCustomElement } from '../../../dist/components/ki-hello.js';

type KiHelloElement = HTMLElement & { name: string };

beforeAll(() => {
  defineCustomElement();
});

/** Stencil renders async: wait until the shadow root has content. */
async function mount(): Promise<KiHelloElement> {
  const el = document.createElement('ki-hello') as KiHelloElement;
  document.body.appendChild(el);
  await customElements.whenDefined('ki-hello');
  const deadline = Date.now() + 2000;
  while (!el.shadowRoot?.textContent && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return el;
}

describe('ki-hello in a real browser', () => {
  it('renders the default greeting into shadow DOM', async () => {
    const el = await mount();
    expect(el.shadowRoot?.textContent).toContain('Hello, Kimen');
    el.remove();
  });

  it('re-renders when the name prop changes', async () => {
    const el = await mount();
    el.name = 'Mars';
    const deadline = Date.now() + 2000;
    while (!(el.shadowRoot?.textContent ?? '').includes('Mars') && Date.now() < deadline) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    expect(el.shadowRoot?.textContent).toContain('Hello, Mars');
    el.remove();
  });

  it('has zero axe violations (Art. V floor)', async () => {
    const el = await mount();
    const results = await axe.run(el);
    expect(results.violations).toEqual([]);
    el.remove();
  });
});
