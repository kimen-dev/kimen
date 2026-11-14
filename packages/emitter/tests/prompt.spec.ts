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

  it('S16 marks required props as required in the prompt', () => {
    const prompt = promptOrThrow(catalogData);
    const block = prompt.slice(prompt.indexOf('### <ki-textarea>'));
    expect(block).toMatch(/- `label` \(string, required\)/u);
    expect(block).toMatch(/- `placeholder` \(string\)/u);
    expect(prompt).toContain('Props marked "required" MUST be present');
  });

  it('S8 S16 keeps the example valid when its component declares a required prop', () => {
    const derivation = catalogPrompt(catalogData, { components: ['ki-textarea'] });
    expect(derivation.ok).toBe(true);
    if (!derivation.ok) {
      return;
    }
    const fence = /```json\n([\s\S]*?)\n```/u.exec(derivation.artifact);
    const example: unknown = JSON.parse(fence?.[1] ?? 'null');
    const report = validateUiSpec(example);
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('S17 states the declared range of a bounded number in the prompt', () => {
    const prompt = promptOrThrow(catalogData);
    const block = prompt.slice(prompt.indexOf('### <ki-indicator>'));
    expect(block).toMatch(/- `count` \(number, 0 to 20\)/u);
    expect(block).toMatch(/- `current` \(number, 1 to 20\)/u);
  });

  it('S8 S17 keeps the example inside the bounds of a required number', () => {
    const created = createCatalog({
      components: {
        'acme-gauge': {
          description: 'A gauge.',
          events: {},
          props: {
            level: {
              description: 'Fill level.',
              maximum: 9,
              minimum: 5,
              required: true,
              type: 'number',
            },
          },
          slots: {},
          tag: 'acme-gauge',
          whenNotToUse: 'Never.',
          whenToUse: 'Only in this test.',
        },
      },
    });
    if (!created.ok) {
      throw new Error(`fixture catalog must register: ${created.issues[0]?.message ?? ''}`);
    }
    const prompt = promptOrThrow(created.catalog);
    const fence = /```json\n([\s\S]*?)\n```/u.exec(prompt);
    const example: unknown = JSON.parse(fence?.[1] ?? 'null');
    expect(validateUiSpec(example, { catalog: created.catalog }).issues).toEqual([]);
  });

  it('S10 stamps the catalog schema version on the prompt', () => {
    expect(promptOrThrow(catalogData)).toContain(catalogData.catalogSchemaVersion);
  });

  it('S11 derives byte-identical prompts for the same catalog', () => {
    expect(promptOrThrow(catalogData)).toBe(promptOrThrow(catalogData));
  });

  it('presents catalog events as the activation event, never as a nameable binding (review regression)', () => {
    // The UiSpec format has no event selector: the renderer wires an action to
    // the component's one declared event (spec 028 FR-003), or click when it
    // declares none — so the prompt must not tell the model it can bind a
    // named event via "action", and must state what "action" fires on.
    const prompt = promptOrThrow(catalogData);
    expect(prompt).toContain('ki-dismiss');
    expect(prompt).not.toContain('bind via "action"');
    expect(prompt).not.toContain('click activation only');
    expect(prompt).toContain('an "action" on this component fires on its one listed event');
  });
});
