import { describe, expect, it } from 'vitest';

import { type Catalog, type UiSpecNode, catalogData, validateUiSpec } from '../src/index.js';

type Props = NonNullable<UiSpecNode['props']>;

function spec(props: Props) {
  return {
    actions: ['report-image-error'],
    root: {
      action: 'report-image-error',
      component: 'ki-image',
      props,
      slots: { caption: ['View from the ridge'] },
    },
    version: 1,
  };
}

describe('catalog image', () => {
  it('declares the URL, caption and error event', () => {
    const catalog: Catalog = catalogData;
    expect(catalog.components['ki-image']).toMatchObject({
      props: { src: { format: 'url' } },
    });
    expect(typeof catalog.components['ki-image']?.events['ki-error']).toBe('string');
    expect(typeof catalog.components['ki-image']?.slots['caption']).toBe('string');
  });

  it('admits a meaningful image with a caption or a decorative image without alt', () => {
    expect(validateUiSpec(spec({ alt: 'Low green hills', src: '/hills.jpg' })).ok).toBe(true);
    expect(validateUiSpec(spec({ decorative: true, src: '/divider.svg' })).ok).toBe(true);
  });

  it.each([{ src: '/hills.jpg' }, { alt: '  ', src: '/hills.jpg' }])(
    'requires a nonblank description for informative image %j',
    (props) => {
      expect(validateUiSpec(spec(props)).issues).toContainEqual(
        expect.objectContaining({ code: 'missing-required-prop', path: 'root.props.alt' }),
      );
    },
  );

  it('retains both the scheme policy and the optional origin allowlist', () => {
    const options = { allowedUrlOrigins: ['https://images.example'] };
    const input = (src: string) => spec({ alt: 'Low green hills', src });
    expect(validateUiSpec(input('data:image/png;base64,AA==')).issues).toContainEqual(
      expect.objectContaining({ code: 'url-scheme', path: 'root.props.src' }),
    );
    expect(validateUiSpec(input('/hills.jpg'), options).issues).toContainEqual(
      expect.objectContaining({ code: 'url-origin', path: 'root.props.src' }),
    );
    expect(validateUiSpec(input('https://images.example/hills.jpg'), options).ok).toBe(true);
  });
});
