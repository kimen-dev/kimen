// @spec:040-surface-action-relay
// The Kimen MCP server's half of the relay (spec 040 D7): every declared
// action it acknowledges carries the relay request the surface needs, an
// undeclared one still carries none, and the render tool tells the model how
// a relayed action reads. The client plays the MCP Apps host, as in
// ./actions.spec.ts; each test opens its own connection.
import {
  KIMEN_ACTION_KEY,
  KIMEN_ACTION_TOOL,
  SURFACE_ACTION_RELAY_PREFIX,
} from '@kimen/adapter-mcp-apps';
import { afterEach, describe, expect, it } from 'vitest';

import { type Connection, connect, INVENTORY_SPEC } from './harness.js';

let server: Connection | undefined;

afterEach(async () => {
  await server?.close();
  server = undefined;
});

async function open(): Promise<Connection> {
  server = await connect();
  return server;
}

describe('Kimen MCP server: relaying acknowledged actions (040 S3, S4)', () => {
  it('S3: the server asks for every action it acknowledges to be relayed', async () => {
    const connection = await open();
    await connection.client.callTool({
      arguments: { spec: INVENTORY_SPEC },
      name: 'kimen_render_spec',
    });

    const result = await connection.client.callTool({
      arguments: { action: 'refresh', data: { sku: 'A-12' } },
      name: KIMEN_ACTION_TOOL,
    });

    expect(result.isError).not.toBe(true);
    expect(result.structuredContent).toEqual({
      [KIMEN_ACTION_KEY]: { action: 'refresh', relay: true },
    });
  });

  it('S3: an undeclared action is still refused and carries no relay request', async () => {
    const connection = await open();
    await connection.client.callTool({
      arguments: { spec: INVENTORY_SPEC },
      name: 'kimen_render_spec',
    });

    const result = await connection.client.callTool({
      arguments: { action: 'transfer-funds' },
      name: KIMEN_ACTION_TOOL,
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
  });

  it('S4: the render tool tells the model how a relayed action reads', async () => {
    const connection = await open();

    const { tools } = await connection.client.listTools();
    const description = tools.find((tool) => tool.name === 'kimen_render_spec')?.description ?? '';

    expect(description).toContain(`"${SURFACE_ACTION_RELAY_PREFIX}"`);
    expect(description).toMatch(/user message/u);
    expect(description).toMatch(/action and its data as JSON/u);
  });
});
