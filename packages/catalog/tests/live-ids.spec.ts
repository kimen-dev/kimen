// @spec:035-live-surface
// Stable node ids (D2) and the SemVer-compatible catalog schema version gate
// (D8): the additive `id` lands as catalog schema 1.1.0 without rejecting
// specs and hosts that declare 1.0.0.
import { beforeEach, describe, expect, it } from 'vitest';

import {
  CATALOG_SCHEMA_VERSION,
  type Catalog,
  catalogData,
  createCatalog,
  createLiveSurface,
  createStreamingRenderer,
  renderUiSpec,
  validateUiSpec,
} from '../src/index.js';

let surface: HTMLElement;

beforeEach(() => {
  document.body.replaceChildren();
  surface = document.createElement('div');
  document.body.appendChild(surface);
});

const cardWithIds = (...ids: string[]): unknown => ({
  version: 1,
  root: {
    component: 'ki-card',
    ...(ids[0] === undefined ? {} : { id: ids[0] }),
    slots: {
      '': ids.slice(1).map((id) => ({ component: 'ki-badge', id, slots: { '': [id] } })),
    },
  },
});

describe('035 — nodes may carry stable ids', () => {
  it('S1 a node carrying a valid id validates and renders without exposing the id', () => {
    expect(validateUiSpec(cardWithIds('dec-3', 'q_1'))).toEqual({ issues: [], ok: true });
    const result = renderUiSpec(cardWithIds('dec-3', 'q_1'), { surface });
    expect(result).toEqual({ diagnostics: [], ok: true });
    expect(surface.querySelector('ki-card')).not.toBeNull();
    expect(surface.querySelectorAll('[id]')).toHaveLength(0);
    expect(surface.innerHTML).not.toContain('dec-3"');
  });

  it('S1 a streamed chunk may carry an id', () => {
    const stream = createStreamingRenderer({ surface });
    expect(stream.push({ component: 'ki-badge', id: 'b-1' }).ok).toBe(true);
    expect(surface.querySelectorAll('[id]')).toHaveLength(0);
  });

  it.each([
    ['Dec 3', 'uppercase and a space'],
    ['-dec', 'a leading hyphen'],
    ['x'.repeat(65), 'a 65-character id'],
    ['', 'an empty id'],
  ])('S2 rejects the id %j (%s) as invalid-id', (id) => {
    const report = validateUiSpec(cardWithIds(id));
    expect(report.ok).toBe(false);
    expect(report.issues[0]).toMatchObject({ code: 'invalid-id', path: 'root.id', value: id });
    const rendered = renderUiSpec(cardWithIds(id), { surface });
    expect(rendered.ok).toBe(false);
    expect(rendered.diagnostics[0]?.rule).toBe('invalid-id');
    expect(surface.childNodes).toHaveLength(0);
  });

  it('S2 accepts the longest id the grammar allows (64 characters)', () => {
    expect(validateUiSpec(cardWithIds('x'.repeat(64))).ok).toBe(true);
  });

  it('S2 rejects a repeated id as duplicate-id naming the second occurrence', () => {
    const report = validateUiSpec(cardWithIds('dec-3', 'dec-3'));
    expect(report.ok).toBe(false);
    expect(report.issues).toEqual([
      expect.objectContaining({
        code: 'duplicate-id',
        path: 'root.slots.[0].id',
        value: 'dec-3',
      }),
    ]);
    expect(renderUiSpec(cardWithIds('dec-3', 'dec-3'), { surface }).ok).toBe(false);
    expect(surface.childNodes).toHaveLength(0);
  });
});

describe('035 — compatible catalog schema versions are accepted', () => {
  it('S3 the catalog schema version is 1.1.0 (the additive id minor)', () => {
    expect(CATALOG_SCHEMA_VERSION).toBe('1.1.0');
    expect(catalogData.catalogSchemaVersion).toBe('1.1.0');
  });

  const catalog: Catalog = { ...catalogData, catalogSchemaVersion: '1.1.0' };
  const card = { version: 1, root: { component: 'ki-card' } };

  it.each(['1.0.0', '1.1.0', '1.1.7'])('S3 accepts the declared version %s', (declared) => {
    expect(renderUiSpec(card, { catalog, catalogSchemaVersion: declared, surface }).ok).toBe(true);
    expect(renderUiSpec({ ...card, catalogSchemaVersion: declared }, { catalog, surface }).ok).toBe(
      true,
    );
    expect(
      createStreamingRenderer({ catalog, catalogSchemaVersion: declared, surface }).push({
        component: 'ki-card',
      }).ok,
    ).toBe(true);
  });

  it.each(['1.2.0', '2.0.0', '0.9.0', '1.1', '1.1.0-beta', 'v1.1.0', '01.1.0'])(
    'S3 rejects the declared version %s as unsupported-version',
    (declared) => {
      const result = renderUiSpec(card, { catalog, catalogSchemaVersion: declared, surface });
      expect(result.ok).toBe(false);
      expect(result.diagnostics[0]).toMatchObject({ rule: 'unsupported-version', value: declared });
      expect(result.diagnostics[0]?.message).toContain('1.1.0');
      const stream = createStreamingRenderer({ catalog, catalogSchemaVersion: declared, surface });
      expect(stream.push({ component: 'ki-card' }).diagnostics[0]?.rule).toBe(
        'unsupported-version',
      );
      expect(surface.childNodes).toHaveLength(0);
    },
  );

  it('S3 createCatalog accepts an extend base of a compatible older minor', () => {
    const definition = {
      components: {
        'acme-note': {
          description: 'A note.',
          events: {},
          props: {},
          slots: { '': 'Text.' },
          tag: 'acme-note',
          whenNotToUse: 'Never.',
          whenToUse: 'Always.',
        },
      },
    };
    const older = createCatalog(definition, {
      extend: { ...catalogData, catalogSchemaVersion: '1.0.0' },
    });
    expect(older.ok).toBe(true);
    const newer = createCatalog(definition, {
      extend: { ...catalogData, catalogSchemaVersion: '1.2.0' },
    });
    expect(newer.ok).toBe(false);
    expect(newer.ok ? undefined : newer.issues[0]?.code).toBe('unsupported-version');
  });
});

describe('035 S23 — a 0.x catalog schema accepts only its own minor', () => {
  const zeroCatalog = (version: string) =>
    ({
      catalogSchemaVersion: version,
      components: { 'ki-badge': { description: '', events: {}, props: {}, slots: { '': '' } } },
    }) as unknown as Catalog;

  it.each([
    ['0.3.0', '0.3.0', true],
    ['0.3.4', '0.3.0', true],
    ['0.3.0', '0.3.9', true],
    ['0.3.0', '0.1.0', false],
    ['0.3.0', '0.2.9', false],
    ['0.3.0', '0.4.0', false],
    ['0.3.0', '1.3.0', false],
  ] as const)(
    'S23 a %s catalog with a spec declaring %s accepts: %s',
    (supported, declared, ok) => {
      const live = createLiveSurface({
        catalog: zeroCatalog(supported),
        catalogSchemaVersion: declared,
        surface,
      });
      const result = live.apply({ ops: [{ node: { component: 'ki-badge' }, op: 'insert' }] });
      expect(result.ok).toBe(ok);
      if (!ok) {
        expect(result.diagnostics.map((diagnostic) => diagnostic.rule)).toEqual([
          'unsupported-version',
        ]);
      }
      const rendered = renderUiSpec(
        {
          actions: [],
          catalogSchemaVersion: declared,
          root: { component: 'ki-badge' },
          version: 1,
        },
        { catalog: zeroCatalog(supported), surface: document.createElement('div') },
      );
      expect(rendered.ok).toBe(ok);
    },
  );
});
