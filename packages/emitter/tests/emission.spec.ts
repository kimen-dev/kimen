// @spec:033-emitter-kit
// Tool derivation and emission ingest (S9, S13, S14) plus the
// schema⇄boundary agreement property (SC-002): the reliability loop
// closes in exactly one repair round, strict-mode placeholders normalize
// away, and nothing the schema accepts surprises the validator for
// schema-expressible rules.

import { catalogData, validateUiSpec } from '@kimen/catalog';
import Ajv2020 from 'ajv/dist/2020.js';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { normalizeEmission, repairPrompt, uiSpecJsonSchema, uiSpecTool } from '../src/index.js';

describe('uiSpecTool', () => {
  it('S9 wraps exactly the lowered schema with a name and model-facing description', () => {
    const tool = uiSpecTool(catalogData, { target: 'openai-strict' });
    const schema = uiSpecJsonSchema(catalogData, { target: 'openai-strict' });
    expect(tool.ok).toBe(true);
    expect(schema.ok).toBe(true);
    if (!tool.ok || !schema.ok) {
      return;
    }
    expect(tool.artifact.name).toBe('emit_ui');
    expect(tool.artifact.description).toContain(catalogData.catalogSchemaVersion);
    expect(JSON.stringify(tool.artifact.inputSchema)).toBe(JSON.stringify(schema.artifact));
  });
});

describe('normalizeEmission', () => {
  it('S13 strips strict-mode null placeholders so the emission validates', () => {
    const emission: unknown = {
      actions: [],
      root: {
        action: null,
        component: 'ki-card',
        props: {},
        slots: {
          '': [
            {
              action: null,
              component: 'ki-badge',
              props: { size: null, tone: 'info' },
              slots: { '': ['3 items'] },
            },
          ],
          footer: [],
          header: [],
          media: [],
        },
      },
      version: 1,
    };
    const rejectedRaw = validateUiSpec(emission);
    expect(rejectedRaw.ok).toBe(false);

    const normalized = normalizeEmission(emission);
    const report = validateUiSpec(normalized);
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);

    const root = (normalized as { root: { props?: unknown; action?: unknown } }).root;
    expect(root.action).toBeUndefined();
    expect(root.props).toBeUndefined();
  });

  it('S13 normalizes hostile nesting depths without overflowing (review regression)', () => {
    let node: Record<string, unknown> = { component: 'ki-badge', props: { tone: null } };
    for (let level = 0; level < 3000; level += 1) {
      node = { component: 'ki-card', props: { tone: null }, slots: { '': [node] } };
    }
    const emission = { root: node, version: 1 };
    const normalized = normalizeEmission(emission);
    const report = validateUiSpec(normalized);
    expect(report.ok).toBe(false);
    expect(report.issues[0]?.code).toBe('depth-budget');
  });

  it('S13 leaves non-placeholder values untouched', () => {
    const emission: unknown = {
      root: {
        component: 'ki-badge',
        props: { tone: 'warning' },
        slots: { '': ['Attention'] },
      },
      version: 1,
    };
    expect(JSON.parse(JSON.stringify(normalizeEmission(emission)))).toEqual(emission);
  });

  it('S13 preserves a forbidden __proto__ key so the normalized emission is still rejected (review regression)', () => {
    // JSON.parse creates a real own `__proto__` data property; a plain-object
    // clone would silently swallow it via the legacy prototype setter and
    // launder a forbidden-key emission into an accepted document.
    const raw: unknown = JSON.parse(
      '{"version":1,"root":{"component":"ki-badge","props":{"__proto__":{"polluted":true}}}}',
    );
    expect(validateUiSpec(raw).ok).toBe(false);
    const report = validateUiSpec(normalizeEmission(raw));
    expect(report.ok).toBe(false);
    expect(report.issues.some((issue) => issue.code === 'forbidden-key')).toBe(true);
  });
});

describe('repairPrompt', () => {
  it('S14 formats every issue with code, path and offender, requesting one corrected emission', () => {
    const report = validateUiSpec({
      root: {
        component: 'ki-card',
        slots: {
          '': [
            { component: 'acme-unknown' },
            { component: 'ki-button', props: { disabled: 'yes' } },
          ],
        },
      },
      version: 1,
    });
    expect(report.ok).toBe(false);
    const message = repairPrompt(report);
    expect(message).not.toBeNull();
    for (const issue of report.issues) {
      expect(message).toContain(issue.code);
      expect(message).toContain(issue.path);
    }
    expect(message).toContain('acme-unknown');
    expect(message).toContain('disabled');
    // The offender for invalid-prop-type lives in issue.value, not the
    // message — the repair prompt must surface the exact rejected value.
    expect(message).toContain('yes');
    expect(message?.toLowerCase()).toContain('exactly one corrected');
  });

  it('S14 returns null for an accepted spec', () => {
    const report = validateUiSpec({
      root: { component: 'ki-badge', props: { tone: 'info' } },
      version: 1,
    });
    expect(report.ok).toBe(true);
    expect(repairPrompt(report)).toBeNull();
  });
});

describe('schema and boundary agreement', () => {
  it('S1 S2 specs the schema accepts are accepted by the boundary or rejected only for schema-inexpressible rules', () => {
    const derivation = uiSpecJsonSchema(catalogData, { components: ['ki-badge', 'ki-card'] });
    expect(derivation.ok).toBe(true);
    if (!derivation.ok) {
      return;
    }
    const ajv = new Ajv2020({ allErrors: false, strict: false });
    const accepts = ajv.compile(derivation.artifact);

    const toneArb = fc.constantFrom('info', 'success', 'warning', 'sparkly');
    // '' exercises the non-empty-string agreement (149-3): the schema now
    // rejects empty action names, so they never reach the validator as a
    // schema-accepted/validator-rejected divergence.
    const actionArb = fc.option(fc.constantFrom('confirm', 'undeclared-intent', ''), {
      nil: undefined,
    });
    const nodeArb = fc.letrec<{ node: Record<string, unknown> }>((tie) => ({
      node: fc
        .record(
          {
            action: actionArb,
            component: fc.constantFrom('ki-badge', 'ki-card'),
            props: fc.option(fc.record({ tone: toneArb }), { nil: undefined }),
            slots: fc.option(
              fc.record({
                '': fc.array(fc.oneof(fc.string({ maxLength: 6 }), tie('node')), {
                  maxLength: 2,
                }),
              }),
              { nil: undefined },
            ),
          },
          { requiredKeys: ['component'] },
        )
        .map((node) => JSON.parse(JSON.stringify(node)) as Record<string, unknown>),
    })).node;

    fc.assert(
      fc.property(
        nodeArb,
        fc.constantFrom(undefined, ['confirm'] as const, [''] as const),
        (root, actions) => {
          const spec = actions === undefined ? { root, version: 1 } : { actions, root, version: 1 };
          if (!accepts(spec)) {
            return;
          }
          const report = validateUiSpec(spec);
          if (!report.ok) {
            for (const issue of report.issues) {
              expect(issue.code).toBe('undeclared-action');
            }
          }
        },
      ),
      { numRuns: 300, seed: 33_033 },
    );
  });
});
