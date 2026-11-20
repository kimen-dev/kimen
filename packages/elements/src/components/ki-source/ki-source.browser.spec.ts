// @spec:110-ki-sources
import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { shadowLinkHasFocus, sourcesFixture } from '../../../browser-tests/sources-fixture';

const fixture = sourcesFixture();

it('S4 omits unresolved and disallowed references while accepting a later valid URL', async () => {
  fixture.innerHTML = `
    <p><ki-citation ref="missing"></ki-citation><ki-citation ref="blocked"></ki-citation></p>
    <ki-sources open>
      <ki-source source-id="blocked" title="Report" href="javascript:;"></ki-source>
      <ki-source id="valid" title="Methods" href="https://example.org/methods"></ki-source>
    </ki-sources>`;
  await expect.element(page.getByRole('link', { name: 'Methods', exact: true })).toBeVisible();
  expect(page.getByRole('link').elements()).toHaveLength(1);

  fixture.querySelector('ki-source')?.setAttribute('href', 'https://example.org/report');
  await expect.element(page.getByRole('link', { name: 'Source 1: Report' })).toBeVisible();
  const report = page.getByRole('link', { name: 'Report', exact: true });
  await expect.element(report).toHaveAttribute('href', 'https://example.org/report');
});

it('resolves citations and source aliases within their own shadow tree', async () => {
  fixture.innerHTML =
    '<div></div><ki-sources open><ki-source id="r" title="Outside" href="https://example.org"></ki-source></ki-sources>';
  const root = fixture.querySelector('div')?.attachShadow({ mode: 'open' });
  if (!root) throw new Error('Expected the answer host');
  root.innerHTML = `
    <p>Local<ki-citation ref="r"></ki-citation>.</p>
    <ki-sources><ki-source source-id="r" title="Inside" href="https://example.net"></ki-source></ki-sources>`;
  await expect.element(page.getByRole('link', { name: 'Source 1: Inside' })).toBeVisible();
  await page.getByRole('link', { name: 'Source 1: Inside' }).click();
  const link = page.getByRole('link', { name: 'Inside', exact: true });
  await expect.poll(() => shadowLinkHasFocus(link.query())).toBe(true);
});

it('S15 keeps each guarded answer and its navigation isolated on a shared page', async () => {
  fixture.innerHTML = `
    <section id="answer-one"><p><ki-citation ref="shared"></ki-citation></p>
      <ki-sources><ki-source source-id="shared" title="First" href="https://one.example.org"></ki-source></ki-sources></section>
    <section id="answer-two"><p><ki-citation ref="shared"></ki-citation></p>
      <ki-sources><ki-source source-id="shared" title="Second" href="https://two.example.org"></ki-source></ki-sources></section>
    <section id="answer-three"><p><ki-citation ref="shared"></ki-citation></p></section>`;
  const key = Symbol.for('kimen.sources.render-scope.v1');
  for (const answer of fixture.querySelectorAll('section')) {
    const scope = Symbol();
    for (const node of answer.querySelectorAll('ki-citation, ki-sources, ki-source')) {
      Object.defineProperty(node, key, { value: scope });
    }
  }
  await expect.element(page.getByRole('link', { name: 'Source 1: First' })).toBeVisible();
  const second = page.getByRole('link', { name: 'Source 1: Second' });
  await expect.element(second).toBeVisible();
  expect(page.getByRole('link').elements()).toHaveLength(2);
  await second.click();
  const link = page.getByRole('link', { name: 'Second', exact: true });
  await expect.poll(() => shadowLinkHasFocus(link.query())).toBe(true);
});
