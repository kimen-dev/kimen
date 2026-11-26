#!/usr/bin/env node
// @spec:018-project-integrity-hardening#S11
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  buildPublicStylesheetSurface,
  splitTopLevel,
  stripComments,
  stylesheetPatternFiles,
} from '../lib/css-token-surface.mjs';
import { isLegacyBackdropBlur, parseTokenComposition } from '../lib/token-inventory.mjs';

const configRelativePath = 'packages/tokens/style-dictionary.config.mjs';

export function normalizePath(path) {
  return path.split(sep).join('/');
}

export function sourceMetadata(sourcePath) {
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
      component: componentMatch[1],
      overlay: componentMatch[2] !== undefined,
    };
  }
  throw new Error(`unsupported-token-source ${sourcePath}`);
}

export function orderedSources(config) {
  const include = config.include ?? [];
  const source = config.source ?? [];
  if (!Array.isArray(include) || !Array.isArray(source)) {
    throw new TypeError('Style Dictionary include/source must be arrays.');
  }
  return [...include, ...source];
}

export function assertBaseBeforeOverride(sourcePaths) {
  for (const [index, sourcePath] of sourcePaths.entries()) {
    const metadata = sourceMetadata(sourcePath);
    if (!metadata.overlay || metadata.component === null) {
      continue;
    }
    const expectedBase = `tokens/component/${metadata.component}.tokens.json`;
    const baseIndex = sourcePaths.indexOf(expectedBase);
    if (baseIndex === -1 || baseIndex > index) {
      throw new Error(`override-before-base ${configRelativePath} ${sourcePath}`);
    }
  }
}

export async function buildComposition({
  id,
  theme,
  scheme,
  config,
  workspaceRoot,
  tokenRoot = join(workspaceRoot, 'packages/tokens'),
  readText = readFile,
}) {
  const sourcePaths = orderedSources(config);
  assertBaseBeforeOverride(sourcePaths);
  const sources = await Promise.all(
    sourcePaths.map(async (sourcePath) => {
      const metadata = sourceMetadata(sourcePath);
      const absolutePath = join(tokenRoot, sourcePath);
      return {
        ...metadata,
        filePath: normalizePath(relative(workspaceRoot, absolutePath)),
        contents: await readText(absolutePath, 'utf8'),
      };
    }),
  );
  return parseTokenComposition({ id, theme, scheme, sources });
}

export async function cssFilesBelow(directory) {
  const information = await stat(directory).catch(() => null);
  if (information === null || !information.isDirectory()) {
    return [];
  }
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await cssFilesBelow(path)));
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      files.push(path);
    }
  }
  return files.sort();
}

export function issueDiagnostic(issue, composition) {
  const record = composition.records.find(({ path }) => path === issue.path);
  const values = [
    issue.code,
    issue.filePath,
    issue.path,
    ...issue.related,
    record === undefined ? '' : JSON.stringify(record.value),
  ];
  return values.filter(Boolean).join(' ');
}

export function collectCssIssues(filePath, contents, recordsByCssName, { workspaceRoot }) {
  const issues = [];
  const relativePath = normalizePath(relative(workspaceRoot, filePath));
  const tag = relativePath.split('/').at(-2);
  for (const match of contents.matchAll(/var\(\s*(--ki-[a-z0-9-]+)/giu)) {
    const cssName = match[1].toLowerCase();
    const record = recordsByCssName.get(cssName);
    if (record === undefined) {
      issues.push(`unresolved-css-token ${relativePath} ${cssName}`);
    } else if (record.layer === 'primitive') {
      issues.push(`primitive-css-consumption ${relativePath} ${cssName}`);
    } else if (record.layer === 'theme') {
      issues.push(`theme-css-consumption ${relativePath} ${cssName}`);
    } else if (record.deprecation && !isLegacyBackdropBlur(tag, cssName, contents, match.index)) {
      issues.push(`deprecated-css-consumption ${relativePath} ${cssName}`);
    }
  }

  for (const match of contents.matchAll(/\b\d+(?:\.\d+)?m?s\b/giu)) {
    issues.push(`hardcoded-motion-literal ${relativePath} ${match[0]}`);
  }
  for (const match of contents.matchAll(/#[0-9a-f]{3,8}\b|\b(?:rgb|hsl)a?\([^)]*\)/giu)) {
    issues.push(`hardcoded-visual-literal ${relativePath} ${match[0]}`);
  }
  return issues;
}

function shadowListTokens(css, label) {
  const shadows = [];
  const privateProperties = new Map();
  const declarations = /(?:^|[;{])\s*(box-shadow|--_[a-z0-9-]+)\s*:\s*([^;{}]+)/giu;
  for (const [, name, value] of stripComments(css, label).matchAll(declarations)) {
    if (name.toLowerCase() === 'box-shadow') {
      shadows.push(value);
    } else {
      const values = privateProperties.get(name) ?? [];
      values.push(value);
      privateProperties.set(name, values);
    }
  }

  // Follow private aliases conservatively across states. A comma inside a
  // var() fallback or colour function is not a shadow layer separator.
  const tokens = new Set();
  const visited = new Set();
  function visit(value, inList) {
    const composed = inList || splitTopLevel(value, ',', label).length > 1;
    for (const [, name] of value.matchAll(/var\(\s*(--(?:ki-|_)[a-z0-9-]+)/giu)) {
      if (name.startsWith('--ki-') && composed) tokens.add(name);
      const state = `${name} ${composed}`;
      if (visited.has(state)) continue;
      visited.add(state);
      for (const definition of privateProperties.get(name) ?? []) visit(definition, composed);
    }
  }
  for (const shadow of shadows) visit(shadow, false);
  return tokens;
}

async function stylesheetSource(tokenRoot, subpath, target, { readText, listDirectory }) {
  if (!target.includes('*')) return readText(join(tokenRoot, target), 'utf8');
  const directory = join(tokenRoot, target.slice(0, target.lastIndexOf('/')));
  const files = stylesheetPatternFiles(subpath, target, await listDirectory(directory));
  return Object.fromEntries(
    await Promise.all(
      files.map(async ([key, file]) => [key, await readText(join(directory, file), 'utf8')]),
    ),
  );
}

async function shadowListIssues(uses, tokenRoot, readText, listDirectory) {
  const publicTokenNames = [...new Set(uses.flatMap(({ tokens }) => tokens))];
  if (publicTokenNames.length === 0) return [];

  // Lint the shipped expressions after normalization and alias resolution.
  // The same resolver checks the API and includes every theme, scheme and mode.
  const { exports: exports_ } = JSON.parse(await readText(join(tokenRoot, 'package.json'), 'utf8'));
  const cssExports = Object.entries(exports_).filter(
    ([, target]) => typeof target === 'string' && target.endsWith('.css'),
  );
  const surfaces = buildPublicStylesheetSurface({
    packageExports: Object.fromEntries(cssExports.map(([name, target]) => [name, { target }])),
    stylesheetSources: Object.fromEntries(
      await Promise.all(
        cssExports.map(async ([name, target]) => [
          name,
          await stylesheetSource(tokenRoot, name, target, { readText, listDirectory }),
        ]),
      ),
    ),
    publicTokenNames,
  });

  const issues = [];
  for (const [stylesheet, { contexts = {} }] of Object.entries(surfaces)) {
    for (const [context, values] of Object.entries(contexts)) {
      const label = `${stylesheet} ${context}`;
      const none = new Set(
        Object.entries(values)
          .filter(([, value]) =>
            splitTopLevel(value, ',', label).some((layer) => layer.trim().toLowerCase() === 'none'),
          )
          .map(([name]) => name),
      );
      for (const { path, tokens } of uses) {
        for (const name of tokens.filter((token) => none.has(token))) {
          issues.push(`none-in-shadow-list ${path} ${name} ${label}`);
        }
      }
    }
  }
  return issues;
}

export async function checkTokens({
  workspaceRoot,
  loadConfig = (href) => import(href),
  readText = readFile,
  listDirectory = readdir,
}) {
  const tokenRoot = join(workspaceRoot, 'packages/tokens');
  const configPath = join(workspaceRoot, configRelativePath);
  const configUrl = pathToFileURL(configPath);
  configUrl.searchParams.set('contract', String(Date.now()));
  const configs = await loadConfig(configUrl.href);
  const definitions = [
    ['onmars-light', 'onmars', 'light', configs.lightConfig],
    ['onmars-dark', 'onmars', 'dark', configs.darkConfig],
    ['material3-light', 'material3', 'light', configs.material3LightConfig],
    ['material3-dark', 'material3', 'dark', configs.material3DarkConfig],
  ];
  const compositions = [];
  for (const [id, theme, scheme, config] of definitions) {
    if (config === undefined) {
      throw new Error(`missing-composition ${id} ${configRelativePath}`);
    }
    compositions.push(
      await buildComposition({
        id,
        theme,
        scheme,
        config,
        workspaceRoot,
        tokenRoot,
        readText,
      }),
    );
  }

  const diagnostics = [];
  for (const composition of compositions) {
    diagnostics.push(...composition.issues.map((issue) => issueDiagnostic(issue, composition)));
  }
  const recordsByCssName = new Map();
  for (const composition of compositions) {
    for (const record of composition.records) {
      recordsByCssName.set(record.cssName, record);
    }
  }
  const cssRoot = join(workspaceRoot, 'packages/elements/src/components');
  const shadowUses = [];
  for (const cssPath of await cssFilesBelow(cssRoot)) {
    const contents = await readText(cssPath, 'utf8');
    diagnostics.push(
      ...collectCssIssues(cssPath, contents, recordsByCssName, {
        workspaceRoot,
      }),
    );
    const path = normalizePath(relative(workspaceRoot, cssPath));
    const tokens = [...shadowListTokens(contents, path)].filter(
      (name) => recordsByCssName.get(name)?.public,
    );
    if (tokens.length > 0) shadowUses.push({ path, tokens });
  }
  diagnostics.push(...(await shadowListIssues(shadowUses, tokenRoot, readText, listDirectory)));

  return { compositions, diagnostics, recordsByCssName };
}

export async function runTokenCli({
  workspaceRoot = process.cwd(),
  stdout = process.stdout,
  stderr = process.stderr,
  setExitCode = () => undefined,
  loadConfig,
  readText = readFile,
} = {}) {
  const { compositions, diagnostics, recordsByCssName } = await checkTokens({
    workspaceRoot,
    ...(loadConfig === undefined ? {} : { loadConfig }),
    readText,
  });
  if (diagnostics.length > 0) {
    for (const diagnostic of [...new Set(diagnostics)].sort()) {
      stderr.write(`check-tokens: ${diagnostic}\n`);
    }
    setExitCode(1);
    return { compositions, diagnostics, recordsByCssName };
  }
  stdout.write(
    `PASS tokens: ${compositions.length} compositions, ${recordsByCssName.size} CSS names\n`,
  );
  return { compositions, diagnostics, recordsByCssName };
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  runTokenCli({ setExitCode: (value) => (process.exitCode = value) }).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`check-tokens: ${message}\n`);
    process.exitCode = 1;
  });
}
