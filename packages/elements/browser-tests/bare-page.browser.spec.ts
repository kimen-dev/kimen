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
import { commands, userEvent } from 'vitest/browser';

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

const TEXT_MIN_RATIO = 4.5;
const browserCommands = commands as unknown as {
  emulateColorScheme: (scheme: 'dark' | 'light' | null) => Promise<void>;
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

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseRgb(value: string): Rgba {
  const parts = value.match(/[\d.]+/gu);
  if (parts === null || parts.length < 3) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  return {
    r: Number(parts[0]),
    g: Number(parts[1]),
    b: Number(parts[2]),
    a: parts[3] === undefined ? 1 : Number(parts[3]),
  };
}

function over(fg: Rgba, bg: Rgba): Rgba {
  const a = fg.a + bg.a * (1 - fg.a);
  if (a === 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  const mix = (f: number, b: number): number => (f * fg.a + b * bg.a * (1 - fg.a)) / a;
  return { r: mix(fg.r, bg.r), g: mix(fg.g, bg.g), b: mix(fg.b, bg.b), a };
}

function luminance({ r, g, b }: Rgba): number {
  const channel = (value: number): number => {
    const n = value / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function ratio(fg: Rgba, bg: Rgba): number {
  const lighter = Math.max(luminance(fg), luminance(bg));
  const darker = Math.min(luminance(fg), luminance(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * The colour actually behind an element, composited up the FLAT tree — through
 * shadow boundaries via `getRootNode().host`, not just `parentElement`, because
 * slotted content's painted backdrop is the shadow element containing the
 * `<slot>`. Stops at the first opaque layer; falls back to the canvas.
 *
 * KNOWN LIMITATION, stated rather than discovered later: only
 * `backgroundColor` is read, so a surface painted purely with a
 * `background-image` gradient composites straight through. It does not bite
 * today — ki-button, the one component shipping MarsUI's gradient material,
 * paints its fill with `background-color` and uses `background-image` only for
 * an overlay that defaults to `none`, so the label measures against the real
 * brand fill. It is exactly the case axe reports as `bgGradient` incomplete,
 * and if a component ever paints its whole surface from a gradient this walk
 * must learn to sample it.
 */
function flatParent(node: Element): Element | null {
  // Slotted content is painted over the shadow element containing the <slot>,
  // which `parentElement` never reaches — it returns the light-DOM parent.
  const slot = (node as HTMLElement).assignedSlot;
  if (slot !== null) {
    return slot;
  }
  if (node.parentElement !== null) {
    return node.parentElement;
  }
  const root = node.getRootNode();
  return root instanceof ShadowRoot ? root.host : null;
}

function backdropOf(element: Element): Rgba {
  let composited: Rgba = { r: 0, g: 0, b: 0, a: 0 };
  let node: Element | null = flatParent(element);
  while (node !== null) {
    composited = over(composited, parseRgb(getComputedStyle(node).backgroundColor));
    if (composited.a >= 1) {
      return composited;
    }
    node = flatParent(node);
  }
  // Nothing opaque anywhere: the user agent canvas. A bare page that has not
  // opted into the page contract leaves this white in both schemes, which is
  // precisely the mismatch this suite exists to measure.
  return { r: 255, g: 255, b: 255, a: 1 };
}

/**
 * Inactive text is exempt (WCAG 1.4.3), the same exemption the token contrast
 * sweep grants its `-disabled-` cells. Walked up the FLAT tree so a disabled
 * host reaches the row its shadow renders.
 */
function isInactive(element: Element): boolean {
  let node: Element | null = element;
  while (node !== null) {
    if (node.hasAttribute('disabled') || node.getAttribute('aria-disabled') === 'true') {
      return true;
    }
    node = flatParent(node);
  }
  return false;
}

/** Elements rendering their own visible text, light DOM and shadow alike. */
function textBearing(wrapper: HTMLElement): HTMLElement[] {
  const candidates = [...wrapper.querySelectorAll<HTMLElement>('*'), ...shadowDescendants(wrapper)];
  return candidates.filter((element) => {
    const ownText = [...element.childNodes]
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent ?? '')
      .join('')
      .trim();
    if (ownText === '' || isInactive(element)) {
      return false;
    }
    // The bare `checkVisibility()` ignores `visibility` and `opacity`, so a
    // tooltip bubble parked at `visibility: hidden` — which is how the rest
    // state is captured — reads as painted and measures its own unset surface.
    return element.checkVisibility({
      contentVisibilityAuto: true,
      opacityProperty: true,
      visibilityProperty: true,
    });
  });
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

/**
 * Legibility of every rendered string, measured on the page the library
 * actually promises: token stylesheet plus the opt-in page contract, in both
 * schemes. Text colour and the backdrop behind it are read from the live flat
 * tree — through shadow boundaries — and composited, so a component that paints
 * its own surface is measured against THAT surface and not against the page.
 *
 * Measured rather than inferred from CSS. The static rule the audit proposed —
 * "no rule declares `background` without a sibling `color`" — flags 29 rules on
 * this HEAD, and almost all are decorative layers that correctly set no colour
 * (scrollbar thumbs, the dialog backdrop, status dots, switch tracks), two of
 * which resolve to a transparent token anyway. Reading pixels has no such
 * false positives.
 *
 * NOTE, and it is a real limitation: WITHOUT the page contract in the dark
 * scheme this measures 14 of 29 components rendering white-on-white — the token
 * sheet flips to its dark values, every component correctly paints its
 * dark-scheme foreground, and the user agent keeps a white canvas because
 * `color-scheme` is still `normal`. That is not 14 broken components; it is the
 * documented cost of leaving the page contract opt-in, and whether to keep it
 * optional is a founder decision, not something this suite should decide by
 * asserting a contract the package does not make.
 */
describe.each(['light', 'dark'] as const)('bare-page legibility [%s]', (scheme) => {
  const CONTRACT_STYLE_ID = `legibility-contract-${scheme}`;

  beforeAll(async () => {
    await browserCommands.emulateColorScheme(scheme);
    const style = document.createElement('style');
    style.id = CONTRACT_STYLE_ID;
    style.textContent = pageContractCss;
    document.head.append(style);
  });

  afterAll(async () => {
    document.getElementById(CONTRACT_STYLE_ID)?.remove();
    await browserCommands.emulateColorScheme(null);
  });

  it.each(components)('%s renders every string legibly', async (component) => {
    const wrapper = await mountBare(component);
    const illegible = textBearing(wrapper)
      .map((element) => {
        const fg = parseRgb(getComputedStyle(element).color);
        const bg = backdropOf(element);
        return {
          ratio: ratio(over(fg, bg), bg),
          text: element.textContent.trim().slice(0, 30),
          part: element.getAttribute('part') ?? element.localName,
        };
      })
      // Disabled text is exempt (WCAG 1.4.3), the same exemption the token
      // contrast sweep grants.
      .filter((entry) => entry.ratio < TEXT_MIN_RATIO);

    expect(
      illegible,
      `${component} renders text below ${String(TEXT_MIN_RATIO)}:1 against the surface behind it: ${illegible
        .map((entry) => `${entry.part} "${entry.text}" at ${entry.ratio.toFixed(2)}:1`)
        .join('; ')}`,
    ).toEqual([]);
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

  /**
   * `disabled` on the GROUP is written to each member's shadow `<input>`, never
   * to the `ki-radio` host — and every disabled visual in ki-radio.css keys on
   * `:host([disabled])`. So the flag reaches the accessibility tree and the
   * pointer handlers, and reaches nothing a sighted user can see.
   *
   * The existing S19 spec is not wrong, it is simply about something else: it
   * asserts the group ignores selection and exposes `aria-disabled="true"`.
   * Both hold. Neither is appearance.
   */
  it('ki-radio-group renders a disabled group differently from an enabled one', async () => {
    // NOT the gallery fixture: its two groups carry different `value`s, so
    // their signatures differ because a different member is checked. That
    // passes while measuring nothing. These two are identical but for the flag.
    const wrapper = await mountBare('ki-radio-group');
    wrapper.innerHTML = ['', ' disabled']
      .map(
        (flag) =>
          `<ki-radio-group label="Plan"${flag} value="pro"><ki-radio value="basic">Basic</ki-radio><ki-radio value="pro">Pro</ki-radio></ki-radio-group>`,
      )
      .join('');
    await waitForShadowRender(wrapper);
    await nextFrame();
    const groups = [...wrapper.querySelectorAll('ki-radio-group')];
    expect(groups, 'the fixture must mount an enabled and a disabled group').toHaveLength(2);

    const signature = (group: Element): string =>
      [...group.querySelectorAll('ki-radio')]
        .map((radio) => {
          const control = radio.shadowRoot?.querySelector('[part="control"]');
          const host = getComputedStyle(radio);
          const box = control === null || control === undefined ? null : getComputedStyle(control);
          return [
            box?.backgroundColor,
            box?.borderColor,
            box?.opacity,
            host.color,
            host.cursor,
          ].join('|');
        })
        .join('||');

    const [enabled, disabled] = groups;
    expect(
      signature(disabled as Element),
      'a disabled group is indistinguishable from an enabled one: the flag reaches the shadow input and the ARIA tree, but every disabled visual keys on :host([disabled]) and the host never gets it',
    ).not.toBe(signature(enabled as Element));
  });

  /**
   * A pressed appearance that only exists as the WITHDRAWAL of a hover
   * appearance renders nothing at all to a keyboard user, because there was no
   * hover to withdraw. `:active` matches while Space is held on a focused
   * control in every engine, so this needs no pointer emulation and no device.
   *
   * Measured directly before this suite existed: holding Space on a focused
   * ki-button left background, background-image, box-shadow and colour all
   * byte-identical to the focused resting state.
   */
  const PRESSABLE = [
    'ki-button',
    'ki-icon-button',
    'ki-checkbox',
    'ki-radio',
    'ki-switch',
  ] as const;

  it.each(PRESSABLE)('%s changes appearance while held with the keyboard', async (component) => {
    const wrapper = await mountBare(component);
    const host = wrapper.querySelector<HTMLElement>(component);
    expect(host, `${component} must mount`).not.toBeNull();
    if (host === null) {
      return;
    }

    const painted = (): string => {
      const inner =
        host.shadowRoot?.querySelector<HTMLElement>('[part="control"], [part="track"], button') ??
        host;
      const style = getComputedStyle(inner);
      return [style.backgroundColor, style.backgroundImage, style.boxShadow, style.color].join('|');
    };

    // Focus the inner control, not the host: ki-radio ships inside a
    // ki-radio-group whose roster sets `tabIndex = -1` on every input that is
    // not the group's single tab stop, so focusing the host lands nowhere and
    // the key press never reaches anything.
    const focusable =
      host.shadowRoot?.querySelector<HTMLElement>('input, button, [tabindex]') ?? host;
    focusable.focus();
    await nextFrame();
    const focused = painted();

    // `{ }>}` holds the key down; the matching `{/ }` releases it.
    await userEvent.keyboard('{ >}');
    await nextFrame();
    await nextFrame();
    const held = painted();
    await userEvent.keyboard('{/ }');

    expect(
      held,
      `${component} looks identical while a keyboard user is holding it down; a pressed appearance built as the withdrawal of a hover appearance shows nothing to anyone who never hovered`,
    ).not.toBe(focused);
  });
});
