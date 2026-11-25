// @vitest-environment node
// @spec:027-runtime-catalog
// The structure the boundary reads and the guidance prose only prompt-facing
// code reads are two generated modules (Art. VIII); `catalogData` joins them
// back (src/guidance.ts). The generator is the oracle: the joined value must
// be exactly the catalog it derives, and the boundary's own catalog must
// carry no custom element's prose. Node environment: the generator is a
// plain Node script.
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import * as generator from '../scripts/generate-catalog.mjs';
import { catalogStructure } from '../src/generated/catalog-structure.js';
import { type Catalog, catalogData, NATIVE_PRIMITIVE_TAGS } from '../src/index.js';

// The generator ships as untyped .mjs; this is the part of its surface used here.
const { deriveCatalog, readCatalogInputs } = generator as unknown as {
  deriveCatalog: (manifest: unknown, options: unknown) => unknown;
  readCatalogInputs: (repoRoot: string) => Promise<{ manifest: unknown; options: unknown }>;
};

const whole: Catalog = catalogData;

describe('catalog guidance', () => {
  it('joins catalogData into exactly the catalog the generator derives, key order included', async () => {
    const { manifest, options } = await readCatalogInputs(
      join(import.meta.dirname, '..', '..', '..'),
    );
    expect(JSON.stringify(catalogData)).toBe(JSON.stringify(deriveCatalog(manifest, options)));
  });

  it('keeps every custom element guidance prose out of the catalog the boundary reads', () => {
    expect(Object.keys(catalogStructure.components)).toEqual(Object.keys(whole.components));
    for (const [tag, entry] of Object.entries(catalogStructure.components)) {
      const full = whole.components[tag];
      if (NATIVE_PRIMITIVE_TAGS.includes(tag)) {
        // The renderer compares native entries with Kimen's whole definition (037 D9).
        expect(entry, tag).toEqual(full);
        continue;
      }
      expect([entry.description, entry.whenNotToUse, entry.whenToUse], tag).toEqual(['', '', '']);
      for (const record of [entry.events, entry.slots]) {
        expect(
          Object.values(record).filter((text) => text !== ''),
          tag,
        ).toEqual([]);
      }
      for (const [name, constraint] of Object.entries(entry.props)) {
        expect(constraint.description, `${tag}.${name}`).toBe('');
        const described = full?.props[name];
        expect({ ...constraint, description: described?.description }, `${tag}.${name}`).toEqual(
          described,
        );
      }
    }
    expect(catalogStructure.elementsVersion).toBeUndefined();
  });

  it('shares no object with the catalog the boundary reads, so changing it widens nothing', () => {
    const boundary = new Set<object>();
    const collect = (value: unknown): void => {
      if (value !== null && typeof value === 'object') {
        boundary.add(value);
        Object.values(value).forEach(collect);
      }
    };
    collect(catalogStructure);
    const shared: string[] = [];
    const check = (value: unknown, path: string): void => {
      if (value !== null && typeof value === 'object') {
        if (boundary.has(value)) shared.push(path);
        for (const [key, item] of Object.entries(value)) check(item, `${path}.${key}`);
      }
    };
    check(whole, 'catalogData');
    expect(shared).toEqual([]);
  });
});
