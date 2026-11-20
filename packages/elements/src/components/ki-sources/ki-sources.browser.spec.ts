// @spec:110-ki-sources
import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { expectAccessible, parkPointer } from '../../../browser-tests/axe';
import { definitions, sourcesFixture } from '../../../browser-tests/sources-fixture';

const fixture = sourcesFixture();

function titles(): string[] {
  const list = fixture.querySelector('ki-sources')?.shadowRoot;
  return Array.from(list?.querySelectorAll('[part="title"]') ?? [], (title) => title.textContent);
}

function numbers(): string[] {
  return Array.from(
    fixture.querySelectorAll('ki-citation'),
    (citation) => citation.shadowRoot?.querySelector('a')?.textContent.trim() ?? '',
  );
}

it('S1 uses first citation order, reuses numbers and lists uncited sources last', async () => {
  fixture.innerHTML = `
    <p>Method<ki-citation ref="methods"></ki-citation>, result<ki-citation ref="findings"></ki-citation>,
      and method again<ki-citation ref="methods"></ki-citation>.</p>
    <ki-sources open>
      ${definitions}
      <ki-source id="appendix" href="https://example.org/appendix" title="Appendix"></ki-source>
    </ki-sources>`;
  await expect.poll(numbers).toEqual(['1', '2', '1']);
  await expect.poll(titles).toEqual(['Methods', 'Findings', 'Appendix']);
});

it('S2 opens native disclosure and shows source domains and snippets', async () => {
  fixture.innerHTML = `<ki-sources>${definitions}</ki-sources>`;
  const summary = page.getByText('2 sources', { exact: true });
  const method = page.getByRole('link', { name: 'Methods', exact: true });
  await expect.element(summary).toBeVisible();
  expect(method.query()).toBeNull();

  await summary.click();
  await expect.element(method).toBeVisible();
  await expect.element(page.getByText('example.org', { exact: true })).toBeVisible();
  await expect.element(page.getByText('How the study ran.', { exact: true })).toBeVisible();
  await expect.poll(() => fixture.querySelector('ki-sources')?.hasAttribute('open')).toBe(true);
});

it('S5 renumbers an earlier streamed citation and its list', async () => {
  fixture.innerHTML = `<p><ki-citation ref="findings"></ki-citation></p><ki-sources open>${definitions}</ki-sources>`;
  await expect.poll(numbers).toEqual(['1']);
  fixture
    .querySelector('p')
    ?.insertAdjacentHTML('afterbegin', '<ki-citation ref="methods"></ki-citation>');
  await expect.poll(numbers).toEqual(['1', '2']);
  await expect.poll(titles).toEqual(['Methods', 'Findings']);
});

it('S6 numbers references independently across lists', async () => {
  fixture.innerHTML = `
    <p><ki-citation ref="another"></ki-citation><ki-citation ref="methods"></ki-citation></p>
    <ki-sources open>${definitions}</ki-sources>
    <ki-sources open><ki-source id="another" title="Another answer" href="https://example.com"></ki-source></ki-sources>`;
  await expect.poll(numbers).toEqual(['1', '1']);
  await expect.poll(titles).toEqual(['Methods', 'Findings']);
});

it('S9 discloses an ordered list of named links and passes axe', async () => {
  await parkPointer();
  fixture.innerHTML = `
    <p>Study<ki-citation ref="methods"></ki-citation>.</p><ki-sources open>${definitions}</ki-sources>`;
  await expect.element(page.getByRole('link', { name: 'Source 1: Methods' })).toBeVisible();
  const items = page.getByRole('list').getByRole('listitem');
  expect(items.elements()).toHaveLength(2);
  const method = items.nth(0).getByRole('link', { name: 'Methods', exact: true });
  await expect.element(method).toBeVisible();
  await expect.element(method).toHaveAccessibleDescription('example.org How the study ran.');
  await expect
    .element(items.nth(1).getByRole('link', { name: 'Findings', exact: true }))
    .toBeVisible();
  expect(fixture.querySelector('ki-sources')?.shadowRoot?.querySelector('ol')).toBeInstanceOf(
    HTMLOListElement,
  );
  await expectAccessible(fixture);
});

it('S11 mirrors the position of the source number in RTL', async () => {
  fixture.dir = 'rtl';
  fixture.innerHTML = `<ki-sources open>${definitions}</ki-sources>`;
  await expect.element(page.getByRole('link', { name: 'Methods', exact: true })).toBeVisible();
  const card = page.getByRole('link', { name: 'Methods', exact: true }).element();
  const marker = card.querySelector('[part="number"]');
  const title = card.querySelector('[part="title"]');
  expect(marker).toBeInstanceOf(HTMLElement);
  expect(title).toBeInstanceOf(HTMLElement);
  expect(marker?.getBoundingClientRect().left).toBeGreaterThan(
    title?.getBoundingClientRect().left ?? 0,
  );
});
