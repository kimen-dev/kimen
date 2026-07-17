import material3Css from '@kimen/tokens/css/material3?raw';
// @spec:019-ki-avatar
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { defineCustomElement } from '../dist/components/ki-avatar.js';

type KiAvatarElement = HTMLElement & {
  label?: string;
  src?: string;
  initials?: string;
  size: string;
};

const STYLE_ID = 'ki-avatar-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-avatar-browser-material3-token-style';
const BROKEN_PORTRAIT = 'data:image/png;base64,broken';

beforeAll(() => {
  defineCustomElement();
});

/** A guaranteed-valid portrait produced locally: no network, no fixtures. */
function portraitDataUri(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('canvas 2d context unavailable');
  }
  context.fillStyle = '#845abe';
  context.fillRect(0, 0, 8, 8);
  return canvas.toDataURL('image/png');
}

function ensureTokens(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = tokensCss;
  document.head.appendChild(style);
}

function ensureMaterial3Tokens(): void {
  if (document.getElementById(MATERIAL3_STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = MATERIAL3_STYLE_ID;
  style.textContent = material3Css;
  document.head.appendChild(style);
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
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
  landmark().replaceChildren();
}

async function until(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!condition() && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
}

/** Stencil renders async: wait until the avatar part exists. */
async function mount(
  container: HTMLElement,
  attributes: Partial<Record<'label' | 'src' | 'initials' | 'size', string>> = {},
): Promise<KiAvatarElement> {
  ensureTokens();
  const el = document.createElement('ki-avatar') as KiAvatarElement;
  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, value);
  }
  container.appendChild(el);
  await customElements.whenDefined('ki-avatar');
  await until(() => Boolean(el.shadowRoot?.querySelector('[part="avatar"]')));
  return el;
}

function boxOf(el: KiAvatarElement): HTMLElement {
  const box = el.shadowRoot?.querySelector<HTMLElement>('[part="avatar"]');
  expect(box).toBeTruthy();
  if (!box) {
    throw new Error('ki-avatar did not render its box');
  }
  return box;
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

function readTokenLength(name: string): number {
  const probe = document.createElement('div');
  probe.style.blockSize = `var(${name})`;
  document.body.appendChild(probe);
  const value = Number.parseFloat(getComputedStyle(probe).blockSize);
  probe.remove();
  return value;
}

describe('ki-avatar', () => {
  it('S1 shows the loaded portrait covering the themed avatar box', async () => {
    cleanup();
    const el = await mount(landmark(), {
      label: 'Ana García',
      src: portraitDataUri(),
      initials: 'AG',
    });
    const image = el.shadowRoot?.querySelector<HTMLImageElement>('[part="image"]');
    expect(image).toBeTruthy();
    if (!image) {
      throw new Error('portrait did not render');
    }
    await until(() => image.complete && image.naturalWidth > 0);

    expect(image.naturalWidth).toBeGreaterThan(0);
    const box = boxOf(el).getBoundingClientRect();
    expect(box.width).toBe(readTokenLength('--ki-avatar-md-size'));
    // The portrait fills the shape; initials and figure stay out of the tree.
    expect(image.getBoundingClientRect().width).toBeCloseTo(box.width, 0);
    expect(el.shadowRoot?.querySelector('[part="initials"]')).toBeNull();
    expect(el.shadowRoot?.querySelector('[part="icon"]')).toBeNull();
  });

  it('S2 falls back to the initials on a failing portrait with no broken-image artifact', async () => {
    cleanup();
    const el = await mount(landmark(), {
      label: 'Ana García',
      src: BROKEN_PORTRAIT,
      initials: 'AG',
    });
    await until(() => Boolean(el.shadowRoot?.querySelector('[part="initials"]')));

    expect(el.shadowRoot?.querySelector('[part="initials"]')?.textContent).toBe('AG');
    expect(el.shadowRoot?.querySelector('[part="image"]')).toBeNull();
    // The swap never changes the avatar size (FR-001).
    expect(boxOf(el).getBoundingClientRect().width).toBe(readTokenLength('--ki-avatar-md-size'));
  });

  it('S3 shows the built-in generic figure without portrait and initials', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Guest' });
    const icon = el.shadowRoot?.querySelector<SVGElement>('[part="icon"]');
    expect(icon).toBeTruthy();
    if (!icon) {
      throw new Error('generic figure did not render');
    }
    expect(icon.getBoundingClientRect().width).toBe(readTokenLength('--ki-avatar-md-icon-size'));
    expect(getComputedStyle(boxOf(el)).backgroundColor).toBe(readTokenColor('--ki-avatar-bg'));
  });

  it('S4 renders an unrecognized size at the default medium metrics', async () => {
    cleanup();
    const unknown = await mount(landmark(), { label: 'Ana García', initials: 'AG', size: 'mega' });
    expect(boxOf(unknown).getBoundingClientRect().width).toBe(
      readTokenLength('--ki-avatar-md-size'),
    );

    // The recognized ramp keeps resolving from its per-size tokens.
    const smallest = await mount(landmark(), { label: 'Ana García', initials: 'A', size: 'xxs' });
    expect(boxOf(smallest).getBoundingClientRect().width).toBe(
      readTokenLength('--ki-avatar-xxs-size'),
    );
    const largest = await mount(landmark(), { label: 'Ana García', initials: 'AG', size: 'xl' });
    expect(boxOf(largest).getBoundingClientRect().width).toBe(
      readTokenLength('--ki-avatar-xl-size'),
    );
    expect(getComputedStyle(boxOf(largest)).fontSize).toBe(
      `${String(readTokenLength('--ki-avatar-xl-font-size'))}px`,
    );
  });

  it('S8 exposes a labeled avatar as one named image with no interactive role', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Ana García', initials: 'AG' });
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('Ana García');
    expect(el.getAttribute('aria-hidden')).toBeNull();
    expect(el.getAttribute('tabindex')).toBeNull();

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S9 keeps an unlabeled avatar out of the accessibility tree beside the visible name', async () => {
    cleanup();
    const row = document.createElement('p');
    landmark().appendChild(row);
    const el = await mount(row, { initials: 'AG' });
    const text = document.createElement('span');
    text.textContent = 'Ana García';
    row.appendChild(text);

    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.getAttribute('role')).toBeNull();
    expect(el.getAttribute('aria-label')).toBeNull();
    expect(row.textContent).toContain('Ana García');

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S11 restyles shape, colors and metrics through material3 tokens alone', async () => {
    cleanup();
    ensureTokens();
    const onmars = await mount(landmark(), { label: 'Ana García', initials: 'AG' });
    const onmarsBorder = getComputedStyle(boxOf(onmars)).borderColor;
    const markup = onmars.outerHTML;
    onmars.remove();

    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    const el = await mount(landmark(), { label: 'Ana García', initials: 'AG' });
    const box = boxOf(el);

    expect(el.outerHTML).toBe(markup);
    expect(getComputedStyle(box).backgroundColor).toBe(readTokenColor('--ki-avatar-bg'));
    expect(getComputedStyle(box).borderColor).toBe(readTokenColor('--ki-avatar-border-color'));
    // material3 disables the MarsUI hairline (avatar.material3 override).
    expect(getComputedStyle(box).borderColor, 'material3 must restyle the border').not.toBe(
      onmarsBorder,
    );
    expect(box.getBoundingClientRect().width).toBe(readTokenLength('--ki-avatar-md-size'));

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
