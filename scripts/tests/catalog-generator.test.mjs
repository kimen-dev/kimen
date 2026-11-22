// @spec:068-component-discovery
// @spec:027-runtime-catalog
// The catalog generator derives every declared prop limit from the manifest
// and nothing else: a limit the manifest states malformed is a generation
// failure, never a silently wider guardrail (FR-002, FR-016, FR-017).
import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCatalog } from '../../packages/catalog/scripts/generate-catalog.mjs';

const manifestWith = (attributes) => ({
  modules: [
    {
      declarations: [
        {
          attributes,
          customElement: true,
          description: 'A probe.',
          tagName: 'ki-probe',
          whenNotToUse: 'Never.',
          whenToUse: 'Only in this test.',
        },
      ],
    },
  ],
});

const catalogOptions = { elementsVersion: '0.0.0', catalogTags: new Set(['ki-probe']) };

const propsOf = (attributes) => {
  const source = buildCatalog(manifestWith(attributes), catalogOptions);
  const json = source.slice(source.indexOf('{'), source.lastIndexOf('}') + 1);
  return JSON.parse(json).components['ki-probe'].props;
};

test('S2 a deprecated enum value is separate from the values offered to agents', () => {
  const props = propsOf([
    {
      default: "'secondary'",
      deprecatedValues: ['tertiary'],
      name: 'variant',
      type: { text: '"secondary" | "tertiary"' },
    },
  ]);
  assert.deepEqual(props.variant.values, ['secondary']);
  assert.deepEqual(props.variant.deprecatedValues, ['tertiary']);
});

test('S2 deprecated enum metadata must describe an existing non-default value', () => {
  for (const attribute of [
    { deprecatedValues: ['tertiary'], type: { text: 'string' } },
    { deprecatedValues: ['other'], type: { text: '"secondary" | "tertiary"' } },
    {
      default: "'tertiary'",
      deprecatedValues: ['tertiary'],
      type: { text: '"secondary" | "tertiary"' },
    },
  ]) {
    assert.throws(
      () => buildCatalog(manifestWith([{ name: 'variant', ...attribute }]), catalogOptions),
      /ki-probe\.variant: .*deprecated/u,
    );
  }
});

test('S15 a required manifest attribute becomes a required constraint and nothing else does', () => {
  const props = propsOf([
    { name: 'label', required: true, type: { text: 'string' } },
    { name: 'hint', type: { text: 'string | undefined' } },
  ]);
  assert.equal(props.label.required, true);
  assert.equal(Object.hasOwn(props.hint, 'required'), false);
});

test('S17 numeric bounds on a number attribute become minimum and maximum', () => {
  const props = propsOf([
    { maximum: 20, minimum: 0, name: 'count', type: { text: 'number | undefined' } },
    { name: 'rows', type: { text: 'number' } },
  ]);
  assert.deepEqual([props.count.minimum, props.count.maximum], [0, 20]);
  assert.equal(Object.hasOwn(props.rows, 'minimum'), false);
  assert.equal(Object.hasOwn(props.rows, 'maximum'), false);
});

test('S17 a malformed bound fails generation naming the attribute', () => {
  for (const attribute of [
    { maximum: 20, name: 'label', type: { text: 'string' } },
    { maximum: '20', name: 'count', type: { text: 'number' } },
    { maximum: 1, minimum: 2, name: 'count', type: { text: 'number' } },
  ]) {
    assert.throws(
      () => buildCatalog(manifestWith([attribute]), catalogOptions),
      new RegExp(`ki-probe\\.${attribute.name}: .*bound`, 'u'),
    );
  }
});

test('S19 a string attribute declared with the url format becomes a URL-typed constraint', () => {
  const props = propsOf([
    { format: 'url', name: 'source', type: { text: 'string | undefined' } },
    { name: 'caption', type: { text: 'string | undefined' } },
  ]);
  assert.equal(props.source.format, 'url');
  assert.equal(Object.hasOwn(props.caption, 'format'), false);
});

test('S19 a format the catalog does not know, or one on a non-string attribute, fails generation', () => {
  for (const attribute of [
    { format: 'uri', name: 'source', type: { text: 'string' } },
    { format: 'url', name: 'count', type: { text: 'number' } },
  ]) {
    assert.throws(
      () => buildCatalog(manifestWith([attribute]), catalogOptions),
      new RegExp(`ki-probe\\.${attribute.name}: .*format`, 'u'),
    );
  }
});

test('a string attribute declared with the idref format becomes a reference constraint', () => {
  // Spec 152 FR-001: a prop naming another element by id resolves only to
  // a node of the same spec, because the component source says so.
  const props = propsOf([{ format: 'idref', name: 'for', type: { text: 'string | undefined' } }]);
  assert.equal(props.for.format, 'idref');
  assert.throws(
    () =>
      buildCatalog(
        manifestWith([{ format: 'idref', name: 'count', type: { text: 'number' } }]),
        catalogOptions,
      ),
    /ki-probe\.count: .*format/u,
  );
});

test('a string attribute declared with the text format is never a URL', () => {
  // Spec 154 FR-007: a prop named like a URL attribute that holds text says
  // so in the component source, and the catalog carries the declaration.
  const props = propsOf([{ format: 'text', name: 'action', type: { text: 'string' } }]);
  assert.equal(props.action.format, 'text');
  assert.throws(
    () =>
      buildCatalog(
        manifestWith([{ format: 'text', name: 'count', type: { text: 'number' } }]),
        catalogOptions,
      ),
    /ki-probe\.count: .*format/u,
  );
});

test('a form-action type offers agents the button value alone', () => {
  // Spec 152 FR-006: a spec owns no form, so submit and reset could only
  // act on the host page's form.
  const props = propsOf([
    { default: "'submit'", name: 'type', type: { text: '"button" | "reset" | "submit"' } },
    { name: 'kind', type: { text: '"button" | "submit"' } },
    { name: 'mode', type: { text: '"reset" | "submit"' } },
  ]);
  assert.deepEqual(props.type.values, ['button']);
  assert.equal(props.type.default, 'button');
  assert.deepEqual(props.kind.values, ['button', 'submit']);
  assert.deepEqual(props.mode.values, ['reset', 'submit']);
});

test('S3 catalog generation only exposes components with an explicit opt-in', () => {
  const manifest = manifestWith([]);
  const published = buildCatalog(manifest, catalogOptions);
  const privateOnly = buildCatalog(manifest, { elementsVersion: '0.0.0' });

  assert.match(published, /"ki-probe":/u);
  assert.doesNotMatch(privateOnly, /"ki-probe":/u);
  assert.match(privateOnly, /"p":/u);
});

test('reports an opted-in tag missing from the Custom Elements Manifest', () => {
  assert.throws(
    () => buildCatalog({ modules: [] }, catalogOptions),
    /ki-probe: catalog opt-in has no manifest declaration/u,
  );
});

test('a catalog action projects only its selected public event', () => {
  const manifest = manifestWith([]);
  manifest.modules[0].declarations[0].events = [
    { name: 'ki-success', description: 'Succeeded.' },
    { name: 'ki-failure', description: 'Failed.' },
  ];
  const source = buildCatalog(manifest, {
    ...catalogOptions,
    catalogActions: new Map([['ki-probe', 'ki-success']]),
  });
  const json = source.slice(source.indexOf('{'), source.lastIndexOf('}') + 1);
  assert.deepEqual(JSON.parse(json).components['ki-probe'].events, {
    'ki-success': 'Succeeded.',
  });
});

test('a catalog action must select a public event', () => {
  assert.throws(
    () =>
      buildCatalog(manifestWith([]), {
        ...catalogOptions,
        catalogActions: new Map([['ki-probe', 'ki-missing']]),
      }),
    /ki-probe: catalog action ki-missing is not a declared event/u,
  );
});

test('preserves a double-quoted manifest string default containing an apostrophe', () => {
  const props = propsOf([
    { default: `"Couldn't copy"`, name: 'copy-error-label', type: { text: 'string' } },
  ]);
  assert.equal(props['copy-error-label'].default, "Couldn't copy");
});
