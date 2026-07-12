#!/usr/bin/env node
// @spec:018-project-integrity-hardening#S11
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { parseTokenComposition } from '../lib/token-inventory.mjs';

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
  for (const match of contents.matchAll(/var\(\s*(--ki-[a-z0-9-]+)/giu)) {
    const cssName = match[1].toLowerCase();
    const record = recordsByCssName.get(cssName);
    if (record === undefined) {
      issues.push(`unresolved-css-token ${relativePath} ${cssName}`);
    } else if (record.layer === 'primitive') {
      issues.push(`primitive-css-consumption ${relativePath} ${cssName}`);
    } else if (record.layer === 'theme') {
      issues.push(`theme-css-consumption ${relativePath} ${cssName}`);
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

export async function checkTokens({
  workspaceRoot,
  loadConfig = (href) => import(href),
  readText = readFile,
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
  for (const cssPath of await cssFilesBelow(cssRoot)) {
    diagnostics.push(
      ...collectCssIssues(cssPath, await readText(cssPath, 'utf8'), recordsByCssName, {
        workspaceRoot,
      }),
    );
  }

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
