#!/usr/bin/env node
// Catalog generation (spec 027, Art. I): the committed Custom Elements
// Manifest is the single derivation source — no second analysis pass over
// component source. The output is a generated, committed TypeScript module
// (src/generated/catalog.ts) holding one entry per published custom element;
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

/** The version of the catalog document format itself (FR-010, Art. IX). */
export const CATALOG_SCHEMA_VERSION = '1.0.0';

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
  if (source === 'true' || source === 'false') {
    return source === 'true';
  }
  if (constraint.type === 'number' && Number.isFinite(Number(source))) {
    return Number(source);
  }
  return undefined;
}

const sortedRecord = (entries) =>
  Object.fromEntries([...entries].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));

/**
 * Pure catalog derivation: manifest in, generated module source out. Throws
 * with every violation named when the manifest cannot yield a sound catalog
 * (missing guidance, unparseable type) — a build failure, never a warning
 * (FR-003; the agent-surfaces Art. I bar).
 */
export function buildCatalog(manifest, { elementsVersion }) {
  const violations = [];
  const components = new Map();
  for (const module of manifest.modules ?? []) {
    for (const declaration of module.declarations ?? []) {
      if (declaration.customElement !== true || isBlank(declaration.tagName)) {
        continue;
      }
      const tag = declaration.tagName;
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
        props.set(attribute.name, entry);
      }
      components.set(tag, {
        description: declaration.description,
        events: sortedRecord(
          (declaration.events ?? []).map((event) => [event.name, event.description ?? '']),
        ),
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
  if (components.size === 0) {
    violations.push('manifest yielded no custom elements');
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
    '// Source: packages/elements/generated/custom-elements.json via',
    '// packages/catalog/scripts/generate-catalog.mjs; the catalog-sync gate',
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
  const output = buildCatalog(manifest, { elementsVersion });
  mkdirSync(join(repoRoot, 'packages/catalog/src/generated'), { recursive: true });
  writeFileSync(join(repoRoot, 'packages/catalog/src/generated/catalog.ts'), output, 'utf8');
  process.stdout.write(
    `catalog: generated src/generated/catalog.ts (schema ${CATALOG_SCHEMA_VERSION})\n`,
  );
}
