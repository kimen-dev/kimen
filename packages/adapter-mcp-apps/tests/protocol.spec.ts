// @spec:030-adapter-mcp-apps
// User Story 3 (P2): protocol churn dies inside the adapter. An undeclared
// protocol version is refused at the `ui/initialize` handshake (never
// guessed), the JSON-RPC 2.0 classifier accepts exactly the spec's message
// shapes, and no MCP Apps protocol type reaches the core packages.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import type { BridgeRefusal, SurfaceOutboundMessage } from '../src/index.js';
import {
  createSurfaceBridge,
  MCP_APPS_PROTOCOL_VERSIONS,
  negotiateProtocolVersion,
  parseJsonRpcMessage,
} from '../src/index.js';
import {
  confirmSurface,
  expectedInitialized,
  initializeResult,
  toolInput,
  toolResult,
} from './spec-messages.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

const repoRoot = resolve(process.cwd(), '../..');

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));
}

describe('protocol churn is absorbed inside the disposable adapter', () => {
  it('S8 refuses an undeclared protocol version, naming the supported set', () => {
    const negotiation = negotiateProtocolVersion('1999-01-01');
    expect(negotiation.ok).toBe(false);
    expect(negotiation.refusal?.reason).toBe('unsupported-version');
    for (const version of MCP_APPS_PROTOCOL_VERSIONS) {
      expect(negotiation.supportedVersions).toContain(version);
      expect(negotiation.refusal?.detail).toContain(version);
    }
  });

  it('S8 refuses a handshake that negotiates an undeclared version and renders nothing', () => {
    const sent: SurfaceOutboundMessage[] = [];
    const refusals: BridgeRefusal[] = [];
    const bridge = createSurfaceBridge({
      onRefusal: (refusal) => refusals.push(refusal),
      send: (message) => sent.push(message),
      surface,
    });
    bridge.start();

    // McpUiInitializeResult carries the negotiated version (spec.types.ts:571).
    const result = bridge.receive(initializeResult(1, '1999-01-01'));

    expect(result.ok).toBe(false);
    expect(refusals[0]).toMatchObject({
      reason: 'unsupported-version',
      value: '1999-01-01',
    });
    expect(bridge.state).toBe('refused');
    // Never confirmed: no `ui/notifications/initialized`, so a conforming host
    // sends nothing more (apps.mdx:485).
    expect(sent).not.toContainEqual(expectedInitialized());
    expect(sent).toHaveLength(1);

    // Whatever a non-conforming host sends anyway never renders.
    const late = bridge.receive(toolResult(confirmSurface));
    expect(late.ok).toBe(false);
    expect(late.refusals[0]?.reason).toBe('connection-refused');
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S7 classifies exactly the JSON-RPC 2.0 shapes the spec exchanges', () => {
    expect(parseJsonRpcMessage(toolInput())).toMatchObject({
      kind: 'notification',
      method: 'ui/notifications/tool-input',
    });
    expect(parseJsonRpcMessage(initializeResult(1))).toMatchObject({
      id: 1,
      kind: 'result',
    });
    // `params` is optional (spec.types.ts:592) and normalizes to {}.
    expect(parseJsonRpcMessage({ id: 'p', jsonrpc: '2.0', method: 'ping' })).toEqual({
      id: 'p',
      kind: 'request',
      method: 'ping',
      params: {},
    });
    expect(
      parseJsonRpcMessage({
        error: { code: -32000, message: 'x' },
        id: null,
        jsonrpc: '2.0',
      }),
    ).toMatchObject({ id: null, kind: 'error' });

    for (const malformed of [
      'ui/notifications/tool-result',
      { jsonrpc: '1.0', method: 'ping' },
      { id: null, jsonrpc: '2.0', method: 'ping' }, // MCP request ids are never null
      { id: {}, jsonrpc: '2.0', result: {} },
      { id: 1, jsonrpc: '2.0', result: 'ok' },
      { id: 1, jsonrpc: '2.0', method: 7 },
      { id: 1, jsonrpc: '2.0', error: { code: 'x', message: 'y' } },
    ]) {
      expect(parseJsonRpcMessage(malformed)).toBeNull();
    }
  });

  it('S10 lets no MCP Apps protocol type reach the elements or catalog packages', () => {
    const coreFiles = [
      ...sourceFiles(join(repoRoot, 'packages/catalog/src')),
      ...sourceFiles(join(repoRoot, 'packages/elements/src')),
    ];
    expect(coreFiles.length).toBeGreaterThan(0);

    const forbiddenTokens = [
      '@kimen/adapter-mcp-apps',
      'MCP_APPS_PROTOCOL_VERSIONS',
      'ui/initialize',
      'ui/notifications/',
      'createSurfaceBridge',
      'kimen_surface_action',
    ];
    for (const file of coreFiles) {
      const content = readFileSync(file, 'utf8');
      for (const token of forbiddenTokens) {
        expect(content.includes(token)).toBe(false);
      }
    }
  });
});
