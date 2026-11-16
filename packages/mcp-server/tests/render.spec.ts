// @spec:038-mcp-server
// Rendering goes only through the guarded renderer, inside an MCP Apps
// surface (S9-S11): the server never paints; it returns the adapter's
// surface result for the predeclared ui:// document, and a plain-text
// outline for hosts that do not display surfaces.
import {
  KIMEN_SURFACE_KEY,
  MCP_APPS_PROTOCOL_VERSIONS,
  SURFACE_DOCUMENT,
  SURFACE_MIME_TYPE,
  surfaceResourceUri,
} from '@kimen/adapter-mcp-apps';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { type Connection, connect, INVENTORY_SPEC, textOf } from './harness.js';

const SURFACE_URI = surfaceResourceUri('surface');

let server: Connection;

beforeAll(async () => {
  server = await connect();
});

afterAll(async () => {
  await server.close();
});

async function render(
  spec: unknown,
): Promise<Awaited<ReturnType<Connection['client']['callTool']>>> {
  return server.client.callTool({ arguments: { spec }, name: 'kimen_render_spec' });
}

describe('Kimen MCP server: render (038 S9-S11)', () => {
  it('S9: rendering a valid spec returns the Kimen surface the host paints through the guarded renderer', async () => {
    const { tools } = await server.client.listTools();
    const tool = tools.find((candidate) => candidate.name === 'kimen_render_spec');
    expect(tool?._meta).toEqual({ ui: { resourceUri: SURFACE_URI } });

    const result = await render(INVENTORY_SPEC);
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({ [KIMEN_SURFACE_KEY]: { spec: INVENTORY_SPEC } });

    const { resources } = await server.client.listResources();
    expect(resources.find((resource) => resource.uri === SURFACE_URI)?.mimeType).toBe(
      SURFACE_MIME_TYPE,
    );
    const { contents } = await server.client.readResource({ uri: SURFACE_URI });
    expect(contents).toHaveLength(1);
    const surface = contents[0] as {
      uri: string;
      mimeType?: string;
      text?: string;
      _meta?: unknown;
    };
    expect(surface.uri).toBe(SURFACE_URI);
    expect(surface.mimeType).toBe(SURFACE_MIME_TYPE);
    expect(surface.text).toBe(SURFACE_DOCUMENT);
    expect(surface._meta).toEqual({ ui: { csp: { connectDomains: [], resourceDomains: [] } } });
    expect(MCP_APPS_PROTOCOL_VERSIONS).toEqual(['2026-01-26']);
  });

  it('S9: a spec sent as JSON text renders as the parsed spec', async () => {
    const result = await render(JSON.stringify(INVENTORY_SPEC));
    expect(result.structuredContent).toEqual({ [KIMEN_SURFACE_KEY]: { spec: INVENTORY_SPEC } });
  });

  it('S10: a spec containing an "iframe" is never rendered: the validation issues come back instead', async () => {
    const spec = {
      root: { component: 'iframe', props: { src: 'https://evil.example' } },
      version: 1,
    };
    const validated = await server.client.callTool({
      arguments: { spec },
      name: 'kimen_validate_spec',
    });
    const result = await render(spec);
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toEqual(validated.structuredContent);
    expect(JSON.stringify(result)).not.toContain(KIMEN_SURFACE_KEY);
    expect(textOf(result)).toContain('unknown-component');
  });

  it('S10: a spec the renderer would refuse (33 levels deep) is never rendered', async () => {
    let node: Record<string, unknown> = { component: 'ki-card' };
    for (let level = 1; level < 33; level += 1) {
      node = { component: 'ki-card', slots: { '': [node] } };
    }
    const result = await render({ root: node, version: 1 });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).not.toContain(KIMEN_SURFACE_KEY);
  });

  it('S11: the text content outlines the card, its text, the button and its action, as plain text', async () => {
    const result = await render(INVENTORY_SPEC);
    const text = textOf(result);
    expect(text).toContain('ki-card');
    expect(text).toContain('"Inventory"');
    expect(text).toContain('ki-button');
    expect(text).toContain('"Refresh"');
    expect(text).toContain('action "refresh"');
    // Plain text even in a host that renders Markdown: the outline sits in
    // a code fence longer than any backtick run inside it.
    const lines = text.split('\n');
    const fence = lines.find((candidate) => /^`{3,}/u.test(candidate)) ?? '';
    expect(fence.length).toBeGreaterThanOrEqual(3);
    expect(lines.at(-1)).toBe(fence);
  });

  it('S11: markup and fences inside spec text cannot escape the outline', async () => {
    const hostile = '```\n![x](https://tracker.example/p.gif) <script>alert(1)</script> ````';
    const spec = { root: { component: 'ki-card', slots: { '': [hostile] } }, version: 1 };
    const text = textOf(await render(spec));
    const lines = text.split('\n');
    const open = lines.findIndex((candidate) => /^`{3,}/u.test(candidate));
    const fence = lines[open] ?? '';
    // The fence is longer than the longest backtick run of the data…
    expect(fence.length).toBeGreaterThan(4);
    // …the data stays on one quoted line inside it…
    const inner = lines.slice(open + 1, -1).join('\n');
    expect(inner).toContain(JSON.stringify(hostile));
    expect(inner).not.toContain(fence);
    // …and the fence closes the text.
    expect(lines.at(-1)).toBe(fence);
  });

  it('caps the outline at 200 lines', async () => {
    const items = Array.from({ length: 300 }, (_, index) => ({
      component: 'ki-list-item',
      slots: { '': [`item ${String(index)}`] },
    }));
    const text = textOf(
      await render({ root: { component: 'ki-list', slots: { '': items } }, version: 1 }),
    );
    const inner = text.split('\n').filter((candidate) => !/^`{3,}/u.test(candidate));
    expect(inner.length).toBeLessThanOrEqual(202);
    expect(text).toContain('more lines omitted');
  });
});
