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
import { existsSync, statSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

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
function extensionlessLiterals(text, fileName) {
  const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  const literals = [];
  const visit = (node) => {
    const literal = specifierLiteral(node);
    if (literal !== null && isRelative(literal.text) && !EXPLICIT_FILE.test(literal.text)) {
      literals.push({ node: literal, sourceFile });
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return literals;
}

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

export function rewriteDeclarationSpecifiers(text, fileName, declarationExists = isFile) {
  const literals = extensionlessLiterals(text, fileName);
  let rewrittenText = text;
  // Back to front, so an edit never moves the positions still to be applied.
  for (const { node, sourceFile } of literals.toReversed()) {
    const start = node.getStart(sourceFile);
    const quote = text[start];
    const replacement = `${quote}${namedFile(node.text, fileName, declarationExists)}${quote}`;
    rewrittenText = `${rewrittenText.slice(0, start)}${replacement}${rewrittenText.slice(node.getEnd())}`;
  }
  return { text: rewrittenText, rewritten: literals.length };
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

export async function normalizeDeclarationDirectories(directories) {
  const report = { declarations: 0, rewrittenFiles: 0, rewrittenSpecifiers: 0 };
  for (const directory of directories) {
    const files = await declarationFiles(directory);
    // An output directory with nothing in it means the compiler step before
    // this one did not run, which must not read as "nothing left to fix".
    if (files.length === 0) {
      throw new Error(`${directory}: no declaration files found; build the package first`);
    }
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      const { text, rewritten } = rewriteDeclarationSpecifiers(source, file);
      report.declarations += 1;
      if (rewritten > 0) {
        await writeFile(file, text, 'utf8');
        report.rewrittenFiles += 1;
        report.rewrittenSpecifiers += rewritten;
      }
    }
  }
  return report;
}
