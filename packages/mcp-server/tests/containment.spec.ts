// @spec:038-mcp-server
// The server is contained (S16, S17; Art. XI): it works with read access to
// its own bundle only and no network, an oversized protocol message is
// discarded without being parsed, stdout carries protocol messages only, and
// the binary takes no arguments.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  BUNDLE,
  CONTAINED_FLAGS,
  type Connection,
  connect,
  INVENTORY_SPEC,
  legacyOpening,
  line,
  spawnRaw,
  textOf,
} from './harness.js';

const MAX_MESSAGE_BYTES = 4 * 1024 * 1024;

/** Node grants network access only with --allow-net once that permission exists (Node ≥ 25). */
const NETWORK_PERMISSION = process.allowedNodeEnvironmentFlags.has('--allow-net');

/** Runs `code` under the same permission flags the contained server gets. */
function underContainment(code: string): { status: number | null; stderr: string } {
  const result = spawnSync(
    process.execPath,
    [...CONTAINED_FLAGS, '--input-type=module', '-e', code],
    {
      encoding: 'utf8',
    },
  );
  return { status: result.status, stderr: result.stderr };
}

describe('Kimen MCP server: containment (038 S16)', () => {
  let server: Connection;

  beforeAll(async () => {
    server = await connect({ nodeFlags: CONTAINED_FLAGS });
  });

  afterAll(async () => {
    await server.close();
  });

  it('S16: the containment flags really deny file reads outside the bundle and, where Node has the permission, the network', () => {
    const file = underContainment(
      "import { readFileSync } from 'node:fs'; readFileSync('/etc/hosts');",
    );
    expect(file.status).not.toBe(0);
    expect(file.stderr).toContain('ERR_ACCESS_DENIED');
    // CI runs the Node version that has network permissions: the network
    // half of this scenario is never silently skipped there.
    if (process.env['CI'] !== undefined) {
      expect(NETWORK_PERMISSION).toBe(true);
    }
    if (NETWORK_PERMISSION) {
      const net = underContainment(
        "import { connect } from 'node:net'; connect(9, '127.0.0.1').on('error', (error) => { console.error(error.code); process.exit(3); });",
      );
      expect(net.stderr).toContain('ERR_ACCESS_DENIED');
    }
  });

  it('S16: with read access to its own bundle only and no network, every tool and resource answers', async () => {
    const { client } = server;
    expect((await client.listTools()).tools.length).toBe(5);
    expect(
      (await client.callTool({ arguments: {}, name: 'kimen_list_components' })).isError,
    ).not.toBe(true);
    expect(
      (await client.callTool({ arguments: { tag: 'ki-card' }, name: 'kimen_describe_component' }))
        .isError,
    ).not.toBe(true);
    const validated = await client.callTool({
      arguments: { spec: INVENTORY_SPEC },
      name: 'kimen_validate_spec',
    });
    expect((validated.structuredContent as { ok: boolean }).ok).toBe(true);
    const rendered = await client.callTool({
      arguments: { spec: INVENTORY_SPEC },
      name: 'kimen_render_spec',
    });
    expect(rendered.isError).not.toBe(true);
    const action = await client.callTool({
      arguments: { action: 'refresh' },
      name: 'kimen_surface_action',
    });
    expect(action.isError).not.toBe(true);
    const { resources } = await client.listResources();
    expect(resources).toHaveLength(4);
    for (const resource of resources) {
      const { contents } = await client.readResource({ uri: resource.uri });
      expect(String((contents[0] as { text?: unknown }).text).length).toBeGreaterThan(0);
    }
    expect(server.stderr()).not.toContain('ERR_ACCESS_DENIED');
    expect(textOf(rendered)).toContain('ki-card');
  });
});

describe('Kimen MCP server: the stdio boundary (038 S17)', () => {
  it('S17: a message larger than 4 MiB is discarded unparsed, reported on stderr, and the next request is answered', async () => {
    const raw = spawnRaw();
    raw.write(legacyOpening());
    await raw.response(1);
    const oversized = line({
      id: 2,
      method: 'tools/call',
      params: {
        arguments: { spec: 'x'.repeat(MAX_MESSAGE_BYTES + 1024) },
        name: 'kimen_validate_spec',
      },
    });
    expect(Buffer.byteLength(oversized)).toBeGreaterThan(MAX_MESSAGE_BYTES);
    raw.write(oversized);
    raw.write(line({ id: 3, method: 'tools/list' }));
    const next = await raw.response(3);
    expect((next['result'] as { tools: unknown[] }).tools).toHaveLength(5);
    expect(raw.stderr()).toContain('discarded an inbound message');
    expect(raw.stdout()).not.toContain('"id":2');
    expect(await raw.end()).toBe(0);
  });

  it('serves a message just under the limit', async () => {
    const raw = spawnRaw();
    raw.write(legacyOpening());
    await raw.response(1);
    const request = line({
      id: 2,
      method: 'tools/call',
      params: {
        arguments: { spec: 'x'.repeat(MAX_MESSAGE_BYTES - 4096) },
        name: 'kimen_validate_spec',
      },
    });
    expect(Buffer.byteLength(request)).toBeLessThan(MAX_MESSAGE_BYTES);
    raw.write(request);
    const answer = await raw.response(2);
    const report = (answer['result'] as { structuredContent: { issues: { code: string }[] } })
      .structuredContent;
    expect(report.issues.map((issue) => issue.code)).toEqual(['size-budget']);
    expect(raw.stderr()).not.toContain('discarded');
    await raw.end();
  });

  it('writes nothing but protocol messages to stdout and exits when stdin closes', async () => {
    const raw = spawnRaw();
    raw.write(legacyOpening());
    await raw.response(1);
    raw.write(
      line({
        id: 2,
        method: 'tools/call',
        params: { arguments: {}, name: 'kimen_list_components' },
      }),
    );
    await raw.response(2);
    expect(await raw.end()).toBe(0);
    for (const output of raw
      .stdout()
      .split('\n')
      .filter((candidate) => candidate !== '')) {
      expect((JSON.parse(output) as { jsonrpc?: unknown }).jsonrpc).toBe('2.0');
    }
  });

  it('refuses any command-line argument with exit code 2 and a usage line', async () => {
    const raw = spawnRaw(['--allow-url-origin', 'https://cdn.example.com']);
    expect(await raw.exited).toBe(2);
    expect(raw.stderr()).toContain('usage: kimen-mcp');
    expect(raw.stdout()).toBe('');
  });

  it('S16: the binary is one file that imports nothing but Node built-ins', () => {
    const source = readFileSync(BUNDLE, 'utf8');
    // Module-level import statements (esbuild hoists every external import).
    const statements = [...source.matchAll(/^import\s[^;]*?from\s*"([^"]+)";$/gmu)].map(
      (match) => match[1] ?? '',
    );
    expect(statements.length).toBeGreaterThan(0);
    for (const specifier of statements) {
      expect(specifier).toMatch(/^node:/u);
    }
    // No CommonJS bridge and no dynamic import of a named module. (The
    // `require("ajv/…")` strings ajv carries are code-generation templates
    // for its standalone mode, never executed by the server.)
    expect(source).not.toMatch(/\b__require\b|\bcreateRequire\b/u);
    expect(source).not.toMatch(/\bimport\(\s*["'`]/u);
  });
});
