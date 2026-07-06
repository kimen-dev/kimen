import axe from 'axe-core';
import { userEvent } from 'vitest/browser';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:002-ki-button
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement } from '../dist/components/ki-button.js';

type KiButtonElement = HTMLElement & {
  disabled: boolean;
  size: string;
  tone: string;
  variant: string;
};

const STYLE_ID = 'ki-button-browser-token-style';
const variants = ['primary', 'secondary', 'tertiary', 'quaternary', 'ghost'] as const;
const tones = ['neutral', 'success', 'danger'] as const;
const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

beforeAll(() => {
  defineCustomElement();
});

function ensureTokens(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = tokensCss;
  document.head.append(style);
}

function cleanup(): void {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
}

/** Stencil renders async: wait until the shadow root has content. */
async function mount(
  label = 'Save',
  attributes: Partial<Record<'disabled' | 'size' | 'tone' | 'variant', string | boolean>> = {},
): Promise<KiButtonElement> {
  ensureTokens();
  const el = document.createElement('ki-button') as KiButtonElement;
  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      el.toggleAttribute(name, value);
    } else {
      el.setAttribute(name, value);
    }
  }
  el.textContent = label;
  document.body.append(el);
  await customElements.whenDefined('ki-button');
  const deadline = Date.now() + 500;
  while (!el.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return el;
}

function innerButton(el: KiButtonElement): HTMLButtonElement | null {
  return el.shadowRoot?.querySelector('button') ?? null;
}

function requireButton(el: KiButtonElement): HTMLButtonElement {
  const button = innerButton(el);
  expect(button).toBeInstanceOf(HTMLButtonElement);
  if (!button) {
    throw new Error('ki-button did not render an internal native button');
  }
  return button;
}

describe('ki-button in a real browser', () => {
  it('S1 dispatches one activation for a real click', async () => {
    cleanup();
    const el = await mount();
    const button = requireButton(el);
    let activations = 0;
    el.addEventListener('click', () => {
      activations += 1;
    });

    await userEvent.click(button);

    expect(activations).toBe(1);
  });

  it('S3 reaches the button with Tab and shows a visible focus indication', async () => {
    cleanup();
    const el = await mount();
    const button = requireButton(el);

    await userEvent.keyboard('{Tab}');

    expect(el.shadowRoot?.activeElement).toBe(button);
    const focused = getComputedStyle(button);
    expect(`${focused.outlineStyle} ${focused.boxShadow}`).not.toBe('none none');
  });

  it('S4 activates the focused button exactly once for Enter and Space', async () => {
    cleanup();
    const el = await mount();
    const button = requireButton(el);
    let activations = 0;
    el.addEventListener('click', () => {
      activations += 1;
    });

    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(activations).toBe(1);

    await userEvent.keyboard(' ');
    expect(activations).toBe(2);
  });

  it('S5 exposes a named native button from slotted label content', async () => {
    cleanup();
    const el = await mount('Save');
    const button = requireButton(el);

    expect(button.textContent.trim()).toBe('Save');
  });

  it('S6 exposes disabled state as unavailable', async () => {
    cleanup();
    const el = await mount('Save', { disabled: true });
    const button = requireButton(el);

    expect(button).toHaveProperty('disabled', true);
  });

  it('S6 has zero axe violations across the variant tone size matrix', async () => {
    cleanup();
    ensureTokens();
    for (const variant of variants) {
      for (const tone of tones) {
        for (const size of sizes) {
          await mount(`${variant} ${tone} ${size}`, { variant, tone, size });
        }
      }
    }

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S3 keeps start and end slots in logical order under RTL', async () => {
    cleanup();
    document.documentElement.setAttribute('dir', 'rtl');
    const el = await mount('Save');
    const start = document.createElement('span');
    start.slot = 'start';
    start.textContent = 'A';
    const end = document.createElement('span');
    end.slot = 'end';
    end.textContent = 'Z';
    el.prepend(start);
    el.append(end);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    const slots = [...(innerButton(el)?.querySelectorAll('slot') ?? [])].map((slot) =>
      slot.getAttribute('name'),
    );
    expect(slots).toEqual(['start', null, 'end']);
  });
});
