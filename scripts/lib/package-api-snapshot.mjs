// The public surface of the generative packages: every exported name with its
// kinds and printed signature, read from the package's built declarations.
// scripts/gates/check-package-api.mjs compares it with the committed snapshot.
import { realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';

import ts from 'typescript';

import { canonicalJson } from './canonical-json.mjs';
import { buildPublicModuleSurface } from './public-api-snapshot.mjs';

// A data export is declared with the data itself as its type: the generated
// catalog. That content moves with every component and is owned by its
// generator, so the snapshot records that the export exists, not what it
// holds. `SURFACE_DOCUMENT` is declared `string`, so the snapshot records its
// signature, and a return to a literal type fails this gate.
export const GENERATIVE_PACKAGES = Object.freeze([
  Object.freeze({
    name: '@kimen/catalog',
    directory: 'packages/catalog',
    snapshot: 'changes/api/packages/catalog.json',
    dataExports: Object.freeze({
      catalogData: 'the catalog generated from the elements manifest, sealed by catalog-sync',
    }),
  }),
  Object.freeze({
    name: '@kimen/emitter',
    directory: 'packages/emitter',
    snapshot: 'changes/api/packages/emitter.json',
    dataExports: Object.freeze({}),
  }),
  Object.freeze({
    name: '@kimen/adapter-a2ui',
    directory: 'packages/adapter-a2ui',
    snapshot: 'changes/api/packages/adapter-a2ui.json',
    dataExports: Object.freeze({}),
  }),
  Object.freeze({
    name: '@kimen/adapter-mcp-apps',
    directory: 'packages/adapter-mcp-apps',
    snapshot: 'changes/api/packages/adapter-mcp-apps.json',
    dataExports: Object.freeze({}),
  }),
]);

const compilerOptions = Object.freeze({
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  target: ts.ScriptTarget.ESNext,
  skipLibCheck: true,
  noEmit: true,
});

const resolveAlias = (checker, symbol) =>
  (symbol.flags & ts.SymbolFlags.Alias) !== 0 ? checker.getAliasedSymbol(symbol) : symbol;

const referencedName = (node) => {
  if (ts.isTypeReferenceNode(node)) return node.typeName;
  if (ts.isExpressionWithTypeArguments(node)) return node.expression;
  if (ts.isTypeQueryNode(node)) return node.exprName;
  if (ts.isImportTypeNode(node)) return node.qualifier;
  return undefined;
};

// A printed signature names the types it uses, not their members. So every
// package-local type a public signature reaches must be exported too, or a
// change inside it would never reach the snapshot.
function unexportedLocalTypes(packageRoot, declarationFiles) {
  const program = ts.createProgram({ rootNames: declarationFiles, options: compilerOptions });
  const checker = program.getTypeChecker();
  const exported = new Set(
    declarationFiles.flatMap((fileName) => {
      const moduleSymbol = checker.getSymbolAtLocation(program.getSourceFile(fileName));
      return checker
        .getExportsOfModule(moduleSymbol)
        .map((symbol) => resolveAlias(checker, symbol));
    }),
  );
  const packagePath = (declaration) => relative(packageRoot, declaration.getSourceFile().fileName);
  const isLocal = (declaration) => {
    const path = packagePath(declaration);
    return !path.startsWith('..') && !isAbsolute(path) && !path.split(sep).includes('node_modules');
  };

  const unexported = new Set();
  const visited = new Set();
  const pending = [...exported];
  while (pending.length > 0) {
    const symbol = pending.pop();
    if (visited.has(symbol)) continue;
    visited.add(symbol);
    const visit = (node) => {
      const name = referencedName(node);
      const target = name === undefined ? undefined : checker.getSymbolAtLocation(name);
      if (target !== undefined) {
        const referenced = resolveAlias(checker, target);
        const localDeclaration = referenced.declarations?.find(isLocal);
        if (
          localDeclaration !== undefined &&
          (referenced.flags & ts.SymbolFlags.TypeParameter) === 0
        ) {
          if (!exported.has(referenced)) {
            unexported.add(`${referenced.name} (${packagePath(localDeclaration)})`);
          }
          pending.push(referenced);
        }
      }
      ts.forEachChild(node, visit);
    };
    for (const declaration of symbol.declarations?.filter(isLocal) ?? []) visit(declaration);
  }
  return [...unexported].sort();
}

/** The snapshot of one package, from its package.json and built declarations. */
export function buildPackageApiSnapshot({ name, packageRoot, packageJson, dataExports = {} }) {
  const root = realpathSync(resolve(packageRoot));
  const modules = buildPublicModuleSurface({
    packageName: name,
    packageJson,
    declarationSources: { packageRoot: root },
  });

  const declarationFiles = Object.values(modules)
    .map(({ declaration }) => declaration)
    .filter((declaration) => declaration !== null)
    .map((declaration) => resolve(root, declaration));
  const unexported = unexportedLocalTypes(root, declarationFiles);
  if (unexported.length > 0) {
    throw new Error(
      `${name}: public signatures reach ${unexported.join(', ')}, which the package does not export. Export each from the entry point, or keep it out of public signatures.`,
    );
  }

  for (const [symbolName, origin] of Object.entries(dataExports)) {
    const entries = Object.values(modules)
      .map(({ symbols }) => symbols[symbolName])
      .filter((entry) => entry?.kinds.includes('value'));
    if (entries.length === 0) {
      throw new Error(`${name}: data export ${symbolName} is not an exported value`);
    }
    for (const entry of entries) entry.signature = `generated data: ${origin}`;
  }
  return { package: name, modules };
}

/** What differs between two snapshots of the same package, one line per name. */
export function describeSnapshotChanges(before, after) {
  const changes = [];
  const subpaths = new Set([...Object.keys(before.modules), ...Object.keys(after.modules)]);
  for (const subpath of [...subpaths].sort()) {
    const previous = before.modules[subpath];
    const current = after.modules[subpath];
    if (previous === undefined || current === undefined) {
      changes.push(`${previous === undefined ? 'added' : 'removed'} module ${subpath}`);
      continue;
    }
    if (previous.target !== current.target || previous.declaration !== current.declaration) {
      changes.push(`changed the files of module ${subpath}`);
    }
    const prefix = subpath === '.' ? '' : `${subpath} `;
    const names = new Set([...Object.keys(previous.symbols), ...Object.keys(current.symbols)]);
    for (const symbol of [...names].sort()) {
      const was = previous.symbols[symbol];
      const is = current.symbols[symbol];
      if (was === undefined) changes.push(`added ${prefix}${symbol}`);
      else if (is === undefined) changes.push(`removed ${prefix}${symbol}`);
      else if (canonicalJson(was) !== canonicalJson(is)) changes.push(`changed ${prefix}${symbol}`);
    }
  }
  return changes;
}
