import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:007-ki-radio-group
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import { defineCustomElement } from '../dist/components/ki-radio.js';

type KiRadioElement = HTMLElement & { label: string };

beforeAll(() => {
  defineCustomElement();
});

/** Stencil renders async: wait until the shadow root has content. */
async function mount(): Promise<KiRadioElement> {
  const el = document.createElement('ki-radio') as KiRadioElement;
  document.body.appendChild(el);
  await customElements.whenDefined('ki-radio');
  const deadline = Date.now() + 2000;
  while (!el.shadowRoot?.textContent && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return el;
}

describe('ki-radio in a real browser', () => {
  // TODO(spec): S1 core behavior from the approved scenario.
  it('renders its label', async () => {
    const el = await mount();
    expect(el.shadowRoot?.textContent).toContain('TODO');
    el.remove();
  });

  // TODO(spec): S2 keyboard path, S3 assistive-tech outcome, S4 form
  // participation (if applicable), S5 theming: the five families (Art. II).

  it('has zero axe violations (Art. V floor)', async () => {
    const el = await mount();
    const results = await axe.run(el);
    expect(results.violations).toEqual([]);
    el.remove();
  });
});
