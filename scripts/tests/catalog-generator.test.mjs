// @spec:068-component-discovery
// @spec:027-runtime-catalog
// The catalog generator derives every declared prop limit from the manifest
// and nothing else: a limit the manifest states malformed is a generation
// failure, never a silently wider guardrail (FR-002, FR-016, FR-017).
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';

import {
  catalogModules,
  constType,
  deriveCatalog,
  jsonLines,
  splitGuidance,
} from '../../packages/catalog/scripts/generate-catalog.mjs';

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

const propsOf = (attributes) =>
  deriveCatalog(manifestWith(attributes), catalogOptions).components['ki-probe'].props;

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
      () => deriveCatalog(manifestWith([{ name: 'variant', ...attribute }]), catalogOptions),
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
      () => deriveCatalog(manifestWith([attribute]), catalogOptions),
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
      () => deriveCatalog(manifestWith([attribute]), catalogOptions),
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
      deriveCatalog(
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
      deriveCatalog(
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
  const published = deriveCatalog(manifest, catalogOptions).components;
  const privateOnly = deriveCatalog(manifest, { elementsVersion: '0.0.0' }).components;

  assert.equal(Object.hasOwn(published, 'ki-probe'), true);
  assert.equal(Object.hasOwn(privateOnly, 'ki-probe'), false);
  assert.equal(Object.hasOwn(privateOnly, 'p'), true);
});

test('reports an opted-in tag missing from the Custom Elements Manifest', () => {
  assert.throws(
    () => deriveCatalog({ modules: [] }, catalogOptions),
    /ki-probe: catalog opt-in has no manifest declaration/u,
  );
});

test('a catalog action projects only its selected public event', () => {
  const manifest = manifestWith([]);
  manifest.modules[0].declarations[0].events = [
    { name: 'ki-success', description: 'Succeeded.' },
    { name: 'ki-failure', description: 'Failed.' },
  ];
  const catalog = deriveCatalog(manifest, {
    ...catalogOptions,
    catalogActions: new Map([['ki-probe', 'ki-success']]),
  });
  assert.deepEqual(catalog.components['ki-probe'].events, {
    'ki-success': 'Succeeded.',
  });
});

test('a catalog action must select a public event', () => {
  assert.throws(
    () =>
      deriveCatalog(manifestWith([]), {
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

// The guidance prose leaves the structure the boundary reads (Art. VIII):
// a host that validates and renders downloads none of it, and catalogData
// still carries it (src/guidance.ts writes it back).
const guidedManifest = () => {
  const manifest = manifestWith([
    {
      default: "'neutral'",
      description: 'The tone.',
      name: 'tone',
      type: { text: '"neutral" | "danger"' },
    },
    { description: 'The label.', name: 'label', required: true, type: { text: 'string' } },
  ]);
  Object.assign(manifest.modules[0].declarations[0], {
    events: [{ description: 'Fires on change.', name: 'ki-change' }],
    slots: [{ description: 'The content.' }, { description: 'Leading.', name: 'start' }],
  });
  return manifest;
};

test('the structure blanks a custom element guidance prose in place and keeps native primitives whole', () => {
  const catalog = deriveCatalog(guidedManifest(), catalogOptions);
  const { guidance, structure } = splitGuidance(catalog);

  assert.deepEqual(Object.keys(structure), ['catalogSchemaVersion', 'components']);
  assert.deepEqual(Object.keys(structure.components), Object.keys(catalog.components));
  const probe = structure.components['ki-probe'];
  const whole = catalog.components['ki-probe'];
  assert.deepEqual(Object.keys(probe), Object.keys(whole));
  assert.deepEqual([probe.description, probe.whenNotToUse, probe.whenToUse], ['', '', '']);
  assert.deepEqual(probe.events, { 'ki-change': '' });
  assert.deepEqual(probe.slots, { '': '', start: '' });
  for (const [name, constraint] of Object.entries(probe.props)) {
    assert.deepEqual(Object.keys(constraint), Object.keys(whole.props[name]), name);
    assert.equal(constraint.description, '', name);
    assert.deepEqual(
      { ...constraint, description: whole.props[name].description },
      whole.props[name],
    );
  }
  assert.deepEqual(guidance, {
    'ki-probe': {
      description: 'A probe.',
      events: { 'ki-change': 'Fires on change.' },
      props: { label: 'The label.', tone: 'The tone.' },
      slots: { '': 'The content.', start: 'Leading.' },
      whenNotToUse: 'Never.',
      whenToUse: 'Only in this test.',
    },
  });
  for (const tag of ['div', 'img', 'p', 'table']) {
    assert.deepEqual(structure.components[tag], catalog.components[tag], tag);
    assert.equal(Object.hasOwn(guidance, tag), false, tag);
  }
});

test('writing the guidance back into the blanks yields the catalog, key order included', () => {
  const catalog = deriveCatalog(guidedManifest(), catalogOptions);
  const { guidance, structure } = splitGuidance(catalog);
  // The same fill src/guidance.ts performs; the catalog package tests run that one.
  const joined = JSON.parse(JSON.stringify(structure.components));
  for (const [tag, text] of Object.entries(guidance)) {
    const entry = joined[tag];
    for (const field of ['description', 'whenNotToUse', 'whenToUse']) entry[field] = text[field];
    for (const name of Object.keys(entry.props)) entry.props[name].description = text.props[name];
    for (const name of Object.keys(entry.slots)) entry.slots[name] = text.slots[name];
    for (const name of Object.keys(entry.events)) entry.events[name] = text.events[name];
  }
  assert.equal(
    JSON.stringify({ ...structure, components: joined, elementsVersion: '0.0.0' }),
    JSON.stringify(catalog),
  );
});

test('catalogData is typed as the literal TypeScript infers for the catalog as const', () => {
  const value = { 'a-b': [1, -2, 'c'], d: {}, '': true, e: { f: 'g' }, h: [] };
  const inferred = ts.transpileDeclaration(`export const x = ${JSON.stringify(value)} as const;`, {
    compilerOptions: { declaration: true },
  }).outputText;
  const printed = ts.transpileDeclaration(`export declare const x: ${constType(value)};`, {
    compilerOptions: { declaration: true },
  }).outputText;
  assert.equal(printed, inferred);
});

test('the structure lays out one line per prop constraint', () => {
  assert.equal(
    jsonLines({ a: { b: { c: [1], d: 'e' } }, f: {} }, 2),
    '{\n  "a": {\n    "b": {"c":[1],"d":"e"}\n  },\n  "f": {}\n}',
  );
});

test('the elements version reaches catalog.ts alone, so a release regenerates only it', () => {
  const manifest = guidedManifest();
  const modules = catalogModules(deriveCatalog(manifest, catalogOptions));
  const bumped = catalogModules(
    deriveCatalog(manifest, { ...catalogOptions, elementsVersion: '9.9.9' }),
  );
  assert.deepEqual(Object.keys(modules), [
    'catalog-guidance.ts',
    'catalog-structure.ts',
    'catalog.ts',
  ]);
  assert.equal(bumped['catalog-guidance.ts'], modules['catalog-guidance.ts']);
  assert.equal(bumped['catalog-structure.ts'], modules['catalog-structure.ts']);
  assert.notEqual(bumped['catalog.ts'], modules['catalog.ts']);
  assert.doesNotMatch(modules['catalog-structure.ts'], /A probe\.|The tone\.|Fires on change\./u);
  assert.throws(
    () => catalogModules(deriveCatalog(manifest, { catalogTags: catalogOptions.catalogTags })),
    /elements version is required/u,
  );
});
