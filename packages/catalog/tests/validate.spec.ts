// @spec:027-runtime-catalog
// Validation at the GenUI boundary (Art. VIII): accept what the catalog
// declares, reject everything else naming the offender. Guardrail-adjacent
// scenarios S5-S8, S13 and S14 carry the adversarial cases.
import { describe, expect, it } from 'vitest';
import type { UiSpec } from '../src/index.js';
import { VALIDATION_MAX_BYTES, VALIDATION_MAX_DEPTH, validateUiSpec } from '../src/index.js';

const confirmationCard: UiSpec = {
  version: 1,
  actions: ['confirm-order'],
  root: {
    component: 'ki-card',
    slots: {
      header: ['Confirm your order'],
      '': [
        { component: 'ki-badge', props: { tone: 'info' }, slots: { '': ['3 items'] } },
        'Everything ships tomorrow.',
      ],
      footer: [
        {
          component: 'ki-button',
          props: { variant: 'primary', tone: 'success' },
          action: 'confirm-order',
          slots: { '': ['Confirm'] },
        },
      ],
    },
  },
};

describe('validateUiSpec', () => {
  it('S4 accepts a spec composing ki-card, ki-button and ki-badge with declared props', () => {
    const report = validateUiSpec(confirmationCard);
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('accepts an action-bound button in the ki-input action slot', () => {
    // A spec owns no form (spec 152): the action slot's button reports a
    // declared action instead of submitting.
    const report = validateUiSpec({
      version: 1,
      actions: ['search'],
      root: {
        component: 'ki-input',
        props: { type: 'search', label: 'Search docs' },
        slots: {
          action: [
            {
              action: 'search',
              component: 'ki-button',
              props: { size: 'sm', type: 'button' },
              slots: { '': ['Search'] },
            },
          ],
        },
      },
    });

    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('S5 rejects an unknown component naming it as outside the catalog', () => {
    const report = validateUiSpec({
      version: 1,
      root: { component: 'ki-payment-form' },
    });
    expect(report.ok).toBe(false);
    expect(report.issues).toHaveLength(1);
    const issue = report.issues[0];
    expect(issue?.code).toBe('unknown-component');
    expect(issue?.message).toContain('ki-payment-form');
  });

  it('S6 rejects an unknown prop naming the component and the prop', () => {
    const report = validateUiSpec({
      version: 1,
      root: { component: 'ki-button', props: { onclick: 'steal()' } },
    });
    expect(report.ok).toBe(false);
    const issue = report.issues[0];
    expect(issue?.code).toBe('unknown-prop');
    expect(issue?.message).toContain('ki-button');
    expect(issue?.message).toContain('onclick');
  });

  it('S7 rejects a wrong-typed prop value naming the prop and its expected type', () => {
    const report = validateUiSpec({
      version: 1,
      root: { component: 'ki-button', props: { disabled: 'yes' } },
    });
    expect(report.ok).toBe(false);
    const issue = report.issues[0];
    expect(issue?.code).toBe('invalid-prop-type');
    expect(issue?.message).toContain('disabled');
    expect(issue?.message).toContain('boolean');
  });

  it('S8 rejects a binding to an action the spec never declares, naming the action', () => {
    const report = validateUiSpec({
      version: 1,
      actions: ['dismiss'],
      root: { component: 'ki-button', action: 'submit-order' },
    });
    expect(report.ok).toBe(false);
    const issue = report.issues[0];
    expect(issue?.code).toBe('undeclared-action');
    expect(issue?.message).toContain('submit-order');
  });

  it.each(['__proto__', 'constructor', 'prototype'])(
    'S13 rejects the prototype-pollution key "%s" naming it, without polluting any outside object',
    (key) => {
      const before = Object.getOwnPropertyNames(Object.prototype).sort();
      const report = validateUiSpec(
        `{"version":1,"root":{"component":"ki-button","props":{${JSON.stringify(key)}:{"polluted":true}}}}`,
      );
      expect(report.ok).toBe(false);
      const issue = report.issues[0];
      expect(issue?.code).toBe('forbidden-key');
      expect(issue?.message).toContain(key);
      expect(Object.getOwnPropertyNames(Object.prototype).sort()).toEqual(before);
      expect({} as { polluted?: boolean }).not.toHaveProperty('polluted');
    },
  );

  it('S14 rejects a spec beyond the validation size budget naming the exceeded budget', () => {
    const oversized = {
      version: 1,
      root: {
        component: 'ki-card',
        slots: { '': ['x'.repeat(VALIDATION_MAX_BYTES)] },
      },
    };
    const report = validateUiSpec(oversized);
    expect(report.ok).toBe(false);
    const issue = report.issues[0];
    expect(issue?.code).toBe('size-budget');
    expect(issue?.message).toContain(String(VALIDATION_MAX_BYTES));

    const bounded = validateUiSpec(confirmationCard, { maxBytes: 64 });
    expect(bounded.ok).toBe(false);
    expect(bounded.issues[0]?.code).toBe('size-budget');
  });

  it.each([
    ['sets no "label"', {}],
    ['sets "label" to an empty string', { label: '' }],
    ['sets "label" to only white space', { label: ' \t\n' }],
  ])(
    'S16 rejects a ki-textarea that %s naming the component and the required prop',
    (_state, props) => {
      const report = validateUiSpec({ version: 1, root: { component: 'ki-textarea', props } });
      expect(report.ok).toBe(false);
      expect(report.issues).toHaveLength(1);
      const issue = report.issues[0];
      expect(issue?.code).toBe('missing-required-prop');
      expect(issue?.path).toBe('root.props.label');
      expect(issue?.value).toBe('label');
      expect(issue?.message).toContain('ki-textarea');
      expect(issue?.message).toContain('"label"');
    },
  );

  it('S16 rejects a missing required prop on a node that carries no props object at all', () => {
    const report = validateUiSpec({
      version: 1,
      root: { component: 'ki-card', slots: { '': [{ component: 'ki-textarea' }] } },
    });
    expect(report.ok).toBe(false);
    expect(report.issues.map((issue) => [issue.code, issue.path])).toEqual([
      ['missing-required-prop', 'root.slots.[0].props.label'],
    ]);
  });

  it('S16 accepts the same node once the required prop carries a usable value', () => {
    const report = validateUiSpec({
      version: 1,
      root: { component: 'ki-textarea', props: { label: 'Delivery notes' } },
    });
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it.each([
    ['count', 1_000_000, 'between 0 and 20'],
    ['count', -1, 'between 0 and 20'],
    ['current', 0, 'between 1 and 20'],
  ])(
    'S18 rejects ki-indicator %s = %d naming the prop and its declared bounds',
    (prop, value, bounds) => {
      const report = validateUiSpec({
        version: 1,
        root: { component: 'ki-indicator', props: { label: 'Slide position', [prop]: value } },
      });
      expect(report.ok).toBe(false);
      expect(report.issues).toHaveLength(1);
      const issue = report.issues[0];
      expect(issue?.code).toBe('prop-out-of-range');
      expect(issue?.path).toBe(`root.props.${prop}`);
      expect(issue?.value).toBe(String(value));
      expect(issue?.message).toContain('ki-indicator');
      expect(issue?.message).toContain(`"${prop}"`);
      expect(issue?.message).toContain(bounds);
    },
  );

  it('S18 accepts a bounded number at each of its limits', () => {
    for (const [count, current] of [
      [0, 1],
      [20, 20],
    ]) {
      const report = validateUiSpec({
        version: 1,
        root: { component: 'ki-indicator', props: { count, current, label: 'Slide position' } },
      });
      expect(report.issues).toEqual([]);
    }
  });

  it('S18 reports a wrong-typed bounded prop as a type error, not as a range error', () => {
    const report = validateUiSpec({
      version: 1,
      root: { component: 'ki-indicator', props: { count: '1000000', label: 'Slide position' } },
    });
    expect(report.issues.map((issue) => issue.code)).toEqual(['invalid-prop-type']);
  });

  // Purity-wall hardening (FR-004/FR-013/FR-014, Codex review of PR #57):
  // validation must never invoke foreign code, never blow the stack, and
  // never let object identity games defeat the budgets.
  it('never invokes getters or toJSON on untrusted object input', () => {
    let reads = 0;
    const withGetter = {
      version: 1,
      root: {
        component: 'ki-button',
        get props(): Record<string, string> {
          reads += 1;
          return {};
        },
      },
    };
    const report = validateUiSpec(withGetter);
    expect(reads).toBe(0);
    expect(report.ok).toBe(false);
    expect(report.issues[0]?.code).toBe('malformed-spec');
    expect(report.issues[0]?.message).toContain('accessor');

    let serializations = 0;
    const withToJson = {
      version: 1,
      toJSON: (): unknown => {
        serializations += 1;
        return { root: { component: 'ki-button' }, version: 1 };
      },
      root: { component: 'ki-button' },
    };
    const jsonReport = validateUiSpec(withToJson);
    expect(serializations).toBe(0);
    // A function value is not data — rejected, never invoked.
    expect(jsonReport.ok).toBe(false);
    expect(jsonReport.issues[0]?.code).toBe('malformed-spec');
  });

  it('reports the depth budget on deep nesting instead of overflowing the stack', () => {
    const depth = 2000;
    const deep = `{"version":1,"root":${'['.repeat(depth)}${']'.repeat(depth)}}`;
    expect(new TextEncoder().encode(deep).length).toBeLessThan(VALIDATION_MAX_BYTES);
    const report = validateUiSpec(deep);
    expect(report.ok).toBe(false);
    expect(report.issues[0]?.code).toBe('depth-budget');
    expect(report.issues[0]?.message).toContain(String(VALIDATION_MAX_DEPTH));
  });

  it('rejects shared object references and cycles as malformed instead of hanging or throwing', () => {
    const sharedProps = { variant: 'primary' };
    const shared = {
      version: 1,
      root: {
        component: 'ki-card',
        slots: {
          '': [
            { component: 'ki-button', props: sharedProps },
            { component: 'ki-button', props: sharedProps },
          ],
        },
      },
    };
    const sharedReport = validateUiSpec(shared);
    expect(sharedReport.ok).toBe(false);
    expect(sharedReport.issues[0]?.code).toBe('malformed-spec');

    const cyclic: Record<string, unknown> = { version: 1 };
    cyclic['root'] = { component: 'ki-card', slots: { '': [cyclic] } };
    const cyclicReport = validateUiSpec(cyclic);
    expect(cyclicReport.ok).toBe(false);
    expect(cyclicReport.issues[0]?.code).toBe('malformed-spec');
  });
});
