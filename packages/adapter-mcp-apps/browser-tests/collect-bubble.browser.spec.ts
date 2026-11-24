// @spec:153-action-collect
// S13 with the real components, as the Claude desktop app showed it on
// 2026-11-24: a blocked action with two invalid collected fields left the
// browser's own message bubble on the second field while the focus went to
// the first. An engine shows one bubble at a time, so only the field that
// takes the focus may be asked through `reportValidity()`; every invalid
// field still shows its own message line. The packaged surface document is
// embedded by the reference SDK's `AppBridge`, as in relay.browser.spec.ts.
import { AppBridge, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-bridge';
import { afterEach, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import { createKimenSurfaceResource, surfaceToolResult } from '../src/index.js';
import { TEXT_MESSAGE_CAPABILITIES } from '../tests/spec-messages.js';

const FRAME_TITLE = 'Kimen surface';

const teardown: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  for (const dispose of teardown.splice(0)) {
    await dispose();
  }
});

const formSpec = {
  actions: ['add'],
  root: {
    component: 'div',
    slots: {
      '': [
        {
          component: 'ki-input',
          id: 'f-title',
          props: { 'error-text': 'Enter a title.', label: 'Title', required: true },
        },
        {
          component: 'ki-number-input',
          id: 'f-qty',
          props: { 'invalid-number-message': 'Enter a number.', label: 'Quantity' },
        },
        {
          action: 'add',
          collect: { quantity: 'f-qty', title: 'f-title' },
          component: 'ki-button',
          props: { variant: 'primary' },
          slots: { '': ['Add'] },
        },
      ],
    },
  },
  version: 1,
};

/** The text a field's error part shows, or null when it shows none. */
function shownError(field: Element | null): string | null {
  const line = field?.shadowRoot?.querySelector<HTMLElement>('[part~="error"]');
  if (!line?.checkVisibility()) {
    return null;
  }
  const text = line.textContent.trim();
  return text === '' ? null : text;
}

/** The focused element's tag inside the frame, through open shadow roots. */
function focusPath(view: Window): string {
  const path: string[] = [];
  let active: Element | null = view.document.activeElement;
  while (active !== null) {
    path.push(active.localName);
    active = active.shadowRoot?.activeElement ?? null;
  }
  return path.join(' > ');
}

it('S13 the browser bubble of a blocked action opens on the field that takes the focus', async () => {
  const frame = document.createElement('iframe');
  frame.title = FRAME_TITLE;
  // The sandbox a conforming host gives the View (apps.mdx:475).
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  frame.style.inlineSize = '480px';
  frame.style.blockSize = '360px';
  frame.srcdoc = createKimenSurfaceResource('collect-bubble').text;
  document.body.append(frame);
  const view = frame.contentWindow;
  if (view === null) {
    throw new Error('the surface frame has no window');
  }
  const bridge = new AppBridge(
    null,
    { name: 'reference-host', version: '2.0.4' },
    TEXT_MESSAGE_CAPABILITIES,
  );
  const calls: unknown[] = [];
  bridge.oncalltool = (params) => {
    calls.push(params);
    return Promise.resolve({ content: [] });
  };
  const initialized = new Promise<void>((resolve) => {
    bridge.addEventListener('initialized', () => {
      resolve();
    });
  });
  // Connected before the View's first message: the frame loads asynchronously.
  await bridge.connect(new PostMessageTransport(view, view));
  teardown.push(async () => {
    await bridge.close();
    frame.remove();
  });
  await initialized;
  await bridge.sendToolInput({ arguments: {} });
  await bridge.sendToolResult(surfaceToolResult(formSpec, 'A form'));

  const surface = page.frameLocator(page.getByTitle(FRAME_TITLE));
  await surface.getByRole('spinbutton', { name: 'Quantity' }).fill('two');
  const title = view.document.querySelector('ki-input');
  const quantity = view.document.querySelector('ki-number-input');
  if (title === null || quantity === null) {
    throw new Error('the form did not render');
  }
  const reported: string[] = [];
  for (const [label, field] of [
    ['Title', title],
    ['Quantity', quantity],
  ] as const) {
    const report = (field as HTMLElement & { reportValidity(): boolean }).reportValidity.bind(
      field,
    );
    Object.defineProperty(field, 'reportValidity', {
      configurable: true,
      value: (): boolean => {
        reported.push(label);
        return report();
      },
    });
  }

  await surface.getByRole('button', { name: 'Add' }).click();

  await expect.poll(() => shownError(quantity)).toBe('Enter a number.');
  expect(shownError(title)).toBe('Enter a title.');
  expect(calls).toEqual([]);
  expect(reported).toEqual(['Title']);
  expect(focusPath(view)).toBe('ki-input > input');
});
