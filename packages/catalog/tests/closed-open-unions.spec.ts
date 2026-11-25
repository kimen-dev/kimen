// @spec:164-catalog-closed-open-unions
// The three props whose element types are open unions (`"a" | … | string & {}`)
// are closed enums in the built-in catalog: a spec may only use their
// documented values (S1, S2), while a consumer definition keeps its own open
// strings (S6).
import { describe, expect, it } from 'vitest';

import { catalogData, createCatalog, type UiSpec, validateUiSpec } from '../src/index.js';

function single(component: string, props: Record<string, string>): UiSpec {
  return { version: 1, root: { component, props } };
}

describe('164 — the built-in catalog closes its open unions', () => {
  it('S1 rejects an alert whose tone is undocumented and lists the allowed tones', () => {
    const report = validateUiSpec(single('ki-alert', { tone: 'error' }));

    expect(report.ok).toBe(false);
    const issue = report.issues.find(({ path }) => path === 'root.props.tone');
    expect(issue?.code).toBe('invalid-prop-type');
    for (const tone of ['danger', 'info', 'neutral', 'success', 'warning']) {
      expect(issue?.message).toContain(`"${tone}"`);
    }
  });

  it.each([
    ['ki-alert', 'tone', 'danger'],
    ['ki-alert', 'tone', 'neutral'],
    ['ki-toast', 'tone', 'warning'],
    ['ki-toast', 'tone', 'success'],
    ['ki-toaster', 'placement', 'top-center'],
    ['ki-toaster', 'placement', 'bottom-end'],
  ])('S2 accepts the documented value %s %s "%s"', (component, prop, value) => {
    expect(validateUiSpec(single(component, { [prop]: value })).ok).toBe(true);
  });

  it('S2 declares the three props as enums over exactly their documented values', () => {
    const { components } = catalogData;
    expect(components['ki-alert'].props.tone).toMatchObject({
      type: 'enum',
      values: ['danger', 'info', 'neutral', 'success', 'warning'],
    });
    expect(components['ki-toast'].props.tone).toMatchObject({
      type: 'enum',
      values: ['danger', 'info', 'neutral', 'success', 'warning'],
    });
    expect(components['ki-toaster'].props.placement).toMatchObject({
      type: 'enum',
      values: ['bottom-center', 'bottom-end', 'top-center', 'top-end'],
    });
  });

  it('S2 leaves no documentedValues anywhere in the built-in catalog (FR-001)', () => {
    const open = Object.entries(catalogData.components).flatMap(([tag, entry]) =>
      Object.entries(entry.props)
        .filter(([, constraint]) => 'documentedValues' in constraint)
        .map(([name]) => `${tag}.${name}`),
    );
    expect(open).toEqual([]);
  });

  it('S6 accepts any tone for a consumer open string that documents "up" and "down"', () => {
    const created = createCatalog(
      {
        components: {
          'acme-kpi-card': {
            tag: 'acme-kpi-card',
            description: 'A key figure with its trend.',
            whenToUse: 'Show one figure and whether it rose or fell.',
            whenNotToUse: 'A list of many figures.',
            props: {
              tone: {
                type: 'string',
                description: 'Trend of the figure.',
                documentedValues: ['up', 'down'],
              },
            },
            slots: { '': 'The figure label.' },
            events: {},
          },
        },
      },
      { extend: catalogData },
    );
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }

    const report = validateUiSpec(single('acme-kpi-card', { tone: 'flat' }), {
      catalog: created.catalog,
    });

    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
  });
});
