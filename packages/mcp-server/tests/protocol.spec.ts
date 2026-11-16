// @spec:038-mcp-server
// Protocol discipline (S18, S19): clients of both MCP eras are served over
// stdio, and the compatibility matrix, the code and the running binary
// declare the same revisions.
import { readFileSync } from 'node:fs';

import { KIMEN_SURFACE_KEY, MCP_APPS_PROTOCOL_VERSIONS } from '@kimen/adapter-mcp-apps';
import { describe, expect, it } from 'vitest';

import { MCP_APPS_REVISIONS, MCP_REVISIONS } from '../src/protocol.js';
import { connect, ERA_REVISION, type Era, INVENTORY_SPEC, line, spawnRaw } from './harness.js';

const COMPAT = readFileSync(new URL('../COMPAT.md', import.meta.url), 'utf8');

/** The rows of the markdown table that follows `heading`. */
function tableAfter(heading: string): string[][] {
  const start = COMPAT.indexOf(heading);
  expect(start).toBeGreaterThanOrEqual(0);
  const rows: string[][] = [];
  for (const row of COMPAT.slice(start).split('\n').slice(1)) {
    if (!row.startsWith('|')) {
      if (rows.length > 0) {
        break;
      }
      continue;
    }
    rows.push(
      row
        .split('|')
        .slice(1, -1)
        .map((cell) => cell.trim().replaceAll('`', '')),
    );
  }
  // Drop the header and the separator.
  return rows.slice(2);
}

describe('Kimen MCP server: protocol eras (038 S18, S19)', () => {
  it.each<Era>(['modern', 'legacy'])(
    'S18: a client of the %s era connects over stdio, lists the tools and renders',
    async (era) => {
      const server = await connect({ era });
      try {
        expect(server.client.getNegotiatedProtocolVersion()).toBe(ERA_REVISION[era]);
        expect(server.client.getProtocolEra()).toBe(era);
        const { tools } = await server.client.listTools();
        expect(tools.map((tool) => tool.name).sort()).toEqual([
          'kimen_describe_component',
          'kimen_list_components',
          'kimen_render_spec',
          'kimen_surface_action',
          'kimen_validate_spec',
        ]);
        const result = await server.client.callTool({
          arguments: { spec: INVENTORY_SPEC },
          name: 'kimen_render_spec',
        });
        expect(result.structuredContent).toEqual({ [KIMEN_SURFACE_KEY]: { spec: INVENTORY_SPEC } });
        expect(server.client.getServerVersion()?.name).toBe('kimen');
      } finally {
        await server.close();
      }
    },
  );

  it('S19: the compatibility matrix names exact revisions, with no placeholder, matching the code', () => {
    const mcp = tableAfter('## Supported MCP revisions');
    expect(mcp.length).toBeGreaterThan(0);
    for (const [revision] of mcp) {
      expect(revision).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    }
    expect(mcp.map(([revision, era]) => ({ era, revision }))).toEqual(
      MCP_REVISIONS.map(({ era, revision }) => ({ era, revision })),
    );
    const apps = tableAfter('## Supported MCP Apps revision');
    expect(apps.map(([revision]) => revision)).toEqual([...MCP_APPS_REVISIONS]);
    expect([...MCP_APPS_REVISIONS]).toEqual([...MCP_APPS_PROTOCOL_VERSIONS]);
    expect(COMPAT).not.toMatch(/TBD|TODO|placeholder/iu);
  });

  it('S19: the running binary negotiates exactly the declared modern revisions', async () => {
    const server = await connect({ era: 'modern' });
    try {
      const declared = MCP_REVISIONS.filter(({ era }) => era === 'modern').map(
        ({ revision }) => revision,
      );
      expect([...(server.client.getDiscoverResult()?.supportedVersions ?? [])].sort()).toEqual(
        [...declared].sort(),
      );
    } finally {
      await server.close();
    }
  });

  it.each(MCP_REVISIONS.filter(({ era }) => era === 'legacy').map(({ revision }) => revision))(
    'S19: the running binary accepts the declared legacy revision %s at initialize',
    async (revision) => {
      const raw = spawnRaw();
      raw.write(
        line({
          id: 1,
          method: 'initialize',
          params: {
            capabilities: {},
            clientInfo: { name: 'kimen-mcp-raw', version: '0.0.0' },
            protocolVersion: revision,
          },
        }),
      );
      const answer = await raw.response(1);
      expect((answer['result'] as { protocolVersion: string }).protocolVersion).toBe(revision);
      await raw.end();
    },
  );
});
