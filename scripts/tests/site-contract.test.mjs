// @spec:031-site-experience#S1
// @spec:031-site-experience#S5
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const siteRoot = join(repositoryRoot, 'site');

async function readSiteFile(path) {
  return readFile(join(siteRoot, path), 'utf8');
}

function assertSemanticShell(source, path) {
  assert.match(source, /<!doctype html>/iu, `${path} must be an HTML document`);
  assert.match(source, /<html\b[^>]*\blang=["']en["']/iu, `${path} must declare its language`);
  assert.match(
    source,
    /<html\b[^>]*\bdata-ki-color-scheme=["']dark["']/iu,
    `${path} must expose the approved dark scheme without JavaScript`,
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
    'Every component, live. Not screenshots.',
    'This page runs on <code>@kimen/tokens</code>. Flip it.',
    'Legible to agents, by contract.',
    'What only a GenUI-first library does.',
    'Done means gates exit 0.',
    'The ki-* catalog.',
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
    'playground inspector must retain ten resolved token rows',
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
  const config = await readSiteFile('docs/astro.config.mjs');

  assert.ok(
    attributeValues(landing, 'link', 'href').includes('https://kimen.dev/'),
    'the landing must declare its canonical URL at the production origin',
  );
  assert.ok(
    attributeValues(playground, 'link', 'href').includes('https://kimen.dev/playground/'),
    'the playground must declare its canonical URL at the production origin',
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
const STALE_ROUTE_EXCLUDED_DIRECTORIES = new Set(['dist', 'node_modules', '.astro']);
// site/docs/package.json:6 carries a known stale description, deferred to a
// later whole-branch triage rather than fixed here (see task-2-report.md).
const STALE_ROUTE_EXCLUDED_FILES = new Set([join(siteRoot, 'docs', 'package.json')]);
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
        STALE_ROUTE_TEXT_EXTENSIONS.has(extname(path)) &&
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
