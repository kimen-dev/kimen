// Relative module specifiers in emitted declaration files.
//
// Stencil writes the declarations it generates (`components.d.ts`, the
// per-component `dist/components/ki-*.d.ts`, the loader) with relative
// imports that leave the file name implicit: `from "./stencil-public-runtime"`.
// A bundler resolves that. Node's ESM resolution, which TypeScript follows
// under `moduleResolution: node16 | nodenext` for a `"type": "module"`
// package, does not: the import fails to resolve inside the consumer's
// `node_modules`, `skipLibCheck` hides the error, and every type the import
// carried arrives as `any`. Naming the file (`./stencil-public-runtime.js`)
// resolves under every mode, so the build rewrites its own output once.
//
// Stencil also writes `dist/types` as a copy of `src` one directory deeper,
// keeping every specifier as written. One that leaves `src` (a component's
// glyph, `../../../icons/x.js`) then points at a `dist/icons/` that does not
// exist, and the release packaging gate (attw) fails the package. Given the
// source root a declaration directory mirrors, the build re-bases each such
// specifier onto the file it named in the source.
import { existsSync, statSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';

import ts from 'typescript';

const EXPLICIT_FILE = /\.(?:[cm]?js|json)$/u;
const DECLARATION_FILE = /\.d\.ts$/u;

const isRelative = (specifier) =>
  specifier === '.' ||
  specifier === '..' ||
  specifier.startsWith('./') ||
  specifier.startsWith('../');

const isFile = (path) => existsSync(path) && statSync(path).isFile();

function specifierLiteral(node) {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier !== undefined &&
    ts.isStringLiteral(node.moduleSpecifier)
  ) {
    return node.moduleSpecifier;
  }
  if (
    ts.isImportTypeNode(node) &&
    ts.isLiteralTypeNode(node.argument) &&
    ts.isStringLiteral(node.argument.literal)
  ) {
    return node.argument.literal;
  }
  if (
    ts.isImportEqualsDeclaration(node) &&
    ts.isExternalModuleReference(node.moduleReference) &&
    ts.isStringLiteral(node.moduleReference.expression)
  ) {
    return node.moduleReference.expression;
  }
  return null;
}

// The syntax tree is the only reliable reader here: declarations carry JSDoc
// examples and string constants whose text looks exactly like an import.
function relativeLiterals(text, fileName, named) {
  const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  const literals = [];
  const visit = (node) => {
    const literal = specifierLiteral(node);
    if (
      literal !== null &&
      isRelative(literal.text) &&
      EXPLICIT_FILE.test(literal.text) === named
    ) {
      literals.push({ node: literal, sourceFile });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return literals;
}

const extensionlessLiterals = (text, fileName) => relativeLiterals(text, fileName, false);

export function extensionlessRelativeSpecifiers(text, fileName) {
  return extensionlessLiterals(text, fileName).map(({ node }) => node.text);
}

function namedFile(specifier, fileName, declarationExists) {
  const directory = specifier.endsWith('/') ? specifier.slice(0, -1) : specifier;
  const target = resolve(dirname(fileName), directory);
  // TypeScript tries the file before the directory, and so does this:
  // `../types/components` is `components.d.ts` even though a `components/`
  // directory sits beside it.
  if (!specifier.endsWith('/') && declarationExists(`${target}.d.ts`)) {
    return `${specifier}.js`;
  }
  if (declarationExists(join(target, 'index.d.ts'))) {
    return `${directory}/index.js`;
  }
  throw new Error(
    `${fileName}: relative specifier '${specifier}' has no declaration file to name; refusing to guess`,
  );
}

// Back to front, so an edit never moves the positions still to be applied.
function replaceLiterals(text, literals, replace) {
  let rewrittenText = text;
  let rewritten = 0;
  for (const { node, sourceFile } of literals.toReversed()) {
    const specifier = replace(node.text);
    if (specifier === node.text) continue;
    const start = node.getStart(sourceFile);
    const quote = text[start];
    rewrittenText = `${rewrittenText.slice(0, start)}${quote}${specifier}${quote}${rewrittenText.slice(node.getEnd())}`;
    rewritten += 1;
  }
  return { text: rewrittenText, rewritten };
}

export function rewriteDeclarationSpecifiers(text, fileName, declarationExists = isFile) {
  return replaceLiterals(text, extensionlessLiterals(text, fileName), (specifier) =>
    namedFile(specifier, fileName, declarationExists),
  );
}

// The declaration TypeScript reads for a named runtime file.
const DECLARATION_OF = Object.freeze({ '.js': '.d.ts', '.mjs': '.d.mts', '.cjs': '.d.cts' });

function isDeclared(target, declarationExists) {
  const extension = extname(target);
  const declaration = DECLARATION_OF[extension];
  return declarationExists(
    declaration === undefined ? target : `${target.slice(0, -extension.length)}${declaration}`,
  );
}

/**
 * Re-bases each relative specifier that names a file no declaration answers
 * from `fileName`, but that one answers from the directory `fileName` mirrors
 * under `sourceRoot` (`outputRoot` being the copy of `sourceRoot`). Without a
 * source root, or when neither location answers, it refuses to guess.
 */
export function rebaseDeclarationSpecifiers(
  text,
  fileName,
  { outputRoot, sourceRoot } = {},
  declarationExists = isFile,
) {
  const directory = dirname(fileName);
  return replaceLiterals(text, relativeLiterals(text, fileName, true), (specifier) => {
    if (isDeclared(resolve(directory, specifier), declarationExists)) {
      return specifier;
    }
    const source =
      sourceRoot === undefined || outputRoot === undefined
        ? undefined
        : resolve(sourceRoot, relative(outputRoot, directory), specifier);
    if (source === undefined || !isDeclared(source, declarationExists)) {
      throw new Error(
        `${fileName}: relative specifier '${specifier}' has no declaration file behind it; refusing to guess`,
      );
    }
    const rebased = relative(directory, source).split(sep).join('/');
    return rebased.startsWith('.') ? rebased : `./${rebased}`;
  });
}

async function declarationFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return declarationFiles(path);
      }
      return entry.isFile() && DECLARATION_FILE.test(entry.name) ? [path] : [];
    }),
  );
  return nested.flat().toSorted();
}

/**
 * `sourceRoots` maps a declaration directory to the source directory it is a
 * copy of, for the directories whose specifiers may need re-basing.
 */
export async function normalizeDeclarationDirectories(directories, { sourceRoots = {} } = {}) {
  const report = { declarations: 0, rewrittenFiles: 0, rewrittenSpecifiers: 0 };
  for (const directory of directories) {
    const files = await declarationFiles(directory);
    // An output directory with nothing in it means the compiler step before
    // this one did not run, which must not read as "nothing left to fix".
    if (files.length === 0) {
      throw new Error(`${directory}: no declaration files found; build the package first`);
    }
    const roots = { outputRoot: directory, sourceRoot: sourceRoots[directory] };
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      const rebased = rebaseDeclarationSpecifiers(source, file, roots);
      const named = rewriteDeclarationSpecifiers(rebased.text, file);
      const rewritten = rebased.rewritten + named.rewritten;
      report.declarations += 1;
      if (rewritten > 0) {
        await writeFile(file, named.text, 'utf8');
        report.rewrittenFiles += 1;
        report.rewrittenSpecifiers += rewritten;
      }
    }
  }
  return report;
}
