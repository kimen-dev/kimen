import { beforeAll, describe, expect, it } from 'vitest';

// @spec:005-ki-select
// ki-option is a data element. Every user-facing S-ID scenario is asserted
// through ki-select, which owns the rendered option rows.
import { defineCustomElement as defineKiOption } from '../dist/components/ki-option.js';

beforeAll(() => {
  defineKiOption();
});

describe('ki-option in a real browser', () => {
  it('S1 paints nothing when rendered standalone as data', async () => {
    const el = document.createElement('ki-option');
    el.textContent = 'France';
    document.body.append(el);
    await customElements.whenDefined('ki-option');
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(getComputedStyle(el).display).toBe('none');
    expect(el.shadowRoot?.querySelector('[part]')).toBeNull();
    el.remove();
  });
});
