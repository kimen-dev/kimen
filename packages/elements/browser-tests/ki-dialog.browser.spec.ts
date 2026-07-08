import axe from 'axe-core';
import { userEvent } from 'vitest/browser';
import { beforeAll, describe, expect, it } from 'vitest';

// @spec:012-ki-dialog
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). mock-doc has no showModal,
// top layer, inertness, Escape close requests, or ::backdrop.
import tokensCss from '@kimen/tokens/css?raw';
import { defineCustomElement } from '../dist/components/ki-dialog.js';

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

beforeAll(() => {
  defineCustomElement();
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
  el.innerHTML = `
    <p>This action permanently deletes your account.</p>
    <button slot="footer" type="button">Cancel</button>
    <button slot="footer" type="button">Delete</button>
  `;
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
});
