// Bare-page contract (Art. III: the reproduction IS a failing test).
//
// Every other rendering surface in this repository paints the environment the
// components are supposed to bring themselves. The visual harness sets
// `background`, `color` and `font-family` on the wrapper that is the
// flat-tree ancestor of every gallery host (visual/harness.ts), so all 174
// committed baselines were captured under conditions the published package
// never provides; the packed-consumer smoke renders exactly one component,
// and it is one of the eleven that already declare a family.
//
// This suite deliberately provides NOTHING. It loads the token stylesheet a
// consumer loads and mounts the same galleries the visual gate uses inside a
// wrapper carrying no inherited typography, colour or surface at all. What
// survives here is what a stranger actually sees on their own page.
import pageContractCss from '@kimen/tokens/css/base?raw';
import tokensCss from '@kimen/tokens/css?raw';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { commands } from 'vitest/browser';

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
import { visualGalleries } from './visual/galleries';
import type { VisualComponent } from './visual/galleries';

const browserCommands = commands as unknown as {
  emulateReducedMotion: (value: 'no-preference' | 'reduce' | null) => Promise<void>;
};

const TOKENS_STYLE_ID = 'bare-page-tokens';
const SHADOW_RENDER_DEADLINE_MS = 1500;

const defineAll: readonly (() => void)[] = [
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

const components = Object.keys(visualGalleries) as VisualComponent[];

/**
 * The typeface a consumer is entitled to. Read from the shipped token
 * stylesheet rather than hardcoded, so a theme that renames its body family
 * still holds the contract.
 */
function expectedFontFamily(): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue('--ki-typography-family-body')
    .trim();
}

/** Computed `font-family` strings quote families inconsistently across engines. */
function normalizeFamily(value: string): string {
  return value
    .replaceAll(/["']/gu, '')
    .replaceAll(/\s*,\s*/gu, ',')
    .trim();
}

async function nextFrame(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

function shadowHosts(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>('*')].filter((element) =>
    element.tagName.toLowerCase().startsWith('ki-'),
  );
}

/** Every element inside any shadow root reachable from the wrapper. */
function shadowDescendants(wrapper: HTMLElement): HTMLElement[] {
  const found: HTMLElement[] = [];
  const walk = (root: ParentNode): void => {
    for (const host of shadowHosts(root)) {
      const shadow = host.shadowRoot;
      if (shadow === null) {
        continue;
      }
      found.push(...shadow.querySelectorAll<HTMLElement>('*'));
      walk(shadow);
    }
  };
  walk(wrapper);
  return found;
}

async function waitForShadowRender(wrapper: HTMLElement): Promise<void> {
  const hosts = shadowHosts(wrapper);
  await Promise.all(
    [...new Set(hosts.map((element) => element.tagName.toLowerCase()))].map((tag) =>
      customElements.whenDefined(tag),
    ),
  );
  const pending = (): boolean =>
    hosts.some(
      (element) =>
        element.shadowRoot !== null &&
        !element.shadowRoot.hasChildNodes() &&
        getComputedStyle(element).display !== 'none',
    );
  const deadline = Date.now() + SHADOW_RENDER_DEADLINE_MS;
  while (pending() && Date.now() < deadline) {
    await nextFrame();
  }
  await nextFrame();
}

/**
 * A consumer page: the token stylesheet and nothing else. No `font-family`,
 * no `color`, no `background` anywhere in the ancestor chain — exactly the
 * three declarations the visual harness supplies and the package does not.
 */
async function mountBare(component: VisualComponent): Promise<HTMLElement> {
  document.body.replaceChildren();
  document.body.removeAttribute('style');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
  if (!document.getElementById(TOKENS_STYLE_ID)) {
    const style = document.createElement('style');
    style.id = TOKENS_STYLE_ID;
    style.textContent = tokensCss;
    document.head.append(style);
  }
  const gallery = visualGalleries[component];
  const wrapper = document.createElement('div');
  wrapper.innerHTML = gallery.html;
  document.body.append(wrapper);
  await waitForShadowRender(wrapper);
  await gallery.prepare?.(wrapper);
  await nextFrame();
  return wrapper;
}

beforeAll(async () => {
  for (const define of defineAll) {
    define();
  }
  await browserCommands.emulateReducedMotion('reduce');
});

afterAll(async () => {
  await browserCommands.emulateReducedMotion('no-preference');
});

describe('bare-page typography contract', () => {
  it.each(components)('%s resolves the token typeface on its own host', async (component) => {
    const wrapper = await mountBare(component);
    const expected = normalizeFamily(expectedFontFamily());
    expect(expected, 'the token stylesheet must publish a body family').not.toBe('');

    const offenders = shadowHosts(wrapper)
      .filter((host) => normalizeFamily(getComputedStyle(host).fontFamily) !== expected)
      .map((host) => `${host.tagName.toLowerCase()}: ${getComputedStyle(host).fontFamily}`);

    expect(
      [...new Set(offenders)],
      `${component} inherits the user agent typeface on a bare page; it must declare font-family on :host from a --ki-* token`,
    ).toEqual([]);
  });

  // Slotted and shadow text inherits through the flat tree, so :host covers
  // it — but the user agent stylesheet sets `font` on native form controls
  // and buttons, and that beats inheritance. Those need an explicit reset.
  it.each(
    components,
  )('%s resolves the token typeface on its native controls', async (component) => {
    const wrapper = await mountBare(component);
    const expected = normalizeFamily(expectedFontFamily());

    const offenders = shadowDescendants(wrapper)
      .filter((element) => ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName))
      // Non-rendered proxies carry no glyphs, so their family can never reach
      // a reader: the opacity:0 inputs behind a painted track, and the
      // display:none validity donor ki-select keeps for constraint validation.
      .filter((element) => element.checkVisibility() && getComputedStyle(element).opacity !== '0')
      .filter((element) => normalizeFamily(getComputedStyle(element).fontFamily) !== expected)
      .map(
        (element) => `${element.tagName.toLowerCase()}: ${getComputedStyle(element).fontFamily}`,
      );

    expect(
      [...new Set(offenders)],
      `${component} renders a native control in the user agent typeface; it needs an explicit font reset`,
    ).toEqual([]);
  });
});

describe('page contract', () => {
  const PAGE_CONTRACT_STYLE_ID = 'bare-page-contract';

  function loadPageContract(): void {
    if (document.getElementById(PAGE_CONTRACT_STYLE_ID)) {
      return;
    }
    const style = document.createElement('style');
    style.id = PAGE_CONTRACT_STYLE_ID;
    style.textContent = pageContractCss;
    document.head.append(style);
  }

  afterAll(() => {
    document.getElementById(PAGE_CONTRACT_STYLE_ID)?.remove();
    document.documentElement.removeAttribute('data-ki-color-scheme');
  });

  // Without this the token sheet still flips to its dark values on
  // prefers-color-scheme: dark, but the user agent keeps painting a light
  // canvas, light scrollbars and light autofill — the founder's black alert on
  // a white Storybook page, and an ki-input label that vanishes entirely.
  it('opts the user agent into the same scheme the tokens follow', async () => {
    await mountBare('ki-card');
    expect(
      getComputedStyle(document.documentElement).colorScheme,
      'the token sheet alone cannot declare color-scheme; that is what @kimen/tokens/css/base is for',
    ).toBe('normal');

    loadPageContract();
    expect(getComputedStyle(document.documentElement).colorScheme).toBe('light dark');
  });

  it('lets a single-scheme page pin the user agent alongside the tokens', async () => {
    await mountBare('ki-card');
    loadPageContract();

    for (const scheme of ['light', 'dark'] as const) {
      document.documentElement.setAttribute('data-ki-color-scheme', scheme);
      expect(
        getComputedStyle(document.documentElement).colorScheme,
        `data-ki-color-scheme="${scheme}" must pin the user agent too, not just the tokens`,
      ).toBe(scheme);
    }
    document.documentElement.removeAttribute('data-ki-color-scheme');
  });

  it('paints the page from tokens instead of leaving the user agent canvas', async () => {
    await mountBare('ki-card');
    loadPageContract();
    const root = getComputedStyle(document.documentElement);

    expect(root.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(root.backgroundColor).not.toBe(root.color);
    expect(normalizeFamily(root.fontFamily)).toBe(normalizeFamily(expectedFontFamily()));
  });
});

describe('bare-page state-delta contract', () => {
  // The existing browser assertion for this component is
  // `Math.abs(thumbRect.left - trackRect.left) <= 8`, which is satisfied by a
  // thumb that never moves. A switch whose states are visually identical is
  // not a switch.
  it('ki-switch moves its thumb far enough to read as a state change', async () => {
    const wrapper = await mountBare('ki-switch');
    const host = wrapper.querySelector('ki-switch');
    expect(host).not.toBeNull();
    const thumb = host?.shadowRoot?.querySelector('[part="thumb"]');
    const track = host?.shadowRoot?.querySelector('[part="track"]');
    expect(thumb, 'ki-switch must expose a thumb part').not.toBeNull();
    expect(track, 'ki-switch must expose a track part').not.toBeNull();

    (host as HTMLElement & { checked: boolean }).checked = false;
    await nextFrame();
    const off = (thumb as HTMLElement).getBoundingClientRect();
    const trackBox = (track as HTMLElement).getBoundingClientRect();

    (host as HTMLElement & { checked: boolean }).checked = true;
    await nextFrame();
    await nextFrame();
    const on = (thumb as HTMLElement).getBoundingClientRect();

    const travel = on.left - off.left;
    // Floor taken from the master rather than invented: the MarsUI Toggle
    // (page Toggle 10102:4096, frame Toggle 10023:1125, size md) travels its
    // 22px Pointer by 14px, a ratio of 0.63. Anything at or above 0.6 of the
    // thumb's own width reads as an unmistakable change of side; the 4px the
    // component shipped did not, and the previous assertion
    // (`Math.abs(thumbRect.left - trackRect.left) <= 8`) was satisfied by a
    // thumb that never moved at all.
    const MASTER_TRAVEL_RATIO = 0.6;
    expect(
      travel,
      `ki-switch thumb travels ${String(travel)}px between states; the MarsUI Toggle travels at least ${String(MASTER_TRAVEL_RATIO)} of the thumb's own width`,
    ).toBeGreaterThanOrEqual(off.width * MASTER_TRAVEL_RATIO);

    // A thumb wider than the track's inner box overflows its own control.
    expect(
      off.width,
      'ki-switch thumb must fit inside the track it travels in',
    ).toBeLessThanOrEqual(trackBox.width - off.width);
  });
});
