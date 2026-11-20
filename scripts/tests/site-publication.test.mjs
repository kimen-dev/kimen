// @spec:031-site-experience#S1
// @spec:031-site-experience#S8
// @spec:031-site-experience#S9
// @spec:031-site-experience#S10
// @spec:067-merge-friendly-checks
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { accessSync, appendFileSync, constants, statSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const siteRoot = join(repositoryRoot, 'site');
const crossFilesystemTest =
  'the documentation build publishes into an output directory on another filesystem';

async function readSiteFile(path) {
  return readFile(join(siteRoot, path), 'utf8');
}

function between(source, start, end, label) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  assert.notEqual(startIndex, -1, `${label} start marker must exist`);
  assert.notEqual(endIndex, -1, `${label} end marker must exist`);
  return source.slice(startIndex, endIndex);
}

// Parse `_headers` into { pattern -> [header lines] }. Cloudflare applies
// every rule whose pattern matches a request, so an assertion about caching
// has to be made against the rule that owns a path, not against the file as
// one string: a `Cache-Control` anywhere would otherwise satisfy a substring
// match while the wrong paths carry it.
function headerRules(source) {
  const rules = new Map();
  let current;
  for (const line of source.split(/\r?\n/u)) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (/^\S/u.test(line)) {
      current = line.trim();
      rules.set(current, []);
      continue;
    }
    assert.ok(current !== undefined, `_headers declares a header before any rule: ${line}`);
    rules.get(current).push(line.trim());
  }
  return rules;
}

// Content-addressed paths, and only these, may be cached immutably: the
// filename changes whenever the bytes do, so a stale copy is unreachable.
const IMMUTABLE_PATTERNS = new Set(['/assets/elements/kimen/p-*', '/docs/_astro/*']);
// Stable filenames — every one of them keeps the same name when its bytes
// change, whether that happens on every deploy (tokens, the element bundle,
// the manifest) or only via a rare, deliberate vendoring commit (the fonts).
// `immutable` on any of these would strand a visitor on stale bytes with no
// way back, so all of them must stay revalidatable; only the max-age differs.
// Seven days. Nothing in this group is content-addressed, so its max-age is
// the window during which a changed file stays invisible to a returning
// visitor who never presses reload.
const MAX_STALENESS_WINDOW_SECONDS = 604_800;
const REVALIDATED_PATTERNS = [
  '/assets/tokens/*',
  '/assets/elements/kimen/kimen.esm.js',
  '/assets/elements/kimen/index.esm.js',
  '/assets/elements/custom-elements.json',
  '/assets/fonts/*',
];

test('S10 the published site declares its security headers', async () => {
  const rules = headerRules(await readSiteFile('_headers'));
  const everyRoute = rules.get('/*');

  assert.ok(everyRoute !== undefined, '_headers must declare a rule for every route');
  assert.ok(everyRoute.includes('X-Content-Type-Options: nosniff'));
  assert.ok(everyRoute.includes('Referrer-Policy: strict-origin-when-cross-origin'));
  assert.ok(everyRoute.includes('Strict-Transport-Security: max-age=31536000; includeSubDomains'));
  assert.ok(
    everyRoute.includes('X-Frame-Options: SAMEORIGIN'),
    'DENY blocks same-origin framing too, which blanks every Storybook story canvas at /storybook/',
  );
  assert.match(
    everyRoute.join('\n'),
    /Content-Security-Policy-Report-Only: [^\n]*frame-ancestors 'self'/u,
    'the policy ships report-only, and must not encode a framing rule the site itself breaks',
  );
});

test('S10 the published site caches only content-addressed assets immutably', async () => {
  const source = await readSiteFile('_headers');
  const rules = headerRules(source);

  assert.deepEqual(
    [...rules]
      .filter(([, headers]) => headers.some((header) => /\bimmutable\b/u.test(header)))
      .map(([pattern]) => pattern)
      .toSorted(),
    [...IMMUTABLE_PATTERNS].toSorted(),
    'immutable caching must cover exactly the content-addressed paths',
  );

  for (const pattern of REVALIDATED_PATTERNS) {
    const headers = rules.get(pattern);
    assert.ok(headers !== undefined, `${pattern} must declare its own cache rule`);
    assert.ok(
      !headers.some((header) => /\bimmutable\b/u.test(header)),
      `${pattern} is not content-addressed: its filename is stable across deploys, so a browser must be able to revalidate it`,
    );
    const cacheControl = headers.join('\n');
    assert.match(
      cacheControl,
      /^Cache-Control: public, max-age=[1-9][0-9]{0,7}, must-revalidate$/mu,
      `${pattern} must declare a revalidating max-age (short for build-generated paths, longer for the rarely-changed fonts)`,
    );
    // The max-age IS the staleness window: within it a response is fresh, so
    // `must-revalidate` never fires and a normal navigation never asks. A
    // year here would be indistinguishable from `immutable` for anyone who
    // does not press reload, which is the defect this group exists to avoid.
    const maxAge = Number(/max-age=(\d+)/u.exec(cacheControl)[1]);
    assert.ok(
      maxAge <= MAX_STALENESS_WINDOW_SECONDS,
      `${pattern} may go stale for at most ${MAX_STALENESS_WINDOW_SECONDS}s; ${maxAge}s lets a changed file stay invisible to returning visitors for longer than anyone would look for it`,
    );
  }

  assert.ok(
    !rules.get('/*').some((header) => /^Cache-Control:/u.test(header)),
    'a Cache-Control on /* would be comma-joined onto every rule below it',
  );
});

test('S10 the report-only policy records that nothing collects its reports', async () => {
  const source = await readSiteFile('_headers');

  assert.doesNotMatch(
    source,
    /^ +Content-Security-Policy-Report-Only:[^\n]*report-(?:to|uri)/mu,
    'no reporting endpoint is deployed; if one is added, this test is the reminder to retire the placeholder note',
  );
  assert.match(
    source,
    /^#[^\n]*NO REPORTS ARE COLLECTED/mu,
    '_headers must state that the report-only policy sends its reports nowhere',
  );
  assert.match(
    source,
    /^#[^\n]*wasm-unsafe-eval/mu,
    '_headers must record the known Pagefind/WebAssembly violation before anyone enforces the policy',
  );
});

test('S1 the published site keeps the previous base reachable', async () => {
  const redirects = await readSiteFile('_redirects');

  assert.match(redirects, /^\/kimen\/\*\s+\/:splat\s+301$/mu);
});

// Deliberately carries no scenario ID. This is supply-chain hygiene (Art. X),
// already the subject of scripts/gates/check-workflows.mjs and
// scripts/tests/workflow-policy.test.mjs, and it has no user-visible effect
// that a behavior contract could describe. It borrowed S1 ("Primary site links
// reach their canonical destination"), which made the traceability gate report
// coverage of S1 that this test does not provide. An untagged test is honest;
// a mis-tagged one corrupts the gate.
test('the publish job pins its deploy tool and scopes its credential', async () => {
  const workflow = await readFile(join(repositoryRoot, '.github/workflows/docs.yml'), 'utf8');

  assert.match(
    workflow,
    /^ +wranglerVersion: '\d+\.\d+\.\d+'$/mu,
    "the tool that holds the API token and performs the deploy must be pinned exactly; a semver range like '4' is resolved fresh from npm on every run",
  );
  assert.match(
    workflow,
    /^ +WRANGLER_SEND_METRICS: false$/mu,
    'wrangler telemetry targets a host outside the allowlist, and a blocked-egress annotation on every run teaches reviewers to ignore harden-runner',
  );
  assert.match(
    workflow,
    /^ {4}environment:\n {6}name: \$\{\{ github\.event_name == 'pull_request' && 'site-preview' \|\| 'site-production' \}\}$/mu,
    'the publish job must resolve pull requests to the preview environment and everything else to the branch-restricted production one',
  );
});

test('S8 the privacy page is a semantic no-JavaScript page that declares the measurement', async () => {
  const source = await readSiteFile('privacy/index.html');

  assert.match(source, /<!doctype html>/iu);
  assert.match(source, /<html\b[^>]*\blang=["']en["']/iu);
  assert.match(source, /<main\b[^>]*\bid=["']main["']/iu);
  assert.match(source, /<footer\b/iu);
  assert.match(source, /umami/iu, 'the page must name the analytics it declares');
  assert.match(source, /cookie/iu, 'the page must state that no cookies are set');
  // Its one control is the shared color-scheme control (#520, item 9), hidden
  // until the shared module that wires it runs, so it never shows unwired.
  assert.deepEqual(source.match(/<fieldset\b[^>]*>/giu), [
    '<fieldset class="seg seg-scheme" data-scheme-control>',
  ]);
  assert.match(
    source,
    /<div class="header-scheme" data-privacy-scheme hidden>\s*<fieldset class="seg seg-scheme"/u,
    'the privacy scheme control must stay hidden until pages.js wires it',
  );
  assert.match(source, /<script type="module" src="\.\.\/pages\.js"><\/script>/u);
  assert.doesNotMatch(source, /<select\b/iu, 'the site has one scheme control, not a select');

  for (const page of ['index.html', 'playground/index.html']) {
    const markup = await readSiteFile(page);
    assert.match(
      markup,
      /href=["'](?:\.|\.\.)\/privacy\/["']/u,
      `${page} must link to the privacy page`,
    );
  }
});

test('S8 the assembler publishes the privacy route', async () => {
  const assembler = await readFile(join(repositoryRoot, 'scripts/build-site.sh'), 'utf8');

  assert.match(assembler, /cp -R site\/privacy\/\. ["']\$OUT\/privacy\/["']/u);
});

test('S8 every published documentation page can reach the privacy declaration', async () => {
  // /docs/* is the largest measured surface: astro.config.mjs puts the Umami
  // tag on every page there. Asserted against the BUILT pages rather than the
  // Starlight Footer override, because what matters is that the declaration is
  // actually reachable from each measured page, not that a component exists.
  const documentationRoot = join(siteRoot, 'docs/dist');
  const entries = await readdir(documentationRoot, {
    recursive: true,
    withFileTypes: true,
  }).catch((error) => {
    assert.fail(
      `site/docs/dist is missing: run \`pnpm --filter @kimen/docs build\` first (${error.message})`,
    );
  });
  const pages = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => join(entry.parentPath, entry.name));

  assert.ok(pages.length > 0, 'the documentation build must produce pages');

  const unreachable = [];
  for (const page of pages) {
    const markup = await readFile(page, 'utf8');
    if (!markup.includes('href="/privacy/"')) {
      unreachable.push(relative(documentationRoot, page));
    }
  }

  assert.deepEqual(
    unreachable,
    [],
    'every measured documentation page must link the privacy declaration',
  );
});

// The live review of kimen.dev (#520, item 4): below 50rem the header drops
// its section tabs and site links, and pages with a sidebar reach them through
// Starlight's menu button. The docs home is a splash page with no sidebar, so
// on a phone it had no way to the sections, Home or Playground at all. It
// carries its own menu; pages with a sidebar must not get a second one.
test('every documentation page reaches the sections, Home and Playground from a menu', async () => {
  const documentationRoot = join(siteRoot, 'docs/dist');
  const read = (page) =>
    readFile(join(documentationRoot, page), 'utf8').catch((error) => {
      assert.fail(
        `site/docs/dist is missing: run \`pnpm --filter @kimen/docs build\` first (${error.message})`,
      );
    });
  const linkTexts = (markup) =>
    [...markup.matchAll(/<a\b[^>]*>([^<]+)<\/a>/gu)].map(([, text]) => text.trim());

  const home = await read('index.html');
  const menu = between(
    home,
    '<details class="kimen-docs-menu"',
    '</details>',
    'the docs home menu',
  );
  assert.deepEqual(linkTexts(menu), [
    'Start',
    'Guides',
    'Generative UI',
    'Components',
    'Tokens',
    'Resources',
    'Home',
    'Playground',
    'GitHub',
  ]);
  assert.match(menu, /<span class="visually-hidden">Menu<\/span>/u, 'the menu button is named');

  const component = await read('components/button/index.html');
  assert.ok(
    !component.includes('kimen-docs-menu'),
    "a page with a sidebar keeps Starlight's menu button only",
  );
  assert.match(component, /class="sl-menu-button/u);
  const footer = between(component, 'class="kimen-sidebar-sites"', '</ul>', 'the menu footer');
  assert.deepEqual(linkTexts(footer), ['Home', 'Playground', 'GitHub']);
});

test('S8 the measured privacy declaration names every category it records, at country level', async () => {
  // The categories come from the running Umami instance's own `session` table
  // schema (not its docs): browser, os, device, screen, language and location
  // — and no IP address column anywhere. The declaration must name each of
  // them so it cannot silently drift away from the schema.
  //
  // Location is declared at country level only. The publishing workflow keeps
  // analytics off until the instance meets its exemption conditions, the
  // first of which is "country only"; a declaration that admits region or
  // city would describe an instance the workflow refuses to turn on.
  //
  // Scoped to the measured declaration — the <template> the assembler swaps
  // in when analytics is on — not the whole page: these are common English
  // words ("screen", "browser", "country"…) that could appear incidentally
  // elsewhere as the page grows (hosting notes, footer copy).
  const source = await readSiteFile('privacy/index.html');
  const declaration = between(
    source,
    '<template data-kimen-measured>',
    '</template>',
    'the measured declaration',
  );

  assert.match(declaration, /umami/iu, 'the declaration must name the analytics in use');
  assert.match(
    declaration,
    /\bbrowser\b/iu,
    'the declaration must name the browser category it collects',
  );
  assert.match(
    declaration,
    /operating\s+system/iu,
    'the declaration must name the operating system category it collects',
  );
  assert.match(
    declaration,
    /\bdevice\b/iu,
    'the declaration must name the device category it collects',
  );
  assert.match(
    declaration,
    /\bscreen\b/iu,
    'the declaration must name the screen size it collects',
  );
  assert.match(declaration, /\blanguage\b/iu, 'the declaration must name the language it collects');
  assert.match(
    declaration,
    /\bcountry\b/iu,
    'the declaration must name the country granularity it collects',
  );
  assert.doesNotMatch(
    declaration,
    /\b(?:region|city)\b/iu,
    'location is declared at country level only, the condition analytics is turned on under',
  );
  assert.match(
    declaration,
    /sets no cookies/iu,
    'the declaration must state that no cookies are set',
  );
  assert.match(
    declaration,
    /without\s+storing the IP address/iu,
    'the declaration must keep the correct no-IP claim, verified against the schema',
  );
  assert.match(
    declaration,
    /local storage/iu,
    'the declaration must name what the site does keep in the browser: the theme choice',
  );
});

test('S9 the analytics tag is absent from the sources and gated at build time', async () => {
  const config = JSON.parse(await readSiteFile('analytics.json'));
  assert.equal(config.scriptUrl, 'https://umami.onmars.tech/script.js');
  assert.equal(config.domains, 'kimen.dev');
  assert.match(config.websiteId, /^[0-9a-f-]{36}$/u, 'the website id must be the Umami UUID');

  for (const page of ['index.html', 'playground/index.html', 'privacy/index.html']) {
    const markup = await readSiteFile(page);
    assert.ok(
      markup.includes('<!-- kimen:analytics -->'),
      `${page} must carry the analytics marker`,
    );
    assert.ok(
      !markup.includes(config.scriptUrl),
      `${page} must not ship the analytics tag in source: it is injected at build time only`,
    );
  }
});

// Run the real assembler into a scratch directory. Grepping build-site.sh for
// "KIMEN_ANALYTICS" proves nothing: deleting the `if` would leave both the
// string and the echo behind and keep a substring assertion green, while every
// build started emitting production analytics. This runs it, twice, and reads
// what it wrote. Measured at ~0.3 s per run with --skip-storybook, so the two
// runs cost less than a second of the gate suite.
async function assembleSite(marker) {
  const output = await mkdtemp(join(tmpdir(), 'kimen-site-publication-'));
  const environment = { ...process.env, KIMEN_SITE_OUT: output };
  delete environment.KIMEN_ANALYTICS;
  if (marker !== undefined) {
    environment.KIMEN_ANALYTICS = marker;
  }

  try {
    await execFileAsync('bash', ['scripts/build-site.sh', '--skip-storybook'], {
      cwd: repositoryRoot,
      env: environment,
    });
  } catch (error) {
    // The assembler reports missing prerequisites on stdout before exiting 1.
    assert.fail(
      `build-site.sh failed with KIMEN_ANALYTICS=${String(marker)}: ${error.stdout ?? ''}${
        error.stderr ?? ''
      } (${error.message})`,
    );
  }
  return output;
}

test('S9 the assembler emits the analytics tag only when the build marker is set', async (t) => {
  const config = JSON.parse(await readSiteFile('analytics.json'));
  const [unmeasured, measured] = await Promise.all([assembleSite(undefined), assembleSite('1')]);
  t.after(async () => {
    await Promise.all(
      [unmeasured, measured].map((output) => rm(output, { force: true, recursive: true })),
    );
  });

  for (const page of ['index.html', 'playground/index.html', 'privacy/index.html']) {
    const withoutMarker = await readFile(join(unmeasured, page), 'utf8');
    assert.ok(
      !withoutMarker.includes(config.scriptUrl),
      `${page} must ship no analytics when KIMEN_ANALYTICS is unset`,
    );
    assert.ok(
      withoutMarker.includes('<!-- kimen:analytics -->'),
      `${page} must keep the injection point intact in an unmeasured build`,
    );

    const withMarker = await readFile(join(measured, page), 'utf8');
    assert.ok(
      withMarker.includes(`src="${config.scriptUrl}"`),
      `${page} must load the declared analytics endpoint when the marker is set`,
    );
    assert.ok(
      withMarker.includes(`data-website-id="${config.websiteId}"`),
      `${page} must carry the declared Umami website id`,
    );
    assert.ok(
      withMarker.includes(`data-domains="${config.domains}"`),
      `${page} must scope its measurement to the production domain`,
    );
    assert.ok(
      !withMarker.includes('<!-- kimen:analytics -->'),
      `${page} must have its injection point replaced, not duplicated`,
    );
  }

  // The privacy page describes what each build ships: the unmeasured build
  // claims no measurement, the measured one declares Umami. Neither may carry
  // the other's text, or the template it was chosen from.
  const unmeasuredPrivacy = await readFile(join(unmeasured, 'privacy/index.html'), 'utf8');
  const measuredPrivacy = await readFile(join(measured, 'privacy/index.html'), 'utf8');
  assert.match(unmeasuredPrivacy, /does not currently collect analytics/u);
  assert.doesNotMatch(
    unmeasuredPrivacy,
    /umami|page views are counted|cookieless/iu,
    'a build without analytics must not claim any measurement',
  );
  assert.match(measuredPrivacy, /Page views are counted with/u);
  assert.match(measuredPrivacy, /umami\.onmars\.tech/u);
  assert.doesNotMatch(
    measuredPrivacy,
    /does not currently collect analytics/u,
    'a build with analytics must not claim it collects none',
  );
  for (const [label, markup] of [
    ['unmeasured', unmeasuredPrivacy],
    ['measured', measuredPrivacy],
  ]) {
    assert.doesNotMatch(
      markup,
      /kimen:measurement|data-kimen-measured/u,
      `the ${label} privacy page must ship one declaration, not the markers or the template`,
    );
    assert.match(markup, /local storage/u, `the ${label} privacy page must name what it keeps`);
  }
});

// Cloudflare Pages falls back to serving /index.html with a 200 for EVERY
// unknown path when the deploy has no top-level 404.html: junk URLs get
// indexed, and a broken script or stylesheet reference fails as a MIME-type
// error instead of a 404 (issue #520, item 2). The page is served at whatever
// depth the missing path had, so a relative URL in it would resolve against
// that path and miss too.
test('the site publishes a top-level 404 page whose links work at any depth', async (t) => {
  const output = await assembleSite(undefined);
  t.after(() => rm(output, { force: true, recursive: true }));

  const markup = await readFile(join(output, '404.html'), 'utf8');
  assert.match(markup, /<meta name="robots" content="noindex"/u);
  assert.match(markup, /<main\b[^>]*\bid="main"/u);
  for (const destination of ['/', '/docs/', '/playground/']) {
    assert.ok(markup.includes(`href="${destination}"`), `the 404 page must link ${destination}`);
  }

  const references = [...markup.matchAll(/\b(?:href|src)="([^"]+)"/gu)].map(([, url]) => url);
  assert.ok(references.length > 0, 'the 404 page must reference its stylesheets and links');
  for (const url of references) {
    if (url.startsWith('#') || url.startsWith('https://')) continue;
    assert.ok(
      url.startsWith('/'),
      `${url} must be root-absolute: the 404 page is served at any depth`,
    );
    const published = url.endsWith('/') ? `${url}index.html` : url;
    accessSync(join(output, published), constants.R_OK);
  }
});

// Search engines find the site's pages through robots.txt and the root
// sitemap index (issue #520, item 3). The index may not nest another sitemap
// index, so it names the docs' sitemap file directly; that name comes from
// @astrojs/sitemap, and this test is what notices if the docs build renames it.
test('robots.txt and the root sitemaps list only pages the site publishes', async (t) => {
  const output = await assembleSite(undefined);
  t.after(() => rm(output, { force: true, recursive: true }));
  const origin = 'https://kimen.dev/';
  const locations = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/gu)].map(([, url]) => url);
  const publishedFile = (url) => {
    assert.ok(url.startsWith(origin), `${url} must be on ${origin}`);
    const path = url.slice(origin.length);
    return join(output, path === '' || path.endsWith('/') ? `${path}index.html` : path);
  };

  const robots = await readFile(join(output, 'robots.txt'), 'utf8');
  assert.match(robots, /^User-agent: \*$/mu);
  assert.match(robots, /^Sitemap: https:\/\/kimen\.dev\/sitemap-index\.xml$/mu);

  const index = await readFile(join(output, 'sitemap-index.xml'), 'utf8');
  assert.match(index, /<sitemapindex\b/u);
  const sitemaps = locations(index);
  assert.deepEqual(sitemaps, [`${origin}sitemap-pages.xml`, `${origin}docs/sitemap-0.xml`]);

  const pages = [];
  for (const sitemap of sitemaps) {
    const xml = await readFile(publishedFile(sitemap), 'utf8');
    assert.match(xml, /<urlset\b/u, `${sitemap} must be a sitemap, not a nested sitemap index`);
    pages.push(...locations(xml));
  }
  for (const page of [origin, `${origin}playground/`, `${origin}privacy/`, `${origin}docs/`]) {
    assert.ok(pages.includes(page), `the sitemaps must list ${page}`);
  }
  for (const page of pages) {
    accessSync(publishedFile(page), constants.R_OK);
  }
});

// The social card (#520, item 14): a real 1200×630 PNG, rendered from the
// site's own fonts and tokens by scripts/og-image/render.mjs, that every
// hand-written page names as its og:image.
test('the hand-written pages share a published 1200×630 og:image', async (t) => {
  const png = await readFile(join(siteRoot, 'og-image.png'));
  assert.equal(png.subarray(1, 4).toString('latin1'), 'PNG', 'site/og-image.png must be a PNG');
  assert.equal(png.subarray(12, 16).toString('latin1'), 'IHDR');
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630]);

  for (const page of ['index.html', 'playground/index.html', 'privacy/index.html']) {
    const markup = await readSiteFile(page);
    for (const meta of [
      /<meta property="og:image" content="https:\/\/kimen\.dev\/og-image\.png"/u,
      /<meta property="og:image:width" content="1200"/u,
      /<meta property="og:image:height" content="630"/u,
      /<meta name="twitter:card" content="summary_large_image"/u,
    ]) {
      assert.match(markup, meta, `${page} must declare the social card`);
    }
  }

  const output = await assembleSite(undefined);
  t.after(() => rm(output, { force: true, recursive: true }));
  accessSync(join(output, 'og-image.png'), constants.R_OK);
});

// The landing's "Components" stat (#520, item 15) read "See the live wall"
// until the wall loaded. The assembler writes the number from the manifest.
test('the assembled landing states its component count from the manifest', async (t) => {
  const output = await assembleSite(undefined);
  t.after(() => rm(output, { force: true, recursive: true }));
  const manifest = JSON.parse(
    await readFile(
      join(repositoryRoot, 'packages/elements/generated/custom-elements.json'),
      'utf8',
    ),
  );
  const tags = new Set(
    manifest.modules.flatMap(({ declarations = [] }) =>
      declarations.flatMap(({ tagName }) => (tagName?.startsWith('ki-') ? [tagName] : [])),
    ),
  );
  const landing = await readFile(join(output, 'index.html'), 'utf8');
  assert.ok(tags.size > 0);
  assert.match(
    landing,
    new RegExp(`<a href="#components" data-component-count>${tags.size}</a>`, 'u'),
  );
});

test('S9 the docs analytics endpoint is read from analytics.json, never inlined', async () => {
  // A source-level companion to the executed build below, and deliberately
  // limited to what a build cannot show: whether the endpoint reaches the page
  // through the single declared source or through a second, divergent copy.
  // Both spellings produce identical HTML, so only the source can tell them
  // apart. Every behavioral claim about the gate is made by the build.
  const config = await readSiteFile('docs/astro.config.mjs');
  const analytics = JSON.parse(await readSiteFile('analytics.json'));

  assert.ok(
    !config.includes(analytics.scriptUrl),
    'the endpoint must be read from analytics.json, never inlined past the gate',
  );
  assert.match(
    config,
    /'data-domains':\s*analytics\.domains/u,
    'the docs tag must scope itself to the production domain',
  );
});

// The docs site emits its tag through Astro, not through the assembler, so the
// assembler runs above cannot reach it — and a source-level assertion cannot
// stand in for it. Changing the FALSE branch of the gate to return the same tag
// array leaves `process.env.KIMEN_ANALYTICS === '1' ?` matching, leaves
// `head: analyticsHead` matching, and leaves the endpoint in analytics.json,
// while docs analytics becomes unconditional on every local, test and preview
// build. Only a build can see that, so this builds the real documentation site
// twice and reads what Astro wrote.
//
// `--outDir` is what makes that affordable and safe. The pages land in a
// scratch directory instead of site/docs/dist, which other tests in this file
// read, and invoking astro directly records no Nx cache entry, because Nx only
// caches the outputs of targets it runs itself. Measured at ~4 s per build.
async function buildDocumentation(marker) {
  const output = await mkdtemp(join(tmpdir(), 'kimen-docs-analytics-'));
  const environment = { ...process.env };
  delete environment.KIMEN_ANALYTICS;
  if (marker !== undefined) {
    environment.KIMEN_ANALYTICS = marker;
  }

  try {
    await execFileAsync(
      'pnpm',
      ['--filter', '@kimen/docs', 'exec', 'astro', 'build', '--outDir', output],
      { cwd: repositoryRoot, env: environment },
    );
  } catch (error) {
    assert.fail(
      `the documentation build failed with KIMEN_ANALYTICS=${String(marker)}: ${
        error.stdout ?? ''
      }${error.stderr ?? ''} (${error.message})`,
    );
  }
  return output;
}

async function documentationPages(root) {
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => relative(root, join(entry.parentPath, entry.name)))
    .toSorted();
}

test('S9 the built documentation carries analytics only when the marker is set', async (t) => {
  const analytics = JSON.parse(await readSiteFile('analytics.json'));
  // Sequential: two concurrent Astro builds share site/docs/.astro and would
  // race on the content-collection cache.
  const unmeasured = await buildDocumentation(undefined);
  const measured = await buildDocumentation('1');
  t.after(async () => {
    await Promise.all(
      [unmeasured, measured].map((output) => rm(output, { force: true, recursive: true })),
    );
  });

  const pages = await documentationPages(measured);
  assert.ok(pages.length > 0, 'the documentation build must produce pages');
  assert.deepEqual(
    await documentationPages(unmeasured),
    pages,
    'both builds must publish the same pages: only the analytics tag may differ',
  );

  const leaked = [];
  const missing = [];
  for (const page of pages) {
    if ((await readFile(join(unmeasured, page), 'utf8')).includes(analytics.scriptUrl)) {
      leaked.push(page);
    }
    const withMarker = await readFile(join(measured, page), 'utf8');
    if (
      !withMarker.includes(`src="${analytics.scriptUrl}"`) ||
      !withMarker.includes(`data-website-id="${analytics.websiteId}"`) ||
      !withMarker.includes(`data-domains="${analytics.domains}"`)
    ) {
      missing.push(page);
    }
  }

  assert.deepEqual(
    leaked,
    [],
    'an unmarked documentation build must publish no analytics at all: this is what keeps local, test and preview builds out of production measurement',
  );
  assert.deepEqual(
    missing,
    [],
    'a marked documentation build must load the declared endpoint, with the declared website id, scoped to the production domain',
  );
});

// A documentation build must be able to publish where it is told to. The S9
// case above measures the built HTML, and to do that it points `--outDir` at a
// scratch directory under TMPDIR — a directory the caller chooses and Astro
// never gets to relocate. Whether that directory shares a filesystem with the
// repository is not part of any contract: a container mounts /tmp as tmpfs, CI
// mounts the workspace on a separate volume, and a developer machine may do
// either. So the build has to survive an output directory on another device,
// and today it does not: `ssrMoveAssets` renames from `site/docs/.astro` into
// `--outDir` and a rename cannot cross a filesystem boundary (EXDEV).
//
// This helper deliberately does not reuse `buildDocumentation` above. That one
// is the code under repair — it hard-codes TMPDIR through `tmpdir()` — and a
// red that ran through it could not tell a fault in the build from a fault in
// the helper.
async function buildDocumentationInto(output) {
  const environment = { ...process.env };
  delete environment.KIMEN_ANALYTICS;
  try {
    await execFileAsync(
      'pnpm',
      ['--filter', '@kimen/docs', 'exec', 'astro', 'build', '--outDir', output],
      { cwd: repositoryRoot, env: environment },
    );
    return null;
  } catch (error) {
    return `${error.stdout ?? ''}${error.stderr ?? ''}(${error.message})`;
  }
}

function describeDevice(label, path) {
  return `${label}: ${path} (st_dev ${statSync(path).dev})`;
}

// The temporary directory is not this test's to choose. The caller — the
// harness that runs the gates — designates exactly one authorised location
// through TMPDIR, and this case uses that one or none: probing /tmp or
// /dev/shm behind the caller's back would reproduce the boundary on a mount
// nobody granted, and picking a directory by st_dev alone says nothing about
// whether a build may write there. So every precondition is settled before the
// build starts. A missing prerequisite blocks CI and sandbox runs. Local
// tests report a skip and require a different run to verify portability.
function authorisedCrossDeviceRoot() {
  const repositoryDevice = statSync(repositoryRoot).dev;
  const blocked = (reason) => ({ root: null, repositoryDevice, reason });
  const root = process.env.TMPDIR;

  if (root === undefined || root === '') {
    return blocked('the caller designated no temporary directory: TMPDIR is unset');
  }

  let stats;
  try {
    stats = statSync(root);
  } catch (error) {
    return blocked(`the designated temporary directory ${root} could not be read: ${error.code}`);
  }
  if (!stats.isDirectory()) {
    return blocked(`the designated temporary directory ${root} is not a directory`);
  }
  try {
    accessSync(root, constants.W_OK | constants.X_OK);
  } catch (error) {
    return blocked(`the designated temporary directory ${root} is not writable: ${error.code}`);
  }
  if (stats.dev === repositoryDevice) {
    return blocked(
      `the designated temporary directory ${root} shares st_dev ${stats.dev} with the repository, so no filesystem boundary would be crossed`,
    );
  }

  return { root, repositoryDevice, device: stats.dev, reason: null };
}

test('S8 missing cross-filesystem TMPDIR is a local skip and a CI failure', async (t) => {
  const scratch = await mkdtemp(join(tmpdir(), 'kimen-cross-filesystem-evidence-'));
  t.after(() => rm(scratch, { force: true, recursive: true }));
  const evidence = join(scratch, 'current-run.tsv');
  for (const [CI, KIMEN_SANDBOX] of [
    ['', ''],
    ['true', ''],
    ['', '1'],
  ]) {
    const result = await execFileAsync(
      process.execPath,
      [
        '--test',
        '--test-reporter=tap',
        `--test-name-pattern=^${crossFilesystemTest}$`,
        fileURLToPath(import.meta.url),
      ],
      {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          NODE_TEST_CONTEXT: undefined,
          CI,
          KIMEN_SANDBOX,
          TMPDIR: repositoryRoot,
          KIMEN_GATE_EVIDENCE_FILE: evidence,
        },
      },
    ).catch((error) => error);
    if (CI || KIMEN_SANDBOX) {
      assert.equal(result.code, 1, result.stdout);
      assert.match(result.stdout, /blocked prerequisite.*TMPDIR.*another filesystem/u);
    } else {
      assert.equal(result.code, undefined, result.stdout);
      assert.match(result.stdout, /# SKIP CROSS-FILESYSTEM.*TMPDIR.*another filesystem/u);
    }
  }
  assert.equal(await readFile(evidence, 'utf8'), 'skip\tcross-filesystem\tskipped\n');
});

test(crossFilesystemTest, async (t) => {
  const { root, repositoryDevice, device, reason } = authorisedCrossDeviceRoot();
  if (!root) {
    const missing = `set TMPDIR to a writable directory on another filesystem. ${reason} (repository st_dev ${repositoryDevice})`;
    if (process.env.CI || process.env.KIMEN_SANDBOX === '1') {
      assert.fail(`blocked prerequisite: ${missing}`);
    }
    const evidence = process.env.KIMEN_GATE_EVIDENCE_FILE;
    if (evidence) appendFileSync(evidence, 'skip\tcross-filesystem\tskipped\n');
    t.skip(`CROSS-FILESYSTEM — ${missing}. Release requires this check to run.`);
    return;
  }

  let output;
  try {
    output = await mkdtemp(join(root, 'kimen-docs-portability-'));
  } catch (error) {
    assert.fail(
      `blocked prerequisite, not a result: the authorised temporary directory ${root} (st_dev ${device}) refused a scratch directory: ${error.code}`,
    );
  }
  t.after(() => rm(output, { force: true, recursive: true }));

  // The boundary is confirmed on the directory the build is actually handed,
  // so the failure below can only be read one way.
  assert.notEqual(
    statSync(output).dev,
    repositoryDevice,
    `blocked prerequisite, not a result: ${output} landed on the repository's own filesystem (st_dev ${repositoryDevice})`,
  );

  const failure = await buildDocumentationInto(output);

  assert.equal(
    failure,
    null,
    [
      'the documentation build must publish to an output directory on any writable filesystem.',
      describeDevice('repository', repositoryRoot),
      describeDevice('output    ', output),
      failure ?? '',
    ].join('\n'),
  );
  assert.ok(
    (await documentationPages(output)).length > 0,
    'a cross-device documentation build must publish pages, not an empty directory',
  );
});

// Control, not the regression: the same build with an output directory on the
// repository's own filesystem. It passes today, which is what makes the failure
// above attributable to the device boundary and not to the build at large.
test('control: the documentation build publishes into an output directory on its own filesystem', async (t) => {
  const controlRoot = join(repositoryRoot, 'reports/tmp');
  await mkdir(controlRoot, { recursive: true });
  const output = await mkdtemp(join(controlRoot, 'kimen-docs-same-device-'));
  t.after(() => rm(output, { force: true, recursive: true }));

  assert.equal(
    statSync(output).dev,
    statSync(repositoryRoot).dev,
    'the control must run on the repository filesystem, otherwise it controls for nothing',
  );

  const failure = await buildDocumentationInto(output);

  assert.equal(failure, null, `the same-device control build failed: ${failure}`);
  assert.ok((await documentationPages(output)).length > 0, 'the control build must publish pages');
});
