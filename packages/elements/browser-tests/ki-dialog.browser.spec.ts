import axe from 'axe-core';
import { commands, page, userEvent } from 'vitest/browser';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:012-ki-dialog
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). mock-doc has no showModal,
// top layer, inertness, Escape close requests, or ::backdrop.
import tokensCss from '@kimen/tokens/css?raw';
import material3Css from '@kimen/tokens/css/material3?raw';
import { defineCustomElement } from '../dist/components/ki-dialog.js';
import { defineCustomElement as defineKiButton } from '../dist/components/ki-button.js';

type CloseReason = 'method' | 'escape' | 'backdrop';
type KiCloseEvent = CustomEvent<{ reason: CloseReason }>;
type KiDialogElement = HTMLElement & {
  close: () => Promise<void>;
  closeOnBackdrop: boolean;
  heading: string;
  open: boolean;
  show: () => Promise<void>;
};

const STYLE_ID = 'ki-dialog-browser-token-style';
const MATERIAL3_STYLE_ID = 'ki-dialog-browser-material3-token-style';
const browserCommands = commands as unknown as {
  emulateReducedMotion: (reducedMotion: 'reduce' | 'no-preference' | null) => Promise<void>;
};

beforeAll(() => {
  defineCustomElement();
  defineKiButton();
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

function ensureMaterial3Tokens(): void {
  if (document.getElementById(MATERIAL3_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = MATERIAL3_STYLE_ID;
  style.textContent = material3Css;
  document.head.append(style);
}

function cleanup(): void {
  document.body.replaceChildren();
  document.documentElement.removeAttribute('dir');
  document.documentElement.removeAttribute('data-ki-theme');
  document.documentElement.removeAttribute('data-ki-color-scheme');
}

async function waitFor(condition: () => boolean, message: string): Promise<void> {
  const deadline = Date.now() + 2000;
  while (!condition() && Date.now() < deadline) {
    await new Promise((resolve) => requestAnimationFrame(resolve));
  }
  expect(condition(), message).toBe(true);
}

async function mountDialog(
  attributes: Record<string, string | boolean> = {},
  parent: ParentNode = document.body,
  content = `
    <p>This action permanently deletes your account.</p>
    <button slot="footer" type="button">Cancel</button>
    <button slot="footer" type="button">Delete</button>
  `,
): Promise<KiDialogElement> {
  ensureTokens();
  const el = document.createElement('ki-dialog') as KiDialogElement;
  for (const [name, value] of Object.entries(attributes)) {
    if (typeof value === 'boolean') {
      el.toggleAttribute(name, value);
    } else {
      el.setAttribute(name, value);
    }
  }
  el.heading = 'Delete account?';
  el.innerHTML = content;
  parent.appendChild(el);
  await customElements.whenDefined('ki-dialog');
  await waitFor(
    () => Boolean(el.shadowRoot?.querySelector('dialog')),
    'ki-dialog rendered shadow anatomy',
  );
  return el;
}

function internalDialog(el: KiDialogElement): HTMLDialogElement {
  const dialog = el.shadowRoot?.querySelector('dialog');
  expect(dialog).toBeInstanceOf(HTMLDialogElement);
  if (!(dialog instanceof HTMLDialogElement)) {
    throw new Error('ki-dialog did not render an internal native dialog');
  }
  return dialog;
}

function bodyPart(el: KiDialogElement): HTMLElement {
  const body = el.shadowRoot?.querySelector<HTMLElement>('[part="body"]');
  expect(body).toBeInstanceOf(HTMLElement);
  if (!(body instanceof HTMLElement)) {
    throw new Error('ki-dialog did not render body part');
  }
  return body;
}

function requireEl(root: ParentNode, selector: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(selector);
  expect(el).not.toBeNull();
  if (!el) {
    throw new Error(`missing ${selector}`);
  }
  return el;
}

function activeElementDeep(root: Document | ShadowRoot = document): Element | null {
  const active = root.activeElement;
  if (active?.shadowRoot?.activeElement) {
    return activeElementDeep(active.shadowRoot);
  }
  return active;
}

function isInsideDialog(el: KiDialogElement, active: Element | null): boolean {
  if (!active) {
    return false;
  }

  const dialog = internalDialog(el);
  return active === dialog || dialog.contains(active) || el.contains(active);
}

function readToken(name: string): string {
  const probe = document.createElement('div');
  probe.style.backgroundColor = `var(${name})`;
  probe.style.borderRadius = `var(${name})`;
  document.body.append(probe);
  const styles = getComputedStyle(probe);
  const value = name.includes('radius') ? styles.borderRadius : styles.backgroundColor;
  probe.remove();
  return value;
}

function footerButton(el: KiDialogElement, label: string): HTMLButtonElement {
  const button = [...el.querySelectorAll<HTMLButtonElement>('button[slot="footer"]')].find(
    (candidate) => candidate.textContent === label,
  );
  expect(button).toBeInstanceOf(HTMLButtonElement);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing footer button: ${label}`);
  }
  return button;
}

async function openDialog(el: KiDialogElement): Promise<void> {
  await el.show();
  await waitFor(() => el.open && internalDialog(el).open, 'dialog opened modally');
}

function nextClose(el: KiDialogElement): Promise<KiCloseEvent> {
  return new Promise((resolve) => {
    el.addEventListener(
      'ki-close',
      (event) => {
        resolve(event as KiCloseEvent);
      },
      { once: true },
    );
  });
}

async function backdropClick(el: KiDialogElement, armInside = false): Promise<void> {
  const dialog = internalDialog(el);
  const rect = dialog.getBoundingClientRect();
  const outsideX = rect.left - 4;
  const outsideY = rect.top + rect.height / 2;
  const insideX = rect.left + rect.width / 2;
  const insideY = rect.top + rect.height / 2;
  const downX = armInside ? insideX : outsideX;
  const downY = armInside ? insideY : outsideY;

  dialog.dispatchEvent(
    new PointerEvent('pointerdown', {
      bubbles: true,
      clientX: downX,
      clientY: downY,
    }),
  );
  dialog.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      clientX: outsideX,
      clientY: outsideY,
    }),
  );
  await new Promise((resolve) => requestAnimationFrame(resolve));
}

describe('ki-dialog in a real browser', () => {
  it('S1 S5 has zero axe violations in closed and open states under the default theme', async () => {
    cleanup();
    const main = document.createElement('main');
    document.body.append(main);
    const el = await mountDialog({}, main);

    let results = await axe.run(main);
    expect(results.violations).toEqual([]);

    await openDialog(el);
    results = await axe.run(main);
    expect(results.violations).toEqual([]);
  });

  it('S1 opening the dialog presents it above an inert page', async () => {
    cleanup();
    const main = document.createElement('main');
    const opener = document.createElement('button');
    opener.textContent = 'Delete account';
    const behind = document.createElement('button');
    behind.textContent = 'Background action';
    main.append(opener, behind);
    document.body.append(main);
    const el = await mountDialog();
    main.append(el);
    let behindClicks = 0;
    behind.addEventListener('click', () => {
      behindClicks += 1;
    });
    opener.addEventListener('click', () => {
      void el.show();
    });

    await userEvent.click(opener);
    await waitFor(() => el.open && internalDialog(el).open, 'dialog opened from invoker');
    await userEvent.click(behind, { force: true }).catch(() => undefined);
    behind.focus();

    expect(behindClicks).toBe(0);
    expect(document.activeElement).not.toBe(behind);
    expect(internalDialog(el).matches(':modal')).toBe(true);
  });

  it('S2 footer action wired to close emits one method ki-close event', async () => {
    cleanup();
    const el = await mountDialog();
    const cancel = footerButton(el, 'Cancel');
    cancel.addEventListener('click', () => {
      void el.close();
    });
    await openDialog(el);
    const closed = nextClose(el);

    await userEvent.click(cancel);
    const event = await closed;

    expect(el.open).toBe(false);
    expect(event.bubbles).toBe(true);
    expect(event.composed).toBe(true);
    expect(event.cancelable).toBe(false);
    expect(event.detail.reason).toBe('method');
  });

  it('S3 clicking the backdrop does not close the dialog by default', async () => {
    cleanup();
    const el = await mountDialog();
    await openDialog(el);

    await backdropClick(el);

    expect(el.open).toBe(true);
    expect(internalDialog(el).open).toBe(true);
  });

  it('S4 opt-in backdrop dismissal closes with reason backdrop and guards press-inside misfires', async () => {
    cleanup();
    const el = await mountDialog({ 'close-on-backdrop': true });
    await openDialog(el);

    await backdropClick(el, true);
    expect(el.open).toBe(true);

    const closed = nextClose(el);
    await backdropClick(el);
    const event = await closed;

    expect(el.open).toBe(false);
    expect(event.detail.reason).toBe('backdrop');
  });

  it('S4 boolean presence: close-on-backdrop="false" opts in and survives hydration', async () => {
    cleanup();
    // A present-but-falsy attribute value opts IN (presence semantics).
    const el = await mountDialog({ 'close-on-backdrop': 'false' });
    expect(el.closeOnBackdrop).toBe(true);

    await openDialog(el);
    await backdropClick(el, true);
    const closed = nextClose(el);
    await backdropClick(el);
    const event = await closed;
    expect(el.open).toBe(false);
    expect(event.detail.reason).toBe('backdrop');

    // The same presence semantics apply to an attribute set after hydration.
    cleanup();
    const later = await mountDialog();
    expect(later.closeOnBackdrop).toBe(false);
    later.setAttribute('close-on-backdrop', 'false');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(later.closeOnBackdrop).toBe(true);
  });

  it('S15 programmatic close reports exactly one close event and no-op guards report none', async () => {
    cleanup();
    const el = await mountDialog();
    const events: CloseReason[] = [];
    el.addEventListener('ki-close', (event) => {
      events.push((event as KiCloseEvent).detail.reason);
    });

    await openDialog(el);
    await el.show();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(events).toEqual([]);

    await el.close();
    await waitFor(() => events.length === 1, 'method close emitted once');
    expect(events).toEqual(['method']);

    await el.close();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(events).toEqual(['method']);

    await openDialog(el);
    el.removeAttribute('open');
    await waitFor(() => events.length === 2, 'open removal emitted once');
    expect(events).toEqual(['method', 'method']);
  });

  it('S15 body content taller than the viewport scrolls inside part body', async () => {
    cleanup();
    const el = await mountDialog();
    const filler = document.createElement('div');
    filler.style.blockSize = '200vh';
    filler.textContent = 'Long critical details';
    el.prepend(filler);

    await openDialog(el);
    const dialogRect = internalDialog(el).getBoundingClientRect();
    const body = bodyPart(el);

    expect(dialogRect.height).toBeLessThanOrEqual(window.innerHeight);
    expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
  });

  it('S6 opening from the keyboard follows focus-entry priority with visible focus', async () => {
    cleanup();
    const opener = document.createElement('button');
    opener.textContent = 'Delete account';
    document.body.append(opener);
    const withAutofocus = await mountDialog(
      {},
      document.body,
      '<button type="button" autofocus>Keep account</button><button type="button">Delete</button>',
    );
    opener.addEventListener('click', () => {
      void withAutofocus.show();
    });

    opener.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => withAutofocus.open, 'autofocus dialog opened');
    expect(activeElementDeep()).toBe(withAutofocus.querySelector('[autofocus]'));
    await withAutofocus.close();

    const firstFocusable = await mountDialog(
      {},
      document.body,
      '<p>Review this decision.</p><button type="button">First action</button>',
    );
    await openDialog(firstFocusable);
    expect(activeElementDeep()).toBe(firstFocusable.querySelector('button'));
    await firstFocusable.close();

    const noFocusable = await mountDialog({}, document.body, '<p>No actions yet.</p>');
    await openDialog(noFocusable);
    const surface = internalDialog(noFocusable);
    expect(activeElementDeep()).toBe(surface);
    const styles = getComputedStyle(surface);
    expect(styles.outlineStyle).not.toBe('none');
    expect(styles.outlineWidth).not.toBe('0px');
  });

  // Review round 1 (Critical): the CANONICAL footer is ki-button (shadow
  // delegatesFocus, no host tabindex) wrapped in a container — the shape every
  // story/harness uses. Entry focus must reach the autofocus action, and Tab
  // must keep the actions keyboard-reachable (never hijacked to the surface).
  it('S6/S7 makes ki-button footer actions focusable and keyboard-reachable', async () => {
    cleanup();
    const el = await mountDialog(
      {},
      document.body,
      `<p>This permanently deletes your account.</p>
       <div slot="footer">
         <ki-button id="cancel">Cancel</ki-button>
         <ki-button id="confirm" autofocus>Delete</ki-button>
       </div>`,
    );
    // Wait for the slotted ki-buttons to hydrate (shadow + inner control)
    // before opening — in real usage the actions exist before the dialog opens.
    await waitFor(
      () => Boolean(el.querySelector('#confirm')?.shadowRoot?.querySelector('button')),
      'ki-button actions hydrated',
    );
    await openDialog(el);

    // Entry focus lands inside the autofocus ki-button (delegatesFocus → its
    // internal native button in the ki-button shadow), NOT on the bare dialog
    // surface. The focused node lives in a slotted child's shadow, so we check
    // containment against the ki-button host, not the internal <dialog>.
    const confirm = requireEl(el, '#confirm');
    const cancel = requireEl(el, '#cancel');
    const inAction = (node: Element | null): boolean =>
      node !== null &&
      (confirm.shadowRoot?.contains(node) === true || cancel.shadowRoot?.contains(node) === true);

    // Let entry focus settle (native showModal auto-focus + the deferred
    // slotted-content focus assist resolve across a frame).
    await waitFor(
      () => Boolean(confirm.shadowRoot?.contains(activeElementDeep())),
      'entry focus reaches the autofocus ki-button',
    );
    expect(activeElementDeep()).not.toBe(internalDialog(el));
    expect(confirm.shadowRoot?.contains(activeElementDeep())).toBe(true);

    // Tab reaches the other action; focus never gets stuck on the surface.
    await userEvent.keyboard('{Tab}');
    expect(activeElementDeep()).not.toBe(internalDialog(el));
    expect(inAction(activeElementDeep())).toBe(true);

    await el.close();
  });

  it('S7 Tab from the last focusable action keeps focus inside the open dialog', async () => {
    cleanup();
    const behind = document.createElement('button');
    behind.textContent = 'Background action';
    document.body.append(behind);
    const el = await mountDialog();
    await openDialog(el);
    const deleteButton = footerButton(el, 'Delete');

    deleteButton.focus();
    deleteButton.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        key: 'Tab',
      }),
    );

    expect(activeElementDeep()).not.toBe(behind);
    expect(isInsideDialog(el, activeElementDeep())).toBe(true);
  });

  it('S8 Escape closes the dialog with reason escape and returns focus to the opener', async () => {
    cleanup();
    const opener = document.createElement('button');
    opener.textContent = 'Delete account';
    document.body.append(opener);
    const el = await mountDialog();
    opener.addEventListener('click', () => {
      void el.show();
    });

    opener.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => el.open, 'dialog opened from keyboard');
    const closed = nextClose(el);
    await userEvent.keyboard('{Escape}');
    const event = await closed;

    expect(el.open).toBe(false);
    expect(event.detail.reason).toBe('escape');
    expect(document.activeElement).toBe(opener);
  });

  it('S9 exposes the open dialog as a named modal dialog with zero axe violations', async () => {
    cleanup();
    const main = document.createElement('main');
    document.body.append(main);
    const el = await mountDialog({}, main);

    await openDialog(el);

    await expect.element(page.getByRole('dialog', { name: 'Delete account?' })).toBeInTheDocument();
    expect(internalDialog(el).matches(':modal')).toBe(true);
    const results = await axe.run(main);
    expect(results.violations).toEqual([]);
  });

  it('S10 hides background links from assistive technology while open and restores them after close', async () => {
    cleanup();
    const main = document.createElement('main');
    const settings = document.createElement('a');
    settings.href = '#settings';
    settings.textContent = 'Settings';
    main.append(settings);
    document.body.append(main);
    const el = await mountDialog({}, main);

    await expect.element(page.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
    await openDialog(el);
    settings.focus();
    expect(document.activeElement).not.toBe(settings);

    await el.close();
    await waitFor(() => !el.open, 'dialog closed before background restore assertion');
    await expect.element(page.getByRole('link', { name: 'Settings' })).toBeInTheDocument();
  });

  it('S10 focus-return edges fall back to body or preserve outside focus as specified', async () => {
    cleanup();
    const scrollStart = window.scrollY;
    const opener = document.createElement('button');
    opener.textContent = 'Delete account';
    document.body.append(opener);
    const removedInvokerDialog = await mountDialog();
    opener.focus();
    await openDialog(removedInvokerDialog);
    opener.remove();
    await removedInvokerDialog.close();
    await waitFor(() => !removedInvokerDialog.open, 'removed-invoker dialog closed');
    await waitFor(
      () => document.activeElement === document.body,
      'removed invoker focus fell back',
    );
    expect(document.activeElement).toBe(document.body);
    expect(window.scrollY).toBe(scrollStart);
    removedInvokerDialog.remove();

    document.body.tabIndex = -1;
    document.body.focus({ preventScroll: true });
    document.body.removeAttribute('tabindex');
    const initialOpen = await mountDialog({ open: true });
    await waitFor(
      () => initialOpen.open && internalDialog(initialOpen).open,
      'initial open dialog opened',
    );
    await initialOpen.close();
    await waitFor(() => !initialOpen.open, 'initial open dialog closed');
    await waitFor(() => document.activeElement === document.body, 'initial open focus fell back');
    expect(document.activeElement).toBe(document.body);

    initialOpen.remove();
  });

  it('S11 material3 restyles the dialog surface and backdrop through tokens alone', async () => {
    cleanup();
    ensureTokens();
    const baseline = await mountDialog();
    await openDialog(baseline);
    const baselineDialog = internalDialog(baseline);
    const onmarsBg = getComputedStyle(baselineDialog).backgroundColor;
    const onmarsRadius = getComputedStyle(baselineDialog).borderRadius;
    await baseline.close();
    baseline.remove();

    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    const el = await mountDialog();
    await openDialog(el);
    await new Promise((resolve) => setTimeout(resolve, 250));
    const dialog = internalDialog(el);
    const styles = getComputedStyle(dialog);
    const backdrop = getComputedStyle(dialog, '::backdrop');

    expect(styles.backgroundColor).toBe(readToken('--ki-dialog-bg'));
    expect(styles.backgroundColor).not.toBe(onmarsBg);
    expect(styles.borderRadius).toBe(readToken('--ki-dialog-radius'));
    expect(styles.borderRadius).not.toBe(onmarsRadius);
    expect(backdrop.backgroundColor).toBe(readToken('--ki-dialog-backdrop-bg'));
  });

  it('S13 dialog actions follow the right-to-left writing direction', async () => {
    cleanup();
    document.documentElement.setAttribute('dir', 'rtl');
    const el = await mountDialog();
    await openDialog(el);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const actions = [...el.querySelectorAll<HTMLButtonElement>('[slot="footer"]')].map((action) =>
      action.textContent.trim(),
    );

    expect(getComputedStyle(internalDialog(el)).direction).toBe('rtl');
    expect(actions).toEqual(['Cancel', 'Delete']);
  });

  it('S14 reduced motion suppresses material3 open transitions', async () => {
    cleanup();
    ensureTokens();
    ensureMaterial3Tokens();
    document.documentElement.setAttribute('data-ki-theme', 'material3');
    await browserCommands.emulateReducedMotion('reduce');
    const el = await mountDialog();

    await openDialog(el);
    const styles = getComputedStyle(internalDialog(el));

    expect(styles.transitionDuration).toBe('0s');
    expect(styles.opacity).toBe('1');
    await browserCommands.emulateReducedMotion(null);
  });
});
