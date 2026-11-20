// @spec:031-site-experience#S1
// @spec:031-site-experience#S5
// @spec:068-component-discovery
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { componentFamilies } from '../../site/docs/component-families.mjs';
import { componentSidebarItems } from '../../site/docs/component-docs.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const siteRoot = join(repositoryRoot, 'site');

async function readSiteFile(path) {
  return readFile(join(siteRoot, path), 'utf8');
}

function assertSemanticShell(source, path) {
  assert.match(source, /<!doctype html>/iu, `${path} must be an HTML document`);
  assert.match(source, /<html\b[^>]*\blang=["']en["']/iu, `${path} must declare its language`);
  assert.doesNotMatch(
    source,
    /<html\b[^>]*\bdata-ki-color-scheme=/iu,
    `${path} must not fix a color scheme: without JavaScript it follows the system (031 FR-003)`,
  );
  assert.match(source, /<header\b/iu, `${path} must expose a header without JavaScript`);
  assert.match(source, /<nav\b/iu, `${path} must expose navigation without JavaScript`);
  assert.match(source, /<main\b[^>]*\bid=["']main["']/iu, `${path} must expose its main landmark`);
  assert.match(source, /<footer\b/iu, `${path} must expose a footer without JavaScript`);
  assert.match(source, /<a\b[^>]*\bhref=["']#main["']/iu, `${path} must expose a skip link`);
}

function attributeValues(source, tagName, attributeName) {
  const tags = source.match(new RegExp(`<${tagName}\\b[^>]*>`, 'giu')) ?? [];
  return tags.flatMap((tag) => {
    const match = tag.match(new RegExp(`\\b${attributeName}=["']([^"']+)["']`, 'iu'));
    return match?.[1] ? [match[1]] : [];
  });
}

function between(source, start, end, label) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `${label} start marker must exist`);
  assert.notEqual(endIndex, -1, `${label} end marker must exist`);
  return source.slice(startIndex, endIndex);
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) => {
        const path = join(directory, entry.name);
        return entry.isDirectory()
          ? collectFiles(path)
          : Promise.resolve(entry.isFile() ? [path] : []);
      }),
    )
  ).flat();
}

async function productionSources() {
  const paths = [
    join(siteRoot, 'index.html'),
    join(siteRoot, 'landing.css'),
    join(siteRoot, 'landing.js'),
    ...(await collectFiles(join(siteRoot, 'playground'))),
    ...(await collectFiles(join(siteRoot, 'privacy'))),
  ];
  return Promise.all(
    paths
      .filter((path) => ['.css', '.html', '.js', '.mjs'].includes(extname(path)))
      .map(async (path) => ({
        path: relative(repositoryRoot, path),
        source: await readFile(path, 'utf8'),
      })),
  );
}

test('S1 S5 keeps canonical landing routes in a semantic no-JavaScript shell', async () => {
  const source = await readSiteFile('index.html');

  assertSemanticShell(source, 'site/index.html');
  assert.match(source, /href=["']\.\/docs\/components\/alert\/["']/u);
  assert.match(source, /href=["']\.\/playground\/["']/u);
  assert.match(source, /href=["']https:\/\/github\.com\/kimen-dev\/kimen["']/u);
  assert.ok(attributeValues(source, 'link', 'href').includes('./assets/tokens/tokens.css'));
  assert.ok(attributeValues(source, 'link', 'href').includes('./landing.css'));
  assert.ok(attributeValues(source, 'script', 'src').includes('./landing.js'));

  const behavior = await readSiteFile('landing.js');
  assert.match(behavior, /\.\/assets\/elements\/kimen\/kimen\.esm\.js/u);
  assert.match(behavior, /import\(\/\* @vite-ignore \*\/ bundleUrl\)/u);
});

test('S5 publishes the playground as a semantic no-JavaScript page', async () => {
  const source = await readSiteFile('playground/index.html');

  assertSemanticShell(source, 'site/playground/index.html');
  assert.ok(attributeValues(source, 'link', 'href').includes('../assets/tokens/tokens.css'));
  assert.ok(attributeValues(source, 'link', 'href').some((href) => href.endsWith('.css')));
  assert.ok(attributeValues(source, 'script', 'src').some((src) => src.endsWith('.js')));
});

test('S5 publishes the privacy page as a structural sibling of the landing shell', async () => {
  const source = await readSiteFile('privacy/index.html');

  assertSemanticShell(source, 'site/privacy/index.html');
  assert.ok(attributeValues(source, 'link', 'href').includes('../assets/tokens/tokens.css'));
  assert.ok(attributeValues(source, 'link', 'href').includes('../landing.css'));
});

test('the public pages retain the approved desktop design structure and density', async () => {
  const landing = await readSiteFile('index.html');
  const playground = await readSiteFile('playground/index.html');
  const stats = between(landing, '<dl class="project-stats"', '</dl>', 'project stats');
  const comparison = between(
    landing,
    '<div class="comparison-wrap',
    '</table>',
    'comparison table',
  );
  const roadmap = between(landing, '<ol class="roadmap"', '</ol>', 'roadmap');

  for (const heading of [
    'The component foundation built for generative UI.',
    'The <code>ki-*</code> catalog: every component, live.',
    'This page runs on <code>@kimen/tokens</code>. Flip it.',
    'Legible to agents, by contract.',
    'What only a GenUI-first library does.',
    'Done means gates exit 0.',
    'Honest, gated, in the open.',
  ]) {
    assert.ok(landing.includes(heading), `landing must retain heading: ${heading}`);
  }

  assert.equal((stats.match(/<div>/gu) ?? []).length, 6, 'landing must retain six stats');
  assert.equal(
    (landing.match(/class=["'][^"']*\bcontract-artifact\b/gu) ?? []).length,
    4,
    'landing must retain four agent-contract artifacts',
  );
  assert.equal(
    (comparison.match(/<tr>/gu) ?? []).length,
    8,
    'comparison must retain one header and seven comparison rows',
  );
  assert.equal((roadmap.match(/<li\b/gu) ?? []).length, 6, 'roadmap must retain six states');
  assert.match(playground, /<h1[^>]+id=["']playground-title["'][^>]*>Theme playground<\/h1>/u);
  assert.equal(
    (playground.match(/class=["'][^"']*\btoken-row\b/gu) ?? []).length,
    10,
    'the no-JavaScript playground inspector keeps its ten sample rows (playground.js lists the full semantic set)',
  );
});

// The live review of kimen.dev (#520), items 17, 18 and 21.
test('the landing separates inline pairs, states required gates, and marks its disclosure', async () => {
  const landing = await readSiteFile('index.html');

  const artifacts = between(
    landing,
    '<div class="contract-artifact">',
    '@kimen/emitter',
    'artifacts',
  );
  assert.doesNotMatch(artifacts, /<\/(?:a|code)>\s*·/u, 'a bare dot reads as part of the words');
  assert.equal(
    (artifacts.match(/<span class="sep"><\/span>/gu) ?? []).length,
    2,
    'each pair is split by the separator, whose dot site/landing.css draws',
  );

  const gates = between(landing, '<table class="gate-table">', '</table>', 'gate table');
  assert.match(gates, /<th scope="col">Required<\/th>/u);
  assert.doesNotMatch(
    gates,
    />\s*required\s*</u,
    'the column says it once; each row shows the mark',
  );

  const summary = between(landing, '<details class="comparison">', '</summary>', 'comparison');
  assert.match(
    summary,
    /<use href="#i-chevron" \/>/u,
    'the comparison opens with the site chevron',
  );
});

test('the landing retains exactly one generated capability block', async () => {
  const source = await readSiteFile('index.html');
  const start = '<!-- kimen:capabilities:site-status:start -->';
  const end = '<!-- kimen:capabilities:site-status:end -->';

  assert.equal(source.split(start).length - 1, 1, 'site capability start marker must be unique');
  assert.equal(source.split(end).length - 1, 1, 'site capability end marker must be unique');
  assert.ok(
    source.indexOf(start) < source.indexOf(end),
    'site capability markers must remain ordered',
  );
  assert.match(
    source.slice(source.indexOf(start), source.indexOf(end)),
    /data-kimen-capabilities=["']site-status["']/u,
  );
});

test('the documentation keeps Starlight, canonical navigation and focusable API tables', async () => {
  const config = await readSiteFile('docs/astro.config.mjs');
  const header = await readSiteFile('docs/src/components/Header.astro');
  const themeProvider = await readSiteFile('docs/src/components/ThemeProvider.astro');
  const api = await readSiteFile('docs/src/components/CemApi.astro');

  assert.match(config, /starlight\(\{/u);
  assert.match(config, /Header:\s*['"]\.\/src\/components\/Header\.astro['"]/u);
  assert.match(header, /href:\s*siteBase,\s*label:\s*['"]Home['"]/u);
  assert.match(header, /href:\s*docsBase,\s*label:\s*['"]Components['"]/u);
  assert.match(header, /href:\s*`\$\{siteBase\}playground\/`/u);
  assert.match(header, /<nav[^>]+aria-label=['"]Site['"]/u);
  assert.match(header, /localStorage\.getItem\(['"]kimen-scheme['"]\)/u);
  assert.match(header, /localStorage\.setItem\(['"]kimen-scheme['"], scheme\)/u);
  assert.match(themeProvider, /storedScheme\s*===\s*['"]auto['"]/u);
  assert.match(themeProvider, /prefers-color-scheme:\s*light/u);
  assert.match(api, /class=['"]cem-table['"][\s\S]+role=['"]region['"]/u);
  assert.match(api, /aria-labelledby=\{`\$\{tag\}-properties`\}/u);
  assert.match(api, /tabindex=['"]0['"]/u);
});

test('S1 keeps the component sidebar in sync with legacy and colocated pages', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'kimen-component-docs-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const add = async (path) => {
    const destination = join(root, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, '---\ntitle: Fixture\n---\n');
  };
  await add('site/docs/src/content/docs/components/zeta.md');
  await add('site/docs/src/content/docs/components/_hidden.mdx');
  await add('packages/elements/src/components/ki-alpha/docs/site.mdx');
  await add('packages/elements/src/components/ki-alpha/docs/storybook.mdx');

  const workspace = pathToFileURL(root);
  assert.deepEqual(componentSidebarItems(workspace), ['components/alpha', 'components/zeta']);

  await add('site/docs/src/content/docs/components/alpha.mdx');
  assert.throws(() => componentSidebarItems(workspace), /Duplicate component documentation/u);
});

// The live review of kimen.dev (#520, item 12): six component pages were
// titled by name ("Chip", "Link") among dozens titled by tag, and the
// Components sidebar was one flat list of every page.
test('every component page is titled by its tag and belongs to at most one family', async () => {
  const ids = componentSidebarItems();
  assert.ok(ids.length > 0, 'the documentation must have component pages');

  const misnamed = [];
  for (const id of ids) {
    const name = id.slice('components/'.length);
    const candidates = [
      join(repositoryRoot, `packages/elements/src/components/ki-${name}/docs/site.mdx`),
      join(siteRoot, `docs/src/content/docs/components/${name}.mdx`),
      join(siteRoot, `docs/src/content/docs/components/${name}.md`),
    ];
    let source;
    for (const candidate of candidates) {
      source = await readFile(candidate, 'utf8').catch(() => undefined);
      if (source !== undefined) break;
    }
    assert.ok(source !== undefined, `${id} must have a documentation page`);
    const title = /^title:\s*(.+)$/mu.exec(source)?.[1]?.trim();
    if (title !== `ki-${name}`) misnamed.push(`${id}: "${title}"`);
  }
  assert.deepEqual(
    misnamed,
    [],
    'component pages are titled by their tag, as the sidebar lists them',
  );

  const assigned = componentFamilies.flatMap(({ components }) =>
    components.map((name) => `components/${name}`),
  );
  const duplicated = assigned.filter((id, index) => assigned.indexOf(id) !== index);
  assert.deepEqual(duplicated, [], 'a component belongs to exactly one family');
  // A new component page with no family yet still builds, under "Other": the
  // component generator does not assign one, and a component PR must not fail
  // on the site's grouping. Adding it to the list is a one-line follow-up.
  assert.deepEqual(
    assigned.filter((id) => !ids.includes(id)),
    [],
    'site/docs/component-families.mjs names only pages that exist',
  );
});

test('the Pages assembler publishes canonical generated assets and the playground route', async () => {
  const source = await readFile(join(repositoryRoot, 'scripts/build-site.sh'), 'utf8');

  assert.match(source, /packages\/tokens\/dist\/css\/tokens\.css/u);
  assert.match(source, /packages\/tokens\/dist\/css\/tokens\.material3\.css/u);
  assert.match(source, /packages\/elements\/dist\/kimen\/kimen\.esm\.js/u);
  assert.match(source, /packages\/elements\/generated\/custom-elements\.json/u);
  assert.match(source, /site\/playground\/index\.html/u);
  assert.match(source, /cp -R site\/playground\/\. ["']\$OUT\/playground\/["']/u);
  assert.doesNotMatch(source, /internal\/new-design|support\.js|\.dc\.html/iu);
});

test('production site sources cannot contain the design-tool runtime or inline implementation escapes', async () => {
  const forbidden = [
    ['the DC runtime', /(?:^|["'/])support\.js\b/iu],
    ['x-dc elements', /<\/?x-dc\b/iu],
    ['sc-* template elements', /<\/?sc-[a-z0-9-]+\b/iu],
    ['DC template bindings', /\{\{[^}]+\}\}/u],
    ['inline event handlers', /\son[a-z]+\s*=/iu],
    ['inline style attributes', /\sstyle\s*=/iu],
    ['React runtime code', /\b(?:ReactDOM|React\.(?:createElement|hydrate|render))\b/u],
    ['Babel runtime code', /\bBabel\b/u],
    ['unpkg resources', /\bunpkg(?:\.com)?\b/iu],
    ['Google Fonts resources', /fonts\.(?:googleapis|gstatic)\.com/iu],
  ];

  const violations = (await productionSources()).flatMap(({ path, source }) =>
    forbidden
      .filter(([, pattern]) => pattern.test(source))
      .map(([label]) => `${path} contains ${label}`),
  );

  assert.deepEqual(violations, []);
});

test('S1 publishes canonical URLs at the production origin', async () => {
  const landing = await readSiteFile('index.html');
  const playground = await readSiteFile('playground/index.html');
  const privacy = await readSiteFile('privacy/index.html');
  const config = await readSiteFile('docs/astro.config.mjs');

  assert.ok(
    attributeValues(landing, 'link', 'href').includes('https://kimen.dev/'),
    'the landing must declare its canonical URL at the production origin',
  );
  assert.ok(
    attributeValues(playground, 'link', 'href').includes('https://kimen.dev/playground/'),
    'the playground must declare its canonical URL at the production origin',
  );
  assert.ok(
    attributeValues(privacy, 'link', 'href').includes('https://kimen.dev/privacy/'),
    'the privacy page must declare its canonical URL at the production origin',
  );
  assert.match(config, /site:\s*'https:\/\/kimen\.dev'/u);
  assert.match(config, /base:\s*'\/docs'/u);
});

const STALE_ROUTE_TEXT_EXTENSIONS = new Set([
  '.astro',
  '.css',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mdx',
  '.mjs',
  '.ts',
]);
// Cloudflare Pages config files (`_headers`, `_redirects`) carry no file
// extension, so they fall outside STALE_ROUTE_TEXT_EXTENSIONS by default.
// Naming them explicitly keeps them inside the guard's coverage instead of
// silently exempting every extensionless file in site/.
const STALE_ROUTE_EXTENSIONLESS_FILENAMES = new Set(['_headers', '_redirects']);
const STALE_ROUTE_EXCLUDED_DIRECTORIES = new Set(['dist', 'node_modules', '.astro']);
// site/_redirects is the ONLY sanctioned exception to this guard, and it is
// permanent: the file's entire purpose is the Cloudflare Pages rule that maps
// the legacy `/kimen/*` GitHub Pages prefix back to the domain root, so that
// exact prefix has to appear there. Every other file under site/ fails the
// test on a stale /kimen/ prefix, with no exemptions — an exemption that
// merely defers a fix institutionalizes the hole it was opened for.
const STALE_ROUTE_EXCLUDED_FILES = new Set([join(siteRoot, '_redirects')]);
// Matches a stale GitHub Pages route prefix that must now be served from the
// Cloudflare Pages domain root, while ignoring unrelated `/kimen/`
// substrings such as `github.com/kimen-dev/kimen/...` links (excluded via
// the lookbehind) or `kimen/kimen.esm.js` asset filenames and `ui://kimen/...`
// example URIs (excluded because nothing routable follows the prefix).
const STALE_KIMEN_ROUTE_PATTERN =
  /\/kimen\/(?:docs|storybook|playground|assets)\/|(?<!kimen-dev)\/kimen\/(?![\w-])/u;

async function collectStaleRouteCandidates(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        return STALE_ROUTE_EXCLUDED_DIRECTORIES.has(entry.name)
          ? []
          : collectStaleRouteCandidates(path);
      }
      return entry.isFile() &&
        (STALE_ROUTE_TEXT_EXTENSIONS.has(extname(path)) ||
          STALE_ROUTE_EXTENSIONLESS_FILENAMES.has(entry.name)) &&
        !STALE_ROUTE_EXCLUDED_FILES.has(path)
        ? [path]
        : [];
    }),
  );
  return files.flat();
}

test('no file under site/ references a stale /kimen/ route prefix', async () => {
  const files = await collectStaleRouteCandidates(siteRoot);
  const violations = [];

  for (const path of files) {
    const source = await readFile(path, 'utf8');
    const relativePath = relative(repositoryRoot, path);
    source.split(/\r?\n/u).forEach((line, index) => {
      if (STALE_KIMEN_ROUTE_PATTERN.test(line)) {
        violations.push(`${relativePath}:${index + 1}`);
      }
    });
  }

  assert.deepEqual(
    violations,
    [],
    `every route under site/ is served from the domain root now; found stale /kimen/ prefixes at:\n${violations.join('\n')}`,
  );
});
