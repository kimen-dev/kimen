import tokensCss from '@kimen/tokens/css?raw';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:015-ki-progress
import { defineCustomElement } from '../dist/components/ki-progress.js';

type KiProgressElement = HTMLElement & {
  indeterminate: boolean;
  label: string;
  max: number;
  shape: string;
  value: number;
};

const STYLE_ID = 'ki-progress-dark-browser-token-style';

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
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
}

async function waitForRender(el: KiProgressElement): Promise<void> {
  await customElements.whenDefined('ki-progress');
  const deadline = Date.now() + 1000;
  while (!el.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function mount(
  attributes: Partial<
    Record<'indeterminate' | 'label' | 'max' | 'shape' | 'value', string | boolean>
  >,
): Promise<KiProgressElement> {
  ensureTokens();
  let main = document.querySelector('main');
  if (!main) {
    main = document.createElement('main');
    document.body.append(main);
  }
  const el = document.createElement('ki-progress') as KiProgressElement;
  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      el.toggleAttribute(name, value);
    } else {
      el.setAttribute(name, value);
    }
  }
  main.append(el);
  await waitForRender(el);
  return el;
}

function requireShadow(el: KiProgressElement): ShadowRoot {
  const shadow = el.shadowRoot;
  expect(shadow).toBeInstanceOf(ShadowRoot);
  if (!shadow) {
    throw new Error('ki-progress did not attach a shadow root');
  }
  return shadow;
}

function requireElement(root: ParentNode, selector: string): Element {
  const el = root.querySelector(selector);
  expect(el).toBeInstanceOf(Element);
  if (!el) {
    throw new Error(`Missing ${selector}`);
  }
  return el;
}

function track(el: KiProgressElement): HTMLElement | SVGElement {
  return requireElement(requireShadow(el), '[part="track"]') as HTMLElement | SVGElement;
}

function indicator(el: KiProgressElement): HTMLElement | SVGElement {
  return requireElement(requireShadow(el), '[part="indicator"]') as HTMLElement | SVGElement;
}

function requireMain(): HTMLElement {
  const main = document.querySelector('main');
  expect(main).toBeInstanceOf(HTMLElement);
  if (!main) {
    throw new Error('Missing main test container');
  }
  return main;
}

function readToken(name: string): string {
  const probe = document.createElement('div');
  probe.style.backgroundColor = `var(${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

function partColor(el: Element): string {
  const styles = getComputedStyle(el);
  return styles.stroke === 'none' ? styles.backgroundColor : styles.stroke;
}

describe('ki-progress forced dark appearance', () => {
  it('S11 resolves onmars dark progress colors across the shape mode matrix with zero axe violations', async () => {
    cleanup();
    ensureTokens();
    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');

    for (const shape of ['linear', 'circular'] as const) {
      for (const indeterminate of [false, true]) {
        const el = await mount({
          label: `${shape} ${indeterminate ? 'indeterminate' : 'determinate'}`,
          shape,
          indeterminate,
          value: '40',
          max: '100',
        });

        expect(partColor(track(el))).toBe(readToken('--ki-progress-track-color'));
        expect(partColor(indicator(el))).toBe(readToken('--ki-progress-indicator-color'));
      }
    }

    const results = await axe.run(requireMain());
    expect(results.violations).toEqual([]);
  });
});
