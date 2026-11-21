import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

import {
  declaresDeprecation,
  deprecationComment,
  readDeprecation,
  replacementProblems,
} from '../../packages/tokens/scripts/deprecation.mjs';

const LAYERS = Object.freeze(['primitive', 'theme', 'semantic', 'component']);
const LAYER_RANK = new Map(LAYERS.map((layer, index) => [layer, index]));
const PUBLIC_LAYERS = new Set(['semantic', 'component']);
const REFERENCE_PATTERN = /\{([^{}]+)\}/gu;
const EXACT_REFERENCE_PATTERN = /^\{([^{}]+)\}$/u;
const BLUR_REFERENCE_PATTERN = /^blur\(\{[^{}]+\}\)$/u;
// Spec 001 S15: a theme's translucent ramp variant is its ramp step at a whole
// percentage, so a theme that reassigns the step gets matching variants. The
// build resolves exactly this shape (packages/tokens/style-dictionary.config.mjs).
const ALPHA_VARIANT_PATTERN = /^color-mix\(in srgb, \{[^{}]+\} [1-9][0-9]?%, transparent\)$/u;

// Spec 061 keeps legacy length overrides readable until their scheduled
// removal. Only the original consumer (including the shared button sheet)
// can read them, and only inside the blur expression in the bridge.
const LEGACY_BACKDROP_BLURS = {
  'ki-alert': ['--ki-alert-shell-backdrop-blur', '--ki-effect-component-backdrop-blur'],
  'ki-badge': ['--ki-effect-component-backdrop-blur'],
  'ki-button': ['--ki-button-backdrop-blur'],
  'ki-dialog': ['--ki-dialog-backdrop-blur'],
  'ki-icon-button': ['--ki-button-backdrop-blur'],
  'ki-select': ['--ki-select-listbox-backdrop-blur'],
  'ki-tooltip': ['--ki-tooltip-backdrop-blur'],
  'ki-video': ['--ki-video-backdrop-blur'],
};

export function isLegacyBackdropBlur(tag, cssName, contents, index) {
  if (LEGACY_BACKDROP_BLURS[tag]?.includes(cssName) !== true) return false;

  const start = Math.max(contents.lastIndexOf('{', index), contents.lastIndexOf(';', index)) + 1;
  const prefix = contents.slice(start, index);
  return (
    /^\s*--_ki-[a-z0-9-]+-backdrop-filter:\s*blur\($/u.test(prefix) &&
    contents.slice(index, index + cssName.length + 6) === `var(${cssName}))`
  );
}

const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

const isPlainObject = (value) => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const cloneJsonValue = (value) => {
  if (Array.isArray(value)) {
    return value.map(cloneJsonValue);
  }

  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, cloneJsonValue(value[key])]),
    );
  }

  return value;
};

const normalizeContents = (contents, filePath) => {
  const parsed = typeof contents === 'string' ? JSON.parse(contents) : contents;
  if (!isPlainObject(parsed)) {
    throw new TypeError(`Token source ${filePath} contents must be a JSON object.`);
  }
  return parsed;
};

const exactReferenceFrom = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  return EXACT_REFERENCE_PATTERN.exec(value)?.[1] ?? null;
};

const referencesFrom = (value) => {
  if (typeof value !== 'string') {
    return [];
  }

  return [...value.matchAll(REFERENCE_PATTERN)].map((match) => match[1]);
};

const collectReferences = (value, references = new Set()) => {
  const embeddedReferences = referencesFrom(value);
  if (embeddedReferences.length > 0) {
    for (const reference of embeddedReferences) {
      references.add(reference);
    }
    return references;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectReferences(item, references);
    }
    return references;
  }

  if (isPlainObject(value)) {
    for (const key of Object.keys(value).sort()) {
      collectReferences(value[key], references);
    }
  }

  return references;
};

const flattenTokens = (contents) => {
  const tokens = [];
  const deprecatedGroups = [];

  const visitToken = (node, path, inheritedType) => {
    if (path.length === 0) {
      throw new TypeError('A token must have a non-empty DTCG path.');
    }

    const { deprecation, problems } = readDeprecation(node);
    tokens.push({
      path: path.join('.'),
      type: typeof node.$type === 'string' ? node.$type : inheritedType,
      value: cloneJsonValue(node.$value),
      hasDescription: hasOwn(node, '$description'),
      description: typeof node.$description === 'string' ? node.$description : null,
      declaresDeprecation: declaresDeprecation(node),
      deprecation,
      deprecationProblems: problems,
    });
  };

  const visitGroup = (node, path, inheritedType) => {
    if (!isPlainObject(node)) {
      return;
    }

    if (hasOwn(node, '$value')) {
      visitToken(node, path, inheritedType);
      return;
    }

    // DTCG lets a group's $deprecated reach its tokens; Kimen declares each
    // deprecation on the token it retires, with that token's replacement.
    if (declaresDeprecation(node)) {
      deprecatedGroups.push(path.join('.'));
    }

    const groupType = typeof node.$type === 'string' ? node.$type : inheritedType;
    if (hasOwn(node, '$root')) {
      if (!isPlainObject(node.$root) || !hasOwn(node.$root, '$value')) {
        throw new TypeError(`DTCG $root at ${path.join('.')} must be a token object.`);
      }
      visitToken(node.$root, path, groupType);
    }

    for (const key of Object.keys(node).sort()) {
      if (key.startsWith('$')) {
        continue;
      }
      visitGroup(node[key], [...path, key], groupType);
    }
  };

  visitGroup(contents, [], null);
  return {
    tokens: tokens.sort((left, right) => compareText(left.path, right.path)),
    deprecatedGroups: deprecatedGroups.sort(compareText),
  };
};

const issue = ({ code, path, filePath, message, related = [] }) => ({
  code,
  path,
  filePath,
  message,
  related: [...new Set(related)].sort(),
});

const compareIssues = (left, right) => {
  for (const key of ['code', 'path', 'filePath', 'message']) {
    const comparison = compareText(left[key], right[key]);
    if (comparison !== 0) {
      return comparison;
    }
  }
  return compareText(left.related.join('\0'), right.related.join('\0'));
};

const disallowedLiteralPaths = (value, path = '$value', result = []) => {
  if (exactReferenceFrom(value) !== null || value === 'none' || value === 0) {
    return result;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      result.push(path);
      return result;
    }
    value.forEach((item, index) => disallowedLiteralPaths(item, `${path}[${index}]`, result));
    return result;
  }

  if (isPlainObject(value)) {
    const keys = Object.keys(value).sort();
    if (keys.length === 0) {
      result.push(path);
      return result;
    }
    for (const key of keys) {
      disallowedLiteralPaths(value[key], `${path}.${key}`, result);
    }
    return result;
  }

  result.push(path);
  return result;
};

const findReferenceCycles = (recordsByPath) => {
  let nextIndex = 0;
  const indices = new Map();
  const lowLinks = new Map();
  const stack = [];
  const onStack = new Set();
  const cycles = [];

  const visit = (path) => {
    indices.set(path, nextIndex);
    lowLinks.set(path, nextIndex);
    nextIndex += 1;
    stack.push(path);
    onStack.add(path);

    const neighbours = recordsByPath
      .get(path)
      .references.filter((reference) => recordsByPath.has(reference))
      .sort();

    for (const neighbour of neighbours) {
      if (!indices.has(neighbour)) {
        visit(neighbour);
        lowLinks.set(path, Math.min(lowLinks.get(path), lowLinks.get(neighbour)));
      } else if (onStack.has(neighbour)) {
        lowLinks.set(path, Math.min(lowLinks.get(path), indices.get(neighbour)));
      }
    }

    if (lowLinks.get(path) !== indices.get(path)) {
      return;
    }

    const members = [];
    let member;
    do {
      member = stack.pop();
      onStack.delete(member);
      members.push(member);
    } while (member !== path);
    members.sort();

    const isSelfCycle =
      members.length === 1 && recordsByPath.get(members[0]).references.includes(members[0]);
    if (members.length > 1 || isSelfCycle) {
      cycles.push(members);
    }
  };

  for (const path of [...recordsByPath.keys()].sort()) {
    if (!indices.has(path)) {
      visit(path);
    }
  }

  return cycles.sort((left, right) => compareText(left[0], right[0]));
};

const resolveValues = (recordsByPath, cycleMembers) => {
  const memo = new Map();

  const resolveValue = (value) => {
    const reference = exactReferenceFrom(value);
    if (reference !== null) {
      if (!recordsByPath.has(reference) || cycleMembers.has(reference)) {
        return null;
      }
      return cloneJsonValue(resolveToken(reference));
    }

    if (typeof value === 'string' && referencesFrom(value).length > 0) {
      let resolvedAll = true;
      const resolved = value.replace(REFERENCE_PATTERN, (match, embeddedReference) => {
        if (!recordsByPath.has(embeddedReference) || cycleMembers.has(embeddedReference)) {
          resolvedAll = false;
          return match;
        }

        const referencedValue = resolveToken(embeddedReference);
        if (referencedValue === null || referencedValue === undefined) {
          resolvedAll = false;
          return match;
        }
        if (typeof referencedValue === 'string') {
          return referencedValue;
        }
        return JSON.stringify(cloneJsonValue(referencedValue));
      });
      return resolvedAll ? resolved : null;
    }

    if (Array.isArray(value)) {
      return value.map(resolveValue);
    }

    if (isPlainObject(value)) {
      return Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((key) => [key, resolveValue(value[key])]),
      );
    }

    return value;
  };

  const resolveToken = (path) => {
    if (memo.has(path)) {
      return memo.get(path);
    }
    if (cycleMembers.has(path)) {
      memo.set(path, null);
      return null;
    }

    const resolved = resolveValue(recordsByPath.get(path).value);
    memo.set(path, resolved);
    return resolved;
  };

  for (const path of [...recordsByPath.keys()].sort()) {
    resolveToken(path);
  }
  return memo;
};

/**
 * Parse and validate one ordered design-token composition without filesystem I/O.
 * Later sources replace earlier definitions. An overlay may replace values but
 * inherits the base token's layer, component, type and description contract.
 */
export const parseTokenComposition = ({ id, theme, scheme, sources }) => {
  if (!Array.isArray(sources)) {
    throw new TypeError('Token composition sources must be an array.');
  }

  const recordsByPath = new Map();
  const issues = [];

  sources.forEach((tokenSource, sourceIndex) => {
    if (!isPlainObject(tokenSource)) {
      throw new TypeError(`Token source at index ${sourceIndex} must be an object.`);
    }

    const { filePath, layer, component = null, overlay = false } = tokenSource;
    if (typeof filePath !== 'string' || filePath.length === 0) {
      throw new TypeError(`Token source at index ${sourceIndex} requires filePath.`);
    }
    if (!LAYER_RANK.has(layer)) {
      throw new TypeError(`Token source ${filePath} has unsupported layer ${String(layer)}.`);
    }
    if (component !== null && (typeof component !== 'string' || component.length === 0)) {
      throw new TypeError(`Token source ${filePath} component must be a non-empty string.`);
    }
    if (typeof overlay !== 'boolean') {
      throw new TypeError(`Token source ${filePath} overlay must be boolean.`);
    }

    const contents = normalizeContents(tokenSource.contents, filePath);
    const { tokens: tokenDefinitions, deprecatedGroups } = flattenTokens(contents);
    for (const groupPath of deprecatedGroups) {
      issues.push(
        issue({
          code: 'group-deprecation',
          path: groupPath,
          filePath,
          message: 'Declare a deprecation on the token it retires, never on a group.',
        }),
      );
    }
    for (const tokenDefinition of tokenDefinitions) {
      const existing = recordsByPath.get(tokenDefinition.path);
      const inheritsContract = overlay && existing !== undefined;

      if (overlay && existing === undefined) {
        issues.push(
          issue({
            code: 'overlay-new-token',
            path: tokenDefinition.path,
            filePath,
            message: 'An overlay source may replace an existing token but may not add one.',
          }),
        );
      }

      const recordLayer = inheritsContract ? existing.layer : layer;
      const recordComponent = inheritsContract ? existing.component : component;
      const recordType = inheritsContract ? existing.type : (tokenDefinition.type ?? null);
      const description = inheritsContract
        ? existing.description
        : tokenDefinition.hasDescription
          ? tokenDefinition.description
          : null;
      const value = cloneJsonValue(tokenDefinition.value);
      if (overlay && tokenDefinition.declaresDeprecation) {
        issues.push(
          issue({
            code: 'overlay-deprecation',
            path: tokenDefinition.path,
            filePath,
            message: 'A deprecation is declared on the base definition; an overlay inherits it.',
          }),
        );
      } else if (tokenDefinition.deprecationProblems.length > 0) {
        issues.push(
          issue({
            code: 'invalid-deprecation',
            path: tokenDefinition.path,
            filePath,
            message: 'A deprecation needs its reason, its schedule and its replacement.',
            related: tokenDefinition.deprecationProblems,
          }),
        );
      }
      const deprecation = inheritsContract
        ? existing.deprecation
        : overlay
          ? null
          : tokenDefinition.deprecation;

      recordsByPath.set(tokenDefinition.path, {
        path: tokenDefinition.path,
        cssName: `--${tokenDefinition.path.replaceAll('.', '-')}`,
        layer: recordLayer,
        component: recordComponent,
        type: recordType,
        value,
        references: [...collectReferences(value)].sort(),
        description,
        deprecation,
        public: PUBLIC_LAYERS.has(recordLayer),
        theme,
        scheme,
        filePath,
        sourceIndex,
        overlay,
      });
    }
  });

  for (const record of [...recordsByPath.values()].sort((left, right) =>
    compareText(left.path, right.path),
  )) {
    if (record.public && (record.description === null || record.description.trim().length === 0)) {
      issues.push(
        issue({
          code: 'missing-public-description',
          path: record.path,
          filePath: record.filePath,
          message: 'Published semantic and component tokens require a non-empty $description.',
        }),
      );
    }

    if (record.layer !== 'primitive') {
      const expression = typeof record.value === 'string' ? record.value : null;
      const literalPaths =
        (record.layer === 'semantic' && BLUR_REFERENCE_PATTERN.test(expression)) ||
        (record.layer === 'theme' && ALPHA_VARIANT_PATTERN.test(expression))
          ? []
          : disallowedLiteralPaths(record.value);
      if (literalPaths.length > 0) {
        issues.push(
          issue({
            code: 'non-primitive-literal',
            path: record.path,
            filePath: record.filePath,
            message:
              'Only primitive tokens may contain visual literals; only none and 0 are allowed.',
            related: literalPaths,
          }),
        );
      }
    }

    for (const reference of record.references) {
      const target = recordsByPath.get(reference);
      if (target === undefined) {
        issues.push(
          issue({
            code: 'unresolved-reference',
            path: record.path,
            filePath: record.filePath,
            message: 'A token reference does not resolve in the final composition.',
            related: [reference],
          }),
        );
      } else if (
        target.deprecation !== null &&
        record.deprecation === null &&
        !(
          record.cssName === '--ki-effect-component-backdrop-filter' &&
          target.deprecation.replacement === record.cssName &&
          record.value === `blur({${target.path}})`
        )
      ) {
        issues.push(
          issue({
            code: 'deprecated-reference',
            path: record.path,
            filePath: record.filePath,
            message: 'A live token may not reference a deprecated one.',
            related: [reference],
          }),
        );
      } else if (LAYER_RANK.get(target.layer) > LAYER_RANK.get(record.layer)) {
        issues.push(
          issue({
            code: 'upward-reference',
            path: record.path,
            filePath: record.filePath,
            message: 'A token may reference only its own layer or a lower layer.',
            related: [reference],
          }),
        );
      }
    }
  }

  const cycles = findReferenceCycles(recordsByPath);
  const cycleMembers = new Set(cycles.flat());
  for (const members of cycles) {
    const canonicalRecord = recordsByPath.get(members[0]);
    issues.push(
      issue({
        code: 'circular-reference',
        path: members[0],
        filePath: canonicalRecord.filePath,
        message: 'Circular token references are not allowed.',
        related: members,
      }),
    );
  }

  const resolvedValues = resolveValues(recordsByPath, cycleMembers);
  const records = [...recordsByPath.values()]
    .sort((left, right) => compareText(left.path, right.path))
    .map((record) => ({
      ...record,
      resolvedValue: cloneJsonValue(resolvedValues.get(record.path)),
    }));

  return {
    id,
    theme,
    scheme,
    records,
    issues: issues.sort(compareIssues),
  };
};

const publicContractFrom = (record) => ({
  path: record.path,
  cssName: record.cssName,
  layer: record.layer,
  component: record.component,
  type: record.type,
  description: record.description,
  deprecation: record.deprecation,
});

const samePublicContract = (left, right) =>
  left.path === right.path &&
  left.cssName === right.cssName &&
  left.layer === right.layer &&
  left.component === right.component &&
  left.type === right.type &&
  left.description === right.description &&
  JSON.stringify(left.deprecation) === JSON.stringify(right.deprecation);

/**
 * Collapse explicitly ordered theme/scheme compositions into the stable public
 * contract consumed by CEM and API generation. Values may vary by composition;
 * names, layers, types and descriptions may not.
 */
export const createOrderedTokenInventory = (compositions) => {
  if (!Array.isArray(compositions)) {
    throw new TypeError('Token inventory compositions must be an array.');
  }

  const seenCompositionIds = new Set();
  const publicTokensByName = new Map();
  const compositionSummaries = [];

  for (const [index, composition] of compositions.entries()) {
    if (!isPlainObject(composition)) {
      throw new TypeError(`Token composition at index ${index} must be an object.`);
    }
    if (typeof composition.id !== 'string' || composition.id.length === 0) {
      throw new TypeError(`Token composition at index ${index} requires a non-empty id.`);
    }
    if (seenCompositionIds.has(composition.id)) {
      throw new TypeError(`Duplicate token composition id ${composition.id}.`);
    }
    seenCompositionIds.add(composition.id);
    if (!Array.isArray(composition.records) || !Array.isArray(composition.issues)) {
      throw new TypeError(`Token composition ${composition.id} is not parsed.`);
    }
    if (composition.issues.length > 0) {
      const first = composition.issues[0];
      throw new Error(
        `Token composition ${composition.id} is invalid: ${first.code} ${first.path}.`,
      );
    }

    compositionSummaries.push({
      id: composition.id,
      theme: composition.theme,
      scheme: composition.scheme,
    });

    for (const record of composition.records) {
      if (!record.public) {
        continue;
      }
      if (typeof record.description !== 'string' || record.description.trim().length === 0) {
        throw new Error(`Public token ${record.cssName} has no description.`);
      }

      const contract = publicContractFrom(record);
      const existing = publicTokensByName.get(record.cssName);
      if (existing !== undefined && !samePublicContract(existing, contract)) {
        throw new Error(
          `Public token ${record.cssName} has inconsistent contract metadata across compositions.`,
        );
      }
      publicTokensByName.set(record.cssName, contract);
    }
  }

  const deprecations = new Map(
    [...publicTokensByName.values()]
      .filter(({ deprecation }) => deprecation !== null)
      .map(({ cssName, deprecation }) => [cssName, deprecation]),
  );
  const problems = replacementProblems(deprecations, new Set(publicTokensByName.keys()));
  if (problems.length > 0) {
    throw new Error(`Invalid token deprecation:\n  ${problems.join('\n  ')}`);
  }

  return {
    schemaVersion: 1,
    compositions: compositionSummaries,
    publicTokens: [...publicTokensByName.values()].sort((left, right) =>
      compareText(left.path, right.path),
    ),
  };
};

/**
 * Resolve each public --ki-* reference used by component CSS to its canonical
 * token description. Private --_ki-* implementation variables are ignored.
 */
export const deriveConsumedPublicCssProperties = ({ inventory, cssByTag }) => {
  if (!isPlainObject(inventory) || !Array.isArray(inventory.publicTokens)) {
    throw new TypeError('A parsed public token inventory is required.');
  }
  if (!isPlainObject(cssByTag)) {
    throw new TypeError('Component CSS must be an object keyed by tag name.');
  }

  const publicTokensByName = new Map(
    inventory.publicTokens.map((record) => [record.cssName, record]),
  );
  const result = {};

  for (const tag of Object.keys(cssByTag).sort(compareText)) {
    const contents = cssByTag[tag];
    if (typeof contents !== 'string') {
      throw new TypeError(`Component CSS for ${tag} must be a string.`);
    }

    const consumed = new Set();
    for (const match of contents.matchAll(/var\(\s*(--ki-[a-z0-9-]+)/giu)) {
      const cssName = match[1].toLowerCase();
      const record = publicTokensByName.get(cssName);
      if (record === undefined) {
        throw new Error(
          `${tag} consumes ${cssName}, which is not a public semantic or component token.`,
        );
      }
      if (record.deprecation) {
        if (isLegacyBackdropBlur(tag, cssName, contents, match.index)) continue;
        throw new Error(
          `${tag} reads ${cssName}, which is ${deprecationComment(record.deprecation)}.`,
        );
      }
      consumed.add(cssName);
    }

    result[tag] = [...consumed].sort(compareText).map((cssName) => {
      const record = publicTokensByName.get(cssName);
      return {
        name: record.cssName,
        description: record.description,
        layer: record.layer,
      };
    });
  }

  return result;
};

const normalizePath = (value) => value.split(sep).join('/');

const sourceMetadata = (sourcePath) => {
  if (sourcePath === 'tokens/primitive.tokens.json') {
    return { layer: 'primitive', component: null, overlay: false };
  }
  if (sourcePath === 'tokens/themes/onmars.tokens.json') {
    return { layer: 'theme', component: null, overlay: false };
  }
  if (sourcePath.startsWith('tokens/themes/') || sourcePath.startsWith('tokens/modes/')) {
    return { layer: 'theme', component: null, overlay: true };
  }
  if (sourcePath === 'tokens/semantic.tokens.json') {
    return { layer: 'semantic', component: null, overlay: false };
  }
  if (sourcePath.startsWith('tokens/semantic/')) {
    return { layer: 'semantic', component: null, overlay: true };
  }

  const componentMatch = /^tokens\/component\/([a-z0-9-]+?)(\.material3)?\.tokens\.json$/u.exec(
    sourcePath,
  );
  if (componentMatch !== null) {
    return {
      layer: 'component',
      component: `ki-${componentMatch[1]}`,
      overlay: componentMatch[2] !== undefined,
    };
  }
  throw new Error(`Unsupported token source ${sourcePath}.`);
};

const orderedSourcePaths = (config) => {
  const include = config?.include ?? [];
  const source = config?.source ?? [];
  if (!Array.isArray(include) || !Array.isArray(source)) {
    throw new TypeError('Style Dictionary include/source must be arrays.');
  }
  return [...include, ...source];
};

const assertComponentBaseOrder = (sourcePaths) => {
  for (const [index, sourcePath] of sourcePaths.entries()) {
    const metadata = sourceMetadata(sourcePath);
    if (!metadata.overlay || metadata.component === null) {
      continue;
    }
    const expectedBase = sourcePath.replace('.material3.tokens.json', '.tokens.json');
    const baseIndex = sourcePaths.indexOf(expectedBase);
    if (baseIndex === -1 || baseIndex > index) {
      throw new Error(`Component token override precedes its base: ${sourcePath}.`);
    }
  }
};

/** Load and parse the ordered Style Dictionary compositions from their DTCG files. */
export const loadOrderedTokenCompositions = async ({
  workspaceRoot,
  tokenPackageRoot,
  configurations,
}) => {
  if (!Array.isArray(configurations)) {
    throw new TypeError('Token configurations must be an array.');
  }

  const compositions = [];
  for (const definition of configurations) {
    const sourcePaths = orderedSourcePaths(definition.config);
    assertComponentBaseOrder(sourcePaths);
    const sources = await Promise.all(
      sourcePaths.map(async (sourcePath) => ({
        ...sourceMetadata(sourcePath),
        filePath: normalizePath(relative(workspaceRoot, join(tokenPackageRoot, sourcePath))),
        contents: await readFile(join(tokenPackageRoot, sourcePath), 'utf8'),
      })),
    );
    compositions.push(
      parseTokenComposition({
        id: definition.id,
        theme: definition.theme,
        scheme: definition.scheme,
        sources,
      }),
    );
  }

  return compositions;
};

/** Load the four ordered Style Dictionary compositions as their stable public contract. */
export const loadOrderedTokenInventory = async (options) =>
  createOrderedTokenInventory(await loadOrderedTokenCompositions(options));

const cssFilesBelow = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await cssFilesBelow(entryPath)));
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      files.push(entryPath);
    }
  }
  return files.sort(compareText);
};

/**
 * The sheets a component loads through Stencil `styleUrls` from outside its
 * own directory (ki-icon-button paints with the ki-button surface sheet). A
 * component consumes the tokens of every sheet it loads, wherever it lives.
 */
const sheetsLoadedFromElsewhere = async (directory, tag) => {
  const component = await readFile(join(directory, `${tag}.tsx`), 'utf8');
  const urls = /styleUrls:\s*\[([^\]]*)\]/u.exec(component)?.[1] ?? '';
  return [...urls.matchAll(/['"]([^'"]+)['"]/gu)]
    .map(([, url]) => resolve(directory, url))
    .filter((filePath) => relative(directory, filePath).startsWith('..'));
};

/** Read component styles and derive the CEM CSS-property contract by tag. */
export const readConsumedPublicCssProperties = async ({ inventory, componentsRoot }) => {
  const cssByTag = {};
  const componentEntries = await readdir(componentsRoot, { withFileTypes: true });
  for (const entry of componentEntries.sort((left, right) => compareText(left.name, right.name))) {
    if (!entry.isDirectory() || !entry.name.startsWith('ki-')) {
      continue;
    }
    const directory = join(componentsRoot, entry.name);
    const files = [
      ...(await cssFilesBelow(directory)),
      ...(await sheetsLoadedFromElsewhere(directory, entry.name)),
    ];
    cssByTag[entry.name] = (
      await Promise.all(files.map((filePath) => readFile(filePath, 'utf8')))
    ).join('\n');
  }
  return deriveConsumedPublicCssProperties({ inventory, cssByTag });
};
