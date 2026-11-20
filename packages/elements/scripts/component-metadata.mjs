import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const COMPONENT_TAG = /^ki-[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const isRecord = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const formBindings = {
  text: { event: 'input', prop: 'value' },
  boolean: { event: 'change', prop: 'checked' },
  select: { event: 'change', prop: 'value' },
};

const budgetFields = {
  mcpApps: ['raw', 'gzip', 'brotli'],
  mcpServer: ['raw', 'gzip', 'brotli'],
  tokenStylesheets: ['onmars', 'material3'],
};

export function readComponentMetadata(componentRoot, tag) {
  const path = join(componentRoot, 'component.json');
  let metadata;
  try {
    metadata = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Cannot read component manifest for ${tag}: ${path}: ${error.message}`, {
      cause: error,
    });
  }
  const invalid = (field) => {
    throw new Error(`Invalid ${field} in component manifest for ${tag}: ${path}`);
  };

  if (!isRecord(metadata)) invalid('document');
  for (const [section, field] of [
    ['barePage', 'keyboardPressed'],
    ['pointer', 'hoverWitness'],
  ]) {
    if (!isRecord(metadata[section]) || typeof metadata[section][field] !== 'boolean') {
      invalid(`${section}.${field}`);
    }
  }
  if (
    Object.hasOwn(metadata, 'visual') &&
    (!isRecord(metadata.visual) || typeof metadata.visual.material3Dark !== 'boolean')
  ) {
    invalid('visual.material3Dark');
  }
  if (Object.hasOwn(metadata, 'catalog') && typeof metadata.catalog !== 'boolean') {
    invalid('catalog');
  }

  if (
    Object.hasOwn(metadata, 'formBinding') &&
    (typeof metadata.formBinding !== 'string' || !Object.hasOwn(formBindings, metadata.formBinding))
  ) {
    invalid('formBinding');
  }

  if (Object.hasOwn(metadata, 'sizeBudget')) {
    if (!isRecord(metadata.sizeBudget)) invalid('sizeBudget');
    for (const [target, limits] of Object.entries(metadata.sizeBudget)) {
      if (!Object.hasOwn(budgetFields, target) || !isRecord(limits)) {
        invalid(`sizeBudget.${target}`);
      }
      for (const [metric, bytes] of Object.entries(limits)) {
        if (!budgetFields[target].includes(metric) || !Number.isSafeInteger(bytes) || bytes <= 0) {
          invalid(`sizeBudget.${target}.${metric}`);
        }
      }
    }
  }

  if (Object.hasOwn(metadata, 'budgetGroup')) {
    const members = metadata.budgetGroup?.members;
    if (
      !Array.isArray(members) ||
      members.length < 2 ||
      !members.includes(tag) ||
      members.some((member) => typeof member !== 'string' || !COMPONENT_TAG.test(member)) ||
      new Set(members).size !== members.length
    ) {
      invalid('budgetGroup.members');
    }
  }

  return metadata;
}

export function readComponentMetadataByTag(componentsRoot) {
  const tags = readdirSync(componentsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map(({ name }) => name)
    .sort();
  if (tags.length === 0) {
    throw new Error(`No component directories found in ${componentsRoot}`);
  }
  return new Map(
    tags.map((tag) => {
      if (!COMPONENT_TAG.test(tag)) throw new Error(`Invalid component directory: ${tag}`);
      return [tag, readComponentMetadata(join(componentsRoot, tag), tag)];
    }),
  );
}

/** Vue and Angular listen to the same native form events. */
export function readComponentFormBindings(componentsRoot) {
  const components = readComponentMetadataByTag(componentsRoot);
  return Object.entries(formBindings)
    .map(([type, binding]) => ({
      ...binding,
      type,
      tags: [...components]
        .filter(([, metadata]) => metadata.formBinding === type)
        .map(([tag]) => tag),
    }))
    .filter(({ tags }) => tags.length > 0);
}
