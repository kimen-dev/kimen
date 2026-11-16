// @spec:040-surface-action-relay
// The relay against the reference host (spec 040 S15, SC-003): the packaged
// surface document, exactly as the adapter delivers it, in a sandboxed frame
// of a real engine, embedded by the reference SDK's own `AppBridge`
// (`@modelcontextprotocol/ext-apps` 2.0.4, the revision COMPAT.md pins). The
// bridge validates every View request against the SDK's schema — the
// `ui/message` content shape included — before its handler sees it, so a
// message that reaches `onmessage` is one the reference host accepts.
import type { McpUiMessageRequest } from '@modelcontextprotocol/ext-apps/app-bridge';
import { AppBridge, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-bridge';
import { afterEach, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import {
  acknowledgeSurfaceAction,
  createKimenSurfaceResource,
  KIMEN_ACTION_TOOL,
  SURFACE_ACTION_RELAY_PREFIX,
  surfaceToolResult,
} from '../src/index.js';
import { confirmSurface, TEXT_MESSAGE_CAPABILITIES } from '../tests/spec-messages.js';

const FRAME_TITLE = 'Kimen surface';

const teardown: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  for (const dispose of teardown.splice(0)) {
    await dispose();
  }
});

it('S15 relays an activated control to the reference host message handler', async () => {
  const frame = document.createElement('iframe');
  frame.title = FRAME_TITLE;
  // The sandbox a conforming host gives the View (apps.mdx:475).
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  frame.style.inlineSize = '480px';
  frame.style.blockSize = '320px';
  frame.srcdoc = createKimenSurfaceResource('inventory').text;
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
  const messages: McpUiMessageRequest['params'][] = [];
  bridge.oncalltool = (params) => {
    calls.push(params);
    // The integrating server: acknowledges the declared action, asks for relay.
    return Promise.resolve({
      ...acknowledgeSurfaceAction(String(params.arguments?.['action']), { relay: true }),
    });
  };
  bridge.onmessage = (params) => {
    messages.push(params);
    return Promise.resolve({});
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
  await bridge.sendToolResult(surfaceToolResult(confirmSurface, 'Confirm the order'));
  await page
    .frameLocator(page.getByTitle(FRAME_TITLE))
    .getByRole('button', { name: 'Confirm' })
    .click();

  await expect.poll(() => messages).toHaveLength(1);
  expect(calls).toEqual([
    expect.objectContaining({
      arguments: { action: 'confirm', data: {} },
      name: KIMEN_ACTION_TOOL,
    }),
  ]);
  expect(messages[0]).toEqual({
    content: [
      { text: `${SURFACE_ACTION_RELAY_PREFIX}{"action":"confirm","data":{}}`, type: 'text' },
    ],
    role: 'user',
  });
});
