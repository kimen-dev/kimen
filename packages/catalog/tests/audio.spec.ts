// @spec:125-ki-audio
import { expect, it } from 'vitest';

import { type Catalog, catalogData, validateUiSpec } from '../src/index.js';

it('registers both audio URLs and declares only the playback completion action', () => {
  const entry = (catalogData as Catalog).components['ki-audio'];
  expect(entry).toMatchObject({
    props: { src: { format: 'url', required: true }, 'transcript-href': { format: 'url' } },
    slots: {},
  });
  expect(Object.keys(entry?.events ?? {})).toEqual(['ended']);
});

it('S11 applies the origin allowlist to the transcript independently of the source', () => {
  const result = validateUiSpec(
    {
      version: 1,
      root: {
        component: 'ki-audio',
        props: {
          src: 'https://media.example/ep4.mp3',
          'transcript-href': 'https://other.example/ep4/transcript',
        },
      },
    },
    { allowedUrlOrigins: ['https://media.example'] },
  );
  expect(result.issues).toContainEqual(
    expect.objectContaining({ code: 'url-origin', path: 'root.props.transcript-href' }),
  );
});
