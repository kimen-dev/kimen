// @spec:033-emitter-kit
// @spec:154-action-per-event
// Prompt derivation (S7, S8, S10, S11): guidance flows verbatim for
// built-in AND registered components, the embedded example is
// self-consistent with the validation boundary, and output is
// deterministic and version-stamped.

import type { Catalog } from '@kimen/catalog';
import { catalogData, createCatalog, NATIVE_PRIMITIVE_TAGS, validateUiSpec } from '@kimen/catalog';
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

function promptOrThrow(catalog: Catalog, options?: Parameters<typeof catalogPrompt>[1]): string {
  const derivation = catalogPrompt(catalog, options);
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

  it('S8 the built-in prompt and each native element prompt embed only an example that validates', () => {
    // A table element's example node never validates alone (spec 158: a part
    // is never a root and a table holds no text), so its own prompt has no
    // example rather than an invalid one; every other prompt has a valid one.
    const tableParts = new Set(['caption', 'table', 'tbody', 'td', 'th', 'thead', 'tr']);
    const subsets: readonly (readonly string[] | undefined)[] = [
      undefined,
      ...NATIVE_PRIMITIVE_TAGS.map((tag) => [tag]),
    ];
    for (const components of subsets) {
      const derivation = catalogPrompt(
        catalogData,
        components === undefined ? {} : { components: [...components] },
      );
      if (!derivation.ok) {
        throw new Error(JSON.stringify(derivation.issues));
      }
      const fence = /```json\n([\s\S]*?)\n```/u.exec(derivation.artifact);
      const standsAlone = !(components?.length === 1 && tableParts.has(components[0] ?? ''));
      expect(fence !== null, String(components)).toBe(standsAlone);
      expect(derivation.artifact.includes('## Example (valid)')).toBe(standsAlone);
      if (fence !== null) {
        const report = validateUiSpec(JSON.parse(fence[1] ?? 'null'), { catalog: catalogData });
        expect(report.issues, String(components)).toEqual([]);
      }
    }
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

  it('S18 flags URL-typed props in the prompt and states the accepted schemes', () => {
    const created = createCatalog({
      components: {
        'acme-logo': {
          description: 'A partner logo.',
          events: {},
          props: {
            caption: { description: 'Caption.', type: 'string' },
            source: { description: 'Logo image.', format: 'url', required: true, type: 'string' },
          },
          slots: {},
          tag: 'acme-logo',
          whenNotToUse: 'Decoration.',
          whenToUse: 'Show a partner brand.',
        },
      },
    });
    if (!created.ok) {
      throw new Error(`fixture catalog must register: ${created.issues[0]?.message ?? ''}`);
    }
    const prompt = promptOrThrow(created.catalog);
    expect(prompt).toMatch(/- `source` \(string, URL, required\)/u);
    expect(prompt).toMatch(/- `caption` \(string\)/u);
    expect(prompt).toContain('Props marked "URL" accept only http(s) URLs or relative references');
    // The example supplies the required URL prop with a value the boundary accepts.
    const fence = /```json\n([\s\S]*?)\n```/u.exec(prompt);
    const example: unknown = JSON.parse(fence?.[1] ?? 'null');
    expect(validateUiSpec(example, { catalog: created.catalog }).issues).toEqual([]);
  });

  it('S19 states the optional node id and its grammar in the format rules', () => {
    const prompt = promptOrThrow(catalogData);
    expect(prompt).toContain('{"id": "<id>", "component": "<tag>"');
    expect(prompt).toContain('"id", "props", "action", "collect" and "slots" are optional');
    expect(prompt).toContain('unique within the document');
    expect(prompt).toContain('at most 64 characters');
  });

  it('states how a bound node collects other fields (spec 153)', () => {
    const prompt = promptOrThrow(catalogData);
    expect(prompt).toContain('"collect": {"<name>": "<id>"}');
    expect(prompt).toContain(
      '"collect" lets a node with an "action" carry the values of other fields',
    );
    expect(prompt).toContain('Each bound event fires only when every collected field is valid');
    expect(prompt).toContain('At most 32 entries');
  });

  it('S10 stamps the catalog schema version on the prompt', () => {
    expect(promptOrThrow(catalogData)).toContain(catalogData.catalogSchemaVersion);
  });

  it('S11 derives byte-identical prompts for the same catalog', () => {
    expect(promptOrThrow(catalogData)).toBe(promptOrThrow(catalogData));
  });

  it('states what an action name fires on and how a binding per event names events (spec 154)', () => {
    // An action name fires on the event the renderer derives (spec 028
    // FR-003), so the prompt states it per component; a binding per event
    // names listed events, and a multi-event component with no rule of its
    // own takes only that form.
    const blockOf = (tag: string): string => {
      const prompt = promptOrThrow(catalogData, { components: [tag] });
      return prompt.slice(prompt.indexOf(`### <${tag}>`));
    };
    const perEvent = '{"<event>": "<action>"} fires each listed event\'s own action';
    expect(blockOf('ki-alert')).toContain('an action name fires on `ki-dismiss`');
    expect(blockOf('ki-combobox')).toContain('an action name fires on `change`');
    expect(blockOf('ki-dialog')).toContain(
      'an action name fires on ki-confirm when "confirm-label" is set and on ki-close otherwise',
    );
    expect(blockOf('ki-confirmation')).toContain(
      'an action name alone is rejected, so map each event that should act',
    );
    expect(blockOf('ki-confirmation')).toContain('`approve-label` (string, required)');
    expect(blockOf('ki-confirmation')).toContain('`deny-label` (string, required)');
    for (const tag of ['ki-alert', 'ki-chip', 'ki-confirmation', 'ki-dialog']) {
      expect(blockOf(tag)).toContain(perEvent);
    }
    const prompt = promptOrThrow(catalogData);
    expect(prompt).toContain('"action": "<name>" or {"<event>": "<name>"}');
    expect(prompt).toContain('{"ki-approve": "tool.approved", "ki-deny": "tool.denied"}');
    expect(prompt).not.toContain('a binding is rejected when more than one is listed');
  });
});
