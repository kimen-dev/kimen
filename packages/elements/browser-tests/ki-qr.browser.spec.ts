import material3Css from '@kimen/tokens/css/material3?raw';
// @spec:026-ki-qr
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
//
// The round-trip contract (FR-001) is verified with an INDEPENDENT decoder:
// the rendered SVG — with its token-resolved computed colors and shape radii
// baked in — is rasterized onto a canvas and decoded with jsQR (a devDep
// that shares no code with the vendored encoder). Byte-exactness is asserted
// through the decoder's raw bytes, not its lossy text guess.
import tokensCss from '@kimen/tokens/css?raw';
import axe from 'axe-core';
import jsQR from 'jsqr';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-qr.js';

type KiQrElement = HTMLElement & { value?: string; label?: string };

const browserCommands = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
};

const STYLE_ID = 'ki-qr-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-qr-browser-material3-token-style';

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
  document.documentElement.removeAttribute('dir');
  document.documentElement.style.removeProperty('--ki-qr-module-radius');
  document.documentElement.style.removeProperty('--ki-qr-finder-radius');
  landmark().replaceChildren();
}

async function waitUntil(condition: () => boolean, what: string): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!condition() && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  expect(condition(), what).toBe(true);
}

/** Stencil renders async: wait until the code tile exists (when expected). */
async function mount(
  container: HTMLElement,
  attributes: Record<string, string> = {},
): Promise<KiQrElement> {
  ensureTokens();
  const el = document.createElement('ki-qr') as KiQrElement;
  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, value);
  }
  container.appendChild(el);
  await customElements.whenDefined('ki-qr');
  // A rendered ki-qr either shows its code tile or resolves to the clean
  // empty state (aria-hidden host) — absent/empty/overflowing values.
  await waitUntil(
    () =>
      Boolean(el.shadowRoot?.querySelector('[part="code"]')) ||
      el.getAttribute('aria-hidden') === 'true',
    'ki-qr did not render',
  );
  return el;
}

function codeOf(el: KiQrElement): SVGSVGElement {
  const svg = el.shadowRoot?.querySelector<SVGSVGElement>('svg[part="code"]');
  expect(svg).toBeTruthy();
  if (!svg) {
    throw new Error('ki-qr did not render its code');
  }
  return svg;
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

/** WCAG relative luminance of a computed rgb()/rgba() color. */
function luminanceOf(color: string): number {
  const parts = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
  expect(parts, `parseable color: ${color}`).toBeTruthy();
  if (!parts) {
    throw new Error(`Unparseable color: ${color}`);
  }
  const channel = (raw: string): number => {
    const c = Number.parseInt(raw, 10) / 255;
    return c <= 0.040_45 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [, r, g, b] = parts;
  return 0.2126 * channel(r ?? '0') + 0.7152 * channel(g ?? '0') + 0.0722 * channel(b ?? '0');
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(luminanceOf(foreground), luminanceOf(background));
  const darker = Math.min(luminanceOf(foreground), luminanceOf(background));
  return (lighter + 0.05) / (darker + 0.05);
}

const RASTER = 640;
const MARGIN = 64;

/**
 * Independent round-trip decode of the RENDERED code (FR-001): the shadow
 * SVG is cloned with every rect's token-resolved computed paint and radius
 * baked in as attributes, rasterized over the tile color, and read back
 * with jsQR. Returns the decoded bytes as UTF-8 text, or null.
 */
async function decodeRendered(el: KiQrElement): Promise<string | null> {
  const svg = el.shadowRoot?.querySelector<SVGSVGElement>('svg[part="code"]');
  if (!svg) {
    return null;
  }
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const sources = Array.from(svg.querySelectorAll('rect'));
  const targets = Array.from(clone.querySelectorAll('rect'));
  sources.forEach((rect, index) => {
    const style = getComputedStyle(rect);
    const target = targets[index];
    if (!target) {
      return;
    }
    target.setAttribute('fill', style.fill);
    target.setAttribute('stroke', style.stroke);
    target.setAttribute('stroke-width', style.strokeWidth);
    target.setAttribute('rx', String(Number.parseFloat(style.rx) || 0));
  });
  clone.setAttribute('width', String(RASTER));
  clone.setAttribute('height', String(RASTER));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }),
  );
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = RASTER + 2 * MARGIN;
    canvas.height = RASTER + 2 * MARGIN;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }
    context.fillStyle = getComputedStyle(svg).backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, MARGIN, MARGIN, RASTER, RASTER);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const found = jsQR(pixels.data, pixels.width, pixels.height);
    return found ? new TextDecoder().decode(new Uint8Array(found.binaryData)) : null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

describe('ki-qr', () => {
  it('S1 decodes back to exactly the declared value, tokens-only, for every Examples payload', async () => {
    cleanup();
    // The Examples table of the approved feature: URL, Latin accents plus
    // punctuation, CJK, emoji plus a non-ASCII numero sign — byte-exact.
    const values = [
      'https://onmars.dev',
      'Reunión mañana — Zúrich',
      'こんにちは世界',
      'Ticket 🎫 №42',
    ];
    for (const value of values) {
      const el = await mount(landmark(), { value, label: 'Open on your phone' });
      expect(await decodeRendered(el), `round trip of ${value}`).toBe(value);
      el.remove();
    }

    // Geometry and paint resolve from tokens (FR-006): the 120px square
    // tile, the 8px quiet zone and the scheme-stable dark-on-light pair
    // at scanner-safe non-text contrast (FR-010).
    const el = await mount(landmark(), { value: 'https://onmars.dev', label: 'Open' });
    const code = codeOf(el);
    const rect = code.getBoundingClientRect();
    expect(rect.width).toBe(readTokenLength('--ki-qr-size'));
    expect(rect.height).toBe(rect.width);
    const style = getComputedStyle(code);
    expect(style.backgroundColor).toBe(readTokenColor('--ki-qr-background'));
    expect(Number.parseFloat(style.paddingBlockStart)).toBe(readTokenLength('--ki-qr-quiet-zone'));
    const module = code.querySelector('.module');
    expect(module).toBeTruthy();
    if (!module) {
      throw new Error('ki-qr rendered no modules');
    }
    const moduleStyle = getComputedStyle(module);
    expect(moduleStyle.fill).toBe(readTokenColor('--ki-qr-color'));
    expect(contrastRatio(moduleStyle.fill, style.backgroundColor)).toBeGreaterThanOrEqual(3);
  });

  it('S2 re-encodes the code when the value changes', async () => {
    cleanup();
    const el = await mount(landmark(), { value: 'https://onmars.dev', label: 'Open' });
    expect(await decodeRendered(el)).toBe('https://onmars.dev');
    const signature = (): string =>
      Array.from(codeOf(el).querySelectorAll('.module'))
        .map((module) => `${module.getAttribute('x') ?? ''},${module.getAttribute('y') ?? ''}`)
        .join(';');
    const before = signature();

    el.setAttribute('value', 'https://onmars.dev/pricing');
    await waitUntil(() => signature() !== before, 'the code did not re-encode');

    expect(await decodeRendered(el)).toBe('https://onmars.dev/pricing');
  });

  it('S3 renders nothing, exposes nothing and breaks nothing without a value', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Open on your phone' });
    expect(el.shadowRoot?.querySelector('svg')).toBeNull();
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.getAttribute('role')).toBeNull();

    // The page around it keeps rendering and auditing clean.
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S4 renders the default appearance under an unrecognized shape attribute and still decodes', async () => {
    cleanup();
    const control = await mount(landmark(), { value: 'https://onmars.dev', label: 'Open' });
    const controlViewBox = codeOf(control).getAttribute('viewBox');
    control.remove();

    const el = await mount(landmark(), {
      value: 'https://onmars.dev',
      label: 'Open',
      shape: 'circle',
      type: 'round',
      variant: 'dots',
    });

    // Unknown vocabulary from another design system matches no code path
    // and no selector: same anatomy, same token-resolved appearance.
    expect(codeOf(el).getAttribute('viewBox')).toBe(controlViewBox);
    const module = codeOf(el).querySelector('.module');
    expect(module).toBeTruthy();
    if (!module) {
      throw new Error('ki-qr rendered no modules');
    }
    expect(Number.parseFloat(getComputedStyle(module).rx)).toBe(
      readTokenLength('--ki-qr-module-radius'),
    );
    expect(await decodeRendered(el)).toBe('https://onmars.dev');
  });

  it('S5 adds no keyboard stop between two buttons', async () => {
    cleanup();
    const previous = document.createElement('button');
    previous.textContent = 'Copy link';
    landmark().appendChild(previous);
    const el = await mount(landmark(), { value: 'https://onmars.dev', label: 'Open' });
    const next = document.createElement('button');
    next.textContent = 'Done';
    landmark().appendChild(next);

    previous.focus();
    expect(document.activeElement).toBe(previous);
    await userEvent.keyboard('{Tab}');

    expect(document.activeElement).toBe(next);
    expect(el.contains(document.activeElement)).toBe(false);
    expect(el.shadowRoot?.activeElement ?? null).toBeNull();
  });

  it('S6 exposes exactly one image named by the purpose-stating label', async () => {
    cleanup();
    const el = await mount(landmark(), {
      value: 'https://onmars.dev',
      label: 'Open onmars.dev on your phone',
    });
    el.id = 's6-qr';

    // The REAL computed accessibility tree (Playwright ariaSnapshot): one
    // image with the purpose-stating name, no interactive role or state,
    // nothing exposed below it.
    const snapshot = await browserCommands.ariaSnapshot('#s6-qr');
    expect(snapshot.trim()).toBe('- img "Open onmars.dev on your phone"');

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S7 names the image with the encoded value when no label exists', async () => {
    cleanup();
    const el = await mount(landmark(), { value: 'https://onmars.dev' });
    el.id = 's7-qr';

    const snapshot = await browserCommands.ariaSnapshot('#s7-qr');
    expect(snapshot.trim()).toBe('- img "https://onmars.dev"');
  });

  it('S8 restyles through material3 tokens alone and keeps decoding', async () => {
    cleanup();
    ensureTokens();
    const onmars = await mount(landmark(), { value: 'https://onmars.dev', label: 'Open' });
    const onmarsRadius = readTokenLength('--ki-qr-radius');
    const onmarsQuietZone = readTokenLength('--ki-qr-quiet-zone');
    const markup = onmars.outerHTML;
    onmars.remove();

    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    const el = await mount(landmark(), { value: 'https://onmars.dev', label: 'Open' });

    expect(el.outerHTML).toBe(markup);
    // The theme decisions (no M3 QR artifact exists): a 12dp rounded tile
    // and a generous 16dp quiet zone; size, colors and the square module
    // shape resolve through the material3 composition's token values.
    const code = codeOf(el);
    const style = getComputedStyle(code);
    expect(readTokenLength('--ki-qr-radius')).toBe(12);
    expect(readTokenLength('--ki-qr-radius')).not.toBe(onmarsRadius);
    expect(Number.parseFloat(style.borderRadius)).toBe(12);
    expect(readTokenLength('--ki-qr-quiet-zone')).toBe(16);
    expect(readTokenLength('--ki-qr-quiet-zone')).not.toBe(onmarsQuietZone);
    expect(code.getBoundingClientRect().width).toBe(readTokenLength('--ki-qr-size'));
    expect(style.backgroundColor).toBe(readTokenColor('--ki-qr-background'));
    const module = code.querySelector('.module');
    expect(module).toBeTruthy();
    if (!module) {
      throw new Error('ki-qr rendered no modules');
    }
    expect(getComputedStyle(module).fill).toBe(readTokenColor('--ki-qr-color'));
    expect(Number.parseFloat(getComputedStyle(module).rx)).toBe(
      readTokenLength('--ki-qr-module-radius'),
    );

    expect(await decodeRendered(el)).toBe('https://onmars.dev');
    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S9 rounds the modules through the shape tokens alone and keeps decoding', async () => {
    cleanup();
    const el = await mount(landmark(), { value: 'https://onmars.dev', label: 'Open' });
    const module = codeOf(el).querySelector('.module');
    expect(module).toBeTruthy();
    if (!module) {
      throw new Error('ki-qr rendered no modules');
    }
    expect(Number.parseFloat(getComputedStyle(module).rx)).toBe(0);

    // The documented round values (design-extraction §5): half a module
    // for the dots, the measured 2.25-module outer ring for the finders.
    document.documentElement.style.setProperty('--ki-qr-module-radius', '4px');
    document.documentElement.style.setProperty('--ki-qr-finder-radius', '14px');

    expect(Number.parseFloat(getComputedStyle(module).rx)).toBe(4);
    const finder = codeOf(el).querySelector('.finder');
    expect(finder).toBeTruthy();
    if (!finder) {
      throw new Error('ki-qr rendered no finders');
    }
    expect(Number.parseFloat(getComputedStyle(finder).rx)).toBe(14);
    expect(await decodeRendered(el)).toBe('https://onmars.dev');
  });

  it('S11 never mirrors in a right-to-left document and still decodes', async () => {
    cleanup();
    document.documentElement.setAttribute('dir', 'rtl');
    const el = await mount(landmark(), { value: 'https://onmars.dev', label: 'افتح' });

    // The matrix is orientation-fixed: the (0,0) finder stays at the
    // physical top-LEFT of the tile even in RTL (zero direction code).
    const finders = Array.from(codeOf(el).querySelectorAll('.finder'));
    expect(finders).toHaveLength(3);
    const [topLeft, topRight] = finders.map((finder) => finder.getBoundingClientRect());
    expect(topLeft).toBeTruthy();
    expect(topRight).toBeTruthy();
    if (!topLeft || !topRight) {
      throw new Error('ki-qr rendered no finder pair');
    }
    expect(topLeft.left).toBeLessThan(topRight.left);
    expect(topLeft.top).toBe(topRight.top);

    expect(await decodeRendered(el)).toBe('https://onmars.dev');
    document.documentElement.removeAttribute('dir');
  });

  it('S12 fails soft when the value exceeds the densest symbol capacity', async () => {
    cleanup();
    // 2,332 bytes: one past the byte-mode capacity of version 40 level M.
    const el = await mount(landmark(), { value: 'x'.repeat(2332), label: 'Open' });

    expect(el.shadowRoot?.querySelector('svg')).toBeNull();
    expect(el.getAttribute('aria-hidden')).toBe('true');

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
