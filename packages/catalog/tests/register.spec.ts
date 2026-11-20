// @spec:032-catalog-registration
// Consumer catalog registration (Art. VIII): the definition is hostile
// input, registered catalogs are immutable values, and the default path
// stays the built-in catalog. Adversarial scenarios S4-S10 carry the
// battery; S11-S12 prove validation parity over the catalog in use.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { catalogData, createCatalog, validateUiSpec } from '../src/index.js';

const acmeKpiCard = {
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
} as const;

const acmeDefinition = { components: { 'acme-kpi-card': acmeKpiCard } } as const;

describe('createCatalog', () => {
  it('S1 accepts a spec using a registered consumer component', () => {
    const created = createCatalog(acmeDefinition);
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    const report = validateUiSpec(
      { root: { component: 'acme-kpi-card', props: { tone: 'warn' } }, version: 1 },
      { catalog: created.catalog },
    );
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('S2 composes registered components with built-in components', () => {
    const created = createCatalog(acmeDefinition, { extend: catalogData });
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    const report = validateUiSpec(
      {
        root: {
          component: 'ki-card',
          slots: {
            '': [
              {
                component: 'acme-kpi-card',
                props: { tone: 'ok' },
                slots: { '': ['Uptime 99.99%'] },
              },
            ],
            footer: [
              {
                component: 'ki-button',
                props: { variant: 'tertiary' },
                slots: { '': ['View details'] },
              },
            ],
          },
        },
        version: 1,
      },
      { catalog: created.catalog },
    );
    expect(report.issues).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('S3 keeps the built-in catalog as the boundary when no catalog is supplied', () => {
    const report = validateUiSpec({ root: { component: 'acme-kpi-card' }, version: 1 });
    expect(report.ok).toBe(false);
    const issue = report.issues[0];
    expect(issue?.code).toBe('unknown-component');
    expect(issue?.message).toContain('acme-kpi-card');
  });

  it('S4 rejects a definition colliding with a built-in tag', () => {
    const created = createCatalog(
      { components: { 'ki-button': { ...acmeKpiCard, tag: 'ki-button' } } },
      { extend: catalogData },
    );
    expect(created.ok).toBe(false);
    if (created.ok) {
      return;
    }
    const issue = created.issues[0];
    expect(issue?.code).toBe('collision');
    expect(issue?.value).toBe('ki-button');
  });

  it('S5 rejects a tag that is not a valid custom-element name', () => {
    const created = createCatalog({
      components: { AcmeCard: { ...acmeKpiCard, tag: 'AcmeCard' } },
    });
    expect(created.ok).toBe(false);
    if (created.ok) {
      return;
    }
    const issue = created.issues[0];
    expect(issue?.code).toBe('invalid-tag');
    expect(issue?.value).toBe('AcmeCard');
  });

  it('S5 rejects hyphen-less and SVG/MathML-reserved tags', () => {
    const hyphenless = createCatalog({
      components: { acme: { ...acmeKpiCard, tag: 'acme' } },
    });
    expect(hyphenless.ok).toBe(false);
    expect(!hyphenless.ok && hyphenless.issues[0]?.code).toBe('invalid-tag');

    const reserved = createCatalog({
      components: { 'font-face': { ...acmeKpiCard, tag: 'font-face' } },
    });
    expect(reserved.ok).toBe(false);
    expect(!reserved.ok && reserved.issues[0]?.code).toBe('invalid-tag');
  });

  it('S6 rejects a definition missing usage guidance', () => {
    const withoutGuidance: Record<string, unknown> = { ...acmeKpiCard };
    delete withoutGuidance['whenToUse'];
    const absent = createCatalog({ components: { 'acme-kpi-card': withoutGuidance } });
    expect(absent.ok).toBe(false);
    if (!absent.ok) {
      const issue = absent.issues[0];
      expect(issue?.code).toBe('missing-guidance');
      expect(issue?.path).toContain('acme-kpi-card');
      expect(issue?.message).toContain('whenToUse');
    }

    const blank = createCatalog({
      components: { 'acme-kpi-card': { ...acmeKpiCard, whenToUse: '   ' } },
    });
    expect(blank.ok).toBe(false);
    expect(!blank.ok && blank.issues[0]?.code).toBe('missing-guidance');
  });

  it('S7 rejects a malformed prop constraint', () => {
    const noValues = createCatalog({
      components: {
        'acme-kpi-card': {
          ...acmeKpiCard,
          props: { tone: { description: 'Severity.', type: 'enum' } },
        },
      },
    });
    expect(noValues.ok).toBe(false);
    if (!noValues.ok) {
      const issue = noValues.issues[0];
      expect(issue?.code).toBe('malformed-constraint');
      expect(issue?.path).toContain('acme-kpi-card');
      expect(issue?.path).toContain('tone');
    }

    const emptyValues = createCatalog({
      components: {
        'acme-kpi-card': {
          ...acmeKpiCard,
          props: { tone: { description: 'Severity.', type: 'enum', values: [] } },
        },
      },
    });
    expect(emptyValues.ok).toBe(false);
    expect(!emptyValues.ok && emptyValues.issues[0]?.code).toBe('malformed-constraint');
  });

  it.each(['__proto__', 'constructor', 'prototype'])(
    'S8 rejects the forbidden key %s without polluting outside objects',
    (key) => {
      const hostile: unknown = JSON.parse(
        `{"components": {${JSON.stringify(key)}: ${JSON.stringify(acmeKpiCard)}}}`,
      );
      const created = createCatalog(hostile);
      expect(created.ok).toBe(false);
      if (!created.ok) {
        const issue = created.issues[0];
        expect(issue?.code).toBe('forbidden-key');
        expect(issue?.message).toContain(key);
      }
      const probe = {} as Record<string, unknown>;
      expect(probe['description']).toBeUndefined();
      expect(probe['tag']).toBeUndefined();
    },
  );

  it('S9 rejects a definition holding a non-data value', () => {
    const created = createCatalog({
      components: {
        'acme-kpi-card': {
          ...acmeKpiCard,
          props: {
            tone: {
              description: 'Severity.',
              type: 'enum',
              values: ['ok'],
              hostile: () => 'code',
            },
          },
        },
      },
    });
    expect(created.ok).toBe(false);
    if (!created.ok) {
      const issue = created.issues[0];
      expect(issue?.code).toBe('malformed-definition');
      expect(issue?.path).toContain('props.tone');
    }
  });

  it('S4 refuses an extend base with a mismatched catalog schema version (review regression)', () => {
    const created = createCatalog(acmeDefinition, {
      extend: { catalogSchemaVersion: '99.0.0', components: {} },
    });
    expect(created.ok).toBe(false);
    if (!created.ok) {
      const issue = created.issues[0];
      expect(issue?.code).toBe('unsupported-version');
      expect(issue?.message).toContain('99.0.0');
      expect(issue?.message).toContain(catalogData.catalogSchemaVersion);
    }
  });

  it('S9 rejects a hostile extend base with issues instead of throwing (review regression)', () => {
    const hostileBase = {
      catalogSchemaVersion: catalogData.catalogSchemaVersion,
      components: {
        'x-y': { ...acmeKpiCard, tag: 'x-y', hostile: () => 'code' },
      },
    } as unknown as typeof catalogData;
    const created = createCatalog(acmeDefinition, { extend: hostileBase });
    expect(created.ok).toBe(false);
    expect(!created.ok && created.issues[0]?.path).toContain('options.extend');

    const nullBase = createCatalog(acmeDefinition, {
      extend: null as unknown as typeof catalogData,
    });
    expect(nullBase.ok).toBe(false);
    expect(!nullBase.ok && nullBase.issues[0]?.code).toBe('malformed-definition');
  });

  it('S11 rejects an unknown prop on a registered component', () => {
    const created = createCatalog(acmeDefinition);
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    const report = validateUiSpec(
      { root: { component: 'acme-kpi-card', props: { onclick: 'steal()' } }, version: 1 },
      { catalog: created.catalog },
    );
    expect(report.ok).toBe(false);
    const issue = report.issues[0];
    expect(issue?.code).toBe('unknown-prop');
    expect(issue?.message).toContain('acme-kpi-card');
    expect(issue?.message).toContain('onclick');
  });

  it('S12 rejects a component outside the registered catalog', () => {
    const created = createCatalog(acmeDefinition);
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    const report = validateUiSpec(
      { root: { component: 'acme-invoice-table' }, version: 1 },
      { catalog: created.catalog },
    );
    expect(report.ok).toBe(false);
    const issue = report.issues[0];
    expect(issue?.code).toBe('unknown-component');
    expect(issue?.message).toContain('acme-invoice-table');
  });

  it('S10 keeps a created catalog immutable after creation', () => {
    const created = createCatalog(acmeDefinition);
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    const entry = created.catalog.components['acme-kpi-card'];
    expect(Object.isFrozen(created.catalog)).toBe(true);
    expect(Object.isFrozen(entry)).toBe(true);
    expect(Object.isFrozen(entry?.props['tone'])).toBe(true);
    expect(Object.isFrozen(entry?.props['tone']?.values)).toBe(true);
    expect(() => {
      (entry?.props['tone']?.values as string[]).push('bogus');
    }).toThrow(TypeError);
    const report = validateUiSpec(
      { root: { component: 'acme-kpi-card', props: { tone: 'bogus' } }, version: 1 },
      { catalog: created.catalog },
    );
    expect(report.ok).toBe(false);
    expect(report.issues[0]?.code).toBe('invalid-prop-type');
  });

  it('rejects a definition declaring an event-handler prop name (no-code-execution boundary)', () => {
    const created = createCatalog({
      components: {
        'acme-kpi-card': {
          ...acmeKpiCard,
          props: { onclick: { description: 'hostile', type: 'string' } },
        },
      },
    });
    expect(created.ok).toBe(false);
    expect(
      !created.ok &&
        created.issues.some((i) => i.code === 'forbidden-key' && i.value === 'onclick'),
    ).toBe(true);
    // setAttribute lowercases attribute names, so a mixed-case handler name
    // installs a live handler just the same — the rejection is case-insensitive.
    const mixed = createCatalog({
      components: {
        'acme-kpi-card': {
          ...acmeKpiCard,
          props: { onClick: { description: 'hostile', type: 'string' } },
        },
      },
    });
    expect(mixed.ok).toBe(false);
    expect(!mixed.ok && mixed.issues.some((i) => i.code === 'forbidden-key')).toBe(true);
  });

  it('rejects a definition declaring an empty or invalid attribute name', () => {
    const empty = createCatalog({
      components: {
        'acme-kpi-card': { ...acmeKpiCard, props: { '': { description: 'x', type: 'string' } } },
      },
    });
    expect(empty.ok).toBe(false);
    expect(!empty.ok && empty.issues.some((i) => i.code === 'malformed-constraint')).toBe(true);

    const spaced = createCatalog({
      components: {
        'acme-kpi-card': { ...acmeKpiCard, props: { 'a b': { description: 'x', type: 'string' } } },
      },
    });
    expect(spaced.ok).toBe(false);
    expect(!spaced.ok && spaced.issues.some((i) => i.code === 'malformed-constraint')).toBe(true);
  });
  it('snapshots the extend base before reading it, so a top-level accessor cannot run or throw (review regression)', () => {
    let getterRan = false;
    const hostileBase: Record<string, unknown> = {
      catalogSchemaVersion: catalogData.catalogSchemaVersion,
    };
    Object.defineProperty(hostileBase, 'components', {
      enumerable: true,
      get() {
        getterRan = true;
        throw new Error('accessor side effect');
      },
    });
    let created: ReturnType<typeof createCatalog> | undefined;
    expect(() => {
      created = createCatalog(acmeDefinition, {
        extend: hostileBase as unknown as typeof catalogData,
      });
    }).not.toThrow();
    expect(getterRan).toBe(false);
    expect(created?.ok).toBe(false);
    expect(created && !created.ok && created.issues[0]?.path).toContain('options.extend');
  });

  it('runs custom-element validation over the extend base entries (review regression)', () => {
    const base = {
      catalogSchemaVersion: catalogData.catalogSchemaVersion,
      components: { iframe: { ...acmeKpiCard, tag: 'iframe' } },
    } as unknown as typeof catalogData;
    const created = createCatalog(acmeDefinition, { extend: base });
    expect(created.ok).toBe(false);
    if (!created.ok) {
      const issue = created.issues.find((i) => i.code === 'invalid-tag');
      expect(issue?.value).toBe('iframe');
      expect(issue?.path).toContain('options.extend');
    }
  });
});

describe('createCatalog properties', () => {
  const validTag = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/u;

  it('S4 S5 S6 S7 never yields a mutable or malformed catalog for arbitrary payloads', () => {
    fc.assert(
      fc.property(fc.jsonValue({ maxDepth: 6 }), (payload) => {
        const created = createCatalog(payload);
        if (!created.ok) {
          expect(created.issues.length).toBeGreaterThan(0);
          return;
        }
        expect(Object.isFrozen(created.catalog)).toBe(true);
        for (const [key, entry] of Object.entries(created.catalog.components)) {
          expect(key).toBe(entry.tag);
          expect(entry.tag).toMatch(validTag);
          expect(entry.whenToUse.trim()).not.toBe('');
          expect(entry.whenNotToUse.trim()).not.toBe('');
          expect(entry.description.trim()).not.toBe('');
          expect(Object.isFrozen(entry)).toBe(true);
          for (const constraint of Object.values(entry.props)) {
            expect(Object.isFrozen(constraint)).toBe(true);
            if (constraint.type === 'enum') {
              expect(constraint.values && constraint.values.length > 0).toBe(true);
            }
          }
        }
      }),
      { numRuns: 250, seed: 32_032 },
    );
  });

  it('S5 S6 accepts only valid tags and non-blank guidance over definition-shaped payloads', () => {
    const tagArb = fc.oneof(
      fc.constantFrom('acme-widget', 'AcmeCard', 'acme', 'font-face', 'x-', '-acme', 'acme-ü'),
      fc.string({ maxLength: 24 }),
    );
    const guidanceArb = fc.oneof(
      fc.constantFrom('Use for Acme metrics.', '', '   ', '\t'),
      fc.string({ maxLength: 24 }),
    );
    fc.assert(
      fc.property(tagArb, guidanceArb, (tag, whenToUse) => {
        const created = createCatalog({
          components: { [tag]: { ...acmeKpiCard, tag, whenToUse } },
        });
        if (created.ok) {
          expect(tag).toMatch(validTag);
          expect(whenToUse.trim()).not.toBe('');
        }
      }),
      { numRuns: 300, seed: 32_033 },
    );
  });
});

describe('createCatalog — declared prop constraints over registered components', () => {
  const withProps = (props: Record<string, unknown>) => ({
    components: { 'acme-kpi-card': { ...acmeKpiCard, props } },
  });

  it.each([
    [
      'the required string prop "title"',
      { title: { description: 'The metric name.', required: true, type: 'string' } },
      {},
      'title',
      'missing-required-prop',
    ],
    [
      'the number prop "trend" bounded to 0..100',
      { trend: { description: 'Trend in percent.', maximum: 100, minimum: 0, type: 'number' } },
      { trend: 101 },
      'trend',
      'prop-out-of-range',
    ],
    [
      'the URL-typed string prop "logo"',
      { logo: { description: 'Brand mark.', format: 'url', type: 'string' } },
      { logo: 'javascript:alert(1)' },
      'logo',
      'url-scheme',
    ],
  ])(
    'S18 enforces %s at validation, naming the component, the prop and the rule',
    (_declaration, props, specProps, prop, rule) => {
      const created = createCatalog(withProps(props));
      expect(created.ok).toBe(true);
      if (!created.ok) {
        return;
      }
      const report = validateUiSpec(
        { root: { component: 'acme-kpi-card', props: specProps }, version: 1 },
        { catalog: created.catalog },
      );
      expect(report.ok).toBe(false);
      const issue = report.issues[0];
      expect(issue?.code).toBe(rule);
      expect(issue?.path).toBe(`root.props.${prop}`);
      expect(issue?.message).toContain('acme-kpi-card');
      expect(issue?.message).toContain(`"${prop}"`);
    },
  );

  it('S18 keeps a declared required flag through extension of the built-in catalog', () => {
    const created = createCatalog(
      withProps({ title: { description: 'The metric name.', required: true, type: 'string' } }),
      { extend: catalogData },
    );
    expect(created.ok).toBe(true);
    if (!created.ok) {
      return;
    }
    expect(created.catalog.components['acme-kpi-card']?.props['title']?.required).toBe(true);
    expect(created.catalog.components['ki-textarea']?.props['label']?.required).toBe(true);
  });

  it.each([
    ['a bound on a prop that is not a number', { description: '', maximum: 3, type: 'string' }],
    ['a minimum above its maximum', { description: '', maximum: 1, minimum: 2, type: 'number' }],
    [
      'a default outside its own bounds',
      { default: 7, description: '', maximum: 5, minimum: 0, type: 'number' },
    ],
    ['a bound that is not a number', { description: '', maximum: '20', type: 'number' }],
    ['a format on a prop that is not a string', { description: '', format: 'url', type: 'number' }],
    ['a format the catalog does not know', { description: '', format: 'uri', type: 'string' }],
  ])('S7 rejects %s as a malformed constraint', (_case, constraint) => {
    const created = createCatalog(withProps({ trend: constraint }));
    expect(created.ok).toBe(false);
    if (!created.ok) {
      expect(created.issues[0]?.code).toBe('malformed-constraint');
      expect(created.issues[0]?.path).toContain('definition.components.acme-kpi-card.props.trend');
    }
  });

  it('S7 rejects a required flag that is not a boolean', () => {
    const created = createCatalog(
      withProps({ title: { description: 'The metric name.', required: 'yes', type: 'string' } }),
    );
    expect(created.ok).toBe(false);
    expect(!created.ok && created.issues[0]?.code).toBe('malformed-constraint');
  });
});

describe('createCatalog — reserved attribute names (FR-015)', () => {
  const withProp = (name: string) => ({
    components: {
      'acme-kpi-card': {
        ...acmeKpiCard,
        props: { [name]: { description: 'hostile', type: 'string' } },
      },
    },
  });

  it.each([
    'style',
    'class',
    'slot',
    'id',
    'STYLE',
    'Class',
    'sLoT',
    'ID',
    'DATA-KI-MARKDOWN-ORIGINS',
  ])(
    'S19 rejects a definition declaring the reserved prop "%s", naming the entry and the prop',
    (name) => {
      const created = createCatalog(withProp(name));
      expect(created.ok).toBe(false);
      expect(created.issues).toEqual([
        {
          code: 'forbidden-key',
          message: expect.stringMatching(
            new RegExp(`^acme-kpi-card prop "${name}" uses a reserved attribute name`, 'u'),
          ) as string,
          path: `definition.components.acme-kpi-card.props.${name}`,
          value: name,
        },
      ]);
    },
  );

  it('S19 rejects every letter-case spelling of the reserved names', () => {
    const spelling = fc
      .constantFrom('style', 'class', 'slot', 'id', 'data-ki-markdown-origins')
      .chain((name) =>
        fc
          .array(fc.boolean(), { maxLength: name.length, minLength: name.length })
          .map((upper) =>
            name.replace(/[a-z]/gu, (char, index: number) =>
              upper[index] === true ? char.toUpperCase() : char,
            ),
          ),
      );
    fc.assert(
      fc.property(spelling, (name) => {
        const created = createCatalog(withProp(name));
        expect(created.ok).toBe(false);
        expect(created.issues.map((issue) => [issue.code, issue.value])).toEqual([
          ['forbidden-key', name],
        ]);
      }),
    );
  });

  it('S19 rejects a reserved prop carried by an extended base catalog', () => {
    const base = {
      catalogSchemaVersion: catalogData.catalogSchemaVersion,
      components: {
        'acme-legacy': {
          ...acmeKpiCard,
          props: { class: { description: 'hostile', type: 'string' } },
          tag: 'acme-legacy',
        },
      },
    } as unknown as typeof catalogData;
    const created = createCatalog(acmeDefinition, { extend: base });
    expect(created.ok).toBe(false);
    expect(created.issues).toContainEqual(
      expect.objectContaining({
        code: 'forbidden-key',
        path: 'options.extend.components.acme-legacy.props.class',
        value: 'class',
      }),
    );
  });

  it.each(['styles', 'classes', 'slotted', 'identifier', 'data-id', 'style-name', 'idle'])(
    'S19 still accepts the non-reserved prop name "%s"',
    (name) => {
      expect(createCatalog(withProp(name)).ok).toBe(true);
    },
  );

  it('S19 keeps the built-in catalog extendable: no built-in prop is reserved', () => {
    const created = createCatalog(acmeDefinition, { extend: catalogData });
    expect(created.issues).toEqual([]);
    expect(created.ok).toBe(true);
  });
});
