// @spec:031-site-experience
// The public-site contract is exercised in the real browser runner against the
// hand-written HTML/CSS and the built custom elements that ship to consumers.
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

/* eslint-disable @nx/enforce-module-boundaries -- this integration contract intentionally consumes the hand-written site outside the elements project */
import landingCss from '../../../site/landing.css?raw';
import landingHtml from '../../../site/index.html?raw';
// The site entry points are JavaScript delivery artifacts. Their exported
// initializers are the deliberately small test seam shared by page boot and
// this real-browser contract.
// @ts-expect-error -- the hand-written site module intentionally has no declaration artifact
import { initializeLanding } from '../../../site/landing.js';
import playgroundCss from '../../../site/playground/playground.css?raw';
import playgroundHtml from '../../../site/playground/index.html?raw';
// @ts-expect-error -- the hand-written site module intentionally has no declaration artifact
import { initializePlayground } from '../../../site/playground/playground.js';
/* eslint-enable @nx/enforce-module-boundaries */
import { defineCustomElement as defineKiAlert } from '../dist/components/ki-alert.js';
import { defineCustomElement as defineKiAvatar } from '../dist/components/ki-avatar.js';
import { defineCustomElement as defineKiAvatarGroup } from '../dist/components/ki-avatar-group.js';
import { defineCustomElement as defineKiBadge } from '../dist/components/ki-badge.js';
import { defineCustomElement as defineKiButton } from '../dist/components/ki-button.js';
import { defineCustomElement as defineKiCard } from '../dist/components/ki-card.js';
import { defineCustomElement as defineKiCheckbox } from '../dist/components/ki-checkbox.js';
import { defineCustomElement as defineKiDialog } from '../dist/components/ki-dialog.js';
import { defineCustomElement as defineKiDivider } from '../dist/components/ki-divider.js';
import { defineCustomElement as defineKiIconButton } from '../dist/components/ki-icon-button.js';
import { defineCustomElement as defineKiIndicator } from '../dist/components/ki-indicator.js';
import { defineCustomElement as defineKiInput } from '../dist/components/ki-input.js';
import { defineCustomElement as defineKiList } from '../dist/components/ki-list.js';
import { defineCustomElement as defineKiListItem } from '../dist/components/ki-list-item.js';
import { defineCustomElement as defineKiOption } from '../dist/components/ki-option.js';
import { defineCustomElement as defineKiProgress } from '../dist/components/ki-progress.js';
import { defineCustomElement as defineKiQr } from '../dist/components/ki-qr.js';
import { defineCustomElement as defineKiRadio } from '../dist/components/ki-radio.js';
import { defineCustomElement as defineKiRadioGroup } from '../dist/components/ki-radio-group.js';
import { defineCustomElement as defineKiScroller } from '../dist/components/ki-scroller.js';
import { defineCustomElement as defineKiSelect } from '../dist/components/ki-select.js';
import { defineCustomElement as defineKiStatus } from '../dist/components/ki-status.js';
import { defineCustomElement as defineKiSwitch } from '../dist/components/ki-switch.js';
import { defineCustomElement as defineKiTab } from '../dist/components/ki-tab.js';
import { defineCustomElement as defineKiTabPanel } from '../dist/components/ki-tab-panel.js';
import { defineCustomElement as defineKiTabs } from '../dist/components/ki-tabs.js';
import { defineCustomElement as defineKiTextarea } from '../dist/components/ki-textarea.js';
import { defineCustomElement as defineKiTooltip } from '../dist/components/ki-tooltip.js';
import { defineCustomElement as defineKiVideo } from '../dist/components/ki-video.js';
import { expectAccessible } from './axe.js';

type PageName = 'landing' | 'playground';
type PageCleanup = () => void;
type PageInitializer = (root?: Document) => PageCleanup;
type ElementConstructor<T extends Element> = new () => T;

type KiProgressElement = HTMLElement & {
  max: number;
  value: number;
};

const PAGES_BASE_URL = new URL('https://kimen-dev.github.io/kimen/');
const PAGE_STYLE_ID = 'site-experience-page-styles';
const MATERIAL3_STYLESHEET_SELECTOR =
  '#material3-css, link[rel="stylesheet"][href*="tokens.material3.css"]';
const DEFAULT_VIEWPORT = { width: 1024, height: 900 } as const;

const browserCommands = commands as unknown as {
  ariaSnapshot: (selector: string) => Promise<string>;
  emulateReducedMotion: (value: 'reduce' | 'no-preference' | null) => Promise<void>;
};

const defineSiteElements: readonly (() => void)[] = [
  defineKiAlert,
  defineKiAvatar,
  defineKiAvatarGroup,
  defineKiBadge,
  defineKiButton,
  defineKiCard,
  defineKiCheckbox,
  defineKiDialog,
  defineKiDivider,
  defineKiIconButton,
  defineKiIndicator,
  defineKiInput,
  defineKiList,
  defineKiListItem,
  defineKiOption,
  defineKiProgress,
  defineKiQr,
  defineKiRadio,
  defineKiRadioGroup,
  defineKiScroller,
  defineKiSelect,
  defineKiStatus,
  defineKiSwitch,
  defineKiTab,
  defineKiTabPanel,
  defineKiTabs,
  defineKiTextarea,
  defineKiTooltip,
  defineKiVideo,
];

const pageSources: Record<PageName, { css: string; html: string; initialize: PageInitializer }> = {
  landing: {
    css: landingCss,
    html: landingHtml,
    initialize: initializeLanding as PageInitializer,
  },
  playground: {
    css: `${landingCss}\n${playgroundCss}`,
    html: playgroundHtml,
    initialize: initializePlayground as PageInitializer,
  },
};

let disposePage: PageCleanup | undefined;

beforeAll(() => {
  for (const define of defineSiteElements) {
    define();
  }
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

function installPageMarkup(pageName: PageName): void {
  const source = pageSources[pageName];
  const parsed = parsedPage(source.html);
  const style = document.createElement('style');
  style.id = PAGE_STYLE_ID;
  style.textContent = `${tokensCss}\n${source.css}`;
  document.head.append(style);

  document.documentElement.lang = parsed.documentElement.lang || 'en';
  const colorScheme = parsed.documentElement.dataset.kiColorScheme;
  if (colorScheme) {
    document.documentElement.dataset.kiColorScheme = colorScheme;
  }
  document.body.innerHTML = parsed.body.innerHTML;
}

async function mountPage(pageName: PageName, javaScript = true): Promise<void> {
  installPageMarkup(pageName);
  if (javaScript) {
    disposePage = pageSources[pageName].initialize(document);
    expect(disposePage, `${pageName} initializer must return its listener cleanup`).toBeTypeOf(
      'function',
    );
  }
  await settleInitialLayout();
}

async function resetExperience(): Promise<void> {
  disposePage?.();
  disposePage = undefined;
  document.body.replaceChildren();
  document.getElementById(PAGE_STYLE_ID)?.remove();
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

describe('Kimen public site experience in a real browser', () => {
  it.each([
    ['Explore the components', '/kimen/docs/components/alert/'],
    ['Open the playground', '/kimen/playground/'],
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

    disposePage?.();
    disposePage = undefined;
    document.body.replaceChildren();
    document.getElementById(PAGE_STYLE_ID)?.remove();
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
    await expectAccessible(document.body);
  });

  it('S5 keeps semantic structure and canonical navigation without client JavaScript', async () => {
    await mountPage('landing', false);

    expect(document.querySelector('header')).toBeInstanceOf(HTMLElement);
    expect(document.querySelector('nav')).toBeInstanceOf(HTMLElement);
    expect(document.querySelector('main')).toBeInstanceOf(HTMLElement);
    expect(document.querySelector('footer')).toBeInstanceOf(HTMLElement);
    expect(canonicalDestination(linkNamed('Components'))).toBe('/kimen/docs/components/alert/');
    expect(canonicalDestination(linkNamed('Playground'))).toBe('/kimen/playground/');
    expect(canonicalDestination(linkNamed('GitHub'))).toBe('https://github.com/kimen-dev/kimen');
    await expectAccessible(document.body);
  });

  it('S6 disables automatic motion without hiding landing content', async () => {
    await browserCommands.emulateReducedMotion('reduce');
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

    const main = requireElement<HTMLElement>('#main', HTMLElement);
    const hero = requireElement<HTMLElement>('.hero', HTMLElement);
    const title = requireElement<HTMLElement>('#hero-title', HTMLElement);
    const mainRect = main.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();
    const titleStyle = getComputedStyle(title);

    expect(mainRect.x).toBeCloseTo(112, 0);
    expect(mainRect.width).toBeCloseTo(1216, 0);
    expect(heroRect.x).toBeCloseTo(160, 0);
    expect(heroRect.width).toBeCloseTo(1120, 0);
    expect(getComputedStyle(hero).paddingBlockStart).toBe('120px');
    expect(getComputedStyle(hero).paddingBlockEnd).toBe('72px');
    expect(titleStyle.fontSize).toBe('74px');
    expect(titleStyle.fontWeight).toBe('800');
    expect(titleStyle.lineHeight).toBe('77.7px');
    expect(titleStyle.color).toBe('rgba(0, 0, 0, 0)');
    expect(titleStyle.backgroundImage).not.toBe('none');

    expect(document.querySelectorAll('.project-stats > div')).toHaveLength(6);
    expect(document.querySelectorAll('.contract-artifact')).toHaveLength(4);
    expect(document.querySelectorAll('.comparison-wrap tbody > tr')).toHaveLength(7);
    expect(document.querySelectorAll('.quality-grid > article')).toHaveLength(6);
    expect(document.querySelectorAll('.roadmap > li')).toHaveLength(6);

    expect(
      [
        'hero-title',
        'components-title',
        'theme-title',
        'agents-title',
        'comparison-title',
        'quality-title',
        'catalog-title',
        'roadmap-title',
      ].map((id) => requireElement<HTMLElement>(`#${id}`, HTMLElement).textContent.trim()),
    ).toEqual([
      'The component foundation built for generative UI.',
      'Every component, live. Not screenshots.',
      'This page runs on @kimen/tokens. Flip it.',
      'Legible to agents, by contract.',
      'What only a GenUI-first library does.',
      'Done means gates exit 0.',
      'The ki-* catalog.',
      'Honest, gated, in the open.',
    ]);
  });

  it('keeps the desktop playground geometry and ten-token inspector of the approved design', async () => {
    await browserCommands.emulateReducedMotion('reduce');
    await page.viewport(1440, 1000);
    await mountPage('playground');

    const main = requireElement<HTMLElement>('.playground-main', HTMLElement);
    const workspace = requireElement<HTMLElement>('.playground-workspace', HTMLElement);
    const canvas = requireElement<HTMLElement>('.playground-canvas', HTMLElement);
    const inspector = requireElement<HTMLElement>('.token-inspector', HTMLElement);
    const mainRect = main.getBoundingClientRect();
    const workspaceRect = workspace.getBoundingClientRect();
    const canvasRect = canvas.getBoundingClientRect();
    const inspectorRect = inspector.getBoundingClientRect();

    expect(requireElement('#playground-title', HTMLElement).textContent.trim()).toBe(
      'Theme playground',
    );
    expect(mainRect.x).toBeCloseTo(32, 0);
    expect(mainRect.width).toBeCloseTo(1376, 0);
    expect(getComputedStyle(main).paddingBlockStart).toBe('30px');
    expect(getComputedStyle(main).paddingInlineStart).toBe('40px');
    expect(workspaceRect.width).toBeCloseTo(1296, 0);
    expect(getComputedStyle(workspace).columnGap).toBe('24px');
    expect(canvasRect.width).toBeCloseTo(972, 0);
    expect(inspectorRect.width).toBeCloseTo(300, 0);
    expect(document.querySelectorAll('.token-list > div')).toHaveLength(10);
  });

  it.each([
    ['landing', 320],
    ['landing', 1440],
    ['playground', 320],
    ['playground', 1440],
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
