// Point Stencil's generated wrappers at the current component declarations
// and at Kimen's runtime before TypeScript emits declarations and source maps.
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
    if (!ts.isStringLiteral(module)) continue;
    if (module.text === '@kimen/elements') {
      if (!statement.importClause?.isTypeOnly) {
        throw new Error(`React wrapper ${file} has a runtime import from the frozen package root`);
      }
      replacements.push([
        module.getStart(parsed) + 1,
        module.end - 1,
        '@kimen/elements/components',
      ]);
    }
    if (module.text === '@stencil/react-output-target/runtime') {
      replacements.push([module.getStart(parsed) + 1, module.end - 1, './runtime.js']);
    }
  }
  let normalized = source;
  for (const [start, end, value] of replacements.reverse()) {
    normalized = normalized.slice(0, start) + value + normalized.slice(end);
  }
  return normalized
    .replace(/^import React from 'react';\n/mu, '')
    .replace(
      /^ {4}\/\/ @ts-ignore - ignore potential React type mismatches[^\n]*\n {4}react: React,\n/mu,
      '',
    );
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
