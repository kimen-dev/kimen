// @spec:166-tokens-core-and-component-sheets
//
// The core token sheet plus a tag's own sheet paint that tag exactly as the
// full token sheet does, and every override, theme and preference mode keeps
// working on a split page without `!important`.
//
// "Looks as it does" is measured, never read by token name: every standard
// computed property of every element a component paints (its host, its shadow
// tree and the components it renders, transitively) is compared between a
// page that loads the full sheet and a page that loads the split sheets. A
// custom property is never compared: a split page declares fewer of them by
// design, and that is exactly what S1 asserts on its own.
import coreCss from '@kimen/tokens/css/core?raw';
import kiButtonCss from '@kimen/tokens/css/ki-button?raw';
import kiCardCss from '@kimen/tokens/css/ki-card?raw';
import kiPaginationCss from '@kimen/tokens/css/ki-pagination?raw';
import material3Css from '@kimen/tokens/css/material3?raw';
import fullCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

import { componentTags, defineAllComponents } from './all-components';
import { fixtureFor } from './visual/galleries';

const browserCommands = commands as unknown as {
  emulateContrast: (contrast: 'more' | 'no-preference' | null) => Promise<boolean>;
  emulateReducedMotion: (value: 'no-preference' | 'reduce' | null) => Promise<void>;
  resetPointer: () => Promise<void>;
};

// Every published tag sheet, keyed by tag. The static imports above also prove
// that the `./css/core` and `./css/ki-*` package exports resolve.
const tagSheets: Record<string, string> = Object.fromEntries(
  Object.entries(
    import.meta.glob<string>('../../tokens/dist/css/ki-*.css', {
      query: '?raw',
      import: 'default',
      eager: true,
    }),
  ).map(([path, css]) => [/(ki-[a-z0-9-]+)\.css$/u.exec(path)?.[1] ?? path, css]),
);

const SHEET_CLASS = 'token-sheets-under-test';
const SHADOW_RENDER_DEADLINE_MS = 1500;

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

function sheetFor(tag: string): string {
  const css = tagSheets[tag];
  if (css === undefined) throw new Error(`@kimen/tokens publishes no sheet for ${tag}`);
  return css;
}

/** Load exactly these stylesheets, in this order, and nothing else from Kimen. */
function loadSheets(...sheets: string[]): void {
  for (const style of document.querySelectorAll(`style.${SHEET_CLASS}`)) style.remove();
  for (const css of sheets) appendSheet(css);
}

function appendSheet(css: string): void {
  const style = document.createElement('style');
  style.className = SHEET_CLASS;
  style.textContent = css;
  document.head.append(style);
}

function hostsIn(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('*')].filter((element) =>
    element.localName.startsWith('ki-'),
  );
}

/** Every element a region paints: light DOM, and every shadow tree reachable from it. */
function paintedElements(root: Element): Element[] {
  const found: Element[] = [root];
  const walk = (scope: ParentNode): void => {
    for (const element of scope.querySelectorAll('*')) {
      found.push(element);
      if (element.shadowRoot !== null) walk(element.shadowRoot);
    }
  };
  walk(root);
  if (root.shadowRoot !== null) walk(root.shadowRoot);
  return found;
}

/** The tags a region uses in its own light DOM: the tags a page imports. */
function lightDomTags(root: Element): string[] {
  return [
    ...new Set([root, ...root.querySelectorAll('*')].map((element) => element.localName)),
  ].filter((tag) => tag.startsWith('ki-'));
}

async function waitForShadowRender(root: ParentNode): Promise<void> {
  const hosts = hostsIn(root);
  await Promise.all(
    [...new Set(hosts.map((host) => host.localName))].map((tag) => customElements.whenDefined(tag)),
  );
  const pending = (): boolean =>
    hosts.some(
      (host) =>
        host.shadowRoot !== null &&
        !host.shadowRoot.hasChildNodes() &&
        getComputedStyle(host).display !== 'none',
    );
  const deadline = Date.now() + SHADOW_RENDER_DEADLINE_MS;
  while (pending() && Date.now() < deadline) await nextFrame();
  await nextFrame();
  await nextFrame();
}

/**
 * Every standard computed property of every painted element, one line each.
 * Custom properties are left out: what a page declares is S1's business,
 * what it paints is everybody's.
 */
function paint(root: Element): string[] {
  return paintedElements(root).flatMap((element, index) => {
    const style = getComputedStyle(element);
    const label = `${String(index)} ${element.localName}${element.getAttribute('part') === null ? '' : `::part(${element.getAttribute('part') ?? ''})`}`;
    const lines: string[] = [];
    for (let property = 0; property < style.length; property += 1) {
      const name = style.item(property);
      if (name.startsWith('--')) continue;
      lines.push(`${label} ${name}: ${style.getPropertyValue(name)}`);
    }
    return lines;
  });
}

/** Mount `html` in a fresh region under whatever sheets are loaded. */
async function mount(
  html: string,
  {
    theme,
    prepare,
  }: { theme?: string; prepare?: ((wrapper: HTMLElement) => Promise<void>) | undefined } = {},
): Promise<HTMLElement> {
  document.body.replaceChildren();
  const wrapper = document.createElement('div');
  // Clear of the pointer, which rests at the page origin.
  wrapper.style.padding = '48px';
  if (theme !== undefined) wrapper.setAttribute('data-ki-theme', theme);
  wrapper.innerHTML = html;
  document.body.append(wrapper);
  await waitForShadowRender(wrapper);
  await prepare?.(wrapper);
  await nextFrame();
  return wrapper;
}

/** What `html` paints under the full sheet, then under the given split sheets. */
async function compare(
  html: string,
  split: string[],
  options: {
    theme?: string;
    extra?: string[];
    prepare?: ((wrapper: HTMLElement) => Promise<void>) | undefined;
  } = {},
): Promise<{ full: string[]; split: string[] }> {
  const extra = options.extra ?? [];
  loadSheets(fullCss, ...extra);
  const withFull = paint(await mount(html, options));
  loadSheets(...split, ...extra);
  const withSplit = paint(await mount(html, options));
  return { full: withFull, split: withSplit };
}

function firstDifferences(left: string[], right: string[], limit = 12): string[] {
  const differences: string[] = [];
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length && differences.length < limit; index += 1) {
    if (left[index] !== right[index]) {
      differences.push(
        `full:  ${left[index] ?? '(nothing)'}\nsplit: ${right[index] ?? '(nothing)'}`,
      );
    }
  }
  return differences;
}

function buttonIn(wrapper: HTMLElement): HTMLElement {
  const button = wrapper.querySelector<HTMLElement>('ki-button');
  if (button === null) throw new Error('the fixture mounts no ki-button');
  return button;
}

/** The element that paints a ki-button's fill: its native control. */
function buttonSurface(button: HTMLElement): Element {
  const surface = button.shadowRoot?.querySelector('button, a');
  if (surface === undefined || surface === null) throw new Error('ki-button rendered no control');
  return surface;
}

beforeAll(async () => {
  defineAllComponents();
  await browserCommands.emulateReducedMotion('reduce');
  await browserCommands.resetPointer();
});

afterEach(() => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('style');
});

afterAll(async () => {
  for (const style of document.querySelectorAll(`style.${SHEET_CLASS}`)) style.remove();
  await browserCommands.emulateReducedMotion(null);
});

describe('a page loads only the token CSS its components need', () => {
  it('S1 a page with one component loads only the core and that component’s tokens', async () => {
    const html = '<ki-button variant="primary">Save</ki-button>';
    const { full, split } = await compare(html, [coreCss, kiButtonCss]);

    expect(firstDifferences(full, split)).toEqual([]);
    const root = getComputedStyle(document.documentElement);
    expect(root.getPropertyValue('--ki-alert-shell-bg')).toBe('');
    expect(root.getPropertyValue('--ki-card-border-color')).toBe('');
    expect(root.getPropertyValue('--ki-button-md-height')).not.toBe('');
  });

  // Reading every computed property of a large gallery twice takes WebKit
  // several seconds on a loaded machine; the default 15 s is not about this.
  const SWEEP_TIMEOUT_MS = 60_000;

  it.each(componentTags)(
    'S2 %s renders with the core and its own sheet as it does with the full sheet',
    async (tag) => {
      const { html, prepare } = fixtureFor(tag).gallery;
      loadSheets(fullCss);
      const withFull = await mount(html, { prepare });
      const full = paint(withFull);
      // The page imports one sheet for every tag its own markup uses.
      const used = new Set([tag, ...lightDomTags(withFull)]);
      loadSheets(coreCss, ...[...used].map(sheetFor));
      const split = paint(await mount(html, { prepare }));

      expect(split.length, `${tag} painted a different set of elements`).toBe(full.length);
      expect(firstDifferences(full, split)).toEqual([]);
    },
    SWEEP_TIMEOUT_MS,
  );

  it('S3 a component that renders other components brings their tokens in its own sheet', async () => {
    const html = '<ki-pagination pages="12" page="4" label="Results"></ki-pagination>';
    const { full, split } = await compare(html, [coreCss, kiPaginationCss]);

    // It renders its icons and arrow buttons inside its own shadow tree.
    expect(full.some((line) => /^\d+ ki-icon /u.test(line))).toBe(true);
    expect(firstDifferences(full, split)).toEqual([]);
  });
});

describe('themes, preference modes and overrides restyle a split page as a full one', () => {
  it('S4 a semantic override on the root restyles a component painted from the split sheets', async () => {
    loadSheets(coreCss, kiButtonCss, ':root { --ki-surface-primary-med-em: #7a1fa2; }');
    const wrapper = await mount('<ki-button variant="primary">Save</ki-button>');

    expect(getComputedStyle(buttonSurface(buttonIn(wrapper))).backgroundColor).toBe(
      'rgb(122, 31, 162)',
    );
  });

  it('S5 a component override on the root wins even when the component’s sheet loads later', async () => {
    loadSheets(coreCss, ':root { --ki-button-md-height: 3rem; }');
    appendSheet(kiButtonCss);
    const wrapper = await mount('<ki-button size="md">Save</ki-button>');

    expect(buttonIn(wrapper).getBoundingClientRect().height).toBe(48);
  });

  it('S6 a Material 3 region restyles a split-sheet component as it does with the full sheet', async () => {
    const html = '<ki-button variant="primary">Save</ki-button>';
    const { full, split } = await compare(html, [coreCss, kiButtonCss], {
      theme: 'material3',
      extra: [material3Css],
    });

    expect(firstDifferences(full, split)).toEqual([]);
    // The region really is Material 3: its pill-shaped button differs from onmars.
    loadSheets(fullCss);
    const onmars = paint(await mount(html));
    expect(onmars).not.toEqual(full);
  });

  it('S7 more contrast reaches the component tokens of a split sheet', async (context) => {
    const emulated = await browserCommands.emulateContrast('more');
    if (!emulated) {
      context.skip();
      return;
    }
    try {
      const html = '<ki-card>Two seats, billed yearly.</ki-card>';
      const { full, split } = await compare(html, [coreCss, kiCardCss]);
      expect(firstDifferences(full, split)).toEqual([]);

      await browserCommands.emulateContrast('no-preference');
      loadSheets(coreCss, kiCardCss);
      const standard = paint(await mount(html));
      expect(standard, 'more contrast changes the card’s border').not.toEqual(split);
    } finally {
      await browserCommands.emulateContrast(null);
    }
  });
});

describe('every existing import keeps working', () => {
  it('S9 loading the full sheet together with split sheets changes nothing', async () => {
    const html = '<ki-button variant="primary">Save</ki-button>';
    const { full, split } = await compare(html, [fullCss, coreCss, kiButtonCss]);

    expect(firstDifferences(full, split)).toEqual([]);
  });
});
