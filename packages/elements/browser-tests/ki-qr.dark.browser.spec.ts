// @spec:026-ki-qr
import tokensCss from '@kimen/tokens/css?raw';
import axe from 'axe-core';
import jsQR from 'jsqr';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-qr.js';

const STYLE_ID = 'ki-qr-dark-tokens';

const browserCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
};

beforeAll(async () => {
  defineCustomElement();
  await browserCommands.emulateColorScheme('dark');
});

function injectStylesheet(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = tokensCss;
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

async function mount(attributes: Record<string, string> = {}): Promise<HTMLElement> {
  const el = document.createElement('ki-qr');
  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, value);
  }
  landmark().appendChild(el);
  await customElements.whenDefined('ki-qr');
  const deadline = Date.now() + 2000;
  while (!el.shadowRoot?.querySelector('[part="code"]') && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  return el;
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

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

/** Independent decode of the rendered code (see the light suite, FR-001). */
async function decodeRendered(el: HTMLElement): Promise<string | null> {
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
  clone.setAttribute('width', '640');
  clone.setAttribute('height', '640');
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const url = URL.createObjectURL(
    new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }),
  );
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 768;
    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }
    context.fillStyle = getComputedStyle(svg).backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 64, 64, 640, 640);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const found = jsQR(pixels.data, pixels.width, pixels.height);
    return found ? new TextDecoder().decode(new Uint8Array(found.binaryData)) : null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

describe('ki-qr under the dark scheme', () => {
  it('S10 resolves the appearance from the dark token values without losing scannability', async () => {
    injectStylesheet();
    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
    const el = await mount({ value: 'https://onmars.dev', label: 'Open on your phone' });
    const svg = el.shadowRoot?.querySelector('svg[part="code"]');
    expect(svg).toBeTruthy();
    if (!svg) {
      throw new Error('ki-qr did not render its code');
    }
    const module = svg.querySelector('.module');
    expect(module).toBeTruthy();
    if (!module) {
      throw new Error('ki-qr rendered no modules');
    }

    // The appearance resolves from the dark composition's token values —
    // which the shipped theme keeps scheme-stable on purpose: dark modules
    // stay on a light tile under forced dark (the documented scannability
    // obligation, FR-010), at scanner-safe non-text contrast.
    const moduleColor = getComputedStyle(module).fill;
    const tileColor = getComputedStyle(svg).backgroundColor;
    expect(moduleColor).toBe(readTokenColor('--ki-qr-color'));
    expect(tileColor).toBe(readTokenColor('--ki-qr-background'));
    expect(luminanceOf(tileColor)).toBeGreaterThan(luminanceOf(moduleColor));
    const lighter = Math.max(luminanceOf(moduleColor), luminanceOf(tileColor));
    const darker = Math.min(luminanceOf(moduleColor), luminanceOf(tileColor));
    expect((lighter + 0.05) / (darker + 0.05)).toBeGreaterThanOrEqual(3);

    // And the rendered code still decodes to its value.
    expect(await decodeRendered(el)).toBe('https://onmars.dev');

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
