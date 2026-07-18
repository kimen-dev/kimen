// @spec:030-adapter-mcp-apps
// User Story 3 (P2): protocol churn dies inside the adapter. An undeclared
// protocol version is refused (never guessed) and no MCP Apps protocol type
// reaches the core packages.
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import {
  createSurfaceBridge,
  MCP_APPS_PROTOCOL_VERSIONS,
  negotiateProtocolVersion,
} from '../src/index.js';

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
    }

    // No surface renders under a version the adapter did not declare.
    const bridge = createSurfaceBridge({ send: () => undefined, surface });
    const result = bridge.receive({
      jsonrpc: '2.0',
      method: 'ui/toolResult',
      params: {
        protocolVersion: '1999-01-01',
        surface: { spec: { root: { component: 'ki-card' }, version: 1 } },
      },
    });
    expect(result.ok).toBe(false);
    expect(result.refusals.some((r) => r.reason === 'unsupported-version')).toBe(true);
    expect(surface.childNodes).toHaveLength(0);
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
      'ui/toolResult',
      'createSurfaceBridge',
    ];
    for (const file of coreFiles) {
      const content = readFileSync(file, 'utf8');
      for (const token of forbiddenTokens) {
        expect(content.includes(token)).toBe(false);
      }
    }
  });
});
