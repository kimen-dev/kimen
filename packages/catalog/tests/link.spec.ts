// @spec:070-ki-link
import { expect, it } from 'vitest';

import { type Catalog, catalogData, validateUiSpec } from '../src/index.js';

const origin = 'https://docs.example.com';
const link = (href: string) => ({
  version: 1,
  root: { component: 'ki-link', props: { href }, slots: { '': ['Catalog contract'] } },
});

it('S10 declares a URL destination and default label slot with no component actions', () => {
  const entry = (catalogData as Catalog).components['ki-link'];
  expect(entry?.props['href']).toMatchObject({ required: true, format: 'url' });
  expect(entry?.slots['']).toBeTruthy();
  expect(entry?.events).toEqual({});
});

it('S10 accepts an allowed link and rejects links outside the allowed origins', () => {
  const options = { allowedUrlOrigins: [origin] };
  expect(validateUiSpec(link(`${origin}/catalog`), options).ok).toBe(true);
  expect(
    validateUiSpec(link('https://other.example.com/catalog'), options).issues.map(
      ({ code }) => code,
    ),
  ).toEqual(['url-origin']);
});
