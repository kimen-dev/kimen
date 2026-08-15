// @spec:032-catalog-registration
// Guardrail parity over registered catalogs at render time (Art. VIII):
// the guarded renderer and the streaming renderer honor the catalog in
// use — registered components render through the identical pipeline, the
// URL allowlist and version-skew gates apply unchanged (S13-S16), and
// arbitrary valid specs never place a non-catalog tag on the surface.
import fc from 'fast-check';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Catalog } from '../src/index.js';
import {
  catalogData,
  createCatalog,
  createStreamingRenderer,
  renderUiSpec,
  validateUiSpec,
} from '../src/index.js';

const acmeDefinition = {
  components: {
    'acme-kpi-card': {
      description: 'A KPI card for Acme dashboards.',
      events: {},
      props: {
        tone: {
          description: 'Semantic severity of the metric.',
          type: 'enum',
          values: ['ok', 'warn', 'critical'],
        },
      },
      slots: { '': 'The metric label.' },
      tag: 'acme-kpi-card',
      whenNotToUse: 'Tabular breakdowns of many metrics.',
      whenToUse: 'Show one operational metric with its trend.',
    },
    'acme-logo': {
      description: 'The Acme brand image.',
      events: {},
      props: {
        src: { description: 'Image location.', type: 'string' },
      },
      slots: {},
      tag: 'acme-logo',
      whenNotToUse: 'Decorative repetition.',
      whenToUse: 'Brand the surface once.',
    },
  },
} as const;

function registeredCatalog(): Catalog {
  const created = createCatalog(acmeDefinition, { extend: catalogData });
  if (!created.ok) {
    throw new Error('fixture catalog must register');
  }
  return created.catalog;
}

describe('renderUiSpec with a registered catalog', () => {
  let surface: HTMLElement;

  beforeEach(() => {
    surface = document.createElement('div');
  });

  it('S13 renders a registered component with its declared props as attributes', () => {
    const result = renderUiSpec(
      {
        root: {
          component: 'acme-kpi-card',
          props: { tone: 'warn' },
          slots: { '': ['Latency p95'] },
        },
        version: 1,
      },
      { catalog: registeredCatalog(), surface },
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.ok).toBe(true);
    const card = surface.querySelector('acme-kpi-card');
    expect(card).not.toBeNull();
    expect(card?.getAttribute('tone')).toBe('warn');
    expect(card?.textContent).toBe('Latency p95');
  });

  it('S14 holds a registered component to the URL scheme allowlist', () => {
    const result = renderUiSpec(
      {
        root: { component: 'acme-logo', props: { src: 'javascript:alert(1)' } },
        version: 1,
      },
      { catalog: registeredCatalog(), surface },
    );
    expect(result.ok).toBe(false);
    const diagnostic = result.diagnostics[0];
    expect(diagnostic?.rule).toBe('url-scheme');
    expect(diagnostic?.message).toContain('javascript');
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S15 fails closed on catalog schema version skew with a registered catalog', () => {
    const result = renderUiSpec(
      { root: { component: 'acme-kpi-card' }, version: 1 },
      { catalog: registeredCatalog(), catalogSchemaVersion: '9.9.9', surface },
    );
    expect(result.ok).toBe(false);
    const diagnostic = result.diagnostics[0];
    expect(diagnostic?.rule).toBe('unsupported-version');
    expect(diagnostic?.value).toBe('9.9.9');
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S16 streams registered components through the identical validation pipeline', () => {
    const stream = createStreamingRenderer({
      actions: [],
      catalog: registeredCatalog(),
      surface,
    });
    const attached = stream.push({
      component: 'acme-kpi-card',
      props: { tone: 'ok' },
      slots: { '': ['Uptime'] },
    });
    expect(attached.diagnostics).toEqual([]);
    expect(attached.ok).toBe(true);
    expect(surface.querySelectorAll('acme-kpi-card')).toHaveLength(1);

    const rejected = stream.push({ component: 'acme-invoice-table' });
    expect(rejected.ok).toBe(false);
    expect(rejected.diagnostics[0]?.rule).toBe('unknown-component');
    expect(surface.querySelectorAll('acme-invoice-table')).toHaveLength(0);
  });
});

describe('registered-catalog render properties', () => {
  it('S13 S16 arbitrary valid specs place only catalog-member tags on the surface', () => {
    const catalog = registeredCatalog();
    const tags = Object.keys(catalog.components);
    const nodeArb = fc.letrec<{ node: { component: string; slots?: Record<string, unknown[]> } }>(
      (tie) => ({
        node: fc.record(
          {
            component: fc.constantFrom('acme-kpi-card', 'ki-badge', 'ki-card'),
            slots: fc.option(
              fc.record({
                '': fc.array(fc.oneof(fc.string({ maxLength: 8 }), tie('node')), { maxLength: 2 }),
              }),
              { nil: undefined },
            ),
          },
          { requiredKeys: ['component'] },
        ),
      }),
    ).node;
    fc.assert(
      fc.property(nodeArb, (root) => {
        const surface = document.createElement('div');
        const result = renderUiSpec({ root, version: 1 }, { catalog, surface });
        if (result.ok) {
          for (const element of surface.querySelectorAll('*')) {
            const tag = element.tagName.toLowerCase();
            if (tag !== 'span') {
              expect(tags).toContain(tag);
            }
          }
        } else {
          expect(surface.childNodes).toHaveLength(0);
        }
      }),
      { numRuns: 150, seed: 32_034 },
    );
  });
});

describe('registered-catalog validation cost', () => {
  it('S1 validates a wide spec against an extended catalog within a generous bound', () => {
    const catalog = registeredCatalog();
    const children = Array.from({ length: 200 }, (_, index) => ({
      component: 'acme-kpi-card',
      props: { tone: 'ok' },
      slots: { '': [`metric ${String(index)}`] },
    }));
    const spec = { root: { component: 'ki-card', slots: { '': children } }, version: 1 };
    const startedAt = performance.now();
    const report = validateUiSpec(spec, { catalog });
    const elapsed = performance.now() - startedAt;
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
    // Catalog resolution stays an O(1) record lookup regardless of origin
    // (research D6): 500 ms for ~200 nodes only trips on a pathological
    // regression, never on CI load variance.
    expect(elapsed).toBeLessThan(500);
  });
});
