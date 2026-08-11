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
