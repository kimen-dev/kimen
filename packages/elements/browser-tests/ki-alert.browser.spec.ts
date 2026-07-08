import { beforeAll, describe, expect, it } from 'vitest';

// @spec:011-ki-alert
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement } from '../dist/components/ki-alert.js';

type KiAlertElement = HTMLElement & {
  dismissed: boolean;
  dismissible: boolean;
  dismissLabel: string;
  heading: string;
  tone: string;
};

const STYLE_ID = 'ki-alert-browser-token-style';
const tones = ['neutral', 'success', 'danger', 'info', 'warning'] as const;

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

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function mount(
  message = 'We could not save your changes',
  attributes: Partial<
    Record<'dismissed' | 'dismissible' | 'dismiss-label' | 'heading' | 'tone', string | boolean>
  > = {},
  parent: ParentNode = document.body,
): Promise<KiAlertElement> {
  ensureTokens();
  const el = document.createElement('ki-alert') as KiAlertElement;
  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      el.toggleAttribute(name, value);
    } else {
      el.setAttribute(name, value);
    }
  }
  el.textContent = message;
  parent.appendChild(el);
  await customElements.whenDefined('ki-alert');
  const deadline = Date.now() + 1000;
  while (!el.shadowRoot?.hasChildNodes() && Date.now() < deadline) {
    await nextFrame();
  }
  await nextFrame();
  return el;
}

function part(el: KiAlertElement, name: string): HTMLElement {
  const node = el.shadowRoot?.querySelector<HTMLElement>(`[part="${name}"]`);
  expect(node, `missing part ${name}`).toBeInstanceOf(HTMLElement);
  if (!node) {
    throw new Error(`ki-alert did not render part="${name}"`);
  }
  return node;
}

function readTokenColor(name: string): string {
  const probe = document.createElement('div');
  probe.style.backgroundColor = `var(${name})`;
  document.body.append(probe);
  const value = getComputedStyle(probe).backgroundColor;
  probe.remove();
  return value;
}

describe('ki-alert in a real browser', () => {
  it('S1 presents the danger message with the danger tone appearance', async () => {
    cleanup();
    const el = await mount('We could not save your changes', { tone: 'danger' });
    const alert = part(el, 'alert');
    const message = part(el, 'message');
    await nextFrame();

    expect(message).toHaveTextContent('We could not save your changes');
    expect(getComputedStyle(alert).backgroundColor).toBe(readTokenColor('--ki-alert-danger-bg'));
    expect(getComputedStyle(alert).color).toBe(readTokenColor('--ki-alert-danger-fg'));
  });

  it('S1 resolves five distinct tone background values', async () => {
    cleanup();
    const backgrounds = new Set<string>();

    for (const tone of tones) {
      const el = await mount(tone, { tone });
      backgrounds.add(getComputedStyle(part(el, 'alert')).backgroundColor);
    }

    expect(backgrounds.size).toBe(tones.length);
  });

  it('S2 renders the heading before the message in visual flow', async () => {
    cleanup();
    const el = await mount('Restart soon', { heading: 'Update available' });
    const heading = part(el, 'heading');
    const message = part(el, 'message');

    expect(heading.getBoundingClientRect().top).toBeLessThanOrEqual(
      message.getBoundingClientRect().top,
    );
  });
});
