// @spec:038-mcp-server
// The guarded renderer's verdict without a DOM (spec 038 D7, FR-014): what a
// DOM-less boundary — the Kimen MCP server — reports as valid is exactly what
// `renderUiSpec` paints, because both run the renderer's own preparation
// step. S7: the catalog validator alone accepts specs the renderer refuses
// (over its depth and node budgets, a declared catalog version), so a
// boundary that only validated would hand the surface a spec it rejects.
import { describe, expect, it } from 'vitest';

import {
  CATALOG_SCHEMA_VERSION,
  DEFAULT_RENDER_BUDGETS,
  preflightUiSpec,
  renderUiSpec,
  validateUiSpec,
} from '../src/index.js';

type Node = Record<string, unknown>;

/** `levels` cards, each holding the next in its default slot. */
function nested(levels: number): unknown {
  let node: Node = { component: 'ki-card', slots: { '': ['leaf'] } };
  for (let level = 1; level < levels; level += 1) {
    node = { component: 'ki-card', slots: { '': [node] } };
  }
  return { root: node, version: 1 };
}

/** One list holding `count - 1` items: `count` components in all. */
function wide(count: number): unknown {
  const items = Array.from({ length: count - 1 }, (_, index) => ({
    component: 'ki-list-item',
    slots: { '': [`item ${String(index)}`] },
  }));
  return { root: { component: 'ki-list', slots: { '': items } }, version: 1 };
}

const VALID = {
  actions: ['save'],
  root: {
    component: 'ki-card',
    slots: { '': [{ action: 'save', component: 'ki-button', slots: { '': ['Save'] } }] },
  },
  version: 1,
};

/** The renderer's own verdict, from a real (happy-dom) surface. */
function rendered(input: unknown): { ok: boolean; rules: string[] } {
  const result = renderUiSpec(input, { surface: document.createElement('div') });
  return { ok: result.ok, rules: result.diagnostics.map((diagnostic) => diagnostic.rule) };
}

describe('preflightUiSpec: the guarded renderer verdict without a DOM (038 FR-014)', () => {
  it('S7: accepts a spec the renderer paints, with no diagnostics', () => {
    expect(preflightUiSpec(VALID)).toEqual({ diagnostics: [], ok: true });
    expect(rendered(VALID).ok).toBe(true);
  });

  it('S7: refuses a spec 33 levels deep that the validator alone accepts', () => {
    const spec = nested(DEFAULT_RENDER_BUDGETS.maxDepth + 1);
    expect(validateUiSpec(spec).ok).toBe(true);
    const verdict = preflightUiSpec(spec);
    expect(verdict.ok).toBe(false);
    expect(verdict.diagnostics.map((diagnostic) => diagnostic.rule)).toEqual(['depth-budget']);
    expect(rendered(spec)).toEqual({ ok: false, rules: ['depth-budget'] });
  });

  it('S7: refuses a spec of 513 components that the validator alone accepts', () => {
    const spec = wide(DEFAULT_RENDER_BUDGETS.maxNodes + 1);
    expect(validateUiSpec(spec).ok).toBe(true);
    const verdict = preflightUiSpec(spec);
    expect(verdict.diagnostics.map((diagnostic) => diagnostic.rule)).toEqual(['node-count-budget']);
    expect(rendered(spec)).toEqual({ ok: false, rules: ['node-count-budget'] });
  });

  it('accepts exactly at the depth and node budgets', () => {
    expect(preflightUiSpec(nested(DEFAULT_RENDER_BUDGETS.maxDepth)).ok).toBe(true);
    expect(preflightUiSpec(wide(DEFAULT_RENDER_BUDGETS.maxNodes)).ok).toBe(true);
  });

  it('reads a declared catalog version as the renderer does, and refuses skew', () => {
    const declared = { ...VALID, catalogSchemaVersion: CATALOG_SCHEMA_VERSION };
    expect(preflightUiSpec(declared).ok).toBe(true);
    expect(rendered(declared).ok).toBe(true);
    const skewed = { ...VALID, catalogSchemaVersion: '99.0.0' };
    const verdict = preflightUiSpec(skewed);
    expect(verdict.ok).toBe(false);
    expect(verdict.diagnostics.map((diagnostic) => diagnostic.rule)).toEqual(
      rendered(skewed).rules,
    );
  });

  it('carries the validator issues, as renderer diagnostics, for an invalid spec', () => {
    const spec = {
      root: { component: 'iframe', props: { src: 'https://evil.example' } },
      version: 1,
    };
    const verdict = preflightUiSpec(spec);
    expect(verdict).toEqual({
      diagnostics: [
        {
          message: 'component "iframe" is outside the catalog',
          path: 'root.component',
          rule: 'unknown-component',
          value: 'iframe',
        },
      ],
      ok: false,
    });
  });

  it('applies the URL origin policy of its options', () => {
    const spec = {
      root: { component: 'ki-avatar', props: { src: 'https://cdn.example.com/a.png' } },
      version: 1,
    };
    expect(preflightUiSpec(spec).ok).toBe(true);
    const refused = preflightUiSpec(spec, { allowedUrlOrigins: [] });
    expect(refused.diagnostics.map((diagnostic) => [diagnostic.rule, diagnostic.path])).toEqual([
      ['url-origin', 'root.props.src'],
    ]);
  });

  it('honors budgets passed in its options', () => {
    expect(preflightUiSpec(nested(3), { budgets: { maxDepth: 2 } }).ok).toBe(false);
  });

  it('never mutates its input', () => {
    const declared = structuredClone({ ...VALID, catalogSchemaVersion: CATALOG_SCHEMA_VERSION });
    const before = structuredClone(declared);
    preflightUiSpec(declared);
    expect(declared).toEqual(before);
  });
});
