// @spec:037-native-primitives
// S6, S7, S12–S15 in a real engine: what happy-dom cannot prove — layout
// against a real container, script execution, computed typography and token
// resolution, the accessibility tree and the tab order. A test-local
// `ki-button` double (a native button in an open shadow root) keeps this
// suite free of @kimen/elements (module boundaries: scope:catalog).
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';

import { renderUiSpec, type UiSpec, type UiSpecNode } from '../src/index.js';

class KiButtonDouble extends HTMLElement {
  constructor() {
    super();
    const root = this.attachShadow({ delegatesFocus: true, mode: 'open' });
    const button = document.createElement('button');
    button.append(document.createElement('slot'));
    root.append(button);
  }
}

type Child = UiSpecNode | string;
const node = (component: string, children: readonly Child[] = [], props?: UiSpecNode['props']) => ({
  component,
  ...(props === undefined ? {} : { props }),
  ...(children.length === 0 ? {} : { slots: { '': children } }),
});
const spec = (root: UiSpecNode): UiSpec => ({ version: 1, root });

let surface: HTMLElement;

/** The element a rendered spec must contain (fails the test loudly otherwise). */
function must<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('expected element is missing');
  }
  return value;
}

beforeAll(() => {
  if (customElements.get('ki-button') === undefined) {
    customElements.define('ki-button', KiButtonDouble);
  }
});

beforeEach(() => {
  document.body.replaceChildren();
  document.documentElement.style.removeProperty('--ki-space-xl');
  surface = document.createElement('section');
  document.body.append(surface);
});

describe('037 — native primitives in a real engine', () => {
  it('S6 a rendered image withholds the referrer and is no wider than its 240-pixel card', async () => {
    const result = renderUiSpec(
      spec(
        node('ki-card', [
          node('img', [], { alt: 'Banda', src: '/browser-tests/fixtures/wide.svg', width: 1200 }),
        ]),
      ),
      { surface },
    );
    expect(result.ok).toBe(true);
    const card = must(surface.querySelector<HTMLElement>('ki-card'));
    card.style.setProperty('display', 'block');
    card.style.setProperty('inline-size', '240px');
    const img = must(surface.querySelector('img'));
    await img.decode();
    expect(img.referrerPolicy).toBe('no-referrer');
    const width = img.getBoundingClientRect().width;
    expect(width).toBeGreaterThan(0);
    expect(width).toBeLessThanOrEqual(240);
    expect(img.getBoundingClientRect().height).toBeCloseTo(width / 4, 0);
  });

  it('S7 markup inside native elements renders verbatim and no script executes', async () => {
    const flags = window as unknown as Record<string, unknown>;
    delete flags['__kimenPwned'];
    const imgMarkup = '<img src=x onerror="window.__kimenPwned = 1">';
    const scriptMarkup = '<script>window.__kimenPwned = 2</script>';
    const result = renderUiSpec(
      spec(node('div', [node('h2', [imgMarkup]), node('p', [scriptMarkup])])),
      {
        surface,
      },
    );
    expect(result.ok).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(surface.querySelector('h2')?.textContent).toBe(imgMarkup);
    expect(surface.querySelector('p')?.textContent).toBe(scriptMarkup);
    expect(surface.querySelectorAll('img, script')).toHaveLength(0);
    expect(flags['__kimenPwned']).toBeUndefined();
  });

  it('S12 reassigning the spacing token --ki-space-xl restyles the layout gap', () => {
    document.documentElement.style.setProperty('--ki-space-xl', '2rem');
    expect(
      renderUiSpec(spec(node('div', ['a', node('p', ['b'])], { gap: 'xl' })), { surface }).ok,
    ).toBe(true);
    const div = surface.firstElementChild as HTMLElement;
    const rootFontSize = Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
    expect(getComputedStyle(div).rowGap).toBe(`${String(2 * rootFontSize)}px`);
  });

  it('S13 native text takes the host surface typography and carries no style attribute', () => {
    surface.style.setProperty('font-family', 'Georgia');
    surface.style.setProperty('color', 'rgb(10, 20, 30)');
    expect(
      renderUiSpec(spec(node('div', [node('h2', ['Resumen']), node('p', ['Hola'])])), { surface })
        .ok,
    ).toBe(true);
    for (const element of surface.querySelectorAll('h2, p')) {
      const style = getComputedStyle(element);
      expect(style.fontFamily).toBe(getComputedStyle(surface).fontFamily);
      expect(style.color).toBe('rgb(10, 20, 30)');
      expect(element.hasAttribute('style')).toBe(false);
    }
  });

  it('S14 headings and images expose their semantics and a decorative image stays out of the accessibility tree', async () => {
    const result = renderUiSpec(
      spec(
        node('div', [
          node('h3', ['Ventas']),
          node('img', [], { alt: 'Gráfico de ventas', src: '/browser-tests/fixtures/wide.svg' }),
          node('img', [], { alt: '', src: '/browser-tests/fixtures/wide.svg' }),
        ]),
      ),
      { surface },
    );
    expect(result.ok).toBe(true);
    await expect
      .element(page.getByRole('heading', { level: 3, name: 'Ventas' }))
      .toBeInTheDocument();
    await expect.element(page.getByRole('img', { name: 'Gráfico de ventas' })).toBeInTheDocument();
    expect(page.getByRole('img').elements()).toHaveLength(1);
  });

  it('S15 native elements add no tab stop: Tab from the start of the surface lands on the button', async () => {
    const before = document.createElement('button');
    before.textContent = 'Inicio';
    surface.before(before);
    const result = renderUiSpec(
      spec(
        node('div', [
          node('h2', ['Resumen']),
          node('p', ['Hola']),
          node('img', [], { alt: 'Gráfico', src: '/browser-tests/fixtures/wide.svg' }),
          node('ki-button', ['Ver detalle']),
        ]),
      ),
      { surface },
    );
    expect(result.ok).toBe(true);
    before.focus();
    await userEvent.tab();
    const button = surface.querySelector('ki-button');
    expect(document.activeElement).toBe(button);
    // Focus is delegated to the double's native button, the one the
    // accessibility tree names "Ver detalle".
    expect(button?.shadowRoot?.activeElement?.localName).toBe('button');
    await expect.element(page.getByRole('button', { name: 'Ver detalle' })).toBeInTheDocument();
  });
});
