// Stencil emits wrapper event type imports from the deprecated package root.
// Point those imports at Stencil's generated declarations, which grow with
// the components while the root API remains frozen.
import { readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';

import { COMPONENT_TAG } from './component-metadata.mjs';

export function normalizeReactWrapper(source, file) {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const replacements = [];
  for (const statement of parsed.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const module = statement.moduleSpecifier;
    if (!ts.isStringLiteral(module) || module.text !== '@kimen/elements') continue;
    if (!statement.importClause?.isTypeOnly) {
      throw new Error(`React wrapper ${file} has a runtime import from the frozen package root`);
    }
    replacements.push(module);
  }
  let normalized = source;
  for (const module of replacements.reverse()) {
    const start = module.getStart(parsed);
    normalized =
      normalized.slice(0, start + 1) +
      '@kimen/elements/components' +
      normalized.slice(module.end - 1);
  }
  return normalized;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const wrappersDirectory = fileURLToPath(new URL('../../react/src/', import.meta.url));
  for (const file of readdirSync(wrappersDirectory).sort()) {
    if (!file.endsWith('.ts') || !COMPONENT_TAG.test(file.slice(0, -3))) continue;
    const path = join(wrappersDirectory, file);
    const source = readFileSync(path, 'utf8');
    const normalized = normalizeReactWrapper(source, file);
    if (normalized !== source) writeFileSync(path, normalized);
  }
}
