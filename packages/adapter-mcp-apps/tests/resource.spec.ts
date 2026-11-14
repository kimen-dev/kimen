// @spec:030-adapter-mcp-apps
// User Story 1 (P1): a tool declares its Kimen surface, the host resolves it to
// a predeclared, self-contained ui:// resource, and every result carries a text
// fallback for hosts without interactive surfaces. Plus the compatibility
// matrix's exact versions (S9) and the static audit of the packaged document:
// its size budget, its content policy (S21) and its reproducibility.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';

import { describe, expect, it } from 'vitest';

import {
  createKimenSurfaceResource,
  declareActionTool,
  declareToolSurface,
  KIMEN_ACTION_TOOL,
  KIMEN_APP_INFO,
  MCP_APPS_PROTOCOL_VERSIONS,
  SURFACE_DOCUMENT,
  SURFACE_MIME_TYPE,
  surfaceToolResult,
  UI_SCHEME,
} from '../src/index.js';

const compat = readFileSync(join(process.cwd(), 'COMPAT.md'), 'utf8');

/**
 * The document's declared size budget in bytes (Art. IV, spec "Bundle
 * budget"): the renderer, the validator, every catalog component definition
 * and the default token stylesheets, inline. Set about 5% above the measured
 * document (570 671 raw, 128 341 gzip, 106 036 brotli with 29 components).
 * Raising a number is a deliberate, reviewed act — the budget exists so
 * growth is noticed, not absorbed.
 */
const SIZE_BUDGET = { brotli: 112_000, gzip: 135_000, raw: 600_000 } as const;

/**
 * XML namespace names the DOM requires verbatim (`createElementNS`): they are
 * identifiers, never dereferenced, and the only `http(s)://host` strings the
 * packaged document may contain.
 */
const NAMESPACE_NAMES: readonly string[] = [
  'http://www.w3.org/1999/xhtml',
  'http://www.w3.org/1999/xlink',
  'http://www.w3.org/2000/svg',
];

/** The document's `<meta http-equiv="Content-Security-Policy">`, by directive. */
const contentPolicy = (): ReadonlyMap<string, readonly string[]> => {
  const meta = /<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(
    SURFACE_DOCUMENT,
  );
  const directives = (meta?.[1] ?? '').split(';').map((directive) => directive.trim().split(' '));
  return new Map(directives.map(([name, ...sources]) => [name ?? '', sources]));
};

/**
 * The text of the document's one inline `<script>` or `<style>` element, as
 * the browser hashes it. The element is located the way the HTML tokenizer
 * does: a raw-text element ends at its first closing tag.
 */
const inlineElement = (tag: 'script' | 'style'): string => {
  const open = `<${tag}>`;
  const start = SURFACE_DOCUMENT.indexOf(open) + open.length;
  const end = SURFACE_DOCUMENT.indexOf(`</${tag}`, start);
  return SURFACE_DOCUMENT.slice(start, end);
};

const digestSource = (text: string): string =>
  `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

/** The document's markup with the bodies of its inline script and style removed. */
const markup = (): string =>
  SURFACE_DOCUMENT.replace(inlineElement('style'), '').replace(inlineElement('script'), '');

const packageVersion = (
  JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')) as {
    version: string;
  }
).version;

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
  });

  it('S1 keeps the self-contained document inside its declared size budget', () => {
    const bytes = Buffer.from(createKimenSurfaceResource().text, 'utf8');

    expect(bytes.length).toBeLessThanOrEqual(SIZE_BUDGET.raw);
    expect(gzipSync(bytes, { level: 9 }).length).toBeLessThanOrEqual(SIZE_BUDGET.gzip);
    expect(brotliCompressSync(bytes).length).toBeLessThanOrEqual(SIZE_BUDGET.brotli);
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
    // The component runtime adds the XML namespace names, which the DOM takes
    // as identifiers and never fetches: exactly those, nothing else.
    const named =
      SURFACE_DOCUMENT.match(/https?:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+[^\s"'`)<>]*/gi) ?? [];
    expect(named.filter((url) => !NAMESPACE_NAMES.includes(url))).toEqual([]);
    // The content policy is origin-free (default-src 'none' blocks all network).
    expect(SURFACE_DOCUMENT).toMatch(/Content-Security-Policy[^>]*default-src 'none'/);
    const resource = createKimenSurfaceResource();
    expect(resource._meta.ui.csp.connectDomains).toHaveLength(0);
    expect(resource._meta.ui.csp.resourceDomains).toHaveLength(0);
  });

  it('S2 regenerates the packaged document byte for byte', () => {
    // `--check` rebuilds the document in memory and exits non-zero unless it
    // equals the packaged one: no date, no randomness, no machine path may
    // reach it, or a host's cached audit would stop matching.
    const check = spawnSync(process.execPath, ['scripts/generate-surface.mjs', '--check'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });

    expect(check.status, `${check.stdout}${check.stderr}`).toBe(0);
  });

  it('S21 names the inline script and the inline stylesheet by digest in the content policy', () => {
    const policy = contentPolicy();

    // One script element, one style element and no inline handler or style
    // attribute in the markup: the two digests below then cover everything
    // in the document that runs or styles.
    expect(markup().match(/<script/g)).toHaveLength(1);
    expect(markup().match(/<style/g)).toHaveLength(1);
    expect(markup()).toContain('<style></style>');
    expect(markup()).toContain('<script></script>');
    expect(markup()).not.toMatch(/\son[a-z]+\s*=|\sstyle\s*=/i);

    expect(policy.get('script-src')).toEqual([digestSource(inlineElement('script'))]);
    expect(policy.get('style-src')).toEqual([digestSource(inlineElement('style'))]);
  });

  it('S21 permits no other inline script, inline style, evaluated code or network source', () => {
    const policy = contentPolicy();

    expect(policy.get('default-src')).toEqual(["'none'"]);
    expect(policy.get('base-uri')).toEqual(["'none'"]);
    expect(policy.get('form-action')).toEqual(["'none'"]);
    expect([...policy.keys()].sort()).toEqual([
      'base-uri',
      'default-src',
      'form-action',
      'img-src',
      'script-src',
      'style-src',
    ]);
    const sources = [...policy.values()].flat();
    // Every source is 'none', a digest or the inert data: scheme for images.
    expect(
      sources.filter((source) => !/^(?:'none'|'sha256-[A-Za-z0-9+/]+=*'|data:)$/.test(source)),
    ).toEqual([]);
    // A browser honours the digests only while the script it parses is the
    // script that was hashed: nothing inside it may end the element early or
    // open an escaped section the tokenizer would read differently.
    expect(inlineElement('script')).not.toMatch(/<!--/);
    expect(SURFACE_DOCUMENT.endsWith('</script>\n</body>\n</html>\n')).toBe(true);
    expect(SURFACE_DOCUMENT.indexOf('</script')).toBe(SURFACE_DOCUMENT.lastIndexOf('</script'));
  });

  it('S3 carries a text fallback usable without the interactive surface', () => {
    const spec = {
      root: { component: 'ki-card', slots: { '': ['12 items'] } },
      version: 1,
    };
    const result = surfaceToolResult(spec, '12 items in stock');

    expect(result.content).toHaveLength(1);
    expect(result.content[0]).toEqual({
      text: '12 items in stock',
      type: 'text',
    });
    // The renderable payload travels alongside the text, never instead of it,
    // in `structuredContent` — data for the UI, not for the model
    // (SEP-1865 2026-01-26, apps.mdx:1473-1475).
    expect(result.structuredContent.kimenSurface.spec).toBe(spec);
  });

  it('S6 declares the app-only tool that receives the surface actions', () => {
    const tool = declareActionTool('inventory');

    expect(tool.name).toBe(KIMEN_ACTION_TOOL);
    // Hidden from the agent, callable only by the app on this server
    // (apps.mdx:370-384 example, :395-402 visibility rules).
    expect(tool._meta.ui).toEqual({
      resourceUri: declareToolSurface('inventory').ui.resourceUri,
      visibility: ['app'],
    });
    expect(tool.inputSchema.required).toEqual(['action']);
    expect(tool.inputSchema.additionalProperties).toBe(false);
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
    // The row's adapter version is the package version the surface announces
    // as `appInfo.version` in `ui/initialize`.
    expect(section).toContain(`| ${packageVersion} | 2026-01-26 |`);
    expect(KIMEN_APP_INFO.version).toBe(packageVersion);
  });
});
