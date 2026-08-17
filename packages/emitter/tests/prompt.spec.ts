// @spec:033-emitter-kit
// Prompt derivation (S7, S8, S10, S11): guidance flows verbatim for
// built-in AND registered components, the embedded example is
// self-consistent with the validation boundary, and output is
// deterministic and version-stamped.

import type { Catalog } from '@kimen/catalog';
import { catalogData, createCatalog, validateUiSpec } from '@kimen/catalog';
import { describe, expect, it } from 'vitest';
import { catalogPrompt } from '../src/index.js';

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
  },
} as const;

function registeredCatalog(): Catalog {
  const created = createCatalog(acmeDefinition, { extend: catalogData });
  if (!created.ok) {
    throw new Error('fixture catalog must register');
  }
  return created.catalog;
}

function promptOrThrow(catalog: Catalog): string {
  const derivation = catalogPrompt(catalog);
  if (!derivation.ok) {
    throw new Error(`prompt derivation must succeed: ${derivation.issues[0]?.message ?? ''}`);
  }
  return derivation.artifact;
}

describe('catalogPrompt', () => {
  it('S7 carries every component guidance verbatim, registered components included', () => {
    const catalog = registeredCatalog();
    const prompt = promptOrThrow(catalog);
    for (const entry of Object.values(catalog.components)) {
      expect(prompt).toContain(entry.whenToUse);
      expect(prompt).toContain(entry.whenNotToUse);
    }
    expect(prompt).toContain('acme-kpi-card');
    expect(prompt).toContain('Show one operational metric with its trend.');
  });

  it('S8 embeds an example spec that validates against the same catalog', () => {
    const catalog = registeredCatalog();
    const prompt = promptOrThrow(catalog);
    const fence = /```json\n([\s\S]*?)\n```/u.exec(prompt);
    expect(fence).not.toBeNull();
    const example: unknown = JSON.parse(fence?.[1] ?? 'null');
    const report = validateUiSpec(example, { catalog });
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('S10 stamps the catalog schema version on the prompt', () => {
    expect(promptOrThrow(catalogData)).toContain(catalogData.catalogSchemaVersion);
  });

  it('S11 derives byte-identical prompts for the same catalog', () => {
    expect(promptOrThrow(catalogData)).toBe(promptOrThrow(catalogData));
  });

  it('presents catalog events as host-side, never action-bindable (review regression)', () => {
    // The UiSpec format has no event selector and the renderer wires actions to
    // click activation only — so the prompt must not tell the model that
    // custom events (e.g. ki-alert's ki-dismiss) can be bound via "action".
    const prompt = promptOrThrow(catalogData);
    expect(prompt).toContain('ki-dismiss');
    expect(prompt).not.toContain('bind via "action"');
  });
});
