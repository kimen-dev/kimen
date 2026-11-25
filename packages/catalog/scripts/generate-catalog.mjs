#!/usr/bin/env node
// Catalog generation (spec 027, Art. I): the committed Custom Elements
// Manifest supplies component contracts. Component manifests explicitly
// select the custom elements exposed to agents. The output is three
// generated, committed TypeScript modules holding one entry per opted-in
// custom element; the catalog-sync gate fails any drift between the
// committed artifacts and a fresh regeneration (tokens-sync / surfaces-sync
// precedent):
//
// - src/generated/catalog-structure.ts: what the boundary checks and the
//   renderer writes — tags, props and their constraints, slot and event
//   names. A custom element's guidance prose is left blank there, so a host
//   that only validates and renders never downloads it. The native
//   primitives stay whole: the renderer compares a catalog's native entries
//   with Kimen's definition in full (spec 037 D9).
// - src/generated/catalog-guidance.ts: that prose — descriptions, when to
//   use and when not to use, the prop, slot and event descriptions — which
//   only prompt-facing code reads, through `catalogData`.
// - src/generated/catalog.ts: `catalogData`, both written back together
//   (src/guidance.ts) with the elements version, typed as the literal the
//   whole catalog is.
//
// Determinism (FR-008): each module body is JSON.stringify with sorted keys,
// two-space indent and one trailing newline; no timestamps, no absolute
// paths, no machine state. Byte-identical output from any checkout location
// follows by construction — nothing here reads the environment.
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { NATIVE_PRIMITIVES } from './primitives.mjs';

/**
 * The version of the catalog document format itself (FR-010, Art. IX).
 * 1.1.0 (spec 035): UI-spec nodes gain the optional stable `id` — an
 * additive minor the SemVer-compatible version gates accept alongside 1.0.0.
 * 1.2.0: prop constraints gain optional declared limits (`required`,
 * `minimum`, `maximum`, `format`) the boundary enforces. Additive again: a 1.2.0 boundary still validates what a
 * 1.0.0 or 1.1.0 spec says, and a boundary that predates the limits refuses
 * a 1.2.0 catalog instead of validating it under laxer rules (028 FR-012).
 * 1.3.0 (spec 037): the catalog gains the native primitives (h2–h4, p,
 * strong, em, img, div) and prop constraints gain the optional `allowEmpty`.
 * Additive: a 1.2.0 spec still validates, and a 1.2.0 boundary refuses a
 * 1.3.0 spec rather than reading native tags it cannot guard.
 * 1.4.0 (issue #344): enum constraints can declare optional
 * `deprecatedValues` accepted in old specs and omitted from new schemas.
 * 1.5.0 (issue #387): a numeric-or-string property preserves both scalar
 * values and serialized intervals.
 * 1.6.0 (spec 152): a string prop that names another element by id carries
 * `format: "idref"` and resolves only to a node of the same spec; a
 * form-action `type` (an enum offering `button` with `submit` or `reset`)
 * offers agents `button` alone. A 1.5.0 boundary refuses a 1.6.0 spec
 * rather than resolving references it cannot contain.
 * 1.7.0 (spec 153): a bound node may `collect` other fields by id, and its
 * action carries their live values once every one of them is valid; every
 * action event names the bound node's `id`. Additive: a 1.6.0 spec keeps its
 * meaning, and a 1.6.0 boundary refuses a 1.7.0 spec rather than dispatching
 * an action without the fields it was meant to carry.
 * 1.8.0 (spec 154): a node's `action` may also map each event its component
 * declares to the declared action that event fires, and a string prop may
 * declare `format: "text"`, which is never a URL whatever its name. Additive:
 * a 1.7.0 spec keeps its meaning, and a 1.7.0 boundary refuses a 1.8.0 spec
 * rather than reading a binding it cannot wire.
 * 1.9.0 (spec 158): the native primitives gain the read-only table elements
 * (table, caption, thead, tbody, tr, th, td) under a strict content model.
 * Additive: a 1.8.0 spec keeps its meaning, and a 1.8.0 boundary refuses a
 * 1.9.0 spec rather than reading table tags it cannot guard.
 */
export const CATALOG_SCHEMA_VERSION = '1.9.0';

/**
 * A spec owns no form, so a submit or reset button in it could only act on
 * the host page's form (spec 152 FR-006): the agent catalog narrows a
 * form-action `type` to `button`, and the renderers pin it.
 */
const FORM_ACTIONS = ['reset', 'submit'];

function narrowFormActionType(name, entry) {
  if (
    name !== 'type' ||
    entry.type !== 'enum' ||
    !entry.values.includes('button') ||
    !entry.values.some((value) => FORM_ACTIONS.includes(value))
  ) {
    return;
  }
  entry.values = ['button'];
  entry.default = 'button';
  if (entry.deprecatedValues !== undefined) {
    entry.deprecatedValues = entry.deprecatedValues.filter(
      (value) => !FORM_ACTIONS.includes(value),
    );
    if (entry.deprecatedValues.length === 0) {
      delete entry.deprecatedValues;
    }
  }
}

const isBlank = (text) => typeof text !== 'string' || text.trim() === '';

/**
 * Parses a manifest attribute `type.text` into a catalog prop constraint as
 * narrow as the manifest documents (FR-002). The manifest's grammar is
 * closed (spec 017 generates it), so an unrecognized shape is a derivation
 * defect and MUST fail generation rather than silently widen the guardrail.
 */
export function parseTypeText(text) {
  const parts = text.split('|').map((part) => part.trim());
  const withoutUndefined = parts.filter((part) => part !== 'undefined');
  if (
    withoutUndefined.length === 1 &&
    ['boolean', 'number', 'string'].includes(withoutUndefined[0])
  ) {
    return { type: withoutUndefined[0] };
  }
  // DOM string-array properties still receive strings through HTML attributes.
  if (
    withoutUndefined.length === 2 &&
    withoutUndefined.includes('string') &&
    withoutUndefined.includes('string[]')
  ) {
    return { type: 'string' };
  }
  if (
    withoutUndefined.length === 2 &&
    withoutUndefined.includes('number') &&
    withoutUndefined.includes('string')
  ) {
    return { type: 'number-or-string' };
  }
  const quoted = withoutUndefined.filter((part) => /^"[^"]*"$/.test(part));
  const rest = withoutUndefined.filter((part) => !/^"[^"]*"$/.test(part));
  if (quoted.length > 0 && rest.length === 0) {
    return { type: 'enum', values: quoted.map((part) => part.slice(1, -1)) };
  }
  if (quoted.length > 0 && rest.length === 1 && rest[0] === 'string & {}') {
    // The manifest's deliberately open unions ("danger" | ... | string & {})
    // keep markup tolerant, but a generated spec may use only the literals:
    // an invented tone would render neutral and lose its live-region urgency
    // (spec 164 FR-001). Consumer definitions may still declare open strings.
    return { type: 'enum', values: quoted.map((part) => part.slice(1, -1)) };
  }
  return null;
}

/** Parses a manifest default (a JS source string) into a data value. */
export function parseDefault(source, constraint) {
  if (typeof source !== 'string') {
    return undefined;
  }
  const stringMatch = /^'(.*)'$/u.exec(source);
  if (stringMatch !== null) {
    return stringMatch[1];
  }
  if (source.startsWith('"')) {
    try {
      const value = JSON.parse(source);
      return typeof value === 'string' ? value : undefined;
    } catch {
      return undefined;
    }
  }
  if (source === 'true' || source === 'false') {
    return source === 'true';
  }
  if (['number', 'number-or-string'].includes(constraint.type) && Number.isFinite(Number(source))) {
    return Number(source);
  }
  return undefined;
}

function addDeprecatedValues(constraint, deprecatedValues) {
  const values = constraint.type === 'enum' ? constraint.values : undefined;
  if (
    values === undefined ||
    !Array.isArray(deprecatedValues) ||
    deprecatedValues.length === 0 ||
    new Set(deprecatedValues).size !== deprecatedValues.length ||
    deprecatedValues.some((value) => !values.includes(value))
  ) {
    return 'deprecatedValues must list unique declared enum values';
  }
  const recommended = values.filter((value) => !deprecatedValues.includes(value));
  if (recommended.length === 0 || deprecatedValues.includes(constraint.default)) {
    return 'deprecatedValues must leave recommended values and cannot include the default';
  }
  constraint.deprecatedValues = deprecatedValues;
  constraint.values = recommended;
  return undefined;
}

/**
 * The inclusive numeric bounds a manifest attribute declares (the
 * component's `@minimum` / `@maximum` tags, carried as numbers), or the
 * reason they cannot be trusted: a bound on a non-number, a non-finite value
 * or an inverted range is a derivation defect and fails generation.
 */
function parseBounds(attribute, constraint) {
  const bounds = {};
  for (const name of ['minimum', 'maximum']) {
    const value = attribute[name];
    if (value === undefined) {
      continue;
    }
    if (constraint.type !== 'number') {
      return { violation: `${name} bound on a ${constraint.type} attribute` };
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return { violation: `${name} bound ${JSON.stringify(value)} is not a finite number` };
    }
    bounds[name] = value;
  }
  if (
    bounds.minimum !== undefined &&
    bounds.maximum !== undefined &&
    bounds.minimum > bounds.maximum
  ) {
    return { violation: 'minimum bound is above the maximum bound' };
  }
  return { bounds };
}

const sortedRecord = (entries) =>
  Object.fromEntries([...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

/**
 * Pure catalog derivation: manifest in, the whole catalog out (the value of
 * `catalogData`). Throws with every violation named when the manifest cannot
 * yield a sound catalog (missing guidance, unparseable type) — a build
 * failure, never a warning (FR-003; the agent-surfaces Art. I bar).
 */
export function deriveCatalog(
  manifest,
  {
    elementsVersion,
    catalogTags = new Set(),
    catalogActions = new Map(),
    primitives = NATIVE_PRIMITIVES,
  },
) {
  const violations = [];
  const components = new Map();
  for (const module of manifest.modules ?? []) {
    for (const declaration of module.declarations ?? []) {
      if (declaration.customElement !== true || isBlank(declaration.tagName)) {
        continue;
      }
      const tag = declaration.tagName;
      if (!catalogTags.has(tag)) continue;
      if (components.has(tag)) {
        violations.push(`${tag}: duplicate custom element declaration`);
        continue;
      }
      for (const field of ['description', 'whenToUse', 'whenNotToUse']) {
        if (isBlank(declaration[field])) {
          violations.push(`${tag}: missing ${field} in the manifest`);
        }
      }
      const props = new Map();
      for (const attribute of declaration.attributes ?? []) {
        const typeText = attribute.type?.text;
        const constraint = isBlank(typeText) ? null : parseTypeText(typeText);
        if (constraint === null) {
          violations.push(
            `${tag}.${attribute.name}: unrecognized manifest type ${JSON.stringify(typeText ?? null)}`,
          );
          continue;
        }
        const entry = { ...constraint, description: attribute.description ?? '' };
        const defaultValue = parseDefault(attribute.default, constraint);
        if (defaultValue !== undefined) {
          entry.default = defaultValue;
        }
        if (attribute.deprecatedValues !== undefined) {
          const violation = addDeprecatedValues(entry, attribute.deprecatedValues);
          if (violation !== undefined) {
            violations.push(`${tag}.${attribute.name}: ${violation}`);
            continue;
          }
        }
        // Required by the component contract (a prop declared with `!`):
        // carried only when set, so optional props stay byte-identical.
        if (attribute.required === true) {
          entry.required = true;
        }
        const { bounds, violation } = parseBounds(attribute, constraint);
        if (violation !== undefined) {
          violations.push(`${tag}.${attribute.name}: ${violation}`);
          continue;
        }
        Object.assign(entry, bounds);
        // `@format url` on the component prop: the value is held to the URL
        // policy. `@format idref` (spec 152): the value names another node
        // of the same spec. `@format text` (spec 154): the value is never a
        // URL, whatever the prop is called. Any other shape is a derivation
        // defect.
        if (attribute.format !== undefined) {
          if (
            !['idref', 'text', 'url'].includes(attribute.format) ||
            constraint.type !== 'string'
          ) {
            violations.push(
              `${tag}.${attribute.name}: unsupported format ${JSON.stringify(attribute.format)} on a ${constraint.type} attribute`,
            );
            continue;
          }
          entry.format = attribute.format;
        }
        narrowFormActionType(attribute.name, entry);
        props.set(attribute.name, entry);
      }
      const action = catalogActions.get(tag);
      const publicEvents = declaration.events ?? [];
      const events =
        action === undefined ? publicEvents : publicEvents.filter(({ name }) => name === action);
      if (action !== undefined && events.length !== 1) {
        violations.push(`${tag}: catalog action ${action} is not a declared event`);
      }
      const activationEvent = declaration.catalogAction;
      if (activationEvent !== undefined && !events.some(({ name }) => name === activationEvent)) {
        violations.push(`${tag}: catalog action must name a declared event`);
      }
      components.set(tag, {
        description: declaration.description,
        ...(activationEvent === undefined ? {} : { activationEvent }),
        events: sortedRecord(events.map((event) => [event.name, event.description ?? ''])),
        props: sortedRecord(props),
        slots: sortedRecord(
          (declaration.slots ?? []).map((slot) => [slot.name ?? '', slot.description ?? '']),
        ),
        tag,
        whenNotToUse: declaration.whenNotToUse,
        whenToUse: declaration.whenToUse,
      });
    }
  }
  for (const tag of catalogTags) {
    if (!components.has(tag)) violations.push(`${tag}: catalog opt-in has no manifest declaration`);
  }
  // The native primitives (spec 037) join the manifest's elements from their
  // one definition; a manifest element of the same tag is impossible (custom
  // elements carry a hyphen, primitives never do) and fails generation.
  for (const [tag, entry] of Object.entries(primitives)) {
    if (components.has(tag) || entry.tag !== tag) {
      violations.push(`${tag}: native primitive collides with a manifest element or its own tag`);
      continue;
    }
    components.set(tag, {
      ...entry,
      events: sortedRecord(Object.entries(entry.events)),
      props: sortedRecord(Object.entries(entry.props)),
      slots: sortedRecord(Object.entries(entry.slots)),
    });
  }
  if (violations.length > 0) {
    throw new Error(`catalog generation failed (Art. I):\n${violations.join('\n')}`);
  }
  return {
    catalogSchemaVersion: CATALOG_SCHEMA_VERSION,
    components: sortedRecord(components),
    elementsVersion,
  };
}

const blankRecord = (record) => Object.fromEntries(Object.keys(record).map((name) => [name, '']));

/**
 * The catalog in two parts (Art. VIII): the structure every boundary reads,
 * with each custom element's guidance prose blank, and that prose by tag.
 * The native primitives stay whole in the structure and have no guidance
 * entry: the renderer compares a catalog's native entries with Kimen's
 * definition in full (spec 037 D9), whichever catalog is in use. A blank
 * keeps its key where it was, so writing the prose back (src/guidance.ts)
 * yields the catalog exactly, key order included. The elements version
 * travels with neither: a release changes catalog.ts alone.
 */
export function splitGuidance(catalog, primitiveTags = Object.keys(NATIVE_PRIMITIVES)) {
  const components = {};
  const guidance = {};
  for (const [tag, entry] of Object.entries(catalog.components)) {
    if (primitiveTags.includes(tag)) {
      components[tag] = entry;
      continue;
    }
    components[tag] = {
      ...entry,
      description: '',
      events: blankRecord(entry.events),
      props: Object.fromEntries(
        Object.entries(entry.props).map(([name, constraint]) => [
          name,
          { ...constraint, description: '' },
        ]),
      ),
      slots: blankRecord(entry.slots),
      whenNotToUse: '',
      whenToUse: '',
    };
    guidance[tag] = {
      description: entry.description,
      events: entry.events,
      props: Object.fromEntries(
        Object.entries(entry.props).map(([name, constraint]) => [name, constraint.description]),
      ),
      slots: entry.slots,
      whenNotToUse: entry.whenNotToUse,
      whenToUse: entry.whenToUse,
    };
  }
  return {
    guidance,
    structure: { catalogSchemaVersion: catalog.catalogSchemaVersion, components },
  };
}

// A property name TypeScript prints bare; any other is quoted.
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;
const propertyName = (key) => (IDENTIFIER.test(key) ? key : JSON.stringify(key));

/**
 * The TypeScript type `as const` gives a JSON `value`, printed in the
 * modules' two-space indent: `catalogData` is joined at load time, so its
 * literal type is written out rather than inferred.
 */
export function constType(value, depth = 0) {
  const indent = '  '.repeat(depth + 1);
  const close = '  '.repeat(depth);
  if (Array.isArray(value)) {
    return `readonly [${value.map((item) => constType(item, depth)).join(', ')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    return entries.length === 0
      ? '{}'
      : `{\n${entries.map(([key, item]) => `${indent}readonly ${propertyName(key)}: ${constType(item, depth + 1)};`).join('\n')}\n${close}}`;
  }
  return JSON.stringify(value);
}

/**
 * JSON `value` with its objects laid out one member per line down to
 * `levels` deep, and compact below: the structure keeps one line per prop
 * constraint, where a full layout spends most of the emitted module on
 * indentation.
 */
export function jsonLines(value, levels, depth = 0) {
  if (
    depth >= levels ||
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length === 0
  ) {
    return JSON.stringify(value);
  }
  const indent = '  '.repeat(depth + 1);
  const members = Object.entries(value).map(
    ([key, item]) => `${indent}${JSON.stringify(key)}: ${jsonLines(item, levels, depth + 1)}`,
  );
  return `{\n${members.join(',\n')}\n${'  '.repeat(depth)}}`;
}

const HEADER = [
  '// GENERATED FILE (spec 027, Art. I) — never edit by hand.',
  '// Sources: packages/elements/generated/custom-elements.json and component.json opt-ins.',
  '// Generator: packages/catalog/scripts/generate-catalog.mjs. The catalog-sync gate',
  '// fails any drift between this artifact and a fresh regeneration.',
];

/** The three generated modules of one derived catalog, by file name. */
export function catalogModules(catalog, primitiveTags = Object.keys(NATIVE_PRIMITIVES)) {
  if (typeof catalog.elementsVersion !== 'string') {
    throw new Error('catalog generation failed (Art. I): the elements version is required');
  }
  const { guidance, structure } = splitGuidance(catalog, primitiveTags);
  return {
    'catalog-guidance.ts': [
      ...HEADER,
      "import type { CatalogGuidance } from '../guidance.js';",
      '',
      '/** The guidance prose of each custom element, by tag: only prompt-facing code reads it. */',
      `export const catalogGuidance: CatalogGuidance = ${JSON.stringify(guidance, null, 2)};`,
      '',
    ].join('\n'),
    'catalog-structure.ts': [
      ...HEADER,
      "import type { Catalog } from '../validate.js';",
      '',
      '/**',
      ' * What the boundary checks and the renderer writes: every entry, with a',
      " * custom element's guidance prose blank (catalog-guidance.ts holds it).",
      ' */',
      // Levels: the catalog, its components, an entry, its props: one line each.
      `export const catalogStructure: Catalog = ${jsonLines(structure, 4)};`,
      '',
    ].join('\n'),
    'catalog.ts': [
      ...HEADER,
      "import { withGuidance } from '../guidance.js';",
      "import { catalogGuidance } from './catalog-guidance.js';",
      "import { catalogStructure } from './catalog-structure.js';",
      '',
      '/** The whole catalog: the structure with its guidance prose written back. */',
      'export const catalogData = /* @__PURE__ */ withGuidance(',
      '  catalogStructure,',
      '  catalogGuidance,',
      `  ${JSON.stringify(catalog.elementsVersion)},`,
      `) as ${constType(catalog)};`,
      '',
    ].join('\n'),
  };
}

/** What the generator reads from a checkout rooted at `repoRoot`. */
export async function readCatalogInputs(repoRoot) {
  const manifest = JSON.parse(
    readFileSync(join(repoRoot, 'packages/elements/generated/custom-elements.json'), 'utf8'),
  );
  const elementsVersion = JSON.parse(
    readFileSync(join(repoRoot, 'packages/elements/package.json'), 'utf8'),
  ).version;
  const { readComponentMetadataByTag } = await import(
    pathToFileURL(join(repoRoot, 'packages/elements/scripts/component-metadata.mjs')).href
  );
  const metadata = readComponentMetadataByTag(join(repoRoot, 'packages/elements/src/components'));
  const catalogTags = new Set(
    [...metadata].filter(([, entry]) => entry.catalog === true).map(([tag]) => tag),
  );
  const catalogActions = new Map(
    [...metadata]
      .filter(([, entry]) => entry.catalogAction !== undefined)
      .map(([tag, entry]) => [tag, entry.catalogAction]),
  );
  return { manifest, options: { elementsVersion, catalogTags, catalogActions } };
}

// realpath both sides: a symlinked tmpdir (macOS /var -> /private/var) must
// not defeat direct-invocation detection.
const invokedUrl = process.argv[1] ? pathToFileURL(realpathSync(process.argv[1])).href : null;
if (
  invokedUrl !== null &&
  invokedUrl === pathToFileURL(realpathSync(fileURLToPath(import.meta.url))).href
) {
  const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const repoRoot = process.argv[2] ?? join(packageRoot, '..', '..');
  const { manifest, options } = await readCatalogInputs(repoRoot);
  const modules = catalogModules(deriveCatalog(manifest, options));
  const schemePolicy = readFileSync(
    join(repoRoot, 'packages/elements/src/utils/url-scheme.ts'),
    'utf8',
  );
  const outputDir = join(repoRoot, 'packages/catalog/src/generated');
  mkdirSync(outputDir, { recursive: true });
  for (const [file, source] of Object.entries(modules)) {
    writeFileSync(join(outputDir, file), source, 'utf8');
  }
  // Share the scheme and origin checks without a runtime dependency on elements.
  writeFileSync(
    join(outputDir, 'url-scheme.ts'),
    `// GENERATED from packages/elements/src/utils/url-scheme.ts.\n${schemePolicy}`,
    'utf8',
  );
  process.stdout.write(
    `catalog: generated src/generated/{catalog,catalog-structure,catalog-guidance}.ts (schema ${CATALOG_SCHEMA_VERSION})\n`,
  );
}
