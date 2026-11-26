#!/usr/bin/env node
// @kimen/react installs without Stencil's React output target.
//
// The output target generates the wrappers in src/, and each one imports
// `@stencil/react-output-target/runtime`: one small module over @lit/react.
// The package that ships it is the output target itself, though, and its
// dependencies are build tooling (ts-morph and friends, about 19 MB) that a
// consumer would install and never run. So @kimen/react develops against the
// output target as a devDependency, depends on what the runtime imports, and
// after tsc this pass:
// 1. copies the runtime's modules, source maps and declarations, byte for
//    byte, from the installed output target into dist/stencil-runtime;
// 2. points each compiled wrapper module and declaration at that copy, and
//    moves the source-map columns that follow each rewritten specifier;
// 3. fails when the copy imports a package @kimen/react neither depends on
//    nor peers, or when a published file still imports the output target.
// The copy is MIT: the package NOTICE carries its licence.
//
// tsc -b trusts its build info and leaves an up-to-date module alone, so the
// pass runs after every build and is idempotent.
//
// Usage, from packages/react: node scripts/vendor-runtime.mjs
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, posix, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const OUTPUT_TARGET = '@stencil/react-output-target';
const RUNTIME_SUBPATH = './runtime';
const RUNTIME_SPECIFIER = `${OUTPUT_TARGET}/runtime`;
export const VENDOR_DIRECTORY = 'stencil-runtime';

function fail(message) {
  throw new Error(`vendor React runtime: ${message}`);
}

const isRelative = (specifier) => specifier.startsWith('./') || specifier.startsWith('../');
const packageName = (specifier) =>
  specifier
    .split('/')
    .slice(0, specifier.startsWith('@') ? 2 : 1)
    .join('/');

// The specifiers a module or declaration file imports, and its source-map
// link. An import() whose argument is not a string names a file no one can
// follow, so it is refused rather than missed.
const STATIC_SPECIFIER = /\b(?:from|import)\s*(['"])([^'"\r\n]+)\1/gu;
const LITERAL_IMPORT_CALL = /\bimport\s*\(\s*(['"])([^'"\r\n]+)\1\s*\)/gu;
const IMPORT_CALL = /\bimport\s*\(/gu;
const SOURCE_MAP_LINK = /^\/\/# sourceMappingURL=(\S+)$/mu;

export function importedSpecifiers(source) {
  return [STATIC_SPECIFIER, LITERAL_IMPORT_CALL].flatMap((pattern) =>
    [...source.matchAll(pattern)].map((match) => match[2]),
  );
}

export function fileReferences(source, file) {
  const named = [...source.matchAll(LITERAL_IMPORT_CALL)].length;
  if ([...source.matchAll(IMPORT_CALL)].length !== named) {
    fail(`${file} imports a module it does not name`);
  }
  return { specifiers: importedSpecifiers(source), sourceMap: SOURCE_MAP_LINK.exec(source)?.[1] };
}

/** The installed output target: its directory, version and runtime entry files. */
export async function locateRuntime(packageRoot) {
  const require = createRequire(join(packageRoot, 'package.json'));
  let resolved;
  try {
    resolved = require.resolve(RUNTIME_SPECIFIER);
  } catch (error) {
    fail(`cannot resolve ${RUNTIME_SPECIFIER} from ${packageRoot}: ${error.message}`);
  }
  for (let directory = dirname(resolved); directory !== dirname(directory); ) {
    let manifest;
    try {
      manifest = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
    } catch {
      manifest = undefined;
    }
    if (manifest?.name === OUTPUT_TARGET) {
      const entry = manifest.exports?.[RUNTIME_SUBPATH];
      if (!/\.js$/u.test(entry?.import) || !/\.d\.ts$/u.test(entry?.types)) {
        fail(
          `${OUTPUT_TARGET} ${manifest.version} exports no .js module and .d.ts types at ${RUNTIME_SUBPATH}`,
        );
      }
      return {
        directory,
        version: manifest.version,
        module: posix.normalize(entry.import),
        types: posix.normalize(entry.types),
      };
    }
    directory = dirname(directory);
  }
  return fail(`no ${OUTPUT_TARGET} package encloses ${resolved}`);
}

/**
 * The files `entry` reaches inside the output target, by path relative to
 * its directory, with their bytes and the packages they import. Modules
 * reach the files they name and their source maps; declarations reach the
 * declaration of each module they name.
 */
export async function closure(directory, entry, kind) {
  const files = new Map();
  const packages = new Set();
  const pending = [[entry]];
  while (pending.length > 0) {
    const candidates = pending.pop();
    if (candidates.some((path) => files.has(path))) continue;
    const outside = candidates.find((path) => path.startsWith('../'));
    if (outside !== undefined) fail(`${entry} reaches ${outside}, outside ${OUTPUT_TARGET}`);
    let path;
    let bytes;
    for (const candidate of candidates) {
      try {
        bytes = await readFile(join(directory, candidate));
        path = candidate;
        break;
      } catch {
        // The next candidate, if any.
      }
    }
    if (path === undefined)
      fail(`${OUTPUT_TARGET} has no ${candidates[0]}, which its runtime reaches`);
    files.set(path, bytes);
    if (path.endsWith('.map')) continue;
    const { specifiers, sourceMap } = fileReferences(bytes.toString('utf8'), path);
    for (const specifier of specifiers) {
      if (!isRelative(specifier)) {
        packages.add(packageName(specifier));
        continue;
      }
      const target = posix.normalize(posix.join(posix.dirname(path), specifier));
      // TypeScript reads a module's declaration where the module would be.
      pending.push(
        kind === 'declaration'
          ? [target.replace(/\.js$/u, '.d.ts'), `${target}.d.ts`, `${target}/index.d.ts`]
          : [target],
      );
    }
    if (kind === 'module' && sourceMap !== undefined) {
      pending.push([posix.normalize(posix.join(posix.dirname(path), sourceMap))]);
    }
  }
  return { files, packages };
}

/**
 * Where each runtime file goes in the copy. Modules keep their place beside
 * the module entry; declarations keep theirs beside the types entry, which
 * takes the module entry's name so that one specifier reaches both.
 */
export function vendoredLayout(runtime, modules, declarations) {
  const layout = new Map();
  const place = (from, to) => {
    if (to.startsWith('../')) fail(`${from} lies outside the runtime entry's directory`);
    if (layout.has(to)) fail(`${from} and another runtime file would both be ${to}`);
    layout.set(to, from);
  };
  for (const path of modules.keys()) {
    place(path, posix.relative(posix.dirname(runtime.module), path));
  }
  const typesEntry = `${posix.basename(runtime.module).replace(/\.js$/u, '')}.d.ts`;
  for (const path of declarations.keys()) {
    place(
      path,
      path === runtime.types ? typesEntry : posix.relative(posix.dirname(runtime.types), path),
    );
  }
  return layout;
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function decodeSegment(segment) {
  const values = [];
  let value = 0;
  let shift = 0;
  for (const character of segment) {
    const digit = BASE64.indexOf(character);
    if (digit === -1) fail(`invalid source-map digit "${character}"`);
    value += (digit & 31) * 2 ** shift;
    if (digit & 32) {
      shift += 5;
      continue;
    }
    values.push(value % 2 === 1 ? -(value - 1) / 2 : value / 2);
    value = 0;
    shift = 0;
  }
  if (shift !== 0) fail(`truncated source-map segment "${segment}"`);
  return values;
}

export function encodeValue(value) {
  let rest = value < 0 ? -value * 2 + 1 : value * 2;
  let encoded = '';
  do {
    const digit = rest % 32;
    rest = Math.floor(rest / 32);
    encoded += BASE64[rest > 0 ? digit + 32 : digit];
  } while (rest > 0);
  return encoded;
}

/**
 * One line of source-map mappings with every segment that starts after
 * `column` moved by `delta`: what a specifier that starts at `column` and
 * grows by `delta` characters does to the code after it.
 */
export function shiftLine(mappings, column, delta) {
  if (mappings === '' || delta === 0) return mappings;
  let generated = 0;
  let previous = 0;
  return mappings
    .split(',')
    .map((segment) => {
      const [relative, ...rest] = decodeSegment(segment);
      generated += relative;
      const moved = generated > column ? generated + delta : generated;
      const encoded = [moved - previous, ...rest].map(encodeValue).join('');
      previous = moved;
      return encoded;
    })
    .join(',');
}

const RUNTIME_IMPORT = new RegExp(
  `\\b(?:from|import)\\s*(['"])${RUNTIME_SPECIFIER.replaceAll('/', '\\/')}\\1`,
  'gu',
);

/**
 * `source` with each import of the output target's runtime naming
 * `replacement` instead, and where each rewritten specifier started (line
 * and column, zero-based) and how much it grew.
 */
export function rewriteRuntimeImports(source, replacement) {
  const edits = [];
  const rewritten = source.replace(RUNTIME_IMPORT, (match, quote, offset) => {
    const start = offset + match.length - RUNTIME_SPECIFIER.length - 2;
    const before = source.slice(0, start);
    const line = before.split('\n').length - 1;
    edits.push({
      line,
      column: start - (before.lastIndexOf('\n') + 1),
      delta: replacement.length - RUNTIME_SPECIFIER.length,
    });
    return `${match.slice(0, match.length - RUNTIME_SPECIFIER.length - 2)}${quote}${replacement}${quote}`;
  });
  return { source: rewritten, edits };
}

/** A source map whose mappings follow the edits `rewriteRuntimeImports` made. */
export function shiftSourceMap(map, edits) {
  const lines = map.mappings.split(';');
  for (const { line, column, delta } of edits.toSorted(
    (left, right) => right.line - left.line || right.column - left.column,
  )) {
    if (line >= lines.length) fail(`the source map of ${map.file} has no line ${line + 1}`);
    lines[line] = shiftLine(lines[line], column, delta);
  }
  return { ...map, mappings: lines.join(';') };
}

async function publishedFiles(directory, prefix = '') {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory())
      found.push(...(await publishedFiles(join(directory, entry.name), path)));
    else found.push(path);
  }
  return found.sort();
}

const isCode = (path) => path.endsWith('.js') || path.endsWith('.d.ts');

/** Copies the runtime into `dist/stencil-runtime` and points the wrappers at it. */
export async function vendorRuntime(packageRoot) {
  const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  const runtime = await locateRuntime(packageRoot);
  const modules = await closure(runtime.directory, runtime.module, 'module');
  const declarations = await closure(runtime.directory, runtime.types, 'declaration');
  const installed = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ]);
  const missing = [...new Set([...modules.packages, ...declarations.packages])]
    .filter((name) => !installed.has(name))
    .sort();
  if (missing.length > 0) {
    fail(
      `the ${OUTPUT_TARGET} ${runtime.version} runtime imports ${missing.join(', ')}, which ${manifest.name} neither depends on nor peers`,
    );
  }
  const layout = vendoredLayout(runtime, modules.files, declarations.files);

  const dist = join(packageRoot, 'dist');
  const vendor = join(dist, VENDOR_DIRECTORY);
  await rm(vendor, { force: true, recursive: true });
  for (const [to, from] of layout) {
    await mkdir(dirname(join(vendor, to)), { recursive: true });
    await writeFile(join(vendor, to), modules.files.get(from) ?? declarations.files.get(from));
  }

  const replacement = `./${VENDOR_DIRECTORY}/${posix.basename(runtime.module)}`;
  let repointed = 0;
  // The wrappers compile to the top of dist; anything below is checked next.
  for (const path of await publishedFiles(dist)) {
    if (!isCode(path) || path.includes('/')) continue;
    const file = join(dist, path);
    const { source, edits } = rewriteRuntimeImports(await readFile(file, 'utf8'), replacement);
    if (edits.length === 0) continue;
    await writeFile(file, source);
    const link = SOURCE_MAP_LINK.exec(source)?.[1];
    if (link !== undefined) {
      const mapFile = join(dist, link);
      const map = JSON.parse(await readFile(mapFile, 'utf8'));
      await writeFile(mapFile, JSON.stringify(shiftSourceMap(map, edits)));
    }
    repointed += 1;
  }

  const stillImporting = [];
  for (const path of await publishedFiles(dist)) {
    if (!isCode(path)) continue;
    const specifiers = importedSpecifiers(await readFile(join(dist, path), 'utf8'));
    if (specifiers.some((specifier) => packageName(specifier) === OUTPUT_TARGET)) {
      stillImporting.push(path);
    }
  }
  if (stillImporting.length > 0) {
    fail(`dist/${stillImporting.join(', dist/')} still import ${OUTPUT_TARGET}`);
  }
  return { version: runtime.version, files: [...layout.keys()].sort(), repointed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  vendorRuntime(process.cwd()).then(
    ({ version, files, repointed }) => {
      process.stdout.write(
        `VENDOR React runtime: PASS (${OUTPUT_TARGET} ${version}: ${files.length} files in dist/${VENDOR_DIRECTORY}, ${repointed} files re-pointed)\n`,
      );
    },
    (error) => {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    },
  );
}
