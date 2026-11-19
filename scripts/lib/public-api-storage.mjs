import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { canonicalJson } from './canonical-json.mjs';
import { createPublicApiSnapshot } from './public-api.mjs';

const elementsPackage = '@kimen/elements';
const componentTag = /^ki-[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const directFacets = ['exports', 'modules'];

export function splitPublicApiSnapshot(snapshot) {
  const { surface } = snapshot;
  const packageSurface = surface.packages[elementsPackage];
  const { components, ...elements } = packageSurface;
  const componentSubpaths = new Set(Object.keys(components).map((tag) => `./${tag}`));
  for (const facet of directFacets) {
    if (!Object.hasOwn(elements, facet)) continue;
    elements[facet] = Object.fromEntries(
      Object.entries(elements[facet]).filter(([path]) => !componentSubpaths.has(path)),
    );
  }
  const index = {
    ...snapshot,
    surface: { ...surface, packages: { ...surface.packages, [elementsPackage]: elements } },
  };
  const shards = [];
  for (const [tag, component] of Object.entries(components)) {
    if (!componentTag.test(tag)) throw new Error(`Invalid public API component tag: ${tag}`);
    const path = `./${tag}`;
    const shard = { component };
    for (const facet of directFacets) {
      const entries = packageSurface[facet];
      if (Object.hasOwn(entries ?? {}, path)) shard[facet] = entries[path];
    }
    shards.push([`components/${tag}.json`, canonicalJson(shard)]);
  }
  return new Map([['index.json', canonicalJson(index)], ...shards]);
}

async function readCanonicalPart(path) {
  const bytes = await readFile(path, 'utf8');
  const value = JSON.parse(bytes);
  if (canonicalJson(value) !== bytes) {
    throw new Error(`Public API snapshot part must use canonical JSON bytes: ${path}`);
  }
  return value;
}

export async function readDirectoryPublicApiSnapshot(directory) {
  const componentDirectory = join(directory, 'components');
  const [index, entries] = await Promise.all([
    readCanonicalPart(join(directory, 'index.json')),
    readdir(componentDirectory, { withFileTypes: true }),
  ]);
  const elements = index.surface.packages[elementsPackage];
  if (Object.hasOwn(elements, 'components')) {
    throw new Error('Public API snapshot index must only store non-component facets');
  }
  const shards = await Promise.all(
    entries.map(async (entry) => {
      const tag = entry.name.replace(/\.json$/u, '');
      if (!entry.isFile() || tag === entry.name || !componentTag.test(tag)) {
        throw new Error(`Unexpected public API component shard: ${entry.name}`);
      }
      return [tag, await readCanonicalPart(join(componentDirectory, entry.name))];
    }),
  );
  elements.components = {};
  for (const [tag, { component, ...facets }] of shards) {
    if (!component || typeof component !== 'object' || Array.isArray(component)) {
      throw new Error(`Invalid public API component shard: ${tag}`);
    }
    elements.components[tag] = component;
    for (const [facet, value] of Object.entries(facets)) {
      const path = `./${tag}`;
      if (
        !directFacets.includes(facet) ||
        !elements[facet] ||
        Object.hasOwn(elements[facet], path)
      ) {
        throw new Error(`Unexpected public API facet in component shard: ${tag} ${facet}`);
      }
      elements[facet][path] = value;
    }
  }

  const snapshot = createPublicApiSnapshot(index.surface);
  if (index.schemaVersion !== snapshot.schemaVersion) {
    throw new Error(`Public API snapshot index schemaVersion must be ${snapshot.schemaVersion}`);
  }
  if (index.surfaceSha256 !== snapshot.surfaceSha256) {
    throw new Error('Public API snapshot digest does not match its index and component shards');
  }
  return snapshot;
}
