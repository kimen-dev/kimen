import { readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  buildLlmsTxt,
  buildManifest,
  normalizeDocs,
  serializeJson,
  validateDocs,
} from './agent-surfaces.mjs';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workspaceRoot = resolve(packageRoot, '../..');

export async function runBuildSurfaces(options = {}) {
  const selectedPackageRoot = options.packageRoot ?? packageRoot;
  const selectedWorkspaceRoot = options.workspaceRoot ?? workspaceRoot;
  const paths = {
    docsPath: options.docsPath ?? resolve(selectedPackageRoot, 'generated/docs.json'),
    packageJsonPath: options.packageJsonPath ?? resolve(selectedPackageRoot, 'package.json'),
    preamblePath: options.preamblePath ?? resolve(selectedPackageRoot, 'scripts/llms-preamble.txt'),
    manifestPath:
      options.manifestPath ?? resolve(selectedPackageRoot, 'generated/custom-elements.json'),
    publicApiPath:
      options.publicApiPath ?? resolve(selectedPackageRoot, 'generated/public-api.json'),
    packageLlmsPath: options.packageLlmsPath ?? resolve(selectedPackageRoot, 'llms.txt'),
    rootLlmsPath: options.rootLlmsPath ?? resolve(selectedWorkspaceRoot, 'llms.txt'),
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
  const llmsTxt = buildLlmsTxt(docs, pkg, preamble, manifestInputs);
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
  const publicApiBytes = await serializeCanonicalJson(
    publicApi,
    options.workspaceRoot ?? workspaceRoot,
  );

  await writeFile(paths.docsPath, serializeJson(docs));
  await writeFile(paths.manifestPath, serializeJson(manifest));
  await writeFile(paths.publicApiPath, publicApiBytes);
  await writeFile(paths.packageLlmsPath, llmsTxt);
  await writeFile(paths.rootLlmsPath, llmsTxt);

  return {
    ok: true,
    stderr: '',
    violations: [],
    outputs: new Map([
      [paths.docsPath, serializeJson(docs)],
      [paths.manifestPath, serializeJson(manifest)],
      [paths.publicApiPath, publicApiBytes],
      [paths.packageLlmsPath, llmsTxt],
      [paths.rootLlmsPath, llmsTxt],
    ]),
  };
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

async function readPublicStylesheets({ packageRoot, packageExports }) {
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
        return [subpath, await readFile(absoluteTarget, 'utf8')];
      }),
    ),
  );
}

async function serializeCanonicalJson(value, workspaceRoot) {
  const { canonicalJson } = await import(
    pathToFileURL(resolve(workspaceRoot, 'scripts/lib/canonical-json.mjs')).href
  );
  return canonicalJson(value);
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
  const result = await runBuildSurfaces();
  if (!result.ok) {
    process.stderr.write(result.stderr);
    process.exit(1);
  }
}
