// @spec:164-catalog-closed-open-unions
// What a model sees for the three formerly open unions: the repair prompt
// names the allowed values (S3) and the spec JSON Schema offers only them
// (S4), so constrained decoding cannot produce an undocumented value.
import { catalogData, validateUiSpec } from '@kimen/catalog';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';

import { repairPrompt, uiSpecJsonSchema } from '../src/index.js';

const TONES = ['danger', 'info', 'neutral', 'success', 'warning'];
const PLACEMENTS = ['bottom-center', 'bottom-end', 'top-center', 'top-end'];

describe('164 — what a model sees for the closed unions', () => {
  it('S3 builds a repair prompt that names the toast tone and its five allowed tones', () => {
    const report = validateUiSpec({
      version: 1,
      root: { component: 'ki-toast', props: { tone: 'critical' }, slots: { '': ['Saved'] } },
    });
    expect(report.ok).toBe(false);

    const prompt = repairPrompt(report) ?? '';

    expect(prompt).toContain('root.props.tone');
    expect(prompt).toContain('critical');
    for (const tone of TONES) {
      expect(prompt).toContain(`"${tone}"`);
    }
  });

  it('S4 rejects an undocumented toaster placement in the spec JSON Schema and lists the four', () => {
    const derivation = uiSpecJsonSchema(catalogData);
    expect(derivation.ok).toBe(true);
    const artifact = derivation.ok ? derivation.artifact : {};
    const validate = new Ajv2020({ allErrors: true, strict: false }).compile(artifact);

    const accepted = validate({
      version: 1,
      root: { component: 'ki-toaster', props: { placement: 'middle' } },
    });

    expect(accepted).toBe(false);
    const enumErrors = (validate.errors ?? []).filter(
      ({ keyword, instancePath }) => keyword === 'enum' && instancePath.endsWith('/placement'),
    );
    expect(enumErrors.length).toBeGreaterThan(0);
    expect(
      enumErrors.some(
        ({ params }) =>
          JSON.stringify([...(params as { allowedValues: string[] }).allowedValues].sort()) ===
          JSON.stringify(PLACEMENTS),
      ),
    ).toBe(true);
  });

  it('S4 accepts every documented placement in the spec JSON Schema', () => {
    const derivation = uiSpecJsonSchema(catalogData);
    const artifact = derivation.ok ? derivation.artifact : {};
    const validate = new Ajv2020({ allErrors: false, strict: false }).compile(artifact);

    for (const placement of PLACEMENTS) {
      expect(
        validate({ version: 1, root: { component: 'ki-toaster', props: { placement } } }),
      ).toBe(true);
    }
  });
});
