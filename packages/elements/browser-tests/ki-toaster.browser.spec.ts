// @spec:049-ki-toast
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). They live outside src/ so
// Stencil never compiles them; the build gate runs before type-aware gates.
//
// The toaster places, stacks and queues toasts in the top layer; these tests
// measure where the stack lands in the viewport, what the accessibility tree
// shows and where focus goes. Where time is the subject they run on
// Playwright's page clock, paused, with animation frames advanced by it.
import tokensCss from '@kimen/tokens/css?raw';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';
import { defineCustomElement as defineKiButton } from '../dist/components/ki-button.js';
import { defineCustomElement as defineKiToast } from '../dist/components/ki-toast.js';
import { defineCustomElement as defineKiToaster } from '../dist/components/ki-toaster.js';
import { expectAccessible, parkPointer } from './axe';

type KiToastElement = HTMLElement & { dismissed: boolean; queued: boolean };

interface ShowOptions {
  action?: { label: string; onClick: () => void };
  dismissible?: boolean;
  duration?: number;
  message: string;
  title?: string;
  tone?: string;
}

type KiToasterElement = HTMLElement & {
  label: string;
  max: number;
  placement: string;
  show: (options: ShowOptions) => Promise<KiToastElement>;
};

interface ToastOptions {
  action?: string;
  duration?: number;
  message: string;
}

const STYLE_ID = 'ki-toaster-browser-token-style';
const DEFAULT_VIEWPORT = { height: 896, width: 414 };
const WIDE_VIEWPORT = { height: 800, width: 1280 };
const INSET = 16;

const browserCommands = commands as unknown as {
  fastForwardClock: (milliseconds: number) => Promise<void>;
  installClock: () => Promise<void>;
  pauseClock: () => Promise<void>;
  resumeClock: () => Promise<void>;
  accessibilityTree: () => Promise<
    { role: string; name: string; live: unknown; text: string }[] | null
  >;
  ariaSnapshotByRole: (role: string, name?: string) => Promise<string>;
  emulateHoverCapability: (capability: 'hover' | 'none' | null) => Promise<boolean>;
};

// When an earlier spec has installed the page clock, the runner arms each
// test's own timeout on that clock, so advancing it moves the timeout too:
// a test that skips 30 s of page time needs a timeout longer than that.
vi.setConfig({ testTimeout: 120_000 });

// The real accessibility tree comes over CDP, on Chromium alone (the engine
// the PR gate runs); elsewhere the command answers null.
const IS_CHROMIUM = navigator.userAgent.includes('Chrome/');

beforeAll(() => {
  defineKiToast();
  defineKiToaster();
  defineKiButton();
});

beforeEach(async () => {
  await page.viewport(WIDE_VIEWPORT.width, WIDE_VIEWPORT.height);
});

afterEach(async () => {
  await releaseClock();
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
  document.documentElement.style.removeProperty('--ki-toaster-inset-block');
  document.documentElement.style.removeProperty('--ki-toaster-inset-inline');
  await page.viewport(DEFAULT_VIEWPORT.width, DEFAULT_VIEWPORT.height);
  // A pointer left where the next stack opens would hold its toasts' time.
  await parkPointer();
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

let clockPaused = false;

/** One animation frame: real, or one frame of the paused page clock. */
async function nextFrame(): Promise<void> {
  if (clockPaused) {
    await browserCommands.fastForwardClock(20);
    return;
  }
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

async function settle(frames = 4): Promise<void> {
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

function buildToast(options: ToastOptions): KiToastElement {
  const el = document.createElement('ki-toast') as KiToastElement;
  if (options.duration !== undefined) {
    el.setAttribute('duration', String(options.duration));
  }
  el.append(document.createTextNode(options.message));
  if (options.action !== undefined) {
    const button = document.createElement('button');
    button.type = 'button';
    button.slot = 'action';
    button.textContent = options.action;
    el.append(button);
  }
  return el;
}

async function mountToaster(
  attributes: Record<string, string> = {},
  toasts: ToastOptions[] = [],
): Promise<KiToasterElement> {
  ensureTokens();
  const toaster = document.createElement('ki-toaster') as unknown as KiToasterElement;
  for (const [name, value] of Object.entries(attributes)) {
    toaster.setAttribute(name, value);
  }
  toaster.append(...toasts.map(buildToast));
  document.body.append(toaster);
  await customElements.whenDefined('ki-toaster');
  await customElements.whenDefined('ki-toast');
  for (let index = 0; index < 30 && !toaster.shadowRoot?.hasChildNodes(); index += 1) {
    await nextFrame();
  }
  await settle();
  return toaster;
}

async function arrive(toaster: KiToasterElement, options: ToastOptions): Promise<KiToastElement> {
  const toast = buildToast(options);
  toaster.append(toast);
  await settle();
  return toast;
}

function toastsOf(toaster: KiToasterElement): KiToastElement[] {
  return [...toaster.querySelectorAll<KiToastElement>(':scope > ki-toast')];
}

function named(toaster: KiToasterElement, message: string): KiToastElement {
  const toast = toastsOf(toaster).find((element) => element.textContent.includes(message));
  if (!toast) {
    throw new Error(`no toast "${message}"`);
  }
  return toast;
}

function stack(toaster: KiToasterElement): HTMLElement {
  const node = toaster.shadowRoot?.querySelector<HTMLElement>('[part~="stack"]');
  expect(node, 'missing part stack').toBeInstanceOf(HTMLElement);
  if (!node) {
    throw new Error('ki-toaster did not render part="stack"');
  }
  return node;
}

function part(el: Element, name: string): HTMLElement {
  const node = el.shadowRoot?.querySelector<HTMLElement>(`[part~="${name}"]`);
  expect(node, `missing part ${name}`).toBeInstanceOf(HTMLElement);
  if (!node) {
    throw new Error(`missing part="${name}"`);
  }
  return node;
}

/** The native button inside a toast's dismiss `ki-icon-button`. */
function dismissButton(toast: Element): HTMLButtonElement {
  const button = part(toast, 'dismiss').shadowRoot?.querySelector('button');
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error('the dismiss control holds no native button');
  }
  return button;
}

function displayed(el: Element): boolean {
  return el.checkVisibility() && el.getBoundingClientRect().height > 0;
}

function box(el: Element): DOMRect {
  return el.getBoundingClientRect();
}

function viewport(): { height: number; width: number } {
  return {
    height: document.documentElement.clientHeight,
    width: document.documentElement.clientWidth,
  };
}

type Edge = 'top' | 'bottom';
type Side = 'left' | 'center' | 'right';

function expectStackAt(toaster: KiToasterElement, edge: Edge, side: Side, inset = INSET): void {
  const rect = box(stack(toaster));
  const { height, width } = viewport();
  expect(rect.height, 'the stack has a box').toBeGreaterThan(0);
  if (edge === 'top') {
    expect(rect.top, 'distance from the top').toBeCloseTo(inset, 0);
  } else {
    expect(height - rect.bottom, 'distance from the bottom').toBeCloseTo(inset, 0);
  }
  if (side === 'left') {
    expect(rect.left, 'distance from the left').toBeCloseTo(inset, 0);
  } else if (side === 'right') {
    expect(width - rect.right, 'distance from the right').toBeCloseTo(inset, 0);
  } else {
    expect((rect.left + rect.right) / 2, 'centered').toBeCloseTo(width / 2, 0);
  }
}

function recordDismissals(): { reason: unknown }[] {
  const seen: { reason: unknown }[] = [];
  document.addEventListener('ki-dismiss', (event) => {
    seen.push({ reason: (event as CustomEvent<{ reason?: unknown } | null>).detail?.reason });
  });
  return seen;
}

function button(label: string): HTMLButtonElement {
  const element = document.createElement('button');
  element.type = 'button';
  element.textContent = label;
  return element;
}

describe('ki-toaster core behavior', () => {
  it('S14 stacks toasts in arrival order in the bottom right corner', async () => {
    const toaster = await mountToaster({ placement: 'bottom-end' });
    const first = await arrive(toaster, { message: 'First', duration: 0 });
    const second = await arrive(toaster, { message: 'Second', duration: 0 });

    expect(displayed(first)).toBe(true);
    expect(displayed(second)).toBe(true);
    expect(box(second).top - box(first).bottom).toBeCloseTo(12, 0);
    expectStackAt(toaster, 'bottom', 'right');
    expect(box(stack(toaster)).width).toBeCloseTo(360, 0);
  });

  it.each([
    ['top-center', 'top', 'center'],
    ['top-end', 'top', 'right'],
    ['bottom-center', 'bottom', 'center'],
    ['bottom-end', 'bottom', 'right'],
  ] as const)('S15 places the stack for %s at the %s, %s', async (placement, edge, side) => {
    const toaster = await mountToaster({ placement });
    await arrive(toaster, { message: 'Draft saved', duration: 0 });

    expectStackAt(toaster, edge, side);
  });

  it('S16 places an unknown placement at the bottom right', async () => {
    const toaster = await mountToaster({ placement: 'top-start' });
    await arrive(toaster, { message: 'Draft saved', duration: 0 });

    expectStackAt(toaster, 'bottom', 'right');
  });

  it('S17 sits at the bottom center on a narrow touch screen', async (test) => {
    await page.viewport(DEFAULT_VIEWPORT.width, DEFAULT_VIEWPORT.height);
    if (!(await browserCommands.emulateHoverCapability('none'))) {
      test.skip('this engine cannot emulate a touch screen');
    }
    try {
      expect(matchMedia('(pointer: coarse)').matches).toBe(true);
      const toaster = await mountToaster({ placement: 'top-end' });
      await arrive(toaster, { message: 'Draft saved', duration: 0 });

      expectStackAt(toaster, 'bottom', 'center');
    } finally {
      await browserCommands.emulateHoverCapability(null);
    }
  });

  it('S18 shows its newest toasts and queues the older ones', async () => {
    const toaster = await mountToaster({ max: '2' }, [
      { message: 'One', duration: 0 },
      { message: 'Two', duration: 0 },
    ]);
    await arrive(toaster, { message: 'Three', duration: 0 });

    expect(displayed(named(toaster, 'One'))).toBe(false);
    expect(named(toaster, 'One').queued).toBe(true);
    expect(displayed(named(toaster, 'Two'))).toBe(true);
    expect(displayed(named(toaster, 'Three'))).toBe(true);
  });

  it('S18 shows three toasts by default', async () => {
    const toaster = await mountToaster({}, [
      { message: 'One', duration: 0 },
      { message: 'Two', duration: 0 },
      { message: 'Three', duration: 0 },
      { message: 'Four', duration: 0 },
    ]);

    expect(toastsOf(toaster).map(displayed)).toEqual([false, true, true, true]);
  });

  it('S19 brings a queued toast back when a place frees, with its full time', async () => {
    await useClock();
    const toaster = await mountToaster({ max: '2' }, [
      { message: 'One', duration: 4000 },
      { message: 'Two', duration: 0 },
      { message: 'Three', duration: 0 },
    ]);
    const one = named(toaster, 'One');
    await pass(10_000);
    expect(displayed(one)).toBe(false);

    await userEvent.click(dismissButton(named(toaster, 'Three')));
    await parkPointer();
    await settle();

    expect(displayed(one)).toBe(true);
    expect(displayed(named(toaster, 'Two'))).toBe(true);
    await pass(3000);
    expect(displayed(one)).toBe(true);
    await pass(1500);
    expect(displayed(one)).toBe(false);
  });

  it('S20 raises a toast through show() and removes it once it has left', async () => {
    const seen = recordDismissals();
    const toaster = await mountToaster();
    let undone = 0;

    const toast = await toaster.show({
      tone: 'success',
      title: 'Changes saved',
      message: 'Workspace settings are up to date.',
      action: {
        label: 'Undo',
        onClick: () => {
          undone += 1;
        },
      },
    });
    await settle();

    expect(toast.isConnected).toBe(true);
    expect(toast.getAttribute('tone')).toBe('success');
    expect(part(toast, 'heading').textContent).toBe('Changes saved');
    expect(toast.textContent).toContain('Workspace settings are up to date.');
    expect(displayed(toast)).toBe(true);
    const undo = page.getByRole('button', { name: 'Undo' });
    await expect.element(undo).toBeVisible();

    await userEvent.click(undo);
    await settle();

    expect(undone).toBe(1);
    expect(seen).toEqual([{ reason: 'action' }]);
    expect(toast.isConnected).toBe(false);
  });

  it('S21 never covers the page beside its toasts', async () => {
    const toaster = await mountToaster({ placement: 'bottom-end' });
    await arrive(toaster, { message: 'Draft saved', duration: 0 });
    const left = box(stack(toaster)).left;
    const help = button('Help');
    help.style.cssText = `position:fixed;inset-block-end:${String(INSET)}px;inset-inline-start:${String(left - 80)}px;`;
    let helped = 0;
    help.addEventListener('click', () => {
      helped += 1;
    });
    document.body.prepend(help);

    await userEvent.click(help);

    expect(helped).toBe(1);
  });

  it('S6 holds every toast of the toaster while the pointer rests on one of them', async () => {
    await useClock();
    const toaster = await mountToaster({}, [
      { message: 'Draft saved', duration: 4000 },
      { message: 'Photo uploaded', duration: 4000 },
    ]);

    await userEvent.hover(part(named(toaster, 'Photo uploaded'), 'toast'));
    await pass(6000);

    expect(displayed(named(toaster, 'Draft saved'))).toBe(true);
    expect(displayed(named(toaster, 'Photo uploaded'))).toBe(true);
  });
});

describe('ki-toaster keyboard path', () => {
  it('S24 moves focus into the toaster on F6', async () => {
    const save = button('Save');
    document.body.append(save);
    const toaster = await mountToaster({}, [
      { message: 'Message archived', action: 'Undo', duration: 0 },
    ]);
    save.focus();

    await userEvent.keyboard('{F6}');

    expect(document.activeElement).toBe(named(toaster, 'Message archived').querySelector('button'));
  });

  it('S25 dismisses the focused toast on Escape and returns focus to where it was', async () => {
    const seen = recordDismissals();
    const save = button('Save');
    document.body.append(save);
    const toaster = await mountToaster({}, [{ message: 'Draft saved', duration: 0 }]);
    document.body.append(button('After'));
    const toast = named(toaster, 'Draft saved');
    save.focus();
    await userEvent.keyboard('{Tab}');
    expect(part(toast, 'dismiss').shadowRoot?.activeElement).toBe(dismissButton(toast));

    await userEvent.keyboard('{Escape}');
    await settle();

    expect(displayed(toast)).toBe(false);
    expect(document.activeElement).toBe(save);
    expect(seen).toEqual([{ reason: 'escape' }]);
  });

  it('S25 returns focus to where it was after F6 and Escape', async () => {
    const save = button('Save');
    document.body.append(save);
    const toaster = await mountToaster({}, [
      { message: 'Message archived', action: 'Undo', duration: 0 },
    ]);
    save.focus();
    await userEvent.keyboard('{F6}');

    await userEvent.keyboard('{Escape}');
    await settle();

    expect(displayed(named(toaster, 'Message archived'))).toBe(false);
    expect(document.activeElement).toBe(save);
  });

  it('S26 hands focus to the next toast when a toast is dismissed from the keyboard', async () => {
    const toaster = await mountToaster({}, [
      { message: 'Draft saved', duration: 0 },
      { message: 'Photo uploaded', duration: 0 },
    ]);
    const draft = named(toaster, 'Draft saved');
    const photo = named(toaster, 'Photo uploaded');
    dismissButton(draft).focus();

    await userEvent.keyboard('{Enter}');
    await settle();

    expect(displayed(draft)).toBe(false);
    expect(document.activeElement).toBe(photo);
    expect(part(photo, 'dismiss').shadowRoot?.activeElement).toBe(dismissButton(photo));
  });
});

describe('ki-toaster assistive-technology outcome', () => {
  it('S32 is a group named Notifications that contains its toast, not a landmark', async () => {
    const toaster = await mountToaster({}, [{ message: 'Draft saved', duration: 0 }]);

    expect(stack(toaster).getAttribute('role')).toBe('group');
    await expect.element(page.getByRole('group', { name: 'Notifications' })).toBeVisible();
    // The toasts are slotted into the group: the flattened tree, which is what
    // assistive technology reads, holds them; the DOM tree does not.
    expect(await browserCommands.ariaSnapshotByRole('group', 'Notifications')).toContain(
      'Draft saved',
    );
    await expect
      .element(page.getByRole('region', { name: 'Notifications' }))
      .not.toBeInTheDocument();
  });

  it('S31 takes a localized group name', async () => {
    await mountToaster({ label: 'Avisos' }, [{ message: 'Borrador guardado', duration: 0 }]);

    await expect.element(page.getByRole('group', { name: 'Avisos' })).toBeVisible();
  });

  it('S33 exposes nothing once its toasts have all left', async () => {
    const toaster = await mountToaster({}, [{ message: 'Draft saved', duration: 0 }]);
    named(toaster, 'Draft saved').dismissed = true;
    await settle();

    expect(stack(toaster).matches(':popover-open')).toBe(false);
    expect(displayed(stack(toaster))).toBe(false);
    await expect
      .element(page.getByRole('group', { name: 'Notifications' }))
      .not.toBeInTheDocument();
  });

  it('S33 exposes nothing before its first toast arrives', async () => {
    const toaster = await mountToaster();

    expect(stack(toaster).matches(':popover-open')).toBe(false);
    await expect
      .element(page.getByRole('group', { name: 'Notifications' }))
      .not.toBeInTheDocument();
  });

  it('S34 keeps a queued toast out of the accessibility tree until its turn', async () => {
    const toaster = await mountToaster({ max: '1' }, [
      { message: 'One', duration: 0 },
      { message: 'Two', duration: 0 },
    ]);

    expect(named(toaster, 'One').queued).toBe(true);
    const nodes = await browserCommands.accessibilityTree();
    if (nodes === null) {
      expect(IS_CHROMIUM, 'Chromium stopped answering its accessibility tree').toBe(false);
      return;
    }
    const texts = nodes.map((node) => `${node.name} ${node.text}`);
    expect(texts.some((text) => text.includes('Two'))).toBe(true);
    expect(texts.some((text) => text.includes('One'))).toBe(false);
  });

  it('S32 S34 have zero axe violations with shown and queued toasts', async () => {
    // The toaster is a group, not a landmark (founder decision 2): a page
    // keeps it inside one of its own landmarks, as here.
    const main = document.createElement('main');
    document.body.append(main);
    const toaster = await mountToaster({ max: '2' }, [
      { message: 'Queued', duration: 0 },
      { message: 'Draft saved', duration: 0 },
      { message: 'Photo uploaded', duration: 0, action: 'View' },
    ]);
    main.append(toaster);
    await settle();

    await expectAccessible(document.body);
  });
});

describe('ki-toaster theming', () => {
  it('S37 follows a right-to-left document: bottom left, icon at the right, dismiss at the left', async () => {
    document.documentElement.setAttribute('dir', 'rtl');
    const toaster = await mountToaster({ placement: 'bottom-end' });
    const toast = await arrive(toaster, { message: 'Message archived', action: 'Undo' });
    const surface = box(part(toast, 'toast'));
    // Inside the hairline edge, 12px of padding.
    const inset = 12 + Number.parseFloat(getComputedStyle(part(toast, 'toast')).borderTopWidth);

    expectStackAt(toaster, 'bottom', 'left');
    expect(box(part(toast, 'icon')).right).toBeCloseTo(surface.right - inset, 0);
    expect(box(part(toast, 'dismiss')).left).toBeCloseTo(surface.left + inset, 0);
  });

  it('S38 takes its distance from the viewport edges from tokens', async () => {
    ensureTokens();
    document.documentElement.style.setProperty('--ki-toaster-inset-block', '32px');
    document.documentElement.style.setProperty('--ki-toaster-inset-inline', '32px');
    const toaster = await mountToaster({ placement: 'bottom-end' });
    await arrive(toaster, { message: 'Draft saved', duration: 0 });

    expectStackAt(toaster, 'bottom', 'right', 32);
  });
});
