import axe from 'axe-core';
import { page, userEvent } from 'vitest/browser';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:002-ki-button
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import material3Css from '@kimen/tokens/css/material3?raw';
import { defineCustomElement } from '../dist/components/ki-button.js';

type KiButtonElement = HTMLElement & {
  disabled: boolean;
  name: string;
  size: string;
  tone: string;
  type: string;
  value: string;
  variant: string;
};

const STYLE_ID = 'ki-button-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-button-browser-material3-token-style';
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

function ensureMaterial3Tokens(): void {
  if (document.getElementById(MATERIAL3_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = MATERIAL3_STYLE_ID;
  style.textContent = material3Css;
  document.head.append(style);
}

function cleanup(): void {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
}

/** Stencil renders async: wait until the shadow root has content. */
async function mount(
  label = 'Save',
  attributes: Partial<
    Record<'disabled' | 'name' | 'size' | 'tone' | 'type' | 'value' | 'variant', string | boolean>
  > = {},
  parent: ParentNode = document.body,
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
  parent.appendChild(el);
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

async function waitForStyles(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.backgroundColor = `var(${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
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
    await mount('Save');

    await expect.element(page.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('S6 exposes disabled state as unavailable', async () => {
    cleanup();
    const el = await mount('Save', { disabled: true });
    const button = requireButton(el);

    expect(button).toHaveProperty('disabled', true);
  });

  it('S2 observes no activation from a real click on a disabled button', async () => {
    cleanup();
    const el = await mount('Save', { disabled: true });
    let activations = 0;
    el.addEventListener('click', () => {
      activations += 1;
    });

    // Pointer events pass through the disabled native button without
    // dispatching click; force:true skips actionability so the attempt
    // itself is what we assert.
    await userEvent.click(el, { force: true }).catch(() => undefined);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(activations).toBe(0);
  });

  it('S2 stays inert and takes the disabled appearance inside a disabled fieldset', async () => {
    cleanup();
    ensureTokens();
    const form = document.createElement('form');
    const fieldset = document.createElement('fieldset');
    fieldset.disabled = true;
    form.append(fieldset);
    document.body.append(form);
    const el = await mount('Save', { variant: 'primary' }, fieldset);
    const button = requireButton(el);
    await waitForStyles();

    expect(button).toHaveProperty('disabled', true);
    expect(getComputedStyle(button).backgroundColor).toBe(
      readTokenColor('--ki-button-primary-neutral-disabled-bg'),
    );
  });

  it('zero axe violations across the variant tone size matrix (SC-003)', async () => {
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

  it('S13 keeps start and end slots in logical order under RTL', async () => {
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

    // Rendered geometry, not just slot order: under RTL the start content
    // must sit visually to the RIGHT of the end content (leading edge), which
    // physical properties or a forced direction would break silently.
    const startRect = start.getBoundingClientRect();
    const endRect = end.getBoundingClientRect();
    expect(startRect.left, 'start leads (right side) under RTL').toBeGreaterThan(endRect.left);
  });

  it('S7 submits its form with field data and the submitter name value', async () => {
    cleanup();
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.name = 'title';
    input.value = 'Mars';
    form.append(input);
    document.body.append(form);
    const el = await mount('Save', { name: 'intent', type: 'submit', value: 'publish' }, form);
    const button = requireButton(el);
    let submittedData: Record<string, string> | undefined;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const submitter = event.submitter;
      submittedData = Object.fromEntries(
        [...new FormData(form, submitter)].map(([name, value]) => [
          name,
          value instanceof File ? value.name : value,
        ]),
      );
    });

    await userEvent.click(button);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(submittedData).toEqual({ intent: 'publish', title: 'Mars' });
  });

  it('S7 pins the cancellation contract: click preventDefault does not stop submission, the submit event does', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    const el = await mount('Save', { type: 'submit' }, form);
    const button = requireButton(el);
    el.addEventListener('click', (event) => {
      event.preventDefault();
    });
    let submissions = 0;
    form.addEventListener('submit', (event) => {
      // preventDefault here IS the supported cancellation point (documented
      // divergence from native buttons, where click preventDefault cancels).
      event.preventDefault();
      submissions += 1;
    });

    await userEvent.click(button);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(submissions).toBe(1);
  });

  it('S8 does not submit when type is button', async () => {
    cleanup();
    const form = document.createElement('form');
    document.body.append(form);
    const el = await mount('Save', { type: 'button' }, form);
    const button = requireButton(el);
    let submissions = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submissions += 1;
    });

    await userEvent.click(button);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(submissions).toBe(0);
  });

  it('S12 restores field defaults when type is reset', async () => {
    cleanup();
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.name = 'title';
    input.defaultValue = 'Mars';
    input.value = 'Venus';
    form.append(input);
    document.body.append(form);
    const el = await mount('Reset', { type: 'reset' }, form);
    const button = requireButton(el);

    await userEvent.click(button);
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(input.value).toBe('Mars');
  });

  it('S9 resolves each variant tone background from material3 component tokens', async () => {
    cleanup();
    ensureTokens();

    // Capture the onmars resolution FIRST so the theme assertion cannot pass
    // tautologically: if the material3 stylesheet or the data-ki-theme wiring
    // silently broke, values would stay at the onmars baseline.
    const onmarsBaseline = new Map<string, string>();
    for (const variant of variants) {
      const el = await mount(`${variant} baseline`, { variant, tone: 'neutral' });
      const button = requireButton(el);
      await waitForStyles();
      onmarsBaseline.set(variant, getComputedStyle(button).backgroundColor);
      el.remove();
    }

    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');

    for (const variant of variants) {
      for (const tone of tones) {
        const el = await mount(`${variant} ${tone}`, { variant, tone });
        const button = requireButton(el);
        await waitForStyles();

        const state = button.matches(':hover') ? 'hover' : 'rest';
        const expected = readTokenColor(`--ki-button-${variant}-${tone}-${state}-bg`);
        const actual = getComputedStyle(button).backgroundColor;
        expect(actual, `${variant}/${tone}`).toBe(expected);
        // Brand-colored cells must actually change theme (m3 legitimately
        // inherits some non-brand values from the shared base layer).
        if (tone === 'neutral' && (variant === 'primary' || variant === 'secondary')) {
          expect(actual, `${variant} must restyle under material3`).not.toBe(
            onmarsBaseline.get(variant),
          );
        }
      }
    }
  });

  it('S10 resolves forced dark appearance from onmars dark component tokens', async () => {
    cleanup();
    ensureTokens();
    const light = await mount('Save', { variant: 'primary', tone: 'neutral' });
    await waitForStyles();
    const lightBg = getComputedStyle(requireButton(light)).backgroundColor;
    light.remove();

    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
    const el = await mount('Save', { variant: 'primary', tone: 'neutral' });
    const button = requireButton(el);
    await waitForStyles();

    const darkBg = getComputedStyle(button).backgroundColor;
    expect(darkBg).toBe(
      readTokenColor(
        `--ki-button-primary-neutral-${button.matches(':hover') ? 'hover' : 'rest'}-bg`,
      ),
    );
    expect(darkBg, 'forced dark must change the resolved fill').not.toBe(lightBg);
  });

  it('S11 renders an unknown variant with the default variant appearance', async () => {
    cleanup();
    ensureTokens();
    const el = await mount('Save', { variant: 'loud' });
    const button = requireButton(el);
    await waitForStyles();

    expect(getComputedStyle(button).backgroundColor).toBe(
      readTokenColor('--ki-button-secondary-neutral-rest-bg'),
    );
  });

  it('S2 renders the disabled appearance from the disabled matrix cells in every variant', async () => {
    cleanup();
    ensureTokens();

    for (const variant of variants) {
      const el = await mount(`${variant} disabled`, { variant, tone: 'neutral', disabled: true });
      const button = requireButton(el);
      await waitForStyles();

      expect(getComputedStyle(button).backgroundColor, `${variant} disabled bg`).toBe(
        readTokenColor(`--ki-button-${variant}-neutral-disabled-bg`),
      );
      expect(getComputedStyle(button).color, `${variant} disabled fg`).toBe(
        readTokenColor(`--ki-button-${variant}-neutral-disabled-fg`),
      );
      expect(getComputedStyle(button).borderTopColor, `${variant} disabled border`).toBe(
        readTokenColor(`--ki-button-${variant}-neutral-disabled-border`),
      );
    }
  });
});
