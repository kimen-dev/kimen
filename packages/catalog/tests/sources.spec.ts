// @spec:110-ki-sources
import { beforeEach, expect, it } from 'vitest';

import {
  catalogData,
  createLiveSurface,
  createStreamingRenderer,
  renderUiSpec,
  validateUiSpec,
} from '../src/index.js';

const origin = 'https://docs.example.org';
const citation = { component: 'ki-citation', props: { ref: 'methods' } };
const source = (href: string) => ({
  component: 'ki-source',
  props: { 'source-id': 'methods', href, title: 'Methods' },
});
const list = (href: string) => ({
  component: 'ki-sources',
  slots: { '': [source(href)] },
});
const answer = (href: string) => ({
  version: 1,
  root: { component: 'div', slots: { '': [citation, list(href)] } },
});
const scopeKey = Symbol.for('kimen.sources.render-scope.v1');

function scopeOf(element: Element | null): unknown {
  return (element as { [scopeKey]?: symbol } | null)?.[scopeKey];
}

beforeEach(() => {
  document.body.replaceChildren();
});

it('declares Sources props, default slot and native navigation without component events', () => {
  expect(catalogData.components['ki-citation'].props.ref).toMatchObject({ required: true });
  expect(catalogData.components['ki-source'].props.href).toMatchObject({
    format: 'url',
    required: true,
  });
  expect(catalogData.components['ki-sources'].slots['']).toBeTruthy();
  expect(catalogData.components['ki-citation'].events).toEqual({});
  expect(catalogData.components['ki-source'].events).toEqual({});
  expect(catalogData.components['ki-sources'].events).toEqual({});
});

it('S4 validates each source destination with the renderer URL policy', () => {
  const options = { allowedUrlOrigins: [origin] };
  expect(validateUiSpec(answer(`${origin}/methods`), options).ok).toBe(true);
  expect(validateUiSpec(answer('https://other.example.org'), options).issues).toEqual([
    expect.objectContaining({ code: 'url-origin' }),
  ]);
});

it('S15 gives each guarded render its own reference scope', () => {
  const first = document.createElement('section');
  const second = document.createElement('section');
  const otherOrigin = 'https://other.example.org';
  document.body.append(first, second);
  expect(
    renderUiSpec(answer(`${origin}/methods`), { surface: first, allowedUrlOrigins: [origin] }).ok,
  ).toBe(true);
  expect(
    renderUiSpec(answer(`${otherOrigin}/methods`), {
      surface: second,
      allowedUrlOrigins: [otherOrigin],
    }).ok,
  ).toBe(true);

  const firstScope = scopeOf(first.querySelector('ki-citation'));
  const secondScope = scopeOf(second.querySelector('ki-citation'));
  expect(typeof firstScope).toBe('symbol');
  expect(firstScope).toBe(scopeOf(first.querySelector('ki-sources')));
  expect(firstScope).toBe(scopeOf(first.querySelector('ki-source')));
  expect(secondScope).toBe(scopeOf(second.querySelector('ki-source')));
  expect(firstScope).not.toBe(secondScope);
});

it('S15 retains one scope across chunks of a guarded stream', () => {
  const surface = document.createElement('section');
  const stream = createStreamingRenderer({ surface, allowedUrlOrigins: [origin] });
  expect(stream.push(citation).ok).toBe(true);
  expect(stream.push(list(`${origin}/methods`)).ok).toBe(true);
  const scope = scopeOf(surface.querySelector('ki-citation'));
  expect(typeof scope).toBe('symbol');
  expect(scope).toBe(scopeOf(surface.querySelector('ki-source')));
});

it('S15 retains reference scope across live insertions', () => {
  const surface = document.createElement('section');
  const live = createLiveSurface({ surface, allowedUrlOrigins: [origin] });
  expect(live.apply({ ops: [{ op: 'insert', node: { ...citation, id: 'cite' } }] }).ok).toBe(true);
  expect(
    live.apply({
      ops: [
        {
          op: 'insert',
          node: {
            component: 'ki-sources',
            id: 'list',
            slots: { '': [{ ...source(`${origin}/methods`), id: 'source' }] },
          },
        },
      ],
    }).ok,
  ).toBe(true);
  const scope = scopeOf(surface.querySelector('ki-citation'));
  expect(typeof scope).toBe('symbol');
  expect(scope).toBe(scopeOf(surface.querySelector('ki-source')));
});

it('rejects action bindings on the source navigation tags', () => {
  const href = `${origin}/methods`;
  for (const root of [citation, list(href), source(href)]) {
    const result = validateUiSpec({
      version: 1,
      actions: ['navigate'],
      root: { ...root, action: 'navigate' },
    });
    expect(result.issues).toEqual([expect.objectContaining({ code: 'action-not-allowed' })]);
  }
});
