#!/usr/bin/env node
// Catalog generation (spec 027, Art. I): the committed Custom Elements
// Manifest supplies component contracts. Component manifests explicitly
// select the custom elements exposed to agents. The output is a generated, committed TypeScript module
// (src/generated/catalog.ts) holding one entry per opted-in custom element;
// the catalog-sync gate fails any drift between the committed artifact and a
// fresh regeneration (tokens-sync / surfaces-sync precedent).
//
// Determinism (FR-008): the module body is JSON.stringify with sorted keys,
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
 */
export const CATALOG_SCHEMA_VERSION = '1.5.0';

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
    // accept any string; the documented values remain agent guidance.
    return { type: 'string', documentedValues: quoted.map((part) => part.slice(1, -1)) };
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
 * Pure catalog derivation: manifest in, generated module source out. Throws
 * with every violation named when the manifest cannot yield a sound catalog
 * (missing guidance, unparseable type) — a build failure, never a warning
 * (FR-003; the agent-surfaces Art. I bar).
 */
export function buildCatalog(
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
        // policy. One format exists; any other shape is a derivation defect.
        if (attribute.format !== undefined) {
          if (attribute.format !== 'url' || constraint.type !== 'string') {
            violations.push(
              `${tag}.${attribute.name}: unsupported format ${JSON.stringify(attribute.format)} on a ${constraint.type} attribute`,
            );
            continue;
          }
          entry.format = 'url';
        }
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
  const catalog = {
    catalogSchemaVersion: CATALOG_SCHEMA_VERSION,
    components: sortedRecord(components),
    elementsVersion,
  };
  return [
    '// GENERATED FILE (spec 027, Art. I) — never edit by hand.',
    '// Sources: packages/elements/generated/custom-elements.json and component.json opt-ins.',
    '// Generator: packages/catalog/scripts/generate-catalog.mjs. The catalog-sync gate',
    '// fails any drift between this artifact and a fresh regeneration.',
    `export const catalogData = ${JSON.stringify(catalog, null, 2)} as const;`,
    '',
  ].join('\n');
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
  const output = buildCatalog(manifest, { elementsVersion, catalogTags, catalogActions });
  const schemePolicy = readFileSync(
    join(repoRoot, 'packages/elements/src/utils/url-scheme.ts'),
    'utf8',
  );
  const outputDir = join(repoRoot, 'packages/catalog/src/generated');
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, 'catalog.ts'), output, 'utf8');
  // The default scheme rules are shared with the element; the catalog adds
  // host origin rules without importing the built elements package. Expose
  // the control-character predicate here for the catalog-only origin check.
  writeFileSync(
    join(outputDir, 'url-scheme.ts'),
    `// GENERATED from packages/elements/src/utils/url-scheme.ts.\n${schemePolicy}\nexport { isControlOrSpace };\n`,
    'utf8',
  );
  process.stdout.write(
    `catalog: generated src/generated/catalog.ts (schema ${CATALOG_SCHEMA_VERSION})\n`,
  );
}
