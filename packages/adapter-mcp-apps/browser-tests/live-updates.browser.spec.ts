// @spec:157-mcp-apps-live-updates
// The packaged surface document in a sandboxed frame of a real engine, with
// real Kimen fields: an update computed on the page's revision keeps the text
// the person is typing and the keyboard focus, a result without an update
// repaints as before, and an activated control names its node and the
// revision. The test IS the host: it hands the frame the resource text and
// speaks MCP Apps 2026-01-26 over postMessage (fixtures: ../tests/spec-messages.ts).
import { afterEach, describe, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import { createKimenSurfaceResource } from '../src/index.js';
import {
  addItemBatch,
  type Fixture,
  initializeResult,
  tasksSpec,
  toolResult,
} from '../tests/spec-messages.js';

const FRAME_TITLE = 'Kimen live surface';

type ViewWindow = Window & typeof globalThis;

interface Host {
  readonly received: Fixture[];
  readonly send: (message: Fixture) => void;
  readonly view: ViewWindow;
}

const teardown: (() => void)[] = [];

afterEach(() => {
  for (const dispose of teardown.splice(0)) {
    dispose();
  }
});

/** Embeds the packaged document as a conforming host does and completes the handshake. */
const embed = async (): Promise<Host> => {
  const frame = document.createElement('iframe');
  frame.title = FRAME_TITLE;
  // The sandbox the stable revision requires of a host (apps.mdx:475).
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  frame.style.inlineSize = '480px';
  frame.style.blockSize = '480px';
  const received: Fixture[] = [];
  const send = (message: Fixture): void => {
    frame.contentWindow?.postMessage(message, window.location.origin);
  };
  const onMessage = (event: MessageEvent<Fixture>): void => {
    if (event.source !== frame.contentWindow) {
      return;
    }
    received.push(event.data);
    const id = event.data['id'];
    if (event.data['method'] === 'ui/initialize' && typeof id === 'number') {
      send(initializeResult(id));
    }
  };
  window.addEventListener('message', onMessage);
  teardown.push(() => {
    window.removeEventListener('message', onMessage);
    frame.remove();
  });
  frame.srcdoc = createKimenSurfaceResource('tasks').text;
  document.body.append(frame);
  await expect
    .poll(() => received.map((message) => message['method']))
    .toContain('ui/notifications/initialized');
  return {
    received,
    send,
    get view(): ViewWindow {
      return frame.contentWindow as ViewWindow;
    },
  };
};

const surfaceFrame = () => page.frameLocator(page.getByTitle(FRAME_TITLE));

const titleField = () => surfaceFrame().getByRole('textbox', { name: 'Title' });

const actionArguments = (host: Host): unknown[] =>
  host.received
    .filter((message) => message['method'] === 'tools/call')
    .map((message) => (message['params'] as { arguments?: unknown } | undefined)?.arguments);

/** Paints the tasks surface and applies one update: the page is at revision 2. */
const atRevisionTwo = async (host: Host): Promise<void> => {
  host.send(toolResult(tasksSpec([])));
  host.send(
    toolResult(tasksSpec(['Item 1']), 'Tasks', {
      baseRevision: 1,
      batch: addItemBatch('Item 1', 0),
    }),
  );
  await expect.element(surfaceFrame().getByText('Item 1')).toBeVisible();
};

/** Whether the keyboard focus is inside the document's Kimen field "title". */
const titleHasFocus = (view: ViewWindow): boolean => {
  const active = view.document.activeElement;
  return active?.localName === 'ki-input' && active.shadowRoot?.activeElement != null;
};

describe('an MCP Apps surface changes without a full repaint', () => {
  it('S1 keeps the text the person is typing and the focus through an update on its revision', async () => {
    const host = await embed();
    await atRevisionTwo(host);
    await titleField().fill('Buy milk');
    expect(titleHasFocus(host.view)).toBe(true);

    host.send(
      toolResult(tasksSpec(['Item 1', 'Call Ana']), 'Tasks', {
        baseRevision: 2,
        batch: addItemBatch('Call Ana', 1),
      }),
    );

    await expect.element(surfaceFrame().getByText('Call Ana')).toBeVisible();
    await expect.element(titleField()).toHaveValue('Buy milk');
    expect(titleHasFocus(host.view)).toBe(true);
  });

  it('S4 repaints from the full spec when a result carries no update, as before', async () => {
    const host = await embed();
    await atRevisionTwo(host);
    await titleField().fill('Buy milk');

    host.send(toolResult(tasksSpec(['Item 1', 'Call Ana'])));

    await expect.element(surfaceFrame().getByText('Call Ana')).toBeVisible();
    await expect.element(titleField()).toHaveValue('');
  });

  it('S5 names the activated button and the revision in its action call', async () => {
    const host = await embed();
    await atRevisionTwo(host);

    await surfaceFrame().getByRole('button', { name: 'Add' }).click();

    await expect.poll(() => actionArguments(host)).toHaveLength(1);
    expect(actionArguments(host)[0]).toMatchObject({ action: 'add', id: 'add', revision: 2 });
  });
});
