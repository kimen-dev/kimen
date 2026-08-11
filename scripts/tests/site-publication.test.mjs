// @spec:031-site-experience#S1
// @spec:031-site-experience#S5
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const siteRoot = join(repositoryRoot, 'site');

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
const IMMUTABLE_PATTERNS = new Set([
  '/assets/elements/kimen/p-*',
  '/assets/fonts/*',
  '/docs/_astro/*',
]);
// Stable filenames that every deploy overwrites in place. `immutable` on any
// of these would strand a visitor on an old build for a year, and no later
// deploy could recall it.
const REVALIDATED_PATTERNS = [
  '/assets/tokens/*',
  '/assets/elements/kimen/kimen.esm.js',
  '/assets/elements/kimen/index.esm.js',
  '/assets/elements/custom-elements.json',
];

test('S1 the published site declares its security headers', async () => {
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

test('S1 the published site caches only content-addressed assets immutably', async () => {
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
    assert.match(
      headers.join('\n'),
      /^Cache-Control: public, max-age=[1-9][0-9]{0,3}, must-revalidate$/mu,
      `${pattern} must declare a short, revalidating max-age`,
    );
  }

  assert.ok(
    !rules.get('/*').some((header) => /^Cache-Control:/u.test(header)),
    'a Cache-Control on /* would be comma-joined onto every rule below it',
  );
});

test('S1 the report-only policy records that nothing collects its reports', async () => {
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

test('S5 the privacy page is a semantic no-JavaScript page that declares the measurement', async () => {
  const source = await readSiteFile('privacy/index.html');

  assert.match(source, /<!doctype html>/iu);
  assert.match(source, /<html\b[^>]*\blang=["']en["']/iu);
  assert.match(source, /<main\b[^>]*\bid=["']main["']/iu);
  assert.match(source, /<footer\b/iu);
  assert.match(source, /umami/iu, 'the page must name the analytics it declares');
  assert.match(source, /cookie/iu, 'the page must state that no cookies are set');
  assert.doesNotMatch(
    source,
    /<fieldset\b/iu,
    'the privacy page ships no module script to wire a control, so it must not ship one',
  );
  assert.doesNotMatch(
    source,
    /name=["'][^"']*scheme[^"']*["']/iu,
    'the privacy page must not ship an unwired color-scheme radio',
  );

  for (const page of ['index.html', 'playground/index.html']) {
    const markup = await readSiteFile(page);
    assert.match(
      markup,
      /href=["'](?:\.|\.\.)\/privacy\/["']/u,
      `${page} must link to the privacy page`,
    );
  }
});

test('S1 the assembler publishes the privacy route', async () => {
  const assembler = await readFile(join(repositoryRoot, 'scripts/build-site.sh'), 'utf8');

  assert.match(assembler, /cp -R site\/privacy\/\. ["']\$OUT\/privacy\/["']/u);
});

test('S5 every published documentation page can reach the privacy declaration', async () => {
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

test('S5 the privacy page declares every category the Umami schema actually stores', async () => {
  // Verified against the running Umami instance's own `session` table schema
  // (not its docs): browser, os, device, screen, language, country, region,
  // city — and no IP address column anywhere. The declaration must name each
  // of those categories so it cannot silently drift away from the schema.
  //
  // Scoped to the "What is measured" section, not the whole page: these are
  // common English words ("screen", "browser", "country"…) that could appear
  // incidentally elsewhere as the page grows (hosting notes, footer copy).
  // Slicing to the declared sentence means gutting or corrupting it fails
  // this test even if the words survive elsewhere on the page.
  const source = await readSiteFile('privacy/index.html');
  const declaration = between(
    source,
    '<h2>What is measured</h2>',
    '<h2>What is not done</h2>',
    'the "What is measured" declaration',
  );

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
  assert.match(
    declaration,
    /\bregion\b/iu,
    'the declaration must name the region granularity it collects',
  );
  assert.match(
    declaration,
    /\bcity\b/iu,
    'the declaration must name the city granularity it collects',
  );
  assert.match(
    declaration,
    /without storing the IP address/iu,
    'the declaration must keep the correct no-IP claim, verified against the schema',
  );
});

test('S1 the analytics tag is absent from the sources and gated at build time', async () => {
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

test('S1 the assembler emits the analytics tag only when the build marker is set', async (t) => {
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
});

test('S1 the docs site gates its analytics tag on the same build marker', async () => {
  // The docs site is the largest measured surface, and its tag is emitted by
  // Astro rather than by the assembler, so the run above cannot reach it:
  // site/docs/dist is already built by the time build-site.sh copies it, and
  // building Starlight twice inside this suite would add minutes to every
  // gate run. What is asserted here is the gate itself — the condition, the
  // wiring of the gated value into Starlight's `head`, and the absence of any
  // inlined endpoint that could bypass both.
  const config = await readSiteFile('docs/astro.config.mjs');
  const analytics = JSON.parse(await readSiteFile('analytics.json'));

  assert.match(
    config,
    /process\.env\.KIMEN_ANALYTICS\s*===\s*'1'\s*\?/u,
    'the docs head must be produced by the explicit build marker, never unconditionally',
  );
  assert.match(
    config,
    /head:\s*analyticsHead/u,
    'the gated value must be what Starlight actually renders into <head>',
  );
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
