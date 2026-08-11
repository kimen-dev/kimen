// @spec:031-site-experience#S1
// @spec:031-site-experience#S5
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

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

test('S1 the published site declares its security headers and cache policy', async () => {
  const headers = await readSiteFile('_headers');

  assert.match(headers, /^\/\*$/mu, '_headers must declare a rule for every route');
  assert.match(headers, /X-Content-Type-Options: nosniff/u);
  assert.match(headers, /Referrer-Policy: strict-origin-when-cross-origin/u);
  assert.match(headers, /Strict-Transport-Security: max-age=31536000; includeSubDomains/u);
  assert.match(
    headers,
    /Content-Security-Policy-Report-Only: [^\n]*frame-ancestors 'none'/u,
    'the policy ships in report-only mode until it is tuned against the real pages',
  );
  assert.match(
    headers,
    /^\/assets\/\*$/mu,
    'generated assets must carry their own immutable cache rule',
  );
  assert.match(headers, /Cache-Control: public, max-age=31536000, immutable/u);
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

  const assembler = await readFile(join(repositoryRoot, 'scripts/build-site.sh'), 'utf8');
  assert.match(
    assembler,
    /KIMEN_ANALYTICS/u,
    'the assembler must gate the tag on the explicit build marker',
  );
  assert.match(assembler, /data-domains/u, 'the injected tag must scope itself to the domain');
});
