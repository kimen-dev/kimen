// @spec:157-mcp-apps-live-updates
// The surface document names the bound node's id and the page revision in
// every action call (spec 157 FR-007). The server accepts both, ignores them,
// and keeps accepting calls from a document that does not send them (a host
// may have cached the older one). The client plays the host that proxies the
// surface's tools/call.
import { KIMEN_ACTION_KEY, KIMEN_ACTION_TOOL } from '@kimen/adapter-mcp-apps';
import { afterEach, describe, expect, it } from 'vitest';

import { type Connection, connect, INVENTORY_SPEC } from './harness.js';

let server: Connection | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

async function rendered(): Promise<Connection> {
  server = await connect();
  await server.client.callTool({ arguments: { spec: INVENTORY_SPEC }, name: 'kimen_render_spec' });
  return server;
}

describe('Kimen MCP server: the new action call arguments are optional (157 S6)', () => {
  it.each([
    {
      arguments: { action: 'refresh', data: { sku: 'A-12' }, id: 'row-3', revision: 2 },
      name: 'with the data "sku" "A-12", the id "row-3" and the revision 2',
    },
    {
      arguments: { action: 'refresh', data: { sku: 'A-12' } },
      name: 'with the data "sku" "A-12" and neither an id nor a revision',
    },
  ])('S6 acknowledges "refresh" sent $name and asks for it to be relayed', async (call) => {
    const connection = await rendered();

    const result = await connection.client.callTool({
      arguments: call.arguments,
      name: KIMEN_ACTION_TOOL,
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({
      [KIMEN_ACTION_KEY]: { action: 'refresh', relay: true },
    });
  });

  it.each([
    { name: 'an id outside the node-id grammar', extra: { id: 'Row 3' } },
    { name: 'a negative revision', extra: { revision: -1 } },
    { name: 'a fractional revision', extra: { revision: 1.5 } },
    { name: 'an argument the tool does not declare', extra: { path: 'root' } },
  ])('S6 still refuses a call carrying $name', async ({ extra }) => {
    const connection = await rendered();

    const result = await connection.client.callTool({
      arguments: { action: 'refresh', ...extra },
      name: KIMEN_ACTION_TOOL,
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
  });
});
