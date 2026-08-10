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
  const api = await readSiteFile('docs/src/components/CemApi.astro');

  assert.match(config, /starlight\(\{/u);
  assert.match(config, /Header:\s*['"]\.\/src\/components\/Header\.astro['"]/u);
  assert.match(header, /href:\s*siteBase,\s*label:\s*['"]Home['"]/u);
  assert.match(header, /href:\s*docsBase,\s*label:\s*['"]Components['"]/u);
  assert.match(header, /href:\s*`\$\{siteBase\}playground\/`/u);
  assert.match(header, /<nav[^>]+aria-label=['"]Site['"]/u);
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
    ['React runtime code', /\bReact(?:DOM)?\b/u],
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
