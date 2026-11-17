import material3Css from '@kimen/tokens/css/material3?raw';
// @spec:019-ki-avatar
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-avatar.js';
import { expectAccessible } from './axe';
import { repaintedUnderForcedDark } from './color-scheme';
import { alphaOf, paintContrast } from './contracts';

type KiAvatarElement = HTMLElement & {
  label?: string;
  src?: string;
  initials?: string;
  size: string;
};

const browserCommands = commands as unknown as {
  emulateReducedMotion: (reducedMotion: 'reduce' | 'no-preference' | null) => Promise<void>;
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
    // The default medium avatar is a 40px box (MarsUI Avatar md).
    expect(box.width).toBe(40);
    // The portrait fills the shape; initials and figure stay out of the tree.
    expect(image.getBoundingClientRect().width).toBeCloseTo(box.width, 0);
    expect(el.shadowRoot?.querySelector('[part="initials"]')).toBeNull();
    expect(el.shadowRoot?.querySelector('[part="icon"]')).toBeNull();
  });

  // A portrait is decoration next to a name: it must never compete with the
  // page for the network or the main thread. Lazy fetching is also what keeps
  // an avatar nobody can see (a member behind an avatar group's cap) from
  // downloading its image at all — asserted in the group suite.
  it('fetches the portrait lazily and decodes it off the main thread', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Ana García', src: portraitDataUri() });
    const image = el.shadowRoot?.querySelector<HTMLImageElement>('[part="image"]');

    expect(image?.getAttribute('loading')).toBe('lazy');
    expect(image?.getAttribute('decoding')).toBe('async');
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
    expect(boxOf(el).getBoundingClientRect().width).toBe(40);
  });

  it('S3 shows the built-in generic figure without portrait and initials', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Guest' });
    const icon = el.shadowRoot?.querySelector<SVGElement>('[part="icon"]');
    expect(icon).toBeTruthy();
    if (!icon) {
      throw new Error('generic figure did not render');
    }
    expect(icon.getBoundingClientRect().width).toBe(20);
    // Visible: the figure reads against the avatar surface (WCAG 1.4.11).
    expect(
      paintContrast(getComputedStyle(icon).color, getComputedStyle(boxOf(el)).backgroundColor),
    ).toBeGreaterThanOrEqual(3);
  });

  it('fades each fallback step in through an opacity-only transition gated by reduced motion', async () => {
    cleanup();
    await browserCommands.emulateReducedMotion('no-preference');
    const el = await mount(landmark(), {
      label: 'Ana García',
      src: portraitDataUri(),
      initials: 'AG',
    });
    const image = el.shadowRoot?.querySelector<HTMLElement>('[part="image"]');
    expect(image).toBeTruthy();
    if (!image) {
      throw new Error('portrait did not render');
    }
    // Opacity ALONE transitions (motion tokens): the silent-fallback
    // contract keeps layout and the surface beneath untouched (FR-001).
    expect(getComputedStyle(image).transitionProperty).toBe('opacity');
    expect(Number.parseFloat(getComputedStyle(image).transitionDuration)).toBeGreaterThan(0);

    // Under reduced motion the gate removes the transition entirely: every
    // fallback step appears instantly (Art. V by construction).
    await browserCommands.emulateReducedMotion('reduce');
    expect(getComputedStyle(image).transitionProperty).toBe('all');
    expect(Number.parseFloat(getComputedStyle(image).transitionDuration)).toBe(0);
    await browserCommands.emulateReducedMotion(null);
  });

  it('S4 renders an unrecognized size at the default medium metrics', async () => {
    cleanup();
    const unknown = await mount(landmark(), { label: 'Ana García', initials: 'AG', size: 'mega' });
    const medium = await mount(landmark(), { label: 'Ana García', initials: 'AG', size: 'md' });
    expect(boxOf(unknown).getBoundingClientRect().width).toBe(
      boxOf(medium).getBoundingClientRect().width,
    );
    expect(getComputedStyle(boxOf(unknown)).fontSize).toBe(
      getComputedStyle(boxOf(medium)).fontSize,
    );

    // The recognized ramp keeps its own metrics: 20px xxs, 56px xl.
    const smallest = await mount(landmark(), { label: 'Ana García', initials: 'A', size: 'xxs' });
    expect(boxOf(smallest).getBoundingClientRect().width).toBe(20);
    const largest = await mount(landmark(), { label: 'Ana García', initials: 'AG', size: 'xl' });
    expect(boxOf(largest).getBoundingClientRect().width).toBe(56);
    expect(getComputedStyle(boxOf(largest)).fontSize).toBe('18px');
  });

  it('S8 exposes a labeled avatar as one named image with no interactive role', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Ana García', initials: 'AG' });
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('Ana García');
    expect(el.getAttribute('aria-hidden')).toBeNull();
    expect(el.getAttribute('tabindex')).toBeNull();

    await expectAccessible(document.body);
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

    await expectAccessible(document.body);
  });

  it('S12 honors a forced dark scheme: the avatar surface repaints', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Ana García', initials: 'AG' });

    expect(await repaintedUnderForcedDark(el)).toContain('avatar');
  });

  it('S11 restyles shape, colors and metrics through material3 tokens alone', async () => {
    cleanup();
    ensureTokens();
    const onmars = await mount(landmark(), { label: 'Ana García', initials: 'AG' });
    const onmarsBorder = getComputedStyle(boxOf(onmars)).borderColor;
    const onmarsSurface = getComputedStyle(boxOf(onmars)).backgroundColor;
    const markup = onmars.outerHTML;
    onmars.remove();

    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    const el = await mount(landmark(), { label: 'Ana García', initials: 'AG' });
    const box = boxOf(el);

    expect(el.outerHTML).toBe(markup);
    // material3 paints its own primary surface and disables the MarsUI
    // hairline (the border is fully transparent); the box keeps 40px.
    expect(getComputedStyle(box).backgroundColor).not.toBe(onmarsSurface);
    expect(alphaOf(onmarsBorder)).toBeGreaterThan(0);
    expect(alphaOf(getComputedStyle(box).borderColor)).toBe(0);
    expect(box.getBoundingClientRect().width).toBe(40);

    await expectAccessible(document.body);
  });
});
