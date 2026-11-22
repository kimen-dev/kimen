// @spec:158-native-tables
// A table from a spec inside the real ki-table (spec 158 S1, S3): the spec
// reaches the packaged surface document, exactly as the adapter delivers it,
// through the reference SDK's own `AppBridge`. The document registers the
// real @kimen/elements, so ki-table's own stylesheet styles the native table
// the guarded renderer built, and the host page's token reassignment alone
// restyles it.
import { AppBridge, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-bridge';
import { afterEach, describe, expect, it } from 'vitest';

import { createKimenSurfaceResource, surfaceToolResult } from '../src/index.js';
import { TEXT_MESSAGE_CAPABILITIES } from '../tests/spec-messages.js';

const FRAME_TITLE = 'Kimen surface';
const TABLE_TAGS = 'table, caption, thead, tbody, tr, th, td';

type ViewWindow = Window & typeof globalThis;

const teardown: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  for (const dispose of teardown.splice(0)) {
    await dispose();
  }
});

const cell = (tag: 'td' | 'th', children: readonly unknown[], scope?: 'col' | 'row') => ({
  component: tag,
  ...(scope === undefined ? {} : { props: { scope } }),
  slots: { '': children },
});
const badge = (label: string) => ({ component: 'ki-badge', slots: { '': [label] } });
const row = (...cells: readonly unknown[]) => ({ component: 'tr', slots: { '': cells } });

const pedidosSpec = {
  actions: [],
  root: {
    component: 'ki-table',
    slots: {
      '': [
        {
          component: 'table',
          slots: {
            '': [
              { component: 'caption', slots: { '': ['Pedidos'] } },
              {
                component: 'thead',
                slots: { '': [row(cell('th', ['Pedido'], 'col'), cell('th', ['Estado'], 'col'))] },
              },
              {
                component: 'tbody',
                slots: {
                  '': [
                    row(cell('th', ['A-17'], 'row'), cell('td', [badge('Pendiente')])),
                    row(cell('th', ['A-18'], 'row'), cell('td', [badge('Enviado')])),
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  },
  version: 1,
};

/** Embeds the packaged document like a host and completes the handshake. */
async function embed(): Promise<{ bridge: AppBridge; view: ViewWindow }> {
  const frame = document.createElement('iframe');
  frame.title = FRAME_TITLE;
  // The sandbox a conforming host gives the View (apps.mdx:475).
  frame.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  frame.style.inlineSize = '480px';
  frame.style.blockSize = '320px';
  frame.srcdoc = createKimenSurfaceResource('pedidos').text;
  document.body.append(frame);
  const view = frame.contentWindow as ViewWindow | null;
  if (view === null) {
    throw new Error('the surface frame has no window');
  }
  const bridge = new AppBridge(
    null,
    { name: 'reference-host', version: '2.0.4' },
    TEXT_MESSAGE_CAPABILITIES,
  );
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
  return { bridge, view };
}

describe('158 — a table from a spec inside the real ki-table', () => {
  it('S1 the surface holds one captioned table with a header row and two body rows of badges', async () => {
    const { bridge, view } = await embed();

    await bridge.sendToolResult(surfaceToolResult(pedidosSpec, 'Pedidos'));

    await expect
      .poll(() => view.document.querySelectorAll('ki-table > table > tbody > tr').length)
      .toBe(2);
    const tables = view.document.querySelectorAll('table');
    expect(tables).toHaveLength(1);
    const table = tables[0];
    expect(table?.querySelector(':scope > caption')?.textContent).toBe('Pedidos');
    const head = table?.querySelectorAll(':scope > thead > tr') ?? [];
    expect(head).toHaveLength(1);
    expect([...(head[0]?.children ?? [])].map((element) => element.localName)).toEqual([
      'th',
      'th',
    ]);
    for (const bodyRow of table?.querySelectorAll(':scope > tbody > tr') ?? []) {
      const last = bodyRow.lastElementChild;
      expect(last?.localName).toBe('td');
      expect(last?.firstElementChild).toBeInstanceOf(view.customElements.get('ki-badge'));
    }
  });

  it('S3 reassigning --ki-table-header-bg alone restyles the head of a table from a spec', async () => {
    const { bridge, view } = await embed();
    view.document.documentElement.style.setProperty('--ki-table-header-bg', 'rgb(10, 20, 30)');

    await bridge.sendToolResult(surfaceToolResult(pedidosSpec, 'Pedidos'));

    await expect
      .poll(() => {
        const head = view.document.querySelector('ki-table > table > thead');
        return head === null ? null : view.getComputedStyle(head).backgroundColor;
      })
      .toBe('rgb(10, 20, 30)');
    const elements = [...view.document.querySelectorAll(TABLE_TAGS)];
    // table, caption, thead, tbody, three tr, four th and two td.
    expect(elements).toHaveLength(13);
    expect(elements.filter((element) => element.hasAttribute('style'))).toEqual([]);
  });
});
