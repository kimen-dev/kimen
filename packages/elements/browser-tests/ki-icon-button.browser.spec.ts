import axe from 'axe-core';
import { page, userEvent } from 'vitest/browser';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:022-ki-icon-button
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import material3Css from '@kimen/tokens/css/material3?raw';
import { defineCustomElement } from '../dist/components/ki-icon-button.js';

type KiIconButtonElement = HTMLElement & {
  disabled: boolean;
  label: string;
  size: string;
  tone: string;
  variant: string;
};
const defineKiIconButtonElement: () => void = defineCustomElement;

const STYLE_ID = 'ki-icon-button-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-icon-button-browser-material3-token-style';
const variants = ['primary', 'secondary', 'tertiary', 'quaternary', 'ghost'] as const;
const tones = ['neutral', 'success', 'danger'] as const;
const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const;
const CLOSE_ICON =
  '<svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2"/></svg>';

beforeAll(() => {
  defineKiIconButtonElement();
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

function landmark(): HTMLElement {
  let main = document.querySelector('main');
  if (!main) {
    main = document.createElement('main');
    document.body.appendChild(main);
  }
  return main;
}

function cleanup(): void {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
}

/** Stencil renders async: wait until the shadow root has content. */
async function mount(
  label: string | null = 'Close',
  attributes: Partial<Record<'disabled' | 'size' | 'tone' | 'variant', string | boolean>> = {},
  parent: ParentNode = landmark(),
): Promise<KiIconButtonElement> {
  ensureTokens();
  const el = document.createElement('ki-icon-button') as KiIconButtonElement;
  if (label !== null) {
    el.setAttribute('label', label);
  }
  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      el.toggleAttribute(name, value);
    } else {
      el.setAttribute(name, value);
    }
  }
  el.innerHTML = CLOSE_ICON;
  parent.appendChild(el);
  await customElements.whenDefined('ki-icon-button');
  const deadline = Date.now() + 500;
  while (!el.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return el;
}

function requireButton(el: KiIconButtonElement): HTMLButtonElement {
  const button = el.shadowRoot?.querySelector('button');
  expect(button).toBeInstanceOf(HTMLButtonElement);
  if (!button) {
    throw new Error('ki-icon-button did not render an internal native button');
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

describe('ki-icon-button in a real browser', () => {
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

  it('S2 observes no activation from a real click on a disabled icon button', async () => {
    cleanup();
    const el = await mount('Close', { disabled: true });
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

  it('S3 renders an unknown variant with the default variant appearance', async () => {
    cleanup();
    ensureTokens();
    const el = await mount('Close', { variant: 'loud' });
    const button = requireButton(el);
    await waitForStyles();

    expect(getComputedStyle(button).backgroundColor).toBe(
      readTokenColor('--ki-icon-button-secondary-neutral-rest-bg'),
    );
  });

  it('S4 reaches the icon button with Tab and shows a visible focus indication', async () => {
    cleanup();
    const el = await mount();
    const button = requireButton(el);

    await userEvent.keyboard('{Tab}');

    expect(el.shadowRoot?.activeElement).toBe(button);
    const focused = getComputedStyle(button);
    expect(`${focused.outlineStyle} ${focused.boxShadow}`).not.toBe('none none');
  });

  it('S5 activates the focused icon button exactly once for Enter and Space', async () => {
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

  it('S6 exposes a button named from label while the icon contributes nothing', async () => {
    cleanup();
    const el = await mount('Close');
    const button = requireButton(el);

    await expect.element(page.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    // The slotted icon is presentational: it renders inside an aria-hidden
    // wrapper and never adds name, role or text of its own (FR-005).
    const icon = button.querySelector('[part="icon"]');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(button.textContent.trim()).toBe('');

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S6 fails the accessibility audit when rendered without a label', async () => {
    cleanup();
    const el = await mount(null);
    requireButton(el);
    await waitForStyles();

    const results = await axe.run(document.body);
    expect(results.violations.map(({ id }) => id)).toContain('button-name');
  });

  it('S7 exposes disabled state as unavailable', async () => {
    cleanup();
    const el = await mount('Close', { disabled: true });
    const button = requireButton(el);

    expect(button).toHaveProperty('disabled', true);
  });

  it('S8 forwards a host aria-description onto the delegated inner button', async () => {
    cleanup();
    ensureTokens();
    // Focus delegates to the inner <button>, so a description on the host
    // (e.g. written by a wrapping ki-tooltip) is only announced once
    // mirrored down (FR-014).
    const el = document.createElement('ki-icon-button') as KiIconButtonElement;
    el.setAttribute('label', 'Close');
    el.setAttribute('aria-description', 'Closes the dialog');
    el.innerHTML = CLOSE_ICON;
    landmark().append(el);
    await customElements.whenDefined('ki-icon-button');
    const deadline = Date.now() + 500;
    while (!el.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    const button = requireButton(el);

    // The observer schedules a re-render, so let the state change settle.
    const settle = async (): Promise<void> => {
      await waitForStyles();
      await waitForStyles();
    };

    // Present at mount.
    expect(button.getAttribute('aria-description')).toBe('Closes the dialog');

    // S12 tracks a later change (a tooltip re-labelling its trigger).
    el.setAttribute('aria-description', 'Closes the settings panel');
    await settle();
    expect(button.getAttribute('aria-description')).toBe('Closes the settings panel');

    // S13 tracks removal (tooltip teardown).
    el.removeAttribute('aria-description');
    await settle();
    expect(button.hasAttribute('aria-description')).toBe(false);

    // No axe violations with the forwarded description present.
    el.setAttribute('aria-description', 'Closes the dialog');
    await settle();
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S9 never submits an enclosing form', async () => {
    cleanup();
    const form = document.createElement('form');
    const input = document.createElement('input');
    input.name = 'title';
    input.value = 'Mars';
    form.append(input);
    landmark().append(form);
    const el = await mount('Clear', {}, form);
    const button = requireButton(el);
    let submissions = 0;
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submissions += 1;
    });

    await userEvent.click(button);
    button.focus();
    await userEvent.keyboard('{Enter}');
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(submissions).toBe(0);
    expect(input.value).toBe('Mars');
  });

  it('S10 resolves each variant tone background from material3 component tokens', async () => {
    cleanup();
    ensureTokens();

    // Capture the onmars resolution FIRST so the theme assertion cannot pass
    // tautologically: if the material3 stylesheet or the data-ki-theme wiring
    // silently broke, values would stay at the onmars baseline.
    const onmarsBaseline = new Map<string, string>();
    for (const variant of variants) {
      const el = await mount('Close', { variant, tone: 'neutral' });
      const button = requireButton(el);
      await waitForStyles();
      onmarsBaseline.set(variant, getComputedStyle(button).backgroundColor);
      el.remove();
    }

    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');

    for (const variant of variants) {
      for (const tone of tones) {
        const el = await mount('Close', { variant, tone });
        const button = requireButton(el);
        await waitForStyles();

        const state = button.matches(':hover') ? 'hover' : 'rest';
        const expected = readTokenColor(`--ki-icon-button-${variant}-${tone}-${state}-bg`);
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

  it('S11 resolves forced dark appearance from onmars dark component tokens', async () => {
    cleanup();
    ensureTokens();
    // Probe the SECONDARY glass fill: the primary fill is
    // Surface/primary_med_em = brand 500 in BOTH schemes (002 §2.1), so only
    // the scheme-dependent secondary_alpha_base can prove the dark switch.
    const light = await mount('Close', { variant: 'secondary', tone: 'neutral' });
    await waitForStyles();
    const lightBg = getComputedStyle(requireButton(light)).backgroundColor;
    light.remove();

    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
    const el = await mount('Close', { variant: 'secondary', tone: 'neutral' });
    const button = requireButton(el);
    await waitForStyles();

    const darkBg = getComputedStyle(button).backgroundColor;
    expect(darkBg).toBe(
      readTokenColor(
        `--ki-icon-button-secondary-neutral-${button.matches(':hover') ? 'hover' : 'rest'}-bg`,
      ),
    );
    expect(darkBg, 'forced dark must change the resolved fill').not.toBe(lightBg);
  });

  it('S14 keeps a disabled icon button out of the tab order', async () => {
    cleanup();
    const main = landmark();
    const first = document.createElement('button');
    first.textContent = 'first';
    main.append(first);
    await mount('Close', { disabled: true });
    const second = document.createElement('button');
    second.textContent = 'second';
    main.append(second);

    first.focus();
    await userEvent.keyboard('{Tab}');

    expect(document.activeElement).toBe(second);
  });

  it('S2 renders the disabled appearance from the disabled matrix cells in every variant', async () => {
    cleanup();
    ensureTokens();

    for (const variant of variants) {
      const el = await mount('Close', { variant, tone: 'neutral', disabled: true });
      const button = requireButton(el);
      await waitForStyles();

      expect(getComputedStyle(button).backgroundColor, `${variant} disabled bg`).toBe(
        readTokenColor(`--ki-icon-button-${variant}-neutral-disabled-bg`),
      );
      expect(getComputedStyle(button).color, `${variant} disabled fg`).toBe(
        readTokenColor(`--ki-icon-button-${variant}-neutral-disabled-fg`),
      );
      expect(getComputedStyle(button).borderTopColor, `${variant} disabled border`).toBe(
        readTokenColor(`--ki-icon-button-${variant}-neutral-disabled-border`),
      );
    }
  });

  it('exact squares, the icon ramp, glass effects and zero axe violations across the matrix (SC-003, SC-004)', async () => {
    cleanup();
    ensureTokens();
    // Figma Icon_button set: exact squares per size and the icon ramp one
    // step above the button ramp
    // (specs/022-ki-icon-button/design-extraction.md).
    const expectedBox = { xs: 24, sm: 32, md: 40, lg: 48, xl: 56 } as const;
    const expectedIcon = { xs: 16, sm: 18, md: 20, lg: 24, xl: 28 } as const;
    for (const variant of variants) {
      for (const tone of tones) {
        for (const size of sizes) {
          const el = await mount(`${variant} ${tone} ${size}`, { variant, tone, size });
          const button = requireButton(el);
          await waitForStyles();

          // Border-box square must be exactly 24/32/40/48/56 per size (the
          // 1px inner stroke never adds to the scale) — the WCAG 2.2 pointer
          // target floor of 24px holds at xs by construction (SC-004).
          const rect = button.getBoundingClientRect();
          expect(rect.height, `${variant}/${tone}/${size} height`).toBe(expectedBox[size]);
          expect(rect.width, `${variant}/${tone}/${size} width`).toBe(expectedBox[size]);

          if (tone !== 'neutral') {
            continue;
          }
          const icon = el.querySelector('svg');
          const iconRect = icon?.getBoundingClientRect();
          expect(iconRect?.height, `${variant}/${size} icon size`).toBe(expectedIcon[size]);
          expect(iconRect?.width, `${variant}/${size} icon size`).toBe(expectedIcon[size]);

          if (size !== 'md') {
            continue;
          }
          const style = getComputedStyle(button);
          if (variant === 'primary' || variant === 'secondary') {
            // Glass variants carry the MarsUI Blur/24 backdrop, exported as
            // blur(12px) (002 §0; verified on the Icon_button set).
            expect(style.backdropFilter, `${variant} glass backdrop`).toContain('blur');
          }
          if (variant === 'ghost') {
            // Non-glass variants stay off the glass path entirely: computed
            // backdrop-filter is none, not blur(0).
            expect(style.backdropFilter, 'ghost has no backdrop filter').toBe('none');
          }
          if (variant === 'primary') {
            // MarsUI bevel: the block-end border edge is darker than the
            // block-start edge (Black/18 vs Black/8, 002 §2.1).
            expect(style.borderBlockEndColor, 'primary bevel bottom differs from top').not.toBe(
              style.borderBlockStartColor,
            );
          }
        }
      }
    }

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
