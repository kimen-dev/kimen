// @spec:030-adapter-mcp-apps
// User Story 1 (P1): a tool declares its Kimen surface, the host resolves it to
// a predeclared, self-contained ui:// resource, and every result carries a text
// fallback for hosts without interactive surfaces. Plus the compatibility
// matrix's exact versions (S9).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createKimenSurfaceResource,
  declareToolSurface,
  MCP_APPS_PROTOCOL_VERSIONS,
  SURFACE_DOCUMENT,
  SURFACE_MIME_TYPE,
  surfaceToolResult,
  UI_SCHEME,
} from '../src/index.js';

const compat = readFileSync(join(process.cwd(), 'COMPAT.md'), 'utf8');

describe('surfaces are predeclared, self-contained and auditable', () => {
  it('S1 declares a tool surface the host resolves to a ui:// resource document', () => {
    const declaration = declareToolSurface('inventory');
    const resource = createKimenSurfaceResource('inventory');

    // The tool's declared resourceUri resolves to the predeclared resource.
    expect(declaration.ui.resourceUri.startsWith(UI_SCHEME)).toBe(true);
    expect(resource.uri).toBe(declaration.ui.resourceUri);
    expect(resource.mimeType).toBe(SURFACE_MIME_TYPE);
    // The resource is one self-contained HTML document embedding the renderer.
    expect(resource.text.startsWith('<!doctype html')).toBe(true);
    expect(resource.text).toContain('<div id="kimen-surface">');
    expect(resource.text).toContain('<script>');
    expect(resource.text.length).toBeGreaterThan(10_000);
    // The self-contained document carries its own size budget (Art. IV): the
    // inlined renderer + validator, not an unbounded payload.
    expect(resource.text.length).toBeLessThan(600_000);
  });

  it('S2 references no external origin in the document or its content policy', () => {
    // Every script and style is inline — nothing is fetched.
    expect(SURFACE_DOCUMENT).not.toMatch(/<script[^>]+\bsrc\b/);
    expect(SURFACE_DOCUMENT).not.toContain('<link');
    expect(SURFACE_DOCUMENT).not.toMatch(/@import/);
    // No external network ORIGIN (scheme + real host) anywhere in the document.
    // A `scheme://host.tld` is a fetchable origin; bundled URL-parser input
    // templates inside the minified validator (e.g. `http://[<ip>]`) name no
    // host and are unreachable under the CSP below — they are not origins.
    expect(SURFACE_DOCUMENT).not.toMatch(/https?:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+/i);
    // The content policy is origin-free (default-src 'none' blocks all network).
    expect(SURFACE_DOCUMENT).toMatch(/Content-Security-Policy[^>]*default-src 'none'/);
    const resource = createKimenSurfaceResource();
    expect(resource._meta.ui.csp.connectDomains).toHaveLength(0);
    expect(resource._meta.ui.csp.resourceDomains).toHaveLength(0);
  });

  it('S3 carries a text fallback usable without the interactive surface', () => {
    const spec = { root: { component: 'ki-card', slots: { '': ['12 items'] } }, version: 1 };
    const result = surfaceToolResult(spec, '12 items in stock');

    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toEqual({ text: '12 items in stock', type: 'text' });
    // The renderable payload travels alongside the text, never instead of it.
    expect(result._meta.ui.surface.spec).toBe(spec);
  });

  it('S9 pairs each adapter version with an exact protocol version, no placeholder', () => {
    const section = compat.slice(
      compat.indexOf('## Supported MCP Apps protocol versions'),
      compat.indexOf('## What the surface document contains'),
    );
    expect(MCP_APPS_PROTOCOL_VERSIONS.length).toBeGreaterThan(0);
    for (const version of MCP_APPS_PROTOCOL_VERSIONS) {
      expect(section).toContain(version);
    }
    // No generator placeholder row survives to release.
    expect(section).not.toMatch(/TODO|placeholder/i);
    expect(section).toContain('2026-01-26');
  });
});
