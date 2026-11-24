// @spec:162-action-rate-budget
// S2 with the real ki-carousel: a looping carousel that rotates every
// millisecond inside a closed ki-details, where no one can see or pause it,
// bound by name to a declared action. Measured on main at 14909122 before
// the budget: about 215 actions per second through renderUiSpec and about
// 195 action tool calls per second through MCP Apps. The budget (a burst of
// 10, then one every 500 ms) allows at most 12 in the first second. Real
// time on purpose: rotation and smooth scrolling run on the engine's own
// clock, and an upper bound cannot be broken by a slow machine.
import type { McpUiMessageRequest } from '@modelcontextprotocol/ext-apps/app-bridge';
import { AppBridge, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-bridge';
import { createLiveSurface, renderUiSpec } from '@kimen/catalog';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  acknowledgeSurfaceAction,
  createKimenSurfaceResource,
  KIMEN_ACTION_TOOL,
  surfaceToolResult,
} from '../src/index.js';
import { TEXT_MESSAGE_CAPABILITIES } from '../tests/spec-messages.js';

vi.setConfig({ testTimeout: 30_000 });

type ViewWindow = Window & typeof globalThis;

const WINDOW_MS = 1_000;
const MOST = 12;
const FRAME_TITLE = 'Kimen surface';

const teardown: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  for (const dispose of teardown.splice(0)) {
    await dispose();
  }
});

/** A looping carousel rotating every millisecond, inside a closed disclosure. */
const hiddenCarousel = {
  component: 'ki-details',
  props: { summary: 'More' },
  slots: {
    '': [
      {
        action: 'slide',
        component: 'ki-carousel',
        props: { autoplay: 1, label: 'Highlights', loop: true },
        slots: {
          '': ['One', 'Two', 'Three'].map((text) => ({
            component: 'ki-carousel-item',
            slots: { '': [text] },
          })),
        },
      },
    ],
  },
};

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

/** The packaged document in a same-origin frame, its body emptied for a host-built surface. */
async function hostPage(): Promise<ViewWindow> {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
  frame.style.inlineSize = '480px';
  frame.style.blockSize = '360px';
  frame.srcdoc = createKimenSurfaceResource('rate').text;
  document.body.append(frame);
  teardown.push(() => {
    frame.remove();
  });
  await expect
    .poll(() => frame.contentWindow?.customElements.get('ki-carousel') !== undefined)
    .toBe(true);
  const view = frame.contentWindow as ViewWindow;
  view.document.body.replaceChildren();
  return view;
}

function mainIn(view: ViewWindow): HTMLElement {
  const surface = view.document.createElement('main');
  view.document.body.append(surface);
  return surface;
}

describe('S2 a carousel that rotates every millisecond cannot flood the host', () => {
  it('S2 a page that renders the spec once receives at most 12 "slide" actions', async () => {
    const surface = mainIn(await hostPage());
    let count = 0;
    const result = renderUiSpec(
      { actions: ['slide'], root: hiddenCarousel, version: 1 },
      {
        onAction: (event) => {
          if (event.action === 'slide') count += 1;
        },
        surface,
      },
    );
    expect(result.diagnostics).toEqual([]);
    await wait(WINDOW_MS);
    const seen = count;
    expect(seen).toBeGreaterThan(0);
    expect(seen).toBeLessThanOrEqual(MOST);
  });

  it('S2 a live surface receives at most 12 "slide" actions', async () => {
    const surface = mainIn(await hostPage());
    let count = 0;
    const live = createLiveSurface({
      actions: ['slide'],
      onAction: (event) => {
        if (event.action === 'slide') count += 1;
      },
      surface,
    });
    expect(live.apply({ ops: [{ node: hiddenCarousel, op: 'insert' }] }).diagnostics).toEqual([]);
    await wait(WINDOW_MS);
    const seen = count;
    expect(seen).toBeGreaterThan(0);
    expect(seen).toBeLessThanOrEqual(MOST);
  });

  it('S2 an MCP Apps host receives at most 12 action tool calls', async () => {
    const frame = document.createElement('iframe');
    frame.title = FRAME_TITLE;
    // The sandbox a conforming host gives the View (apps.mdx:475).
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    frame.style.inlineSize = '480px';
    frame.style.blockSize = '320px';
    frame.srcdoc = createKimenSurfaceResource('rate').text;
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
    let calls = 0;
    const messages: McpUiMessageRequest['params'][] = [];
    bridge.oncalltool = (params) => {
      if (params.name === KIMEN_ACTION_TOOL) calls += 1;
      // The integrating server relays every action it is sent (spec 040).
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
    await bridge.connect(new PostMessageTransport(view, view));
    teardown.push(async () => {
      await bridge.close();
      frame.remove();
    });
    await initialized;
    await bridge.sendToolInput({ arguments: {} });
    await bridge.sendToolResult(
      surfaceToolResult({ actions: ['slide'], root: hiddenCarousel, version: 1 }, 'Highlights'),
    );
    await wait(WINDOW_MS);
    const seen = calls;
    expect(seen).toBeGreaterThan(0);
    expect(seen).toBeLessThanOrEqual(MOST);
    expect(messages.length).toBeLessThanOrEqual(MOST);
  });
});
