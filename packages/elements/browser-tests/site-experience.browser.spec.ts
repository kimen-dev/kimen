// @spec:031-site-experience
// The public-site contract is exercised in the real browser runner against the
// hand-written HTML/CSS and the built custom elements that ship to consumers.
import tokensCss from '@kimen/tokens/css?raw';
import axe from 'axe-core';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

/* eslint-disable @nx/enforce-module-boundaries -- this integration contract intentionally consumes the hand-written site outside the elements project */
import instrumentSansWoff2Url from '../../../packages/tokens/fonts/InstrumentSansVariable.woff2?url';
import newsreaderWoff2Url from '../../../packages/tokens/fonts/NewsreaderVariable.woff2?url';
import jetBrainsMonoWoff2Url from '../../../site/assets/fonts/JetBrainsMonoVariable.woff2?url';
import siteFontsCss from '../../../site/fonts.css?raw';
import landingCss from '../../../site/landing.css?raw';
import landingHtml from '../../../site/index.html?raw';
// The site entry points are JavaScript delivery artifacts. Their exported
// initializers are the deliberately small test seam shared by page boot and
// this real-browser contract.
// @ts-expect-error -- the hand-written site module intentionally has no declaration artifact
import { initializeLanding, renderCatalog } from '../../../site/landing.js';
import pagesCss from '../../../site/pages.css?raw';
import playgroundCss from '../../../site/playground/playground.css?raw';
import playgroundHtml from '../../../site/playground/index.html?raw';
// @ts-expect-error -- the hand-written site module intentionally has no declaration artifact
import { initializePlayground } from '../../../site/playground/playground.js';
// The privacy page is a public shipped surface whose only script is the
// shared preference module, and installPageMarkup never runs the pre-paint
// theme bootstrap. It still owes the same axe and overflow guarantees as the
// other two.
import privacyHtml from '../../../site/privacy/index.html?raw';
import privacyCss from '../../../site/privacy/privacy.css?raw';
/* eslint-enable @nx/enforce-module-boundaries */
import customElementsManifestJson from '../generated/custom-elements.json?raw';
import robotoWoff2Url from './visual/fonts/RobotoVariable.woff2?url';
// The published pages load the whole element bundle, which registers every
// built component; the live wall renders all of them.
import { defineAllComponents } from './all-components.js';
import { expectAccessible } from './axe.js';

type PageName = 'landing' | 'playground' | 'privacy';
type PageCleanup = () => void;
type PageInitializer = (root?: Document) => PageCleanup;
type ElementConstructor<T extends Element> = new () => T;

type KiProgressElement = HTMLElement & {
  max: number;
  value: number;
};

const PAGES_BASE_URL = new URL('https://kimen.dev/');
const PAGE_STYLE_ID = 'site-experience-page-styles';
const MATERIAL3_STYLESHEET_SELECTOR =
  '#material3-css, link[rel="stylesheet"][href*="tokens.material3.css"]';
const DEFAULT_VIEWPORT = { width: 1024, height: 900 } as const;
// The vendored faces site/fonts.css declares, by the file name it requests
// under assets/fonts/. scripts/build-site.sh assembles that directory from
// these same sources, so the mounted pages lay out with the published faces.
const vendoredFontUrls: Readonly<Record<string, string>> = {
  'InstrumentSansVariable.woff2': instrumentSansWoff2Url,
  'JetBrainsMonoVariable.woff2': jetBrainsMonoWoff2Url,
  'NewsreaderVariable.woff2': newsreaderWoff2Url,
  'RobotoVariable.woff2': robotoWoff2Url,
};
let siteFontsLoaded = false;

const browserCommands = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateReducedMotion: (value: 'reduce' | 'no-preference' | null) => Promise<void>;
};

// Every stylesheet a public page links, by its path under site/. A page is
// mounted with exactly the stylesheets it links, in document order, so the
// suite can never lay a page out with a stylesheet it does not ship (or
// without one it does). fonts.css only declares the vendored faces, which
// ensureSiteFonts registers from the same files.
const siteStylesheets: Readonly<Record<string, string>> = {
  'assets/tokens/tokens.css': tokensCss,
  'fonts.css': '',
  'landing.css': landingCss,
  'pages.css': pagesCss,
  'playground/playground.css': playgroundCss,
  'privacy/privacy.css': privacyCss,
};

const pageSources: Record<PageName, { path: string; html: string; initialize?: PageInitializer }> =
  {
    landing: {
      path: 'index.html',
      html: landingHtml,
      initialize: initializeLanding as PageInitializer,
    },
    playground: {
      path: 'playground/index.html',
      html: playgroundHtml,
      initialize: initializePlayground as PageInitializer,
    },
    // No initializer: the privacy page only loads the shared preference
    // module, whose scheme picker is progressive enhancement.
    privacy: {
      path: 'privacy/index.html',
      html: privacyHtml,
    },
  };

let disposePage: PageCleanup | undefined;

beforeAll(async () => {
  defineAllComponents();
  await ensureSiteFonts();
});

beforeEach(async () => {
  await resetExperience();
});

afterEach(async () => {
  await resetExperience();
});

afterAll(async () => {
  await browserCommands.emulateReducedMotion(null);
  await page.viewport(DEFAULT_VIEWPORT.width, DEFAULT_VIEWPORT.height);
});

function parsedPage(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

/** Register the faces site/fonts.css declares, from the files it names. */
async function ensureSiteFonts(): Promise<void> {
  if (!siteFontsLoaded) {
    const declarations = [...siteFontsCss.matchAll(/@font-face\s*\{([^}]*)\}/gu)].map(
      ([, block = '']) => block,
    );
    expect(declarations.length, 'site/fonts.css declares the vendored faces').toBeGreaterThan(0);
    await Promise.all(
      declarations.map(async (block) => {
        const family = /font-family:\s*["']?([^"';]+)["']?;/u.exec(block)?.[1];
        const weight = /font-weight:\s*([^;]+);/u.exec(block)?.[1] ?? 'normal';
        const file = /url\(["']?\.\/assets\/fonts\/([^"')]+)["']?\)/u.exec(block)?.[1] ?? '';
        const url = vendoredFontUrls[file];
        if (family === undefined || url === undefined) {
          throw new Error(`site/fonts.css declares an unknown face: ${block.trim()}`);
        }
        const face = new FontFace(family, `url(${url}) format('woff2')`, { weight });
        await face.load();
        document.fonts.add(face);
      }),
    );
    siteFontsLoaded = true;
  }
  await document.fonts.ready;
}

/** The stylesheets a page links, resolved under site/, in document order. */
function linkedStylesheets(pageName: PageName, parsed: Document): string {
  const { path } = pageSources[pageName];
  const siteRoot = new URL('https://site.invalid/');
  return [...parsed.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
    .map((link) => {
      const sitePath = new URL(
        link.getAttribute('href') ?? '',
        new URL(path, siteRoot),
      ).pathname.slice(1);
      const css = siteStylesheets[sitePath];
      if (css === undefined) {
        throw new Error(`${pageName} links a stylesheet the suite does not mount: ${sitePath}`);
      }
      return css;
    })
    .join('\n');
}

let mountedBodyAttributes: string[] = [];

function installPageMarkup(pageName: PageName): void {
  const source = pageSources[pageName];
  const parsed = parsedPage(source.html);
  const style = document.createElement('style');
  style.id = PAGE_STYLE_ID;
  style.textContent = linkedStylesheets(pageName, parsed);
  document.head.append(style);

  document.documentElement.lang = parsed.documentElement.lang || 'en';
  const colorScheme = parsed.documentElement.dataset.kiColorScheme;
  if (colorScheme) {
    document.documentElement.dataset.kiColorScheme = colorScheme;
  }
  // Page stylesheets may key on the body's own attributes (data-kimen-page).
  mountedBodyAttributes = parsed.body.getAttributeNames();
  for (const name of mountedBodyAttributes) {
    document.body.setAttribute(name, parsed.body.getAttribute(name) ?? '');
  }
  document.body.innerHTML = parsed.body.innerHTML;
}

function removePageMarkup(): void {
  document.body.replaceChildren();
  for (const name of mountedBodyAttributes) {
    document.body.removeAttribute(name);
  }
  mountedBodyAttributes = [];
  document.getElementById(PAGE_STYLE_ID)?.remove();
}

/** Take the mounted page down, listeners included, leaving preferences as they are. */
function unmountPage(): void {
  disposePage?.();
  disposePage = undefined;
  removePageMarkup();
}

async function mountPage(pageName: PageName, javaScript = true): Promise<void> {
  installPageMarkup(pageName);
  const { initialize } = pageSources[pageName];
  if (javaScript && initialize !== undefined) {
    disposePage = initialize(document);
    expect(disposePage, `${pageName} initializer must return its listener cleanup`).toBeTypeOf(
      'function',
    );
  }
  await settleInitialLayout();
  // Swapping markup inside one long-lived document is not a navigation: on a
  // loaded runner Chromium has applied a 2px scroll on the first frame after
  // the swap, with no page script involved. A navigation starts at the scroll
  // origin, so the mounted page does too; a scroll caused by the test's own
  // actions still fails the origin checks that precede whole-page axe scans.
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  await nextFrame();
}

async function resetExperience(): Promise<void> {
  // Test actions may leave the sticky-header page in a smooth scroll. Cancel
  // that animation before replacing the document so the next whole-page axe
  // scan samples the canonical scroll origin instead of transient overlap.
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  unmountPage();
  document
    .querySelectorAll<HTMLLinkElement>(
      '#material3-css, link[href*="tokens.material3.css"], link[rel="prefetch"]',
    )
    .forEach((link) => {
      link.remove();
    });
  document.documentElement.classList.remove('theme-anim');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
  localStorage.removeItem('kimen-theme');
  localStorage.removeItem('kimen-scheme');
  await browserCommands.emulateReducedMotion(null);
  await page.viewport(DEFAULT_VIEWPORT.width, DEFAULT_VIEWPORT.height);
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  await nextFrame();
}

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function waitFor(predicate: () => boolean, description: string): Promise<void> {
  const deadline = Date.now() + 1500;
  while (!predicate() && Date.now() < deadline) {
    await nextFrame();
  }
  expect(predicate(), description).toBe(true);
}

async function settleInitialLayout(): Promise<void> {
  const customElementNames = [
    ...new Set(
      [...document.querySelectorAll<HTMLElement>('*')]
        .map((element) => element.localName)
        .filter((name) => name.startsWith('ki-')),
    ),
  ];
  await Promise.all(customElementNames.map((name) => customElements.whenDefined(name)));

  const deadline = Date.now() + 1500;
  while (
    [...document.querySelectorAll<HTMLElement>('*')].some(
      (element) => element.localName.startsWith('ki-') && !element.shadowRoot?.hasChildNodes(),
    ) &&
    Date.now() < deadline
  ) {
    await nextFrame();
  }
  await document.fonts.ready;
  await nextFrame();
  await nextFrame();
}

function requireElement<T extends Element>(
  selector: string,
  constructor: ElementConstructor<T>,
): T {
  const element = document.querySelector(selector);
  expect(element, `missing ${selector}`).toBeInstanceOf(constructor);
  if (!(element instanceof constructor)) {
    throw new Error(`Missing ${selector}`);
  }
  return element;
}

function linkNamed(name: string): HTMLAnchorElement {
  const link = [...document.querySelectorAll<HTMLAnchorElement>('a')].find(
    (candidate) => candidate.textContent.trim() === name,
  );
  expect(link, `missing link named "${name}"`).toBeInstanceOf(HTMLAnchorElement);
  if (!link) {
    throw new Error(`Missing link named "${name}"`);
  }
  return link;
}

function canonicalDestination(link: HTMLAnchorElement): string {
  const destination = new URL(link.getAttribute('href') ?? '', PAGES_BASE_URL);
  return destination.origin === PAGES_BASE_URL.origin
    ? `${destination.pathname}${destination.search}${destination.hash}`
    : destination.href;
}

function requireRadio(control: 'scheme' | 'theme', value: string): HTMLInputElement {
  return requireElement<HTMLInputElement>(
    `[data-${control}-control] input[type="radio"][value="${value}"]`,
    HTMLInputElement,
  );
}

function selectedControlValues(control: 'scheme' | 'theme'): string[] {
  return [...document.querySelectorAll<HTMLElement>(`[data-${control}-control]`)]
    .map(
      (fieldset) =>
        fieldset.querySelector<HTMLInputElement>('input[type="radio"]:checked')?.value ?? '',
    )
    .filter(Boolean);
}

function expectSynchronizedControls(control: 'scheme' | 'theme', value: string): void {
  const selected = selectedControlValues(control);
  expect(selected.length, `missing ${control} controls`).toBeGreaterThan(0);
  expect(new Set(selected)).toEqual(new Set([value]));
}

async function finishMaterial3Load(expectNewRequest = true): Promise<void> {
  if (expectNewRequest) {
    await waitFor(
      () => document.querySelector(MATERIAL3_STYLESHEET_SELECTOR) !== null,
      'Material 3 stylesheet is requested only after choosing that theme',
    );
  }
  document.querySelector(MATERIAL3_STYLESHEET_SELECTOR)?.dispatchEvent(new Event('load'));
  await waitFor(
    () => document.documentElement.dataset.kiTheme === 'material3',
    'Material 3 is applied after its stylesheet becomes usable',
  );
}

function nativeButtonMatching(name: RegExp): HTMLButtonElement {
  const directButton = [...document.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
    name.test(button.textContent.trim()),
  );
  if (directButton) {
    return directButton;
  }

  const host = [...document.querySelectorAll<HTMLElement>('ki-button')].find((candidate) =>
    name.test(candidate.textContent.trim()),
  );
  const shadowButton = host?.shadowRoot?.querySelector('button');
  expect(shadowButton, `missing native button matching ${name.source}`).toBeInstanceOf(
    HTMLButtonElement,
  );
  if (!(shadowButton instanceof HTMLButtonElement)) {
    throw new Error(`Missing native button matching ${name.source}`);
  }
  return shadowButton;
}

function liveStatus(root: HTMLElement): HTMLElement {
  if (root.getAttribute('role') === 'status') {
    return root;
  }
  const status = root.shadowRoot?.querySelector<HTMLElement>('[role="status"]');
  expect(status, '#deployment-status must expose a status live region').toBeInstanceOf(HTMLElement);
  if (!status) {
    throw new Error('#deployment-status does not expose role="status"');
  }
  return status;
}

function progressbar(root: KiProgressElement): HTMLElement {
  const progress = root.shadowRoot?.querySelector<HTMLElement>('[role="progressbar"]');
  expect(progress, '#deployment-progress must expose a progressbar').toBeInstanceOf(HTMLElement);
  if (!progress) {
    throw new Error('#deployment-progress does not expose role="progressbar"');
  }
  return progress;
}

function deepElements(root: ParentNode): Element[] {
  const elements: Element[] = [];
  for (const element of root.querySelectorAll('*')) {
    elements.push(element);
    if (element.shadowRoot) {
      elements.push(...deepElements(element.shadowRoot));
    }
  }
  return elements;
}

function runningAutomaticAnimations(): Animation[] {
  const animations = new Set<Animation>();
  for (const element of deepElements(document)) {
    for (const animation of element.getAnimations()) {
      if (animation.playState === 'running') {
        animations.add(animation);
      }
    }
  }
  return [...animations];
}

function hiddenContentSections(): string[] {
  return [...document.querySelectorAll<HTMLElement>('main > section')]
    .filter((section) => {
      const style = getComputedStyle(section);
      const rect = section.getBoundingClientRect();
      return (
        section.hidden ||
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        Number(style.opacity) === 0 ||
        rect.width === 0 ||
        rect.height === 0
      );
    })
    .map((section) =>
      section.id.length > 0 ? section.id : (section.getAttribute('aria-labelledby') ?? '<unnamed>'),
    );
}

function isRendered(element: HTMLElement): boolean {
  const style = getComputedStyle(element);
  return (
    !element.hidden &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    element.getClientRects().length > 0
  );
}

async function reachablePrimaryNavigation(): Promise<HTMLElement> {
  const navigations = [...document.querySelectorAll<HTMLElement>('nav[aria-label^="Primary"]')];
  let navigation = navigations.find(
    (candidate) =>
      isRendered(candidate) &&
      [...candidate.querySelectorAll<HTMLAnchorElement>('a[href]')].some(isRendered),
  );

  if (!navigation) {
    const disclosure = [...document.querySelectorAll<HTMLDetailsElement>('details')].find(
      (details) => {
        const summary = details.querySelector('summary');
        return (
          summary instanceof HTMLElement &&
          isRendered(summary) &&
          navigations.some((candidate) => details.contains(candidate))
        );
      },
    );
    const summary = disclosure?.querySelector('summary');
    if (summary instanceof HTMLElement) {
      await userEvent.click(summary);
      await nextFrame();
      navigation = navigations.find(
        (candidate) =>
          isRendered(candidate) &&
          [...candidate.querySelectorAll<HTMLAnchorElement>('a[href]')].some(isRendered),
      );
    }
  }

  expect(navigation, 'a primary navigation must be visible or reachable through Menu').toBeTruthy();
  if (!navigation) {
    throw new Error('Primary navigation is unreachable');
  }
  return navigation;
}

function horizontalOverflow(): number {
  return document.documentElement.scrollWidth - document.documentElement.clientWidth;
}

function overflowDiagnostics(): string {
  const viewportWidth = document.documentElement.clientWidth;
  const measured = [...document.querySelectorAll<HTMLElement>('body *')]
    .map((element) => ({ element, rect: element.getBoundingClientRect() }))
    .filter(({ rect }) => rect.left < -0.5 || rect.right > viewportWidth + 0.5)
    .sort((left, right) => right.rect.right - left.rect.right);
  const describe = ({ element, rect }: (typeof measured)[number]): string =>
    `${element.localName}${element.id ? `#${element.id}` : ''}${
      element.classList.length > 0 ? `.${[...element.classList].join('.')}` : ''
    }[${rect.left.toFixed(0)},${rect.right.toFixed(0)}]`;
  const offenders = measured.slice(0, 8).map(describe);
  const outsideScrollRegions = measured
    .filter(({ element }) => element.closest('.comparison-wrap') === null)
    .slice(0, 8)
    .map(describe);
  return `scrollWidth=${String(document.documentElement.scrollWidth)}, clientWidth=${String(
    viewportWidth,
  )}, innerWidth=${String(window.innerWidth)}, offenders=${offenders.join(
    ', ',
  )}, outsideScrollRegions=${outsideScrollRegions.join(', ')}`;
}

type Box = readonly [x: number, y: number, width: number, height: number];

/** An element's border box in document coordinates, or relative to an origin element's top. */
function boxOf(element: Element, origin?: Element): Box {
  const rect = element.getBoundingClientRect();
  const top = origin === undefined ? -window.scrollY : origin.getBoundingClientRect().y;
  return [rect.x + window.scrollX, rect.y - top, rect.width, rect.height];
}

function expectBox(label: string, actual: Box, approved: Box, tolerance = 1.5): void {
  actual.forEach((value, index) => {
    const expected = approved[index] ?? Number.NaN;
    expect(
      Math.abs(value - expected),
      `${label} [x, y, width, height][${String(index)}] is ${value.toFixed(1)}, approved ${String(expected)}`,
    ).toBeLessThanOrEqual(tolerance);
  });
}

/*
 * The approved design is the founder's reference for issue #499 (the Calma
 * redesign of kimen.dev). Its numbers were measured on that reference site,
 * served with the assets scripts/build-site.sh publishes (token stylesheets,
 * the element bundle and manifest, the vendored faces of site/fonts.css), at
 * 1440 x 1000 CSS px in the dark scheme with reduced motion. Chromium, Firefox
 * and WebKit lay the reference out within a pixel of these values. Boxes are
 * [x, y, width, height]; hero boxes are in document coordinates, and boxes
 * below the hero are measured from the top of the region named in the comment
 * beside them, because the published page adds content the reference lacks
 * (see each test).
 */
const APPROVED_LANDING = {
  hero: [0, 0, 1440, 1000],
  spine: [0, 0, 460.8, 1000],
  brand: [32, 24, 147.5, 24],
  specFile: [0, 104, 460.8, 41],
  specFirstLine: [0, 161, 460.8, 22.1],
  verdictBottom: 976,
  primaryLinks: [
    [932.5, 30, 78.4, 24],
    [1042.9, 30, 33.4, 24],
    [1108.3, 30, 30.4, 24],
    [1170.7, 30, 68.6, 24],
    [1271.3, 30, 43.1, 24],
  ],
  pitch: [518.4, 120, 864, 384.1],
  title: [518.4, 120, 864, 165.1],
  lede: [518.4, 305.1, 736, 93],
  actions: [518.4, 418.1, 864, 42],
  note: [518.4, 480.1, 864, 24],
  preview: [518.4, 552.1, 432, 307],
  // From the top of the theme bands.
  bands: [0, 0, 1440, 920],
  band: [0, 1, 1440, 918],
  seams: [
    [338, 1, 44, 918],
    [698, 1, 44, 918],
    [1058, 1, 44, 918],
  ],
  bandTitle: [24, 97, 1392, 70.1],
  // Every content section below the bands shares one frame.
  sectionPadding: { block: 129.6, inline: 57.6 },
  sectionTitle: { x: 57.6, fontSize: 56, lineHeight: 59.36 },
  // From the top of #start.
  waysGrid: [57.6, 429.3, 1324.8, 465],
  ways: [
    [57.6, 430.3, 662.4, 464],
    [720, 430.3, 662.4, 464],
  ],
  // From the top of #guardrail.
  guardBench: [57.6, 429.3, 1324.8, 382.8],
  guardPicks: [57.6, 429.3, 352, 382.8],
  guardOutput: [457.6, 429.3, 924.8, 382.8],
  // The wall frame, then its specimen cells from the wall's own top.
  wall: { x: 57.6, width: 1324.8, column: 330.95, columns: 4 },
  wallCells: [
    [58.6, 1, 661.9, 208],
    [720.5, 1, 331, 208],
    [1051.5, 1, 331, 208],
    [58.6, 209, 331, 208],
    [389.5, 209, 331, 208],
    [720.5, 209, 661.9, 208],
    [58.6, 417, 331, 208],
    [389.5, 417, 331, 208],
    [720.5, 417, 331, 208],
    [1051.5, 417, 331, 208],
    [58.6, 625, 661.9, 208],
    [720.5, 625, 331, 208],
    [1051.5, 625, 331, 208],
  ],
  // From the top of #agents.
  llms: [752, 129.6, 630.4, 362.1],
  artifacts: [57.6, 413.3, 630.4, 326],
  // From the top of #quality.
  gateTable: [57.6, 322.9, 1324.8, 404.1],
  // The closing call and the footer.
  closeHeight: 498.8,
  closeTitle: { centre: 720, y: 130.6, height: 82.6 },
  footHeight: 90,
} as const;

const APPROVED_PLAYGROUND = {
  header: [0, 0, 1440, 60],
  brand: [32, 17.5, 143.1, 24],
  navEnd: 1408,
  toolbar: [0, 60, 1440, 64],
  title: [32, 77.5, 169.2, 28],
  reset: [1316, 73.5, 92, 36],
  main: [0, 60, 1440, 1126],
  canvas: [0, 124, 1440, 704],
  relay: [208, 172, 1024, 608],
  relayHead: [233, 197, 974, 73],
  relayGrid: [233, 294, 974, 461],
  // The token drawer docks to the bottom of the 1000px viewport.
  drawer: [0, 642, 1440, 358],
  drawerHead: [0, 643, 1440, 53],
  tableWrap: [0, 696, 1440, 304],
  tokenRow: { y: 736.5, height: 38 },
  footer: [0, 1186, 1440, 89],
  documentHeight: 1275,
} as const;

describe('Kimen public site experience in a real browser', () => {
  it.each([
    ['Explore the components', '/docs/components/alert/'],
    ['Open the playground', '/playground/'],
    ['GitHub', 'https://github.com/kimen-dev/kimen'],
  ] as const)('S1 sends %s to its canonical destination', async (linkName, destination) => {
    await mountPage('landing', false);

    expect(canonicalDestination(linkNamed(linkName))).toBe(destination);
  });

  it('S2 persists and synchronizes Material 3 dark across landing and playground', async () => {
    await mountPage('landing');
    expect(document.querySelector(MATERIAL3_STYLESHEET_SELECTOR)).toBeNull();
    expect(document.documentElement.hasAttribute('data-ki-theme')).toBe(false);
    expect(document.documentElement.dataset.kiColorScheme).toBe('dark');
    expectSynchronizedControls('theme', 'onmars');
    expectSynchronizedControls('scheme', 'dark');

    await userEvent.click(requireRadio('theme', 'material3'));
    await finishMaterial3Load();
    await userEvent.click(requireRadio('scheme', 'dark'));

    expect(document.documentElement.dataset.kiTheme).toBe('material3');
    expect(document.documentElement.dataset.kiColorScheme).toBe('dark');
    expect(localStorage.getItem('kimen-theme')).toBe('material3');
    expect(localStorage.getItem('kimen-scheme')).toBe('dark');
    expectSynchronizedControls('scheme', 'dark');

    unmountPage();
    await mountPage('playground');

    expect(document.documentElement.dataset.kiTheme).toBe('material3');
    expect(document.documentElement.dataset.kiColorScheme).toBe('dark');
    expectSynchronizedControls('theme', 'material3');
    expectSynchronizedControls('scheme', 'dark');
  });

  it('S3 selects and applies Material 3 with ArrowRight', async () => {
    await mountPage('landing');
    const onmars = requireRadio('theme', 'onmars');
    const material3 = requireRadio('theme', 'material3');
    onmars.focus();

    await userEvent.keyboard('{ArrowRight}');
    await finishMaterial3Load(false);

    expect(document.activeElement).toBe(material3);
    expect(material3.checked).toBe(true);
    expect(document.documentElement.dataset.kiTheme).toBe('material3');
  });

  it('S4 announces a completed deployment and exposes progress as 87 of 100', async () => {
    await mountPage('playground');
    const form = requireElement<HTMLFormElement>('#deployment-form', HTMLFormElement);
    expect(form.checkValidity()).toBe(true);

    await userEvent.click(nativeButtonMatching(/^Deploy(?: service)?$/iu));
    await waitFor(
      () => document.querySelector<HTMLElement>('#deployment-status')?.hidden === false,
      'the deployment status is rendered after native form submission',
    );
    await settleInitialLayout();

    const status = requireElement<HTMLElement>('#deployment-status', HTMLElement);
    const progress = requireElement('#deployment-progress', HTMLElement) as KiProgressElement;
    const exposedProgress = progressbar(progress);
    const visibleProgress = requireElement<HTMLElement>('#deployment-progress-value', HTMLElement);
    const statusSnapshot = await browserCommands.ariaSnapshot('#deployment-status');

    expect(status.localName).toBe('ki-alert');
    expect(liveStatus(status).getAttribute('role')).toBe('status');
    expect(statusSnapshot).toMatch(/relay-gateway.*deployed|deployed.*relay-gateway/iu);
    expect(progress.localName).toBe('ki-progress');
    expect(exposedProgress.getAttribute('aria-valuenow')).toBe('87');
    expect(exposedProgress.getAttribute('aria-valuemax')).toBe('100');
    expect(visibleProgress.textContent).toMatch(/87\s*(?:of|\/|%)\s*(?:100)?/iu);
    expect(window.scrollY, 'whole-page axe scans start at the canonical scroll origin').toBe(0);
    await expectAccessible(document.body);
  });

  it('S5 keeps semantic structure and canonical navigation without client JavaScript', async () => {
    // Keep the complete multiline spec inside the viewport. axe samples
    // painted text with elementFromPoint; a text box that straddles the
    // viewport edge is otherwise reported as elmPartiallyObscuring even
    // though no document element covers it.
    await page.viewport(DEFAULT_VIEWPORT.width, 1400);
    await mountPage('landing', false);

    expect(document.querySelector('header')).toBeInstanceOf(HTMLElement);
    expect(document.querySelector('nav')).toBeInstanceOf(HTMLElement);
    expect(document.querySelector('main')).toBeInstanceOf(HTMLElement);
    expect(document.querySelector('footer')).toBeInstanceOf(HTMLElement);
    expect(canonicalDestination(linkNamed('Components'))).toBe('/docs/components/alert/');
    expect(canonicalDestination(linkNamed('Playground'))).toBe('/playground/');
    expect(canonicalDestination(linkNamed('GitHub'))).toBe('https://github.com/kimen-dev/kimen');
    await expectAccessible(document.body);
  });

  it('S5 keeps the privacy declaration semantic and accessible without client JavaScript', async () => {
    // Same reason as the landing scan above: keep the whole declaration inside
    // the viewport so axe samples painted text instead of reporting a
    // paragraph that straddles the viewport edge as partially obscured.
    await page.viewport(DEFAULT_VIEWPORT.width, 1600);
    await mountPage('privacy', false);

    expect(document.querySelector('header')).toBeInstanceOf(HTMLElement);
    expect(document.querySelector('nav')).toBeInstanceOf(HTMLElement);
    expect(document.querySelector('main')).toBeInstanceOf(HTMLElement);
    expect(document.querySelector('footer')).toBeInstanceOf(HTMLElement);
    expect(document.querySelectorAll('main h1')).toHaveLength(1);
    await expectAccessible(document.body);
  });

  it('S5 names the brand link with the text it shows on every public page', async () => {
    // WCAG 2.5.3 (Label in Name): a speech-input visitor activates the brand
    // link by saying what it shows, so its accessible name must contain that
    // visible text. axe-core 4.14 enforces label-content-name-mismatch by
    // default; earlier versions tag it experimental and skip it, so the rule is
    // requested explicitly to hold under every pinned axe-core version.
    for (const pageName of ['landing', 'playground', 'privacy'] as const) {
      await mountPage(pageName, false);
      const brand = requireElement<HTMLAnchorElement>('header .brand', HTMLAnchorElement);
      const visibleText = [...brand.querySelectorAll<HTMLElement>('.brand-name, .brand-stage')]
        .filter((part) => part.checkVisibility())
        .map((part) => part.textContent.trim())
        .join(' ');
      expect(visibleText, `${pageName} brand link shows the product name`).toMatch(/^Kimen\b/u);
      expect(await browserCommands.ariaSnapshot('header .brand')).toContain(`link "${visibleText}`);
      const results = await axe.run(document.body, {
        runOnly: { type: 'rule', values: ['label-content-name-mismatch'] },
      });
      expect(results.violations, `${pageName} label-in-name violations`).toEqual([]);
    }
  });

  it('S6 disables automatic motion without hiding landing content', async () => {
    // The landing opens under a preference switched on while it was showing,
    // as for a person who turns it on and comes back to the page. WebKit
    // re-evaluates a component's media queries only in the shadow roots
    // present when a preference changes, so in a document that has shown the
    // landing before, components mounted after a change made with none in it
    // can keep the motion they had.
    await mountPage('landing');
    await browserCommands.emulateReducedMotion('reduce');
    unmountPage();
    await mountPage('landing');

    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
    expect(runningAutomaticAnimations()).toEqual([]);
    expect(document.querySelectorAll('main > section').length).toBeGreaterThan(0);
    expect(hiddenContentSections()).toEqual([]);
  });

  it('keeps the desktop landing geometry and content density of the approved design', async () => {
    await browserCommands.emulateReducedMotion('reduce');
    await page.viewport(1440, 1000);
    await mountPage('landing');

    // The theme bands clone themselves once Material 3 is near, as they do
    // for a visitor scrolling down, and the wall renders the components of
    // the manifest the build publishes beside the page.
    const bands = requireElement<HTMLElement>('[data-bands]', HTMLElement);
    bands.scrollIntoView({ block: 'center', behavior: 'instant' });
    await waitFor(() => bands.hasAttribute('data-ready'), 'the theme bands activate near view');
    const manifest = JSON.parse(customElementsManifestJson) as {
      modules: { declarations?: { tagName?: string }[] }[];
    };
    expect(renderCatalog(manifest, document), 'the wall renders from the manifest').toBe(true);
    await settleInitialLayout();
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    await nextFrame();

    const approved = APPROVED_LANDING;
    const element = (selector: string) => requireElement<HTMLElement>(selector, HTMLElement);

    // Hero: the spec spine beside the pitch and its live preview.
    expectBox('hero', boxOf(element('.hero')), approved.hero);
    expectBox('spine', boxOf(element('.spine')), approved.spine);
    expectBox('brand', boxOf(element('.hero .brand')), approved.brand);
    expectBox('spec file', boxOf(element('.file')), approved.specFile);
    expectBox('first spec line', boxOf(element('.spec .ln')), approved.specFirstLine);
    // The verdict's copy states what the illustration shows, so it may take
    // another line than the reference; it still closes the spine where the
    // reference's does.
    const [, verdictTop, , verdictHeight] = boxOf(element('.verdict'));
    expect(Math.abs(verdictTop + verdictHeight - approved.verdictBottom)).toBeLessThanOrEqual(1.5);
    const primaryLinks = [...document.querySelectorAll<HTMLElement>('.topnav a')];
    expect(primaryLinks).toHaveLength(approved.primaryLinks.length);
    primaryLinks.forEach((link, index) => {
      expectBox(
        `primary link ${String(index)}`,
        boxOf(link),
        approved.primaryLinks[index] ?? [0, 0, 0, 0],
      );
    });
    expectBox('pitch', boxOf(element('.pitch')), approved.pitch);
    expectBox('title', boxOf(element('#hero-title')), approved.title);
    expectBox('lede', boxOf(element('.pitch .lede')), approved.lede);
    expectBox('actions', boxOf(element('.pitch .cta')), approved.actions);
    expectBox('note', boxOf(element('.pitch .note')), approved.note);
    expectBox('preview', boxOf(element('.render-card')), approved.preview);
    const titleStyle = getComputedStyle(element('#hero-title'));
    expect(titleStyle.fontFamily).toMatch(/^"?Newsreader"?,/u);
    expect(Number.parseFloat(titleStyle.fontSize)).toBeCloseTo(82.56, 1);
    expect(Number.parseFloat(titleStyle.lineHeight)).toBeCloseTo(82.56, 1);
    expect(titleStyle.fontWeight).toBe('500');

    // The published page adds the six project stats between the hero and the
    // bands (site-contract.test.mjs keeps them), so the bands are measured
    // from their own top.
    const bandList = [...bands.querySelectorAll<HTMLElement>('.band')];
    const seams = [...bands.querySelectorAll<HTMLElement>('.seam')];
    expectBox('bands', boxOf(bands, bands), approved.bands);
    expect(bandList).toHaveLength(4);
    bandList.forEach((band, index) => {
      expectBox(`band ${String(index + 1)}`, boxOf(band, bands), approved.band);
    });
    expect(seams).toHaveLength(approved.seams.length);
    seams.forEach((seam, index) => {
      expectBox(
        `seam ${String(index + 1)}`,
        boxOf(seam, bands),
        approved.seams[index] ?? [0, 0, 0, 0],
      );
    });
    expectBox('band title', boxOf(element('.band .surface-title'), bands), approved.bandTitle);

    for (const id of ['start', 'guardrail', 'components', 'agents', 'quality', 'status']) {
      const section = element(`#${id}`);
      const style = getComputedStyle(section);
      const title = requireElement<HTMLElement>(`#${id} .section-title`, HTMLElement);
      const titleBox = boxOf(title, section);
      expect(Number.parseFloat(style.paddingBlockStart), `#${id} block padding`).toBeCloseTo(
        approved.sectionPadding.block,
        1,
      );
      expect(Number.parseFloat(style.paddingBlockEnd)).toBeCloseTo(
        approved.sectionPadding.block,
        1,
      );
      expect(Number.parseFloat(style.paddingInlineStart), `#${id} inline padding`).toBeCloseTo(
        approved.sectionPadding.inline,
        1,
      );
      expect(Number.parseFloat(style.paddingInlineEnd)).toBeCloseTo(
        approved.sectionPadding.inline,
        1,
      );
      // Titles start at the section's padding edge (below its rule, if any).
      expect(Math.abs(titleBox[0] - approved.sectionTitle.x)).toBeLessThanOrEqual(1.5);
      expect(
        Math.abs(
          titleBox[1] -
            approved.sectionPadding.block -
            Number.parseFloat(style.borderBlockStartWidth),
        ),
        `#${id} title offset`,
      ).toBeLessThanOrEqual(1.5);
      expect(Number.parseFloat(getComputedStyle(title).fontSize)).toBeCloseTo(
        approved.sectionTitle.fontSize,
        1,
      );
      expect(Number.parseFloat(getComputedStyle(title).lineHeight)).toBeCloseTo(
        approved.sectionTitle.lineHeight,
        1,
      );
    }

    const start = element('#start');
    expectBox('ways', boxOf(element('.ways-grid'), start), approved.waysGrid);
    const ways = [...document.querySelectorAll<HTMLElement>('.ways-grid > .way')];
    expect(ways).toHaveLength(2);
    ways.forEach((way, index) => {
      expectBox(
        `way ${String(index + 1)}`,
        boxOf(way, start),
        approved.ways[index] ?? [0, 0, 0, 0],
      );
    });
    const guardrail = element('#guardrail');
    expectBox('guard bench', boxOf(element('.guard-bench'), guardrail), approved.guardBench);
    expectBox('guard picks', boxOf(element('.guard-picks'), guardrail), approved.guardPicks);
    expectBox('guard output', boxOf(element('.guard-io'), guardrail), approved.guardOutput);

    // The catalog section adds its contract heading above the wall, and the
    // wall continues past the reference's specimens with one cell for every
    // further manifest component (issue #499: no hard-coded count), so the
    // wall frame and its specimen cells are measured from the wall's top.
    const wall = element('.wall');
    const [wallX, , wallWidth] = boxOf(wall);
    expect(Math.abs(wallX - approved.wall.x)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(wallWidth - approved.wall.width)).toBeLessThanOrEqual(1.5);
    const columns = getComputedStyle(wall).gridTemplateColumns.split(' ').map(Number.parseFloat);
    expect(columns).toHaveLength(approved.wall.columns);
    for (const column of columns) {
      expect(column).toBeCloseTo(approved.wall.column, 0);
    }
    const cells = [...wall.querySelectorAll<HTMLElement>(':scope > .cell')];
    approved.wallCells.forEach((approvedCell, index) => {
      const cell = cells[index];
      expect(cell, `wall specimen ${String(index + 1)}`).toBeInstanceOf(HTMLElement);
      if (cell) {
        expectBox(`wall specimen ${String(index + 1)}`, boxOf(cell, wall), approvedCell);
      }
    });

    const agents = element('#agents');
    expectBox('llms.txt figure', boxOf(element('.llms'), agents), approved.llms);
    expectBox('agent artifacts', boxOf(element('.artifacts'), agents), approved.artifacts);
    expectBox('gate table', boxOf(element('.gate-table'), element('#quality')), approved.gateTable);
    const close = element('.close');
    const closeTitle = boxOf(element('#close-title'), close);
    expect(Math.abs(boxOf(close)[3] - approved.closeHeight)).toBeLessThanOrEqual(1.5);
    expect(
      Math.abs(closeTitle[0] + closeTitle[2] / 2 - approved.closeTitle.centre),
    ).toBeLessThanOrEqual(1);
    expect(Math.abs(closeTitle[1] - approved.closeTitle.y)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(closeTitle[3] - approved.closeTitle.height)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(boxOf(element('.foot'))[3] - approved.footHeight)).toBeLessThanOrEqual(1.5);

    // Content density: what the reference shows, and what the contract adds.
    const count = (selector: string) => document.querySelectorAll(selector).length;
    expect(count('.spec .ln')).toBe(23);
    expect(count('.code-tabs')).toBe(2);
    expect(count('.code-tabs ki-tab-panel')).toBe(7);
    expect(count('.guard-picks [data-case]')).toBe(5);
    expect(count('.gate-table tbody > tr')).toBe(6);
    expect(count('.project-stats > div')).toBe(6);
    expect(count('.contract-artifact')).toBe(4);
    expect(count('.comparison-wrap tbody > tr')).toBe(7);
    expect(count('.roadmap > li')).toBe(6);
    const shipped = manifest.modules.flatMap(({ declarations = [] }) =>
      declarations.flatMap(({ tagName }) => (tagName?.startsWith('ki-') ? [tagName] : [])),
    );
    const onTheWall = [...wall.querySelectorAll<HTMLAnchorElement>('.tag a')].map((link) =>
      link.textContent.trim(),
    );
    expect(onTheWall.sort(), 'the wall names every shipped component once').toEqual(
      [...new Set(shipped)].sort(),
    );

    expect(
      [
        'hero-title',
        'theme-title',
        'ways-title',
        'guard-title',
        'components-title',
        'catalog-title',
        'agents-title',
        'gates-title',
        'status-title',
        'close-title',
      ].map((id) => element(`#${id}`).textContent.replace(/\s+/gu, ' ').trim()),
    ).toEqual([
      'Agents write data. Kimen renders real UI.',
      'This page runs on @kimen/tokens. Flip it.',
      'Write it yourself, or let your agent compose it.',
      'The guardrail says no, and says why.',
      'Every component, live. Not screenshots.',
      'The ki-* catalog.',
      'Legible to agents, by contract.',
      'Done means gates exit 0.',
      'Honest, gated, in the open.',
      'Start with one element.',
    ]);
  });

  it('keeps the desktop playground geometry and ten-token inspector of the approved design', async () => {
    await browserCommands.emulateReducedMotion('reduce');
    await page.viewport(1440, 1000);
    await mountPage('playground');

    const approved = APPROVED_PLAYGROUND;
    const element = (selector: string) => requireElement<HTMLElement>(selector, HTMLElement);

    expect(element('#playground-title').textContent.trim()).toBe('Theme playground');
    expectBox('header', boxOf(element('.site-header')), approved.header);
    expectBox('brand', boxOf(element('.site-header .brand')), approved.brand);
    // Every navigation link keeps a 24px target (WCAG 2.5.8), the GitHub one
    // around a 20px icon, so the navigation is 4px wider than the reference's
    // and is measured by the edge it ends at, on the brand's row.
    const [navX, navY, navWidth, navHeight] = boxOf(element('.site-nav'));
    expect(Math.abs(navX + navWidth - approved.navEnd)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(navY - approved.brand[1])).toBeLessThanOrEqual(1.5);
    expect(Math.abs(navHeight - approved.brand[3])).toBeLessThanOrEqual(1.5);
    expectBox('toolbar', boxOf(element('.pg-toolbar')), approved.toolbar);
    expectBox('title', boxOf(element('#playground-title')), approved.title);
    expectBox('reset', boxOf(element('.pg-reset')), approved.reset);
    expectBox('main', boxOf(element('main.pg')), approved.main);
    expectBox('canvas', boxOf(element('.pg-canvas')), approved.canvas);
    expectBox('relay console', boxOf(element('.relay')), approved.relay);
    expectBox('relay head', boxOf(element('.relay-head')), approved.relayHead);
    expectBox('relay grid', boxOf(element('.relay-grid')), approved.relayGrid);
    expectBox('token drawer', boxOf(element('.pg-drawer')), approved.drawer);
    expectBox('token drawer head', boxOf(element('.pg-drawer-head')), approved.drawerHead);
    expectBox('token table', boxOf(element('.pg-table-wrap')), approved.tableWrap);
    expectBox('footer', boxOf(element('.site-footer')), approved.footer);
    expect(
      Math.abs(document.documentElement.scrollHeight - approved.documentHeight),
    ).toBeLessThanOrEqual(1.5);
    const titleStyle = getComputedStyle(element('#playground-title'));
    expect(titleStyle.fontFamily).toMatch(/^"?Newsreader"?,/u);
    expect(titleStyle.fontSize).toBe('22px');
    expect(Number.parseFloat(titleStyle.lineHeight)).toBeCloseTo(28, 1);

    // The reference lists every semantic token; the published inspector keeps
    // the ten the contract names (site-contract.test.mjs), at the reference's
    // row geometry, each resolved from this document.
    const rows = [...document.querySelectorAll<HTMLElement>('.token-table tbody > .token-row')];
    expect(rows).toHaveLength(10);
    const [, rowY] = boxOf(rows[0] ?? element('.token-row'));
    expect(Math.abs(rowY - approved.tokenRow.y)).toBeLessThanOrEqual(1.5);
    for (const row of rows) {
      expect(
        Math.abs(boxOf(row)[3] - approved.tokenRow.height),
        row.textContent,
      ).toBeLessThanOrEqual(1);
      const declared = row.querySelector('[data-token-declared]')?.textContent.trim() ?? '';
      const current = row.querySelector('[data-token-value]')?.textContent.trim() ?? '';
      expect(declared, `${row.dataset.group ?? ''} token declaration`).not.toMatch(
        /^(?:|Unavailable)$/u,
      );
      expect(current, `${row.dataset.group ?? ''} token value`).not.toMatch(/^(?:|Unavailable)$/u);
    }
    expect(
      [...document.querySelectorAll<HTMLElement>('.token-table thead th')].map((cell) =>
        cell.textContent.replace(/\s+/gu, ' ').trim(),
      ),
    ).toEqual(['Token', 'Declared as', 'Now · onmars dark']);
  });

  it.each([
    ['landing', 320],
    ['landing', 1440],
    ['playground', 320],
    ['playground', 1440],
    ['privacy', 320],
    ['privacy', 1440],
  ] as const)('S7 fits the %s at %i CSS pixels with reachable navigation', async (name, width) => {
    await page.viewport(width, DEFAULT_VIEWPORT.height);
    await mountPage(name);
    const navigation = await reachablePrimaryNavigation();
    const firstLink = [...navigation.querySelectorAll<HTMLAnchorElement>('a[href]')].find(
      isRendered,
    );
    expect(firstLink).toBeInstanceOf(HTMLAnchorElement);
    if (!firstLink) {
      throw new Error('Primary navigation has no rendered link');
    }

    expect(firstLink.tabIndex).toBeGreaterThanOrEqual(0);
    expect(horizontalOverflow(), overflowDiagnostics()).toBeLessThanOrEqual(0);
  });
});
