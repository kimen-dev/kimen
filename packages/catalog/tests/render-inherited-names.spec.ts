// @spec:028-guarded-renderer
// S20: a name inherited from Object.prototype (`toString`, `constructor`,
// `hasOwnProperty`, `valueOf`) is never a declared component, prop or slot.
// Catalogs are plain objects, so a lookup with `in` or bare indexing would
// resolve those names through the prototype chain and accept them.
import { describe, expect, it } from 'vitest';

import { renderUiSpec, type UiSpec, validateUiSpec } from '../src/index.js';

const INHERITED = ['toString', 'hasOwnProperty', 'valueOf', 'isPrototypeOf'] as const;

const render = (spec: unknown) => {
  const surface = document.createElement('div');
  const result = renderUiSpec(spec, { surface });
  return { result, surface };
};

describe('028 S20 inherited names are never declared ones', () => {
  it.each(INHERITED)(
    'S20 rejects a ki-card slot named "%s" as unknown-slot and renders nothing',
    (name) => {
      const spec: UiSpec = {
        actions: [],
        root: { component: 'ki-card', slots: { [name]: [{ component: 'ki-badge' }] } },
        version: 1,
      };
      const report = validateUiSpec(spec);
      expect(report.ok).toBe(false);
      expect(report.issues.map((issue) => issue.code)).toContain('unknown-slot');
      const { result, surface } = render(spec);
      expect(result.ok).toBe(false);
      expect(result.diagnostics.map((d) => d.rule)).toContain('unknown-slot');
      expect(surface.childNodes).toHaveLength(0);
    },
  );

  it.each(INHERITED)('S20 rejects the component name "%s" as unknown-component', (name) => {
    const spec = { actions: [], root: { component: name }, version: 1 };
    const report = validateUiSpec(spec);
    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toContain('unknown-component');
    expect(render(spec).surface.childNodes).toHaveLength(0);
  });

  it.each(INHERITED)('S20 rejects the prop name "%s" on a ki-badge as unknown-prop', (name) => {
    const spec = {
      actions: [],
      root: { component: 'ki-badge', props: { [name]: 'x' } },
      version: 1,
    };
    const report = validateUiSpec(spec);
    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => issue.code)).toContain('unknown-prop');
    const { result, surface } = render(spec);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((d) => d.rule)).toContain('unknown-prop');
    expect(surface.childNodes).toHaveLength(0);
  });
});
