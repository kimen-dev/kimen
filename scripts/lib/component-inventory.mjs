import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

import ts from 'typescript';

const COMPONENT_TAG = /^ki-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const COMPONENT_WILDCARD = './ki-*';
const WILDCARD_TARGET = Object.freeze({
  types: './dist/components/ki-*.d.ts',
  import: './dist/components/ki-*.js',
});
const ROOT_TARGET = Object.freeze({
  types: './dist/types/index.d.ts',
  import: './dist/index.js',
});
const LOADER_TARGET = Object.freeze({
  types: './loader/index.d.ts',
  import: './loader/index.js',
});
const compareText = (left, right) => (left < right ? -1 : left > right ? 1 : 0);

const frozenValue = (name, tag) => ({
  name,
  from: `./components/${tag}/${tag}.js`,
  replacement: `@kimen/elements/${tag}`,
});
const frozenType = (name, tag, module = tag) => ({
  name,
  from: `./components/${tag}/${module}.js`,
  replacement: `@kimen/elements/${tag}`,
});

/**
 * The root is a temporary compatibility facade, not the component registry.
 * This exact set shipped before direct-subpath-only generation and is frozen
 * until a separately approved MAJOR removes it (FR-024 / SC-014).
 */
export const FROZEN_LEGACY_ROOT = Object.freeze({
  values: Object.freeze(
    [
      frozenValue('KiAlert', 'ki-alert'),
      frozenValue('KiBadge', 'ki-badge'),
      frozenValue('KiButton', 'ki-button'),
      frozenValue('KiCard', 'ki-card'),
      frozenValue('KiCheckbox', 'ki-checkbox'),
      frozenValue('KiDialog', 'ki-dialog'),
      frozenValue('KiInput', 'ki-input'),
      frozenValue('KiList', 'ki-list'),
      frozenValue('KiListItem', 'ki-list-item'),
      frozenValue('KiOption', 'ki-option'),
      frozenValue('KiProgress', 'ki-progress'),
      frozenValue('KiRadio', 'ki-radio'),
      frozenValue('KiRadioGroup', 'ki-radio-group'),
      frozenValue('KiSelect', 'ki-select'),
      frozenValue('KiSwitch', 'ki-switch'),
      frozenValue('KiTab', 'ki-tab'),
      frozenValue('KiTabPanel', 'ki-tab-panel'),
      frozenValue('KiTabs', 'ki-tabs'),
      frozenValue('KiTextarea', 'ki-textarea'),
      frozenValue('KiTooltip', 'ki-tooltip'),
    ].sort((left, right) => compareText(left.name, right.name)),
  ),
  namedTypes: Object.freeze(
    [
      frozenType('KiAlertTone', 'ki-alert', 'ki-alert.tone'),
      frozenType('KiBadgeSize', 'ki-badge'),
      frozenType('KiBadgeTone', 'ki-badge'),
      frozenType('KiButtonSize', 'ki-button'),
      frozenType('KiButtonTone', 'ki-button'),
      frozenType('KiButtonType', 'ki-button'),
      frozenType('KiButtonVariant', 'ki-button'),
      frozenType('KiDialogCloseDetail', 'ki-dialog'),
      frozenType('KiDialogCloseReason', 'ki-dialog'),
      frozenType('KiInputType', 'ki-input'),
      frozenType('KiProgressShape', 'ki-progress'),
      frozenType('KiTooltipPlacement', 'ki-tooltip', 'ki-tooltip.position'),
    ].sort((left, right) => compareText(left.name, right.name)),
  ),
  typeStars: Object.freeze([]),
});

const toRepositoryPath = (workspaceRoot, filePath) =>
  relative(workspaceRoot, filePath).split(sep).join('/');
const expectedClassName = (tag) =>
  tag
    .split('-')
    .map((segment) => `${segment[0].toUpperCase()}${segment.slice(1)}`)
    .join('');

const isPlainRecord = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const assertRegularFile = async (filePath, label, tag) => {
  try {
    const details = await stat(filePath);
    if (!details.isFile()) {
      throw new Error(`${label} is not a regular file`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(label)) {
      throw error;
    }
    throw new Error(`Missing ${label} for ${tag}: ${filePath}`, { cause: error });
  }
};

const parseSourceFile = (fileName, sourceText, scriptKind) => {
  const sourceFile = ts.createSourceFile(
    fileName,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  const diagnostics = sourceFile.parseDiagnostics ?? [];
  if (diagnostics.length > 0) {
    const detail = ts.flattenDiagnosticMessageText(diagnostics[0].messageText, '\n');
    throw new Error(`Cannot parse ${fileName}: ${detail}`);
  }
  return sourceFile;
};

const componentDecoratorFor = (classDeclaration) => {
  const decorators = ts.canHaveDecorators(classDeclaration)
    ? (ts.getDecorators(classDeclaration) ?? [])
    : [];
  return decorators.filter((decorator) => {
    const expression = decorator.expression;
    return (
      (ts.isIdentifier(expression) && expression.text === 'Component') ||
      (ts.isCallExpression(expression) &&
        ts.isIdentifier(expression.expression) &&
        expression.expression.text === 'Component')
    );
  });
};

const componentTagFromDecorator = (decorator, sourceModule) => {
  if (!ts.isCallExpression(decorator.expression)) {
    throw new Error(`Invalid @Component decorator in ${sourceModule}: expected a call`);
  }
  const call = decorator.expression;
  if (call.arguments.length !== 1 || !ts.isObjectLiteralExpression(call.arguments[0])) {
    throw new Error(
      `Invalid @Component decorator in ${sourceModule}: expected one object argument`,
    );
  }

  const tagProperties = call.arguments[0].properties.filter((property) => {
    const name = property.name;
    return (ts.isIdentifier(name) || ts.isStringLiteral(name)) && name.text === 'tag';
  });
  if (tagProperties.length !== 1 || !ts.isPropertyAssignment(tagProperties[0])) {
    throw new Error(`Invalid @Component decorator tag in ${sourceModule}`);
  }
  const initializer = tagProperties[0].initializer;
  if (!ts.isStringLiteral(initializer)) {
    throw new Error(`Invalid @Component decorator tag in ${sourceModule}: expected a string`);
  }
  return initializer.text;
};

const inspectComponentSource = (sourceText, sourceModule, directoryTag) => {
  const sourceFile = parseSourceFile(sourceModule, sourceText, ts.ScriptKind.TSX);
  const candidates = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isClassDeclaration(statement)) {
      continue;
    }
    const decorators = componentDecoratorFor(statement);
    if (decorators.length > 1) {
      throw new Error(`Multiple @Component decorators in ${sourceModule}`);
    }
    if (decorators.length === 1) {
      candidates.push({ declaration: statement, decorator: decorators[0] });
    }
  }

  if (candidates.length !== 1) {
    throw new Error(
      `Expected exactly one @Component class in ${sourceModule}; found ${candidates.length}`,
    );
  }
  const { declaration, decorator } = candidates[0];
  const modifiers = ts.canHaveModifiers(declaration) ? (ts.getModifiers(declaration) ?? []) : [];
  if (!modifiers.some(({ kind }) => kind === ts.SyntaxKind.ExportKeyword)) {
    throw new Error(`@Component class must be exported in ${sourceModule}`);
  }
  if (!declaration.name || !ts.isIdentifier(declaration.name)) {
    throw new Error(`@Component class must have a class name in ${sourceModule}`);
  }

  const decoratorTag = componentTagFromDecorator(decorator, sourceModule);
  if (decoratorTag !== directoryTag) {
    throw new Error(
      `@Component decorator tag ${decoratorTag} does not match directory ${directoryTag}`,
    );
  }
  const requiredClassName = expectedClassName(directoryTag);
  if (declaration.name.text !== requiredClassName) {
    throw new Error(
      `Component class name ${declaration.name.text} does not match ${requiredClassName}`,
    );
  }
  return declaration.name.text;
};

/**
 * Derive the complete component roster from Stencil source directories.
 * Returned paths are repository-relative and entries are sorted by tag.
 */
export async function discoverComponents({ workspaceRoot }) {
  if (typeof workspaceRoot !== 'string' || workspaceRoot.length === 0) {
    throw new TypeError('discoverComponents requires a non-empty workspaceRoot');
  }
  const absoluteWorkspaceRoot = resolve(workspaceRoot);
  const componentsRoot = join(absoluteWorkspaceRoot, 'packages/elements/src/components');
  let entries;
  try {
    entries = await readdir(componentsRoot, { withFileTypes: true });
  } catch (error) {
    throw new Error(`Cannot read component directory ${componentsRoot}`, { cause: error });
  }

  const directories = entries.filter((entry) => entry.isDirectory()).map(({ name }) => name);
  if (directories.length === 0) {
    throw new Error(`No component directories found in ${componentsRoot}`);
  }
  directories.sort(compareText);

  const components = [];
  for (const tag of directories) {
    if (!COMPONENT_TAG.test(tag)) {
      throw new Error(`Invalid component directory: ${tag}`);
    }
    const componentRoot = join(componentsRoot, tag);
    const sourcePath = join(componentRoot, `${tag}.tsx`);
    const unitSpecPath = join(componentRoot, `${tag}.spec.tsx`);
    const browserSpecPath = join(
      absoluteWorkspaceRoot,
      'packages/elements/browser-tests',
      `${tag}.browser.spec.ts`,
    );

    await assertRegularFile(sourcePath, 'source module', tag);
    await assertRegularFile(unitSpecPath, 'unit spec', tag);
    await assertRegularFile(browserSpecPath, 'browser spec', tag);

    const sourceModule = toRepositoryPath(absoluteWorkspaceRoot, sourcePath);
    const className = inspectComponentSource(await readFile(sourcePath, 'utf8'), sourceModule, tag);
    components.push({
      tag,
      className,
      sourceModule,
      unitSpec: toRepositoryPath(absoluteWorkspaceRoot, unitSpecPath),
      browserSpec: toRepositoryPath(absoluteWorkspaceRoot, browserSpecPath),
      distModule: `./dist/components/${tag}.js`,
      publicSubpath: `./${tag}`,
    });
  }
  return components;
}

const exportedModuleNames = (sourceText, sourceModule, className) => {
  const sourceFile = parseSourceFile(sourceModule, sourceText, ts.ScriptKind.TSX);
  const values = [];
  const types = [];

  for (const statement of sourceFile.statements) {
    const modifiers = ts.canHaveModifiers(statement) ? (ts.getModifiers(statement) ?? []) : [];
    if (!modifiers.some(({ kind }) => kind === ts.SyntaxKind.ExportKeyword)) {
      continue;
    }
    if (ts.isClassDeclaration(statement) && statement.name) {
      values.push(statement.name.text);
      continue;
    }
    if (
      (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) &&
      statement.name
    ) {
      types.push(statement.name.text);
      continue;
    }
    throw new Error(
      `Unsupported public runtime declaration in ${sourceModule}; direct component modules expose one class plus adjacent types only`,
    );
  }

  values.sort(compareText);
  types.sort(compareText);
  if (values.length !== 1 || values[0] !== className) {
    throw new Error(
      `Direct module ${sourceModule} must export exactly the ${className} component value`,
    );
  }
  if (new Set(types).size !== types.length) {
    throw new Error(`Direct module ${sourceModule} exports a type more than once`);
  }
  return { values, types };
};

const readJson = async (path, label) => {
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    throw new Error(`Cannot read ${label}: ${path}`, { cause: error });
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON in ${label}: ${path}`, { cause: error });
  }
};

const optionalRegularFile = async (path) => {
  try {
    return (await stat(path)).isFile();
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
};

const hasTokenNamespace = (document, tokenSlug) => {
  if (!isPlainRecord(document) || !isPlainRecord(document.ki)) {
    return false;
  }
  if (Object.hasOwn(document.ki, tokenSlug)) {
    return true;
  }
  let cursor = document.ki;
  for (const segment of tokenSlug.split('-')) {
    if (!isPlainRecord(cursor) || !Object.hasOwn(cursor, segment)) {
      return false;
    }
    cursor = cursor[segment];
  }
  return isPlainRecord(cursor);
};

const tokenSourcesFor = async (workspaceRoot, tokenSlug, tag) => {
  const tokenRoot = join(workspaceRoot, 'packages/tokens/tokens/component');
  const names = (await readdir(tokenRoot))
    .filter((name) => name.endsWith('.tokens.json') && !name.endsWith('.material3.tokens.json'))
    .sort(compareText);
  const matches = [];
  for (const name of names) {
    const path = join(tokenRoot, name);
    if (hasTokenNamespace(await readJson(path, 'component token source'), tokenSlug)) {
      matches.push(path);
    }
  }
  if (matches.length !== 1) {
    throw new Error(
      `Missing or ambiguous token source for ${tag}: expected one namespace, found ${matches.length}`,
    );
  }
  const tokenSources = [toRepositoryPath(workspaceRoot, matches[0])];
  const overridePath = matches[0].replace(/\.tokens\.json$/u, '.material3.tokens.json');
  if (await optionalRegularFile(overridePath)) {
    tokenSources.push(toRepositoryPath(workspaceRoot, overridePath));
  }
  return tokenSources;
};

export async function readBudgetGroups({ workspaceRoot }) {
  const absoluteWorkspaceRoot = resolve(workspaceRoot);
  const path = join(absoluteWorkspaceRoot, 'packages/elements/size-limit/groups.json');
  const document = await readJson(path, 'component budget groups');
  if (!isPlainRecord(document) || document.schemaVersion !== 1 || !Array.isArray(document.groups)) {
    throw new Error('Component budget groups must use schemaVersion 1 and a groups array');
  }

  const ids = new Set();
  const members = new Set();
  const groups = document.groups.map((group) => {
    if (
      !isPlainRecord(group) ||
      typeof group.id !== 'string' ||
      !COMPONENT_TAG.test(group.id) ||
      !Array.isArray(group.members) ||
      group.members.length < 2
    ) {
      throw new Error('Each component budget group needs a ki-* id and at least two members');
    }
    if (ids.has(group.id)) {
      throw new Error(`Duplicate component budget group: ${group.id}`);
    }
    ids.add(group.id);
    const groupMembers = group.members.map((member) => {
      if (typeof member !== 'string' || !COMPONENT_TAG.test(member)) {
        throw new Error(`Invalid component budget member in ${group.id}`);
      }
      if (members.has(member)) {
        throw new Error(`Component belongs to more than one budget group: ${member}`);
      }
      members.add(member);
      return member;
    });
    if (new Set(groupMembers).size !== groupMembers.length) {
      throw new Error(`Component belongs to more than one budget group: ${group.id}`);
    }
    return { id: group.id, members: groupMembers };
  });
  return groups.sort((left, right) => compareText(left.id, right.id));
}

/**
 * Enrich the source roster with every derived factory consumer. No package
 * manifest, budget or generated-surface list is allowed to become a registry.
 */
export async function discoverComponentInventory({ workspaceRoot }) {
  const absoluteWorkspaceRoot = resolve(workspaceRoot);
  const components = await discoverComponents({ workspaceRoot: absoluteWorkspaceRoot });
  const groups = await readBudgetGroups({ workspaceRoot: absoluteWorkspaceRoot });
  const knownTags = new Set(components.map(({ tag }) => tag));
  const budgetByTag = new Map();

  for (const group of groups) {
    for (const tag of group.members) {
      if (!knownTags.has(tag)) {
        throw new Error(`Budget group ${group.id} references unknown component ${tag}`);
      }
      budgetByTag.set(tag, group.id);
    }
  }

  return Promise.all(
    components.map(async (component) => {
      const sourcePath = join(absoluteWorkspaceRoot, component.sourceModule);
      const sourceText = await readFile(sourcePath, 'utf8');
      const tokenSlug = component.tag.slice(3);
      const tokenSources = await tokenSourcesFor(absoluteWorkspaceRoot, tokenSlug, component.tag);
      return {
        ...component,
        moduleExports: exportedModuleNames(sourceText, component.sourceModule, component.className),
        tokenSources,
        budgetGroup: budgetByTag.get(component.tag) ?? 'default',
      };
    }),
  );
}

const expectedSubpathEntries = (components) => {
  if (!Array.isArray(components) || components.length === 0) {
    throw new TypeError('resolveComponentSubpaths requires at least one component');
  }
  const tags = new Set();
  const subpaths = new Set();
  const entries = components.map((component) => {
    if (!isPlainRecord(component) || !COMPONENT_TAG.test(component.tag)) {
      throw new TypeError('Invalid component inventory entry');
    }
    const publicSubpath = `./${component.tag}`;
    const importTarget = `./dist/components/${component.tag}.js`;
    if (component.publicSubpath !== publicSubpath || component.distModule !== importTarget) {
      throw new Error(`Inconsistent component inventory entry for ${component.tag}`);
    }
    if (tags.has(component.tag) || subpaths.has(publicSubpath)) {
      throw new Error(`Duplicate component inventory entry for ${component.tag}`);
    }
    tags.add(component.tag);
    subpaths.add(publicSubpath);
    return {
      publicSubpath,
      types: `./dist/components/${component.tag}.d.ts`,
      import: importTarget,
    };
  });
  return entries.sort((left, right) => compareText(left.publicSubpath, right.publicSubpath));
};

const assertExportTarget = (target, expected, label) => {
  if (!isPlainRecord(target)) {
    throw new Error(`${label} must use conditional types/import targets`);
  }
  const conditions = Object.keys(target).sort(compareText);
  if (
    conditions.length !== 2 ||
    conditions[0] !== 'import' ||
    conditions[1] !== 'types' ||
    target.types !== expected.types ||
    target.import !== expected.import
  ) {
    throw new Error(`${label} does not map exactly to its direct component module`);
  }
};

/**
 * Validate component package exports and resolve them to one deterministic list.
 * Only the explicit per-tag form and the exact `./ki-*` wildcard are accepted.
 */
export function resolveComponentSubpaths(packageExports, components) {
  if (!isPlainRecord(packageExports)) {
    throw new TypeError('Package exports must be an object');
  }
  const expectedEntries = expectedSubpathEntries(components);
  const expectedBySubpath = new Map(expectedEntries.map((entry) => [entry.publicSubpath, entry]));
  const explicitKeys = Object.keys(packageExports)
    .filter((key) => key.startsWith('./ki-') && key !== COMPONENT_WILDCARD)
    .sort(compareText);
  const hasWildcard = Object.hasOwn(packageExports, COMPONENT_WILDCARD);

  if (hasWildcard && explicitKeys.length > 0) {
    throw new Error('Overlapping component exports: use explicit subpaths or ./ki-*, not both');
  }
  if (hasWildcard) {
    try {
      assertExportTarget(packageExports[COMPONENT_WILDCARD], WILDCARD_TARGET, 'Component wildcard');
    } catch (error) {
      throw new Error('Unsafe component wildcard ./ki-*', { cause: error });
    }
    return expectedEntries;
  }

  for (const key of explicitKeys) {
    if (!expectedBySubpath.has(key)) {
      throw new Error(`Orphaned component export: ${key}`);
    }
  }
  for (const expected of expectedEntries) {
    if (!Object.hasOwn(packageExports, expected.publicSubpath)) {
      throw new Error(`Missing component export: ${expected.publicSubpath}`);
    }
    assertExportTarget(
      packageExports[expected.publicSubpath],
      expected,
      `Component export ${expected.publicSubpath}`,
    );
  }
  return expectedEntries;
}

/** Only the frozen facade, loader and safe component wildcard are public. */
export function validatePackageExportContract(packageExports) {
  if (!isPlainRecord(packageExports)) {
    throw new TypeError('Package exports must be an object');
  }
  const keys = Object.keys(packageExports).sort(compareText);
  const expectedKeys = ['.', './ki-*', './loader'].sort(compareText);
  const unexpected = keys.filter((key) => !expectedKeys.includes(key));
  const missing = expectedKeys.filter((key) => !keys.includes(key));
  if (unexpected.length > 0) {
    throw new Error(`Unexpected auxiliary package export: ${unexpected.join(', ')}`);
  }
  if (missing.length > 0) {
    throw new Error(`Missing package export: ${missing.join(', ')}`);
  }
  assertExportTarget(packageExports['.'], ROOT_TARGET, 'Root package export');
  assertExportTarget(packageExports['./loader'], LOADER_TARGET, 'Loader package export');
  try {
    assertExportTarget(packageExports[COMPONENT_WILDCARD], WILDCARD_TARGET, 'Component wildcard');
  } catch (error) {
    throw new Error('Unsafe component wildcard ./ki-*', { cause: error });
  }
  return true;
}

const exportName = (specifier) => {
  if (specifier.propertyName || specifier.isTypeOnly || !ts.isIdentifier(specifier.name)) {
    throw new Error('Legacy root contains an aliased or mixed-type export');
  }
  return specifier.name.text;
};

const assertUniqueCharacterization = ({ values, namedTypes, typeStars }) => {
  const seen = new Set();
  for (const { name } of [...values, ...namedTypes]) {
    if (seen.has(name)) {
      throw new Error(`Legacy root exports ${name} more than once`);
    }
    seen.add(name);
  }
  if (new Set(typeStars).size !== typeStars.length) {
    throw new Error('Legacy root repeats a type-star export');
  }
};

/**
 * Parse the deprecated root façade and return its exact, sortable export shape.
 * Runtime stars, aliases, local exports, namespace exports, and executable
 * statements are rejected so an API freeze cannot be bypassed by ambiguous TS.
 */
export function characterizeLegacyRootExports(sourceText) {
  if (typeof sourceText !== 'string') {
    throw new TypeError('Legacy root source must be text');
  }
  const sourceFile = parseSourceFile('legacy-root.ts', sourceText, ts.ScriptKind.TS);
  const characterization = { values: [], namedTypes: [], typeStars: [] };

  for (const statement of sourceFile.statements) {
    if (!ts.isExportDeclaration(statement)) {
      throw new Error('Legacy root contains a non-re-export statement');
    }
    if (!statement.moduleSpecifier || !ts.isStringLiteral(statement.moduleSpecifier)) {
      throw new Error('Legacy root contains a local or non-literal export');
    }
    const from = statement.moduleSpecifier.text;

    if (!statement.exportClause) {
      if (!statement.isTypeOnly) {
        throw new Error('Legacy root contains a runtime star export');
      }
      characterization.typeStars.push(from);
      continue;
    }
    if (
      !ts.isNamedExports(statement.exportClause) ||
      statement.exportClause.elements.length === 0
    ) {
      throw new Error('Legacy root contains an ambiguous namespace or empty export');
    }

    const destination = statement.isTypeOnly
      ? characterization.namedTypes
      : characterization.values;
    for (const specifier of statement.exportClause.elements) {
      destination.push({ name: exportName(specifier), from });
    }
  }

  characterization.values.sort(
    (left, right) => compareText(left.name, right.name) || compareText(left.from, right.from),
  );
  characterization.namedTypes.sort(
    (left, right) => compareText(left.name, right.name) || compareText(left.from, right.from),
  );
  characterization.typeStars.sort(compareText);
  assertUniqueCharacterization(characterization);
  return characterization;
}

const replacementFromModule = (from) => {
  const match = /^\.\/components\/(ki-[a-z0-9]+(?:-[a-z0-9]+)*)\/[^/]+\.js$/u.exec(from);
  if (!match) {
    throw new Error(`Legacy root export does not target a direct component module: ${from}`);
  }
  return `@kimen/elements/${match[1]}`;
};

const deprecatedReplacement = (statement, replacement) => {
  const tags = ts
    .getJSDocTags(statement)
    .filter(({ tagName }) => tagName.text === 'deprecated')
    .map(({ comment }) => (typeof comment === 'string' ? comment.trim() : ''));
  const expected = `Use \`${replacement}\` instead.`;
  if (tags.length !== 1 || tags[0] !== expected) {
    throw new Error(`Legacy root symbol must use exact deprecation: @deprecated ${expected}`);
  }
};

/** Validate the exact deprecated compatibility facade and direct replacements. */
export function validateLegacyRootContract(sourceText) {
  const sourceFile = parseSourceFile('legacy-root.ts', sourceText, ts.ScriptKind.TS);
  const characterization = characterizeLegacyRootExports(sourceText);
  if (characterization.typeStars.length > 0) {
    throw new Error('Legacy root type-star exports cannot deprecate every public symbol');
  }

  const replacements = new Map();
  for (const statement of sourceFile.statements) {
    if (
      !ts.isExportDeclaration(statement) ||
      !statement.moduleSpecifier ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      !statement.exportClause ||
      !ts.isNamedExports(statement.exportClause) ||
      statement.exportClause.elements.length !== 1
    ) {
      throw new Error('Legacy root must use one explicitly deprecated symbol per export');
    }
    const specifier = statement.exportClause.elements[0];
    const name = exportName(specifier);
    const replacement = replacementFromModule(statement.moduleSpecifier.text);
    deprecatedReplacement(statement, replacement);
    replacements.set(name, replacement);
  }

  const contract = {
    values: characterization.values.map((entry) => ({
      ...entry,
      replacement: replacements.get(entry.name),
    })),
    namedTypes: characterization.namedTypes.map((entry) => ({
      ...entry,
      replacement: replacements.get(entry.name),
    })),
    typeStars: [],
  };
  if (JSON.stringify(contract) !== JSON.stringify(FROZEN_LEGACY_ROOT)) {
    throw new Error('Legacy root symbol set or direct replacement drifted from the frozen facade');
  }
  return contract;
}
