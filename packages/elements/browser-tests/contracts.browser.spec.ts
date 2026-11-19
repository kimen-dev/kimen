// Cross-cutting contracts: what EVERY component owes a user, in every theme
// and scheme, asserted once over the whole published set instead of being
// re-written (or forgotten) per component.
//
// Each contract mounts the same state galleries the visual gate uses, from the
// BUILT elements (Art. III), on a page that loads exactly what a consumer
// loads: the token stylesheets and the page contract. Nothing here knows a
// component's internals or its token names — it measures what the browser
// computed, so the suite survives a redesign and a token refactor unchanged.

import pageContractCss from '@kimen/tokens/css/base?raw';
import material3Css from '@kimen/tokens/css/material3?raw';
import onmarsCss from '@kimen/tokens/css?raw';
import axe from 'axe-core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { commands, page } from 'vitest/browser';

import { componentTags, defineAllComponents } from './all-components';
import { expectAccessible, userAgentControls } from './axe';
import {
  applyTextSpacing,
  clippedText,
  fingerprint,
  fingerprintDifferences,
  textMeasurements,
} from './contracts';
import type { VisualComponent } from './visual/galleries';
import { fixtureFor } from './visual/galleries';

type Scheme = 'dark' | 'light';
type Theme = 'material3' | 'onmars';
type Combination = readonly [Theme, Scheme];

const combinations: readonly Combination[] = [
  ['onmars', 'light'],
  ['onmars', 'dark'],
  ['material3', 'light'],
  ['material3', 'dark'],
];
const [defaultCombination, ...otherCombinations] = combinations as [Combination, ...Combination[]];
const nameOf = ([theme, scheme]: Combination): string => `${theme}/${scheme}`;

const STYLESHEETS: readonly (readonly [string, string])[] = [
  ['contracts-onmars', onmarsCss],
  ['contracts-material3', material3Css],
  ['contracts-page', pageContractCss],
];
const SHADOW_RENDER_DEADLINE_MS = 1500;
const DEFAULT_VIEWPORT = { height: 896, width: 414 };
const REFLOW_VIEWPORT = { height: 640, width: 320 };

const browserCommands = commands as unknown as {
  emulateReducedMotion: (value: 'no-preference' | 'reduce' | null) => Promise<void>;
};

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

function applyCombination([theme, scheme]: Combination): void {
  const root = document.documentElement;
  if (theme === 'onmars') {
    root.removeAttribute('data-ki-theme');
  } else {
    root.setAttribute('data-ki-theme', theme);
  }
  root.setAttribute('data-ki-color-scheme', scheme);
}

async function waitForShadowRender(wrapper: HTMLElement): Promise<void> {
  const hosts = [...wrapper.querySelectorAll<HTMLElement>('*')].filter((element) =>
    element.localName.startsWith('ki-'),
  );
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
  while (pending() && Date.now() < deadline) {
    await nextFrame();
  }
  await nextFrame();
  await nextFrame();
}

/** One component's state gallery on a consumer page, popups opened. */
async function mountGallery(component: VisualComponent, fluid = false): Promise<HTMLElement> {
  document.body.replaceChildren();
  const gallery = fixtureFor(component).gallery;
  const wrapper = document.createElement('section');
  wrapper.setAttribute('aria-label', component);
  wrapper.style.cssText = [
    'display:flex',
    'flex-direction:column',
    'gap:16px',
    'box-sizing:border-box',
    'padding:16px',
    fluid ? 'max-inline-size:100%' : `inline-size:${String(gallery.width ?? 640)}px`,
    ...(gallery.minHeight === undefined ? [] : [`min-block-size:${String(gallery.minHeight)}px`]),
  ].join(';');
  wrapper.innerHTML = gallery.html;
  if (wrapper.querySelector(component) === null) {
    throw new Error(`${component}/gallery.ts must mount <${component}> for the shared checks`);
  }
  document.body.append(wrapper);
  await waitForShadowRender(wrapper);
  await gallery.prepare?.(wrapper);
  await nextFrame();
  await nextFrame();
  return wrapper;
}

beforeAll(async () => {
  defineAllComponents();
  for (const [id, css] of STYLESHEETS) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.append(style);
  }
  document.body.style.margin = '0';
  await browserCommands.emulateReducedMotion('reduce');
});

afterAll(async () => {
  for (const [id] of STYLESHEETS) {
    document.getElementById(id)?.remove();
  }
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
  document.body.replaceChildren();
  document.body.removeAttribute('style');
  await browserCommands.emulateReducedMotion('no-preference');
});

describe.each(combinations)('contracts in %s / %s', (...combination) => {
  it.each(componentTags)('%s passes the automated accessibility audit', async (component) => {
    applyCombination(combination);
    const wrapper = await mountGallery(component);

    // The gallery's own native buttons are the user agent's paint, not the
    // component's (userAgentControls): the audit covers what Kimen paints.
    await expectAccessible({ include: [wrapper], exclude: userAgentControls(wrapper) });
    // WCAG 2.5.8 (AA since 2.2): axe ships this rule disabled by default.
    const targets = await axe.run(wrapper, { runOnly: { type: 'rule', values: ['target-size'] } });
    expect(
      targets.violations.flatMap((violation) => violation.nodes.map((node) => node.html)),
    ).toEqual([]);
  });

  it.each(componentTags)('%s keeps every active text run at AA contrast', async (component) => {
    applyCombination(combination);
    const wrapper = await mountGallery(component);

    const failing = textMeasurements(wrapper, { exclude: userAgentControls(wrapper) })
      .filter((measurement) => measurement.ratio < measurement.required - 0.005)
      .map(
        (measurement) =>
          `${measurement.kind} "${measurement.text}" in ${measurement.where}: ` +
          `${measurement.ratio.toFixed(2)}:1 < ${String(measurement.required)}:1`,
      );
    expect(failing).toEqual([]);
  });
});

describe('contracts when the theme or scheme changes at runtime', () => {
  it.each(componentTags)(
    '%s restyles live exactly like a fresh mount, with nothing left stale',
    async (component) => {
      const fresh = new Map<string, string[]>();
      for (const combination of combinations) {
        applyCombination(combination);
        fresh.set(nameOf(combination), fingerprint(await mountGallery(component)));
      }

      applyCombination(defaultCombination);
      const wrapper = await mountGallery(component);
      for (const combination of [...otherCombinations, defaultCombination]) {
        applyCombination(combination);
        await nextFrame();
        await nextFrame();
        expect(
          fingerprintDifferences(fresh.get(nameOf(combination)) ?? [], fingerprint(wrapper)),
          `after switching live to ${nameOf(combination)}`,
        ).toEqual([]);
      }
    },
  );
});

describe('contracts under user-controlled layout', () => {
  beforeAll(() => {
    applyCombination(defaultCombination);
  });

  afterAll(async () => {
    await page.viewport(DEFAULT_VIEWPORT.width, DEFAULT_VIEWPORT.height);
  });

  it.each(componentTags)('%s reflows at 320px with no page-level scroll', async (component) => {
    await page.viewport(REFLOW_VIEWPORT.width, REFLOW_VIEWPORT.height);
    await mountGallery(component, true);

    // WCAG 1.4.10: content fits a 320 CSS px viewport without two-dimensional
    // scrolling.
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
      document.documentElement.clientWidth,
    );
  });

  it.each(componentTags)('%s loses no text to the 1.4.12 spacing overrides', async (component) => {
    await page.viewport(DEFAULT_VIEWPORT.width, DEFAULT_VIEWPORT.height);
    const wrapper = await mountGallery(component);
    const before = clippedText(wrapper);

    const restore = applyTextSpacing(wrapper);
    await nextFrame();
    await nextFrame();
    const introduced = clippedText(wrapper).filter((box) => !before.includes(box));
    restore();

    expect(introduced).toEqual([]);
  });
});
