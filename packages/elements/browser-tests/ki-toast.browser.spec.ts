import material3Css from '@kimen/tokens/css/material3?raw';
// @spec:049-ki-toast
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
//
// Time is the subject of half of these scenarios. They run on Playwright's
// page clock, the suite's one fake clock (ki-tooltip and ki-select install it
// too, and it cannot be installed twice): paused, so "5 seconds pass" is
// deterministic and instant, with animation frames advanced by the same
// clock. Mounting and rendering let a few frames of that time pass, so
// assertions leave room on both sides of each boundary.
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { defineCustomElement as defineKiAlert } from '../dist/components/ki-alert.js';
import { defineCustomElement as defineKiButton } from '../dist/components/ki-button.js';
import { defineCustomElement } from '../dist/components/ki-toast.js';
import { expectAccessible, parkPointer } from './axe';
import { repaintedUnderForcedDark } from './color-scheme';
import { resolvedShadowToken } from './resolved-token';

type KiToastElement = HTMLElement & {
  dismissed: boolean;
  dismissible: boolean;
  dismissLabel: string;
  duration?: number;
  heading?: string;
  queued: boolean;
  tone: string;
};

interface ToastOptions {
  action?: string;
  actionElement?: 'button' | 'ki-button';
  dismissible?: boolean;
  dismissLabel?: string;
  duration?: number | string;
  heading?: string;
  message?: string;
  tone?: string;
}

const STYLE_ID = 'ki-toast-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-toast-browser-material3-token-style';
const tones = ['neutral', 'info', 'success', 'warning', 'danger'] as const;
const DEFAULT_VIEWPORT = { height: 896, width: 414 };
const TOUCH_TARGET_MIN = 44;

const browserCommands = commands as unknown as {
  fastForwardClock: (milliseconds: number) => Promise<void>;
  installClock: () => Promise<void>;
  pauseClock: () => Promise<void>;
  resumeClock: () => Promise<void>;
  accessibilityTree: () => Promise<
    { role: string; name: string; live: unknown; text: string }[] | null
  >;
  emulateForcedColors: (forcedColors: 'active' | 'none' | null) => Promise<boolean | undefined>;
  emulateReducedMotion: (value: 'no-preference' | 'reduce' | null) => Promise<void>;
  emulateReducedTransparency: (transparency: 'reduce' | 'no-preference' | null) => Promise<boolean>;
};

// When an earlier spec has installed the page clock, the runner arms each
// test's own timeout on that clock, so advancing it moves the timeout too:
// a test that skips 30 s of page time needs a timeout longer than that.
vi.setConfig({ testTimeout: 120_000 });

// The real accessibility tree comes over CDP, on Chromium alone (the engine
// the PR gate runs); elsewhere the command answers null.
const IS_CHROMIUM = navigator.userAgent.includes('Chrome/');

beforeAll(() => {
  defineCustomElement();
  defineKiButton();
});

afterEach(async () => {
  await releaseClock();
  restoreVisibility();
  cleanup();
  await page.viewport(DEFAULT_VIEWPORT.width, DEFAULT_VIEWPORT.height);
  // A pointer left where the next toast mounts would hold that toast's time.
  await parkPointer();
});

function ensureStyle(id: string, css: string): void {
  if (document.getElementById(id)) {
    return;
  }
  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  document.head.append(style);
}

function ensureTokens(): void {
  ensureStyle(STYLE_ID, tokensCss);
}

function cleanup(): void {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
  for (const name of [
    '--ki-toast-bg-image',
    '--ki-toast-backdrop-filter',
    '--ki-toast-heading-font-family',
  ]) {
    document.documentElement.style.removeProperty(name);
  }
}

let clockPaused = false;

/** One animation frame: real, or one frame of the paused page clock. */
async function nextFrame(): Promise<void> {
  if (clockPaused) {
    await browserCommands.fastForwardClock(20);
    return;
  }
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

/** Stencil renders on animation frames; a few of them settle a state change. */
async function settle(frames = 3): Promise<void> {
  for (let index = 0; index < frames; index += 1) {
    await nextFrame();
  }
}

/** Pause the page clock before the toast starts its time. */
async function useClock(): Promise<void> {
  try {
    await browserCommands.installClock();
  } catch {
    // Already installed in this page by an earlier spec: pausing is enough.
  }
  await browserCommands.pauseClock();
  clockPaused = true;
}

async function releaseClock(): Promise<void> {
  if (clockPaused) {
    clockPaused = false;
    await browserCommands.resumeClock();
  }
}

async function pass(ms: number): Promise<void> {
  await browserCommands.fastForwardClock(ms);
  await settle();
}

function buildToast(options: ToastOptions = {}): KiToastElement {
  const el = document.createElement('ki-toast') as KiToastElement;
  const attributes: [string, string | undefined][] = [
    ['tone', options.tone],
    ['heading', options.heading],
    ['duration', options.duration === undefined ? undefined : String(options.duration)],
    ['dismiss-label', options.dismissLabel],
  ];
  for (const [name, value] of attributes) {
    if (value !== undefined) {
      el.setAttribute(name, value);
    }
  }
  if (options.dismissible === false) {
    el.dismissible = false;
  }
  el.append(document.createTextNode(options.message ?? 'Draft saved'));
  if (options.action !== undefined) {
    const button = document.createElement(options.actionElement ?? 'button');
    if (button instanceof HTMLButtonElement) {
      button.type = 'button';
    } else {
      button.setAttribute('size', 'sm');
      button.setAttribute('variant', 'ghost');
    }
    button.slot = 'action';
    button.textContent = options.action;
    el.append(button);
  }
  return el;
}

async function rendered(el: Element): Promise<void> {
  for (let index = 0; index < 30 && !el.shadowRoot?.hasChildNodes(); index += 1) {
    await nextFrame();
  }
  await settle();
}

async function mountToast(
  options: ToastOptions = {},
  parent: ParentNode = document.body,
): Promise<KiToastElement> {
  ensureTokens();
  const el = buildToast(options);
  parent.append(el);
  await customElements.whenDefined('ki-toast');
  await rendered(el);
  return el;
}

function part(el: Element, name: string): HTMLElement {
  const node = el.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`);
  expect(node, `missing part ${name}`).toBeInstanceOf(HTMLElement);
  if (!node) {
    throw new Error(`ki-toast did not render part="${name}"`);
  }
  return node;
}

function maybePart(el: Element, name: string): HTMLElement | null {
  return el.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`) ?? null;
}

/** The native button inside the dismiss `ki-icon-button`. */
function dismissButton(el: Element): HTMLButtonElement {
  const button = part(el, 'dismiss').shadowRoot?.querySelector('button');
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error('the dismiss control holds no native button');
  }
  return button;
}

function liveWrapper(el: KiToastElement): HTMLElement {
  const node = el.shadowRoot?.querySelector<HTMLElement>('[role="status"], [role="alert"]');
  expect(node, 'missing live region').toBeInstanceOf(HTMLElement);
  if (!node) {
    throw new Error('ki-toast did not render its live region');
  }
  return node;
}

/** What the live region exposes: its text, slotted content included, minus aria-hidden. */
function exposedText(node: Node): string {
  if (node instanceof HTMLSlotElement) {
    return node.assignedNodes({ flatten: true }).map(exposedText).join(' ');
  }
  if (node instanceof Element && node.getAttribute('aria-hidden') === 'true') {
    return '';
  }
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? '';
  }
  return [...node.childNodes].map(exposedText).join(' ');
}

function liveText(el: KiToastElement): string {
  return exposedText(liveWrapper(el)).replace(/\s+/gu, ' ').trim();
}

/** Displayed: rendered with a box, the way a person would see it. */
function displayed(el: Element): boolean {
  return el.checkVisibility() && el.getBoundingClientRect().height > 0;
}

function box(el: Element): DOMRect {
  return el.getBoundingClientRect();
}

function recordDismissals(): { reason: unknown }[] {
  const seen: { reason: unknown }[] = [];
  document.addEventListener('ki-dismiss', (event) => {
    seen.push({ reason: (event as CustomEvent<{ reason?: unknown } | null>).detail?.reason });
  });
  return seen;
}

// The page goes to the background the way a browser reports it.
function setVisibility(state: 'hidden' | 'visible'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => state === 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
}

function restoreVisibility(): void {
  if (Object.getOwnPropertyDescriptor(document, 'visibilityState')) {
    Reflect.deleteProperty(document, 'visibilityState');
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  }
}

function canvasText(): string {
  const probe = document.createElement('span');
  probe.style.color = 'CanvasText';
  document.body.append(probe);
  const value = getComputedStyle(probe).color;
  probe.remove();
  return value;
}

/** The deepest element a pointer at (x, y) lands on, open shadow trees included. */
function hitAt(x: number, y: number): Element | null {
  let hit = document.elementFromPoint(x, y);
  while (hit?.shadowRoot) {
    const inner = hit.shadowRoot.elementFromPoint(x, y);
    if (inner === null || inner === hit) {
      return hit;
    }
    hit = inner;
  }
  return hit;
}

function flatParent(node: Element): Element | null {
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

/** The edges of the `side` square centred on `target` at which a pointer misses it. */
function missesAcross(target: Element, side: number): string[] {
  const rect = target.getBoundingClientRect();
  const [x, y] = [rect.left + rect.width / 2, rect.top + rect.height / 2];
  const half = side / 2 - 0.5;
  const edges: [string, number, number][] = [
    ['top', x, y - half],
    ['bottom', x, y + half],
    ['left', x - half, y],
    ['right', x + half, y],
  ];
  const reaches = (px: number, py: number): boolean => {
    for (let node = hitAt(px, py); node !== null; node = flatParent(node)) {
      if (node === target) {
        return true;
      }
    }
    return false;
  };
  return edges.filter(([, px, py]) => !reaches(px, py)).map(([edge]) => edge);
}

describe('ki-toast core behavior', () => {
  it('S1 lives its tone in the icon alone', async () => {
    const neutral = await mountToast({ heading: 'Changes saved' });
    const el = await mountToast({
      tone: 'success',
      heading: 'Changes saved',
      message: 'Workspace settings are up to date.',
    });

    expect(displayed(part(el, 'heading'))).toBe(true);
    expect(liveText(el)).toBe('Changes saved Workspace settings are up to date.');
    expect(getComputedStyle(part(el, 'icon')).color).not.toBe(
      getComputedStyle(part(neutral, 'icon')).color,
    );
    for (const name of ['toast', 'heading', 'message']) {
      const expected = getComputedStyle(part(neutral, name));
      const actual = getComputedStyle(part(el, name));
      expect(actual.backgroundColor, name).toBe(expected.backgroundColor);
      expect(actual.color, name).toBe(expected.color);
      expect(actual.borderTopColor, name).toBe(expected.borderTopColor);
    }
  });

  it('S2 is a flat raised surface with a hairline edge, no wider than 360px', async () => {
    await page.viewport(1280, 800);
    const el = await mountToast({ tone: 'info', message: 'Export ready' });
    const toast = part(el, 'toast');
    const surface = getComputedStyle(toast);

    expect(surface.paddingBlockStart).toBe('12px');
    expect(surface.paddingInlineStart).toBe('12px');
    expect(surface.borderTopLeftRadius).toBe('16px');
    expect(surface.borderTopStyle).toBe('solid');
    expect(surface.borderTopWidth).toBe('1px');
    // e4 as the theme defines it, so a theme's new elevation values hold.
    expect(surface.boxShadow).toBe(resolvedShadowToken(toast, '--ki-elevation-e4'));
    expect(surface.backdropFilter).toBe('none');
    expect(surface.backgroundImage).toBe('none');
    expect(surface.backgroundColor).toMatch(/^rgb\(/u);
    expect(box(el).width).toBeCloseTo(360, 0);
  });

  it('S3 leaves when its 4 seconds run out and reports the timeout', async () => {
    await useClock();
    const seen = recordDismissals();
    const el = await mountToast({ duration: 4000 });

    await pass(3700);
    expect(displayed(el)).toBe(true);
    await pass(400);

    expect(displayed(el)).toBe(false);
    expect(el.dismissed).toBe(true);
    expect(seen).toEqual([{ reason: 'timeout' }]);
  });

  it('S4 leaves after five seconds without a duration', async () => {
    await useClock();
    const el = await mountToast({ tone: 'info', message: 'Sync complete' });

    await pass(4700);
    expect(displayed(el)).toBe(true);
    await pass(400);

    expect(displayed(el)).toBe(false);
  });

  it.each([
    ['holding the action "Undo"', { action: 'Undo' }],
    ['in the danger tone', { tone: 'danger' }],
    ['with a duration of 0', { duration: 0 }],
    ['holding the action "Undo" with a duration of 4000', { action: 'Undo', duration: 4000 }],
    ['in the danger tone with a duration of 4000', { tone: 'danger', duration: 4000 }],
  ] satisfies [string, ToastOptions][])(
    'S5 never leaves on its own %s',
    async (_label, options) => {
      await useClock();
      const el = await mountToast({ message: 'Upload finished', ...options });

      // Six times the default, and well inside the 60 s after which the test
      // runner's own pending calls time out on the same page clock.
      await pass(30_000);

      expect(displayed(el)).toBe(true);
    },
  );

  it('S7 runs the remaining time again once the pointer has left', async () => {
    await useClock();
    const outside = document.createElement('button');
    outside.textContent = 'Elsewhere';
    document.body.append(outside);
    const el = await mountToast({ duration: 4000 });

    await pass(3000);
    await userEvent.hover(part(el, 'toast'));
    await pass(5000);
    expect(displayed(el)).toBe(true);
    await userEvent.hover(outside);
    await pass(500);
    expect(displayed(el)).toBe(true);
    await pass(600);

    expect(displayed(el)).toBe(false);
  });

  it('S8 holds the time while the page is hidden', async () => {
    await useClock();
    const el = await mountToast({ duration: 4000 });

    await pass(1000);
    setVisibility('hidden');
    await pass(10_000);
    expect(displayed(el)).toBe(true);
    setVisibility('visible');
    await pass(2600);
    expect(displayed(el)).toBe(true);
    await pass(500);

    expect(displayed(el)).toBe(false);
  });

  it('S9 leaves through the dismiss button and says so', async () => {
    const seen = recordDismissals();
    const el = await mountToast({ message: 'Backup completed' });

    await userEvent.click(dismissButton(el));
    await settle();

    expect(displayed(el)).toBe(false);
    expect(el.dismissed).toBe(true);
    expect(seen).toEqual([{ reason: 'button' }]);
  });

  it('S10 runs the action and leaves', async () => {
    const seen = recordDismissals();
    const el = await mountToast({ message: 'Message archived', action: 'Undo' });
    let undone = 0;
    el.querySelector('button')?.addEventListener('click', () => {
      undone += 1;
    });

    await userEvent.click(page.getByRole('button', { name: 'Undo' }));
    await settle();

    expect(undone).toBe(1);
    expect(displayed(el)).toBe(false);
    expect(seen).toEqual([{ reason: 'action' }]);
  });

  it('S11 offers no dismiss button when it is not dismissible', async () => {
    const el = await mountToast({ message: 'Connected', dismissible: false });

    expect(maybePart(el, 'dismiss')).toBeNull();
    expect(el.shadowRoot?.querySelector('button, ki-icon-button')).toBeNull();
  });

  it('S12 shows again with its full time when the page clears dismissed', async () => {
    await useClock();
    const el = await mountToast({ duration: 4000 });
    await pass(4000);
    expect(displayed(el)).toBe(false);

    el.dismissed = false;
    await settle();

    expect(displayed(el)).toBe(true);
    await pass(3600);
    expect(displayed(el)).toBe(true);
    await pass(500);
    expect(displayed(el)).toBe(false);
  });

  it('S13 renders an unknown tone with the neutral appearance', async () => {
    const neutral = await mountToast({ tone: 'neutral' });
    const unknown = await mountToast({ tone: 'banana' });

    for (const name of ['toast', 'icon']) {
      const expected = getComputedStyle(part(neutral, name));
      const actual = getComputedStyle(part(unknown, name));
      expect(actual.backgroundColor, name).toBe(expected.backgroundColor);
      expect(actual.color, name).toBe(expected.color);
    }
    expect(part(unknown, 'icon').innerHTML).toBe(part(neutral, 'icon').innerHTML);
    expect(liveWrapper(unknown).getAttribute('role')).toBe('status');
  });
});

describe('ki-toast keyboard path', () => {
  it('S22 tabs to the action and then the dismiss button, with visible focus', async () => {
    const el = await mountToast({ message: 'Message archived', action: 'Undo' });
    const undo = el.querySelector('button');

    await userEvent.keyboard('{Tab}');
    expect(document.activeElement).toBe(undo);
    expect(undo?.matches(':focus-visible')).toBe(true);

    await userEvent.keyboard('{Tab}');
    const dismiss = dismissButton(el);
    expect(part(el, 'dismiss').shadowRoot?.activeElement).toBe(dismiss);
    expect(dismiss.matches(':focus-visible')).toBe(true);
    expect(getComputedStyle(dismiss).outlineStyle).not.toBe('none');
  });

  it('S23 holds the time while keyboard focus is inside the toast', async () => {
    await useClock();
    const el = await mountToast({ duration: 4000 });

    await userEvent.keyboard('{Tab}');
    expect(part(el, 'dismiss').shadowRoot?.activeElement).toBe(dismissButton(el));
    await pass(6000);

    expect(displayed(el)).toBe(true);
  });
});

describe('ki-toast assistive-technology outcome', () => {
  it('S27 exposes neutral, info, success and warning toasts politely without moving focus', async () => {
    const field = document.createElement('input');
    field.setAttribute('aria-label', 'Name');
    document.body.append(field);
    field.focus();

    for (const tone of ['neutral', 'info', 'success', 'warning']) {
      const el = await mountToast({ tone, message: 'Changes saved' });
      expect(liveWrapper(el).getAttribute('role'), tone).toBe('status');
      expect(document.activeElement).toBe(field);
    }
  });

  it('S28 exposes a danger toast assertively without moving focus', async () => {
    const field = document.createElement('input');
    field.setAttribute('aria-label', 'Name');
    document.body.append(field);
    field.focus();

    const el = await mountToast({ tone: 'danger', message: 'Upload failed' });

    expect(liveWrapper(el).getAttribute('role')).toBe('alert');
    expect(document.activeElement).toBe(field);
  });

  it('S29 announces only the heading and the message', async () => {
    const el = await mountToast({
      tone: 'warning',
      heading: 'Storage almost full',
      message: '1 GB left',
      action: 'Upgrade',
    });

    expect(liveText(el)).toBe('Storage almost full 1 GB left');
    for (const name of ['icon', 'action', 'dismiss']) {
      expect(liveWrapper(el).contains(part(el, name)), name).toBe(false);
    }
    expect(part(el, 'icon').getAttribute('aria-hidden')).toBe('true');

    const nodes = await browserCommands.accessibilityTree();
    if (nodes === null) {
      expect(IS_CHROMIUM, 'Chromium stopped answering its accessibility tree').toBe(false);
      return;
    }
    const live = nodes.find(
      (node) => node.live !== null && node.text.includes('Storage almost full'),
    );
    expect(live?.text).toContain('1 GB left');
    expect(live?.text).not.toContain('Upgrade');
    expect(live?.text).not.toContain('Dismiss');
  });

  it('S30 exposes the dismiss button as a button named Dismiss', async () => {
    await mountToast({ message: 'Backup completed' });

    await expect.element(page.getByRole('button', { name: 'Dismiss' })).toBeVisible();
  });

  it('S31 takes a localized dismiss label', async () => {
    await mountToast({ message: 'Borrador guardado', dismissLabel: 'Descartar' });

    await expect.element(page.getByRole('button', { name: 'Descartar' })).toBeVisible();
  });

  it('S27 S28 S30 have zero axe violations across five tones', async () => {
    const main = document.createElement('main');
    document.body.append(main);
    for (const tone of tones) {
      await mountToast(
        {
          tone,
          heading: `${tone} heading`,
          message: `${tone} message`,
          action: 'Review',
          actionElement: 'ki-button',
        },
        main,
      );
    }
    await mountToast({ message: 'Not dismissible', dismissible: false }, main);

    await expectAccessible(main);
  });
});

describe('ki-toast theming', () => {
  it.each(['light', 'dark'])('S46 uses the alert dismiss ink in onmars %s', async (scheme) => {
    await browserCommands.emulateReducedMotion('reduce');
    try {
      defineKiAlert();
      document.documentElement.setAttribute('data-ki-color-scheme', scheme);
      const toast = await mountToast({ duration: 0, heading: 'Changes saved' });
      const alert = document.createElement('ki-alert');
      alert.dismissible = true;
      alert.textContent = 'Changes saved';
      document.body.append(alert);
      await expect.element(page.getByRole('button', { name: 'Dismiss' }).last()).toBeVisible();

      const ink = (host: Element) => {
        const glyph = part(host, 'dismiss').querySelector('path');
        if (glyph === null) throw new Error('Expected a dismiss glyph');
        return getComputedStyle(glyph).fill;
      };
      const alertInk = ink(alert);
      expect(ink(toast)).toBe(alertInk);

      toast.style.setProperty('--ki-toast-dismiss-fg', 'rgb(42, 71, 98)');
      expect(ink(toast)).toBe('rgb(42, 71, 98)');
      expect(ink(alert)).toBe(alertInk);
    } finally {
      await browserCommands.emulateReducedMotion(null);
    }
  });

  it('S35 restyles every tone through the material3 tokens alone', async () => {
    const onmars = new Map<string, string>();
    for (const tone of tones) {
      const el = await mountToast({ tone });
      const surface = getComputedStyle(part(el, 'toast'));
      onmars.set(tone, `${surface.backgroundColor} ${surface.borderTopLeftRadius}`);
    }

    cleanup();
    ensureStyle(MATERIAL3_STYLE_ID, material3Css);
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    for (const tone of tones) {
      const el = await mountToast({ tone });
      const surface = getComputedStyle(part(el, 'toast'));
      expect(`${surface.backgroundColor} ${surface.borderTopLeftRadius}`, tone).not.toBe(
        onmars.get(tone),
      );
    }
  });

  it('S36 honors a forced dark scheme: the surface and the text repaint', async () => {
    const el = await mountToast({ tone: 'success', heading: 'Changes saved' });

    expect(await repaintedUnderForcedDark(el)).toEqual(
      expect.arrayContaining(['toast', 'heading', 'message']),
    );
  });

  it('S39 takes its background image, backdrop filter and heading typeface from tokens', async () => {
    ensureTokens();
    const root = document.documentElement.style;
    root.setProperty('--ki-toast-bg-image', 'linear-gradient(red, blue)');
    root.setProperty('--ki-toast-backdrop-filter', 'blur(8px)');
    root.setProperty('--ki-toast-heading-font-family', 'serif');
    const el = await mountToast({ heading: 'Changes saved' });
    const surface = getComputedStyle(part(el, 'toast'));

    expect(surface.backgroundImage).toContain('linear-gradient');
    expect(surface.backgroundColor).toMatch(/^rgb\(/u);
    expect(surface.backdropFilter).toBe('blur(8px)');
    expect(getComputedStyle(part(el, 'heading')).fontFamily).toBe('serif');
  });

  it('S40 appears without animating under a reduced-motion preference', async () => {
    // The preference changes with a toast already on the page, as it does for
    // a person who turns it on with the page open: WebKit re-evaluates a
    // component's media queries only in the shadow roots present at the
    // change, and a toast mounted into an empty page would keep the old answer.
    await mountToast({ message: 'Link copied' });
    await browserCommands.emulateReducedMotion('reduce');
    try {
      expect(matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true);
      const el = await mountToast();
      expect(el.shadowRoot?.getAnimations() ?? []).toEqual([]);
    } finally {
      await browserCommands.emulateReducedMotion(null);
    }
  });

  it('S40 rises into place when motion is welcome', async () => {
    await browserCommands.emulateReducedMotion('no-preference');
    try {
      ensureTokens();
      const el = buildToast();
      document.body.append(el);
      await customElements.whenDefined('ki-toast');
      for (let index = 0; index < 30 && !el.shadowRoot?.hasChildNodes(); index += 1) {
        await nextFrame();
      }
      expect((el.shadowRoot?.getAnimations() ?? []).length).toBeGreaterThan(0);
    } finally {
      await browserCommands.emulateReducedMotion(null);
    }
  });

  it('S41 stays opaque and raised under reduced transparency', async (test) => {
    document.documentElement.setAttribute('data-ki-color-scheme', 'dark');
    if (!(await browserCommands.emulateReducedTransparency('reduce'))) {
      test.skip('this engine cannot emulate prefers-reduced-transparency');
    }
    try {
      const el = await mountToast({ tone: 'success' });
      const surface = getComputedStyle(part(el, 'toast'));

      expect(surface.backdropFilter).toBe('none');
      expect(surface.backgroundColor).toMatch(/^rgb\(/u);
      expect(surface.boxShadow).not.toBe('none');
    } finally {
      await browserCommands.emulateReducedTransparency(null);
    }
  });

  it('S42 keeps its edge and a visible icon under forced colors', async (test) => {
    if ((await browserCommands.emulateForcedColors('active')) === false) {
      test.skip('this engine cannot emulate forced colors');
    }
    try {
      const el = await mountToast({ tone: 'info' });
      const surface = getComputedStyle(part(el, 'toast'));
      const forced = canvasText();

      expect(surface.borderTopStyle).toBe('solid');
      expect(surface.borderTopColor).toBe(forced);
      expect(getComputedStyle(part(el, 'icon')).color).toBe(forced);
    } finally {
      await browserCommands.emulateForcedColors(null);
    }
  });

  it('S43 gives the dismiss button and the action touch-sized targets under touch density', async () => {
    const section = document.createElement('section');
    section.setAttribute('data-ki-density', 'touch');
    document.body.append(section);
    const el = await mountToast(
      { message: 'Message archived', action: 'Undo', actionElement: 'ki-button' },
      section,
    );
    await customElements.whenDefined('ki-button');
    const undo = el.querySelector('ki-button');
    if (undo === null) {
      throw new Error('the action is missing');
    }
    await rendered(undo);
    const undoButton = undo.shadowRoot?.querySelector('button');
    if (!(undoButton instanceof HTMLButtonElement)) {
      throw new Error('ki-button rendered no native button');
    }

    expect(missesAcross(dismissButton(el), TOUCH_TARGET_MIN)).toEqual([]);
    expect(missesAcross(undoButton, TOUCH_TARGET_MIN)).toEqual([]);
  });
});
