// Measurement helpers for the user-preference modes (specs 043 and 044).
//
// Every helper reads what the browser computed for real components — the
// painted colour of a text, an edge, a fill, the filter behind a surface —
// across the flat tree (light DOM and open shadow roots). None of them knows a
// token name: a mode that stops reaching a component fails here whatever the
// token it forgot is called.
import material3Css from '@kimen/tokens/css/material3?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { expect } from 'vitest';
import { commands } from 'vitest/browser';

import { defineAllComponents } from './all-components';
import { parkPointer } from './axe';
import { whenRendered } from './rendered';

const modeCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
  emulateContrast: (contrast: 'more' | 'no-preference' | null) => Promise<boolean>;
  emulateReducedMotion: (reducedMotion: 'reduce' | 'no-preference' | null) => Promise<void>;
  emulateReducedTransparency: (transparency: 'reduce' | 'no-preference' | null) => Promise<boolean>;
};

export const THEMES = ['onmars', 'material3'] as const;
export const SCHEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];
export type Scheme = (typeof SCHEMES)[number];

const SETTLE_DEADLINE_MS = 2000;
const STYLE_IDS = ['modes-tokens', 'modes-material3-tokens'] as const;
const PROBE_ID = 'modes-media-probe';
/**
 * One custom property per emulated preference, set by a stylesheet that is
 * already in the document when the emulation changes. It tells whether the
 * emulation reached existing stylesheets or only `matchMedia`.
 */
const MEDIA_PROBES = [
  ['(prefers-contrast: more)', '--modes-probe-contrast-more'],
  ['(prefers-reduced-transparency: reduce)', '--modes-probe-transparency-reduce'],
] as const;
const PROBE_CSS = MEDIA_PROBES.map(
  ([query, property]) => `@media ${query} { :root { ${property}: 1; } }`,
).join('\n');
/** The engine of the PR gate: an emulation that does not apply there is a failure, not a skip. */
const MUST_EMULATE = navigator.userAgent.includes('Chrome/');

export interface Rgba {
  a: number;
  b: number;
  g: number;
  r: number;
}

/**
 * Load every component and both theme stylesheets into the test document,
 * with motion reduced. A mode switch changes the colours components
 * transition, and not every transition is reachable from script (a
 * `::placeholder` colour fade is not in `getAnimations()`): read mid-fade, a
 * colour is neither the standard value nor the mode's. Every component gates
 * its transitions behind `prefers-reduced-motion: no-preference`, so reducing
 * motion makes every paint read here final — the same lever the motion suite
 * uses.
 */
export async function installKimen(): Promise<void> {
  await modeCommands.emulateReducedMotion('reduce');
  defineAllComponents();
  for (const [index, css] of [tokensCss, material3Css, PROBE_CSS].entries()) {
    const id = [...STYLE_IDS, PROBE_ID][index];
    if (id === undefined || document.getElementById(id) !== null) continue;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.append(style);
  }
}

export async function uninstallKimen(): Promise<void> {
  await modeCommands.emulateReducedMotion(null);
  for (const id of [...STYLE_IDS, PROBE_ID]) document.getElementById(id)?.remove();
}

/**
 * A theme of the page's own, loaded after Kimen's stylesheets the way an
 * integrator ships one. Returns what removes it again.
 */
export function loadOwnTheme(css: string): () => void {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.append(style);
  return () => {
    style.remove();
  };
}

/** Clear every declaration a test may have left on the document root. */
export function resetRoot(): void {
  for (const name of [
    'data-ki-theme',
    'data-ki-color-scheme',
    'data-ki-contrast',
    'data-ki-transparency',
  ]) {
    document.documentElement.removeAttribute(name);
  }
}

/** Declare a theme and scheme for the whole document. */
export function themeDocument(theme: Theme, scheme: Scheme): void {
  document.documentElement.setAttribute('data-ki-theme', theme);
  document.documentElement.setAttribute('data-ki-color-scheme', scheme);
}

/**
 * Mount markup in a fixture that paints the page surface, so every colour is
 * measured against what a Kimen page shows behind it, and wait for every
 * Kimen element in it to be defined and rendered.
 */
export async function mount(html: string): Promise<HTMLElement> {
  // A pointer left over a control by an earlier test holds it in its hover
  // paint: every measurement here is a rest-state claim unless it says so.
  await parkPointer();
  const fixture = document.createElement('main');
  fixture.style.backgroundColor = 'var(--ki-surface-s0)';
  fixture.style.padding = '48px';
  fixture.innerHTML = html;
  document.body.append(fixture);
  await whenRendered(fixture);
  await settleAnimations();
  return fixture;
}

/**
 * Jump every running animation and transition to its end. A mode switch
 * changes custom properties, and components transition the colours those
 * properties feed: read mid-transition, a colour is neither the old value nor
 * the new one. Entrance motion (a list's rows fading in) is settled the same
 * way. Measured, not waited out: nothing here depends on a duration.
 */
export async function settleAnimations(): Promise<void> {
  // Two passes: finishing a transition can start the next one (a colour that
  // feeds a shadow, an entrance that hands over to a resting state).
  for (let pass = 0; pass < 2; pass += 1) {
    await nextFrame();
    // `document.getAnimations()` does not reach into shadow trees, where every
    // component transition lives: ask each shadow root too.
    const scopes: DocumentOrShadowRoot[] = [document];
    for (const element of deepElements(document.body)) {
      if (element.shadowRoot !== null) scopes.push(element.shadowRoot);
    }
    for (const animation of scopes.flatMap((scope) => scope.getAnimations())) {
      if (
        animation.playState !== 'finished' &&
        animation.effect?.getTiming().iterations !== Infinity
      ) {
        animation.finish();
      }
    }
  }
  await nextFrame();
}

export function unmountAll(): void {
  for (const fixture of document.querySelectorAll('body > main')) fixture.remove();
}

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

/** Wait until a media query reports the emulated value, or fail on the PR engine. */
/** The part of a Vitest test context a measurement needs: skipping aloud. */
export interface SkippableTest {
  skip: (note?: string) => void;
}

/**
 * Wait until a media query reports the emulated value. On the PR gate's engine
 * an emulation that does not apply is a failure. Elsewhere (Firefox and
 * WebKit have no CDP, and Safari reports no reduced-transparency preference)
 * the test skips aloud instead of measuring the standard appearance and
 * calling it the mode; tests that only need the preference to be absent, and
 * every declaration-based test, keep running on every engine.
 */
async function settleMedia(
  query: string,
  expected: boolean,
  emulated: boolean,
  test: SkippableTest,
): Promise<void> {
  const deadline = Date.now() + SETTLE_DEADLINE_MS;
  while (emulated && matchMedia(query).matches !== expected && Date.now() < deadline) {
    await nextFrame();
  }
  const settled = matchMedia(query).matches === expected;
  if (MUST_EMULATE) {
    expect(emulated && settled, `Chromium did not apply ${query} = ${String(expected)}`).toBe(true);
  } else if (!settled) {
    test.skip(`${navigator.userAgent} cannot emulate ${query} = ${String(expected)}`);
  }
  await reparseStaleStylesheets();
  await settleAnimations();
}

/** Whether a stylesheet already in the document disagrees with `matchMedia`. */
function stylesheetsAreStale(): boolean {
  if (document.getElementById(PROBE_ID) === null) return false;
  const root = getComputedStyle(document.documentElement);
  return MEDIA_PROBES.some(
    ([query, property]) =>
      matchMedia(query).matches !== (root.getPropertyValue(property).trim() === '1'),
  );
}

/**
 * Firefox applies an emulated contrast preference to `matchMedia` and to
 * stylesheets parsed after it, but not to the ones already in the document,
 * so the page keeps its standard paint under "more contrast" and its strong
 * paint once the emulation is cleared. A person who changes the setting gets
 * every stylesheet evaluated again; the emulation does not do that. When the
 * probe shows existing stylesheets lagging behind `matchMedia`, every
 * stylesheet of the document is parsed again, in place. Where the emulation
 * reaches existing stylesheets (Chromium, the PR gate) the probe agrees and
 * nothing is parsed again, so that engine still measures the live switch.
 */
async function reparseStaleStylesheets(): Promise<void> {
  if (!stylesheetsAreStale()) return;
  for (const style of document.querySelectorAll('style')) {
    const css = style.textContent;
    style.textContent = '';
    style.textContent = css;
  }
  await nextFrame();
  expect(stylesheetsAreStale(), 'stylesheets parsed again still miss the preference').toBe(false);
}

export async function underContrast(
  contrast: 'more' | 'no-preference',
  test: SkippableTest,
): Promise<void> {
  const emulated = await modeCommands.emulateContrast(contrast);
  await settleMedia('(prefers-contrast: more)', contrast === 'more', emulated, test);
}

export async function underTransparency(
  transparency: 'reduce' | 'no-preference',
  test: SkippableTest,
): Promise<void> {
  const emulated = await modeCommands.emulateReducedTransparency(transparency);
  await settleMedia(
    '(prefers-reduced-transparency: reduce)',
    transparency === 'reduce',
    emulated,
    test,
  );
}

export async function resetPreferences(): Promise<void> {
  await modeCommands.emulateContrast(null);
  await modeCommands.emulateReducedTransparency(null);
  await modeCommands.emulateColorScheme(null);
  await reparseStaleStylesheets();
}

/** Every element under `root`, descending into open shadow roots. */
export function deepElements(root: Element): HTMLElement[] {
  const found: HTMLElement[] = [];
  const walk = (node: Element): void => {
    found.push(node as HTMLElement);
    for (const child of node.shadowRoot?.children ?? []) walk(child);
    for (const child of node.children) walk(child);
  };
  walk(root);
  return found;
}

/** The element painted behind `node` in the flat tree. */
function flatParent(node: Element): Element | null {
  const slot = (node as HTMLElement).assignedSlot;
  if (slot !== null) return slot;
  if (node.parentElement !== null) return node.parentElement;
  const root = node.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
}

/** A computed `rgb()`/`rgba()`/`color(srgb …)` value. */
export function parseColor(value: string): Rgba {
  const srgb = /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/u.exec(value);
  if (srgb !== null) {
    return {
      r: Number(srgb[1]) * 255,
      g: Number(srgb[2]) * 255,
      b: Number(srgb[3]) * 255,
      a: srgb[4] === undefined ? 1 : Number(srgb[4]),
    };
  }
  const parts = value.match(/[\d.]+/gu);
  if (parts === null || parts.length < 3) return { a: 0, b: 0, g: 0, r: 0 };
  return {
    a: parts[3] === undefined ? 1 : Number(parts[3]),
    b: Number(parts[2]),
    g: Number(parts[1]),
    r: Number(parts[0]),
  };
}

export function over(top: Rgba, base: Rgba): Rgba {
  const mix = (t: number, b: number): number => t * top.a + b * (1 - top.a);
  return { a: 1, b: mix(top.b, base.b), g: mix(top.g, base.g), r: mix(top.r, base.r) };
}

function luminance({ r, g, b }: Rgba): number {
  const channel = (value: number): number => {
    const n = value / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: Rgba, b: Rgba): number {
  const lighter = Math.max(luminance(a), luminance(b));
  const darker = Math.min(luminance(a), luminance(b));
  return (lighter + 0.05) / (darker + 0.05);
}

const COLOR_PATTERN = /(?:rgba?|color)\([^)]*\)/gu;

/** Every colour layer an element paints: its background colour and gradient stops. */
export function fillsOf(element: Element, pseudo?: string): Rgba[] {
  const style = getComputedStyle(element, pseudo);
  const fills = [parseColor(style.backgroundColor)];
  if (style.backgroundImage !== 'none') {
    fills.push(...(style.backgroundImage.match(COLOR_PATTERN) ?? []).map(parseColor));
  }
  return fills.filter((fill) => fill.a > 0);
}

/** The opaque colour behind `element`, compositing every translucent ancestor fill. */
function backdropOf(element: Element): Rgba {
  const layers: Rgba[] = [];
  let node: Element | null = flatParent(element);
  while (node !== null) {
    const color = parseColor(getComputedStyle(node).backgroundColor);
    if (color.a > 0) layers.push(color);
    if (color.a >= 0.995) break;
    node = flatParent(node);
  }
  return layers
    .reverse()
    .reduce((base, layer) => over(layer, base), { a: 1, b: 255, g: 255, r: 255 });
}

/** The opaque colour an element itself shows: its own fills over its backdrop. */
export function surfaceOf(element: Element): Rgba {
  return fillsOf(element).reduce((base, fill) => over(fill, base), backdropOf(element));
}

/** The page surface the fixture paints. */
export function pageSurface(fixture: HTMLElement): Rgba {
  return parseColor(getComputedStyle(fixture).backgroundColor);
}

/** The first element under `host` (shadow tree included) that matches `test`. */
export function findDeep(host: Element, test: (element: HTMLElement) => boolean): HTMLElement {
  const found = deepElements(host).find(test);
  if (found === undefined) throw new Error(`${host.localName} renders no matching element`);
  return found;
}

export function byPart(part: string): (element: HTMLElement) => boolean {
  return (element) => element.getAttribute('part')?.split(/\s+/u).includes(part) ?? false;
}

/**
 * The strongest edge drawn around a component's box, measured against the page
 * surface: every visible border of every element in its shadow tree. A
 * boundary is what tells the control from the page (WCAG 1.4.11), so the best
 * edge is the one that counts.
 */
export function boundaryRatio(host: Element, page: Rgba): number {
  let best = 0;
  for (const element of deepElements(host)) {
    const style = getComputedStyle(element);
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      if (
        style.getPropertyValue(`border-${side}-style`) === 'none' ||
        Number.parseFloat(style.getPropertyValue(`border-${side}-width`)) <= 0
      ) {
        continue;
      }
      const color = parseColor(style.getPropertyValue(`border-${side}-color`));
      if (color.a === 0) continue;
      best = Math.max(best, contrast(over(color, page), page));
    }
  }
  return best;
}

/** A divider is a painted rule: its own fill against the page. */
export function ruleRatio(host: Element, page: Rgba): number {
  let best = 0;
  for (const element of deepElements(host)) {
    for (const fill of fillsOf(element)) best = Math.max(best, contrast(over(fill, page), page));
  }
  return best;
}

/** Contrast of a text-bearing element's colour against the surface behind it. */
export function textRatio(element: Element, pseudo?: string): number {
  const color = parseColor(getComputedStyle(element, pseudo).color);
  const behind = surfaceOf(element);
  return contrast(over(color, behind), behind);
}

/**
 * Paint of every rendered piece under `root`, without positions. `filters`
 * includes the backdrop filter: a colours-only comparison leaves it out,
 * because a blur behind an opaque fill paints nothing.
 */
export function paint(root: Element, { filters = true }: { filters?: boolean } = {}): string[] {
  return deepElements(root).map((element) => {
    const style = getComputedStyle(element);
    return [
      element.localName,
      element.getAttribute('part') ?? '',
      style.color,
      style.backgroundColor,
      style.backgroundImage,
      style.borderTopColor,
      style.borderTopWidth,
      style.boxShadow,
      style.outlineColor,
      style.outlineWidth,
      filters ? style.backdropFilter : '',
    ].join(' | ');
  });
}

/** Whether an element blurs what is behind it. */
export function blurs(element: Element): boolean {
  const filter = getComputedStyle(element).backdropFilter;
  return filter !== 'none' && !/^blur\(0(?:px)?\)$/u.test(filter);
}

export function isOpaque(element: Element): boolean {
  const fills = fillsOf(element);
  return fills.length > 0 && fills.every((fill) => fill.a >= 0.995);
}

/** Hue in degrees of an opaque colour, or null when it is grey. */
export function hueOf({ r, g, b }: Rgba): number | null {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 4) return null;
  const delta = max - min;
  const hue =
    max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return (hue * 60 + 360) % 360;
}
