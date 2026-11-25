/**
 * The catalog's guidance prose, kept apart from its structure (Art. VIII).
 *
 * Validation, preflight, the guarded renderer and the live surface read
 * tags, props and their constraints, slot and event names — never a
 * description. They import `generated/catalog-structure.ts`, where a custom
 * element's prose is blank, so a host bundle that validates and renders
 * carries none of it. The prose is what a model reads to choose and fill a
 * component; prompt-facing code (the emitter, the MCP server, a consumer's
 * `createCatalog({ extend })`) gets it through `catalogData`, which this
 * module joins back together.
 *
 * Internal module — not part of the package's public surface.
 */
import type { Catalog } from './validate.js';

/** The guidance prose of one custom element: what its structure leaves blank. */
interface EntryGuidance {
  readonly description: string;
  readonly events: Readonly<Record<string, string>>;
  readonly props: Readonly<Record<string, string>>;
  readonly slots: Readonly<Record<string, string>>;
  readonly whenNotToUse: string;
  readonly whenToUse: string;
}

/** The guidance prose of every custom element, by tag. */
export type CatalogGuidance = Readonly<Record<string, EntryGuidance>>;

/** A copied entry, filled in place: every key it gets already exists. */
interface BlankEntry {
  description: string;
  events: Record<string, string>;
  props: Record<string, { description: string }>;
  slots: Record<string, string>;
  whenNotToUse: string;
  whenToUse: string;
}

/** Writes `text[name]` over each blank `record[name]` that both name. */
function fill(record: Record<string, string>, text: Readonly<Record<string, string>>): void {
  for (const name of Object.keys(record)) {
    if (Object.hasOwn(text, name)) {
      record[name] = text[name] ?? '';
    }
  }
}

/**
 * The whole catalog: a copy of `structure` with `guidance` written into its
 * blanks, and the elements version it derives from. Only keys the structure
 * has are written, each where it is, so the result equals the catalog the
 * generator derived, key order included (the catalog tests compare them).
 * The copy shares nothing with `structure`: changing `catalogData` never
 * changes the catalog the boundary validates against by default.
 * `generated/catalog.ts` gives the result the literal type the generator
 * prints for that catalog.
 */
export function withGuidance(
  structure: Catalog,
  guidance: CatalogGuidance,
  elementsVersion: string,
): Catalog {
  // The structure is plain JSON data, so a JSON round trip is an exact copy.
  const components = JSON.parse(JSON.stringify(structure.components)) as Record<string, BlankEntry>;
  for (const [tag, text] of Object.entries(guidance)) {
    const entry = Object.hasOwn(components, tag) ? components[tag] : undefined;
    if (entry === undefined) {
      continue;
    }
    entry.description = text.description;
    entry.whenNotToUse = text.whenNotToUse;
    entry.whenToUse = text.whenToUse;
    fill(entry.events, text.events);
    fill(entry.slots, text.slots);
    for (const [name, constraint] of Object.entries(entry.props)) {
      if (Object.hasOwn(text.props, name)) {
        constraint.description = text.props[name] ?? '';
      }
    }
  }
  return {
    catalogSchemaVersion: structure.catalogSchemaVersion,
    components: components as unknown as Catalog['components'],
    elementsVersion,
  };
}
