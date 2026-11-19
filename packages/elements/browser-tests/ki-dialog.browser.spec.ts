// @spec:062-solid-surface-background
import material3Css from '@kimen/tokens/css/material3?raw';
// @spec:012-ki-dialog
// Real-browser tests consume the BUILT custom-elements output (what ships is
// what is asserted), never internals (Art. III). mock-doc has no showModal,
// top layer, inertness, Escape close requests, or ::backdrop.
import tokensCss from '@kimen/tokens/css?raw';
import { beforeAll, describe, expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { defineCustomElement as defineKiAlert } from '../dist/components/ki-alert.js';
import { defineCustomElement as defineKiButton } from '../dist/components/ki-button.js';
import { defineCustomElement } from '../dist/components/ki-dialog.js';
import { defineCustomElement as defineKiVideo } from '../dist/components/ki-video.js';
import { expectAccessible } from './axe';
import { repaintedUnderForcedDark } from './color-scheme';
import { moveToNewParent } from './reconnect';

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
beforeAll(() => {
  defineCustomElement();
  defineKiAlert();
  defineKiButton();
  defineKiVideo();
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
  // The footer region shows its actions one render after the dialog loads.
  // Until then they cannot take focus, so a test that opens the dialog and
  // presses Tab at once would race that render. The enter transition used to
  // hide the race; under reduced motion there is none, and nothing may rest
  // on it.
  await waitFor(() => footerSettled(el), 'ki-dialog footer region matches its actions');
  return el;
}

/** The footer region is shown exactly when the dialog has footer actions. */
function footerSettled(el: KiDialogElement): boolean {
  const footer = el.shadowRoot?.querySelector<HTMLElement>('[part="footer"]');
  return footer?.hidden === !el.querySelector('[slot="footer"]');
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
  // The enter fade/rise runs under no-preference; geometry and axe scans must
  // observe the settled surface, never a mid-transition frame.
  await waitFor(() => getComputedStyle(internalDialog(el)).opacity === '1', 'dialog enter settled');
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

describe('ki-dialog live content and interaction boundaries', () => {
  it('S1 updates footer visibility when actions are added and removed while open', async () => {
    cleanup();
    const el = await mountDialog({}, document.body, '<p>Review the decision.</p>');
    await openDialog(el);
    const footer = requireEl(internalDialog(el), '[part="footer"]');
    expect(footer.hidden).toBe(true);

    const action = document.createElement('button');
    action.slot = 'footer';
    action.textContent = 'Confirm';
    el.append(action);
    await expect.poll(() => footer.hidden).toBe(false);
    await expect.element(action).toBeVisible();

    action.remove();
    await expect.poll(() => footer.hidden).toBe(true);
    expect(el.open).toBe(true);
    await el.close();
  });

  it('S9 updates the visible title and accessible name, and removes a blank title', async () => {
    cleanup();
    const el = await mountDialog();
    await openDialog(el);
    el.heading = 'Keep the account?';
    await expect.element(page.getByRole('dialog', { name: 'Keep the account?' })).toBeVisible();
    await expect.element(page.getByRole('heading', { name: 'Keep the account?' })).toBeVisible();

    el.heading = '   ';
    await expect.element(page.getByRole('dialog')).toHaveAccessibleName('');
    expect(el.shadowRoot?.querySelector('[part="heading"]')).toBeNull();
    expect(el.open).toBe(true);
    await el.close();
  });

  it('S7 preserves forward and reverse tab order and ignores unrelated keys', async () => {
    cleanup();
    const el = await mountDialog(
      {},
      document.body,
      `
      <button slot="footer">First</button>
      <button slot="footer">Middle</button>
      <button slot="footer">Last</button>
    `,
    );
    await openDialog(el);
    const first = footerButton(el, 'First');
    const middle = footerButton(el, 'Middle');
    const last = footerButton(el, 'Last');
    first.focus();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await expect.poll(() => document.activeElement).toBe(last);
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(last);
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await expect.poll(() => document.activeElement).toBe(middle);
    await userEvent.keyboard('{Tab}');
    await expect.poll(() => document.activeElement).toBe(last);
    await userEvent.keyboard('{Tab}');
    await expect.poll(() => document.activeElement).toBe(first);
    await el.close();
  });

  it('S4 a press on the backdrop released inside does not dismiss or arm a later click', async () => {
    cleanup();
    const el = await mountDialog({ 'close-on-backdrop': true });
    await openDialog(el);
    const dialog = internalDialog(el);
    const rect = dialog.getBoundingClientRect();
    const outside = { clientX: rect.left - 4, clientY: rect.top + rect.height / 2 };
    dialog.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, ...outside }));
    dialog.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      }),
    );
    expect(dialog.open).toBe(true);

    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true, ...outside }));
    expect(dialog.open).toBe(true);
    expect(el.open).toBe(true);
    await el.close();
  });
});

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

    await expectAccessible(main);

    await openDialog(el);
    await expectAccessible(main);
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

  // The window can change size while no dialog is in the document: a phone
  // turned, a window resized, a dialog a framework mounts only to open it.
  // The next dialog has to fit the window it opens in. WebKit resolves
  // viewport units in a component's styles against the window size the last
  // instance saw when no instance was there to see the resize.
  it('S15 a dialog created after the window shrank fits the window it opens in', async () => {
    cleanup();
    const details = '<p>Line of the details.</p>'.repeat(14);
    try {
      const before = await mountDialog({}, document.body, details);
      await openDialog(before);
      await before.close();
      before.remove();

      await page.viewport(320, 256);
      const el = await mountDialog({}, document.body, details);
      await openDialog(el);

      const box = internalDialog(el).getBoundingClientRect();
      expect(box.height).toBeLessThanOrEqual(window.innerHeight);
      expect(box.width).toBeLessThanOrEqual(window.innerWidth);
      const body = bodyPart(el);
      expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
      await el.close();
    } finally {
      await page.viewport(414, 896);
    }
  });

  // WCAG 2.1.1 at 400% zoom (320x256): the body is the only way to read the
  // overflowing copy, so it has to be a Tab stop that the native scroll keys
  // operate — and stop being one as soon as the content fits again.
  it('S7 S15 an overflowing body is a Tab stop that scrolls from the keyboard', async () => {
    cleanup();
    await page.viewport(320, 256);
    try {
      const main = document.createElement('main');
      document.body.append(main);
      const el = await mountDialog(
        {},
        main,
        `${'<p>Line of the details.</p>'.repeat(14)}
         <ki-button slot="footer" id="cancel">Cancel</ki-button>
         <ki-button slot="footer" id="delete">Delete</ki-button>`,
      );
      const cancel = requireEl(el, '#cancel');
      const remove = requireEl(el, '#delete');
      await waitFor(
        () => Boolean(remove.shadowRoot?.querySelector('button')),
        'ki-button actions hydrated',
      );
      await openDialog(el);
      const body = bodyPart(el);
      expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
      await expect.poll(() => cancel.shadowRoot?.contains(activeElementDeep())).toBe(true);

      // The body precedes the footer actions, so Shift+Tab from the first
      // action reaches it, with a visible focus indicator.
      await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
      await expect.poll(() => activeElementDeep()).toBe(body);
      expect(getComputedStyle(body).outlineStyle).not.toBe('none');
      await expectAccessible(main);

      expect(body.scrollTop).toBe(0);
      await userEvent.keyboard('{ArrowDown}');
      await expect.poll(() => body.scrollTop).toBeGreaterThan(0);
      await userEvent.keyboard('{End}');
      await expect
        .poll(() => Math.ceil(body.scrollTop + body.clientHeight))
        .toBeGreaterThanOrEqual(body.scrollHeight);

      // The cycle is body -> Cancel -> Delete -> body, in both directions.
      await userEvent.keyboard('{Tab}');
      await expect.poll(() => cancel.shadowRoot?.contains(activeElementDeep())).toBe(true);
      await userEvent.keyboard('{Tab}');
      await expect.poll(() => remove.shadowRoot?.contains(activeElementDeep())).toBe(true);
      await userEvent.keyboard('{Tab}');
      await expect.poll(() => activeElementDeep()).toBe(body);
      await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
      await expect.poll(() => remove.shadowRoot?.contains(activeElementDeep())).toBe(true);

      // Room for the whole copy: the body leaves the cycle again.
      await page.viewport(414, 896);
      await expect.poll(() => body.scrollHeight <= body.clientHeight).toBe(true);
      await expect.poll(() => body.tabIndex).toBe(-1);
      await userEvent.keyboard('{Tab}');
      await expect.poll(() => cancel.shadowRoot?.contains(activeElementDeep())).toBe(true);

      await el.close();
    } finally {
      await page.viewport(414, 896);
    }
  });

  // The stop is there on open, before any key is pressed (what a scan of the
  // open dialog sees), and a dialog moved in the document keeps getting it.
  it('S15 an overflowing body is a Tab stop as soon as the dialog opens, also after it is moved', async () => {
    cleanup();
    await page.viewport(320, 256);
    try {
      const el = await mountDialog(
        {},
        document.body,
        `${'<p>Line of the details.</p>'.repeat(14)}
         <button slot="footer" type="button">Close</button>`,
      );
      await openDialog(el);
      await expect.poll(() => bodyPart(el).tabIndex).toBe(0);
      await el.close();
      // The exit fade finishes and the body, without a box, drops its stop.
      await waitFor(
        () => getComputedStyle(internalDialog(el)).display === 'none',
        'dialog exit settled before the move',
      );
      await expect.poll(() => bodyPart(el).tabIndex).toBe(-1);

      const section = document.createElement('section');
      document.body.append(section);
      section.append(el);
      await openDialog(el);

      await expect.poll(() => bodyPart(el).tabIndex).toBe(0);
      await el.close();
    } finally {
      await page.viewport(414, 896);
    }
  });

  it('S1 a dialog moved to another parent while open stays modal and closes once', async () => {
    cleanup();
    const el = await mountDialog();
    const events: CloseReason[] = [];
    el.addEventListener('ki-close', (event) => {
      events.push((event as KiCloseEvent).detail.reason);
    });
    await openDialog(el);

    // Removal takes a native dialog out of the top layer and leaves it open:
    // back in the document it would sit in the page flow, open and not modal.
    moveToNewParent(el);

    await waitFor(() => internalDialog(el).matches(':modal'), 'moved dialog is modal again');
    expect(el.open).toBe(true);
    expect(el.hasAttribute('open')).toBe(true);
    expect(events).toEqual([]);

    await userEvent.keyboard('{Escape}');
    await waitFor(() => events.length === 1, 'moved dialog reported its close');
    expect(events).toEqual(['escape']);
    expect(el.open).toBe(false);
    expect(internalDialog(el).open).toBe(false);
  });

  it('S15 a dialog closed while out of the document is closed when it returns and reports it once', async () => {
    cleanup();
    const el = await mountDialog();
    const events: CloseReason[] = [];
    el.addEventListener('ki-close', (event) => {
      events.push((event as KiCloseEvent).detail.reason);
    });
    await openDialog(el);

    el.remove();
    await el.close();
    document.body.append(el);

    await waitFor(() => !internalDialog(el).open, 'dialog closed while detached is not shown');
    await waitFor(() => events.length === 1, 'close while detached reported once');
    expect(events).toEqual(['method']);
    expect(el.open).toBe(false);
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
    // Visible focus is a 3px spread-only ring composited onto the resting
    // elevation (the retired 2px opaque outline pair is gone).
    await waitFor(
      () => getComputedStyle(surface).boxShadow.includes('0px 0px 0px 3px'),
      'focus-visible surface shows its 3px focus ring',
    );
  });

  // A candidate that cannot take focus must never win the entry: focusing it is
  // a no-op that strands the dialog with nothing focused.
  it('S6 entry focus skips controls that cannot take focus and lands on the first real action', async () => {
    cleanup();
    const el = await mountDialog(
      {},
      document.body,
      `<input type="hidden" name="token" value="t" />
       <button type="button" hidden>Hidden</button>
       <button type="button" disabled>Disabled</button>
       <button type="button" tabindex="-1">Skipped</button>
       <div><button type="button" id="first-real">Keep account</button></div>
       <button slot="footer" type="button">Delete</button>`,
    );

    await openDialog(el);

    expect(activeElementDeep()).toBe(requireEl(el, '#first-real'));
    await el.close();
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

  // ki-alert renders its dismiss button in a shadow root that does NOT
  // delegate focus, so focusing the host is a no-op: the wrap has to land on
  // the control itself or the dismiss button is unreachable after leaving it.
  it('S7 Tab wraps back to a slotted control whose host does not delegate focus', async () => {
    cleanup();
    const el = await mountDialog(
      {},
      document.body,
      `<ki-alert dismissible heading="Heads up">Note</ki-alert>
       <button slot="footer" type="button">Cancel</button>
       <button slot="footer" type="button">Delete</button>`,
    );
    const alert = requireEl(el, 'ki-alert');
    await waitFor(
      () => Boolean(alert.shadowRoot?.querySelector('[part="dismiss"]')),
      'ki-alert hydrated its dismiss control',
    );
    await openDialog(el);
    const dismiss = alert.shadowRoot?.querySelector('[part="dismiss"]');
    await expect.poll(() => activeElementDeep()).toBe(dismiss);

    await userEvent.keyboard('{Tab}');
    await expect.poll(() => activeElementDeep()).toBe(footerButton(el, 'Cancel'));
    await userEvent.keyboard('{Tab}');
    await expect.poll(() => activeElementDeep()).toBe(footerButton(el, 'Delete'));
    await userEvent.keyboard('{Tab}');
    await expect.poll(() => activeElementDeep()).toBe(dismiss);

    await el.close();
  });

  // ki-video keeps its play button mounted after it yields to the native
  // player (the button fades out and hides). The trap went on counting that
  // hidden button as the video's focus stop: a wrap onto it focused nothing,
  // and Tab stopped advancing at whichever end of the dialog the video sat.
  // Once the facade has yielded, the stop is the native player itself.
  it('S7 Tab wraps onto the native player of a ki-video that leads the dialog', async () => {
    cleanup();
    const el = await mountDialog(
      {},
      document.body,
      `<ki-video label="Play the tour"><video muted playsinline width="320" height="180"></video></ki-video>
       <button slot="footer" type="button">Cancel</button>
       <button slot="footer" type="button">Delete</button>`,
    );
    const video = requireEl(el, 'ki-video');
    await waitFor(
      () => Boolean(video.shadowRoot?.querySelector('[part="play"]')),
      'ki-video hydrated its play control',
    );
    await openDialog(el);
    const play = video.shadowRoot?.querySelector('[part="play"]');
    const player = requireEl(el, 'video');

    // Before activation the play control is the stop the wrap lands on.
    footerButton(el, 'Delete').focus();
    await userEvent.keyboard('{Tab}');
    await expect.poll(() => activeElementDeep()).toBe(play);

    await userEvent.keyboard('{Enter}');
    await expect.poll(() => activeElementDeep()).toBe(player);
    footerButton(el, 'Delete').focus();
    await userEvent.keyboard('{Tab}');
    await expect.poll(() => activeElementDeep()).toBe(player);

    // A native player holds Tab stops of its own (its controls) while
    // document.activeElement stays the media element, so the dialog must not
    // take a Tab pressed there: wrapping would skip those controls.
    const tab = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: 'Tab',
      shiftKey: true,
    });
    player.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);

    await el.close();
  });

  it('S7 Shift+Tab wraps onto the native player of a ki-video that closes the dialog', async () => {
    cleanup();
    const el = await mountDialog(
      {},
      document.body,
      `<button type="button">Details</button>
       <ki-video label="Play the tour"><video muted playsinline width="320" height="180"></video></ki-video>`,
    );
    const video = requireEl(el, 'ki-video');
    await waitFor(
      () => Boolean(video.shadowRoot?.querySelector('[part="play"]')),
      'ki-video hydrated its play control',
    );
    await openDialog(el);
    const details = requireEl(el, 'button');
    const player = requireEl(el, 'video');

    await userEvent.click(requireEl(video.shadowRoot ?? video, '[part="play"]'));
    await waitFor(() => player.hasAttribute('controls'), 'the facade yielded to the player');
    details.focus();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await expect.poll(() => activeElementDeep()).toBe(player);

    const tab = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      composed: true,
      key: 'Tab',
    });
    player.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);

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
    await expectAccessible(main);
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

  it('S12 honors a forced dark scheme: the open surface and its backdrop repaint', async () => {
    cleanup();
    const el = await mountDialog();
    await openDialog(el);

    expect(await repaintedUnderForcedDark(el)).toEqual(
      expect.arrayContaining(['dialog', 'dialog::backdrop']),
    );
    await el.close();
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
    const dialog = internalDialog(el);
    // Both themes paint a solid surface after #343. Check the fill change.
    await waitFor(
      () => getComputedStyle(dialog).backgroundColor !== onmarsBg,
      'dialog surface repainted for material3',
    );
    const styles = getComputedStyle(dialog);
    const backdrop = getComputedStyle(dialog, '::backdrop');

    expect(styles.backgroundImage).toBe('none');
    expect(styles.borderRadius).not.toBe(onmarsRadius);
    // The page behind stays dimmed under the second theme too.
    expect(backdrop.backgroundColor).not.toMatch(/, 0\)$/u);
  });

  it('S1 S3 renders the solid onmars modal surface, typography, and centering', async () => {
    cleanup();
    const el = await mountDialog();
    await openDialog(el);
    const dialog = internalDialog(el);
    const styles = getComputedStyle(dialog);

    // #343 supplies the solid fill and #342 removes the zero-radius filter.
    expect(styles.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(styles.backgroundImage).toBe('none');
    expect(styles.backdropFilter).toBe('none');

    expect(styles.borderRadius).toBe('18px');
    expect(styles.borderTopWidth).toBe('1px');
    expect(styles.borderTopStyle).toBe('solid');
    expect(styles.boxShadow).toContain('0px 20px 44px');

    // #347 gives the Calma dialog a display heading and keeps body copy 13/20.
    const shadow = el.shadowRoot;
    expect(shadow).not.toBeNull();
    if (!shadow) {
      throw new Error('ki-dialog did not attach a shadow root');
    }
    const heading = requireEl(shadow, '[part="heading"]');
    const headingStyles = getComputedStyle(heading);
    expect(headingStyles.textAlign).toBe('center');
    expect(headingStyles.fontSize).toBe('18px');
    expect(headingStyles.lineHeight).toBe('24px');
    expect(headingStyles.fontFamily).toMatch(/^["']?Newsreader["']?, Georgia, serif$/u);
    expect(headingStyles.fontWeight).toBe('500');

    const body = bodyPart(el);
    const bodyStyles = getComputedStyle(body);
    expect(bodyStyles.textAlign).toBe('center');
    expect(bodyStyles.fontSize).toBe('13px');
    expect(bodyStyles.lineHeight).toBe('20px');
    expect(bodyStyles.fontWeight).toBe('500');

    // Slotted body copy inherits the body_1 typography from part body.
    const paragraph = requireEl(el, 'p');
    expect(getComputedStyle(paragraph).fontSize).toBe('13px');
    expect(getComputedStyle(paragraph).lineHeight).toBe('20px');
  });

  // Modal master, compact (16414:19665): the surface has no padding of its
  // own; Modal-header pads 16/20 over a hairline, the body 20/20, and
  // Modal-actions 24/20 under a hairline, its actions 12px apart (CTAs).
  it('S1 splits the surface into the Modal master header, body and actions sections', async () => {
    cleanup();
    const el = await mountDialog();
    await openDialog(el);
    const shadow = el.shadowRoot;
    if (!shadow) {
      throw new Error('ki-dialog did not attach a shadow root');
    }
    const padding = (element: Element): string[] => {
      const style = getComputedStyle(element);
      return [
        style.paddingBlockStart,
        style.paddingBlockEnd,
        style.paddingInlineStart,
        style.paddingInlineEnd,
      ];
    };
    const heading = requireEl(shadow, '[part="heading"]');
    const body = bodyPart(el);
    const footer = requireEl(shadow, '[part="footer"]');

    expect(getComputedStyle(internalDialog(el)).paddingBlockStart).toBe('0px');
    expect(padding(heading)).toEqual(['16px', '16px', '20px', '20px']);
    expect(padding(body)).toEqual(['20px', '20px', '20px', '20px']);
    expect(padding(footer)).toEqual(['24px', '24px', '20px', '20px']);

    // Hairlines: below the header, above the actions, and nowhere else.
    expect(getComputedStyle(heading).borderBlockEndWidth).toBe('1px');
    expect(getComputedStyle(heading).borderBlockEndStyle).toBe('solid');
    expect(getComputedStyle(footer).borderBlockStartWidth).toBe('1px');
    expect(getComputedStyle(footer).borderBlockStartStyle).toBe('solid');
    expect(getComputedStyle(body).borderBlockStartWidth).toBe('0px');

    // The sections touch: the paddings alone space them.
    expect(heading.getBoundingClientRect().bottom).toBeCloseTo(body.getBoundingClientRect().top, 0);
    expect(body.getBoundingClientRect().bottom).toBeCloseTo(footer.getBoundingClientRect().top, 0);
    const cancel = footerButton(el, 'Cancel').getBoundingClientRect();
    const destroy = footerButton(el, 'Delete').getBoundingClientRect();
    expect(destroy.left - cancel.right).toBeCloseTo(12, 0);
    await el.close();
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
});

// Boolean presence semantics (native HTML parity): a present attribute means
// true whatever its value. Stencil >= 4.45 removes a host attribute when it
// reflects a parsed `false`, so these run against the built output.
describe('ki-dialog boolean presence in a real browser', () => {
  it('S16 open="false" in the markup opens the dialog modally', async () => {
    cleanup();
    const el = await mountDialog({ open: 'false' });
    await waitFor(() => internalDialog(el).open, 'dialog opened from open="false"');

    expect(el.open).toBe(true);
    expect(internalDialog(el).matches(':modal')).toBe(true);
    // Presence is normalized: the host attribute stays, with an empty value.
    expect(el.getAttribute('open')).toBe('');
    await el.close();
  });

  it('S16 open="false" written after the dialog moved to another parent opens it modally', async () => {
    cleanup();
    const el = await mountDialog();
    moveToNewParent(el);

    el.setAttribute('open', 'false');
    await waitFor(() => internalDialog(el).open, 'moved dialog opened from open="false"');

    expect(el.open).toBe(true);
    expect(internalDialog(el).matches(':modal')).toBe(true);
    // Normalized when the dialog next renders, after the native open above.
    await expect.poll(() => el.getAttribute('open')).toBe('');
    await el.close();
  });

  it('S16 open="false" written after the first render opens the dialog modally', async () => {
    cleanup();
    const el = await mountDialog();
    el.setAttribute('open', 'false');
    await waitFor(() => internalDialog(el).open, 'dialog opened from a later open="false"');

    expect(el.open).toBe(true);
    expect(internalDialog(el).matches(':modal')).toBe(true);
    // Presence is normalized: the host attribute stays, with an empty value,
    // once the dialog next renders (after the native open above).
    await expect.poll(() => el.getAttribute('open')).toBe('');
    await el.close();
  });
});
