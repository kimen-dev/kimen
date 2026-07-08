import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:009-ki-card
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement } from '../dist/components/ki-card.js';

const STYLE_ID = 'ki-card-browser-token-style';

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
  document.body.removeAttribute('style');
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
}

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function mount(markup: string): Promise<HTMLElement> {
  ensureTokens();
  document.body.style.backgroundColor = 'var(--ki-surface-s0)';
  document.body.insertAdjacentHTML('beforeend', markup);
  const el = document.body.lastElementChild as HTMLElement;
  await customElements.whenDefined('ki-card');
  const deadline = Date.now() + 500;
  while (!el.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
    await nextFrame();
  }
  await nextFrame();
  return el;
}

function cardPart(el: HTMLElement): HTMLElement {
  const part = el.shadowRoot?.querySelector<HTMLElement>('[part="card"]');
  expect(part).toBeInstanceOf(HTMLElement);
  if (!part) {
    throw new Error('ki-card did not render a card part');
  }
  return part;
}

function regionPart(
  el: HTMLElement,
  partName: 'media' | 'header' | 'body' | 'footer',
): HTMLElement {
  const part = el.shadowRoot?.querySelector<HTMLElement>(`[part="${partName}"]`);
  expect(part).toBeInstanceOf(HTMLElement);
  if (!part) {
    throw new Error(`ki-card did not render ${partName} part`);
  }
  return part;
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.backgroundColor = `var(${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

describe('ki-card in a real browser', () => {
  it('S1 presents media header body footer in visual reading order on a distinct surface', async () => {
    cleanup();
    const el = await mount(`
      <ki-card>
        <img slot="media" alt="" src="about:blank" style="display:block; inline-size: 10px; block-size: 10px;" />
        <h2 slot="header">Monthly report</h2>
        <p>Revenue increased.</p>
        <button slot="footer" type="button">Download</button>
      </ki-card>
    `);
    const media = regionPart(el, 'media').getBoundingClientRect();
    const header = regionPart(el, 'header').getBoundingClientRect();
    const body = regionPart(el, 'body').getBoundingClientRect();
    const footer = regionPart(el, 'footer').getBoundingClientRect();
    const computed = getComputedStyle(cardPart(el));

    expect(media.top).toBeLessThanOrEqual(header.top);
    expect(header.top).toBeLessThanOrEqual(body.top);
    expect(body.top).toBeLessThanOrEqual(footer.top);
    expect(computed.backgroundColor).toBe(readTokenColor('--ki-card-bg'));
    expect(computed.backgroundColor).not.toBe(getComputedStyle(document.body).backgroundColor);
  });

  it('S2 renders a body-only card with no reserved space for absent regions', async () => {
    cleanup();
    const el = await mount('<ki-card>Storage is almost full</ki-card>');
    const card = cardPart(el).getBoundingClientRect();
    const body = regionPart(el, 'body').getBoundingClientRect();

    expect(regionPart(el, 'media').getBoundingClientRect().height).toBe(0);
    expect(regionPart(el, 'header').getBoundingClientRect().height).toBe(0);
    expect(regionPart(el, 'footer').getBoundingClientRect().height).toBe(0);
    expect(Math.round(card.height)).toBe(Math.round(body.height));
  });

  it('S1 S2 have zero axe violations across representative region subsets', async () => {
    cleanup();
    ensureTokens();
    document.body.innerHTML = `
      <main>
      <ki-card>
        <img slot="media" alt="" src="about:blank" />
        <h2 slot="header">Monthly report</h2>
        <p>Revenue increased.</p>
        <button slot="footer" type="button">Download</button>
      </ki-card>
      <ki-card>Storage is almost full</ki-card>
      <ki-card><img slot="media" alt="" src="about:blank" /><p>Media body</p></ki-card>
      <ki-card><h2 slot="header">Header</h2><button slot="footer" type="button">Close</button></ki-card>
      <ki-card></ki-card>
      </main>
    `;
    await customElements.whenDefined('ki-card');
    await nextFrame();
    await nextFrame();

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });
});
