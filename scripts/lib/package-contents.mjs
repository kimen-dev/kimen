// What a published tarball may contain: what a consumer uses, nothing else.
// The candidate builder and every independent verifier apply these rules to
// the exact packed bytes, so they import nothing outside Node: the verifier
// job has no dependency install.
//
// A tarball fails on the first rule it breaks:
// 1. No packed path may be build cache, a test, story, gallery, fixture or
//    size-limit artefact, or carry the build machine's absolute path.
// 2. No declaration file or source map may name an absolute build path,
//    and every source map must embed its sources (`sourcesContent`): the
//    sources themselves are not published. A source-map link must name a
//    shipped map. Where a package's build maps every module, every module
//    ships its map, except the generated modules its rules name as unmapped,
//    which ship neither a map nor a link to one.
// 3. Every packed file must be reachable: from package.json, its legal files
//    and README, the package's declared metadata assets, every path its
//    manifest fields and exports name, and the chain of imports, URL
//    references and source-map links from those.
// 4. The tarball and its unpacked contents stay within the package's budget.
import { posix } from 'node:path';

// Each package's source-map shape, metadata assets and size budget.
// - mapsEveryModule: its build maps every module, so a module without a map
//   is refused. Stencil maps no re-export module and the elements icons and
//   loader carry none, so elements, like tokens and the MCP bundle, says no.
// - unmappedModules: the generated modules that ship without a map or a link
//   to one (founder decision of 2026-11-25). Their maps would embed a whole
//   generated document or catalog, and a consumer debugs nothing in them.
//   scripts/lib/generated-source-maps.mjs removes the maps after the build.
// - assets: files no import reaches that a consumer still reads: licences,
//   agent docs, the custom-elements manifest.
// - budget, in bytes: the gzip tarball and its unpacked contents. Each base
//   is the size measured when it was set (2026-11-25) plus about 3 %, and
//   raising one needs the founder's approval. The lean catalog runtime
//   lowered the catalog, adapter-mcp-apps and mcp-server bases the same day
//   to what they measured after it, plus the same 3 %. The catalog tarball
//   (315,307 B) kept its base: 3 % over it would have raised the base.
export const packageContentRules = Object.freeze({
  '@kimen/elements': Object.freeze({
    mapsEveryModule: false,
    unmappedModules: Object.freeze([]),
    assets: Object.freeze(['generated/custom-elements.json', 'llms-full.txt', 'llms.txt', 'llms/']),
    budget: Object.freeze({ packed: 2_948_096, unpacked: 13_445_120 }),
  }),
  '@kimen/tokens': Object.freeze({
    mapsEveryModule: false,
    unmappedModules: Object.freeze([]),
    assets: Object.freeze(['fonts/InstrumentSans-OFL.txt', 'fonts/Newsreader-OFL.txt']),
    budget: Object.freeze({ packed: 220_160, unpacked: 519_168 }),
  }),
  '@kimen/mcp-server': Object.freeze({
    mapsEveryModule: false,
    unmappedModules: Object.freeze([]),
    assets: Object.freeze(['COMPAT.md']),
    budget: Object.freeze({ packed: 674_816, unpacked: 3_379_200 }),
  }),
  '@kimen/catalog': Object.freeze({
    mapsEveryModule: true,
    unmappedModules: Object.freeze([
      'dist/generated/catalog-guidance.js',
      'dist/generated/catalog-structure.js',
      'dist/generated/catalog.js',
    ]),
    assets: Object.freeze([]),
    budget: Object.freeze({ packed: 320_512, unpacked: 1_376_256 }),
  }),
  '@kimen/emitter': Object.freeze({
    mapsEveryModule: true,
    unmappedModules: Object.freeze([]),
    assets: Object.freeze([]),
    budget: Object.freeze({ packed: 43_008, unpacked: 151_552 }),
  }),
  '@kimen/adapter-a2ui': Object.freeze({
    mapsEveryModule: true,
    unmappedModules: Object.freeze([]),
    assets: Object.freeze([]),
    budget: Object.freeze({ packed: 102_400, unpacked: 413_696 }),
  }),
  '@kimen/adapter-mcp-apps': Object.freeze({
    mapsEveryModule: true,
    unmappedModules: Object.freeze(['dist/generated/surface-document.js']),
    assets: Object.freeze([]),
    budget: Object.freeze({ packed: 366_592, unpacked: 1_555_456 }),
  }),
  '@kimen/react': Object.freeze({
    mapsEveryModule: true,
    unmappedModules: Object.freeze([]),
    assets: Object.freeze([]),
    // Re-based the same day for the copy of the React output target's
    // runtime and its MIT notice, which replace the target as a dependency.
    budget: Object.freeze({ packed: 48_128, unpacked: 392_192 }),
  }),
  '@kimen/vue': Object.freeze({
    mapsEveryModule: true,
    unmappedModules: Object.freeze([]),
    assets: Object.freeze([]),
    budget: Object.freeze({ packed: 36_864, unpacked: 236_544 }),
  }),
  '@kimen/angular': Object.freeze({
    mapsEveryModule: true,
    unmappedModules: Object.freeze([]),
    assets: Object.freeze([]),
    budget: Object.freeze({ packed: 56_320, unpacked: 649_216 }),
  }),
});

// Every tarball carries these; npm adds the first, a release requires the rest.
const ALWAYS_REACHED = Object.freeze(['package.json', 'LICENSE', 'NOTICE', 'README.md']);

const basename = (path) => path.slice(path.lastIndexOf('/') + 1);
const directories = (path) => path.split('/').slice(0, -1);
const inDirectory = (names) => (path) => directories(path).some((name) => names.includes(name));

// [what it is, how to recognise its path, what to do instead]
const FORBIDDEN_PATHS = Object.freeze([
  [
    'TypeScript build info',
    (path) => path.endsWith('.tsbuildinfo'),
    'keep tsBuildInfoFile outside the files the package packs',
  ],
  [
    'an absolute build path',
    (path) => /(?:^|\/)(?:home|Users)\//u.test(path) || /(?:^|\/)[A-Za-z]:(?:\/|$)/u.test(path),
    'compile only the package sources, so no output path is derived from the build machine',
  ],
  [
    'Stencil build cache',
    inDirectory(['.stencil']),
    'compile only the package sources, so nothing is emitted from .stencil',
  ],
  [
    'stories',
    (path) => basename(path).includes('.stories.'),
    'keep stories out of the compiled program',
  ],
  [
    'tests',
    (path) =>
      /\.(?:spec|test)\./u.test(basename(path)) ||
      inDirectory([
        '__screenshots__',
        '__snapshots__',
        '__tests__',
        'browser-tests',
        'test',
        'tests',
      ])(path),
    'keep tests out of the compiled program',
  ],
  [
    'fixtures',
    inDirectory(['__fixtures__', 'fixtures']),
    'keep fixtures out of the compiled program',
  ],
  [
    'galleries',
    (path) => /^galler(?:y|ies)\./u.test(basename(path)),
    'keep galleries out of the compiled program',
  ],
  [
    'size-limit entries',
    inDirectory(['size-limit']),
    'keep size-limit entries out of the compiled program',
  ],
]);

const DECLARATION = /\.d\.[cm]?ts$/u;
const SCRIPT = /\.[cm]?js$/u;
const STYLESHEET = /\.css$/u;
// An absolute path where a string, a parenthesis, an assignment or whitespace
// begins, so that a URL such as https://example.com/home/ does not count.
const ABSOLUTE_PATH_IN_TEXT = /(?:^|[\s'"`(=])(?:\/(?:home|Users)\/|[A-Za-z]:[\\/])/mu;

function describe(name, label, paths, remedy) {
  const shown = paths.slice(0, 5).map((path) => `package/${path}`);
  const more = paths.length > shown.length ? ` and ${paths.length - shown.length} more` : '';
  return `${name} tarball ships ${label} ${shown.join(', ')}${more}; ${remedy}`;
}

function text(bytes) {
  return bytes.toString('utf8');
}

function sourceMap(bytes) {
  try {
    const map = JSON.parse(text(bytes));
    return map !== null && typeof map === 'object' && Array.isArray(map.sources) ? map : null;
  } catch {
    return null;
  }
}

// A map embeds every source it names: the sources are not published.
function embedsSources(map) {
  return (
    map !== null &&
    Array.isArray(map.sourcesContent) &&
    map.sourcesContent.length === map.sources.length &&
    map.sourcesContent.every((source) => typeof source === 'string')
  );
}

const ABSOLUTE_SOURCE = /^(?:\/|[A-Za-z]:[\\/]|file:)/u;

// The packed paths the source-map links of a script, declaration or
// stylesheet name. An inline (data:) or remote map is not a packed file.
function sourceMapTargets(path, bytes) {
  const source = text(bytes);
  const links = STYLESHEET.test(path)
    ? [...matches(SOURCE_MAP_BLOCK, source, 1)]
    : SCRIPT.test(path) || DECLARATION.test(path)
      ? [...matches(SOURCE_MAP_LINE, source, 1)]
      : [];
  return links
    .filter((link) => !/^(?:[A-Za-z][A-Za-z0-9+.-]*:|\/|#)/u.test(link))
    .map((link) => posix.normalize(posix.join(posix.dirname(path), link.replace(/[?#].*$/su, ''))));
}

// ---------------------------------------------------------------- references

const STATIC_SPECIFIER = /\b(?:from|import)\s*(['"])([^'"\r\n]+)\1/gu;
const REQUIRE_SPECIFIER = /\brequire\s*\(\s*(['"])([^'"\r\n]+)\1\s*\)/gu;
const URL_SPECIFIER = /\bnew\s+URL\s*\(\s*(['"])([^'"\r\n]+)\1\s*,\s*import\.meta\.url\s*\)/gu;
const REFERENCE_PATH = /\/\/\/\s*<reference\s+path\s*=\s*(['"])([^'"\r\n]+)\1/gu;
const SOURCE_MAP_LINE = /^\/\/[#@]\s*sourceMappingURL=(\S+)\s*$/gmu;
const SOURCE_MAP_BLOCK = /\/\*[#@]\s*sourceMappingURL=(\S+?)\s*\*\//gu;
const CSS_IMPORT = /@import\s+(?:url\(\s*)?(['"]?)([^'")\s;]+)\1/gu;
const CSS_URL = /\burl\(\s*(['"]?)([^'")\s]+)\1\s*\)/gu;
const DYNAMIC_IMPORT = /\bimport\s*\(/gu;

function* matches(pattern, source, group = 2) {
  for (const match of source.matchAll(pattern)) yield match[group];
}

// Skips whitespace and comments from `index`; returns the next index.
function skipTrivia(source, index) {
  let position = index;
  while (position < source.length) {
    if (/\s/u.test(source[position])) position += 1;
    else if (source.startsWith('/*', position)) {
      const end = source.indexOf('*/', position + 2);
      position = end === -1 ? source.length : end + 2;
    } else if (source.startsWith('//', position)) {
      const end = source.indexOf('\n', position);
      position = end === -1 ? source.length : end + 1;
    } else break;
  }
  return position;
}

// The argument of `import(` when it is a string or a template literal: a
// template literal becomes a pattern in which each substitution is `*`.
function dynamicImportArgument(source, index) {
  const start = skipTrivia(source, index);
  const quote = source[start];
  if (quote === "'" || quote === '"') {
    const end = source.indexOf(quote, start + 1);
    if (end === -1) return undefined;
    const value = source.slice(start + 1, end);
    return /[\r\n]/u.test(value) ? undefined : { specifier: value, pattern: false };
  }
  if (quote !== '`') return undefined;
  let pattern = '';
  let position = start + 1;
  while (position < source.length) {
    const character = source[position];
    if (character === '`') return { specifier: pattern, pattern: pattern.includes('*') };
    if (character === '\\') {
      pattern += source[position + 1] ?? '';
      position += 2;
    } else if (character === '$' && source[position + 1] === '{') {
      let depth = 1;
      position += 2;
      while (position < source.length && depth > 0) {
        if (source[position] === '{') depth += 1;
        else if (source[position] === '}') depth -= 1;
        position += 1;
      }
      if (!pattern.endsWith('*')) pattern += '*';
    } else {
      pattern += character;
      position += 1;
    }
  }
  return undefined;
}

function* references(path, bytes) {
  const isDeclaration = DECLARATION.test(path);
  if (isDeclaration || SCRIPT.test(path)) {
    const source = text(bytes);
    const kind = isDeclaration ? 'declaration' : 'module';
    for (const specifier of matches(STATIC_SPECIFIER, source)) yield { specifier, kind };
    for (const match of source.matchAll(DYNAMIC_IMPORT)) {
      const argument = dynamicImportArgument(source, match.index + match[0].length);
      if (argument !== undefined) yield { ...argument, kind };
    }
    for (const specifier of matches(SOURCE_MAP_LINE, source, 1)) yield { specifier, kind: 'asset' };
    if (isDeclaration) {
      for (const specifier of matches(REFERENCE_PATH, source)) yield { specifier, kind };
    } else {
      for (const specifier of matches(REQUIRE_SPECIFIER, source)) yield { specifier, kind };
      for (const specifier of matches(URL_SPECIFIER, source)) yield { specifier, kind: 'asset' };
    }
  } else if (STYLESHEET.test(path)) {
    const source = text(bytes);
    for (const specifier of matches(CSS_IMPORT, source)) yield { specifier, kind: 'asset' };
    for (const specifier of matches(CSS_URL, source)) yield { specifier, kind: 'asset' };
    for (const specifier of matches(SOURCE_MAP_BLOCK, source, 1))
      yield { specifier, kind: 'asset' };
  }
}

// Whether `text` matches `pattern`, in which each `*` stands for at least
// `shortest` characters. Patterns come from tarball contents, so this is a
// linear scan, never a regular expression built from them.
function globMatches(text, pattern, shortest) {
  const parts = pattern.split('*');
  if (parts.length === 1) return text === pattern;
  const first = parts[0];
  const last = parts.at(-1);
  const end = text.length - last.length;
  if (!text.startsWith(first) || !text.endsWith(last) || end < first.length) return false;
  let position = first.length;
  for (const part of parts.slice(1, -1)) {
    const index = text.indexOf(part, position + shortest);
    if (index === -1 || index + part.length > end) return false;
    position = index + part.length;
  }
  return end - position >= shortest;
}

// An exports pattern's `*` spans directories and names at least one
// character; a template-literal import's substitution stays within one path
// segment and may be empty.
const exportsPattern = (pattern) => (path) => globMatches(path, pattern, 1);
const importPattern = (pattern) => (path) => {
  const parts = pattern.split('/');
  const segments = path.split('/');
  return (
    parts.length === segments.length &&
    parts.every((part, index) => globMatches(segments[index], part, 0))
  );
};

// The packed paths a relative reference from `from` can name, most specific first.
function candidates(from, { specifier, kind }) {
  const target = specifier.replace(/[?#].*$/su, '');
  const resolved = posix.normalize(posix.join(posix.dirname(from), target));
  if (kind === 'declaration') {
    return [
      resolved.replace(/\.([cm]?)js$/u, '.d.$1ts'),
      resolved.replace(/\.([cm]?)ts$/u, '.d.$1ts'),
      `${resolved}.d.ts`,
      `${resolved}/index.d.ts`,
      resolved,
    ];
  }
  if (kind === 'module') {
    return [resolved, `${resolved}.js`, `${resolved}.mjs`, `${resolved}/index.js`];
  }
  return [resolved];
}

// A module specifier is relative only with ./ or ../; an asset reference (a
// source map, a stylesheet url()) is relative unless it has a scheme, starts
// at the root or names a fragment.
const isRelative = ({ specifier, kind }) =>
  kind === 'asset'
    ? !/^(?:[A-Za-z][A-Za-z0-9+.-]*:|\/|#)/u.test(specifier)
    : specifier.startsWith('./') || specifier.startsWith('../');

// TypeScript pairs a module with its declaration file: reaching one reaches
// the other, so a compiled package keeps each module and declaration together.
function counterparts(path) {
  const module = /^(.*)\.([cm]?)js$/u.exec(path);
  if (module) return [`${module[1]}.d.${module[2]}ts`];
  const declaration = /^(.*)\.d\.([cm]?)ts$/u.exec(path);
  if (declaration) return [`${declaration[1]}.${declaration[2]}js`];
  return [];
}

// Every string a manifest field or the exports map points at.
function manifestTargets(manifest) {
  const targets = [];
  const collect = (value) => {
    if (typeof value === 'string') targets.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value !== null && typeof value === 'object') Object.values(value).forEach(collect);
  };
  for (const field of ['main', 'module', 'types', 'typings', 'browser', 'customElements']) {
    if (typeof manifest[field] === 'string') targets.push(manifest[field]);
  }
  collect(manifest.bin);
  collect(manifest.exports);
  return targets.map((target) => posix.normalize(target.replace(/^\.\//u, '')));
}

/** The packed paths a consumer can reach, from the manifest and the declared assets inward. */
export function reachablePaths(files, manifest, assets) {
  const paths = [...files.keys()];
  const reached = new Set();
  const queue = [];
  const reach = (path) => {
    if (files.has(path) && !reached.has(path)) {
      reached.add(path);
      queue.push(path);
    }
  };
  const reachPattern = (matches) => {
    for (const path of paths) if (matches(path)) reach(path);
  };
  ALWAYS_REACHED.forEach(reach);
  for (const asset of assets) {
    if (asset.endsWith('/')) paths.filter((path) => path.startsWith(asset)).forEach(reach);
    else reach(asset);
  }
  for (const target of manifestTargets(manifest)) {
    if (target.includes('*')) reachPattern(exportsPattern(target));
    else reach(target);
  }
  while (queue.length > 0) {
    const from = queue.pop();
    counterparts(from).forEach(reach);
    for (const reference of references(from, files.get(from))) {
      if (!isRelative(reference)) continue;
      if (reference.pattern) {
        const resolved = posix.normalize(posix.join(posix.dirname(from), reference.specifier));
        reachPattern(importPattern(resolved));
        continue;
      }
      const found = candidates(from, reference).find((path) => files.has(path));
      if (found !== undefined) reach(found);
    }
  }
  return reached;
}

/**
 * The first rule a packed tarball breaks, as an error message, or undefined.
 * `entries` are the parsed tar entries (names under `package/`), `packedSize`
 * the gzip tarball length.
 */
export function packageContentViolation(name, entries, packedSize) {
  const rules = packageContentRules[name];
  if (rules === undefined) return `${name} has no package content rules`;
  const files = new Map();
  for (const entry of entries) {
    if (entry.type === '0' && entry.name.startsWith('package/')) {
      files.set(entry.name.slice('package/'.length), entry.bytes);
    }
  }
  const paths = [...files.keys()].sort();

  for (const [label, test, remedy] of FORBIDDEN_PATHS) {
    const found = paths.filter(test);
    if (found.length > 0) return describe(name, label, found, remedy);
  }
  const absolute = paths.filter(
    (path) => DECLARATION.test(path) && ABSOLUTE_PATH_IN_TEXT.test(text(files.get(path))),
  );
  if (absolute.length > 0) {
    return describe(
      name,
      'declarations naming an absolute build path in',
      absolute,
      'emit declarations only for the package sources',
    );
  }
  const sourceMaps = paths
    .filter((path) => path.endsWith('.map'))
    .map((path) => [path, sourceMap(files.get(path))]);
  const absoluteSources = sourceMaps
    .filter(([, map]) => map?.sources.some((source) => ABSOLUTE_SOURCE.test(String(source))))
    .map(([path]) => path);
  if (absoluteSources.length > 0) {
    return describe(
      name,
      'source maps naming an absolute build path in',
      absoluteSources,
      'map the sources relative to the output',
    );
  }
  const maps = sourceMaps.filter(([, map]) => !embedsSources(map)).map(([path]) => path);
  if (maps.length > 0) {
    return describe(
      name,
      'source maps without their sources',
      maps,
      'embed sourcesContent (inlineSources) in every published source map',
    );
  }
  const dangling = paths.filter((path) =>
    sourceMapTargets(path, files.get(path)).some((target) => !files.has(target)),
  );
  if (dangling.length > 0) {
    return describe(
      name,
      'links to source maps it does not ship in',
      dangling,
      'publish the map, or drop the sourceMappingURL comment with it',
    );
  }
  const unmapped = new Set(rules.unmappedModules);
  const mappedAnyway = rules.unmappedModules.filter(
    (module) =>
      files.has(`${module}.map`) ||
      (files.has(module) && sourceMapTargets(module, files.get(module)).length > 0),
  );
  if (mappedAnyway.length > 0) {
    return describe(
      name,
      'a source map for the unmapped generated modules',
      mappedAnyway,
      'run scripts/lib/generated-source-maps.mjs after the build: these modules ship without a map or a link to one',
    );
  }
  if (rules.mapsEveryModule) {
    const unmappedScripts = paths.filter(
      (path) => SCRIPT.test(path) && !unmapped.has(path) && !files.has(`${path}.map`),
    );
    if (unmappedScripts.length > 0) {
      return describe(
        name,
        'modules without a source map',
        unmappedScripts,
        'publish every module with its map; only the generated modules in unmappedModules ship without one',
      );
    }
  }

  let manifest;
  try {
    manifest = JSON.parse(text(files.get('package.json') ?? Buffer.from('null')));
  } catch {
    manifest = null;
  }
  if (manifest === null || typeof manifest !== 'object') {
    return `${name} tarball has no readable package/package.json`;
  }
  const reached = reachablePaths(files, manifest, rules.assets);
  const unreachable = paths.filter((path) => !reached.has(path));
  if (unreachable.length > 0) {
    return describe(
      name,
      'files no export, manifest field, metadata asset or import reaches',
      unreachable,
      'stop packing them, or declare the entry point that uses them',
    );
  }

  const unpackedSize = [...files.values()].reduce((total, bytes) => total + bytes.length, 0);
  if (packedSize > rules.budget.packed) {
    return `${name} tarball is ${packedSize} B, over its ${rules.budget.packed} B budget; raising it needs the founder's approval`;
  }
  if (unpackedSize > rules.budget.unpacked) {
    return `${name} unpacks to ${unpackedSize} B, over its ${rules.budget.unpacked} B budget; raising it needs the founder's approval`;
  }
  return undefined;
}
