import material3Css from '@kimen/tokens/css/material3?raw';
// @spec:023-ki-scroller
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
//
// The indicator is native scrollbar chrome restyled by tokens (spec
// Assumptions: "the contract asserts only token-resolved appearance and
// native scroll behavior"). Whether that chrome consumes layout space is an
// engine/platform policy (classic vs overlay scrollbars; Firefox has no
// ::-webkit-scrollbar), so the engine-agnostic observable contract is: the
// scroll axis computes to `auto` (native indicators exist only while
// scrollable), the viewport is actually scrollable, the paint sources
// resolve from tokens, and the Tab stop follows the overflow state.
import tokensCss from '@kimen/tokens/css?raw';
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { commands, userEvent } from 'vitest/browser';
import { defineCustomElement } from '../dist/components/ki-scroller.js';

type KiScrollerElement = HTMLElement & { orientation: string; label?: string };

const { ariaSnapshot } = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
};

const STYLE_ID = 'ki-scroller-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-scroller-browser-material3-token-style';

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
  landmark().replaceChildren();
}

async function waitUntil(condition: () => boolean, what: string): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!condition() && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  expect(condition(), what).toBe(true);
}

/** Stencil renders async: wait until the viewport part exists. */
async function mount(
  container: HTMLElement,
  attributes: Partial<Record<'orientation' | 'label', string>> = {},
  children: HTMLElement[] = [],
): Promise<KiScrollerElement> {
  ensureTokens();
  const el = document.createElement('ki-scroller') as KiScrollerElement;
  for (const [name, value] of Object.entries(attributes)) {
    el.setAttribute(name, value);
  }
  for (const child of children) {
    el.appendChild(child);
  }
  container.appendChild(el);
  await customElements.whenDefined('ki-scroller');
  await waitUntil(
    () => Boolean(el.shadowRoot?.querySelector('[part="viewport"]')),
    'ki-scroller did not render its viewport',
  );
  return el;
}

function viewportOf(el: KiScrollerElement): HTMLElement {
  const viewport = el.shadowRoot?.querySelector<HTMLElement>('[part="viewport"]');
  expect(viewport).toBeTruthy();
  if (!viewport) {
    throw new Error('ki-scroller did not render its viewport');
  }
  return viewport;
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

/**
 * The native indicator convention: an `auto` scroll axis grows scrollbar
 * chrome exactly while the axis is scrollable, and only there. Asserting
 * the computed pair plus actual scrollability is the engine-agnostic
 * "indicator is shown / not shown" observation (FR-003).
 */
function scrollAxes(viewport: HTMLElement): { block: string; inline: string } {
  const computed = getComputedStyle(viewport);
  return { block: computed.overflowY, inline: computed.overflowX };
}

function tallContent(blockSize: string): HTMLElement {
  const content = document.createElement('div');
  content.style.blockSize = blockSize;
  content.textContent = 'body';
  return content;
}

function wideRow(items: number): HTMLElement {
  const row = document.createElement('div');
  row.style.display = 'flex';
  row.style.inlineSize = 'max-content';
  for (let index = 1; index <= items; index += 1) {
    const item = document.createElement('div');
    item.style.inlineSize = '80px';
    item.style.flexShrink = '0';
    item.textContent = `item ${String(index)}`;
    row.appendChild(item);
  }
  return row;
}

describe('ki-scroller', () => {
  it('S1 clips overflowing content and arms the token-resolved vertical indicator', async () => {
    cleanup();
    const pane = document.createElement('div');
    pane.style.inlineSize = '240px';
    landmark().appendChild(pane);
    const el = await mount(pane, { label: 'Release notes' }, [tallContent('600px')]);
    el.style.blockSize = '120px';

    const viewport = viewportOf(el);
    await waitUntil(() => viewport.hasAttribute('tabindex'), 'overflow state was not observed');

    // Clipped to the scroller's bounds (FR-001)...
    expect(viewport.getBoundingClientRect().height).toBe(120);
    expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
    // ...with the vertical indicator armed on the declared axis only:
    expect(scrollAxes(viewport)).toEqual({ block: 'auto', inline: 'hidden' });
    // ...and the indicator resolving from tokens (FR-007): the onmars rail
    // is thumb-thickness + 2×gutter = 4 + 2·2 = the Figma 8px cross size.
    expect(readTokenLength('--ki-scroller-thumb-thickness')).toBe(4);
    expect(readTokenLength('--ki-scroller-gutter')).toBe(2);
    expect(readTokenLength('--ki-scroller-thumb-min-length')).toBe(16);
    expect(readTokenColor('--ki-scroller-thumb-color')).not.toBe('');
  });

  it('S2 native scrolling reveals the last of the content', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Release notes' }, [tallContent('600px')]);
    el.style.blockSize = '120px';
    const viewport = viewportOf(el);
    await waitUntil(() => viewport.hasAttribute('tabindex'), 'overflow state was not observed');
    const last = document.createElement('p');
    last.textContent = 'the very last line';
    el.appendChild(last);

    expect(last.getBoundingClientRect().top).toBeGreaterThan(
      viewport.getBoundingClientRect().bottom,
    );
    viewport.scrollTop = viewport.scrollHeight;
    await waitUntil(
      () =>
        last.getBoundingClientRect().bottom <= viewport.getBoundingClientRect().bottom + 1 &&
        last.getBoundingClientRect().top >= viewport.getBoundingClientRect().top - 1,
      'scrolling to the end did not reveal the last of the content',
    );
  });

  it('S3 a horizontal scroller clips at the inline edge with the horizontal indicator armed', async () => {
    cleanup();
    const el = await mount(landmark(), { orientation: 'horizontal', label: 'Weekly timeline' }, [
      wideRow(6),
    ]);
    el.style.inlineSize = '240px';
    const viewport = viewportOf(el);
    await waitUntil(() => viewport.hasAttribute('tabindex'), 'overflow state was not observed');

    expect(viewport.scrollWidth).toBeGreaterThan(viewport.clientWidth);
    // The declared axis scrolls; the cross axis clips (FR-001).
    expect(scrollAxes(viewport)).toEqual({ block: 'hidden', inline: 'auto' });
    expect(viewport.scrollHeight).toBe(viewport.clientHeight);
  });

  it('S4 fitting content renders fully with no indicator and no scroll affordance', async () => {
    cleanup();
    const content = tallContent('40px');
    const el = await mount(landmark(), { label: 'Release notes' }, [content]);
    el.style.blockSize = '120px';
    const viewport = viewportOf(el);

    // Nothing is scrollable, so the `auto` axis grows no indicator and the
    // scroller behaves as a plain container (FR-003/FR-005).
    expect(viewport.scrollHeight).toBe(viewport.clientHeight);
    expect(content.getBoundingClientRect().height).toBe(40);
    expect(viewport.hasAttribute('tabindex')).toBe(false);
  });

  it('S5 an unrecognized orientation value behaves as the default vertical scroller', async () => {
    cleanup();
    const control = await mount(landmark(), { label: 'Release notes' }, [tallContent('600px')]);
    control.style.blockSize = '120px';
    const controlViewport = viewportOf(control);
    await waitUntil(
      () => controlViewport.hasAttribute('tabindex'),
      'overflow state was not observed',
    );

    const el = await mount(landmark(), { orientation: 'y', label: 'Release notes' }, [
      tallContent('600px'),
    ]);
    el.style.blockSize = '120px';
    const viewport = viewportOf(el);
    await waitUntil(() => viewport.hasAttribute('tabindex'), 'overflow state was not observed');

    // Same vertical behavior as the control (FR-002/FR-009): the unknown
    // value matches no selector and no code path.
    expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);
    expect(scrollAxes(viewport)).toEqual(scrollAxes(controlViewport));
    expect(scrollAxes(viewport)).toEqual({ block: 'auto', inline: 'hidden' });
  });

  it('S6 Tab reaches an overflowing scroller', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Release notes' }, [tallContent('600px')]);
    el.style.blockSize = '120px';
    const viewport = viewportOf(el);
    await waitUntil(() => viewport.hasAttribute('tabindex'), 'overflow state was not observed');

    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard('{Tab}');

    expect(document.activeElement).toBe(el);
    expect(el.shadowRoot?.activeElement).toBe(viewport);
  });

  it('S7 Arrow Down scrolls the focused scroller natively toward the end', async () => {
    cleanup();
    const el = await mount(landmark(), { label: 'Release notes' }, [tallContent('600px')]);
    el.style.blockSize = '120px';
    const viewport = viewportOf(el);
    await waitUntil(() => viewport.hasAttribute('tabindex'), 'overflow state was not observed');

    viewport.focus();
    expect(el.shadowRoot?.activeElement).toBe(viewport);
    expect(viewport.scrollTop).toBe(0);
    await userEvent.keyboard('{ArrowDown}');
    await waitUntil(() => viewport.scrollTop > 0, 'Arrow Down did not scroll the content');
  });

  it('S8 a fitting scroller adds no Tab stop: focus lands on the button, skipping it', async () => {
    cleanup();
    const lead = document.createElement('button');
    lead.textContent = 'Lead';
    landmark().appendChild(lead);
    const el = await mount(landmark(), { label: 'Release notes' }, [tallContent('40px')]);
    el.style.blockSize = '120px';
    const after = document.createElement('button');
    after.textContent = 'After';
    landmark().appendChild(after);
    expect(viewportOf(el).hasAttribute('tabindex')).toBe(false);

    lead.focus();
    await userEvent.keyboard('{Tab}');

    expect(document.activeElement).toBe(after);
    expect(el.contains(document.activeElement)).toBe(false);
    expect(el.shadowRoot?.activeElement ?? null).toBeNull();
  });

  it('S9 exposes a named region whose heading and list keep their own semantics, and passes axe', async () => {
    cleanup();
    const heading = document.createElement('h2');
    heading.textContent = 'March';
    const list = document.createElement('ul');
    const entry = document.createElement('li');
    entry.textContent = 'Fixed the indicator';
    list.appendChild(entry);
    const filler = tallContent('600px');
    const el = await mount(landmark(), { label: 'Release notes' }, [heading, list, filler]);
    el.id = 's9-scroller';
    el.style.blockSize = '120px';
    const viewport = viewportOf(el);
    await waitUntil(() => viewport.hasAttribute('tabindex'), 'overflow state was not observed');

    // The REAL computed accessibility tree (Playwright ariaSnapshot): one
    // region named from `label`, with the slotted heading and list keeping
    // their own semantics inside it (FR-006).
    const snapshot = await ariaSnapshot('#s9-scroller');
    expect(snapshot).toMatch(/- region "Release notes"/);
    expect(snapshot).toMatch(/- heading "March"/);
    expect(snapshot).toMatch(/- listitem/);

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S10 material3 restyles the indicator through tokens alone with unchanged markup', async () => {
    cleanup();
    ensureTokens();
    const onmars = await mount(landmark(), { label: 'Release notes' }, [tallContent('600px')]);
    onmars.style.blockSize = '120px';
    const onmarsViewport = viewportOf(onmars);
    await waitUntil(
      () => onmarsViewport.hasAttribute('tabindex'),
      'overflow state was not observed',
    );
    const onmarsThumbColor = readTokenColor('--ki-scroller-thumb-color');
    const onmarsThickness = readTokenLength('--ki-scroller-thumb-thickness');
    const onmarsGutter = readTokenLength('--ki-scroller-gutter');
    const onmarsRadius = readTokenLength('--ki-scroller-thumb-radius');
    const markup = onmars.outerHTML;
    onmars.remove();

    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    const el = await mount(landmark(), { label: 'Release notes' }, [tallContent('600px')]);
    el.style.blockSize = '120px';
    const viewport = viewportOf(el);
    await waitUntil(() => viewport.hasAttribute('tabindex'), 'overflow state was not observed');

    // Color, thickness and shape resolve from material3 token values (S10):
    // outline-variant thumb, 8dp flush square vs the onmars 4px 2px-gutter
    // pill — zero markup or component changes.
    expect(el.outerHTML).toBe(markup);
    expect(readTokenColor('--ki-scroller-thumb-color')).not.toBe(onmarsThumbColor);
    expect(readTokenLength('--ki-scroller-thumb-thickness')).not.toBe(onmarsThickness);
    expect(readTokenLength('--ki-scroller-thumb-thickness')).toBe(8);
    expect(readTokenLength('--ki-scroller-gutter')).toBe(0);
    expect(onmarsGutter).toBe(2);
    expect(readTokenLength('--ki-scroller-thumb-radius')).toBe(0);
    expect(onmarsRadius).toBeGreaterThan(0);
    expect(scrollAxes(viewport)).toEqual({ block: 'auto', inline: 'hidden' });

    const results = await axe.run(document.body);
    expect(results.violations).toEqual([]);
  });

  it('S12 a horizontal scroller in a right-to-left document starts at the right edge', async () => {
    cleanup();
    document.documentElement.setAttribute('dir', 'rtl');
    const row = wideRow(5);
    const el = await mount(landmark(), { orientation: 'horizontal', label: 'Weekly timeline' }, [
      row,
    ]);
    el.style.inlineSize = '240px';
    const viewport = viewportOf(el);
    await waitUntil(() => viewport.hasAttribute('tabindex'), 'overflow state was not observed');

    // Content begins at the right edge: the first item is fully visible
    // against the viewport's right edge, the last starts out of view.
    const viewportRect = viewport.getBoundingClientRect();
    const first = row.children[0] as HTMLElement;
    const last = row.children[row.children.length - 1] as HTMLElement;
    expect(viewport.scrollLeft).toBe(0);
    expect(Math.abs(first.getBoundingClientRect().right - viewportRect.right)).toBeLessThan(1.5);
    expect(last.getBoundingClientRect().left).toBeLessThan(viewportRect.left);

    // Scrolling toward the end goes leftward: RTL scrollLeft turns negative.
    viewport.scrollLeft = -viewport.scrollWidth;
    await waitUntil(
      () => viewport.scrollLeft < 0 && last.getBoundingClientRect().left >= viewportRect.left - 1,
      'scrolling toward the inline end did not reveal the left edge',
    );
    document.documentElement.removeAttribute('dir');
  });

  it('S13 a scroller that stops overflowing drops its indicator and Tab stop', async () => {
    cleanup();
    const filler = tallContent('600px');
    const keeper = tallContent('40px');
    const el = await mount(landmark(), { label: 'Chat messages' }, [keeper, filler]);
    el.style.blockSize = '120px';
    const viewport = viewportOf(el);
    await waitUntil(() => viewport.hasAttribute('tabindex'), 'overflow state was not observed');
    expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight);

    filler.remove();

    // Nothing scrollable remains: the `auto` axis grows no indicator and
    // the Tab stop is gone (S13, FR-003/FR-005).
    await waitUntil(
      () => !viewport.hasAttribute('tabindex') && viewport.scrollHeight === viewport.clientHeight,
      'removing content did not drop the indicator and the Tab stop',
    );
  });

  it('S14 a scroller that starts overflowing gains its indicator and Tab stop', async () => {
    cleanup();
    const keeper = tallContent('40px');
    const el = await mount(landmark(), { label: 'Chat messages' }, [keeper]);
    el.style.blockSize = '120px';
    const viewport = viewportOf(el);
    expect(viewport.hasAttribute('tabindex')).toBe(false);
    expect(viewport.scrollHeight).toBe(viewport.clientHeight);

    el.appendChild(tallContent('600px'));

    await waitUntil(
      () => viewport.hasAttribute('tabindex') && viewport.scrollHeight > viewport.clientHeight,
      'adding content did not raise the indicator and the Tab stop',
    );
    // Reachable via Tab once overflowing (FR-005).
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.keyboard('{Tab}');
    expect(el.shadowRoot?.activeElement).toBe(viewport);
  });
});
