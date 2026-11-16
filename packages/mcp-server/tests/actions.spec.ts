// @spec:038-mcp-server
// Only actions a rendered surface declared reach the server (S12-S14). The
// host proxies the surface's `tools/call` to the server; here the client
// plays that host. Each test opens its own connection: the declared-action
// memory belongs to one connection.
import {
  declareActionTool,
  KIMEN_ACTION_KEY,
  KIMEN_ACTION_TOOL,
  surfaceResourceUri,
} from '@kimen/adapter-mcp-apps';
import { afterEach, describe, expect, it } from 'vitest';

import { type Connection, connect, INVENTORY_SPEC, textOf } from './harness.js';

let server: Connection | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

async function open(): Promise<Connection> {
  server = await connect();
  return server;
}

async function sendAction(
  connection: Connection,
  action: string,
  data?: Record<string, boolean | number | string>,
): Promise<Awaited<ReturnType<Connection['client']['callTool']>>> {
  return connection.client.callTool({
    arguments: data === undefined ? { action } : { action, data },
    name: KIMEN_ACTION_TOOL,
  });
}

describe('Kimen MCP server: surface actions (038 S12-S14)', () => {
  it('S12: a declared action from a rendered surface is acknowledged', async () => {
    const connection = await open();
    await connection.client.callTool({
      arguments: { spec: INVENTORY_SPEC },
      name: 'kimen_render_spec',
    });
    const result = await sendAction(connection, 'refresh', { sku: 'A-12' });
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({
      [KIMEN_ACTION_KEY]: { action: 'refresh', relay: true },
    });
    expect(textOf(result)).toContain('"refresh"');
  });

  it('S12: every action an accepted spec can declare is acknowledged, however long its name', async () => {
    const connection = await open();
    const action = `refresh-${'x'.repeat(300)}`;
    const spec = {
      actions: [action],
      root: { action, component: 'ki-button', slots: { '': ['Refresh'] } },
      version: 1,
    };
    const rendered = await connection.client.callTool({
      arguments: { spec },
      name: 'kimen_render_spec',
    });
    expect(rendered.isError).not.toBe(true);
    const result = await sendAction(connection, action);
    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({ [KIMEN_ACTION_KEY]: { action, relay: true } });
    // The text echo stays bounded.
    expect(textOf(result).length).toBeLessThan(400);
  });

  it('S13: an action no rendered surface declared is refused by name', async () => {
    const connection = await open();
    await connection.client.callTool({
      arguments: { spec: INVENTORY_SPEC },
      name: 'kimen_render_spec',
    });
    const result = await sendAction(connection, 'transfer-funds');
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    expect(textOf(result)).toContain('"transfer-funds"');
    expect(textOf(result)).toContain('not declared');
  });

  it('S13: before any render, even a plausible action is refused', async () => {
    const connection = await open();
    const result = await sendAction(connection, 'refresh');
    expect(result.isError).toBe(true);
  });

  it('S13: a spec that failed to render declares nothing', async () => {
    const connection = await open();
    const invalid = { actions: ['refresh'], root: { component: 'iframe' }, version: 1 };
    await connection.client.callTool({ arguments: { spec: invalid }, name: 'kimen_render_spec' });
    expect((await sendAction(connection, 'refresh')).isError).toBe(true);
  });

  it('S13: the memory keeps the declared actions of the last 32 rendered surfaces only', async () => {
    const connection = await open();
    const surface = (action: string): unknown => ({
      actions: [action],
      root: { action, component: 'ki-button', slots: { '': [action] } },
      version: 1,
    });
    for (let index = 0; index < 33; index += 1) {
      await connection.client.callTool({
        arguments: { spec: surface(`a${String(index)}`) },
        name: 'kimen_render_spec',
      });
    }
    expect((await sendAction(connection, 'a0')).isError).toBe(true);
    expect((await sendAction(connection, 'a1')).isError).not.toBe(true);
    expect((await sendAction(connection, 'a32')).isError).not.toBe(true);
  });

  it("S14: the action tool is reserved for the surface and linked to the server's ui:// surface", async () => {
    const connection = await open();
    const { tools } = await connection.client.listTools();
    const tool = tools.find((candidate) => candidate.name === KIMEN_ACTION_TOOL);
    expect(tool?._meta).toEqual({
      ui: { resourceUri: surfaceResourceUri('surface'), visibility: ['app'] },
    });
    expect(tool?.description).toBe(declareActionTool('surface').description);
  });
});
