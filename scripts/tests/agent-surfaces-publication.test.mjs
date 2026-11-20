// @spec:017-agent-surfaces
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { generatedGroups } from '../gates/check-generated-sync.mjs';

const execFileAsync = promisify(execFile);
const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const elementsRoot = join(repositoryRoot, 'packages/elements');

const readRepositoryFile = (path) => readFile(join(repositoryRoot, path), 'utf8');
const readRepositoryJson = async (path) => JSON.parse(await readRepositoryFile(path));

// The `[name](url)` of every "file list" entry of an llms.txt index.
const linkedUrls = (index) =>
  [...index.matchAll(/^- \[[^\]]+\]\(([^)\s]+)\)/gmu)].map((match) => match[1]);

const publishedTags = async () => {
  const manifest = await readRepositoryJson('packages/elements/generated/custom-elements.json');
  return manifest.modules
    .flatMap((module) => module.declarations)
    .filter((declaration) => declaration.customElement === true)
    .map((declaration) => declaration.tagName);
};

const genUiDirectories = async () =>
  (await readRepositoryJson('docs/genui-surfaces.json')).packages.map(({ directory }) => directory);

test('a cold elements build prepares the package summary and icon modules before Stencil validates its file list', async (t) => {
  const { preparePackageSummary } = await import(
    '../../packages/elements/scripts/build-surfaces.mjs'
  );
  const root = await mkdtemp(join(tmpdir(), 'kimen-cold-summary-'));
  t.after(() => rm(root, { force: true, recursive: true }));
  const target = join(root, 'packages/elements');
  await mkdir(target, { recursive: true });
  await writeFile(join(root, 'llms-full.txt'), 'Elements.\n\n## GenUI layer\n\nSite guidance.\n');
  await preparePackageSummary({ packageRoot: target, workspaceRoot: root });
  assert.equal(await readFile(join(target, 'llms-full.txt'), 'utf8'), 'Elements.\n');

  const { files, scripts } = await readRepositoryJson('packages/elements/package.json');
  assert.ok(files.includes('llms-full.txt'));
  assert.match(
    scripts.build,
    /^node scripts\/build-surfaces\.mjs --prepare-package-summary && node scripts\/generate-icons\.mjs && stencil build\b/u,
  );
  assert.match(
    await readRepositoryFile('scripts/gates/build-mutation-elements.sh'),
    /^node packages\/elements\/scripts\/build-surfaces\.mjs --prepare-package-summary\nnode packages\/elements\/scripts\/generate-icons\.mjs\npnpm --filter @kimen\/elements exec stencil build$/mu,
  );
});

test('S5 the surfaces sync gate covers both indexes, the site summary and every linked document', async () => {
  const { required, scopes } = generatedGroups.surfaces;
  const expected = [
    'llms.txt',
    'llms-full.txt',
    'packages/elements/llms.txt',
    'packages/elements/llms/agent-setup.md',
    'packages/elements/llms/theming.md',
    ...(await publishedTags()).map((tag) => `packages/elements/llms/${tag}.md`),
    ...(await genUiDirectories()).map((directory) => `llms/${directory.split('/').at(-1)}.md`),
  ];

  assert.deepEqual(
    expected.filter((path) => !required.includes(path)),
    [],
    'every generated language-model surface must be a required, drift-checked output',
  );
  // A scope closes a directory: a tracked or untracked file in it that the
  // gate does not require fails the gate, so a stale document cannot linger.
  for (const scope of [
    'llms',
    'llms-full.txt',
    'packages/elements/llms',
    'packages/elements/llms-full.txt',
  ]) {
    assert.ok(scopes.includes(scope), `${scope} must be a closed surfaces scope`);
  }
  assert.ok(
    !required.includes('packages/elements/llms-full.txt'),
    'the package summary is generated before packing',
  );
  // Exactly what the generation wrote is what the gate requires, no more.
  const generated = [
    ...(await readdir(join(repositoryRoot, 'llms'))).map((file) => `llms/${file}`),
    ...(await readdir(join(elementsRoot, 'llms'))).map((file) => `packages/elements/llms/${file}`),
  ];
  assert.deepEqual(
    generated.filter((path) => !required.includes(path)),
    [],
    'a generated document the gate does not require would ship unverified',
  );
});

test('S11 every link of the packaged llms.txt is a relative path to a file inside the packed package', async (t) => {
  const cache = await mkdtemp(join(tmpdir(), 'kimen-llms-pack-'));
  t.after(() => rm(cache, { force: true, recursive: true }));
  // The file list npm itself would put in the tarball: `files`, .npmignore
  // rules and npm's own defaults applied, without writing an archive.
  const { stdout } = await execFileAsync(
    'npm',
    ['pack', '--dry-run', '--json', '--ignore-scripts'],
    {
      cwd: elementsRoot,
      env: { ...process.env, npm_config_cache: cache, NPM_CONFIG_CACHE: cache },
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  const [packed] = JSON.parse(stdout);
  const packedFiles = new Set(packed.files.map(({ path }) => path));
  const links = linkedUrls(await readRepositoryFile('packages/elements/llms.txt'));

  assert.ok(packedFiles.has('llms.txt'), 'the package must ship its index');
  assert.ok(links.includes('llms/ki-button.md'), 'the packaged index must link its documents');
  assert.ok(links.includes('llms-full.txt'), 'the packaged index must link the complete summary');
  for (const url of links) {
    assert.doesNotMatch(
      url,
      /^[a-z][a-z0-9+.-]*:|^\/|(?:^|\/)\.\.(?:\/|$)/iu,
      `${url} must be a path relative to the package root: an installed package is read offline, at its own version`,
    );
    assert.ok(packedFiles.has(url), `${url} is linked by the packaged index but not shipped`);
  }
  // Nothing generated for the index is left behind either.
  const documents = (await readdir(join(elementsRoot, 'llms'))).map((file) => `llms/${file}`);
  assert.deepEqual(
    documents.filter((path) => !packedFiles.has(path) || !links.includes(path)),
    [],
    'every generated document must be both shipped and linked',
  );
});

// Runs the real assembler into a scratch directory (the publishing workflow
// never sets KIMEN_SITE_OUT, so this is the artifact Cloudflare Pages serves).
async function assembleSite() {
  const output = await mkdtemp(join(tmpdir(), 'kimen-llms-site-'));
  const environment = { ...process.env, KIMEN_SITE_OUT: output };
  delete environment.KIMEN_ANALYTICS;
  try {
    await execFileAsync('bash', ['scripts/build-site.sh', '--skip-storybook'], {
      cwd: repositoryRoot,
      env: environment,
    });
  } catch (error) {
    await rm(output, { force: true, recursive: true });
    assert.fail(
      `build-site.sh failed: ${error.stdout ?? ''}${error.stderr ?? ''} (${error.message})`,
    );
  }
  return output;
}

test('S12 the assembled site serves llms.txt and llms-full.txt at its root and every document its index links', async (t) => {
  const output = await assembleSite();
  t.after(() => rm(output, { force: true, recursive: true }));
  // The origin the index links is the one the documentation build declares.
  const siteOrigin = /^\s*site: '(https:\/\/[^']+)',$/mu.exec(
    await readRepositoryFile('site/docs/astro.config.mjs'),
  )?.[1];
  assert.equal(siteOrigin, 'https://kimen.dev');

  const served = await readFile(join(output, 'llms.txt'), 'utf8');
  assert.equal(served, await readRepositoryFile('llms.txt'));
  assert.equal(
    await readFile(join(output, 'llms-full.txt'), 'utf8'),
    await readRepositoryFile('llms-full.txt'),
  );

  const links = linkedUrls(served);
  assert.ok(links.includes(`${siteOrigin}/llms/ki-button.md`));
  assert.ok(links.includes(`${siteOrigin}/llms/catalog.md`));
  assert.ok(links.includes(`${siteOrigin}/llms-full.txt`));
  for (const url of links) {
    assert.ok(
      url.startsWith(`${siteOrigin}/`),
      `${url} must be an absolute address of the site: the published index is read pasted and fetched, away from its base URL`,
    );
    const content = await readFile(join(output, url.slice(siteOrigin.length + 1)), 'utf8').catch(
      () => null,
    );
    assert.ok(content, `${url} is linked by the published index but the site does not serve it`);
  }
  // One directory, two sources: the component and theming documents of the
  // package and the GenUI guides of the repository, none shadowing another
  // and none published without a link.
  assert.deepEqual(
    (await readdir(join(output, 'llms'))).map((file) => `${siteOrigin}/llms/${file}`).toSorted(),
    links.filter((url) => url.startsWith(`${siteOrigin}/llms/`)).toSorted(),
  );
});

// Deliberately carries no scenario ID: build caching is tooling, not behavior
// an agent can observe. It is the regression test for a cache that replayed a
// stale llms.txt after docs/genui-surfaces.json changed, because the elements
// build read that file (and the packages it is validated against) without
// declaring them as inputs.
test('the elements build cache is invalidated by every source of the agent surfaces and restores every surface', async () => {
  const manifest = await readRepositoryJson('packages/elements/package.json');
  const { inputs, outputs } = manifest.nx.targets.build;
  const declares = (path) =>
    inputs.some((input) => {
      const pattern = input.replace('{workspaceRoot}/', '');
      return pattern.endsWith('/**/*')
        ? path.startsWith(pattern.slice(0, -'**/*'.length))
        : pattern === path;
    });
  // Workspace-level scripts the build scripts load or spawn by path.
  const buildScripts = (await readdir(join(elementsRoot, 'scripts'))).filter((file) =>
    file.endsWith('.mjs'),
  );
  const referenced = new Set();
  for (const file of buildScripts) {
    const source = await readFile(join(elementsRoot, 'scripts', file), 'utf8');
    for (const match of source.matchAll(/'(scripts\/(?:lib|gates)\/[\w./-]+\.mjs)'/gu)) {
      referenced.add(match[1]);
    }
  }
  const sources = [
    'docs/genui-surfaces.json',
    ...(await genUiDirectories()).flatMap((directory) => [
      `${directory}/package.json`,
      `${directory}/src/index.ts`,
    ]),
    ...referenced,
  ];

  assert.ok(
    referenced.has('scripts/lib/token-inventory.mjs'),
    'the scan must find the build libraries',
  );
  assert.deepEqual(
    sources.filter((path) => !declares(path)),
    [],
    'a source the build reads without declaring it lets Nx replay stale surfaces',
  );
  for (const output of [
    '{projectRoot}/llms.txt',
    '{projectRoot}/llms-full.txt',
    '{projectRoot}/llms',
    '{workspaceRoot}/llms.txt',
    '{workspaceRoot}/llms-full.txt',
    '{workspaceRoot}/llms',
  ]) {
    assert.ok(outputs.includes(output), `${output} must be restored by an Nx build cache hit`);
  }
  // The build's own outputs must never feed its cache key.
  for (const excluded of [
    '!{projectRoot}/llms.txt',
    '!{projectRoot}/llms-full.txt',
    '!{projectRoot}/llms/**',
  ]) {
    assert.ok(inputs.includes(excluded), `${excluded} must be excluded from the build inputs`);
  }
});
