import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  buildGenUiDocuments,
  buildGenUiSection,
  buildLlmsDocuments,
  buildLlmsIndex,
  buildLlmsTxt,
  buildManifest,
  buildRootLlmsTxt,
  normalizeDocs,
  serializeJson,
  validateDocs,
  validateGenUiSurfaces,
} from './agent-surfaces.mjs';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = resolve(packageRoot, '../..');

// Where scripts/build-site.sh publishes the repository index and what it
// links (research D11): the origin is the `site` of the documentation build
// and the manifest path is where the assembler copies custom-elements.json.
const SITE_ORIGIN = 'https://kimen.dev/';
const SITE_MANIFEST_PATH = 'assets/elements/custom-elements.json';

export async function runBuildSurfaces(options = {}) {
  const selectedPackageRoot = options.packageRoot ?? packageRoot;
  const selectedWorkspaceRoot = options.workspaceRoot ?? workspaceRoot;
  const paths = {
    docsPath: options.docsPath ?? resolve(selectedPackageRoot, 'generated/docs.json'),
    packageJsonPath: options.packageJsonPath ?? resolve(selectedPackageRoot, 'package.json'),
    preamblePath: options.preamblePath ?? resolve(selectedPackageRoot, 'scripts/llms-preamble.txt'),
    manifestPath:
      options.manifestPath ?? resolve(selectedPackageRoot, 'generated/custom-elements.json'),
    publicApiPath: options.publicApiPath ?? resolve(selectedPackageRoot, 'generated/public-api'),
    packageLlmsPath: options.packageLlmsPath ?? resolve(selectedPackageRoot, 'llms.txt'),
    rootLlmsPath: options.rootLlmsPath ?? resolve(selectedWorkspaceRoot, 'llms.txt'),
    genUiPath: options.genUiPath ?? resolve(selectedWorkspaceRoot, 'docs/genui-surfaces.json'),
    packageRoot: selectedPackageRoot,
  };

  const docs = normalizeDocs(JSON.parse(await readFile(paths.docsPath, 'utf8')), {
    packageRoot: paths.packageRoot,
  });
  const violations = validateDocs(docs);
  if (violations.length > 0) {
    return {
      ok: false,
      stderr: formatViolations(violations),
      violations,
    };
  }

  // The repository surfaces extend the package ones with the GenUI layer
  // (catalog, emitter, adapters). Its hand-written source is validated
  // against the real package entry modules BEFORE any output is written, so
  // a renamed export or blank guidance fails the build instead of shipping
  // stale.
  const genUiInputs = await loadGenUiSurfaces({
    genUiPath: paths.genUiPath,
    workspaceRoot: selectedWorkspaceRoot,
  });
  const genUiViolations = validateGenUiSurfaces(genUiInputs.genUi, genUiInputs.packages);
  if (genUiViolations.length > 0) {
    return {
      ok: false,
      stderr: formatViolations(genUiViolations),
      violations: genUiViolations,
    };
  }

  const pkg = JSON.parse(await readFile(paths.packageJsonPath, 'utf8'));
  const preamble = await readFile(paths.preamblePath, 'utf8');
  const manifestInputs =
    options.manifestInputs ??
    (await buildManifestInputs({
      packageExports: pkg.exports,
      workspaceRoot: options.workspaceRoot ?? workspaceRoot,
      packageRoot: paths.packageRoot,
      tokenPackageRoot:
        options.tokenPackageRoot ??
        resolve(options.workspaceRoot ?? workspaceRoot, 'packages/tokens'),
    }));
  const rawManifest = buildManifest(docs, manifestInputs);
  const { completeCemMethodSignatures } = await import(
    pathToFileURL(
      resolve(options.workspaceRoot ?? workspaceRoot, 'scripts/lib/public-api-snapshot.mjs'),
    ).href
  );
  const manifest = completeCemMethodSignatures({ manifest: rawManifest, docs });
  // Each index owns the documents it links, in llms/ next to it. The packaged
  // index links them by relative path; the repository index, which the site
  // publishes, by their address on the site, with the complete summary
  // (llms-full.txt) beside it. The package ships no complete summary: it
  // would repeat the documents.
  const packageCompanions = llmsCompanions(paths.packageLlmsPath);
  const rootCompanions = llmsCompanions(paths.rootLlmsPath);
  const rootFull = buildRootLlmsTxt(
    buildLlmsTxt(docs, pkg, preamble, manifestInputs),
    buildGenUiSection(genUiInputs.genUi, genUiInputs.packages),
  );
  const packageIndex = buildLlmsIndex(docs, pkg, preamble, {
    manifestHref: pkg.customElements,
  });
  const rootIndex = buildLlmsIndex(docs, pkg, preamble, {
    base: SITE_ORIGIN,
    fullSummary: true,
    manifestHref: `${SITE_ORIGIN}${SITE_MANIFEST_PATH}`,
    genUi: genUiInputs,
  });
  const packageDocuments = buildLlmsDocuments(docs, preamble, manifestInputs);
  const rootDocuments = buildGenUiDocuments(genUiInputs.genUi, genUiInputs.packages);
  // The site serves both sets from one /llms/ directory: a name written
  // twice would publish one document over the other.
  const documentFiles = [...packageDocuments, ...rootDocuments].map(([file]) => file);
  const repeated = documentFiles.find((file, index) => documentFiles.indexOf(file) !== index);
  if (repeated !== undefined) {
    throw new Error(`build-surfaces: llms/${repeated} would be generated more than once`);
  }
  const publicApi =
    options.publicApi ??
    (await buildPublicApi({
      docs,
      manifest,
      elementsPackage: pkg,
      manifestInputs,
      workspaceRoot: options.workspaceRoot ?? workspaceRoot,
      elementsPackageRoot: paths.packageRoot,
      tokensPackageJsonPath:
        options.tokensPackageJsonPath ??
        resolve(options.workspaceRoot ?? workspaceRoot, 'packages/tokens/package.json'),
      rootIndexPath: options.rootIndexPath ?? resolve(paths.packageRoot, 'src/index.ts'),
    }));
  const publicApiFiles = await publicApiOutputs({
    snapshot: publicApi,
    target: paths.publicApiPath,
    workspaceRoot: selectedWorkspaceRoot,
  });

  const outputs = new Map([
    [paths.docsPath, serializeJson(docs)],
    [paths.manifestPath, serializeJson(manifest)],
    ...publicApiFiles,
    [paths.packageLlmsPath, packageIndex],
    ...packageDocuments.map(([file, content]) => [
      join(packageCompanions.documentsDirectory, file),
      content,
    ]),
    [paths.rootLlmsPath, rootIndex],
    [rootCompanions.fullPath, rootFull],
    ...rootDocuments.map(([file, content]) => [
      join(rootCompanions.documentsDirectory, file),
      content,
    ]),
  ]);

  for (const directory of new Set([...outputs.keys()].map((path) => dirname(path)))) {
    await mkdir(directory, { recursive: true });
  }
  for (const [outputPath, content] of outputs) {
    await writeFile(outputPath, content);
  }
  await removeStaleFiles(
    packageCompanions.documentsDirectory,
    packageDocuments.map(([file]) => file),
    /\.md$/u,
  );
  await removeStaleFiles(
    rootCompanions.documentsDirectory,
    rootDocuments.map(([file]) => file),
    /\.md$/u,
  );
  if (!paths.publicApiPath.endsWith('.json')) {
    const directory = join(paths.publicApiPath, 'components');
    const shards = publicApiFiles
      .filter(([path]) => dirname(path) === directory)
      .map(([path]) => relative(directory, path));
    await mkdir(directory, { recursive: true });
    await removeStaleFiles(directory, shards, /\.json$/u);
  }
  // Stencil's per-component output targets write current wrappers. Remove
  // obsolete generated wrappers left on either side of a merge.
  const wrappers = docs.components.map(({ tag }) => `${tag}.ts`);
  for (const directory of options.wrapperDirectories ?? []) {
    await removeStaleFiles(directory, wrappers, /^ki-[a-z0-9]+(?:-[a-z0-9]+)*\.ts$/u);
  }

  return { ok: true, stderr: '', violations: [], outputs };
}

// Deriving the companions from the index path keeps every caller that
// redirects an index (tests, the generator smoke) inside its own directory:
// nothing is ever written next to an index the caller did not name.
function llmsCompanions(indexPath) {
  const stem = indexPath.replace(/\.txt$/u, '');
  if (stem === indexPath) {
    throw new Error(`build-surfaces: an llms index path must end in .txt: ${indexPath}`);
  }
  return { fullPath: `${stem}-full.txt`, documentsDirectory: stem };
}

// A generated directory holds the current outputs. A removed component's
// shards, wrapper modules and documents are pruned by their output pattern.
async function removeStaleFiles(directory, files, pattern) {
  const generated = new Set(files);
  for (const entry of await readdir(directory)) {
    if (pattern.test(entry) && !generated.has(entry)) {
      await rm(join(directory, entry));
    }
  }
}

// The GenUI surface source is hand-written (docs/genui-surfaces.json); the
// facts it may not invent — package names, descriptions and export names —
// are loaded here from each package's own package.json and src/index.ts so
// validateGenUiSurfaces can reject drift before generation.
async function loadGenUiSurfaces({ genUiPath, workspaceRoot }) {
  const genUi = JSON.parse(await readFile(genUiPath, 'utf8'));
  if (!Array.isArray(genUi.packages) || genUi.packages.length === 0) {
    throw new Error(`genui-surfaces: ${genUiPath} must declare a non-empty packages array`);
  }
  const packages = await Promise.all(
    genUi.packages.map(async (entry) => {
      const directory = entry.directory;
      if (typeof directory !== 'string' || directory.trim() === '') {
        throw new Error('genui-surfaces: every package entry needs a directory');
      }
      const genUiPackageRoot = resolve(workspaceRoot, directory);
      const fromRoot = relative(workspaceRoot, genUiPackageRoot);
      if (
        fromRoot === '' ||
        fromRoot === '..' ||
        fromRoot.startsWith(`..${sep}`) ||
        isAbsolute(fromRoot)
      ) {
        throw new Error(`genui-surfaces: ${directory} escapes the workspace root`);
      }
      const [packageJson, indexSource] = await Promise.all([
        readFile(resolve(genUiPackageRoot, 'package.json'), 'utf8').then(JSON.parse),
        readFile(resolve(genUiPackageRoot, 'src/index.ts'), 'utf8'),
      ]);
      return { directory, packageJson, indexSource };
    }),
  );
  return { genUi, packages };
}

async function buildManifestInputs({
  packageExports,
  workspaceRoot,
  packageRoot,
  tokenPackageRoot,
}) {
  // Build-only tooling is intentionally outside the published package graph.
  // Resolve it from the workspace root at runtime; @kimen/elements already
  // declares @kimen/tokens as an Nx implicit/dev dependency.
  const {
    createOrderedTokenInventory,
    loadOrderedTokenCompositions,
    readConsumedPublicCssProperties,
  } = await import(pathToFileURL(resolve(workspaceRoot, 'scripts/lib/token-inventory.mjs')).href);
  const { darkConfig, lightConfig, material3DarkConfig, material3LightConfig } = await import(
    pathToFileURL(resolve(tokenPackageRoot, 'style-dictionary.config.mjs')).href
  );
  const tokenCompositions = await loadOrderedTokenCompositions({
    workspaceRoot,
    tokenPackageRoot,
    configurations: [
      { id: 'onmars-light', theme: 'onmars', scheme: 'light', config: lightConfig },
      { id: 'onmars-dark', theme: 'onmars', scheme: 'dark', config: darkConfig },
      {
        id: 'material3-light',
        theme: 'material3',
        scheme: 'light',
        config: material3LightConfig,
      },
      {
        id: 'material3-dark',
        theme: 'material3',
        scheme: 'dark',
        config: material3DarkConfig,
      },
    ],
  });
  const tokenInventory = createOrderedTokenInventory(tokenCompositions);
  const cssPropertiesByTag = await readConsumedPublicCssProperties({
    inventory: tokenInventory,
    componentsRoot: resolve(packageRoot, 'src/components'),
  });
  return { packageExports, cssPropertiesByTag, tokenInventory, tokenCompositions };
}

async function buildPublicApi({
  docs,
  manifest,
  elementsPackage,
  manifestInputs,
  workspaceRoot,
  elementsPackageRoot,
  tokensPackageJsonPath,
  rootIndexPath,
}) {
  if (!manifestInputs.tokenInventory || !Array.isArray(manifestInputs.tokenCompositions)) {
    throw new Error('build-surfaces: public API generation requires parsed token compositions');
  }
  const [{ buildRepositoryPublicApiSnapshot }, componentInventory, tokensPackage, rootSource] =
    await Promise.all([
      import(pathToFileURL(resolve(workspaceRoot, 'scripts/lib/public-api-snapshot.mjs')).href),
      import(pathToFileURL(resolve(workspaceRoot, 'scripts/lib/component-inventory.mjs')).href),
      readFile(tokensPackageJsonPath, 'utf8').then(JSON.parse),
      readFile(rootIndexPath, 'utf8'),
    ]);
  const inventory = await componentInventory.discoverComponentInventory({ workspaceRoot });
  const componentSubpaths = componentInventory.resolveComponentSubpaths(
    elementsPackage.exports,
    inventory,
  );
  const rootContract = componentInventory.validateLegacyRootContract(rootSource);
  const defaultTokenComposition = manifestInputs.tokenCompositions.find(
    ({ id }) => id === 'onmars-light',
  );
  const stylesheetSources = await readPublicStylesheets({
    packageRoot: dirname(tokensPackageJsonPath),
    packageExports: tokensPackage.exports,
    workspaceRoot,
  });

  return buildRepositoryPublicApiSnapshot({
    elementsPackage,
    tokensPackage,
    componentSubpaths,
    rootContract,
    docs,
    manifest,
    tokenInventory: manifestInputs.tokenInventory,
    defaultTokenComposition,
    stylesheetSources,
    declarationSources: {
      '@kimen/elements': { packageRoot: elementsPackageRoot },
      '@kimen/tokens': { packageRoot: dirname(tokensPackageJsonPath) },
    },
    browserBaseline: ['chromium', 'firefox', 'webkit'],
  });
}

function runtimeExportTarget(entry, label) {
  if (typeof entry === 'string' && entry.trim() !== '') return entry;
  if (Array.isArray(entry)) {
    for (const candidate of entry) {
      try {
        return runtimeExportTarget(candidate, label);
      } catch {
        // Conditional arrays fall through to the next runtime candidate.
      }
    }
  } else if (entry !== null && typeof entry === 'object') {
    for (const condition of ['import', 'browser', 'default', 'node']) {
      if (Object.hasOwn(entry, condition)) {
        return runtimeExportTarget(entry[condition], `${label}.${condition}`);
      }
    }
  }
  throw new Error(`${label} has no runtime target`);
}

async function readPublicStylesheets({ packageRoot, packageExports, workspaceRoot }) {
  if (
    packageExports === null ||
    typeof packageExports !== 'object' ||
    Array.isArray(packageExports)
  ) {
    throw new TypeError('@kimen/tokens exports must be an object');
  }
  const entries = Object.entries(packageExports).filter(([subpath]) =>
    /^\.\/css(?:\/|$)/u.test(subpath),
  );
  return Object.fromEntries(
    await Promise.all(
      entries.map(async ([subpath, entry]) => {
        const target = runtimeExportTarget(entry, `@kimen/tokens export ${subpath}`);
        if (!target.startsWith('./') || !target.endsWith('.css')) {
          throw new Error(`@kimen/tokens export ${subpath} must target package-relative CSS`);
        }
        const absoluteTarget = resolve(packageRoot, target);
        const fromRoot = relative(packageRoot, absoluteTarget);
        if (
          fromRoot === '' ||
          fromRoot === '..' ||
          fromRoot.startsWith(`..${sep}`) ||
          isAbsolute(fromRoot)
        ) {
          throw new Error(`@kimen/tokens export ${subpath} escapes its package root`);
        }
        if (!target.includes('*')) return [subpath, await readFile(absoluteTarget, 'utf8')];
        // A pattern export (spec 166 `./css/ki-*`): every file it resolves to.
        const { stylesheetPatternFiles } = await import(
          pathToFileURL(resolve(workspaceRoot, 'scripts/lib/css-token-surface.mjs')).href
        );
        const directory = dirname(absoluteTarget);
        const files = stylesheetPatternFiles(subpath, target, await readdir(directory));
        return [
          subpath,
          Object.fromEntries(
            await Promise.all(
              files.map(async ([key, file]) => [
                key,
                await readFile(join(directory, file), 'utf8'),
              ]),
            ),
          ),
        ];
      }),
    ),
  );
}

async function publicApiOutputs({ snapshot, target, workspaceRoot }) {
  if (target.endsWith('.json')) {
    const { canonicalJson } = await import(
      pathToFileURL(resolve(workspaceRoot, 'scripts/lib/canonical-json.mjs')).href
    );
    return [[target, canonicalJson(snapshot)]];
  }
  const { splitPublicApiSnapshot } = await import(
    pathToFileURL(resolve(workspaceRoot, 'scripts/lib/public-api-storage.mjs')).href
  );
  return [...splitPublicApiSnapshot(snapshot)].map(([path, bytes]) => [join(target, path), bytes]);
}

function formatViolations(violations) {
  return `agent-surfaces: documentation incomplete (Art. I):\n${violations
    .map((violation) => `  ${violation}`)
    .join('\n')}\n`;
}

// Review round 1: import.meta.url percent-encodes what process.argv[1] does
// not — compare real filesystem paths so a checkout under a path with spaces
// or non-ASCII characters cannot silently skip generation (S6).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runBuildSurfaces({
    wrapperDirectories: ['react', 'vue'].map((name) =>
      resolve(workspaceRoot, 'packages', name, 'src'),
    ),
  });
  if (!result.ok) {
    process.stderr.write(result.stderr);
    process.exit(1);
  }
}
